

import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin, initializeCloudinary, sendPushNotification } from './_lib/services';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "100mb",
        },
    },
};

// --- Type Duplication (necessary for serverless environment) ---
enum BookingStatus { Pending = 'Pending' }
enum PaymentStatus { Pending = 'Pending' }
enum UserRole { Admin = 'Admin', Staff = 'Staff' }
interface Package { id: string; name: string; description: string; subPackages: SubPackage[]; type?: 'Studio' | 'Outdoor'; imageUrl?: string; isGroupPackage?: boolean; }
interface SubPackage { id:string; name: string; price: number; description?: string; }
interface AddOn { id: string; name: string; subAddOns: SubAddOn[]; }
interface SubAddOn { id: string; name: string; price: number; }
interface Client { id: string; name: string; email: string; phone: string; firstBooking: Date | admin.firestore.Timestamp; lastBooking: Date | admin.firestore.Timestamp; totalBookings: number; totalSpent: number; loyaltyPoints: number; referralCode: string; referredBy?: string; loyaltyTier?: string; }
interface LoyaltyTier { id: string; name: string; bookingThreshold: number; discountPercentage: number; }
interface SystemSettings { loyaltySettings: { firstBookingReferralDiscount: number; loyaltyTiers: LoyaltyTier[]; rupiahPerPoint: number; pointsPerRupiah: number; referralBonusPoints: number; }; }
interface Promo { id: string; code: string; description: string; discountPercentage: number; isActive: boolean; }
// --- End Type Duplication ---

// --- Server-side API Helpers ---
const fromFirestore = <T extends { id: string }>(doc: admin.firestore.DocumentSnapshot): T => {
    return { id: doc.id, ...doc.data() } as T;
};


// --- Action Handlers ---

async function handleCreatePublic(req: VercelRequest, res: VercelResponse) {
    const db = admin.firestore();
    const { v2: cloudinary } = await import('cloudinary');
    const formData = req.body;
    const newBookingCode = `S8-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    let paymentProofUrl = '';
    let paymentProofPublicId = '';

    if (formData.paymentProofBase64) {
        const { base64, mimeType } = formData.paymentProofBase64;
        const dataUrl = `data:${mimeType};base64,${base64}`;
        const publicId = `proof_${newBookingCode}`;
        try {
            const uploadResult = await cloudinary.uploader.upload(dataUrl, {
                folder: "studio8_uploads", public_id: publicId, resource_type: "auto", upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
            });
            if (!uploadResult?.secure_url) throw new Error("Cloudinary gagal memberikan URL yang aman setelah upload.");
            paymentProofUrl = uploadResult.secure_url;
            paymentProofPublicId = uploadResult.public_id;
        } catch (uploadError: any) {
            const message = uploadError.error?.message || uploadError.message || 'Gagal mengunggah bukti pembayaran ke Cloudinary.';
            throw new Error(message);
        }
    }
    
    try {
        const bookingRef = db.collection('bookings').doc();
        const lowerEmail = formData.email.toLowerCase();
        const clientRef = db.collection('clients').doc(lowerEmail);

        await db.runTransaction(async (transaction) => {
            const packagesSnap = await transaction.get(db.collection('packages'));
            const addOnsSnap = await transaction.get(db.collection('addons'));
            const settingsDoc = await transaction.get(db.collection('settings').doc('main'));
            const promosSnap = await transaction.get(db.collection('promos'));
            const clientDoc = await transaction.get(clientRef);
            
            const allPackages = packagesSnap.docs.map(doc => fromFirestore<Package>(doc));
            const allAddOns = addOnsSnap.docs.map(doc => fromFirestore<AddOn>(doc));
            const allPromos = promosSnap.docs.map(doc => fromFirestore<Promo>(doc));
            const settings = settingsDoc.data() as SystemSettings;
            let client = clientDoc.exists ? fromFirestore<Client>(clientDoc) : null;
            
            const selectedPackage = allPackages.find(p => p.id === formData.packageId);
            if (!selectedPackage) throw new Error("Paket yang dipilih tidak ditemukan.");
            const selectedSubPackage = selectedPackage.subPackages.find(sp => sp.id === formData.subPackageId);
            if (!selectedSubPackage) throw new Error("Varian paket tidak ditemukan.");
            const selectedSubAddOns = allAddOns.flatMap(a => a.subAddOns).filter(sa => formData.subAddOnIds.includes(sa.id));
            
            const isNewClient = !client;
            if (isNewClient) {
                client = {
                    id: lowerEmail, name: formData.name, email: lowerEmail, phone: formData.whatsapp,
                    firstBooking: admin.firestore.Timestamp.now(), lastBooking: admin.firestore.Timestamp.now(),
                    totalBookings: 0, totalSpent: 0, loyaltyPoints: 0, referralCode: `S8REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`, loyaltyTier: 'Newbie'
                };
            }

            let extraPersonCharge = (selectedPackage.isGroupPackage && formData.people > 2) ? (formData.people - 2) * 15000 : 0;
            let subtotal = selectedSubPackage.price + selectedSubAddOns.reduce((sum, sa) => sum + sa.price, 0) + extraPersonCharge;
            
            let discountAmount = 0, discountReason = '', pointsRedeemed = 0, pointsValue = 0, referralCodeUsed = '', promoCodeUsed = '';

            if (formData.promoCode && formData.promoCode.trim()) {
                const promo = allPromos.find(p => p.code.toUpperCase() === formData.promoCode.toUpperCase() && p.isActive);
                if (promo) {
                    promoCodeUsed = promo.code;
                    discountReason = promo.description;
                    discountAmount = subtotal * (promo.discountPercentage / 100);
                }
            }
            
            if (!promoCodeUsed) {
                if (isNewClient && formData.referralCode) {
                     const referrerSnap = await transaction.get(db.collection('clients').where('referralCode', '==', formData.referralCode.toUpperCase()).limit(1));
                     if (!referrerSnap.empty && referrerSnap.docs[0].id !== lowerEmail) {
                        discountAmount = settings.loyaltySettings.firstBookingReferralDiscount;
                        discountReason = `Diskon Referral`; referralCodeUsed = formData.referralCode.toUpperCase(); client.referredBy = referralCodeUsed;
                     }
                } else if (!isNewClient && client) {
                    const sortedTiers = [...settings.loyaltySettings.loyaltyTiers].sort((a,b) => b.bookingThreshold - a.bookingThreshold);
                    const clientTier = sortedTiers.find(t => client!.totalBookings >= t.bookingThreshold);
                    if (clientTier) { discountAmount = subtotal * (clientTier.discountPercentage / 100); discountReason = `Diskon Tier ${clientTier.name} (${clientTier.discountPercentage}%)`; }
                }
            }

            if (formData.usePoints && client && client.loyaltyPoints > 0) {
                pointsValue = Math.min(subtotal - discountAmount, client.loyaltyPoints * settings.loyaltySettings.rupiahPerPoint);
                pointsRedeemed = Math.round(pointsValue / settings.loyaltySettings.rupiahPerPoint);
                client.loyaltyPoints -= pointsRedeemed;
            }
            
            let totalPrice = subtotal - discountAmount - pointsValue;

            const newBookingData = {
                bookingCode: newBookingCode, clientName: formData.name, clientEmail: formData.email, clientPhone: formData.whatsapp,
                bookingDate: admin.firestore.Timestamp.fromDate(new Date(`${formData.date}T${formData.time}`)),
                package: selectedPackage, selectedSubPackage,
                addOns: allAddOns.filter(a => a.subAddOns.some(sa => formData.subAddOnIds.includes(sa.id))),
                selectedSubAddOns, numberOfPeople: formData.people, paymentMethod: formData.paymentMethod,
                paymentStatus: PaymentStatus.Pending, bookingStatus: BookingStatus.Pending,
                totalPrice: totalPrice, remainingBalance: totalPrice, createdAt: admin.firestore.FieldValue.serverTimestamp(),
                paymentProofUrl, notes: formData.notes, discountAmount: discountAmount + pointsValue, 
                discountReason, referralCodeUsed, promoCodeUsed, pointsRedeemed, pointsValue, extraPersonCharge
            };

            transaction.set(bookingRef, newBookingData);
            transaction.set(clientRef, client, { merge: true });
        });

        const bookingDate = new Date(`${formData.date}T${formData.time}`);
        const body = `Sesi untuk ${formData.name} pada ${bookingDate.toLocaleDateString('id-ID', {day: '2-digit', month: 'long'})}`;
        sendPushNotification(db, 'Booking Baru Diterima!', body, '/admin/schedule').catch(err => {
            console.error("Failed to send push notification in background:", err);
        });

        return res.status(200).json({ 
            success: true, 
            message: "Booking berhasil dibuat!",
            bookingCode: newBookingCode, 
            cloudinaryUrl: paymentProofUrl 
        });

    } catch (transactionError) {
        if (paymentProofPublicId) {
            console.warn(`Firestore transaction failed. Deleting orphaned Cloudinary file: ${paymentProofPublicId}`);
            try {
                await cloudinary.uploader.destroy(paymentProofPublicId);
                console.log(`Successfully deleted orphaned file: ${paymentProofPublicId}`);
            } catch (deleteError) {
                console.error(`CRITICAL: Failed to delete orphaned Cloudinary file ${paymentProofPublicId}. Manual cleanup required.`, deleteError);
            }
        }
        throw transactionError; // Re-throw to be caught by the main handler
    }
}

async function handleCreateInstitutional(req: VercelRequest, res: VercelResponse) {
    const db = admin.firestore();
    const { bookingData, userId } = req.body;
    if (!bookingData || !userId) {
        return res.status(400).json({ message: "bookingData and userId are required." });
    }
    
    const newBookingCode = `S8-INST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    let requestLetterUrl = '';
    if (bookingData.requestLetterUrl) {
        const { v2: cloudinary } = await import('cloudinary');
        const uploadResult = await cloudinary.uploader.upload(bookingData.requestLetterUrl, {
            folder: "studio8_requests", public_id: `req_${newBookingCode}`, resource_type: "auto"
        });
        requestLetterUrl = uploadResult.secure_url;
    }

    const newBooking = {
        ...bookingData,
        bookingCode: newBookingCode,
        bookingDate: admin.firestore.Timestamp.fromDate(new Date(bookingData.bookingDate)),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentStatus: PaymentStatus.Pending,
        requestLetterUrl: requestLetterUrl || undefined,
        clientName: bookingData.institutionName,
        clientEmail: '',
        clientPhone: bookingData.picContact,
    };

    await db.collection('bookings').add(newBooking);

    const userDoc = await db.collection('users').doc(userId).get();
    const userName = userDoc.data()?.name || 'Unknown User';
    await db.collection('activity_logs').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId,
        userName,
        action: 'Membuat Booking Instansi',
        details: `Booking untuk ${newBooking.institutionName}`
    });

    return res.status(200).json({ success: true, bookingCode: newBookingCode });
}

async function handleCreatePublicInstitutional(req: VercelRequest, res: VercelResponse) {
    const db = admin.firestore();
    const { v2: cloudinary } = await import('cloudinary');
    const bookingData = req.body;
    const newBookingCode = `S8-INST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    let requestLetterUrl = '';
    let publicId = '';

    if (bookingData.requestLetterBase64) {
        publicId = `req_${newBookingCode}`;
        const uploadResult = await cloudinary.uploader.upload(bookingData.requestLetterBase64, {
            folder: "studio8_requests", public_id: publicId, resource_type: "auto"
        });
        requestLetterUrl = uploadResult.secure_url;
    }

    try {
        const newBooking = {
            clientName: bookingData.institutionName,
            clientEmail: '',
            clientPhone: bookingData.picContact,
            bookingType: 'institutional',
            institutionName: bookingData.institutionName,
            activityType: bookingData.activityType,
            picName: bookingData.picName,
            picContact: bookingData.picContact,
            numberOfParticipants: Number(bookingData.numberOfParticipants),
            requestLetterUrl: requestLetterUrl || null,
            bookingCode: newBookingCode,
            bookingDate: admin.firestore.Timestamp.fromDate(new Date(bookingData.bookingDate)),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            notes: bookingData.notes,
            promoCodeUsed: bookingData.promoCode || null,
            bookingStatus: BookingStatus.Pending,
            paymentStatus: PaymentStatus.Pending,
            paymentMode: 'dp',
            package: {},
            selectedSubPackage: {},
            addOns: [],
            selectedSubAddOns: [],
            totalPrice: 0,
            remainingBalance: 0,
        };
        await db.collection('bookings').add(newBooking);
        const body = `Proposal dari ${newBooking.institutionName} untuk ${newBooking.activityType}`;
        sendPushNotification(db, 'Permintaan Booking Instansi!', body, '/admin/collaboration').catch(err => console.error("Push notification failed in background:", err));
        return res.status(200).json({ success: true, bookingCode: newBookingCode });

    } catch (dbError) {
        if (publicId) {
             console.warn(`Firestore write failed. Deleting orphaned file: ${publicId}`);
             await cloudinary.uploader.destroy(publicId).catch(delErr => console.error(`CRITICAL: Failed to delete orphaned file ${publicId}`, delErr));
        }
        throw dbError;
    }
}

// --- Main Dispatcher ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { action, ...payload } = req.body;

    try {
        initializeFirebaseAdmin();
        initializeCloudinary();
        req.body = payload; // Re-assign body for individual handlers to use

        switch (action) {
            case 'createPublic':
                return await handleCreatePublic(req, res);
            case 'createInstitutional':
                return await handleCreateInstitutional(req, res);
            case 'createPublicInstitutional':
                return await handleCreatePublicInstitutional(req, res);
            default:
                return res.status(400).json({ message: `Unknown booking action: ${action}` });
        }
    } catch (error: any) {
        console.error(`API Error in bookings handler (action: ${action}):`, error);
        return res.status(500).json({
            success: false,
            message: "Gagal memproses permintaan booking.",
            error: error.message || String(error),
        });
    }
}
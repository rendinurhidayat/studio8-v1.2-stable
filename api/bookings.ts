
import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { v2 as cloudinary } from 'cloudinary';
import webpush from 'web-push';
import { initFirebaseAdmin } from '../lib/firebase-admin.js';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "100mb",
        },
    },
};

// --- Type Duplication (necessary for serverless environment) ---
enum BookingStatus { Pending = 'Pending', Completed = 'Completed', Confirmed = 'Confirmed' }
enum PaymentStatus { Pending = 'Pending', Paid = 'Paid' }
enum UserRole { Admin = 'Admin', Staff = 'Staff' }
interface Package { id: string; name: string; description: string; subPackages: SubPackage[]; type?: 'Studio' | 'Outdoor'; imageUrl?: string; isGroupPackage?: boolean; }
interface SubPackage { id:string; name: string; price: number; description?: string; }
interface AddOn { id: string; name: string; subAddOns: SubAddOn[]; }
interface SubAddOn { id: string; name: string; price: number; }
interface Client { id: string; name: string; email: string; phone: string; firstBooking: Date | admin.firestore.Timestamp; lastBooking: Date | admin.firestore.Timestamp; totalBookings: number; totalSpent: number; loyaltyPoints: number; referralCode: string; referredBy?: string; loyaltyTier?: string; }
interface LoyaltyTier { id: string; name: string; bookingThreshold: number; discountPercentage: number; }
// @ts-ignore
interface SystemSettings { loyaltySettings: { firstBookingReferralDiscount: number; loyaltyTiers: LoyaltyTier[]; rupiahPerPoint: number; pointsPerRupiah: number; referralBonusPoints: number; }; }
interface Promo { id: string; code: string; description: string; discountPercentage: number; isActive: boolean; }
interface Booking { id: string; bookingCode: string; clientName: string; clientEmail: string; clientPhone: string; bookingDate: admin.firestore.Timestamp; package: Package; selectedSubPackage: SubPackage; addOns: AddOn[]; selectedSubAddOns: SubAddOn[]; numberOfPeople: number; paymentMethod: string; paymentStatus: PaymentStatus; bookingStatus: BookingStatus; totalPrice: number; remainingBalance: number; createdAt: admin.firestore.Timestamp; paymentProofUrl?: string; rescheduleRequestDate?: admin.firestore.Timestamp; notes?: string; googleDriveLink?: string; discountAmount?: number; discountReason?: string; pointsEarned?: number; pointsRedeemed?: number; pointsValue?: number; // Rupiah value of redeemed points
  referralCodeUsed?: string; promoCodeUsed?: string; extraPersonCharge?: number; }
// --- End Type Duplication ---

// --- Cloudinary Initialization ---
function initializeCloudinary() {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error("Server configuration error: Cloudinary credentials are not set.");
    }
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

// --- Push Notification Helper ---
async function sendPushNotification(db: admin.firestore.Firestore, title: string, body: string, url: string) {
    if (!process.env.VAPID_PRIVATE_KEY || !process.env.VITE_VAPID_PUBLIC_KEY || !process.env.WEB_PUSH_EMAIL) {
        console.warn('VAPID keys or email not set. Skipping push notification.');
        return;
    }
    
    webpush.setVapidDetails(
        `mailto:${process.env.WEB_PUSH_EMAIL}`,
        process.env.VITE_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );

    const subscriptionsSnapshot = await db.collection('pushSubscriptions')
        .where('role', 'in', [UserRole.Admin, UserRole.Staff])
        .get();

    if (subscriptionsSnapshot.empty) {
        console.log("No push subscriptions found for admins or staff.");
        return;
    }
    
    const notificationPayload = JSON.stringify({ title, body, url });

    const sendPromises = subscriptionsSnapshot.docs.flatMap(doc => {
        const data = doc.data();
        const userSubscriptions = data.subscriptions || [];
        
        return userSubscriptions.map((subscription: any) => 
            webpush.sendNotification(subscription, notificationPayload)
                .catch(error => {
                    if (error.statusCode === 410) {
                        console.log(`Subscription for user ${doc.id} expired. Removing.`);
                        // Return a promise to update Firestore
                        return db.collection('pushSubscriptions').doc(doc.id).update({
                            subscriptions: admin.firestore.FieldValue.arrayRemove(subscription)
                        });
                    } else {
                        console.error('Error sending notification:', error);
                    }
                })
        );
    });

    await Promise.allSettled(sendPromises);
}


// --- Server-side API Helpers ---
const fromFirestore = <T extends object>(doc: admin.firestore.DocumentSnapshot): T & { id: string } => {
    return { id: doc.id, ...doc.data() } as T & { id: string };
};


// --- Action Handlers ---

async function handleCompleteSession(req: VercelRequest, res: VercelResponse) {
    const db = admin.firestore();
    const { bookingId, googleDriveLink, currentUserId } = req.body;
    if (!bookingId || !googleDriveLink || !currentUserId) {
        return res.status(400).json({ message: 'bookingId, googleDriveLink, and currentUserId are required.' });
    }

    const currentUserDoc = await db.collection('users').doc(currentUserId).get();
    const currentUserRole = currentUserDoc.data()?.role;
    if (!currentUserDoc.exists || (currentUserRole !== UserRole.Admin && currentUserRole !== UserRole.Staff)) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to complete sessions.' });
    }

    const bookingRef = db.collection('bookings').doc(bookingId);
    let updatedBookingData: any = null;
    
    try {
        await db.runTransaction(async (transaction) => {
            const bookingDoc = await transaction.get(bookingRef);
            if (!bookingDoc.exists) throw new Error("Booking not found.");
            const bookingData = fromFirestore<Booking>(bookingDoc);

            if (bookingData.bookingStatus === BookingStatus.Completed) {
                console.warn(`Attempted to complete an already completed session: ${bookingId}`);
                updatedBookingData = bookingData; // Set data to prevent further processing
                return; // Exit transaction early
            }
            
            const settingsDoc = await transaction.get(db.collection('settings').doc('main'));
            if (!settingsDoc.exists) throw new Error("System settings not found.");
            const settings = settingsDoc.data() as SystemSettings;
            
            const clientRef = db.collection('clients').doc(bookingData.clientEmail.toLowerCase());
            const clientDoc = await transaction.get(clientRef);
            if (!clientDoc.exists) throw new Error("Client not found for booking completion");
            const client = fromFirestore<Client>(clientDoc);

            const pointsEarned = Math.floor(bookingData.totalPrice * settings.loyaltySettings.pointsPerRupiah);
            const clientUpdateData: any = {
                loyaltyPoints: admin.firestore.FieldValue.increment(pointsEarned),
                totalBookings: admin.firestore.FieldValue.increment(1),
                totalSpent: admin.firestore.FieldValue.increment(bookingData.totalPrice),
                lastBooking: admin.firestore.FieldValue.serverTimestamp(),
            };
            
            // Handle referral bonus only for the client's first completed booking
            if (bookingData.referralCodeUsed && client.totalBookings === 0) {
                 const referrerQuery = await transaction.get(db.collection('clients').where('referralCode', '==', bookingData.referralCodeUsed).limit(1));
                 if (!referrerQuery.empty) {
                     const referrerRef = referrerQuery.docs[0].ref;
                     const referrerBonus = settings.loyaltySettings.referralBonusPoints;
                     transaction.update(referrerRef, { loyaltyPoints: admin.firestore.FieldValue.increment(referrerBonus) });
                     clientUpdateData.loyaltyPoints = admin.firestore.FieldValue.increment(pointsEarned + referrerBonus);
                 }
            }

            const newTotalBookings = client.totalBookings + 1;
            const sortedTiers = settings.loyaltySettings.loyaltyTiers.sort((a, b) => b.bookingThreshold - a.bookingThreshold);
            const newTier = sortedTiers.find(tier => newTotalBookings >= tier.bookingThreshold);
            if (newTier && newTier.name !== client.loyaltyTier) {
                clientUpdateData.loyaltyTier = newTier.name;
            }

            const finalPaymentAmount = bookingData.remainingBalance;
            const bookingUpdateData = {
                bookingStatus: BookingStatus.Completed,
                paymentStatus: PaymentStatus.Paid,
                remainingBalance: 0,
                googleDriveLink: googleDriveLink,
                pointsEarned: pointsEarned,
            };

            transaction.update(bookingRef, bookingUpdateData);
            transaction.update(clientRef, clientUpdateData);

            if (finalPaymentAmount > 0) {
                const transactionRef = db.collection('transactions').doc();
                transaction.set(transactionRef, {
                    date: admin.firestore.FieldValue.serverTimestamp(),
                    description: `Pelunasan Sesi ${bookingData.bookingCode} - ${bookingData.clientName}`,
                    type: 'Income', amount: finalPaymentAmount, bookingId: bookingId,
                });
            }
            updatedBookingData = { ...bookingData, ...bookingUpdateData };
        });

        if (updatedBookingData) {
            await admin.firestore().collection('activity_logs').add({
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                userId: currentUserId,
                userName: currentUserDoc.data()?.name || 'Unknown User',
                action: `Menyelesaikan sesi ${updatedBookingData.bookingCode}`,
                details: `Pelunasan Rp ${(updatedBookingData.remainingBalance > 0 ? updatedBookingData.remainingBalance : 0).toLocaleString('id-ID')} dicatat.`
            });

            // Convert Timestamps to ISO strings for JSON serialization
            Object.keys(updatedBookingData).forEach(key => {
                if (updatedBookingData[key] instanceof admin.firestore.Timestamp) {
                    updatedBookingData[key] = updatedBookingData[key].toDate().toISOString();
                }
            });
        }
        
        return res.status(200).json(updatedBookingData);

    } catch(error) {
        console.error("Error in handleCompleteSession transaction:", error);
        throw new Error('Transaksi database untuk menyelesaikan sesi gagal.');
    }
}


async function handleCreatePublic(req: VercelRequest, res: VercelResponse) {
    const db = admin.firestore();
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
            const message = uploadError.error?.message || uploadError.message || 'Gagal mengunggah bukti pembayaran.';
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
            
            if (!settingsDoc.exists) throw new Error("Pengaturan sistem tidak ditemukan. Hubungi admin.");
            
            const allPackages = packagesSnap.docs.map(doc => fromFirestore<Package>(doc));
            const allAddOns = addOnsSnap.docs.map(doc => fromFirestore<AddOn>(doc));
            const allPromos = promosSnap.docs.map(doc => fromFirestore<Promo>(doc));
            const settings = settingsDoc.data() as SystemSettings;
            let client = clientDoc.exists ? fromFirestore<Client>(clientDoc) : null;
            
            const isNewClient = !client;
            if (isNewClient) {
                client = {
                    id: lowerEmail, name: formData.name, email: lowerEmail, phone: formData.whatsapp,
                    firstBooking: admin.firestore.Timestamp.now(), lastBooking: admin.firestore.Timestamp.now(),
                    totalBookings: 0, totalSpent: 0, loyaltyPoints: 0, referralCode: `S8REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`, loyaltyTier: 'Newbie'
                };
            }

            if (!client) throw new Error('Data klien tidak dapat dibuat atau ditemukan.');
            
            const selectedPackage = allPackages.find(p => p.id === formData.packageId);
            if (!selectedPackage) throw new Error("Paket yang Anda pilih tidak lagi tersedia.");
            const selectedSubPackage = selectedPackage.subPackages.find(sp => sp.id === formData.subPackageId);
            if (!selectedSubPackage) throw new Error("Varian paket yang Anda pilih tidak lagi tersedia.");
            const selectedSubAddOns = allAddOns.flatMap(a => a.subAddOns).filter(sa => formData.subAddOnIds.includes(sa.id));
            
            let extraPersonCharge = (selectedPackage.isGroupPackage && formData.people > 2) ? (formData.people - 2) * 15000 : 0;
            let subtotal = selectedSubPackage.price + selectedSubAddOns.reduce((sum, sa) => sum + sa.price, 0) + extraPersonCharge;
            
            let discountAmount = 0, discountReason = '', pointsRedeemed = 0, pointsValue = 0, referralCodeUsed = '', promoCodeUsed = '';

            if (formData.promoCode && formData.promoCode.trim()) {
                const promo = allPromos.find(p => p.code.toUpperCase() === formData.promoCode.toUpperCase() && p.isActive);
                if (promo) {
                    promoCodeUsed = promo.code; discountReason = promo.description;
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
                } else if (!isNewClient) {
                    const sortedTiers = [...settings.loyaltySettings.loyaltyTiers].sort((a,b) => b.bookingThreshold - a.bookingThreshold);
                    const clientTier = sortedTiers.find(t => client!.totalBookings >= t.bookingThreshold);
                    if (clientTier) { discountAmount = subtotal * (clientTier.discountPercentage / 100); discountReason = `Diskon Tier ${clientTier.name} (${clientTier.discountPercentage}%)`; }
                }
            }

            if (formData.usePoints && client.loyaltyPoints > 0) {
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
            success: true, message: "Booking berhasil dibuat!",
            bookingCode: newBookingCode, cloudinaryUrl: paymentProofUrl 
        });

    } catch (transactionError: any) {
        // Jika transaksi database gagal, hapus file yang sudah diupload.
        if (paymentProofPublicId) {
            console.warn(`Firestore transaction failed. Deleting orphaned Cloudinary file: ${paymentProofPublicId}`);
            try {
                await cloudinary.uploader.destroy(paymentProofPublicId);
                console.log(`Successfully deleted orphaned file: ${paymentProofPublicId}`);
            } catch (deleteError) {
                console.error(`CRITICAL: Failed to delete orphaned Cloudinary file ${paymentProofPublicId}. Manual cleanup required.`, deleteError);
            }
        }
        // Lempar error agar ditangkap oleh handler utama.
        throw new Error(`Transaksi database gagal: ${transactionError.message}`);
    }
}

async function handleCreatePublicInstitutional(req: VercelRequest, res: VercelResponse) {
    const db = admin.firestore();
    const bookingData = req.body;
    const newBookingCode = `S8-INST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    let requestLetterUrl = '';
    let publicId = '';

    if (bookingData.requestLetterBase64) {
        publicId = `req_${newBookingCode}`;
        try {
            const uploadResult = await cloudinary.uploader.upload(`data:application/octet-stream;base64,${bookingData.requestLetterBase64}`, {
                folder: "studio8_requests", public_id: publicId, resource_type: "auto"
            });
            requestLetterUrl = uploadResult.secure_url;
        } catch (uploadError) {
            console.error("Cloudinary upload failed for institutional booking:", uploadError);
            throw new Error("Gagal mengunggah surat permintaan.");
        }
    }

    try {
        const newBooking = {
            clientName: bookingData.institutionName, clientEmail: '', clientPhone: bookingData.picContact,
            bookingType: 'institutional', institutionName: bookingData.institutionName,
            activityType: bookingData.activityType, picName: bookingData.picName, picContact: bookingData.picContact,
            numberOfParticipants: Number(bookingData.numberOfParticipants),
            requestLetterUrl: requestLetterUrl || null, bookingCode: newBookingCode,
            bookingDate: admin.firestore.Timestamp.fromDate(new Date(bookingData.bookingDate)),
            createdAt: admin.firestore.FieldValue.serverTimestamp(), notes: bookingData.notes,
            promoCodeUsed: bookingData.promoCode || null, bookingStatus: BookingStatus.Pending,
            paymentStatus: PaymentStatus.Pending, paymentMode: 'dp',
            package: {}, selectedSubPackage: {}, addOns: [], selectedSubAddOns: [],
            totalPrice: 0, remainingBalance: 0,
        };
        await db.collection('bookings').add(newBooking);
        const body = `Proposal dari ${newBooking.institutionName} untuk ${newBooking.activityType}`;
        sendPushNotification(db, 'Permintaan Booking Instansi!', body, '/admin/collaboration').catch(err => console.error("Push notification failed in background:", err));
        return res.status(200).json({ success: true, bookingCode: newBookingCode });

    } catch (dbError: any) {
        if (publicId) {
             console.warn(`Firestore write failed. Deleting orphaned file: ${publicId}`);
             await cloudinary.uploader.destroy(publicId).catch(delErr => console.error(`CRITICAL: Failed to delete orphaned file ${publicId}`, delErr));
        }
        throw new Error(`Gagal menyimpan data booking instansi: ${dbError.message}`);
    }
}

// --- Main Dispatcher ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { action, ...payload } = req.body;

    try {
        initFirebaseAdmin();
        initializeCloudinary();
        req.body = payload; // Re-assign body for individual handlers to use

        switch (action) {
            case 'createPublic':
                return await handleCreatePublic(req, res);
            case 'createPublicInstitutional':
                return await handleCreatePublicInstitutional(req, res);
            case 'complete':
                return await handleCompleteSession(req, res);
            default:
                return res.status(400).json({ message: `Unknown booking action: ${action}` });
        }
    } catch (error: any) {
        console.error(`API Error in bookings handler (action: ${action}):`, error);
        return res.status(500).json({
            success: false,
            message: error.message || "Gagal memproses permintaan booking.",
            error: error.message,
        });
    }
}

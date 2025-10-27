
import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { v2 as cloudinary } from 'cloudinary';
import webpush from 'web-push';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "10mb",
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
// --- End Type Duplication ---

// Helper function for robust initialization
function initializeFirebaseAdmin(): admin.app.App {
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }
    
    const projectId = process.env.GCP_PROJECT_ID || process.env.VERCEL_PROJECT_ID;

    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        throw new Error('Server configuration error: FIREBASE_SERVICE_ACCOUNT_JSON is not set.');
    }

    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

        if (projectId && serviceAccount.project_id !== projectId) {
            console.warn(`Project ID mismatch. Vercel Project ID: ${projectId}, Service Account Project ID: ${serviceAccount.project_id}. This may cause issues.`);
        }
        
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } catch (e: any) {
        console.error("Failed to initialize Firebase Admin:", e.message);
        throw new Error("Server configuration error: Could not parse FIREBASE_SERVICE_ACCOUNT_JSON. Ensure it's a valid, single-line JSON string.");
    }
}

// --- Server-side API Helpers ---
const fromFirestore = <T extends { id: string }>(doc: admin.firestore.DocumentSnapshot): T => {
    return { id: doc.id, ...doc.data() } as T;
};

// --- Push Notification Helper ---
async function sendPushNotification(bookingData: any) {
    if (!process.env.VAPID_PRIVATE_KEY || !process.env.VITE_VAPID_PUBLIC_KEY || !process.env.WEB_PUSH_EMAIL) {
        console.warn('VAPID keys or email not set. Skipping push notification.');
        return;
    }
    
    webpush.setVapidDetails(
        `mailto:${process.env.WEB_PUSH_EMAIL}`,
        process.env.VITE_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );

    const db = admin.firestore();
    const subscriptionsSnapshot = await db.collection('pushSubscriptions')
        .where('role', 'in', [UserRole.Admin, UserRole.Staff])
        .get();

    if (subscriptionsSnapshot.empty) {
        console.log("No push subscriptions found for admins or staff.");
        return;
    }
    
    const notificationPayload = JSON.stringify({
        title: 'Booking Baru Diterima!',
        body: `Sesi untuk ${bookingData.clientName} pada ${bookingData.bookingDate.toDate().toLocaleDateString('id-ID', {day: '2-digit', month: 'long'})}`,
        url: '/admin/schedule' // URL to open on click
    });

    const sendPromises = subscriptionsSnapshot.docs.flatMap(doc => {
        const data = doc.data();
        const userSubscriptions = data.subscriptions || [];
        
        return userSubscriptions.map((subscription: any) => 
            webpush.sendNotification(subscription, notificationPayload)
                .catch(error => {
                    // If subscription is expired (410), remove it from Firestore
                    if (error.statusCode === 410) {
                        console.log(`Subscription for user ${doc.id} expired. Removing.`);
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


export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        initializeFirebaseAdmin();
        const db = admin.firestore();

        // ... [Existing API helpers: getPackages, getAddOns, etc.] ...
        const getPackages = async (): Promise<Package[]> => {
            const snapshot = await db.collection('packages').get();
            return snapshot.docs.map(doc => fromFirestore<Package>(doc));
        };
        const getAddOns = async (): Promise<AddOn[]> => {
            const snapshot = await db.collection('addons').get();
            return snapshot.docs.map(doc => fromFirestore<AddOn>(doc));
        };
        const getSystemSettings = async (): Promise<SystemSettings> => {
            const defaults: SystemSettings = { loyaltySettings: { pointsPerRupiah: 0.001, rupiahPerPoint: 100, referralBonusPoints: 50, firstBookingReferralDiscount: 15000, loyaltyTiers: [] } };
            const doc = await db.collection('settings').doc('main').get();
            if (doc.exists && doc.data()) {
                const settings = doc.data() as Partial<SystemSettings>;
                return { ...defaults, ...settings, loyaltySettings: { ...defaults.loyaltySettings, ...settings.loyaltySettings } };
            }
            return defaults;
        };
        const getClientByEmail = async (email: string): Promise<Client | null> => {
            const doc = await db.collection('clients').doc(email.toLowerCase()).get();
            return doc.exists ? fromFirestore<Client>(doc) : null;
        };
        const getClientByReferralCode = async (code: string): Promise<Client | null> => {
            const snapshot = await db.collection('clients').where('referralCode', '==', code.toUpperCase()).limit(1).get();
            return snapshot.empty ? null : fromFirestore<Client>(snapshot.docs[0]);
        };
        const generateReferralCode = (): string => `S8REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;


        const formData = req.body;
        const newBookingCode = `S8-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        // ... [Existing Cloudinary upload logic] ...
         let paymentProofUrl = '';
        if (formData.paymentProofBase64) {
             if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
                throw new Error("Cloudinary environment variables are not configured on the server.");
            }
             cloudinary.config({
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET,
            });
            const { base64, mimeType } = formData.paymentProofBase64;
            const dataUrl = `data:${mimeType};base64,${base64}`;
            const publicId = `proof_${newBookingCode}`;
            try {
                const uploadResult = await cloudinary.uploader.upload(dataUrl, {
                    folder: "studio8_uploads", public_id: publicId, resource_type: "auto", upload_preset: "studio8_proofs",
                });
                if (!uploadResult?.secure_url) throw new Error("Cloudinary gagal memberikan URL yang aman setelah upload.");
                paymentProofUrl = uploadResult.secure_url;
            } catch (uploadError: any) {
                const message = uploadError.error?.message || uploadError.message || 'Gagal mengunggah bukti pembayaran ke Cloudinary.';
                throw new Error(message);
            }
        }
        
        // ... [Existing validation, calculation, and client management logic] ...
        const [allPackages, allAddOns, settings] = await Promise.all([getPackages(), getAddOns(), getSystemSettings()]);
        const selectedPackage = allPackages.find(p => p.id === formData.packageId);
        if (!selectedPackage) throw new Error("Package not found");
        const selectedSubPackage = selectedPackage.subPackages.find(sp => sp.id === formData.subPackageId);
        if (!selectedSubPackage) throw new Error("Sub-package not found");
        const selectedSubAddOns = allAddOns.flatMap(a => a.subAddOns).filter(sa => formData.subAddOnIds.includes(sa.id));
        const lowerEmail = formData.email.toLowerCase();
        const clientRef = db.collection('clients').doc(lowerEmail);
        let client = await getClientByEmail(formData.email);
        const isNewClient = !client;
        if (isNewClient) {
            client = {
                id: lowerEmail, name: formData.name, email: lowerEmail, phone: formData.whatsapp,
                firstBooking: admin.firestore.Timestamp.now(), lastBooking: admin.firestore.Timestamp.now(),
                totalBookings: 0, totalSpent: 0, loyaltyPoints: 0, referralCode: generateReferralCode(), loyaltyTier: 'Newbie'
            };
        }
        let extraPersonCharge = (selectedPackage.isGroupPackage && formData.people > 2) ? (formData.people - 2) * 15000 : 0;
        let subtotal = selectedSubPackage.price + selectedSubAddOns.reduce((sum, sa) => sum + sa.price, 0) + extraPersonCharge;
        let discountAmount = 0, discountReason = '', pointsRedeemed = 0, pointsValue = 0, referralCodeUsed = '';
        if (isNewClient && formData.referralCode) {
            const referrer = await getClientByReferralCode(formData.referralCode);
            if (referrer && referrer.email.toLowerCase() !== lowerEmail) {
                discountAmount = settings.loyaltySettings.firstBookingReferralDiscount;
                discountReason = `Diskon Referral`; referralCodeUsed = formData.referralCode.toUpperCase(); client.referredBy = referralCodeUsed;
            }
        } else if (!isNewClient && client) {
            const sortedTiers = [...settings.loyaltySettings.loyaltyTiers].sort((a,b) => b.bookingThreshold - a.bookingThreshold);
            const clientTier = sortedTiers.find(t => client!.totalBookings >= t.bookingThreshold);
            if (clientTier) { discountAmount = subtotal * (clientTier.discountPercentage / 100); discountReason = `Diskon Tier ${clientTier.name} (${clientTier.discountPercentage}%)`; }
        }
        if (formData.usePoints && client && client.loyaltyPoints > 0) {
            pointsValue = Math.min(subtotal - discountAmount, client.loyaltyPoints * settings.loyaltySettings.rupiahPerPoint);
            pointsRedeemed = Math.round(pointsValue / settings.loyaltySettings.rupiahPerPoint);
            discountAmount += pointsValue;
            discountReason = `${discountReason ? discountReason + ' & ' : ''}${pointsRedeemed.toLocaleString('id-ID')} Poin`;
            client.loyaltyPoints -= pointsRedeemed;
        }
        let totalPrice = subtotal - discountAmount;

        const newBookingData = {
            bookingCode: newBookingCode,
            clientName: formData.name, clientEmail: formData.email, clientPhone: formData.whatsapp,
            bookingDate: admin.firestore.Timestamp.fromDate(new Date(`${formData.date}T${formData.time}`)),
            package: selectedPackage, selectedSubPackage: selectedSubPackage,
            addOns: allAddOns.filter(a => a.subAddOns.some(sa => formData.subAddOnIds.includes(sa.id))),
            selectedSubAddOns: selectedSubAddOns,
            numberOfPeople: formData.people,
            paymentMethod: formData.paymentMethod,
            paymentStatus: PaymentStatus.Pending,
            bookingStatus: BookingStatus.Pending,
            totalPrice: totalPrice,
            remainingBalance: totalPrice,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            paymentProofUrl,
            notes: formData.notes,
            discountAmount, discountReason, referralCodeUsed, pointsRedeemed, pointsValue, extraPersonCharge
        };
        
        const bookingRef = db.collection('bookings').doc();
        await db.runTransaction(async (transaction) => {
            transaction.set(bookingRef, newBookingData);
            if(isNewClient) {
                 transaction.set(clientRef, client);
            } else {
                 transaction.update(clientRef, { loyaltyPoints: client!.loyaltyPoints });
            }
        });

        // --- NEW: Trigger Push Notification (asynchronously) ---
        sendPushNotification(newBookingData).catch(err => {
            console.error("Failed to send push notification in background:", err);
        });

        return res.status(200).json({ 
            success: true, 
            message: "Booking berhasil dibuat!",
            bookingCode: newBookingData.bookingCode, 
            cloudinaryUrl: paymentProofUrl 
        });

    } catch (error: any) {
        console.error("API Error in createPublicBooking:", error);
        return res.status(500).json({
            success: false,
            message: "Gagal membuat booking.",
            error: error.message || String(error),
        });
    }
}

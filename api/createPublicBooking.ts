import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { v2 as cloudinary } from 'cloudinary';

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
interface Package { id: string; name: string; description: string; subPackages: SubPackage[]; type?: 'Studio' | 'Outdoor'; imageUrl?: string; isGroupPackage?: boolean; }
interface SubPackage { id:string; name: string; price: number; description?: string; }
interface AddOn { id: string; name: string; subAddOns: SubAddOn[]; }
interface SubAddOn { id: string; name: string; price: number; }
interface Client { id: string; name: string; email: string; phone: string; firstBooking: Date | admin.firestore.Timestamp; lastBooking: Date | admin.firestore.Timestamp; totalBookings: number; totalSpent: number; loyaltyPoints: number; referralCode: string; referredBy?: string; loyaltyTier?: string; }
interface SystemSettings { loyaltySettings: { firstBookingReferralDiscount: number; loyaltyTiers: { name: string; bookingThreshold: number; discountPercentage: number }[]; rupiahPerPoint: number; pointsPerRupiah: number; referralBonusPoints: number; }; }
// --- End Type Duplication ---

// Helper function for robust initialization
function initializeFirebaseAdmin(): admin.app.App {
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }

    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        throw new Error('Firebase environment variable FIREBASE_SERVICE_ACCOUNT_JSON is not set. Please provide the stringified service account JSON.');
    }

    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } catch (e: any) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", e);
        throw new Error("The FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not a valid JSON string.");
    }
}

// --- Server-side API Helpers ---
const fromFirestore = <T extends { id: string }>(doc: admin.firestore.DocumentSnapshot): T => {
    return { id: doc.id, ...doc.data() } as T;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        initializeFirebaseAdmin();
        const db = admin.firestore();

        const getPackages = async (): Promise<Package[]> => {
            const snapshot = await db.collection('packages').get();
            return snapshot.docs.map(doc => fromFirestore<Package>(doc));
        };
        const getAddOns = async (): Promise<AddOn[]> => {
            const snapshot = await db.collection('addons').get();
            return snapshot.docs.map(doc => fromFirestore<AddOn>(doc));
        };
        const getSystemSettings = async (): Promise<SystemSettings> => {
            const doc = await db.collection('settings').doc('main').get();
            return doc.data() as SystemSettings;
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
        console.log("Received raw name from form:", formData.name);

        // --- 1. Handle Payment Proof Upload to Cloudinary ---
        let paymentProofUrl = '';
        if (formData.paymentProofBase64) {
             cloudinary.config({
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET,
            });

            const { base64, mimeType } = formData.paymentProofBase64;
            const dataUrl = `data:${mimeType};base64,${base64}`;
            
            // 🔒 Sanitize filename to prevent Cloudinary errors
            const safeFileName =
                (formData.name && String(formData.name).replace(/[\/\\]+/g, "_").replace(/[^\w.-]/g, "_")) ||
                `proof_${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
            console.log("Sanitized filename:", safeFileName);

            const publicId = safeFileName.split(".")[0];
            console.log(`Attempting to upload to Cloudinary with public_id: '${publicId}'`);

            try {
                const uploadResult = await cloudinary.uploader.upload(dataUrl, {
                    folder: "studio8_uploads",
                    public_id: publicId,
                    resource_type: "auto",
                    upload_preset: "studio8_proofs",
                });

                if (!uploadResult?.secure_url) {
                    console.error("Cloudinary upload successful but returned no secure_url:", uploadResult);
                    throw new Error("Cloudinary gagal memberikan URL yang aman setelah upload.");
                }
                
                paymentProofUrl = uploadResult.secure_url;
                console.log("✅ Cloudinary upload successful:", paymentProofUrl);

            } catch (uploadError: any) {
                console.error("Full Cloudinary Upload Error Object:", JSON.stringify(uploadError, null, 2));
                const message = uploadError.error?.message || uploadError.message || 'Gagal mengunggah bukti pembayaran ke Cloudinary.';
                throw new Error(message);
            }
        }

        // --- 2. Re-fetch data for server-side validation & calculation ---
        const [allPackages, allAddOns, settings] = await Promise.all([getPackages(), getAddOns(), getSystemSettings()]);

        const selectedPackage = allPackages.find(p => p.id === formData.packageId);
        if (!selectedPackage) throw new Error("Package not found");
        const selectedSubPackage = selectedPackage.subPackages.find(sp => sp.id === formData.subPackageId);
        if (!selectedSubPackage) throw new Error("Sub-package not found");
        const selectedSubAddOns = allAddOns.flatMap(a => a.subAddOns).filter(sa => formData.subAddOnIds.includes(sa.id));

        // --- 3. Client Management ---
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
        
        // --- 4. Price & Discount Calculation (Server-side) ---
        let extraPersonCharge = (selectedPackage.isGroupPackage && formData.people > 2) ? (formData.people - 2) * 15000 : 0;
        let subtotal = selectedSubPackage.price + selectedSubAddOns.reduce((sum, sa) => sum + sa.price, 0) + extraPersonCharge;
        
        let discountAmount = 0, discountReason = '', pointsRedeemed = 0, pointsValue = 0, referralCodeUsed = '';

        if (isNewClient && formData.referralCode) {
            const referrer = await getClientByReferralCode(formData.referralCode);
            if (referrer && referrer.email.toLowerCase() !== lowerEmail) {
                discountAmount = settings.loyaltySettings.firstBookingReferralDiscount;
                discountReason = `Diskon Referral`;
                referralCodeUsed = formData.referralCode.toUpperCase();
                client.referredBy = referralCodeUsed;
            }
        } else if (!isNewClient && client) {
            const sortedTiers = [...settings.loyaltySettings.loyaltyTiers].sort((a,b) => b.bookingThreshold - a.bookingThreshold);
            const clientTier = sortedTiers.find(t => client!.totalBookings >= t.bookingThreshold);
            if (clientTier) {
                discountAmount = subtotal * (clientTier.discountPercentage / 100);
                discountReason = `Diskon Tier ${clientTier.name} (${clientTier.discountPercentage}%)`;
            }
        }

        if (formData.usePoints && client && client.loyaltyPoints > 0) {
            pointsValue = Math.min(subtotal - discountAmount, client.loyaltyPoints * settings.loyaltySettings.rupiahPerPoint);
            pointsRedeemed = Math.round(pointsValue / settings.loyaltySettings.rupiahPerPoint);
            discountAmount += pointsValue;
            discountReason = `${discountReason ? discountReason + ' & ' : ''}${pointsRedeemed.toLocaleString('id-ID')} Poin`;
            client.loyaltyPoints -= pointsRedeemed;
        }

        let totalPrice = subtotal - discountAmount;

        // --- 5. Create Booking Document ---
        const newBookingData = {
            bookingCode: `S8-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
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
        
        // --- 6. Firestore Transaction ---
        const bookingRef = db.collection('bookings').doc();
        await db.runTransaction(async (transaction) => {
            transaction.set(bookingRef, newBookingData);
            if(isNewClient) {
                 transaction.set(clientRef, client);
            } else {
                 transaction.update(clientRef, { loyaltyPoints: client!.loyaltyPoints });
            }
        });

        // --- 7. Respond ---
        return res.status(200).json({ 
            success: true, 
            message: "Booking berhasil dibuat!",
            bookingId: newBookingData.bookingCode, 
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
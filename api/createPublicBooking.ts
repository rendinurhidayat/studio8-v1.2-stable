import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue, DocumentSnapshot } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { Buffer } from 'buffer';

// --- Type Duplication (necessary for serverless environment) ---
enum BookingStatus { Pending = 'Pending' }
enum PaymentStatus { Pending = 'Pending' }
interface Package { id: string; name: string; description: string; subPackages: SubPackage[]; type?: 'Studio' | 'Outdoor'; imageUrl?: string; isGroupPackage?: boolean; }
interface SubPackage { id:string; name: string; price: number; description?: string; }
interface AddOn { id: string; name: string; subAddOns: SubAddOn[]; }
interface SubAddOn { id: string; name: string; price: number; }
interface Client { id: string; name: string; email: string; phone: string; firstBooking: Date | Timestamp; lastBooking: Date | Timestamp; totalBookings: number; totalSpent: number; loyaltyPoints: number; referralCode: string; referredBy?: string; loyaltyTier?: string; }
interface SystemSettings { loyaltySettings: { firstBookingReferralDiscount: number; loyaltyTiers: { name: string; bookingThreshold: number; discountPercentage: number }[]; rupiahPerPoint: number; pointsPerRupiah: number; referralBonusPoints: number; }; }
// --- End Type Duplication ---

// Helper function for robust initialization
function initializeFirebaseAdmin(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }
    
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON || !process.env.FIREBASE_PROJECT_ID) {
        throw new Error('Firebase environment variables (FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_PROJECT_ID) are not set in the Vercel project settings.');
    }
    
    // FIX: Correctly parse the service account JSON from the environment variable.
    // The `private_key` in the service account JSON contains newline characters (\n)
    // which can be improperly escaped when stored in environment variables (e.g., in Vercel).
    // This fix ensures the private key is correctly formatted before authenticating.
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    
    return initializeApp({
        credential: cert(serviceAccount),
        storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
    });
}

// --- Server-side API Helpers ---
const fromFirestore = <T extends { id: string }>(doc: DocumentSnapshot): T => {
    return { id: doc.id, ...doc.data() } as T;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        initializeFirebaseAdmin();
        const db = getFirestore();
        const storage = getStorage();

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

        // --- 1. Upload Payment Proof ---
        let paymentProofUrl = '', paymentProofFileName = '';
        if (formData.paymentProofBase64) {
            const { base64, fileName, mimeType } = formData.paymentProofBase64;
            const buffer = Buffer.from(base64, 'base64');
            const file = storage.bucket().file(`payment_proofs/${Date.now()}-${fileName}`);
            await file.save(buffer, { metadata: { contentType: mimeType } });
            await file.makePublic();
            paymentProofUrl = file.publicUrl();
            paymentProofFileName = fileName;
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
                firstBooking: Timestamp.now(), lastBooking: Timestamp.now(),
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
            bookingDate: Timestamp.fromDate(new Date(`${formData.date}T${formData.time}`)),
            package: selectedPackage, selectedSubPackage: selectedSubPackage,
            addOns: allAddOns.filter(a => a.subAddOns.some(sa => formData.subAddOnIds.includes(sa.id))),
            selectedSubAddOns: selectedSubAddOns,
            numberOfPeople: formData.people,
            paymentMethod: formData.paymentMethod,
            paymentStatus: PaymentStatus.Pending,
            bookingStatus: BookingStatus.Pending,
            totalPrice: totalPrice,
            remainingBalance: totalPrice,
            createdAt: FieldValue.serverTimestamp(),
            paymentProofUrl, paymentProofFileName, notes: formData.notes,
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
        return res.status(200).json({ bookingCode: newBookingData.bookingCode });

    } catch (error: any) {
        console.error('API Error in createPublicBooking:', error.stack);
        
        let errorMessage = 'Terjadi kesalahan internal pada server.';
        if (error.message.includes('Firebase environment variables')) {
             errorMessage = 'Kesalahan konfigurasi server. Harap hubungi support.';
        } else if (error.message.includes('invalid_grant') || error.message.includes('invalid-credential')) {
             errorMessage = 'Kesalahan autentikasi server. Harap hubungi support.';
        }

        return res.status(500).json({ message: errorMessage, error: error.message });
    }
}
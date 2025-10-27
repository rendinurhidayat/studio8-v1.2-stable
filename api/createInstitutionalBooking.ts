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

// --- Type Duplication ---
enum BookingStatus { Pending = 'Pending' }
enum PaymentStatus { Pending = 'Pending' }
// --- End Type Duplication ---

function initializeFirebaseAdmin() {
    if (admin.apps.length > 0) return admin.apps[0]!;
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) throw new Error('Firebase environment variable not set.');
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        initializeFirebaseAdmin();
        const db = admin.firestore();

        const { bookingData, userId } = req.body;
        if (!bookingData || !userId) {
            return res.status(400).json({ message: "bookingData and userId are required." });
        }
        
        const newBookingCode = `S8-INST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        let requestLetterUrl = '';
        if (bookingData.requestLetterUrl) {
            cloudinary.config({
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET,
            });
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
            clientName: bookingData.institutionName, // For consistency in some views
            clientEmail: '', // Not required for institutional
            clientPhone: bookingData.picContact,
        };
        // Remove file content from Firestore object
        delete newBooking.requestLetterUrl;


        await db.collection('bookings').add(newBooking);

        // Log Activity
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

    } catch (error: any) {
        console.error("API Error in createInstitutionalBooking:", error);
        return res.status(500).json({ message: "Gagal membuat booking.", error: error.message });
    }
}

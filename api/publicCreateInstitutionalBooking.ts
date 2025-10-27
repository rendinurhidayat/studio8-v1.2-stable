
import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { v2 as cloudinary } from 'cloudinary';
import webpush from 'web-push';

export const config = {
    api: { bodyParser: { sizeLimit: "10mb" } },
};

// --- Type Duplication ---
enum BookingStatus { Pending = 'Pending' }
enum PaymentStatus { Pending = 'Pending' }
enum UserRole { Admin = 'Admin', Staff = 'Staff' }
// --- End Type Duplication ---

function initializeFirebaseAdmin() {
    if (admin.apps.length > 0) return admin.apps[0]!;
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) throw new Error('Firebase environment variable not set.');
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

async function sendPushNotification(bookingData: any) {
    if (!process.env.VAPID_PRIVATE_KEY || !process.env.VITE_VAPID_PUBLIC_KEY || !process.env.WEB_PUSH_EMAIL) {
        console.warn('VAPID keys not set. Skipping push notification.');
        return;
    }
    webpush.setVapidDetails(`mailto:${process.env.WEB_PUSH_EMAIL}`, process.env.VITE_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    
    const db = admin.firestore();
    const subscriptionsSnapshot = await db.collection('pushSubscriptions').where('role', 'in', [UserRole.Admin, UserRole.Staff]).get();
    if (subscriptionsSnapshot.empty) return;

    const notificationPayload = JSON.stringify({
        title: 'Permintaan Booking Instansi!',
        body: `${bookingData.institutionName} - ${bookingData.activityType}`,
        url: '/admin/institutional-bookings'
    });

    const sendPromises = subscriptionsSnapshot.docs.map(doc => 
        (doc.data().subscriptions || []).map((sub: any) => 
            webpush.sendNotification(sub, notificationPayload).catch(err => console.error('Failed to send push', err))
        )
    ).flat();
    await Promise.allSettled(sendPromises);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        initializeFirebaseAdmin();
        const db = admin.firestore();
        const bookingData = req.body;
        
        const newBookingCode = `S8-INST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        let requestLetterUrl = '';
        if (bookingData.requestLetterBase64) {
            cloudinary.config({
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET,
            });
            const uploadResult = await cloudinary.uploader.upload(bookingData.requestLetterBase64, {
                folder: "studio8_requests", public_id: `req_${newBookingCode}`, resource_type: "auto"
            });
            requestLetterUrl = uploadResult.secure_url;
        }

        const newBooking = {
            // Client data
            clientName: bookingData.institutionName, // For consistency
            clientEmail: '', // Not required for this type
            clientPhone: bookingData.picContact,
            
            // Institutional specific data
            bookingType: 'institutional',
            institutionName: bookingData.institutionName,
            activityType: bookingData.activityType,
            picName: bookingData.picName,
            picContact: bookingData.picContact,
            numberOfParticipants: Number(bookingData.numberOfParticipants),
            requestLetterUrl: requestLetterUrl || null,
            
            // Booking details
            bookingCode: newBookingCode,
            bookingDate: admin.firestore.Timestamp.fromDate(new Date(bookingData.bookingDate)),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            notes: bookingData.notes,

            // Statuses and Payment
            bookingStatus: BookingStatus.Pending,
            paymentStatus: PaymentStatus.Pending,
            paymentMode: 'dp', // Default, admin can change later

            // Empty fields to be filled by admin
            package: {},
            selectedSubPackage: {},
            addOns: [],
            selectedSubAddOns: [],
            totalPrice: 0,
            remainingBalance: 0,
        };

        await db.collection('bookings').add(newBooking);

        sendPushNotification(newBooking).catch(err => console.error("Push notification failed in background:", err));

        return res.status(200).json({ success: true, bookingCode: newBookingCode });

    } catch (error: any) {
        console.error("API Error in publicCreateInstitutionalBooking:", error);
        return res.status(500).json({ message: "Gagal membuat permintaan booking.", error: error.message });
    }
}

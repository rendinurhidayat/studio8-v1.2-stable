
import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { v2 as cloudinary } from 'cloudinary';
import webpush from 'web-push';

export const config = {
    api: { bodyParser: { sizeLimit: "10mb" } },
};

// --- Type Duplication ---
enum UserRole { Admin = 'Admin', Staff = 'Staff' }
// --- End Type Duplication ---

function initializeFirebaseAdmin() {
    if (admin.apps.length > 0) return admin.apps[0]!;
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) throw new Error('Firebase environment variable not set.');
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

async function sendPushNotification(sponsorshipData: any) {
    if (!process.env.VAPID_PRIVATE_KEY || !process.env.VITE_VAPID_PUBLIC_KEY || !process.env.WEB_PUSH_EMAIL) {
        console.warn('VAPID keys not set. Skipping push notification.');
        return;
    }
    webpush.setVapidDetails(`mailto:${process.env.WEB_PUSH_EMAIL}`, process.env.VITE_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    
    const db = admin.firestore();
    const subscriptionsSnapshot = await db.collection('pushSubscriptions').where('role', 'in', [UserRole.Admin, UserRole.Staff]).get();
    if (subscriptionsSnapshot.empty) return;

    const notificationPayload = JSON.stringify({
        title: 'Proposal Kerjasama Baru!',
        body: `Dari ${sponsorshipData.institutionName} untuk event ${sponsorshipData.eventName}`,
        url: '/admin/sponsorship'
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
        const sponsorshipData = req.body;
        
        const publicId = `proposal_${sponsorshipData.institutionName?.replace(/\s+/g, '_')}_${Date.now()}`;

        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        const uploadResult = await cloudinary.uploader.upload(sponsorshipData.proposalBase64, {
            folder: "studio8_proposals", public_id: publicId, resource_type: "auto"
        });

        const newSponsorship = {
            eventName: sponsorshipData.eventName,
            institutionName: sponsorshipData.institutionName,
            picName: sponsorshipData.picName,
            picContact: sponsorshipData.picContact,
            partnershipType: sponsorshipData.partnershipType,
            benefits: sponsorshipData.benefits,
            proposalUrl: uploadResult.secure_url,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'Pending',
        };

        await db.collection('sponsorships').add(newSponsorship);

        sendPushNotification(newSponsorship).catch(err => console.error("Push notification failed in background:", err));

        return res.status(200).json({ success: true });

    } catch (error: any) {
        console.error("API Error in publicCreateSponsorship:", error);
        return res.status(500).json({ message: "Gagal mengirim proposal.", error: error.message });
    }
}

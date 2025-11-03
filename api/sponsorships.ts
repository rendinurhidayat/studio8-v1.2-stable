
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

// --- Type Duplication ---
enum UserRole { Admin = 'Admin', Staff = 'Staff' }
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


// --- Action Handlers ---

async function handleCreatePublic(req: VercelRequest, res: VercelResponse) {
    const db = admin.firestore();
    const sponsorshipData = req.body;
    
    if (!sponsorshipData.proposalBase64) {
        throw new Error("Proposal file is required.");
    }

    const publicId = `proposal_${sponsorshipData.institutionName?.replace(/\s+/g, '_')}_${Date.now()}`;
    
    let uploadResult;
    try {
        uploadResult = await cloudinary.uploader.upload(sponsorshipData.proposalBase64, {
            folder: "studio8_proposals", public_id: publicId, resource_type: "auto", upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET
        });
    } catch (uploadError) {
        console.error("Cloudinary upload failed for sponsorship proposal:", uploadError);
        throw new Error("Gagal mengunggah file proposal. Mohon coba lagi.");
    }

    try {
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
        const body = `Dari ${newSponsorship.institutionName} untuk event ${newSponsorship.eventName}`;
        sendPushNotification(db, 'Proposal Kerjasama Baru!', body, '/admin/collaboration').catch(err => console.error("Push notification failed in background:", err));
        return res.status(200).json({ success: true });
    } catch (dbError: any) {
        console.warn(`Firestore write failed for public sponsorship. Deleting orphaned file: ${publicId}`);
        await cloudinary.uploader.destroy(publicId).catch(delErr => console.error(`CRITICAL: Failed to delete orphaned file ${publicId}`, delErr));
        throw new Error(`Gagal menyimpan data proposal ke database: ${dbError.message}`);
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
        req.body = payload;

        switch (action) {
            case 'createPublic':
                return await handleCreatePublic(req, res);
            default:
                return res.status(400).json({ message: `Unknown sponsorship action: ${action}` });
        }
    } catch (error: any) {
        console.error(`API Error in sponsorships handler (action: ${action}):`, error);
        return res.status(500).json({
            success: false,
            message: error.message || "Gagal memproses permintaan sponsorship.",
            error: error.message,
        });
    }
}

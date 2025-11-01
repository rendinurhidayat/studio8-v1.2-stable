
import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
// Fix: Removed .ts extension for proper module resolution.
import { initializeFirebaseAdmin, initializeCloudinary, sendPushNotification } from './lib/services';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "100mb",
        },
    },
};

// --- Action Handlers ---

async function handleCreate(req: VercelRequest, res: VercelResponse) {
    const db = admin.firestore();
    const { v2: cloudinary } = await import('cloudinary');
    const { sponsorshipData, userId } = req.body;
    if (!sponsorshipData || !userId) {
        return res.status(400).json({ message: "sponsorshipData and userId are required." });
    }
    
    const publicId = `proposal_${sponsorshipData.institutionName?.replace(/\s+/g, '_')}_${Date.now()}`;
    const uploadResult = await cloudinary.uploader.upload(sponsorshipData.proposalUrl, {
        folder: "studio8_proposals", public_id: publicId, resource_type: "auto", upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET
    });

    try {
        const newSponsorship = {
            ...sponsorshipData,
            proposalUrl: uploadResult.secure_url,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'Pending',
        };
        await db.collection('sponsorships').add(newSponsorship);

        const userDoc = await db.collection('users').doc(userId).get();
        const userName = userDoc.data()?.name || 'Unknown User';
        await db.collection('activity_logs').add({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            userId,
            userName,
            action: 'Menambah Kerjasama Sponsorship',
            details: `Proposal dari ${newSponsorship.institutionName}`
        });

        return res.status(200).json({ success: true });
    } catch (dbError) {
        console.warn(`Firestore write failed for sponsorship. Deleting orphaned file: ${publicId}`);
        await cloudinary.uploader.destroy(publicId).catch(delErr => console.error(`CRITICAL: Failed to delete orphaned file ${publicId}`, delErr));
        throw dbError;
    }
}

async function handleCreatePublic(req: VercelRequest, res: VercelResponse) {
    const db = admin.firestore();
    const { v2: cloudinary } = await import('cloudinary');
    const sponsorshipData = req.body;
    
    const publicId = `proposal_${sponsorshipData.institutionName?.replace(/\s+/g, '_')}_${Date.now()}`;
    const uploadResult = await cloudinary.uploader.upload(sponsorshipData.proposalBase64, {
        folder: "studio8_proposals", public_id: publicId, resource_type: "auto", upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET
    });

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
    } catch (dbError) {
        console.warn(`Firestore write failed for public sponsorship. Deleting orphaned file: ${publicId}`);
        await cloudinary.uploader.destroy(publicId).catch(delErr => console.error(`CRITICAL: Failed to delete orphaned file ${publicId}`, delErr));
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
        req.body = payload;

        switch (action) {
            case 'create':
                return await handleCreate(req, res);
            case 'createPublic':
                return await handleCreatePublic(req, res);
            default:
                return res.status(400).json({ message: `Unknown sponsorship action: ${action}` });
        }
    } catch (error: any) {
        console.error(`API Error in sponsorships handler (action: ${action}):`, error);
        return res.status(500).json({
            success: false,
            message: "Gagal memproses permintaan sponsorship.",
            error: error.message || String(error),
        });
    }
}
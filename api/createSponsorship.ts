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

        const { sponsorshipData, userId } = req.body;
        if (!sponsorshipData || !userId) {
            return res.status(400).json({ message: "sponsorshipData and userId are required." });
        }
        
        const publicId = `proposal_${sponsorshipData.institutionName?.replace(/\s+/g, '_')}_${Date.now()}`;

        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        const uploadResult = await cloudinary.uploader.upload(sponsorshipData.proposalUrl, {
            folder: "studio8_proposals", public_id: publicId, resource_type: "auto"
        });

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

    } catch (error: any) {
        console.error("API Error in createSponsorship:", error);
        return res.status(500).json({ message: "Gagal menyimpan sponsorship.", error: error.message });
    }
}

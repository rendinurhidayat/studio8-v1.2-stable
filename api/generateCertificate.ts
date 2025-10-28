
import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { v2 as cloudinary } from 'cloudinary';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { studentName, major, period, mentor, pdfBase64 } = req.body;
        if (!studentName || !major || !period || !mentor || !pdfBase64) {
            return res.status(400).json({ message: 'Missing required fields: studentName, major, period, mentor, and pdfBase64.' });
        }

        initializeFirebaseAdmin();
        const db = admin.firestore();
        
        // 1. Generate unique ID
        const certificateId = `CERT-S8-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
        const validationUrl = `https://studio-8-manager-ec159.web.app/#/validate/${certificateId}`;
        
        // 2. Upload PDF to Cloudinary
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            throw new Error("Server configuration error: Cloudinary credentials are not set.");
        }
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        const uploadResult = await cloudinary.uploader.upload(pdfBase64, {
            folder: "studio8_certificates",
            public_id: certificateId,
            resource_type: "auto", // Let Cloudinary detect it's a PDF
        });
        const certificateUrl = uploadResult.secure_url;

        // 3. Save data to Firestore
        const certificateData = {
            id: certificateId,
            studentName,
            major,
            period,
            mentor,
            issuedDate: admin.firestore.FieldValue.serverTimestamp(),
            certificateUrl,
            qrValidationUrl: validationUrl,
            verified: true,
        };
        await db.collection('certificates').doc(certificateId).set(certificateData);

        // Log activity
        const userSnapshot = await db.collection('users').where('name', '==', mentor).limit(1).get();
        if(!userSnapshot.empty) {
            const adminId = userSnapshot.docs[0].id;
            await db.collection('activity_logs').add({
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                userId: adminId,
                userName: mentor,
                action: 'Membuat Sertifikat',
                details: `Sertifikat untuk ${studentName}`
            });
        }
        
        // 4. Return response
        return res.status(200).json({ success: true, url: certificateUrl, id: certificateId });

    } catch (error: any) {
        console.error('API Error in generateCertificate:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}

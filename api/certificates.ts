
import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { v2 as cloudinary } from 'cloudinary';
// Fix: Removed .ts extension for proper module resolution.
import { initializeFirebaseAdmin, initializeCloudinary } from './lib/services.js';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "100mb",
        },
    },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { studentName, major, period, mentor, pdfBase64 } = req.body;
    if (!studentName || !major || !period || !mentor || !pdfBase64) {
        return res.status(400).json({ message: 'Missing required fields: studentName, major, period, mentor, and pdfBase64.' });
    }

    initializeFirebaseAdmin();
    initializeCloudinary();
    const db = admin.firestore();
    
    // 1. Generate unique ID
    const certificateId = `CERT-S8-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    
    try {
        // 2. Upload PDF to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(pdfBase64, {
            folder: "studio8_certificates",
            public_id: certificateId,
            resource_type: "auto",
            upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
        });
        const certificateUrl = uploadResult.secure_url;
        
        try {
            // 3. Save data to Firestore
            const validationUrl = `https://studio-8-manager-ec159.web.app/#/validate/${certificateId}`;
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

        } catch (dbError) {
            console.warn(`Firestore write failed. Deleting orphaned certificate file: ${certificateId}`);
            // The public_id for certificates is just the certificateId itself.
            await cloudinary.uploader.destroy(`studio8_certificates/${certificateId}`, { resource_type: 'raw' }).catch(delErr => console.error(`CRITICAL: Failed to delete orphaned certificate ${certificateId}`, delErr));
            throw dbError; // Re-throw to be caught by the main handler
        }

    } catch (error: any) {
        console.error('API Error in generateCertificate:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}


import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { v2 as cloudinary } from 'cloudinary';
import { initFirebaseAdmin } from '../lib/firebase-admin.js';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "100mb",
        },
    },
};

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


export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { studentName, major, period, mentor, pdfBase64 } = req.body;
    if (!studentName || !major || !period || !mentor || !pdfBase64) {
        return res.status(400).json({ message: 'Missing required fields: studentName, major, period, mentor, and pdfBase64.' });
    }

    let certificateUrl: string | undefined;
    const certificateId = `CERT-S8-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const publicId = `studio8_certificates/${certificateId}`;
    
    try {
        initFirebaseAdmin();
        initializeCloudinary();
        const db = admin.firestore();
        
        // 1. Upload PDF to Cloudinary
        try {
            const uploadResult = await cloudinary.uploader.upload(pdfBase64, {
                folder: "studio8_certificates",
                public_id: certificateId,
                resource_type: "auto",
                upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
            });
            certificateUrl = uploadResult.secure_url;
            if (!certificateUrl) {
                throw new Error("Cloudinary upload did not return a secure URL.");
            }
        } catch (uploadError) {
            console.error("Cloudinary upload failed for certificate:", uploadError);
            throw new Error("Gagal mengunggah file sertifikat PDF.");
        }
        
        // 2. Save data to Firestore
        try {
            const validationUrl = `https://studio-8-manager-ec159.web.app/#/validate/${certificateId}`;
            const certificateData = {
                id: certificateId,
                studentName, major, period, mentor,
                issuedDate: admin.firestore.FieldValue.serverTimestamp(),
                certificateUrl, qrValidationUrl: validationUrl,
                verified: true,
            };
            await db.collection('certificates').doc(certificateId).set(certificateData);

            // 3. Log activity (best-effort, don't fail the whole request if this fails)
            try {
                const userSnapshot = await db.collection('users').where('name', '==', mentor).limit(1).get();
                if(!userSnapshot.empty) {
                    const adminId = userSnapshot.docs[0].id;
                    await db.collection('activity_logs').add({
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        userId: adminId, userName: mentor,
                        action: 'Membuat Sertifikat',
                        details: `Sertifikat untuk ${studentName}`
                    });
                }
            } catch (logError) {
                console.warn("Failed to log certificate creation activity:", logError);
            }
            
            // 4. Return success response
            return res.status(200).json({ success: true, url: certificateUrl, id: certificateId });

        } catch (dbError: any) {
            // If Firestore write fails, delete the orphaned Cloudinary file
            console.warn(`Firestore write failed for certificate ${certificateId}. Deleting orphaned file.`);
            await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' })
                .catch(delErr => console.error(`CRITICAL: Failed to delete orphaned certificate file ${publicId}`, delErr));
            throw new Error(`Gagal menyimpan data sertifikat ke database: ${dbError.message}`);
        }

    } catch (error: any) {
        console.error('API Error in generateCertificate handler:', error);
        return res.status(500).json({ message: error.message || 'Terjadi kesalahan pada server.' });
    }
}

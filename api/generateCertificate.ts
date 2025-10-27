import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { v2 as cloudinary } from 'cloudinary';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// Helper function for robust initialization
function initializeFirebaseAdmin(): admin.app.App {
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        throw new Error('Firebase environment variable FIREBASE_SERVICE_ACCOUNT_JSON is not set.');
    }
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } catch (e: any) {
        throw new Error("The FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not a valid JSON string.");
    }
}

declare const Buffer: any;

// Function to convert a stream to a buffer
const streamToBuffer = (stream: any): Promise<any> => {
    return new Promise((resolve, reject) => {
        const chunks: any[] = [];
        stream.on('data', (chunk: any) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
};


export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { studentName, major, period, mentor } = req.body;
        if (!studentName || !major || !period || !mentor) {
            return res.status(400).json({ message: 'Missing required fields: studentName, major, period, mentor.' });
        }

        initializeFirebaseAdmin();
        const db = admin.firestore();
        
        // 1. Generate unique ID
        const certificateId = `CERT-S8-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
        const validationUrl = `https://studio-8-manager-ec159.web.app/#/validate/${certificateId}`;
        
        // 2. Generate QR Code
        const qrCodeImage = await QRCode.toDataURL(validationUrl, { errorCorrectionLevel: 'H' });

        // 3. Generate PDF with the new dark theme design
        const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
        const pdfStream = doc;

        const accentColor = '#00AEEF'; // Cyan accent
        const darkBgColor = '#0F0F0F';
        const textColor = '#FFFFFF';
        const mutedColor = '#E5E5E5';

        // Background
        doc.rect(0, 0, doc.page.width, doc.page.height).fill(darkBgColor);

        // Watermark
        doc.save();
        doc.rotate(-20, { origin: [doc.page.width / 2, doc.page.height / 2] });
        doc.font('Helvetica-Bold').fontSize(120).fillColor(textColor).opacity(0.05).text('Studio 8', {
            align: 'center',
        });
        doc.restore();
        
        // Header Logo
        doc.font('Helvetica-Bold').fontSize(20).fillColor(textColor).text('Studio ', 50, 50, { continued: true });
        doc.fillColor(accentColor).text('8');
        
        // Main Content
        const contentWidth = doc.page.width - 100;
        const contentX = 50;
        
        doc.font('Helvetica-Bold').fontSize(28).fillColor(textColor).text('SERTIFIKAT PKL', contentX, 150, {
            width: contentWidth,
            align: 'center'
        });

        doc.font('Helvetica').fontSize(16).fillColor(mutedColor).text('Dengan ini menyatakan bahwa:', {
            width: contentWidth,
            align: 'center'
        }, 210);

        doc.font('Helvetica-Bold').fontSize(36).fillColor(accentColor).text(studentName, {
            width: contentWidth,
            align: 'center'
        }, 250);

        doc.font('Helvetica').fontSize(16).fillColor(mutedColor).text(
            `Telah berhasil menyelesaikan program Praktik Kerja Lapangan (PKL) di Studio 8 pada bidang keahlian ${major}.`, {
            width: contentWidth,
            align: 'center'
        }, 310);
        
        doc.font('Helvetica-Bold').fontSize(16).fillColor(textColor).text(period, {
            width: contentWidth,
            align: 'center'
        }, 350);
        
        // Footer (Signature and QR)
        const bottomY = doc.page.height - 100;
        
        // Signature
        doc.font('Helvetica-Bold').fontSize(14).fillColor(textColor).text(mentor, 70, bottomY);
        doc.moveTo(70, bottomY + 20).lineTo(320, bottomY + 20).dash(3, { space: 4 }).stroke(mutedColor);
        doc.font('Helvetica').fontSize(12).fillColor(mutedColor).text('Mentor Lapangan', 70, bottomY + 25);
        
        // QR Code
        const qrSize = 80;
        const qrX = doc.page.width - qrSize - 70;
        const qrY = bottomY - 10;
        doc.rect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10).fill('white');
        doc.image(qrCodeImage, qrX, qrY, { width: qrSize });
        
        doc.end();

        // 4. Upload PDF to Cloudinary
        const pdfBuffer = await streamToBuffer(pdfStream);
        const pdfBase64 = pdfBuffer.toString('base64');
        const dataUrl = `data:application/pdf;base64,${pdfBase64}`;

        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        const uploadResult = await cloudinary.uploader.upload(dataUrl, {
            folder: "studio8_certificates",
            public_id: certificateId,
            resource_type: "auto",
        });
        const certificateUrl = uploadResult.secure_url;

        // 5. Save data to Firestore
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
        
        // 6. Return response
        return res.status(200).json({ success: true, url: certificateUrl });

    } catch (error: any) {
        console.error('API Error in generateCertificate:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}
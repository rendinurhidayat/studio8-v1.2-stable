import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { v2 as cloudinary } from 'cloudinary';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';

// Initialize Firebase Admin once
if (!admin.apps.length) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        throw new Error('Server configuration error: FIREBASE_SERVICE_ACCOUNT_JSON is not set.');
    }

    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

// Helper: convert stream to buffer
const streamToBuffer = (stream: any): Promise<Buffer> =>
    new Promise((resolve, reject) => {
        const chunks: any[] = [];
        stream.on('data', (chunk: any) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    try {
        const { studentName, major, period, mentor } = req.body;
        if (!studentName || !major || !period || !mentor) {
            return res.status(400).json({ message: 'Missing required fields: studentName, major, period, mentor.' });
        }

        // Generate certificate ID & validation URL
        const certificateId = `CERT-S8-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
        const validationUrl = `https://studio-8-manager-ec159.web.app/#/validate/${certificateId}`;

        // Generate QR code
        const qrCodeImage = await QRCode.toDataURL(validationUrl, { errorCorrectionLevel: 'H' });

        // Generate PDF
        const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
        const pdfStream = doc;
        doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0F0F0F'); // dark bg

        // Watermark
        doc.save();
        doc.rotate(-20, { origin: [doc.page.width / 2, doc.page.height / 2] });
        doc.font('Helvetica-Bold').fontSize(120).fillColor('#FFFFFF').opacity(0.05).text('Studio 8', { align: 'center' });
        doc.restore();

        // Header
        doc.font('Helvetica-Bold').fontSize(20).fillColor('#FFFFFF').text('Studio ', 50, 50, { continued: true });
        doc.fillColor('#00AEEF').text('8');

        // Main content
        const contentX = 50, contentWidth = doc.page.width - 100;
        doc.font('Helvetica-Bold').fontSize(28).fillColor('#FFFFFF').text('SERTIFIKAT PKL', contentX, 150, { width: contentWidth, align: 'center' });
        doc.font('Helvetica').fontSize(16).fillColor('#E5E5E5').text('Dengan ini menyatakan bahwa:', contentX, 210, { width: contentWidth, align: 'center' });
        doc.font('Helvetica-Bold').fontSize(36).fillColor('#00AEEF').text(studentName, contentX, 250, { width: contentWidth, align: 'center' });
        doc.font('Helvetica').fontSize(16).fillColor('#E5E5E5').text(`Telah berhasil menyelesaikan program PKL di Studio 8 pada bidang keahlian ${major}.`, contentX, 310, { width: contentWidth, align: 'center' });
        doc.font('Helvetica-Bold').fontSize(16).fillColor('#FFFFFF').text(period, contentX, 350, { width: contentWidth, align: 'center' });

        // Footer: signature & QR
        const bottomY = doc.page.height - 100;
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#FFFFFF').text(mentor, 70, bottomY);
        doc.moveTo(70, bottomY + 20).lineTo(320, bottomY + 20).dash(3, { space: 4 }).stroke('#E5E5E5');
        doc.font('Helvetica').fontSize(12).fillColor('#E5E5E5').text('Mentor Lapangan', 70, bottomY + 25);
        const qrSize = 80;
        const qrX = doc.page.width - qrSize - 70, qrY = bottomY - 10;
        doc.rect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10).fill('white');
        doc.image(qrCodeImage, qrX, qrY, { width: qrSize });

        doc.end();

        // Upload PDF ke Cloudinary
        const pdfBuffer = await streamToBuffer(pdfStream);
        const pdfBase64 = pdfBuffer.toString('base64');
        const dataUrl = `data:application/pdf;base64,${pdfBase64}`;

        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            throw new Error("Cloudinary env vars not configured.");
        }

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

        // Save ke Firestore
        await db.collection('certificates').doc(certificateId).set({
            id: certificateId,
            studentName,
            major,
            period,
            mentor,
            issuedDate: admin.firestore.FieldValue.serverTimestamp(),
            certificateUrl,
            qrValidationUrl: validationUrl,
            verified: true,
        });

        // Activity log
        const userSnapshot = await db.collection('users').where('name', '==', mentor).limit(1).get();
        if (!userSnapshot.empty) {
            const adminId = userSnapshot.docs[0].id;
            await db.collection('activity_logs').add({
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                userId: adminId,
                userName: mentor,
                action: 'Membuat Sertifikat',
                details: `Sertifikat untuk ${studentName}`
            });
        }

        return res.status(200).json({ success: true, url: certificateUrl });

    } catch (error: any) {
        console.error('API Error in generateCertificate:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}

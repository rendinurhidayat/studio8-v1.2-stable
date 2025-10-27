import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { v2 as cloudinary } from 'cloudinary';
import * as PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

function initializeFirebaseAdmin() {
    if (admin.apps.length > 0) return admin.apps[0]!;
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) throw new Error('Firebase environment variable not set.');
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

declare const Buffer: any;

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
        const { sponsorshipData, mentorName } = req.body;
        if (!sponsorshipData || !mentorName) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }

        initializeFirebaseAdmin();
        const db = admin.firestore();
        
        const doc = new (PDFDocument as any)({ size: 'A4', margin: 50 });
        const pdfStream = doc;
        
        // --- PDF Content ---
        doc.font('Helvetica-Bold').fontSize(16).text('MEMORANDUM OF UNDERSTANDING (MoU)', { align: 'center' });
        doc.font('Helvetica').fontSize(12).text('Kerjasama Sponsorship', { align: 'center' });
        doc.moveDown(2);

        doc.text(`Pada hari ini, ${format(new Date(), "eeee, d MMMM yyyy", { locale: id })}, telah disepakati perjanjian kerjasama antara:`);
        doc.moveDown();
        doc.font('Helvetica-Bold').text('PIHAK PERTAMA:');
        doc.font('Helvetica').text('Nama: Studio 8');
        doc.text('Jabatan: Manajemen');
        doc.moveDown();

        doc.font('Helvetica-Bold').text('PIHAK KEDUA:');
        doc.font('Helvetica').text(`Nama Instansi: ${sponsorshipData.institutionName}`);
        doc.text(`Perwakilan: ${sponsorshipData.picName}`);
        doc.moveDown(2);

        doc.font('Helvetica-Bold').text('Pasal 1: Lingkup Kerjasama');
        doc.font('Helvetica').text(`Pihak Pertama dan Pihak Kedua setuju untuk menjalin kerjasama dalam bentuk ${sponsorshipData.partnershipType} untuk kegiatan "${sponsorshipData.eventName}".`);
        doc.moveDown();

        doc.font('Helvetica-Bold').text('Pasal 2: Hak dan Kewajiban');
        doc.font('Helvetica').text('1. Pihak Pertama (Studio 8) berkewajiban memberikan benefit sebagai berikut:');
        doc.list([sponsorshipData.benefits], { bulletRadius: 2, indent: 20 });
        doc.moveDown();
        doc.text('2. Pihak Kedua berkewajiban untuk melaksanakan kegiatan sesuai dengan proposal yang diajukan dan menyertakan branding Studio 8 dalam materi promosi acara.');
        doc.moveDown(3);

        const signatureY = doc.y > 650 ? 650 : doc.y; // Ensure there's space for signatures
        doc.text('PIHAK PERTAMA', 50, signatureY, { width: 200, align: 'center' });
        doc.text('PIHAK KEDUA', 350, signatureY, { width: 200, align: 'center' });
        doc.text(mentorName, 50, signatureY + 80, { width: 200, align: 'center' });
        doc.text(sponsorshipData.picName, 350, signatureY + 80, { width: 200, align: 'center' });

        doc.end();

        // --- Upload to Cloudinary ---
        const pdfBuffer = await streamToBuffer(pdfStream);
        const pdfBase64 = pdfBuffer.toString('base64');
        const dataUrl = `data:application/pdf;base64,${pdfBase64}`;

        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        const uploadResult = await cloudinary.uploader.upload(dataUrl, {
            folder: "studio8_mou",
            public_id: `MoU_${sponsorshipData.id}`,
            resource_type: "auto",
        });

        // --- Update Firestore ---
        const agreementUrl = uploadResult.secure_url;
        await db.collection('sponsorships').doc(sponsorshipData.id).update({ 
            agreementUrl,
            status: 'MoU Drafted'
        });

        return res.status(200).json({ success: true, url: agreementUrl });

    } catch (error: any) {
        console.error('API Error in generateMou:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}
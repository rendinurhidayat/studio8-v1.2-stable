import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { v2 as cloudinary } from 'cloudinary';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { format } from 'date-fns';
import id from 'date-fns/locale/id';

// ============================
// Firebase Admin Initialization
// ============================
function initializeFirebaseAdmin(): admin.app.App {
  if (admin.apps.length > 0) return admin.apps[0]!;

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not set.');

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

  // Fix newline escape
  if (serviceAccount.private_key.includes('\\n')) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

// ============================
// Cloudinary Config
// ============================
function initializeCloudinary() {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  )
    throw new Error('Cloudinary credentials not set.');

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// ============================
// Main Handler
// ============================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST')
    return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    const { studentName, major, period, mentor } = req.body;
    if (!studentName || !major || !period || !mentor)
      return res
        .status(400)
        .json({ message: 'Missing required fields: studentName, major, period, mentor' });

    const app = initializeFirebaseAdmin();
    const db = admin.firestore(app);
    initializeCloudinary();

    const certificateId = `CERT-S8-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const validationUrl = `https://studio-8-manager-ec159.web.app/#/validate/${certificateId}`;
    const qrCodeImage = await QRCode.toDataURL(validationUrl, { errorCorrectionLevel: 'H' });

    // ====================
    // Generate PDF
    // ====================
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });

    // Colors
    const accentColor = '#00AEEF';
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

    const contentWidth = doc.page.width - 100;
    const contentX = 50;

    doc.font('Helvetica-Bold').fontSize(28).fillColor(textColor).text('SERTIFIKAT PKL', contentX, 150, {
      width: contentWidth,
      align: 'center',
    });

    doc.font('Helvetica').fontSize(16).fillColor(mutedColor).text('Dengan ini menyatakan bahwa:', contentX, 210, {
      width: contentWidth,
      align: 'center',
    });

    doc.font('Helvetica-Bold').fontSize(36).fillColor(accentColor).text(studentName, contentX, 250, {
      width: contentWidth,
      align: 'center',
    });

    doc.font('Helvetica').fontSize(16).fillColor(mutedColor).text(
      `Telah berhasil menyelesaikan program Praktik Kerja Lapangan (PKL) di Studio 8 pada bidang keahlian ${major}.`,
      contentX,
      310,
      { width: contentWidth, align: 'center' }
    );

    doc.font('Helvetica-Bold').fontSize(16).fillColor(textColor).text(period, contentX, 350, {
      width: contentWidth,
      align: 'center',
    });

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

    // ====================
    // Upload PDF to Cloudinary via stream
    // ====================
    const uploadPromise = new Promise<string>((resolve, reject) => {
      const buffers: Uint8Array[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', async () => {
        try {
          const dataUrl = `data:application/pdf;base64,${Buffer.concat(buffers).toString('base64')}`;
          const uploadResult = await cloudinary.uploader.upload(dataUrl, {
            folder: 'studio8_certificates',
            public_id: certificateId,
            resource_type: 'auto',
          });
          resolve(uploadResult.secure_url);
        } catch (err) {
          reject(err);
        }
      });
      doc.on('error', reject);
      doc.end();
    });

    const certificateUrl = await uploadPromise;

    // ====================
    // Save to Firestore
    // ====================
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

    return res.status(200).json({ success: true, url: certificateUrl });
  } catch (error: any) {
    console.error('API Error in generateCertificate:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}

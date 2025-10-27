import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import admin from 'firebase-admin';

// Firebase Admin Init
function initializeFirebaseAdmin(): admin.app.App {
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON as string);
    return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { reportId, reportContent } = req.body;
        if (!reportId || !reportContent) {
            return res.status(400).json({ message: 'reportId and reportContent are required.' });
        }

        // Init AI
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            return res.status(500).json({ message: 'API key is not configured on the server.' });
        }
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `Anda adalah seorang mentor ahli di sebuah studio kreatif bernama Studio 8. Berdasarkan laporan harian dari seorang anak magang ini, berikan masukan yang singkat, membangun, dan memberi semangat dalam Bahasa Indonesia (maksimal 2 kalimat).

Laporan Magang: "${reportContent}"

Contoh feedback yang baik:
- "Kerja bagus hari ini! Terus eksplorasi teknik editing video, ya. Semangat!"
- "Progres yang solid! Jangan ragu bertanya jika menemukan kesulitan saat setup lighting."

Feedback Anda:`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });

        const feedbackText = response.text;

        // Init Firebase & save
        initializeFirebaseAdmin();
        const db = admin.firestore();
        const reportRef = db.collection('daily_reports').doc(reportId);
        
        await reportRef.update({
            mentorFeedback: feedbackText
        });

        const updatedDoc = await reportRef.get();
        const updatedData = { id: updatedDoc.id, ...(updatedDoc.data() as any) };
        
        // Convert Firestore Timestamps to strings to be JSON serializable for the response
        if (updatedData.submittedAt && (updatedData.submittedAt as any).toDate) {
            updatedData.submittedAt = (updatedData.submittedAt as admin.firestore.Timestamp).toDate().toISOString();
        }

        return res.status(200).json(updatedData);

    } catch (error: any) {
        console.error('API Error in generateAiFeedback:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}
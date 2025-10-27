import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';
import admin from 'firebase-admin';

// Helper function for robust initialization of Firebase Admin
function initializeFirebaseAdmin(): admin.app.App {
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        throw new Error('Firebase environment variable FIREBASE_SERVICE_ACCOUNT_JSON is not set.');
    }
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } catch (e: any) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", e);
        throw new Error("The FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not a valid JSON string.");
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { userId, reportContent } = req.body;
        if (!userId || !reportContent) {
            return res.status(400).json({ message: 'userId and reportContent are required.' });
        }
        
        initializeFirebaseAdmin();
        const db = admin.firestore();

        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            return res.status(500).json({ message: 'API key is not configured on the server.' });
        }
        
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `Analisis laporan harian ini: "${reportContent}". Kategorikan sebagai: produktif / santai / tidak fokus. Berikan satu kalimat motivasi singkat dalam Bahasa Indonesia yang relevan dan positif.`;

        const schema = {
            type: Type.OBJECT,
            properties: {
                type: { 
                    type: Type.STRING, 
                    description: "Kategori laporan: produktif, santai, atau tidak fokus.",
                    enum: ['produktif', 'santai', 'tidak fokus'],
                },
                insight: { 
                    type: Type.STRING,
                    description: "Satu kalimat motivasi singkat yang relevan."
                }
            },
            required: ['type', 'insight']
        };

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: schema,
                }
            });

            const result = JSON.parse(response.text);
            const insightData = {
                ...result,
                date: admin.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('users').doc(userId).collection('aiInsights').add(insightData);
            return res.status(200).json({ success: true, insight: insightData });

        } catch (aiError) {
            console.error('Gemini API Error:', aiError);
            // Fallback to default insight if AI fails
            const defaultInsight = {
                type: 'default',
                insight: 'Tetap semangat hari ini 💪',
                date: admin.firestore.FieldValue.serverTimestamp()
            };
            await db.collection('users').doc(userId).collection('aiInsights').add(defaultInsight);
            // Still return a success to the client, but log the error server-side.
            // The client doesn't need to know about the backend failure.
            return res.status(200).json({ success: true, insight: defaultInsight, note: 'AI analysis failed, used default.' });
        }

    } catch (error: any) {
        console.error('API Error in analyzeInternReport:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}

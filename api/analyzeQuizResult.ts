import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import admin from 'firebase-admin';

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
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", e);
        throw new Error("The FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not a valid JSON string.");
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
    try {
        const { resultId } = req.body;
        if (!resultId) {
            return res.status(400).json({ message: 'resultId is required.' });
        }

        initializeFirebaseAdmin();
        const db = admin.firestore();
        const resultDoc = await db.collection('quiz_results').doc(resultId).get();
        if (!resultDoc.exists) {
            return res.status(404).json({ message: 'Quiz result not found.' });
        }
        const resultData = resultDoc.data() as any; // Cast as any to handle Firestore Timestamps

        const incorrectAnswers = resultData.answers.filter((a: any) => !a.isCorrect);
        if (incorrectAnswers.length === 0) {
            const feedback = "Kerja bagus! Semua jawabanmu benar. Pertahankan!";
            await db.collection('quiz_results').doc(resultId).update({ aiFeedback: feedback });
            return res.status(200).json({ feedback });
        }
        
        const getOptionText = (questionId: string, optionIndex: number) => {
             const question = resultData.quiz?.questions.find((q: any) => q.id === questionId);
             return question?.options[optionIndex] || 'N/A';
        }

        const promptContext = incorrectAnswers.map((ans: any) => 
            `- Pertanyaan: "${ans.questionText}", Jawaban Salah: "${getOptionText(ans.questionId, ans.selectedAnswerIndex)}", Jawaban Benar: "${getOptionText(ans.questionId, ans.correctAnswerIndex)}"`
        ).join('\n');

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `
            Anda adalah mentor yang suportif. Seorang siswa baru saja menyelesaikan kuis dan membuat beberapa kesalahan.
            Berikut adalah daftar kesalahan mereka:
            ${promptContext}

            Berdasarkan kesalahan-kesalahan ini, berikan analisis singkat dan 2-3 saran konkret untuk perbaikan. Buatlah dalam format paragraf yang bersahabat dan memotivasi, dalam Bahasa Indonesia.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const feedbackText = response.text;

        await db.collection('quiz_results').doc(resultId).update({
            aiFeedback: feedbackText
        });
        
        return res.status(200).json({ feedback: feedbackText });
    } catch (error: any) {
        console.error('API Error in analyzeQuizResult:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { questionText, options, correctAnswerIndex, userAnswerIndex } = req.body;

        if (!questionText || !options || correctAnswerIndex == null || userAnswerIndex == null) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }

        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            return res.status(500).json({ message: 'API key is not configured on the server.' });
        }
        
        const ai = new GoogleGenAI({ apiKey });

        const userAnswerText = options[userAnswerIndex];
        const correctAnswerText = options[correctAnswerIndex];

        const prompt = `
            Anda adalah seorang mentor ahli di bidang fotografi, videografi, dan marketing.
            Seorang siswa baru saja menjawab kuis dan salah memilih jawaban.
            Tugas Anda adalah memberikan penjelasan yang singkat, jelas, dan mudah dipahami dalam Bahasa Indonesia.

            Pertanyaan: "${questionText}"
            Jawaban siswa (Salah): "${userAnswerText}"
            Jawaban yang benar: "${correctAnswerText}"

            Jelaskan mengapa jawaban siswa salah dan mengapa jawaban yang benar itu tepat.
            Buat penjelasan ringkas, sekitar 2-3 kalimat. Langsung ke pokok permasalahan.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const explanation = response.text;
        
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(200).send(explanation);

    } catch (error: any) {
        console.error('API Error in generateQuizExplanation:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}
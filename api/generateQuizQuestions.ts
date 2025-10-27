import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { topic, numQuestions, category } = req.body;
        if (!topic || !numQuestions || !category) {
            return res.status(400).json({ message: 'Topic, numQuestions, and category are required.' });
        }

        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            return res.status(500).json({ message: 'API key is not configured.' });
        }
        
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `Buat ${numQuestions} soal kuis pilihan ganda (4 pilihan) tentang "${topic}" dengan kategori "${category}". Pastikan ada satu jawaban yang benar. Berikan penjelasan singkat untuk setiap jawaban yang benar.

Format output harus berupa array JSON dari objek, sesuai dengan skema berikut.`;

        const questionSchema = {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING, description: "ID unik untuk pertanyaan, format: q-timestamp" },
                questionText: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswerIndex: { type: Type.NUMBER },
                explanation: { type: Type.STRING, description: "Penjelasan singkat untuk jawaban yang benar." },
            },
            required: ["id", "questionText", "options", "correctAnswerIndex", "explanation"]
        };

        const schema = {
            type: Type.ARRAY,
            items: questionSchema
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema,
            }
        });

        const questions = JSON.parse(response.text);
        
        // Gemini might not generate the ID correctly, so let's enforce it.
        const formattedQuestions = questions.map((q: any, index: number) => ({
            ...q,
            id: `q-${Date.now()}-${index}`
        }));

        return res.status(200).json(formattedQuestions);
    } catch (error: any) {
        console.error('API Error in generateQuizQuestions:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { feedbackText } = req.body;
        if (!feedbackText) {
            return res.status(400).json({ message: 'feedbackText is required in the request body.' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ message: 'API key is not configured on the server.' });
        }
        
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `
            Analisis kumpulan feedback pelanggan untuk studio foto bernama "Studio 8" berikut ini.
            Feedback:
            ${feedbackText}

            Berikan analisis terstruktur dalam format JSON. Analisis harus mencakup:
            1. 'overallSentiment': Satu kalimat ringkas tentang sentimen umum dalam Bahasa Indonesia (misal: "Sangat Positif", "Cukup Baik dengan beberapa masukan", "Negatif").
            2. 'positivePoints': Array string berisi poin-poin positif utama yang sering disebut pelanggan.
            3. 'areasForImprovement': Array string berisi kritik atau area utama untuk perbaikan.
            4. 'actionableSuggestions': Array string berisi 2-3 saran konkret yang bisa ditindaklanjuti oleh pemilik studio.

            Seluruh respons harus dalam Bahasa Indonesia.
        `;
        
        const schema = {
            type: Type.OBJECT,
            properties: {
                overallSentiment: { type: Type.STRING, description: "Sentimen umum dalam satu kalimat." },
                positivePoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Poin positif utama." },
                areasForImprovement: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Area untuk perbaikan." },
                actionableSuggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Saran yang bisa ditindaklanjuti." },
            },
            required: ["overallSentiment", "positivePoints", "areasForImprovement", "actionableSuggestions"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema,
            }
        });

        const result = JSON.parse(response.text);
        return res.status(200).json(result);

    } catch (error: any) {
        console.error('API Error in analyzeFeedback:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { historicalDataString } = req.body;
        if (!historicalDataString) {
            return res.status(400).json({ message: 'historicalDataString is required.' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ message: 'API key is not configured.' });
        }
        
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `
            Anda adalah seorang analis keuangan ahli untuk sebuah studio foto bernama Studio 8.
            Berdasarkan data pendapatan historis berikut, berikan analisis dan peramalan keuangan.
            Data historis (hingga 6 bulan terakhir):
            ${historicalDataString}

            Tugas Anda:
            1.  predictedRevenue: Prediksi pendapatan untuk bulan berikutnya dalam bentuk angka (integer, tanpa format Rupiah atau desimal).
            2.  budgetRecommendation: Berikan rekomendasi alokasi anggaran berdasarkan pendapatan yang diprediksi. Alokasikan ke dalam kategori berikut: 'marketing', 'equipment', 'maintenance', 'savings', 'operation'. Total alokasi harus sama dengan predictedRevenue. Kembalikan dalam bentuk objek dengan nilai numerik (integer).
            3.  aiAlert: Berikan satu insight atau peringatan singkat (maksimal 2 kalimat, dalam Bahasa Indonesia) berdasarkan tren data historis. Misalnya, jika ada penurunan, sarankan sesuatu. Jika ada kenaikan, berikan dorongan.

            Berikan output HANYA dalam format JSON yang valid dan terstruktur sesuai skema.
        `;

        const schema = {
            type: Type.OBJECT,
            properties: {
                predictedRevenue: { type: Type.NUMBER, description: "Prediksi pendapatan bulan depan dalam angka." },
                budgetRecommendation: {
                    type: Type.OBJECT,
                    properties: {
                        marketing: { type: Type.NUMBER },
                        equipment: { type: Type.NUMBER },
                        maintenance: { type: Type.NUMBER },
                        savings: { type: Type.NUMBER },
                        operation: { type: Type.NUMBER },
                    },
                    required: ["marketing", "equipment", "maintenance", "savings", "operation"]
                },
                aiAlert: { type: Type.STRING, description: "Insight atau peringatan singkat dari AI." },
            },
            required: ["predictedRevenue", "budgetRecommendation", "aiAlert"]
        };
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema,
            }
        });

        const result = JSON.parse(response.text);
        return res.status(200).json(result);

    } catch (error: any) {
        console.error('API Error in generateForecast:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}

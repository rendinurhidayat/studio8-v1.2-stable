import { GoogleGenAI, Type } from '@google/genai';

export const runtime = 'edge';

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ message: 'Method Not Allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { historicalDataString } = await req.json();
        if (!historicalDataString) {
            return new Response(JSON.stringify({ message: 'historicalDataString is required.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ message: 'API key is not configured.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
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
                temperature: 0.2 // Lower temperature for more deterministic financial predictions
            }
        });

        // The response text is already a JSON string
        return new Response(response.text, {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('API Error in generateForecast:', error);
        return new Response(JSON.stringify({ message: 'Internal Server Error', error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
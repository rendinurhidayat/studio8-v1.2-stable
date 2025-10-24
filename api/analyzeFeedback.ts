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
        const { feedbackText } = await req.json();
        if (!feedbackText) {
             return new Response(JSON.stringify({ message: 'feedbackText is required in the request body.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const apiKey = process.env.API_KEY;
        if (!apiKey) {
             return new Response(JSON.stringify({ message: 'API key is not configured on the server.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `
            Anda adalah seorang analis data ahli untuk studio foto bernama "Studio 8".
            Tugas Anda adalah menganalisis kumpulan ulasan pelanggan berikut ini secara objektif.
            
            Kumpulan Ulasan Pelanggan:
            ---
            ${feedbackText}
            ---

            Sediakan analisis terstruktur dalam format JSON. Analisis harus mencakup:
            1. 'overallSentiment': Satu kalimat ringkas yang merangkum sentimen umum dari semua ulasan (misalnya: "Sangat Positif dengan fokus pada keramahan staf", "Cukup Baik namun ada keluhan minor tentang properti foto", "Campuran, dengan beberapa pelanggan sangat puas dan beberapa lainnya kecewa").
            2. 'positivePoints': Sebuah array berisi 3-5 poin positif utama yang paling sering disebutkan pelanggan (misal: "Staf yang ramah dan membantu", "Kualitas hasil foto yang tajam dan bagus", "Proses booking yang mudah").
            3. 'areasForImprovement': Sebuah array berisi 3-5 kritik konstruktif atau area utama untuk perbaikan yang paling sering muncul. Jika tidak ada, kembalikan array kosong.
            4. 'actionableSuggestions': Sebuah array berisi 2-3 saran konkret dan dapat ditindaklanjuti yang bisa diterapkan oleh pemilik studio berdasarkan ulasan tersebut (misal: "Tambah variasi properti foto bertema vintage", "Sediakan panduan pose sederhana untuk pelanggan yang kaku").

            Pastikan seluruh respons Anda dalam Bahasa Indonesia dan sesuai dengan skema JSON yang diminta.
        `;
        
        const schema = {
            type: Type.OBJECT,
            properties: {
                overallSentiment: { type: Type.STRING, description: "Sentimen umum dalam satu kalimat ringkas." },
                positivePoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array poin-poin positif utama." },
                areasForImprovement: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array area utama untuk perbaikan." },
                actionableSuggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array saran konkret yang bisa ditindaklanjuti." },
            },
            required: ["overallSentiment", "positivePoints", "areasForImprovement", "actionableSuggestions"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Upgraded model for better analysis
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema,
                temperature: 0.2 // Lower temperature for more consistent, factual analysis
            }
        });

        // The response text is already a JSON string because of responseMimeType
        return new Response(response.text, {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('API Error in analyzeFeedback:', error);
        return new Response(JSON.stringify({ message: 'Internal Server Error', error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
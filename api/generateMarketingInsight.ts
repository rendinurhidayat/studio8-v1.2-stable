import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { packagePopularity, dailyRevenue } = req.body;
        if (!packagePopularity || !dailyRevenue) {
            return res.status(400).json({ message: 'packagePopularity and dailyRevenue are required.' });
        }

        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            return res.status(500).json({ message: 'API key is not configured on the server.' });
        }
        
        const ai = new GoogleGenAI({ apiKey });

        const dataSummary = `
- Popularitas Paket: ${packagePopularity.map((p: any) => `${p.name} (${p.value} booking)`).join(', ')}.
- Tren Pemasukan Harian (7 hari terakhir): ${dailyRevenue.map((d: any) => `${d.name}: Rp ${d.Pemasukan.toLocaleString('id-ID')}`).join(', ')}.
        `;

        const prompt = `
            Anda adalah seorang konsultan marketing ahli untuk "Studio 8", sebuah studio foto modern.
            Berdasarkan ringkasan data performa berikut, berikan 2-3 insight atau saran marketing yang singkat, konkret, dan actionable dalam Bahasa Indonesia.
            Fokus pada cara meningkatkan booking atau mempromosikan paket yang populer. Gunakan format poin (bullet points).

            Data Performa:
            ${dataSummary}

            Contoh output:
            - Paket "Wisuda Berdua" sedang sangat diminati! Buat konten khusus di Instagram Stories untuk menyorot paket ini.
            - Pendapatan cenderung menurun di akhir pekan. Pertimbangkan untuk membuat promo khusus "Weekend Ceria" dengan diskon kecil untuk menarik lebih banyak klien.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        const insightText = response.text;

        return res.status(200).json({ insight: insightText });

    } catch (error: any) {
        console.error('API Error in generateMarketingInsight:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}

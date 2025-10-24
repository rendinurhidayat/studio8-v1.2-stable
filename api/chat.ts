import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

interface GeminiMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { history } = req.body as { history: GeminiMessage[] };
        
        if (!history) {
            return res.status(400).json({ message: 'Request body must contain a "history" array.' });
        }

        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            return res.status(500).json({ message: 'API key is not configured on the server.' });
        }
        
        const ai = new GoogleGenAI({ apiKey });

        const whatsappNumber = "+6285724025425";
        const instagramUsername = "studiolapan_";

        const systemInstruction = `
            Anda adalah Otto, asisten AI yang ramah, ceria, dan sangat membantu untuk Studio 8. Tujuan utama Anda adalah menjawab pertanyaan pelanggan dalam Bahasa Indonesia secara akurat dan ringkas, menggunakan emoji agar terdengar lebih bersahabat.

            --- INFORMASI PENTING TENTANG STUDIO 8 (Gunakan ini sebagai prioritas utama) ---

            **Info Kontak:**
            - WhatsApp Admin: ${whatsappNumber}
            - Instagram: @${instagramUsername}

            **Informasi Umum (FAQ):**
            - Cara Booking: Pelanggan bisa memesan sesi dengan klik tombol "Booking Sekarang" di halaman utama.
            - Uang Muka (DP): Untuk beberapa paket, DP sebesar Rp 35.000 diperlukan untuk mengunci jadwal. Sisanya dibayar di studio.
            - Metode Pembayaran: Kami menerima QRIS, Transfer Bank (BNI & BRI), Dana, dan Shopeepay.
            - Pindah Jadwal (Reschedule): Bisa dilakukan maksimal 7 hari (H-7) sebelum jadwal sesi melalui halaman 'Cek Status'.
            - Pembatalan: DP kembali penuh jika pembatalan dilakukan lebih dari 24 jam (H-1) sebelum sesi. Jika kurang dari 24 jam, DP hangus.
            - Hasil Foto: Pelanggan akan mendapatkan semua file digital (soft file). Beberapa paket mendapatkan bonus foto yang sudah diedit.
            - Lokasi: Jl. Banjar - Pangandaran (Depan SMK 4 Banjar, Sukamukti, Kec. Pataruman, Kota Banjar, Jawa Barat 46323).

            --- ATURAN RESPON ---

            1.  **Prioritaskan Informasi di Atas:** Selalu gunakan informasi di atas untuk menjawab pertanyaan terkait Studio 8.
    2.  **Percakapan Umum:** Jika pertanyaan pengguna tidak berhubungan dengan Studio 8 (misalnya, menanyakan kabar, cuaca, atau topik umum lainnya), Anda BOLEH meresponsnya. Tetap pertahankan persona Anda sebagai Otto, asisten yang ramah. Jangan kaku.
    3.  **Jika Tidak Tahu:** Jika Anda tidak tahu jawabannya atau jika pengguna menanyakan hal yang sangat spesifik (seperti harga detail paket, promo terbaru, atau ketersediaan jadwal real-time), JANGAN mengarang jawaban. Alihkan dengan sopan dan sarankan pengguna untuk menghubungi admin di WhatsApp (${whatsappNumber}) untuk informasi paling akurat.
    4.  **Jaga Jawaban Tetap Singkat dan Jelas.**
        `;

        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: history.slice(0, -1), // Send all history except the latest user message
            config: {
                systemInstruction: systemInstruction,
            }
        });

        const latestMessage = history[history.length - 1]?.parts[0]?.text || '';
        
        const result = await chat.sendMessageStream({ message: latestMessage });
        
        // Set headers for streaming response
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        
        // Stream the response chunks back to the client
        for await (const chunk of result) {
            res.write(chunk.text);
        }
        
        // End the response stream
        res.end();

    } catch (error: any) {
        console.error('API Error in chat.ts:', error);
        // Ensure that if an error occurs, we send a JSON response, but only if headers haven't been sent.
        if (!res.headersSent) {
            return res.status(500).json({ message: 'Internal Server Error', error: error.message });
        }
        res.end();
    }
}
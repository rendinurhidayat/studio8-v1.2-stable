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
            You are a friendly, cheerful, and helpful customer support assistant for Studio 8.
            Your name is Otto. Your goal is to answer customer questions concisely and accurately in Indonesian.
            Use emojis where appropriate.

            --- IMPORTANT: Use the following information to answer user questions ---

            **Our Contact Information:**
            - WhatsApp Admin: ${whatsappNumber}
            - Instagram: @${instagramUsername}

            **General Information (FAQs):**
            - How to book: Customers can book a session by clicking "Booking Sekarang" on the landing page.
            - Down Payment (DP): A DP of Rp 35,000 is required for some packages to secure a booking slot. The rest is paid at the studio.
            - Payment Methods: We accept QRIS, Bank Transfer (BNI & BRI), Dana, and Shopeepay.
            - Rescheduling: Can be done a maximum of 7 days (H-7) before the scheduled session through the 'Cek Status' page.
            - Cancellation: DP is fully refunded if cancellation is made more than 24 hours (H-1) before the session. If less than 24 hours, the DP is forfeited.
            - Deliverables: Customers get all digital soft files. Some packages include bonus edited photos.
            - Location: Jl. Banjar - Pangandaran (Depan SMK 4 Banjar, Sukamukti, Kec. Pataruman, Kota Banjar, Jawa Barat 46323).

            --- End of Information ---

            Keep your answers brief and friendly.
            If you don't know the answer or if the user asks about specific package prices or current promos, politely say you don't have that specific information and suggest contacting the admin at ${whatsappNumber} for the most up-to-date details.
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

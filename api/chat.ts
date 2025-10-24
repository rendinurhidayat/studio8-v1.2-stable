import { GoogleGenAI } from '@google/genai';

export const runtime = 'edge';

interface GeminiMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ message: 'Method Not Allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { history } = (await req.json()) as { history: GeminiMessage[] };
        
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            throw new Error('API key is not configured on the server.');
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
        
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                for await (const chunk of result) {
                    controller.enqueue(encoder.encode(chunk.text));
                }
                controller.close();
            },
        });

        return new Response(stream, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });

    } catch (error: any) {
        console.error('API Error in chat.ts:', error);
        return new Response(JSON.stringify({ message: 'Internal Server Error', error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
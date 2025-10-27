import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';
import admin from 'firebase-admin';

// --- Firebase Admin Initialization (only for actions that need it) ---
function initializeFirebaseAdmin(): admin.app.App {
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        throw new Error('Firebase environment variable FIREBASE_SERVICE_ACCOUNT_JSON is not set.');
    }
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } catch (e: any) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", e);
        throw new Error("The FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not a valid JSON string.");
    }
}

// --- Main Handler ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { action, ...payload } = req.body;
    
    if (!action) {
        return res.status(400).json({ message: 'Action is required in the request body.' });
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        return res.status(500).json({ message: 'API key is not configured on the server.' });
    }
    const ai = new GoogleGenAI({ apiKey });

    try {
        switch (action) {
            case 'analyzeFeedback':
                return await handleAnalyzeFeedback(ai, payload, res);
            case 'generateForecast':
                return await handleGenerateForecast(ai, payload, res);
            case 'chat':
                return await handleChat(ai, payload, res); // This is a streaming function
            case 'analyzeInternReport':
                return await handleAnalyzeInternReport(ai, payload, res);
            case 'generateAiFeedback':
                return await handleGenerateAiFeedback(ai, payload, res);
            case 'generateQuizExplanation':
                return await handleGenerateQuizExplanation(ai, payload, res);
            case 'generateQuizQuestions':
                return await handleGenerateQuizQuestions(ai, payload, res);
            case 'analyzeQuizResult':
                return await handleAnalyzeQuizResult(ai, payload, res);
            case 'generateMarketingInsight':
                return await handleGenerateMarketingInsight(ai, payload, res);
            case 'generateClassDescription':
                return await handleGenerateClassDescription(ai, payload, res);
            default:
                return res.status(400).json({ message: `Unknown action: ${action}` });
        }
    } catch (error: any) {
        console.error(`API Error in action '${action}':`, error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}

// --- Individual Action Handlers ---

async function handleGenerateClassDescription(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { topic } = payload;
    if (!topic) {
        return res.status(400).json({ message: 'Topic is required.' });
    }

    const prompt = `Anda adalah seorang instruktur ahli di Studio 8. Buat deskripsi singkat (2-3 kalimat) yang menarik dan informatif untuk kelas praktek mingguan dengan topik "${topic}". Jelaskan secara singkat apa yang akan dipelajari peserta dan manfaatnya. Gunakan bahasa yang santai dan memotivasi.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(response.text);
}


async function handleAnalyzeFeedback(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { feedbackText } = payload;
    if (!feedbackText) {
        return res.status(400).json({ message: 'feedbackText is required.' });
    }
    const prompt = `Analisis kumpulan feedback...${feedbackText}...Seluruh respons harus dalam Bahasa Indonesia.`; // Truncated for brevity
    const schema = {
        type: Type.OBJECT,
        properties: {
            overallSentiment: { type: Type.STRING },
            positivePoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            areasForImprovement: { type: Type.ARRAY, items: { type: Type.STRING } },
            actionableSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["overallSentiment", "positivePoints", "areasForImprovement", "actionableSuggestions"]
    };
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analisis kumpulan feedback pelanggan untuk studio foto bernama "Studio 8" berikut ini.\nFeedback:\n${feedbackText}\n\nBerikan analisis terstruktur dalam format JSON. Analisis harus mencakup:\n1. 'overallSentiment': Satu kalimat ringkas tentang sentimen umum dalam Bahasa Indonesia (misal: "Sangat Positif", "Cukup Baik dengan beberapa masukan", "Negatif").\n2. 'positivePoints': Array string berisi poin-poin positif utama yang sering disebut pelanggan.\n3. 'areasForImprovement': Array string berisi kritik atau area utama untuk perbaikan.\n4. 'actionableSuggestions': Array string berisi 2-3 saran konkret yang bisa ditindaklanjuti oleh pemilik studio.\n\nSeluruh respons harus dalam Bahasa Indonesia.`,
        config: { responseMimeType: 'application/json', responseSchema: schema }
    });
    const result = JSON.parse(response.text);
    return res.status(200).json(result);
}

async function handleGenerateForecast(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { historicalDataString } = payload;
    if (!historicalDataString) {
        return res.status(400).json({ message: 'historicalDataString is required.' });
    }
    const schema = {
        type: Type.OBJECT,
        properties: {
            predictedRevenue: { type: Type.NUMBER },
            budgetRecommendation: {
                type: Type.OBJECT,
                properties: { marketing: { type: Type.NUMBER }, equipment: { type: Type.NUMBER }, maintenance: { type: Type.NUMBER }, savings: { type: Type.NUMBER }, operation: { type: Type.NUMBER } },
                required: ["marketing", "equipment", "maintenance", "savings", "operation"]
            },
            aiAlert: { type: Type.STRING },
        },
        required: ["predictedRevenue", "budgetRecommendation", "aiAlert"]
    };
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Anda adalah seorang analis keuangan ahli untuk sebuah studio foto bernama Studio 8.\nBerdasarkan data pendapatan historis berikut, berikan analisis dan peramalan keuangan.\nData historis (hingga 6 bulan terakhir):\n${historicalDataString}\n\nTugas Anda:\n1.  predictedRevenue: Prediksi pendapatan untuk bulan berikutnya dalam bentuk angka (integer, tanpa format Rupiah atau desimal).\n2.  budgetRecommendation: Berikan rekomendasi alokasi anggaran berdasarkan pendapatan yang diprediksi. Alokasikan ke dalam kategori berikut: 'marketing', 'equipment', 'maintenance', 'savings', 'operation'. Total alokasi harus sama dengan predictedRevenue. Kembalikan dalam bentuk objek dengan nilai numerik (integer).\n3.  aiAlert: Berikan satu insight atau peringatan singkat (maksimal 2 kalimat, dalam Bahasa Indonesia) berdasarkan tren data historis. Misalnya, jika ada penurunan, sarankan sesuatu. Jika ada kenaikan, berikan dorongan.\n\nBerikan output HANYA dalam format JSON yang valid dan terstruktur sesuai skema.`,
        config: { responseMimeType: 'application/json', responseSchema: schema }
    });
    const result = JSON.parse(response.text);
    return res.status(200).json(result);
}

async function handleChat(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { history } = payload;
    if (!history) {
        return res.status(400).json({ message: 'History array is required.' });
    }
    
    const whatsappNumber = "+6285724025425";
    const instagramUsername = "studiolapan_";

    const systemInstruction = `
            Anda adalah Otto, asisten AI dari Studio 8. Persona Anda ramah, ceria, dan sangat efisien.

            --- INFORMASI PENTING TENTANG STUDIO 8 (Gunakan ini sebagai prioritas utama) ---

            **Info Kontak:**
            - WhatsApp Admin: ${whatsappNumber}
            - Instagram: @${instagramUsername}

            **Informasi Umum (FAQ):**
            - Cara Booking: Pelanggan bisa klik tombol "Booking Sekarang" di halaman utama.
            - Uang Muka (DP): Untuk beberapa paket, DP-nya Rp 35.000 untuk kunci jadwal. Sisanya dibayar di studio.
            - Metode Pembayaran: QRIS, Transfer Bank (BNI & BRI), Dana, dan Shopeepay.
            - Pindah Jadwal (Reschedule): Bisa, maksimal H-7 sebelum jadwal sesi melalui halaman 'Cek Status'.
            - Pembatalan: DP kembali 100% jika dibatalkan H-1 (lebih dari 24 jam). Kurang dari 24 jam, DP hangus.
            - Hasil Foto: Pelanggan dapat semua file digital (soft file). Beberapa paket dapat bonus editan.
            - Lokasi: Depan SMK 4 Banjar, Sukamukti, Pataruman, Kota Banjar.

            --- ATURAN WAJIB ---

            1.  **JAWABAN SUPER SINGKAT:** Ini aturan paling penting. Jawaban Anda HARUS singkat, padat, dan jelas. **MAKSIMAL 3 kalimat.** Gunakan poin jika perlu untuk menjaga keringkasan. Jangan pernah bertele-tele.
            2.  **GUNAKAN INFO DI ATAS:** Selalu gunakan informasi dari bagian "INFORMASI PENTING" untuk menjawab.
            3.  **JIKA TIDAK TAHU:** Jika info tidak ada atau pertanyaan sangat spesifik (detail harga, promo, jadwal real-time), JANGAN mengarang. Langsung alihkan ke admin via WhatsApp (${whatsappNumber}). Contoh: "Untuk info harga detail, langsung chat admin kami di WhatsApp ya! 😊"
            4.  **GUNAKAN EMOJI:** Selalu pakai emoji agar terdengar ramah dan modern. ✨📸
            5.  **SAPALAH DENGAN SANTAI:** Buka percakapan dengan santai.
        `;
        
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        history: history.slice(0, -1),
        config: { systemInstruction }
    });
    const latestMessage = history[history.length - 1]?.parts[0]?.text || '';
    const result = await chat.sendMessageStream({ message: latestMessage });
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    for await (const chunk of result) {
        res.write(chunk.text);
    }
    res.end();
}

async function handleAnalyzeInternReport(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { userId, reportContent } = payload;
    if (!userId || !reportContent) {
        return res.status(400).json({ message: 'userId and reportContent are required.' });
    }
    initializeFirebaseAdmin();
    const db = admin.firestore();
    const schema = {
        type: Type.OBJECT,
        properties: {
            type: { type: Type.STRING, enum: ['produktif', 'santai', 'tidak fokus'] },
            insight: { type: Type.STRING }
        },
        required: ['type', 'insight']
    };
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analisis laporan harian ini: "${reportContent}". Kategorikan sebagai: produktif / santai / tidak fokus. Berikan satu kalimat motivasi singkat dalam Bahasa Indonesia yang relevan dan positif.`,
            config: { responseMimeType: 'application/json', responseSchema: schema }
        });
        const result = JSON.parse(response.text);
        const insightData = { ...result, date: admin.firestore.FieldValue.serverTimestamp() };
        await db.collection('users').doc(userId).collection('aiInsights').add(insightData);
        return res.status(200).json({ success: true, insight: insightData });
    } catch (aiError) {
        const defaultInsight = { type: 'default', insight: 'Tetap semangat hari ini 💪', date: admin.firestore.FieldValue.serverTimestamp() };
        await db.collection('users').doc(userId).collection('aiInsights').add(defaultInsight);
        return res.status(200).json({ success: true, insight: defaultInsight, note: 'AI analysis failed, used default.' });
    }
}

async function handleGenerateAiFeedback(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { reportId, reportContent } = payload;
    if (!reportId || !reportContent) {
        return res.status(400).json({ message: 'reportId and reportContent are required.' });
    }
    initializeFirebaseAdmin();
    const db = admin.firestore();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Anda adalah seorang mentor ahli di sebuah studio kreatif bernama Studio 8. Berdasarkan laporan harian dari seorang anak magang ini, berikan masukan yang singkat, membangun, dan memberi semangat dalam Bahasa Indonesia (maksimal 2 kalimat).\n\nLaporan Magang: "${reportContent}"\n\nContoh feedback yang baik:\n- "Kerja bagus hari ini! Terus eksplorasi teknik editing video, ya. Semangat!"\n- "Progres yang solid! Jangan ragu bertanya jika menemukan kesulitan saat setup lighting."\n\nFeedback Anda:`,
    });
    const feedbackText = response.text;
    const reportRef = db.collection('daily_reports').doc(reportId);
    await reportRef.update({ mentorFeedback: feedbackText });
    const updatedDoc = await reportRef.get();
    const updatedData = { id: updatedDoc.id, ...(updatedDoc.data() as any) };
    if (updatedData.submittedAt && updatedData.submittedAt.toDate) {
        updatedData.submittedAt = updatedData.submittedAt.toDate().toISOString();
    }
    return res.status(200).json(updatedData);
}

async function handleGenerateQuizExplanation(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { questionText, options, correctAnswerIndex, userAnswerIndex } = payload;
    if (!questionText || !options || correctAnswerIndex == null || userAnswerIndex == null) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }
    const userAnswerText = options[userAnswerIndex];
    const correctAnswerText = options[correctAnswerIndex];
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Anda adalah seorang mentor ahli di bidang fotografi, videografi, dan marketing. Seorang siswa baru saja menjawab kuis dan salah memilih jawaban. Tugas Anda adalah memberikan penjelasan yang singkat, jelas, dan mudah dipahami dalam Bahasa Indonesia.\n\nPertanyaan: "${questionText}"\nJawaban siswa (Salah): "${userAnswerText}"\nJawaban yang benar: "${correctAnswerText}"\n\nJelaskan mengapa jawaban siswa salah dan mengapa jawaban yang benar itu tepat. Buat penjelasan ringkas, sekitar 2-3 kalimat. Langsung ke pokok permasalahan.`,
    });
    const explanation = response.text;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(explanation);
}

async function handleGenerateQuizQuestions(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { topic, numQuestions, category } = payload;
    if (!topic || !numQuestions || !category) {
        return res.status(400).json({ message: 'Topic, numQuestions, and category are required.' });
    }
    const questionSchema = {
        type: Type.OBJECT,
        properties: {
            questionText: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswerIndex: { type: Type.NUMBER },
            explanation: { type: Type.STRING },
            imagePrompt: { type: Type.STRING, description: "Deskripsi singkat untuk gambar relevan, atau string kosong." }
        },
        required: ["questionText", "options", "correctAnswerIndex", "explanation", "imagePrompt"]
    };
    const schema = { type: Type.ARRAY, items: questionSchema };
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Buat ${numQuestions} soal kuis pilihan ganda (4 pilihan) tentang "${topic}" dengan kategori "${category}". Pastikan ada satu jawaban yang benar. Berikan penjelasan singkat untuk setiap jawaban yang benar. Untuk setiap pertanyaan, berikan juga "imagePrompt", yaitu deskripsi singkat dalam Bahasa Indonesia untuk membuat gambar yang relevan secara visual dengan pertanyaan tersebut. Jika tidak ada gambar yang relevan, berikan string kosong untuk imagePrompt.\n\nFormat output harus berupa array JSON dari objek, sesuai dengan skema berikut.`,
        config: { responseMimeType: 'application/json', responseSchema: schema }
    });
    const questions = JSON.parse(response.text);
    const formattedQuestions = questions.map((q: any, index: number) => ({ ...q, id: `q-${Date.now()}-${index}` }));
    return res.status(200).json(formattedQuestions);
}

async function handleAnalyzeQuizResult(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { resultId } = payload;
    if (!resultId) {
        return res.status(400).json({ message: 'resultId is required.' });
    }
    initializeFirebaseAdmin();
    const db = admin.firestore();
    const resultDoc = await db.collection('quiz_results').doc(resultId).get();
    if (!resultDoc.exists) {
        return res.status(404).json({ message: 'Quiz result not found.' });
    }
    const resultData = resultDoc.data() as any;
    const incorrectAnswers = resultData.answers.filter((a: any) => !a.isCorrect);
    if (incorrectAnswers.length === 0) {
        const feedback = "Kerja bagus! Semua jawabanmu benar. Pertahankan!";
        await db.collection('quiz_results').doc(resultId).update({ aiFeedback: feedback });
        return res.status(200).json({ feedback });
    }
    const getOptionText = (questionId: string, optionIndex: number) => {
        const question = resultData.quiz?.questions.find((q: any) => q.id === questionId);
        return question?.options[optionIndex] || 'N/A';
    };
    const promptContext = incorrectAnswers.map((ans: any) => `- Pertanyaan: "${ans.questionText}", Jawaban Salah: "${getOptionText(ans.questionId, ans.selectedAnswerIndex)}", Jawaban Benar: "${getOptionText(ans.questionId, ans.correctAnswerIndex)}"`).join('\n');
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Anda adalah mentor yang suportif... Berikut adalah daftar kesalahan mereka:\n${promptContext}\n\nBerdasarkan kesalahan-kesalahan ini, berikan analisis singkat dan 2-3 saran konkret...`,
    });
    const feedbackText = response.text;
    await db.collection('quiz_results').doc(resultId).update({ aiFeedback: feedbackText });
    return res.status(200).json({ feedback: feedbackText });
}

async function handleGenerateMarketingInsight(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { packagePopularity, dailyRevenue } = payload;
    if (!packagePopularity || !dailyRevenue) {
        return res.status(400).json({ message: 'packagePopularity and dailyRevenue are required.' });
    }
    const dataSummary = `- Popularitas Paket: ${packagePopularity.map((p: any) => `${p.name} (${p.value} booking)`).join(', ')}.\n- Tren Pemasukan Harian (7 hari terakhir): ${dailyRevenue.map((d: any) => `${d.name}: Rp ${d.Pemasukan.toLocaleString('id-ID')}`).join(', ')}.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Anda adalah seorang konsultan marketing ahli untuk "Studio 8"... Berdasarkan ringkasan data performa berikut, berikan 2-3 insight atau saran marketing... Data Performa:\n${dataSummary}\n...`,
    });
    const insightText = response.text;
    return res.status(200).json({ insight: insightText });
}
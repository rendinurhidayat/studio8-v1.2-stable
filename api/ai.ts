
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type, GenerateContentResponse } from '@google/genai';
import admin from 'firebase-admin';
import type { ActivityLog } from '../types';
import { initFirebaseAdmin } from '../lib/firebase-admin.js';


// --- Main Handler ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { action, ...payload } = req.body;
    
    if (!action) {
        return res.status(400).json({ message: 'Action is required in the request body.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ message: 'GEMINI_API_KEY is not configured on the server.' });
    }
    const ai = new GoogleGenAI({ apiKey });

    const actionsRequiringDb = ['analyzeInternReport', 'generateAiFeedback', 'analyzeQuizResult'];
    if (actionsRequiringDb.includes(action)) {
        try {
            initFirebaseAdmin();
        } catch (error: any) {
            console.error(`Firebase initialization failed for action '${action}':`, error);
            return res.status(500).json({ message: 'Server configuration error.', error: error.message });
        }
    }

    try {
        switch (action) {
            case 'analyzeFeedback':
                return await handleAnalyzeFeedback(ai, payload, res);
            case 'generateForecast':
                return await handleGenerateForecast(ai, payload, res);
            case 'chat':
                return await handleChat(ai, payload, res);
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
             case 'recommendPackage':
                return await handleRecommendPackage(ai, payload, res);
            case 'generateMouContent':
                return await handleGenerateMouContent(ai, payload, res);
            case 'generateInternReportContent':
                return await handleGenerateInternReportContent(ai, payload, res);
            case 'generatePackageDescription':
                return await handleGeneratePackageDescription(ai, payload, res);
            case 'generateSocialMediaCaption':
                return await handleGenerateSocialMediaCaption(ai, payload, res);
            case 'generateProductivityTip':
                return await handleGenerateProductivityTip(ai, payload, res);
            case 'diagnoseError':
                return await handleDiagnoseError(ai, payload, res);
            default:
                return res.status(400).json({ message: `Unknown action: ${action}` });
        }
    } catch (error: any) {
        console.error(`API Error in action '${action}':`, error);
        // Memberikan pesan yang lebih bersahabat ke client
        const userMessage = error.message.includes("AI returned a malformed JSON") 
            ? "Respons dari AI tidak valid. Silakan coba lagi."
            : "Terjadi kesalahan internal pada server saat memproses permintaan AI.";
            
        return res.status(500).json({ message: userMessage, error: error.message });
    }
}

// --- Individual Action Handlers ---

async function handleGenerateProductivityTip(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { userRole, pageContext } = payload;
    if (!userRole || !pageContext) {
        return res.status(400).json({ message: 'userRole and pageContext are required.' });
    }

    const prompt = `
        Anda adalah seorang pelatih produktivitas untuk aplikasi manajemen studio foto "Studio 8".
        Pengguna saat ini adalah seorang "${userRole}" yang sedang berada di halaman "${pageContext}".

        Tugas Anda: Berikan SATU tips produktivitas yang singkat, relevan, dan dapat langsung ditindaklanjuti.
        
        Aturan:
        - Jawab dalam Bahasa Indonesia.
        - Jaga agar jawaban tetap singkat (maksimal 2-3 kalimat).
        - Fokus pada tindakan yang bisa dilakukan pengguna di halaman tersebut.
        - Gunakan persona yang ramah dan memotivasi.

        Contoh (jika user adalah Admin di halaman Keuangan): "Lihat tren pendapatan 30 hari terakhir. Jika ada penurunan, mungkin ini saatnya membuat promo khusus untuk paket yang kurang populer!"
        
        Berikan tips Anda sekarang.
    `;

    try {
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        for await (const chunk of responseStream) {
            res.write(chunk.text);
        }
        res.end();
    } catch (error: any) {
        console.error("Error streaming AI productivity tip:", error);
        // Since headers might already be sent, we can't send a JSON error.
        // We end the response abruptly. The client will see this as a failed request.
        res.end();
    }
}


async function handleDiagnoseError(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { errorMessage, componentStack } = payload;
    if (!errorMessage || !componentStack) {
        return res.status(400).json({ message: 'errorMessage and componentStack are required.' });
    }

    const prompt = `
        You are a world-class senior frontend engineer specializing in React and TypeScript. A runtime error occurred in a React application. Your task is to analyze the error and provide a concise, actionable solution.

        **Error Message:**
        ${errorMessage}

        **Component Stack Trace:**
        ${componentStack}

        **Instructions:**
        1.  **Identify the Root Cause:** Briefly explain what likely caused this error in plain terms. Use a heading like "### Akar Masalah".
        2.  **Provide a Solution:** Offer a corrected code snippet. If you need to make assumptions about the code, state them clearly. Use a heading like "### Saran Perbaikan".
        3.  **Format:** Use Markdown for your response. Code snippets should be in fenced code blocks with the language specified (e.g., \`\`\`tsx). Be concise.
        4.  **Language:** Respond in Bahasa Indonesia as the development team is Indonesian.

        Begin your analysis now.
    `;

    try {
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        for await (const chunk of responseStream) {
            res.write(chunk.text);
        }
        res.end();
    } catch (error: any) {
        console.error("Error streaming AI diagnosis:", error);
        res.end(); // End the stream on error
    }
}


async function handleGeneratePackageDescription(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { packageName } = payload;
    if (!packageName) {
        return res.status(400).json({ message: 'packageName is required.' });
    }

    try {
        const prompt = `Anda adalah seorang copywriter marketing untuk "Studio 8", sebuah studio foto modern. Buat deskripsi yang menarik, singkat (2-3 kalimat), dan persuasif untuk paket foto bernama "${packageName}". Deskripsi harus menonjolkan manfaat utama dan target audiensnya (misalnya, untuk wisuda, keluarga, atau pasangan). Gunakan bahasa yang menjual dan ajakan untuk bertindak (call-to-action) yang halus. Berikan hanya teks deskripsinya saja, tanpa judul atau embel-embel lain.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(200).send(response.text);
    } catch (error) {
        console.error("Error generating package description:", error);
        throw new Error("Gagal terhubung dengan layanan AI untuk membuat deskripsi paket.");
    }
}

async function handleGenerateSocialMediaCaption(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { asset } = payload;
    if (!asset) {
        return res.status(400).json({ message: 'asset object is required.' });
    }
    let response: GenerateContentResponse;
    try {
        const prompt = `
            Anda adalah seorang social media manager yang kreatif untuk "Studio 8", sebuah studio foto modern.
            Tugas Anda adalah membuat 3 pilihan caption Instagram yang menarik berdasarkan detail aset berikut.

            Detail Aset:
            - Tipe File: ${asset.fileType}
            - Kategori: ${asset.category}
            - Tags: ${asset.tags.join(', ')}
            - Nama File (mungkin berisi petunjuk): ${asset.fileName}

            Buat 3 variasi caption:
            1.  **Caption 1 (Informatif & Profesional):** Jelaskan layanan atau momen yang mungkin terkait dengan aset ini.
            2.  **Caption 2 (Santai & Mengajak Interaksi):** Gunakan bahasa yang lebih kasual, ajukan pertanyaan kepada audiens.
            3.  **Caption 3 (Singkat & Penuh Emoji):** Caption pendek yang eye-catching dengan banyak emoji relevan.

            Sertakan juga beberapa hashtag yang relevan di akhir setiap caption, seperti #studiofoto #selfphotostudio #fotobanjar #studio8banjar.
            
            Format output HARUS berupa JSON dengan skema berikut:
        `;

        const schema = {
            type: Type.OBJECT,
            properties: {
                captions: {
                    type: Type.ARRAY,
                    description: "Array berisi 3 string caption yang berbeda.",
                    items: { type: Type.STRING }
                }
            },
            required: ["captions"]
        };

        response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema,
            }
        });

        const result = JSON.parse(response.text!);
        return res.status(200).json(result);
    } catch (e: any) {
        if (e instanceof SyntaxError) {
             console.error("Failed to parse JSON from AI for social media caption:", (response! as any).text);
             throw new SyntaxError("AI returned a malformed JSON response for social media captions.");
        }
        console.error("Error generating social media caption:", e);
        throw new Error("Gagal terhubung dengan layanan AI untuk membuat caption.");
    }
}


async function handleGenerateMouContent(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { sponsorshipData } = payload;
    if (!sponsorshipData) {
        return res.status(400).json({ message: 'sponsorshipData is required.' });
    }

    try {
        const prompt = `
            Anda adalah asisten legal yang ahli dalam membuat draf dokumen kerjasama.
            Buat draf Memorandum of Understanding (MoU) untuk kerjasama sponsorship antara "Studio 8" dan pihak kedua.

            Gunakan format Markdown. Draf harus mencakup bagian-bagian berikut:
            1. Judul: "MEMORANDUM OF UNDERSTANDING (MoU) KERJASAMA SPONSORSHIP"
            2. Para Pihak:
               - PIHAK PERTAMA: Studio 8.
               - PIHAK KEDUA: ${sponsorshipData.institutionName}.
            3. Latar Belakang: Jelaskan secara singkat tujuan kerjasama ini terkait acara "${sponsorshipData.eventName}".
            4. Objek Kerjasama: Jelaskan bentuk kerjasama yang diajukan, yaitu "${sponsorshipData.partnershipType}".
            5. Hak dan Kewajiban:
               - Jabarkan kewajiban PIHAK PERTAMA (Studio 8) berdasarkan benefit yang ditawarkan.
               - Jabarkan kewajiban PIHAK KEDUA (${sponsorshipData.institutionName}).
            6. Benefit yang Ditawarkan PIHAK KEDUA untuk Studio 8:
               - "${sponsorshipData.benefits}"
            7. Jangka Waktu: Sebutkan bahwa jangka waktu kerjasama akan dibahas lebih lanjut.
            8. Penutup: Kalimat penutup standar untuk MoU.
            9. Tanda Tangan: Sediakan placeholder untuk tanda tangan kedua belah pihak, termasuk nama PIC dari PIHAK KEDUA (${sponsorshipData.picName}).

            Buatlah draf ini dengan bahasa yang formal dan profesional.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(200).send(response.text);
    } catch (error) {
        console.error("Error generating MoU content:", error);
        throw new Error("Gagal terhubung dengan layanan AI untuk membuat draf MoU.");
    }
}

async function handleGenerateInternReportContent(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { internName, period, attendanceSummary, tasksSummary, reportsSummary } = payload;
    if (!internName || !period || !attendanceSummary || !tasksSummary || !reportsSummary) {
        return res.status(400).json({ message: 'Missing required data for report generation.' });
    }

    try {
        const prompt = `
            Anda adalah seorang mentor di Studio 8. Buat draf Laporan Perkembangan Peserta Praktik Kerja Lapangan (PKL) berdasarkan data berikut.
            Gunakan format Markdown dengan bahasa yang formal dan terstruktur.

            **Data Peserta:**
            - Nama Lengkap: ${internName}
            - Periode PKL: ${period}

            **Rangkuman Kinerja:**
            - Kehadiran: ${attendanceSummary}
            - Tugas yang diselesaikan: ${tasksSummary}
            - Rangkuman Laporan Harian: ${reportsSummary}

            **Struktur Laporan:**
            1.  **PENDAHULUAN:** Paragraf singkat yang menyatakan tujuan laporan ini.
            2.  **EVALUASI KINERJA:**
                -   **A. Kehadiran (Disiplin):** Berikan ulasan singkat berdasarkan data kehadiran.
                -   **B. Pelaksanaan Tugas (Kompetensi):** Berikan ulasan berdasarkan rangkuman tugas.
                -   **C. Laporan Harian (Inisiatif & Komunikasi):** Berikan ulasan berdasarkan rangkuman laporan harian.
            3.  **CATATAN DAN REKOMENDASI:** Berikan satu paragraf berisi catatan umum dan rekomendasi untuk peserta di masa mendatang.
            4.  **PENUTUP:** Paragraf penutup formal.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(200).send(response.text);
    } catch (error) {
        console.error("Error generating intern report content:", error);
        throw new Error("Gagal terhubung dengan layanan AI untuk membuat laporan.");
    }
}


async function handleRecommendPackage(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { userQuery, packages } = payload;
    if (!userQuery || !packages) {
        return res.status(400).json({ message: 'userQuery and packages are required.' });
    }

    let response: GenerateContentResponse;
    try {
        const packageListString = packages.map((p: any) => 
            `- Nama Paket: "${p.name}", Deskripsi: "${p.description}", Harga: ${p.subPackages.map((sp:any) => `Rp ${sp.price}`).join(' / ')}`
        ).join('\n');

        const prompt = `
            Anda adalah asisten penjualan yang cerdas dan ramah untuk Studio 8. Tugas Anda adalah merekomendasikan paket foto terbaik berdasarkan kebutuhan pelanggan.

            Berikut adalah daftar paket yang tersedia:
            ${packageListString}

            Kebutuhan pelanggan: "${userQuery}"

            Tugas:
            1. Analisis kebutuhan pelanggan.
            2. Pilih SATU paket yang paling sesuai dari daftar di atas. Nama paket harus persis sama.
            3. Berikan alasan singkat (1-2 kalimat) mengapa paket tersebut direkomendasikan, dalam Bahasa Indonesia yang ramah.

            Format output Anda HARUS berupa JSON dengan skema berikut:
        `;

        const schema = {
            type: Type.OBJECT,
            properties: {
                recommendedPackageName: { type: Type.STRING, description: "Nama paket yang direkomendasikan (harus sama persis)." },
                reasoning: { type: Type.STRING, description: "Alasan singkat mengapa paket ini cocok." }
            },
            required: ["recommendedPackageName", "reasoning"]
        };

        response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema,
            }
        });

        const result = JSON.parse(response.text!);
        return res.status(200).json(result);
    } catch(e: any) {
        if (e instanceof SyntaxError) {
             console.error("Failed to parse JSON from AI for package recommendation:", (response! as any).text);
             throw new SyntaxError("AI returned a malformed JSON response for package recommendation.");
        }
        console.error("Error recommending package:", e);
        throw new Error("Gagal terhubung dengan layanan AI untuk rekomendasi paket.");
    }
}


async function handleGenerateClassDescription(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { topic } = payload;
    if (!topic) {
        return res.status(400).json({ message: 'Topic is required.' });
    }
    
    try {
        const prompt = `Anda adalah seorang instruktur ahli di Studio 8. Buat deskripsi singkat (2-3 kalimat) yang menarik dan informatif untuk kelas praktek mingguan dengan topik "${topic}". Jelaskan secara singkat apa yang akan dipelajari peserta dan manfaatnya. Gunakan bahasa yang santai dan memotivasi.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(200).send(response.text);
    } catch (error) {
        console.error("Error generating class description:", error);
        throw new Error("Gagal terhubung dengan layanan AI untuk membuat deskripsi kelas.");
    }
}


async function handleAnalyzeFeedback(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { feedbackText } = payload;
    if (!feedbackText) {
        return res.status(400).json({ message: 'feedbackText is required.' });
    }
    let response: GenerateContentResponse;
    try {
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
        response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analisis kumpulan feedback pelanggan untuk studio foto bernama "Studio 8" berikut ini.\nFeedback:\n${feedbackText}\n\nBerikan analisis terstruktur dalam format JSON. Analisis harus mencakup:\n1. 'overallSentiment': Satu kalimat ringkas tentang sentimen umum dalam Bahasa Indonesia (misal: "Sangat Positif", "Cukup Baik dengan beberapa masukan", "Negatif").\n2. 'positivePoints': Array string berisi poin-poin positif utama yang sering disebut pelanggan.\n3. 'areasForImprovement': Array string berisi kritik atau area utama untuk perbaikan.\n4. 'actionableSuggestions': Array string berisi 2-3 saran konkret yang bisa ditindaklanjuti oleh pemilik studio.\n\nSeluruh respons harus dalam Bahasa Indonesia.`,
            config: { responseMimeType: 'application/json', responseSchema: schema }
        });

        const result = JSON.parse(response.text!);
        return res.status(200).json(result);
    } catch(e: any) {
        if (e instanceof SyntaxError) {
            console.error("Failed to parse JSON from AI for feedback analysis:", (response! as any).text);
            throw new SyntaxError("AI returned a malformed JSON response for feedback analysis.");
        }
        console.error("Error analyzing feedback:", e);
        throw new Error("Gagal terhubung dengan layanan AI untuk menganalisis feedback.");
    }
}

async function handleGenerateForecast(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { historicalDataString } = payload;
    if (!historicalDataString) {
        return res.status(400).json({ message: 'historicalDataString is required.' });
    }
    let response: GenerateContentResponse;
    try {
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
        response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Anda adalah seorang analis keuangan ahli untuk sebuah studio foto bernama Studio 8.\nBerdasarkan data pendapatan historis berikut, berikan analisis dan peramalan keuangan.\nData historis (hingga 6 bulan terakhir):\n${historicalDataString}\n\nTugas Anda:\n1.  predictedRevenue: Prediksi pendapatan untuk bulan berikutnya dalam bentuk angka (integer, tanpa format Rupiah atau desimal).\n2.  budgetRecommendation: Berikan rekomendasi alokasi anggaran berdasarkan pendapatan yang diprediksi. Alokasikan ke dalam kategori berikut: 'marketing', 'equipment', 'maintenance', 'savings', 'operation'. Total alokasi harus sama dengan predictedRevenue. Kembalikan dalam bentuk objek dengan nilai numerik (integer).\n3.  aiAlert: Berikan satu insight atau peringatan singkat (maksimal 2 kalimat, dalam Bahasa Indonesia) berdasarkan tren data historis. Misalnya, jika ada penurunan, sarankan sesuatu. Jika ada kenaikan, berikan dorongan.\n\nBerikan output HANYA dalam format JSON yang valid dan terstruktur sesuai skema.`,
            config: { responseMimeType: 'application/json', responseSchema: schema }
        });

        const result = JSON.parse(response.text!);
        return res.status(200).json(result);
    } catch(e: any) {
        if (e instanceof SyntaxError) {
            console.error("Failed to parse JSON from AI for forecast:", (response! as any).text);
            throw new SyntaxError("AI returned a malformed JSON response for forecast.");
        }
        console.error("Error generating forecast:", e);
        throw new Error("Gagal terhubung dengan layanan AI untuk membuat prediksi keuangan.");
    }
}

async function handleChat(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { history, pageContext } = payload;
    if (!history) {
        return res.status(400).json({ message: 'History array is required.' });
    }
    
    const whatsappNumber = "+6285724025425";
    const instagramUsername = "studiolapan_";

    let systemInstruction = `
            Anda adalah Otto, asisten AI ceria dari Studio 8. Persona Anda ramah, proaktif, dan sangat membantu. Gunakan Bahasa Indonesia yang santai, modern, dan penuh emoji. ✨
            Tujuan utama Anda adalah menjawab pertanyaan umum dan membantu pengguna merasa nyaman untuk melakukan booking.

            --- BASIS PENGETAHUAN ANDA (SUMBER KEBENARAN) ---
            - WhatsApp Admin: ${whatsappNumber}
            - Instagram: @${instagramUsername}
            - Cara Booking: Pelanggan bisa klik tombol "Booking Sekarang" atau "Lihat Paket" di website.
            - Uang Muka (DP): Untuk beberapa paket, ada DP Rp 35.000 untuk kunci jadwal. Sisanya dibayar di studio.
            - Metode Pembayaran: QRIS, Transfer Bank (BNI & BRI), Dana, dan Shopeepay.
            - Pindah Jadwal (Reschedule): Bisa, maksimal H-7 sebelum jadwal sesi melalui halaman 'Cek Status'.
            - Pembatalan: DP kembali 100% jika dibatalkan H-1 (lebih dari 24 jam). Kurang dari 24 jam, DP hangus.
            - Hasil Foto: Pelanggan dapat semua file digital (soft file). Beberapa paket dapat bonus editan.
            - Lokasi: Depan SMK 4 Banjar, Sukamukti, Pataruman, Kota Banjar.

            --- ATURAN PERCAKAPAN WAJIB ---
            1.  **SINGKAT & JELAS:** Jawaban Anda HARUS singkat (maksimal 3-4 kalimat). Gunakan poin jika perlu.
            2.  **JANGAN MENGARANG:** Jika pertanyaan di luar "BASIS PENGETAHUAN ANDA" (misal: promo spesifik, ketersediaan jadwal real-time, harga detail yang tidak ada), JANGAN PERNAH menebak. Langsung alihkan pengguna ke admin dengan ramah. Contoh: "Wah, untuk info promo paling update, paling pas langsung tanya admin di WhatsApp ya! Biar infonya akurat. 😉" atau "Untuk cek jadwal yang kosong, kamu bisa langsung klik tombol 'Booking Sekarang' di website, lho!"
            3.  **JADILAH PROAKTIF:** Jika pengguna bertanya tentang sesuatu, coba berikan langkah selanjutnya. Contoh: Jika bertanya lokasi, berikan alamat dan tambahkan "Kami tunggu kedatanganmu ya!". Jika bertanya cara booking, jelaskan singkat dan arahkan untuk klik tombol booking.
            4.  **SELALU RAMAH:** Gunakan sapaan seperti "kak", "kamu", dan akhiri jawaban dengan positif.
        `;
        
    if (pageContext) {
        systemInstruction += `
            --- KONTEKS HALAMAN SAAT INI ---
            ${pageContext}

            **ATURAN TAMBAHAN:** Jika pertanyaan pengguna berkaitan dengan konteks di atas, prioritaskan informasi tersebut dalam jawabanmu untuk memberikan respons yang paling relevan.
            `;
    }
        
    try {
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: history.slice(0, -1),
            config: { systemInstruction }
        });
        const latestMessage = history[history.length - 1]?.parts[0]?.text || '';
        const resultStream = await chat.sendMessageStream({ message: latestMessage });
        
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        for await (const chunk of resultStream) {
            res.write(chunk.text);
        }
        res.end();
    } catch (error) {
        console.error("Error handling chat stream:", error);
        res.end();
    }
}

async function handleAnalyzeInternReport(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { userId, reportContent } = payload;
    if (!userId || !reportContent) {
        return res.status(400).json({ message: 'userId and reportContent are required.' });
    }
    const db = admin.firestore();
    let response: GenerateContentResponse | undefined;
    try {
        const schema = {
            type: Type.OBJECT,
            properties: {
                type: { type: Type.STRING, enum: ['produktif', 'santai', 'tidak fokus'] },
                insight: { type: Type.STRING }
            },
            required: ['type', 'insight']
        };
        response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analisis laporan harian ini: "${reportContent}". Kategorikan sebagai: produktif / santai / tidak fokus. Berikan satu kalimat motivasi singkat dalam Bahasa Indonesia yang relevan dan positif.`,
            config: { responseMimeType: 'application/json', responseSchema: schema }
        });

        const result = JSON.parse(response.text!);
        const insightData = { ...result, date: admin.firestore.FieldValue.serverTimestamp() };
        await db.collection('users').doc(userId).collection('aiInsights').add(insightData);
        return res.status(200).json({ success: true, insight: insightData });
    } catch (aiError: any) {
        console.error("AI analysis failed during handleAnalyzeInternReport:", aiError);
        if (aiError instanceof SyntaxError) {
             console.error("Malformed JSON from AI in handleAnalyzeInternReport:", response?.text);
        }
        // Fallback: save a default insight to prevent breaking the flow
        const defaultInsight = { type: 'default', insight: 'Tetap semangat hari ini 💪', date: admin.firestore.FieldValue.serverTimestamp() };
        await db.collection('users').doc(userId).collection('aiInsights').add(defaultInsight)
          .catch(dbError => console.error("Failed to save default insight:", dbError));
        // Still return success to the client, but with a note about the AI failure.
        return res.status(200).json({ success: true, insight: defaultInsight, note: 'AI analysis failed, used default.' });
    }
}

async function handleGenerateAiFeedback(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { reportId, reportContent } = payload;
    if (!reportId || !reportContent) {
        return res.status(400).json({ message: 'reportId and reportContent are required.' });
    }
    
    const db = admin.firestore();
    try {
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
    } catch (error) {
        console.error("Error generating AI feedback:", error);
        throw new Error("Gagal terhubung dengan layanan AI untuk membuat feedback.");
    }
}

async function handleGenerateQuizExplanation(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { questionText, options, correctAnswerIndex, userAnswerIndex } = payload;
    if (!questionText || !options || correctAnswerIndex == null || userAnswerIndex == null) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }
    try {
        const userAnswerText = options[userAnswerIndex];
        const correctAnswerText = options[correctAnswerIndex];
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Anda adalah seorang mentor ahli di bidang fotografi, videografi, dan marketing. Seorang siswa baru saja menjawab kuis dan salah memilih jawaban. Tugas Anda adalah memberikan penjelasan yang singkat, jelas, dan mudah dipahami dalam Bahasa Indonesia.\n\nPertanyaan: "${questionText}"\nJawaban siswa (Salah): "${userAnswerText}"\nJawaban yang benar: "${correctAnswerText}"\n\nJelaskan mengapa jawaban siswa salah dan mengapa jawaban yang benar itu tepat. Buat penjelasan ringkas, sekitar 2-3 kalimat. Langsung ke pokok permasalahan.`,
        });
        const explanation = response.text;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(200).send(explanation);
    } catch (error) {
        console.error("Error generating quiz explanation:", error);
        throw new Error("Gagal terhubung dengan layanan AI untuk membuat penjelasan.");
    }
}

async function handleGenerateQuizQuestions(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { topic, numQuestions, category } = payload;
    if (!topic || !numQuestions || !category) {
        return res.status(400).json({ message: 'Topic, numQuestions, and category are required.' });
    }
    let response: GenerateContentResponse;
    try {
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
        response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Buat ${numQuestions} soal kuis pilihan ganda (4 pilihan) tentang "${topic}" dengan kategori "${category}". Pastikan ada satu jawaban yang benar. Berikan penjelasan singkat untuk setiap jawaban yang benar. Untuk setiap pertanyaan, berikan juga "imagePrompt", yaitu deskripsi singkat dalam Bahasa Indonesia untuk membuat gambar yang relevan secara visual dengan pertanyaan tersebut. Jika tidak ada gambar yang relevan, berikan string kosong untuk imagePrompt.\n\nFormat output harus berupa array JSON dari objek, sesuai dengan skema berikut.`,
            config: { responseMimeType: 'application/json', responseSchema: schema }
        });

        const questions = JSON.parse(response.text!);
        return res.status(200).json(questions);
    } catch(e: any) {
        if (e instanceof SyntaxError) {
            console.error("Failed to parse JSON from AI for quiz questions:", (response! as any).text);
            throw new SyntaxError("AI returned a malformed JSON response for quiz questions.");
        }
        console.error("Error generating quiz questions:", e);
        throw new Error("Gagal terhubung dengan layanan AI untuk membuat kuis.");
    }
}

async function handleAnalyzeQuizResult(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { resultId } = payload;
    if (!resultId) {
        return res.status(400).json({ message: 'resultId is required.' });
    }
    
    const db = admin.firestore();
    const resultDoc = await db.collection('quiz_results').doc(resultId).get();
    if (!resultDoc.exists) {
        return res.status(404).json({ message: 'Quiz result not found.' });
    }
    
    try {
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
            contents: `Anda adalah mentor yang suportif. Seorang siswa baru saja menyelesaikan kuis dan membuat beberapa kesalahan.\nBerikut adalah daftar kesalahan mereka:\n${promptContext}\n\nBerdasarkan kesalahan-kesalahan ini, berikan analisis singkat dan 2-3 saran konkret untuk perbaikan. Buatlah dalam format paragraf yang bersahabat dan memotivasi, dalam Bahasa Indonesia.`,
        });
        const feedbackText = response.text;
        await db.collection('quiz_results').doc(resultId).update({ aiFeedback: feedbackText });
        return res.status(200).json({ feedback: feedbackText });
    } catch (error) {
        console.error("Error analyzing quiz result:", error);
        throw new Error("Gagal terhubung dengan layanan AI untuk menganalisis hasil kuis.");
    }
}

async function handleGenerateMarketingInsight(ai: GoogleGenAI, payload: any, res: VercelResponse) {
    const { packagePopularity, dailyRevenue, recentActivity } = payload;
    if (!packagePopularity || !dailyRevenue) {
        return res.status(400).json({ message: 'packagePopularity and dailyRevenue are required.' });
    }
    
    try {
        const activitySummary = recentActivity.map((log: ActivityLog) => `- ${log.userName} ${log.action.toLowerCase()}`).join('\n');
        
        const dataSummary = `
    - Popularitas Paket: ${packagePopularity.map((p: any) => `${p.name} (${p.value} booking)`).join(', ')}.
    - Tren Pemasukan Harian (7 hari terakhir): ${dailyRevenue.map((d: any) => `${d.name}: Rp ${d.Pemasukan.toLocaleString('id-ID')}`).join(', ')}.
    - Aktivitas Tim Terbaru:
    ${activitySummary}
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
                Anda adalah seorang konsultan marketing ahli untuk "Studio 8", sebuah studio foto modern.
                Berdasarkan ringkasan data performa dan aktivitas tim berikut, berikan 2-3 insight atau saran marketing yang singkat, konkret, dan actionable dalam Bahasa Indonesia.
                Fokus pada cara meningkatkan booking atau mempromosikan paket yang populer. Hubungkan saran Anda dengan aktivitas tim jika memungkinkan. Gunakan format poin (bullet points).

                Data Performa & Aktivitas:
                ${dataSummary}

                Contoh output:
                - Tim baru saja mengonfirmasi banyak booking. Ini saat yang tepat untuk membuat konten "behind the scenes" di Instagram untuk menunjukkan kesibukan studio!
                - Paket "Wisuda Berdua" sangat populer! Buat promo kilat "Ajak Teman Wisuda" untuk meningkatkan momentum.
                - Pendapatan cenderung menurun. Mungkin tim bisa fokus menghubungi klien lama untuk menawarkan sesi foto selanjutnya dengan diskon khusus.
            `,
        });
        const insightText = response.text;
        return res.status(200).json({ insight: insightText });
    } catch (error) {
        console.error("Error generating marketing insight:", error);
        throw new Error("Gagal terhubung dengan layanan AI untuk membuat insight marketing.");
    }
}

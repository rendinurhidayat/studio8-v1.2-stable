var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
import { GoogleGenAI, Type } from '@google/genai';
import admin from 'firebase-admin';
import { initFirebaseAdmin } from './lib/firebase-admin';
// --- Main Handler ---
export default function handler(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, action, payload, apiKey, ai, actionsRequiringDb, _b, error_1, userMessage;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (req.method !== 'POST') {
                        return [2 /*return*/, res.status(405).json({ message: 'Method Not Allowed' })];
                    }
                    _a = req.body, action = _a.action, payload = __rest(_a, ["action"]);
                    if (!action) {
                        return [2 /*return*/, res.status(400).json({ message: 'Action is required in the request body.' })];
                    }
                    apiKey = process.env.GEMINI_API_KEY;
                    if (!apiKey) {
                        return [2 /*return*/, res.status(500).json({ message: 'GEMINI_API_KEY is not configured on the server.' })];
                    }
                    ai = new GoogleGenAI({ apiKey: apiKey });
                    actionsRequiringDb = ['analyzeInternReport', 'generateAiFeedback', 'analyzeQuizResult'];
                    if (actionsRequiringDb.includes(action)) {
                        try {
                            initFirebaseAdmin();
                        }
                        catch (error) {
                            console.error("Firebase initialization failed for action '".concat(action, "':"), error);
                            return [2 /*return*/, res.status(500).json({ message: 'Server configuration error.', error: error.message })];
                        }
                    }
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 38, , 39]);
                    _b = action;
                    switch (_b) {
                        case 'analyzeFeedback': return [3 /*break*/, 2];
                        case 'generateForecast': return [3 /*break*/, 4];
                        case 'chat': return [3 /*break*/, 6];
                        case 'analyzeInternReport': return [3 /*break*/, 8];
                        case 'generateAiFeedback': return [3 /*break*/, 10];
                        case 'generateQuizExplanation': return [3 /*break*/, 12];
                        case 'generateQuizQuestions': return [3 /*break*/, 14];
                        case 'analyzeQuizResult': return [3 /*break*/, 16];
                        case 'generateMarketingInsight': return [3 /*break*/, 18];
                        case 'generateClassDescription': return [3 /*break*/, 20];
                        case 'recommendPackage': return [3 /*break*/, 22];
                        case 'generateMouContent': return [3 /*break*/, 24];
                        case 'generateInternReportContent': return [3 /*break*/, 26];
                        case 'generatePackageDescription': return [3 /*break*/, 28];
                        case 'generateSocialMediaCaption': return [3 /*break*/, 30];
                        case 'generateProductivityTip': return [3 /*break*/, 32];
                        case 'diagnoseError': return [3 /*break*/, 34];
                    }
                    return [3 /*break*/, 36];
                case 2: return [4 /*yield*/, handleAnalyzeFeedback(ai, payload, res)];
                case 3: return [2 /*return*/, _c.sent()];
                case 4: return [4 /*yield*/, handleGenerateForecast(ai, payload, res)];
                case 5: return [2 /*return*/, _c.sent()];
                case 6: return [4 /*yield*/, handleChat(ai, payload, res)];
                case 7: return [2 /*return*/, _c.sent()];
                case 8: return [4 /*yield*/, handleAnalyzeInternReport(ai, payload, res)];
                case 9: return [2 /*return*/, _c.sent()];
                case 10: return [4 /*yield*/, handleGenerateAiFeedback(ai, payload, res)];
                case 11: return [2 /*return*/, _c.sent()];
                case 12: return [4 /*yield*/, handleGenerateQuizExplanation(ai, payload, res)];
                case 13: return [2 /*return*/, _c.sent()];
                case 14: return [4 /*yield*/, handleGenerateQuizQuestions(ai, payload, res)];
                case 15: return [2 /*return*/, _c.sent()];
                case 16: return [4 /*yield*/, handleAnalyzeQuizResult(ai, payload, res)];
                case 17: return [2 /*return*/, _c.sent()];
                case 18: return [4 /*yield*/, handleGenerateMarketingInsight(ai, payload, res)];
                case 19: return [2 /*return*/, _c.sent()];
                case 20: return [4 /*yield*/, handleGenerateClassDescription(ai, payload, res)];
                case 21: return [2 /*return*/, _c.sent()];
                case 22: return [4 /*yield*/, handleRecommendPackage(ai, payload, res)];
                case 23: return [2 /*return*/, _c.sent()];
                case 24: return [4 /*yield*/, handleGenerateMouContent(ai, payload, res)];
                case 25: return [2 /*return*/, _c.sent()];
                case 26: return [4 /*yield*/, handleGenerateInternReportContent(ai, payload, res)];
                case 27: return [2 /*return*/, _c.sent()];
                case 28: return [4 /*yield*/, handleGeneratePackageDescription(ai, payload, res)];
                case 29: return [2 /*return*/, _c.sent()];
                case 30: return [4 /*yield*/, handleGenerateSocialMediaCaption(ai, payload, res)];
                case 31: return [2 /*return*/, _c.sent()];
                case 32: return [4 /*yield*/, handleGenerateProductivityTip(ai, payload, res)];
                case 33: return [2 /*return*/, _c.sent()];
                case 34: return [4 /*yield*/, handleDiagnoseError(ai, payload, res)];
                case 35: return [2 /*return*/, _c.sent()];
                case 36: return [2 /*return*/, res.status(400).json({ message: "Unknown action: ".concat(action) })];
                case 37: return [3 /*break*/, 39];
                case 38:
                    error_1 = _c.sent();
                    console.error("API Error in action '".concat(action, "':"), error_1);
                    userMessage = error_1.message.includes("AI returned a malformed JSON")
                        ? "Respons dari AI tidak valid. Silakan coba lagi."
                        : "Terjadi kesalahan internal pada server saat memproses permintaan AI.";
                    return [2 /*return*/, res.status(500).json({ message: userMessage, error: error_1.message })];
                case 39: return [2 /*return*/];
            }
        });
    });
}
// --- Individual Action Handlers ---
function handleGenerateProductivityTip(ai, payload, res) {
    return __awaiter(this, void 0, void 0, function () {
        var userRole, pageContext, prompt, responseStream, _a, responseStream_1, responseStream_1_1, chunk, e_1_1, error_2;
        var _b, e_1, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    userRole = payload.userRole, pageContext = payload.pageContext;
                    if (!userRole || !pageContext) {
                        return [2 /*return*/, res.status(400).json({ message: 'userRole and pageContext are required.' })];
                    }
                    prompt = "\n        Anda adalah seorang pelatih produktivitas untuk aplikasi manajemen studio foto \"Studio 8\".\n        Pengguna saat ini adalah seorang \"".concat(userRole, "\" yang sedang berada di halaman \"").concat(pageContext, "\".\n\n        Tugas Anda: Berikan SATU tips produktivitas yang singkat, relevan, dan dapat langsung ditindaklanjuti.\n        \n        Aturan:\n        - Jawab dalam Bahasa Indonesia.\n        - Jaga agar jawaban tetap singkat (maksimal 2-3 kalimat).\n        - Fokus pada tindakan yang bisa dilakukan pengguna di halaman tersebut.\n        - Gunakan persona yang ramah dan memotivasi.\n\n        Contoh (jika user adalah Admin di halaman Keuangan): \"Lihat tren pendapatan 30 hari terakhir. Jika ada penurunan, mungkin ini saatnya membuat promo khusus untuk paket yang kurang populer!\"\n        \n        Berikan tips Anda sekarang.\n    ");
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 15, , 16]);
                    return [4 /*yield*/, ai.models.generateContentStream({
                            model: 'gemini-2.5-flash',
                            contents: prompt,
                        })];
                case 2:
                    responseStream = _e.sent();
                    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                    _e.label = 3;
                case 3:
                    _e.trys.push([3, 8, 9, 14]);
                    _a = true, responseStream_1 = __asyncValues(responseStream);
                    _e.label = 4;
                case 4: return [4 /*yield*/, responseStream_1.next()];
                case 5:
                    if (!(responseStream_1_1 = _e.sent(), _b = responseStream_1_1.done, !_b)) return [3 /*break*/, 7];
                    _d = responseStream_1_1.value;
                    _a = false;
                    chunk = _d;
                    res.write(chunk.text);
                    _e.label = 6;
                case 6:
                    _a = true;
                    return [3 /*break*/, 4];
                case 7: return [3 /*break*/, 14];
                case 8:
                    e_1_1 = _e.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 14];
                case 9:
                    _e.trys.push([9, , 12, 13]);
                    if (!(!_a && !_b && (_c = responseStream_1.return))) return [3 /*break*/, 11];
                    return [4 /*yield*/, _c.call(responseStream_1)];
                case 10:
                    _e.sent();
                    _e.label = 11;
                case 11: return [3 /*break*/, 13];
                case 12:
                    if (e_1) throw e_1.error;
                    return [7 /*endfinally*/];
                case 13: return [7 /*endfinally*/];
                case 14:
                    res.end();
                    return [3 /*break*/, 16];
                case 15:
                    error_2 = _e.sent();
                    console.error("Error streaming AI productivity tip:", error_2);
                    // Since headers might already be sent, we can't send a JSON error.
                    // We end the response abruptly. The client will see this as a failed request.
                    res.end();
                    return [3 /*break*/, 16];
                case 16: return [2 /*return*/];
            }
        });
    });
}
function handleDiagnoseError(ai, payload, res) {
    return __awaiter(this, void 0, void 0, function () {
        var errorMessage, componentStack, prompt, responseStream, _a, responseStream_2, responseStream_2_1, chunk, e_2_1, error_3;
        var _b, e_2, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    errorMessage = payload.errorMessage, componentStack = payload.componentStack;
                    if (!errorMessage || !componentStack) {
                        return [2 /*return*/, res.status(400).json({ message: 'errorMessage and componentStack are required.' })];
                    }
                    prompt = "\n        You are a world-class senior frontend engineer specializing in React and TypeScript. A runtime error occurred in a React application. Your task is to analyze the error and provide a concise, actionable solution.\n\n        **Error Message:**\n        ".concat(errorMessage, "\n\n        **Component Stack Trace:**\n        ").concat(componentStack, "\n\n        **Instructions:**\n        1.  **Identify the Root Cause:** Briefly explain what likely caused this error in plain terms. Use a heading like \"### Akar Masalah\".\n        2.  **Provide a Solution:** Offer a corrected code snippet. If you need to make assumptions about the code, state them clearly. Use a heading like \"### Saran Perbaikan\".\n        3.  **Format:** Use Markdown for your response. Code snippets should be in fenced code blocks with the language specified (e.g., ```tsx). Be concise.\n        4.  **Language:** Respond in Bahasa Indonesia as the development team is Indonesian.\n\n        Begin your analysis now.\n    ");
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 15, , 16]);
                    return [4 /*yield*/, ai.models.generateContentStream({
                            model: 'gemini-2.5-pro',
                            contents: prompt,
                        })];
                case 2:
                    responseStream = _e.sent();
                    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                    _e.label = 3;
                case 3:
                    _e.trys.push([3, 8, 9, 14]);
                    _a = true, responseStream_2 = __asyncValues(responseStream);
                    _e.label = 4;
                case 4: return [4 /*yield*/, responseStream_2.next()];
                case 5:
                    if (!(responseStream_2_1 = _e.sent(), _b = responseStream_2_1.done, !_b)) return [3 /*break*/, 7];
                    _d = responseStream_2_1.value;
                    _a = false;
                    chunk = _d;
                    res.write(chunk.text);
                    _e.label = 6;
                case 6:
                    _a = true;
                    return [3 /*break*/, 4];
                case 7: return [3 /*break*/, 14];
                case 8:
                    e_2_1 = _e.sent();
                    e_2 = { error: e_2_1 };
                    return [3 /*break*/, 14];
                case 9:
                    _e.trys.push([9, , 12, 13]);
                    if (!(!_a && !_b && (_c = responseStream_2.return))) return [3 /*break*/, 11];
                    return [4 /*yield*/, _c.call(responseStream_2)];
                case 10:
                    _e.sent();
                    _e.label = 11;
                case 11: return [3 /*break*/, 13];
                case 12:
                    if (e_2) throw e_2.error;
                    return [7 /*endfinally*/];
                case 13: return [7 /*endfinally*/];
                case 14:
                    res.end();
                    return [3 /*break*/, 16];
                case 15:
                    error_3 = _e.sent();
                    console.error("Error streaming AI diagnosis:", error_3);
                    res.end(); // End the stream on error
                    return [3 /*break*/, 16];
                case 16: return [2 /*return*/];
            }
        });
    });
}
function handleGeneratePackageDescription(ai, payload, res) {
    return __awaiter(this, void 0, void 0, function () {
        var packageName, prompt_1, response, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    packageName = payload.packageName;
                    if (!packageName) {
                        return [2 /*return*/, res.status(400).json({ message: 'packageName is required.' })];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    prompt_1 = "Anda adalah seorang copywriter marketing untuk \"Studio 8\", sebuah studio foto modern. Buat deskripsi yang menarik, singkat (2-3 kalimat), dan persuasif untuk paket foto bernama \"".concat(packageName, "\". Deskripsi harus menonjolkan manfaat utama dan target audiensnya (misalnya, untuk wisuda, keluarga, atau pasangan). Gunakan bahasa yang menjual dan ajakan untuk bertindak (call-to-action) yang halus. Berikan hanya teks deskripsinya saja, tanpa judul atau embel-embel lain.");
                    return [4 /*yield*/, ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: prompt_1,
                        })];
                case 2:
                    response = _a.sent();
                    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                    return [2 /*return*/, res.status(200).send(response.text)];
                case 3:
                    error_4 = _a.sent();
                    console.error("Error generating package description:", error_4);
                    throw new Error("Gagal terhubung dengan layanan AI untuk membuat deskripsi paket.");
                case 4: return [2 /*return*/];
            }
        });
    });
}
function handleGenerateSocialMediaCaption(ai, payload, res) {
    return __awaiter(this, void 0, void 0, function () {
        var asset, response, prompt_2, schema, result, e_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    asset = payload.asset;
                    if (!asset) {
                        return [2 /*return*/, res.status(400).json({ message: 'asset object is required.' })];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    prompt_2 = "\n            Anda adalah seorang social media manager yang kreatif untuk \"Studio 8\", sebuah studio foto modern.\n            Tugas Anda adalah membuat 3 pilihan caption Instagram yang menarik berdasarkan detail aset berikut.\n\n            Detail Aset:\n            - Tipe File: ".concat(asset.fileType, "\n            - Kategori: ").concat(asset.category, "\n            - Tags: ").concat(asset.tags.join(', '), "\n            - Nama File (mungkin berisi petunjuk): ").concat(asset.fileName, "\n\n            Buat 3 variasi caption:\n            1.  **Caption 1 (Informatif & Profesional):** Jelaskan layanan atau momen yang mungkin terkait dengan aset ini.\n            2.  **Caption 2 (Santai & Mengajak Interaksi):** Gunakan bahasa yang lebih kasual, ajukan pertanyaan kepada audiens.\n            3.  **Caption 3 (Singkat & Penuh Emoji):** Caption pendek yang eye-catching dengan banyak emoji relevan.\n\n            Sertakan juga beberapa hashtag yang relevan di akhir setiap caption, seperti #studiofoto #selfphotostudio #fotobanjar #studio8banjar.\n            \n            Format output HARUS berupa JSON dengan skema berikut:\n        ");
                    schema = {
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
                    return [4 /*yield*/, ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: prompt_2,
                            config: {
                                responseMimeType: 'application/json',
                                responseSchema: schema,
                            }
                        })];
                case 2:
                    response = _a.sent();
                    result = JSON.parse(response.text);
                    return [2 /*return*/, res.status(200).json(result)];
                case 3:
                    e_3 = _a.sent();
                    if (e_3 instanceof SyntaxError) {
                        console.error("Failed to parse JSON from AI for social media caption:", response.text);
                        throw new SyntaxError("AI returned a malformed JSON response for social media captions.");
                    }
                    console.error("Error generating social media caption:", e_3);
                    throw new Error("Gagal terhubung dengan layanan AI untuk membuat caption.");
                case 4: return [2 /*return*/];
            }
        });
    });
}
function handleGenerateMouContent(ai, payload, res) {
    return __awaiter(this, void 0, void 0, function () {
        var sponsorshipData, prompt_3, response, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sponsorshipData = payload.sponsorshipData;
                    if (!sponsorshipData) {
                        return [2 /*return*/, res.status(400).json({ message: 'sponsorshipData is required.' })];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    prompt_3 = "\n            Anda adalah asisten legal yang ahli dalam membuat draf dokumen kerjasama.\n            Buat draf Memorandum of Understanding (MoU) untuk kerjasama sponsorship antara \"Studio 8\" dan pihak kedua.\n\n            Gunakan format Markdown. Draf harus mencakup bagian-bagian berikut:\n            1. Judul: \"MEMORANDUM OF UNDERSTANDING (MoU) KERJASAMA SPONSORSHIP\"\n            2. Para Pihak:\n               - PIHAK PERTAMA: Studio 8.\n               - PIHAK KEDUA: ".concat(sponsorshipData.institutionName, ".\n            3. Latar Belakang: Jelaskan secara singkat tujuan kerjasama ini terkait acara \"").concat(sponsorshipData.eventName, "\".\n            4. Objek Kerjasama: Jelaskan bentuk kerjasama yang diajukan, yaitu \"").concat(sponsorshipData.partnershipType, "\".\n            5. Hak dan Kewajiban:\n               - Jabarkan kewajiban PIHAK PERTAMA (Studio 8) berdasarkan benefit yang ditawarkan.\n               - Jabarkan kewajiban PIHAK KEDUA (").concat(sponsorshipData.institutionName, ").\n            6. Benefit yang Ditawarkan PIHAK KEDUA untuk Studio 8:\n               - \"").concat(sponsorshipData.benefits, "\"\n            7. Jangka Waktu: Sebutkan bahwa jangka waktu kerjasama akan dibahas lebih lanjut.\n            8. Penutup: Kalimat penutup standar untuk MoU.\n            9. Tanda Tangan: Sediakan placeholder untuk tanda tangan kedua belah pihak, termasuk nama PIC dari PIHAK KEDUA (").concat(sponsorshipData.picName, ").\n\n            Buatlah draf ini dengan bahasa yang formal dan profesional.\n        ");
                    return [4 /*yield*/, ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: prompt_3,
                        })];
                case 2:
                    response = _a.sent();
                    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                    return [2 /*return*/, res.status(200).send(response.text)];
                case 3:
                    error_5 = _a.sent();
                    console.error("Error generating MoU content:", error_5);
                    throw new Error("Gagal terhubung dengan layanan AI untuk membuat draf MoU.");
                case 4: return [2 /*return*/];
            }
        });
    });
}
function handleGenerateInternReportContent(ai, payload, res) {
    return __awaiter(this, void 0, void 0, function () {
        var internName, period, attendanceSummary, tasksSummary, reportsSummary, prompt_4, response, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    internName = payload.internName, period = payload.period, attendanceSummary = payload.attendanceSummary, tasksSummary = payload.tasksSummary, reportsSummary = payload.reportsSummary;
                    if (!internName || !period || !attendanceSummary || !tasksSummary || !reportsSummary) {
                        return [2 /*return*/, res.status(400).json({ message: 'Missing required data for report generation.' })];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    prompt_4 = "\n            Anda adalah seorang mentor di Studio 8. Buat draf Laporan Perkembangan Peserta Praktik Kerja Lapangan (PKL) berdasarkan data berikut.\n            Gunakan format Markdown dengan bahasa yang formal dan terstruktur.\n\n            **Data Peserta:**\n            - Nama Lengkap: ".concat(internName, "\n            - Periode PKL: ").concat(period, "\n\n            **Rangkuman Kinerja:**\n            - Kehadiran: ").concat(attendanceSummary, "\n            - Tugas yang diselesaikan: ").concat(tasksSummary, "\n            - Rangkuman Laporan Harian: ").concat(reportsSummary, "\n\n            **Struktur Laporan:**\n            1.  **PENDAHULUAN:** Paragraf singkat yang menyatakan tujuan laporan ini.\n            2.  **EVALUASI KINERJA:**\n                -   **A. Kehadiran (Disiplin):** Berikan ulasan singkat berdasarkan data kehadiran.\n                -   **B. Pelaksanaan Tugas (Kompetensi):** Berikan ulasan berdasarkan rangkuman tugas.\n                -   **C. Laporan Harian (Inisiatif & Komunikasi):** Berikan ulasan berdasarkan rangkuman laporan harian.\n            3.  **CATATAN DAN REKOMENDASI:** Berikan satu paragraf berisi catatan umum dan rekomendasi untuk peserta di masa mendatang.\n            4.  **PENUTUP:** Paragraf penutup formal.\n        ");
                    return [4 /*yield*/, ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: prompt_4,
                        })];
                case 2:
                    response = _a.sent();
                    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                    return [2 /*return*/, res.status(200).send(response.text)];
                case 3:
                    error_6 = _a.sent();
                    console.error("Error generating intern report content:", error_6);
                    throw new Error("Gagal terhubung dengan layanan AI untuk membuat laporan.");
                case 4: return [2 /*return*/];
            }
        });
    });
}
function handleRecommendPackage(ai, payload, res) {
    return __awaiter(this, void 0, void 0, function () {
        var userQuery, packages, response, packageListString, prompt_5, schema, result, e_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userQuery = payload.userQuery, packages = payload.packages;
                    if (!userQuery || !packages) {
                        return [2 /*return*/, res.status(400).json({ message: 'userQuery and packages are required.' })];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    packageListString = packages.map(function (p) {
                        return "- Nama Paket: \"".concat(p.name, "\", Deskripsi: \"").concat(p.description, "\", Harga: ").concat(p.subPackages.map(function (sp) { return "Rp ".concat(sp.price); }).join(' / '));
                    }).join('\n');
                    prompt_5 = "\n            Anda adalah asisten penjualan yang cerdas dan ramah untuk Studio 8. Tugas Anda adalah merekomendasikan paket foto terbaik berdasarkan kebutuhan pelanggan.\n\n            Berikut adalah daftar paket yang tersedia:\n            ".concat(packageListString, "\n\n            Kebutuhan pelanggan: \"").concat(userQuery, "\"\n\n            Tugas:\n            1. Analisis kebutuhan pelanggan.\n            2. Pilih SATU paket yang paling sesuai dari daftar di atas. Nama paket harus persis sama.\n            3. Berikan alasan singkat (1-2 kalimat) mengapa paket tersebut direkomendasikan, dalam Bahasa Indonesia yang ramah.\n\n            Format output Anda HARUS berupa JSON dengan skema berikut:\n        ");
                    schema = {
                        type: Type.OBJECT,
                        properties: {
                            recommendedPackageName: { type: Type.STRING, description: "Nama paket yang direkomendasikan (harus sama persis)." },
                            reasoning: { type: Type.STRING, description: "Alasan singkat mengapa paket ini cocok." }
                        },
                        required: ["recommendedPackageName", "reasoning"]
                    };
                    return [4 /*yield*/, ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: prompt_5,
                            config: {
                                responseMimeType: 'application/json',
                                responseSchema: schema,
                            }
                        })];
                case 2:
                    response = _a.sent();
                    result = JSON.parse(response.text);
                    return [2 /*return*/, res.status(200).json(result)];
                case 3:
                    e_4 = _a.sent();
                    if (e_4 instanceof SyntaxError) {
                        console.error("Failed to parse JSON from AI for package recommendation:", response.text);
                        throw new SyntaxError("AI returned a malformed JSON response for package recommendation.");
                    }
                    console.error("Error recommending package:", e_4);
                    throw new Error("Gagal terhubung dengan layanan AI untuk rekomendasi paket.");
                case 4: return [2 /*return*/];
            }
        });
    });
}
function handleGenerateClassDescription(ai, payload, res) {
    return __awaiter(this, void 0, void 0, function () {
        var topic, prompt_6, response, error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    topic = payload.topic;
                    if (!topic) {
                        return [2 /*return*/, res.status(400).json({ message: 'Topic is required.' })];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    prompt_6 = "Anda adalah seorang instruktur ahli di Studio 8. Buat deskripsi singkat (2-3 kalimat) yang menarik dan informatif untuk kelas praktek mingguan dengan topik \"".concat(topic, "\". Jelaskan secara singkat apa yang akan dipelajari peserta dan manfaatnya. Gunakan bahasa yang santai dan memotivasi.");
                    return [4 /*yield*/, ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: prompt_6,
                        })];
                case 2:
                    response = _a.sent();
                    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                    return [2 /*return*/, res.status(200).send(response.text)];
                case 3:
                    error_7 = _a.sent();
                    console.error("Error generating class description:", error_7);
                    throw new Error("Gagal terhubung dengan layanan AI untuk membuat deskripsi kelas.");
                case 4: return [2 /*return*/];
            }
        });
    });
}
function handleAnalyzeFeedback(ai, payload, res) {
    return __awaiter(this, void 0, void 0, function () {
        var feedbackText, response, schema, result, e_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    feedbackText = payload.feedbackText;
                    if (!feedbackText) {
                        return [2 /*return*/, res.status(400).json({ message: 'feedbackText is required.' })];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    schema = {
                        type: Type.OBJECT,
                        properties: {
                            overallSentiment: { type: Type.STRING },
                            positivePoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                            areasForImprovement: { type: Type.ARRAY, items: { type: Type.STRING } },
                            actionableSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                        },
                        required: ["overallSentiment", "positivePoints", "areasForImprovement", "actionableSuggestions"]
                    };
                    return [4 /*yield*/, ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: "Analisis kumpulan feedback pelanggan untuk studio foto bernama \"Studio 8\" berikut ini.\nFeedback:\n".concat(feedbackText, "\n\nBerikan analisis terstruktur dalam format JSON. Analisis harus mencakup:\n1. 'overallSentiment': Satu kalimat ringkas tentang sentimen umum dalam Bahasa Indonesia (misal: \"Sangat Positif\", \"Cukup Baik dengan beberapa masukan\", \"Negatif\").\n2. 'positivePoints': Array string berisi poin-poin positif utama yang sering disebut pelanggan.\n3. 'areasForImprovement': Array string berisi kritik atau area utama untuk perbaikan.\n4. 'actionableSuggestions': Array string berisi 2-3 saran konkret yang bisa ditindaklanjuti oleh pemilik studio.\n\nSeluruh respons harus dalam Bahasa Indonesia."),
                            config: { responseMimeType: 'application/json', responseSchema: schema }
                        })];
                case 2:
                    response = _a.sent();
                    result = JSON.parse(response.text);
                    return [2 /*return*/, res.status(200).json(result)];
                case 3:
                    e_5 = _a.sent();
                    if (e_5 instanceof SyntaxError) {
                        console.error("Failed to parse JSON from AI for feedback analysis:", response.text);
                        throw new SyntaxError("AI returned a malformed JSON response for feedback analysis.");
                    }
                    console.error("Error analyzing feedback:", e_5);
                    throw new Error("Gagal terhubung dengan layanan AI untuk menganalisis feedback.");
                case 4: return [2 /*return*/];
            }
        });
    });
}
function handleGenerateForecast(ai, payload, res) {
    return __awaiter(this, void 0, void 0, function () {
        var historicalDataString, response, schema, result, e_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    historicalDataString = payload.historicalDataString;
                    if (!historicalDataString) {
                        return [2 /*return*/, res.status(400).json({ message: 'historicalDataString is required.' })];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    schema = {
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
                    return [4 /*yield*/, ai.models.generateContent({
                            model: 'gemini-2.5-pro',
                            contents: "Anda adalah seorang analis keuangan ahli untuk sebuah studio foto bernama Studio 8.\nBerdasarkan data pendapatan historis berikut, berikan analisis dan peramalan keuangan.\nData historis (hingga 6 bulan terakhir):\n".concat(historicalDataString, "\n\nTugas Anda:\n1.  predictedRevenue: Prediksi pendapatan untuk bulan berikutnya dalam bentuk angka (integer, tanpa format Rupiah atau desimal).\n2.  budgetRecommendation: Berikan rekomendasi alokasi anggaran berdasarkan pendapatan yang diprediksi. Alokasikan ke dalam kategori berikut: 'marketing', 'equipment', 'maintenance', 'savings', 'operation'. Total alokasi harus sama dengan predictedRevenue. Kembalikan dalam bentuk objek dengan nilai numerik (integer).\n3.  aiAlert: Berikan satu insight atau peringatan singkat (maksimal 2 kalimat, dalam Bahasa Indonesia) berdasarkan tren data historis. Misalnya, jika ada penurunan, sarankan sesuatu. Jika ada kenaikan, berikan dorongan.\n\nBerikan output HANYA dalam format JSON yang valid dan terstruktur sesuai skema."),
                            config: { responseMimeType: 'application/json', responseSchema: schema }
                        })];
                case 2:
                    response = _a.sent();
                    result = JSON.parse(response.text);
                    return [2 /*return*/, res.status(200).json(result)];
                case 3:
                    e_6 = _a.sent();
                    if (e_6 instanceof SyntaxError) {
                        console.error("Failed to parse JSON from AI for forecast:", response.text);
                        throw new SyntaxError("AI returned a malformed JSON response for forecast.");
                    }
                    console.error("Error generating forecast:", e_6);
                    throw new Error("Gagal terhubung dengan layanan AI untuk membuat prediksi keuangan.");
                case 4: return [2 /*return*/];
            }
        });
    });
}
function handleChat(ai, payload, res) {
    return __awaiter(this, void 0, void 0, function () {
        var history, pageContext, whatsappNumber, instagramUsername, systemInstruction, chat, latestMessage, resultStream, _a, resultStream_1, resultStream_1_1, chunk, e_7_1, error_8;
        var _b, e_7, _c, _d;
        var _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    history = payload.history, pageContext = payload.pageContext;
                    if (!history) {
                        return [2 /*return*/, res.status(400).json({ message: 'History array is required.' })];
                    }
                    whatsappNumber = "+6285724025425";
                    instagramUsername = "studiolapan_";
                    systemInstruction = "\n            Anda adalah Otto, asisten AI ceria dari Studio 8. Persona Anda ramah, proaktif, dan sangat membantu. Gunakan Bahasa Indonesia yang santai, modern, dan penuh emoji. \u2728\n            Tujuan utama Anda adalah menjawab pertanyaan umum dan membantu pengguna merasa nyaman untuk melakukan booking.\n\n            --- BASIS PENGETAHUAN ANDA (SUMBER KEBENARAN) ---\n            - WhatsApp Admin: ".concat(whatsappNumber, "\n            - Instagram: @").concat(instagramUsername, "\n            - Cara Booking: Pelanggan bisa klik tombol \"Booking Sekarang\" atau \"Lihat Paket\" di website.\n            - Uang Muka (DP): Untuk beberapa paket, ada DP Rp 35.000 untuk kunci jadwal. Sisanya dibayar di studio.\n            - Metode Pembayaran: QRIS, Transfer Bank (BNI & BRI), Dana, dan Shopeepay.\n            - Pindah Jadwal (Reschedule): Bisa, maksimal H-7 sebelum jadwal sesi melalui halaman 'Cek Status'.\n            - Pembatalan: DP kembali 100% jika dibatalkan H-1 (lebih dari 24 jam). Kurang dari 24 jam, DP hangus.\n            - Hasil Foto: Pelanggan dapat semua file digital (soft file). Beberapa paket dapat bonus editan.\n            - Lokasi: Depan SMK 4 Banjar, Sukamukti, Pataruman, Kota Banjar.\n\n            --- ATURAN PERCAKAPAN WAJIB ---\n            1.  **SINGKAT & JELAS:** Jawaban Anda HARUS singkat (maksimal 3-4 kalimat). Gunakan poin jika perlu.\n            2.  **JANGAN MENGARANG:** Jika pertanyaan di luar \"BASIS PENGETAHUAN ANDA\" (misal: promo spesifik, ketersediaan jadwal real-time, harga detail yang tidak ada), JANGAN PERNAH menebak. Langsung alihkan pengguna ke admin dengan ramah. Contoh: \"Wah, untuk info promo paling update, paling pas langsung tanya admin di WhatsApp ya! Biar infonya akurat. \uD83D\uDE09\" atau \"Untuk cek jadwal yang kosong, kamu bisa langsung klik tombol 'Booking Sekarang' di website, lho!\"\n            3.  **JADILAH PROAKTIF:** Jika pengguna bertanya tentang sesuatu, coba berikan langkah selanjutnya. Contoh: Jika bertanya lokasi, berikan alamat dan tambahkan \"Kami tunggu kedatanganmu ya!\". Jika bertanya cara booking, jelaskan singkat dan arahkan untuk klik tombol booking.\n            4.  **SELALU RAMAH:** Gunakan sapaan seperti \"kak\", \"kamu\", dan akhiri jawaban dengan positif.\n        ");
                    if (pageContext) {
                        systemInstruction += "\n            --- KONTEKS HALAMAN SAAT INI ---\n            ".concat(pageContext, "\n\n            **ATURAN TAMBAHAN:** Jika pertanyaan pengguna berkaitan dengan konteks di atas, prioritaskan informasi tersebut dalam jawabanmu untuk memberikan respons yang paling relevan.\n            ");
                    }
                    _g.label = 1;
                case 1:
                    _g.trys.push([1, 15, , 16]);
                    chat = ai.chats.create({
                        model: 'gemini-2.5-flash',
                        history: history.slice(0, -1),
                        config: { systemInstruction: systemInstruction }
                    });
                    latestMessage = ((_f = (_e = history[history.length - 1]) === null || _e === void 0 ? void 0 : _e.parts[0]) === null || _f === void 0 ? void 0 : _f.text) || '';
                    return [4 /*yield*/, chat.sendMessageStream({ message: latestMessage })];
                case 2:
                    resultStream = _g.sent();
                    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                    _g.label = 3;
                case 3:
                    _g.trys.push([3, 8, 9, 14]);
                    _a = true, resultStream_1 = __asyncValues(resultStream);
                    _g.label = 4;
                case 4: return [4 /*yield*/, resultStream_1.next()];
                case 5:
                    if (!(resultStream_1_1 = _g.sent(), _b = resultStream_1_1.done, !_b)) return [3 /*break*/, 7];
                    _d = resultStream_1_1.value;
                    _a = false;
                    chunk = _d;
                    res.write(chunk.text);
                    _g.label = 6;
                case 6:
                    _a = true;
                    return [3 /*break*/, 4];
                case 7: return [3 /*break*/, 14];
                case 8:
                    e_7_1 = _g.sent();
                    e_7 = { error: e_7_1 };
                    return [3 /*break*/, 14];
                case 9:
                    _g.trys.push([9, , 12, 13]);
                    if (!(!_a && !_b && (_c = resultStream_1.return))) return [3 /*break*/, 11];
                    return [4 /*yield*/, _c.call(resultStream_1)];
                case 10:
                    _g.sent();
                    _g.label = 11;
                case 11: return [3 /*break*/, 13];
                case 12:
                    if (e_7) throw e_7.error;
                    return [7 /*endfinally*/];
                case 13: return [7 /*endfinally*/];
                case 14:
                    res.end();
                    return [3 /*break*/, 16];
                case 15:
                    error_8 = _g.sent();
                    console.error("Error handling chat stream:", error_8);
                    res.end();
                    return [3 /*break*/, 16];
                case 16: return [2 /*return*/];
            }
        });
    });
}
function handleAnalyzeInternReport(ai, payload, res) {
    return __awaiter(this, void 0, void 0, function () {
        var userId, reportContent, db, response, schema, result, insightData, aiError_1, defaultInsight;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userId = payload.userId, reportContent = payload.reportContent;
                    if (!userId || !reportContent) {
                        return [2 /*return*/, res.status(400).json({ message: 'userId and reportContent are required.' })];
                    }
                    db = admin.firestore();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 6]);
                    schema = {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING, enum: ['produktif', 'santai', 'tidak fokus'] },
                            insight: { type: Type.STRING }
                        },
                        required: ['type', 'insight']
                    };
                    return [4 /*yield*/, ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: "Analisis laporan harian ini: \"".concat(reportContent, "\". Kategorikan sebagai: produktif / santai / tidak fokus. Berikan satu kalimat motivasi singkat dalam Bahasa Indonesia yang relevan dan positif."),
                            config: { responseMimeType: 'application/json', responseSchema: schema }
                        })];
                case 2:
                    response = _a.sent();
                    result = JSON.parse(response.text);
                    insightData = __assign(__assign({}, result), { date: admin.firestore.FieldValue.serverTimestamp() });
                    return [4 /*yield*/, db.collection('users').doc(userId).collection('aiInsights').add(insightData)];
                case 3:
                    _a.sent();
                    return [2 /*return*/, res.status(200).json({ success: true, insight: insightData })];
                case 4:
                    aiError_1 = _a.sent();
                    console.error("AI analysis failed during handleAnalyzeInternReport:", aiError_1);
                    if (aiError_1 instanceof SyntaxError) {
                        console.error("Malformed JSON from AI in handleAnalyzeInternReport:", response === null || response === void 0 ? void 0 : response.text);
                    }
                    defaultInsight = { type: 'default', insight: 'Tetap semangat hari ini 💪', date: admin.firestore.FieldValue.serverTimestamp() };
                    return [4 /*yield*/, db.collection('users').doc(userId).collection('aiInsights').add(defaultInsight)
                            .catch(function (dbError) { return console.error("Failed to save default insight:", dbError); })];
                case 5:
                    _a.sent();
                    // Still return success to the client, but with a note about the AI failure.
                    return [2 /*return*/, res.status(200).json({ success: true, insight: defaultInsight, note: 'AI analysis failed, used default.' })];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function handleGenerateAiFeedback(ai, payload, res) {
    return __awaiter(this, void 0, void 0, function () {
        var reportId, reportContent, db, response, feedbackText, reportRef, updatedDoc, updatedData, error_9;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    reportId = payload.reportId, reportContent = payload.reportContent;
                    if (!reportId || !reportContent) {
                        return [2 /*return*/, res.status(400).json({ message: 'reportId and reportContent are required.' })];
                    }
                    db = admin.firestore();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    return [4 /*yield*/, ai.models.generateContent({
                            model: 'gemini-2.5-pro',
                            contents: "Anda adalah seorang mentor ahli di sebuah studio kreatif bernama Studio 8. Berdasarkan laporan harian dari seorang anak magang ini, berikan masukan yang singkat, membangun, dan memberi semangat dalam Bahasa Indonesia (maksimal 2 kalimat).\n\nLaporan Magang: \"".concat(reportContent, "\"\n\nContoh feedback yang baik:\n- \"Kerja bagus hari ini! Terus eksplorasi teknik editing video, ya. Semangat!\"\n- \"Progres yang solid! Jangan ragu bertanya jika menemukan kesulitan saat setup lighting.\"\n\nFeedback Anda:"),
                        })];
                case 2:
                    response = _a.sent();
                    feedbackText = response.text;
                    reportRef = db.collection('daily_reports').doc(reportId);
                    return [4 /*yield*/, reportRef.update({ mentorFeedback: feedbackText })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, reportRef.get()];
                case 4:
                    updatedDoc = _a.sent();
                    updatedData = __assign({ id: updatedDoc.id }, updatedDoc.data());
                    if (updatedData.submittedAt && updatedData.submittedAt.toDate) {
                        updatedData.submittedAt = updatedData.submittedAt.toDate().toISOString();
                    }
                    return [2 /*return*/, res.status(200).json(updatedData)];
                case 5:
                    error_9 = _a.sent();
                    console.error("Error generating AI feedback:", error_9);
                    throw new Error("Gagal terhubung dengan layanan AI untuk membuat feedback.");
                case 6: return [2 /*return*/];
            }
        });
    });
}
function handleGenerateQuizExplanation(ai, payload, res) {
    return __awaiter(this, void 0, void 0, function () {
        var questionText, options, correctAnswerIndex, userAnswerIndex, userAnswerText, correctAnswerText, response, explanation, error_10;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    questionText = payload.questionText, options = payload.options, correctAnswerIndex = payload.correctAnswerIndex, userAnswerIndex = payload.userAnswerIndex;
                    if (!questionText || !options || correctAnswerIndex == null || userAnswerIndex == null) {
                        return [2 /*return*/, res.status(400).json({ message: 'Missing required fields.' })];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    userAnswerText = options[userAnswerIndex];
                    correctAnswerText = options[correctAnswerIndex];
                    return [4 /*yield*/, ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: "Anda adalah seorang mentor ahli di bidang fotografi, videografi, dan marketing. Seorang siswa baru saja menjawab kuis dan salah memilih jawaban. Tugas Anda adalah memberikan penjelasan yang singkat, jelas, dan mudah dipahami dalam Bahasa Indonesia.\n\nPertanyaan: \"".concat(questionText, "\"\nJawaban siswa (Salah): \"").concat(userAnswerText, "\"\nJawaban yang benar: \"").concat(correctAnswerText, "\"\n\nJelaskan mengapa jawaban siswa salah dan mengapa jawaban yang benar itu tepat. Buat penjelasan ringkas, sekitar 2-3 kalimat. Langsung ke pokok permasalahan."),
                        })];
                case 2:
                    response = _a.sent();
                    explanation = response.text;
                    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                    return [2 /*return*/, res.status(200).send(explanation)];
                case 3:
                    error_10 = _a.sent();
                    console.error("Error generating quiz explanation:", error_10);
                    throw new Error("Gagal terhubung dengan layanan AI untuk membuat penjelasan.");
                case 4: return [2 /*return*/];
            }
        });
    });
}
function handleGenerateQuizQuestions(ai, payload, res) {
    return __awaiter(this, void 0, void 0, function () {
        var topic, numQuestions, category, response, questionSchema, schema, questions, e_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    topic = payload.topic, numQuestions = payload.numQuestions, category = payload.category;
                    if (!topic || !numQuestions || !category) {
                        return [2 /*return*/, res.status(400).json({ message: 'Topic, numQuestions, and category are required.' })];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    questionSchema = {
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
                    schema = { type: Type.ARRAY, items: questionSchema };
                    return [4 /*yield*/, ai.models.generateContent({
                            model: 'gemini-2.5-pro',
                            contents: "Buat ".concat(numQuestions, " soal kuis pilihan ganda (4 pilihan) tentang \"").concat(topic, "\" dengan kategori \"").concat(category, "\". Pastikan ada satu jawaban yang benar. Berikan penjelasan singkat untuk setiap jawaban yang benar. Untuk setiap pertanyaan, berikan juga \"imagePrompt\", yaitu deskripsi singkat dalam Bahasa Indonesia untuk membuat gambar yang relevan secara visual dengan pertanyaan tersebut. Jika tidak ada gambar yang relevan, berikan string kosong untuk imagePrompt.\n\nFormat output harus berupa array JSON dari objek, sesuai dengan skema berikut."),
                            config: { responseMimeType: 'application/json', responseSchema: schema }
                        })];
                case 2:
                    response = _a.sent();
                    questions = JSON.parse(response.text);
                    return [2 /*return*/, res.status(200).json(questions)];
                case 3:
                    e_8 = _a.sent();
                    if (e_8 instanceof SyntaxError) {
                        console.error("Failed to parse JSON from AI for quiz questions:", response.text);
                        throw new SyntaxError("AI returned a malformed JSON response for quiz questions.");
                    }
                    console.error("Error generating quiz questions:", e_8);
                    throw new Error("Gagal terhubung dengan layanan AI untuk membuat kuis.");
                case 4: return [2 /*return*/];
            }
        });
    });
}
function handleAnalyzeQuizResult(ai, payload, res) {
    return __awaiter(this, void 0, void 0, function () {
        var resultId, db, resultDoc, resultData_1, incorrectAnswers, feedback, getOptionText_1, promptContext, response, feedbackText, error_11;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    resultId = payload.resultId;
                    if (!resultId) {
                        return [2 /*return*/, res.status(400).json({ message: 'resultId is required.' })];
                    }
                    db = admin.firestore();
                    return [4 /*yield*/, db.collection('quiz_results').doc(resultId).get()];
                case 1:
                    resultDoc = _a.sent();
                    if (!resultDoc.exists) {
                        return [2 /*return*/, res.status(404).json({ message: 'Quiz result not found.' })];
                    }
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 7, , 8]);
                    resultData_1 = resultDoc.data();
                    incorrectAnswers = resultData_1.answers.filter(function (a) { return !a.isCorrect; });
                    if (!(incorrectAnswers.length === 0)) return [3 /*break*/, 4];
                    feedback = "Kerja bagus! Semua jawabanmu benar. Pertahankan!";
                    return [4 /*yield*/, db.collection('quiz_results').doc(resultId).update({ aiFeedback: feedback })];
                case 3:
                    _a.sent();
                    return [2 /*return*/, res.status(200).json({ feedback: feedback })];
                case 4:
                    getOptionText_1 = function (questionId, optionIndex) {
                        var _a;
                        var question = (_a = resultData_1.quiz) === null || _a === void 0 ? void 0 : _a.questions.find(function (q) { return q.id === questionId; });
                        return (question === null || question === void 0 ? void 0 : question.options[optionIndex]) || 'N/A';
                    };
                    promptContext = incorrectAnswers.map(function (ans) { return "- Pertanyaan: \"".concat(ans.questionText, "\", Jawaban Salah: \"").concat(getOptionText_1(ans.questionId, ans.selectedAnswerIndex), "\", Jawaban Benar: \"").concat(getOptionText_1(ans.questionId, ans.correctAnswerIndex), "\""); }).join('\n');
                    return [4 /*yield*/, ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: "Anda adalah mentor yang suportif. Seorang siswa baru saja menyelesaikan kuis dan membuat beberapa kesalahan.\nBerikut adalah daftar kesalahan mereka:\n".concat(promptContext, "\n\nBerdasarkan kesalahan-kesalahan ini, berikan analisis singkat dan 2-3 saran konkret untuk perbaikan. Buatlah dalam format paragraf yang bersahabat dan memotivasi, dalam Bahasa Indonesia."),
                        })];
                case 5:
                    response = _a.sent();
                    feedbackText = response.text;
                    return [4 /*yield*/, db.collection('quiz_results').doc(resultId).update({ aiFeedback: feedbackText })];
                case 6:
                    _a.sent();
                    return [2 /*return*/, res.status(200).json({ feedback: feedbackText })];
                case 7:
                    error_11 = _a.sent();
                    console.error("Error analyzing quiz result:", error_11);
                    throw new Error("Gagal terhubung dengan layanan AI untuk menganalisis hasil kuis.");
                case 8: return [2 /*return*/];
            }
        });
    });
}
function handleGenerateMarketingInsight(ai, payload, res) {
    return __awaiter(this, void 0, void 0, function () {
        var packagePopularity, dailyRevenue, recentActivity, activitySummary, dataSummary, response, insightText, error_12;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    packagePopularity = payload.packagePopularity, dailyRevenue = payload.dailyRevenue, recentActivity = payload.recentActivity;
                    if (!packagePopularity || !dailyRevenue) {
                        return [2 /*return*/, res.status(400).json({ message: 'packagePopularity and dailyRevenue are required.' })];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    activitySummary = recentActivity.map(function (log) { return "- ".concat(log.userName, " ").concat(log.action.toLowerCase()); }).join('\n');
                    dataSummary = "\n    - Popularitas Paket: ".concat(packagePopularity.map(function (p) { return "".concat(p.name, " (").concat(p.value, " booking)"); }).join(', '), ".\n    - Tren Pemasukan Harian (7 hari terakhir): ").concat(dailyRevenue.map(function (d) { return "".concat(d.name, ": Rp ").concat(d.Pemasukan.toLocaleString('id-ID')); }).join(', '), ".\n    - Aktivitas Tim Terbaru:\n    ").concat(activitySummary, "\n        ");
                    return [4 /*yield*/, ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: "\n                Anda adalah seorang konsultan marketing ahli untuk \"Studio 8\", sebuah studio foto modern.\n                Berdasarkan ringkasan data performa dan aktivitas tim berikut, berikan 2-3 insight atau saran marketing yang singkat, konkret, dan actionable dalam Bahasa Indonesia.\n                Fokus pada cara meningkatkan booking atau mempromosikan paket yang populer. Hubungkan saran Anda dengan aktivitas tim jika memungkinkan. Gunakan format poin (bullet points).\n\n                Data Performa & Aktivitas:\n                ".concat(dataSummary, "\n\n                Contoh output:\n                - Tim baru saja mengonfirmasi banyak booking. Ini saat yang tepat untuk membuat konten \"behind the scenes\" di Instagram untuk menunjukkan kesibukan studio!\n                - Paket \"Wisuda Berdua\" sangat populer! Buat promo kilat \"Ajak Teman Wisuda\" untuk meningkatkan momentum.\n                - Pendapatan cenderung menurun. Mungkin tim bisa fokus menghubungi klien lama untuk menawarkan sesi foto selanjutnya dengan diskon khusus.\n            "),
                        })];
                case 2:
                    response = _a.sent();
                    insightText = response.text;
                    return [2 /*return*/, res.status(200).json({ insight: insightText })];
                case 3:
                    error_12 = _a.sent();
                    console.error("Error generating marketing insight:", error_12);
                    throw new Error("Gagal terhubung dengan layanan AI untuk membuat insight marketing.");
                case 4: return [2 /*return*/];
            }
        });
    });
}

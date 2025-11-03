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
import admin from 'firebase-admin';
import { v2 as cloudinary } from 'cloudinary';
import { initFirebaseAdmin } from './lib/firebase-admin';
export var config = {
    api: {
        bodyParser: {
            sizeLimit: "100mb",
        },
    },
};
// --- Cloudinary Initialization ---
function initializeCloudinary() {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error("Server configuration error: Cloudinary credentials are not set.");
    }
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}
export default function handler(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, studentName, major, period, mentor, pdfBase64, certificateUrl, certificateId, publicId, db, uploadResult, uploadError_1, validationUrl, certificateData, userSnapshot, adminId, logError_1, dbError_1, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (req.method !== 'POST') {
                        return [2 /*return*/, res.status(405).json({ message: 'Method Not Allowed' })];
                    }
                    _a = req.body, studentName = _a.studentName, major = _a.major, period = _a.period, mentor = _a.mentor, pdfBase64 = _a.pdfBase64;
                    if (!studentName || !major || !period || !mentor || !pdfBase64) {
                        return [2 /*return*/, res.status(400).json({ message: 'Missing required fields: studentName, major, period, mentor, and pdfBase64.' })];
                    }
                    certificateId = "CERT-S8-".concat(Math.random().toString(36).substring(2, 9).toUpperCase());
                    publicId = "studio8_certificates/".concat(certificateId);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 16, , 17]);
                    initFirebaseAdmin();
                    initializeCloudinary();
                    db = admin.firestore();
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, cloudinary.uploader.upload(pdfBase64, {
                            folder: "studio8_certificates",
                            public_id: certificateId,
                            resource_type: "auto",
                            upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
                        })];
                case 3:
                    uploadResult = _b.sent();
                    certificateUrl = uploadResult.secure_url;
                    if (!certificateUrl) {
                        throw new Error("Cloudinary upload did not return a secure URL.");
                    }
                    return [3 /*break*/, 5];
                case 4:
                    uploadError_1 = _b.sent();
                    console.error("Cloudinary upload failed for certificate:", uploadError_1);
                    throw new Error("Gagal mengunggah file sertifikat PDF.");
                case 5:
                    _b.trys.push([5, 13, , 15]);
                    validationUrl = "https://studio-8-manager-ec159.web.app/#/validate/".concat(certificateId);
                    certificateData = {
                        id: certificateId,
                        studentName: studentName,
                        major: major,
                        period: period,
                        mentor: mentor,
                        issuedDate: admin.firestore.FieldValue.serverTimestamp(),
                        certificateUrl: certificateUrl,
                        qrValidationUrl: validationUrl,
                        verified: true,
                    };
                    return [4 /*yield*/, db.collection('certificates').doc(certificateId).set(certificateData)];
                case 6:
                    _b.sent();
                    _b.label = 7;
                case 7:
                    _b.trys.push([7, 11, , 12]);
                    return [4 /*yield*/, db.collection('users').where('name', '==', mentor).limit(1).get()];
                case 8:
                    userSnapshot = _b.sent();
                    if (!!userSnapshot.empty) return [3 /*break*/, 10];
                    adminId = userSnapshot.docs[0].id;
                    return [4 /*yield*/, db.collection('activity_logs').add({
                            timestamp: admin.firestore.FieldValue.serverTimestamp(),
                            userId: adminId, userName: mentor,
                            action: 'Membuat Sertifikat',
                            details: "Sertifikat untuk ".concat(studentName)
                        })];
                case 9:
                    _b.sent();
                    _b.label = 10;
                case 10: return [3 /*break*/, 12];
                case 11:
                    logError_1 = _b.sent();
                    console.warn("Failed to log certificate creation activity:", logError_1);
                    return [3 /*break*/, 12];
                case 12: 
                // 4. Return success response
                return [2 /*return*/, res.status(200).json({ success: true, url: certificateUrl, id: certificateId })];
                case 13:
                    dbError_1 = _b.sent();
                    // If Firestore write fails, delete the orphaned Cloudinary file
                    console.warn("Firestore write failed for certificate ".concat(certificateId, ". Deleting orphaned file."));
                    return [4 /*yield*/, cloudinary.uploader.destroy(publicId, { resource_type: 'raw' })
                            .catch(function (delErr) { return console.error("CRITICAL: Failed to delete orphaned certificate file ".concat(publicId), delErr); })];
                case 14:
                    _b.sent();
                    throw new Error("Gagal menyimpan data sertifikat ke database: ".concat(dbError_1.message));
                case 15: return [3 /*break*/, 17];
                case 16:
                    error_1 = _b.sent();
                    console.error('API Error in generateCertificate handler:', error_1);
                    return [2 /*return*/, res.status(500).json({ message: error_1.message || 'Terjadi kesalahan pada server.' })];
                case 17: return [2 /*return*/];
            }
        });
    });
}

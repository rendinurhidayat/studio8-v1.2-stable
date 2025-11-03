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
import { v2 as cloudinary } from 'cloudinary';
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
function handleUpload(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, imageBase64, folder, publicId, uploadResult, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = req.body, imageBase64 = _a.imageBase64, folder = _a.folder, publicId = _a.publicId;
                    if (!imageBase64 || !folder) {
                        return [2 /*return*/, res.status(400).json({ message: 'imageBase64 and folder are required.' })];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, cloudinary.uploader.upload(imageBase64, {
                            folder: folder,
                            public_id: publicId,
                            resource_type: "auto",
                            overwrite: true,
                            upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
                        })];
                case 2:
                    uploadResult = _b.sent();
                    if (!(uploadResult === null || uploadResult === void 0 ? void 0 : uploadResult.secure_url)) {
                        console.error("Cloudinary upload failed to return a secure URL", uploadResult);
                        throw new Error("Upload berhasil, namun gagal mendapatkan URL yang valid dari Cloudinary.");
                    }
                    return [2 /*return*/, res.status(200).json({ secure_url: uploadResult.secure_url, public_id: uploadResult.public_id })];
                case 3:
                    error_1 = _b.sent();
                    console.error("Error during Cloudinary upload:", error_1);
                    throw new Error("Gagal mengunggah file ke server. Mohon coba lagi.");
                case 4: return [2 /*return*/];
            }
        });
    });
}
function handleDelete(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var publicId, result, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    publicId = req.body.publicId;
                    if (!publicId) {
                        return [2 /*return*/, res.status(400).json({ message: 'publicId is required.' })];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, cloudinary.uploader.destroy(publicId, {
                            invalidate: true
                        })];
                case 2:
                    result = _a.sent();
                    if (result.result !== 'ok' && result.result !== 'not found') {
                        console.warn("Cloudinary did not return \"ok\" on deletion for publicId ".concat(publicId, ":"), result);
                    }
                    return [2 /*return*/, res.status(200).json({ success: true, message: "Permintaan penghapusan aset ".concat(publicId, " telah diproses.") })];
                case 3:
                    error_2 = _a.sent();
                    console.error("Error deleting asset with publicId ".concat(publicId, ":"), error_2);
                    throw new Error("Gagal menghapus aset dari server.");
                case 4: return [2 /*return*/];
            }
        });
    });
}
// --- Main Dispatcher ---
export default function handler(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, action, payload, _b, error_3;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (req.method !== 'POST') {
                        return [2 /*return*/, res.status(405).json({ message: 'Method Not Allowed' })];
                    }
                    _a = req.body, action = _a.action, payload = __rest(_a, ["action"]);
                    if (!action) {
                        return [2 /*return*/, res.status(400).json({ message: "Action is required for asset management." })];
                    }
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 8, , 9]);
                    initializeCloudinary();
                    req.body = payload;
                    _b = action;
                    switch (_b) {
                        case 'upload': return [3 /*break*/, 2];
                        case 'delete': return [3 /*break*/, 4];
                    }
                    return [3 /*break*/, 6];
                case 2: return [4 /*yield*/, handleUpload(req, res)];
                case 3: return [2 /*return*/, _c.sent()];
                case 4: return [4 /*yield*/, handleDelete(req, res)];
                case 5: return [2 /*return*/, _c.sent()];
                case 6: return [2 /*return*/, res.status(400).json({ message: "Unknown asset action: ".concat(action) })];
                case 7: return [3 /*break*/, 9];
                case 8:
                    error_3 = _c.sent();
                    console.error("API Error in assets handler (action: ".concat(action, "):"), error_3);
                    return [2 /*return*/, res.status(500).json({
                            message: error_3.message || 'Terjadi kesalahan pada server saat mengelola aset.',
                            error: error_3.message,
                        })];
                case 9: return [2 /*return*/];
            }
        });
    });
}

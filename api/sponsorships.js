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
import admin from 'firebase-admin';
import { v2 as cloudinary } from 'cloudinary';
import webpush from 'web-push';
import { initFirebaseAdmin } from './lib/firebase-admin';
export var config = {
    api: {
        bodyParser: {
            sizeLimit: "100mb",
        },
    },
};
// --- Type Duplication ---
var UserRole;
(function (UserRole) {
    UserRole["Admin"] = "Admin";
    UserRole["Staff"] = "Staff";
})(UserRole || (UserRole = {}));
// --- End Type Duplication ---
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
// --- Push Notification Helper ---
function sendPushNotification(db, title, body, url) {
    return __awaiter(this, void 0, void 0, function () {
        var subscriptionsSnapshot, notificationPayload, sendPromises;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!process.env.VAPID_PRIVATE_KEY || !process.env.VITE_VAPID_PUBLIC_KEY || !process.env.WEB_PUSH_EMAIL) {
                        console.warn('VAPID keys or email not set. Skipping push notification.');
                        return [2 /*return*/];
                    }
                    webpush.setVapidDetails("mailto:".concat(process.env.WEB_PUSH_EMAIL), process.env.VITE_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
                    return [4 /*yield*/, db.collection('pushSubscriptions')
                            .where('role', 'in', [UserRole.Admin, UserRole.Staff])
                            .get()];
                case 1:
                    subscriptionsSnapshot = _a.sent();
                    if (subscriptionsSnapshot.empty) {
                        console.log("No push subscriptions found for admins or staff.");
                        return [2 /*return*/];
                    }
                    notificationPayload = JSON.stringify({ title: title, body: body, url: url });
                    sendPromises = subscriptionsSnapshot.docs.flatMap(function (doc) {
                        var data = doc.data();
                        var userSubscriptions = data.subscriptions || [];
                        return userSubscriptions.map(function (subscription) {
                            return webpush.sendNotification(subscription, notificationPayload)
                                .catch(function (error) {
                                if (error.statusCode === 410) {
                                    console.log("Subscription for user ".concat(doc.id, " expired. Removing."));
                                    // Return a promise to update Firestore
                                    return db.collection('pushSubscriptions').doc(doc.id).update({
                                        subscriptions: admin.firestore.FieldValue.arrayRemove(subscription)
                                    });
                                }
                                else {
                                    console.error('Error sending notification:', error);
                                }
                            });
                        });
                    });
                    return [4 /*yield*/, Promise.allSettled(sendPromises)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// --- Action Handlers ---
function handleCreatePublic(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var db, sponsorshipData, publicId, uploadResult, uploadError_1, newSponsorship, body, dbError_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    db = admin.firestore();
                    sponsorshipData = req.body;
                    if (!sponsorshipData.proposalBase64) {
                        throw new Error("Proposal file is required.");
                    }
                    publicId = "proposal_".concat((_a = sponsorshipData.institutionName) === null || _a === void 0 ? void 0 : _a.replace(/\s+/g, '_'), "_").concat(Date.now());
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, cloudinary.uploader.upload(sponsorshipData.proposalBase64, {
                            folder: "studio8_proposals", public_id: publicId, resource_type: "auto", upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET
                        })];
                case 2:
                    uploadResult = _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    uploadError_1 = _b.sent();
                    console.error("Cloudinary upload failed for sponsorship proposal:", uploadError_1);
                    throw new Error("Gagal mengunggah file proposal. Mohon coba lagi.");
                case 4:
                    _b.trys.push([4, 6, , 8]);
                    newSponsorship = {
                        eventName: sponsorshipData.eventName,
                        institutionName: sponsorshipData.institutionName,
                        picName: sponsorshipData.picName,
                        picContact: sponsorshipData.picContact,
                        partnershipType: sponsorshipData.partnershipType,
                        benefits: sponsorshipData.benefits,
                        proposalUrl: uploadResult.secure_url,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        status: 'Pending',
                    };
                    return [4 /*yield*/, db.collection('sponsorships').add(newSponsorship)];
                case 5:
                    _b.sent();
                    body = "Dari ".concat(newSponsorship.institutionName, " untuk event ").concat(newSponsorship.eventName);
                    sendPushNotification(db, 'Proposal Kerjasama Baru!', body, '/admin/collaboration').catch(function (err) { return console.error("Push notification failed in background:", err); });
                    return [2 /*return*/, res.status(200).json({ success: true })];
                case 6:
                    dbError_1 = _b.sent();
                    console.warn("Firestore write failed for public sponsorship. Deleting orphaned file: ".concat(publicId));
                    return [4 /*yield*/, cloudinary.uploader.destroy(publicId).catch(function (delErr) { return console.error("CRITICAL: Failed to delete orphaned file ".concat(publicId), delErr); })];
                case 7:
                    _b.sent();
                    throw new Error("Gagal menyimpan data proposal ke database: ".concat(dbError_1.message));
                case 8: return [2 /*return*/];
            }
        });
    });
}
// --- Main Dispatcher ---
export default function handler(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, action, payload, _b, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (req.method !== 'POST') {
                        return [2 /*return*/, res.status(405).json({ message: 'Method Not Allowed' })];
                    }
                    _a = req.body, action = _a.action, payload = __rest(_a, ["action"]);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 6, , 7]);
                    initFirebaseAdmin();
                    initializeCloudinary();
                    req.body = payload;
                    _b = action;
                    switch (_b) {
                        case 'createPublic': return [3 /*break*/, 2];
                    }
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, handleCreatePublic(req, res)];
                case 3: return [2 /*return*/, _c.sent()];
                case 4: return [2 /*return*/, res.status(400).json({ message: "Unknown sponsorship action: ".concat(action) })];
                case 5: return [3 /*break*/, 7];
                case 6:
                    error_1 = _c.sent();
                    console.error("API Error in sponsorships handler (action: ".concat(action, "):"), error_1);
                    return [2 /*return*/, res.status(500).json({
                            success: false,
                            message: error_1.message || "Gagal memproses permintaan sponsorship.",
                            error: error_1.message,
                        })];
                case 7: return [2 /*return*/];
            }
        });
    });
}

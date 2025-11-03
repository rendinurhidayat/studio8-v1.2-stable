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
import { initFirebaseAdmin } from './lib/firebase-admin';
export default function handler(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, subscription, userId, role, db, subscriptionRef, error_1;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (req.method !== 'POST') {
                        return [2 /*return*/, res.status(405).json({ message: 'Method Not Allowed' })];
                    }
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 3, , 4]);
                    _a = req.body, subscription = _a.subscription, userId = _a.userId, role = _a.role;
                    if (!subscription || !userId || !role) {
                        return [2 /*return*/, res.status(400).json({ message: 'Payload tidak lengkap. `subscription`, `userId`, dan `role` wajib diisi.' })];
                    }
                    // Basic validation for the subscription object
                    if (!subscription.endpoint || !((_b = subscription.keys) === null || _b === void 0 ? void 0 : _b.p256dh) || !((_c = subscription.keys) === null || _c === void 0 ? void 0 : _c.auth)) {
                        return [2 /*return*/, res.status(400).json({ message: 'Objek `subscription` tidak valid.' })];
                    }
                    initFirebaseAdmin();
                    db = admin.firestore();
                    subscriptionRef = db.collection('pushSubscriptions').doc(userId);
                    return [4 /*yield*/, subscriptionRef.set({
                            subscriptions: admin.firestore.FieldValue.arrayUnion(subscription),
                            role: role,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        }, { merge: true })];
                case 2:
                    _d.sent();
                    return [2 /*return*/, res.status(200).json({ success: true, message: 'Langganan notifikasi berhasil disimpan.' })];
                case 3:
                    error_1 = _d.sent();
                    console.error('Error saving push subscription:', error_1);
                    return [2 /*return*/, res.status(500).json({ message: 'Gagal menyimpan langganan notifikasi di server.', error: error_1.message })];
                case 4: return [2 /*return*/];
            }
        });
    });
}

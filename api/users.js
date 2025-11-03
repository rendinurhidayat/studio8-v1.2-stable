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
import admin from 'firebase-admin';
import { initFirebaseAdmin } from './lib/firebase-admin';
// --- Main Handler ---
export default function handler(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, action, payload, db, auth, _b, userData, currentUserId, currentUserDoc, password, userDataForFirestore, newUserRecord, dbError_1, createdUser, userIdToDelete, currentUserId, currentUserDoc, userToDeleteDoc, userToDeleteData, userToDeleteName, error_1, errorMessage, userIdToDelete, cleanupError_1;
        var _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    if (req.method !== 'POST') {
                        return [2 /*return*/, res.status(405).json({ message: 'Method Not Allowed' })];
                    }
                    _a = req.body, action = _a.action, payload = __rest(_a, ["action"]);
                    if (!action) {
                        return [2 /*return*/, res.status(400).json({ message: 'Action is required.' })];
                    }
                    _g.label = 1;
                case 1:
                    _g.trys.push([1, 19, , 25]);
                    initFirebaseAdmin();
                    db = admin.firestore();
                    auth = admin.auth();
                    _b = action;
                    switch (_b) {
                        case 'create': return [3 /*break*/, 2];
                        case 'delete': return [3 /*break*/, 11];
                    }
                    return [3 /*break*/, 17];
                case 2:
                    userData = payload.userData, currentUserId = payload.currentUserId;
                    if (!userData || !currentUserId) {
                        return [2 /*return*/, res.status(400).json({ message: 'userData and currentUserId are required.' })];
                    }
                    return [4 /*yield*/, db.collection('users').doc(currentUserId).get()];
                case 3:
                    currentUserDoc = _g.sent();
                    if (!currentUserDoc.exists || ((_c = currentUserDoc.data()) === null || _c === void 0 ? void 0 : _c.role) !== 'Admin') {
                        return [2 /*return*/, res.status(403).json({ message: 'Forbidden: Anda tidak memiliki izin untuk membuat pengguna.' })];
                    }
                    if (!userData.password) {
                        return [2 /*return*/, res.status(400).json({ message: 'Password wajib diisi untuk pengguna baru.' })];
                    }
                    password = userData.password, userDataForFirestore = __rest(userData, ["password"]);
                    if (userDataForFirestore.username) {
                        userDataForFirestore.username = userDataForFirestore.username.toLowerCase();
                    }
                    return [4 /*yield*/, auth.createUser({
                            email: userData.email,
                            password: userData.password,
                            displayName: userData.name,
                            photoURL: userData.photoURL || undefined,
                        })];
                case 4:
                    newUserRecord = _g.sent();
                    _g.label = 5;
                case 5:
                    _g.trys.push([5, 7, , 9]);
                    return [4 /*yield*/, db.collection('users').doc(newUserRecord.uid).set(userDataForFirestore)];
                case 6:
                    _g.sent();
                    return [3 /*break*/, 9];
                case 7:
                    dbError_1 = _g.sent();
                    // If Firestore write fails, delete the orphaned Auth user
                    console.warn("Firestore write failed for new user ".concat(newUserRecord.uid, ". Deleting orphaned Auth user."));
                    return [4 /*yield*/, auth.deleteUser(newUserRecord.uid)];
                case 8:
                    _g.sent();
                    throw dbError_1; // Re-throw to be caught by the main handler
                case 9: return [4 /*yield*/, db.collection('activity_logs').add({
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        userId: currentUserId,
                        userName: ((_d = currentUserDoc.data()) === null || _d === void 0 ? void 0 : _d.name) || 'Unknown Admin',
                        action: 'Membuat Pengguna Baru',
                        details: "Pengguna ".concat(userData.name, " (").concat(userData.role, ") telah dibuat.")
                    })];
                case 10:
                    _g.sent();
                    createdUser = __assign({ id: newUserRecord.uid }, userDataForFirestore);
                    return [2 /*return*/, res.status(200).json(createdUser)];
                case 11:
                    userIdToDelete = payload.userIdToDelete, currentUserId = payload.currentUserId;
                    if (!userIdToDelete || !currentUserId) {
                        return [2 /*return*/, res.status(400).json({ message: 'userIdToDelete and currentUserId are required.' })];
                    }
                    return [4 /*yield*/, db.collection('users').doc(currentUserId).get()];
                case 12:
                    currentUserDoc = _g.sent();
                    if (!currentUserDoc.exists || ((_e = currentUserDoc.data()) === null || _e === void 0 ? void 0 : _e.role) !== 'Admin') {
                        return [2 /*return*/, res.status(403).json({ message: 'Forbidden: Anda tidak memiliki izin untuk menghapus pengguna.' })];
                    }
                    return [4 /*yield*/, db.collection('users').doc(userIdToDelete).get()];
                case 13:
                    userToDeleteDoc = _g.sent();
                    userToDeleteData = userToDeleteDoc.data();
                    userToDeleteName = (userToDeleteData === null || userToDeleteData === void 0 ? void 0 : userToDeleteData.name) || "user with ID ".concat(userIdToDelete);
                    // 3. Delete from Firebase Auth and Firestore
                    return [4 /*yield*/, auth.deleteUser(userIdToDelete)];
                case 14:
                    // 3. Delete from Firebase Auth and Firestore
                    _g.sent();
                    return [4 /*yield*/, db.collection('users').doc(userIdToDelete).delete()];
                case 15:
                    _g.sent();
                    // 4. Log the activity
                    return [4 /*yield*/, db.collection('activity_logs').add({
                            timestamp: admin.firestore.FieldValue.serverTimestamp(),
                            userId: currentUserId,
                            userName: ((_f = currentUserDoc.data()) === null || _f === void 0 ? void 0 : _f.name) || 'Unknown Admin',
                            action: 'Menghapus Pengguna (Akun & Data)',
                            details: "Pengguna ".concat(userToDeleteName, " telah dihapus permanen dari sistem.")
                        })];
                case 16:
                    // 4. Log the activity
                    _g.sent();
                    return [2 /*return*/, res.status(200).json({ success: true, message: "User ".concat(userToDeleteName, " has been deleted successfully.") })];
                case 17: return [2 /*return*/, res.status(400).json({ message: "Unknown action: ".concat(action) })];
                case 18: return [3 /*break*/, 25];
                case 19:
                    error_1 = _g.sent();
                    console.error("API Error in users handler (action: ".concat(action, "):"), error_1);
                    errorMessage = 'Terjadi kesalahan pada server saat mengelola pengguna.';
                    if (!(error_1.code === 'auth/user-not-found')) return [3 /*break*/, 24];
                    errorMessage = 'Pengguna tidak ditemukan di sistem autentikasi. Akun mungkin sudah dihapus.';
                    _g.label = 20;
                case 20:
                    _g.trys.push([20, 23, , 24]);
                    userIdToDelete = payload.userIdToDelete;
                    if (!userIdToDelete) return [3 /*break*/, 22];
                    return [4 /*yield*/, admin.firestore().collection('users').doc(userIdToDelete).delete()];
                case 21:
                    _g.sent();
                    return [2 /*return*/, res.status(200).json({ success: true, message: 'Data pengguna berhasil dibersihkan dari database.' })];
                case 22: return [3 /*break*/, 24];
                case 23:
                    cleanupError_1 = _g.sent();
                    return [2 /*return*/, res.status(500).json({ message: 'Pengguna tidak ditemukan di Autentikasi, dan gagal membersihkan data database.', error: cleanupError_1.message })];
                case 24:
                    if (error_1.code === 'auth/email-already-exists') {
                        errorMessage = 'Email ini sudah digunakan oleh akun lain. Silakan gunakan email yang berbeda.';
                    }
                    if (error_1.code === 'auth/invalid-password') {
                        errorMessage = 'Password harus terdiri dari minimal 6 karakter.';
                    }
                    return [2 /*return*/, res.status(500).json({
                            message: errorMessage,
                            error: error_1.message || String(error_1),
                        })];
                case 25: return [2 /*return*/];
            }
        });
    });
}

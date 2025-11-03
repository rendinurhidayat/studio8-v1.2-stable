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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
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
// --- Type Duplication (necessary for serverless environment) ---
var BookingStatus;
(function (BookingStatus) {
    BookingStatus["Pending"] = "Pending";
    BookingStatus["Completed"] = "Completed";
    BookingStatus["Confirmed"] = "Confirmed";
})(BookingStatus || (BookingStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["Pending"] = "Pending";
    PaymentStatus["Paid"] = "Paid";
})(PaymentStatus || (PaymentStatus = {}));
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
// --- Server-side API Helpers ---
var fromFirestore = function (doc) {
    return __assign({ id: doc.id }, doc.data());
};
// --- Action Handlers ---
function handleCompleteSession(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var db, _a, bookingId, googleDriveLink, currentUserId, currentUserDoc, currentUserRole, bookingRef, updatedBookingData, error_1;
        var _this = this;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    db = admin.firestore();
                    _a = req.body, bookingId = _a.bookingId, googleDriveLink = _a.googleDriveLink, currentUserId = _a.currentUserId;
                    if (!bookingId || !googleDriveLink || !currentUserId) {
                        return [2 /*return*/, res.status(400).json({ message: 'bookingId, googleDriveLink, and currentUserId are required.' })];
                    }
                    return [4 /*yield*/, db.collection('users').doc(currentUserId).get()];
                case 1:
                    currentUserDoc = _d.sent();
                    currentUserRole = (_b = currentUserDoc.data()) === null || _b === void 0 ? void 0 : _b.role;
                    if (!currentUserDoc.exists || (currentUserRole !== UserRole.Admin && currentUserRole !== UserRole.Staff)) {
                        return [2 /*return*/, res.status(403).json({ message: 'Forbidden: You do not have permission to complete sessions.' })];
                    }
                    bookingRef = db.collection('bookings').doc(bookingId);
                    updatedBookingData = null;
                    _d.label = 2;
                case 2:
                    _d.trys.push([2, 6, , 7]);
                    return [4 /*yield*/, db.runTransaction(function (transaction) { return __awaiter(_this, void 0, void 0, function () {
                            var bookingDoc, bookingData, settingsDoc, settings, clientRef, clientDoc, client, pointsEarned, clientUpdateData, referrerQuery, referrerRef, referrerBonus, newTotalBookings, sortedTiers, newTier, finalPaymentAmount, bookingUpdateData, transactionRef;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, transaction.get(bookingRef)];
                                    case 1:
                                        bookingDoc = _a.sent();
                                        if (!bookingDoc.exists)
                                            throw new Error("Booking not found.");
                                        bookingData = fromFirestore(bookingDoc);
                                        if (bookingData.bookingStatus === BookingStatus.Completed) {
                                            console.warn("Attempted to complete an already completed session: ".concat(bookingId));
                                            updatedBookingData = bookingData; // Set data to prevent further processing
                                            return [2 /*return*/]; // Exit transaction early
                                        }
                                        return [4 /*yield*/, transaction.get(db.collection('settings').doc('main'))];
                                    case 2:
                                        settingsDoc = _a.sent();
                                        if (!settingsDoc.exists)
                                            throw new Error("System settings not found.");
                                        settings = settingsDoc.data();
                                        clientRef = db.collection('clients').doc(bookingData.clientEmail.toLowerCase());
                                        return [4 /*yield*/, transaction.get(clientRef)];
                                    case 3:
                                        clientDoc = _a.sent();
                                        if (!clientDoc.exists)
                                            throw new Error("Client not found for booking completion");
                                        client = fromFirestore(clientDoc);
                                        pointsEarned = Math.floor(bookingData.totalPrice * settings.loyaltySettings.pointsPerRupiah);
                                        clientUpdateData = {
                                            loyaltyPoints: admin.firestore.FieldValue.increment(pointsEarned),
                                            totalBookings: admin.firestore.FieldValue.increment(1),
                                            totalSpent: admin.firestore.FieldValue.increment(bookingData.totalPrice),
                                            lastBooking: admin.firestore.FieldValue.serverTimestamp(),
                                        };
                                        if (!(bookingData.referralCodeUsed && client.totalBookings === 0)) return [3 /*break*/, 5];
                                        return [4 /*yield*/, transaction.get(db.collection('clients').where('referralCode', '==', bookingData.referralCodeUsed).limit(1))];
                                    case 4:
                                        referrerQuery = _a.sent();
                                        if (!referrerQuery.empty) {
                                            referrerRef = referrerQuery.docs[0].ref;
                                            referrerBonus = settings.loyaltySettings.referralBonusPoints;
                                            transaction.update(referrerRef, { loyaltyPoints: admin.firestore.FieldValue.increment(referrerBonus) });
                                            clientUpdateData.loyaltyPoints = admin.firestore.FieldValue.increment(pointsEarned + referrerBonus);
                                        }
                                        _a.label = 5;
                                    case 5:
                                        newTotalBookings = client.totalBookings + 1;
                                        sortedTiers = settings.loyaltySettings.loyaltyTiers.sort(function (a, b) { return b.bookingThreshold - a.bookingThreshold; });
                                        newTier = sortedTiers.find(function (tier) { return newTotalBookings >= tier.bookingThreshold; });
                                        if (newTier && newTier.name !== client.loyaltyTier) {
                                            clientUpdateData.loyaltyTier = newTier.name;
                                        }
                                        finalPaymentAmount = bookingData.remainingBalance;
                                        bookingUpdateData = {
                                            bookingStatus: BookingStatus.Completed,
                                            paymentStatus: PaymentStatus.Paid,
                                            remainingBalance: 0,
                                            googleDriveLink: googleDriveLink,
                                            pointsEarned: pointsEarned,
                                        };
                                        transaction.update(bookingRef, bookingUpdateData);
                                        transaction.update(clientRef, clientUpdateData);
                                        if (finalPaymentAmount > 0) {
                                            transactionRef = db.collection('transactions').doc();
                                            transaction.set(transactionRef, {
                                                date: admin.firestore.FieldValue.serverTimestamp(),
                                                description: "Pelunasan Sesi ".concat(bookingData.bookingCode, " - ").concat(bookingData.clientName),
                                                type: 'Income', amount: finalPaymentAmount, bookingId: bookingId,
                                            });
                                        }
                                        updatedBookingData = __assign(__assign({}, bookingData), bookingUpdateData);
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 3:
                    _d.sent();
                    if (!updatedBookingData) return [3 /*break*/, 5];
                    return [4 /*yield*/, admin.firestore().collection('activity_logs').add({
                            timestamp: admin.firestore.FieldValue.serverTimestamp(),
                            userId: currentUserId,
                            userName: ((_c = currentUserDoc.data()) === null || _c === void 0 ? void 0 : _c.name) || 'Unknown User',
                            action: "Menyelesaikan sesi ".concat(updatedBookingData.bookingCode),
                            details: "Pelunasan Rp ".concat((updatedBookingData.remainingBalance > 0 ? updatedBookingData.remainingBalance : 0).toLocaleString('id-ID'), " dicatat.")
                        })];
                case 4:
                    _d.sent();
                    // Convert Timestamps to ISO strings for JSON serialization
                    Object.keys(updatedBookingData).forEach(function (key) {
                        if (updatedBookingData[key] instanceof admin.firestore.Timestamp) {
                            updatedBookingData[key] = updatedBookingData[key].toDate().toISOString();
                        }
                    });
                    _d.label = 5;
                case 5: return [2 /*return*/, res.status(200).json(updatedBookingData)];
                case 6:
                    error_1 = _d.sent();
                    console.error("Error in handleCompleteSession transaction:", error_1);
                    throw new Error('Transaksi database untuk menyelesaikan sesi gagal.');
                case 7: return [2 /*return*/];
            }
        });
    });
}
function handleCreatePublic(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var db, formData, newBookingCode, paymentProofUrl, paymentProofPublicId, _a, base64, mimeType, dataUrl, publicId, uploadResult, uploadError_1, message, bookingRef_1, lowerEmail_1, clientRef_1, bookingDate, body, transactionError_1, deleteError_1;
        var _this = this;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    db = admin.firestore();
                    formData = req.body;
                    newBookingCode = "S8-".concat(Math.random().toString(36).substring(2, 8).toUpperCase());
                    paymentProofUrl = '';
                    paymentProofPublicId = '';
                    if (!formData.paymentProofBase64) return [3 /*break*/, 4];
                    _a = formData.paymentProofBase64, base64 = _a.base64, mimeType = _a.mimeType;
                    dataUrl = "data:".concat(mimeType, ";base64,").concat(base64);
                    publicId = "proof_".concat(newBookingCode);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, cloudinary.uploader.upload(dataUrl, {
                            folder: "studio8_uploads", public_id: publicId, resource_type: "auto", upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
                        })];
                case 2:
                    uploadResult = _c.sent();
                    if (!(uploadResult === null || uploadResult === void 0 ? void 0 : uploadResult.secure_url))
                        throw new Error("Cloudinary gagal memberikan URL yang aman setelah upload.");
                    paymentProofUrl = uploadResult.secure_url;
                    paymentProofPublicId = uploadResult.public_id;
                    return [3 /*break*/, 4];
                case 3:
                    uploadError_1 = _c.sent();
                    message = ((_b = uploadError_1.error) === null || _b === void 0 ? void 0 : _b.message) || uploadError_1.message || 'Gagal mengunggah bukti pembayaran.';
                    throw new Error(message);
                case 4:
                    _c.trys.push([4, 6, , 11]);
                    bookingRef_1 = db.collection('bookings').doc();
                    lowerEmail_1 = formData.email.toLowerCase();
                    clientRef_1 = db.collection('clients').doc(lowerEmail_1);
                    return [4 /*yield*/, db.runTransaction(function (transaction) { return __awaiter(_this, void 0, void 0, function () {
                            var packagesSnap, addOnsSnap, settingsDoc, promosSnap, clientDoc, allPackages, allAddOns, allPromos, settings, client, isNewClient, selectedPackage, selectedSubPackage, selectedSubAddOns, extraPersonCharge, subtotal, discountAmount, discountReason, pointsRedeemed, pointsValue, referralCodeUsed, promoCodeUsed, promo, referrerSnap, sortedTiers, clientTier, totalPrice, newBookingData;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, transaction.get(db.collection('packages'))];
                                    case 1:
                                        packagesSnap = _a.sent();
                                        return [4 /*yield*/, transaction.get(db.collection('addons'))];
                                    case 2:
                                        addOnsSnap = _a.sent();
                                        return [4 /*yield*/, transaction.get(db.collection('settings').doc('main'))];
                                    case 3:
                                        settingsDoc = _a.sent();
                                        return [4 /*yield*/, transaction.get(db.collection('promos'))];
                                    case 4:
                                        promosSnap = _a.sent();
                                        return [4 /*yield*/, transaction.get(clientRef_1)];
                                    case 5:
                                        clientDoc = _a.sent();
                                        if (!settingsDoc.exists)
                                            throw new Error("Pengaturan sistem tidak ditemukan. Hubungi admin.");
                                        allPackages = packagesSnap.docs.map(function (doc) { return fromFirestore(doc); });
                                        allAddOns = addOnsSnap.docs.map(function (doc) { return fromFirestore(doc); });
                                        allPromos = promosSnap.docs.map(function (doc) { return fromFirestore(doc); });
                                        settings = settingsDoc.data();
                                        client = clientDoc.exists ? fromFirestore(clientDoc) : null;
                                        isNewClient = !client;
                                        if (isNewClient) {
                                            client = {
                                                id: lowerEmail_1, name: formData.name, email: lowerEmail_1, phone: formData.whatsapp,
                                                firstBooking: admin.firestore.Timestamp.now(), lastBooking: admin.firestore.Timestamp.now(),
                                                totalBookings: 0, totalSpent: 0, loyaltyPoints: 0, referralCode: "S8REF-".concat(Math.random().toString(36).substring(2, 8).toUpperCase()), loyaltyTier: 'Newbie'
                                            };
                                        }
                                        if (!client)
                                            throw new Error('Data klien tidak dapat dibuat atau ditemukan.');
                                        selectedPackage = allPackages.find(function (p) { return p.id === formData.packageId; });
                                        if (!selectedPackage)
                                            throw new Error("Paket yang Anda pilih tidak lagi tersedia.");
                                        selectedSubPackage = selectedPackage.subPackages.find(function (sp) { return sp.id === formData.subPackageId; });
                                        if (!selectedSubPackage)
                                            throw new Error("Varian paket yang Anda pilih tidak lagi tersedia.");
                                        selectedSubAddOns = allAddOns.flatMap(function (a) { return a.subAddOns; }).filter(function (sa) { return formData.subAddOnIds.includes(sa.id); });
                                        extraPersonCharge = (selectedPackage.isGroupPackage && formData.people > 2) ? (formData.people - 2) * 15000 : 0;
                                        subtotal = selectedSubPackage.price + selectedSubAddOns.reduce(function (sum, sa) { return sum + sa.price; }, 0) + extraPersonCharge;
                                        discountAmount = 0, discountReason = '', pointsRedeemed = 0, pointsValue = 0, referralCodeUsed = '', promoCodeUsed = '';
                                        if (formData.promoCode && formData.promoCode.trim()) {
                                            promo = allPromos.find(function (p) { return p.code.toUpperCase() === formData.promoCode.toUpperCase() && p.isActive; });
                                            if (promo) {
                                                promoCodeUsed = promo.code;
                                                discountReason = promo.description;
                                                discountAmount = subtotal * (promo.discountPercentage / 100);
                                            }
                                        }
                                        if (!!promoCodeUsed) return [3 /*break*/, 8];
                                        if (!(isNewClient && formData.referralCode)) return [3 /*break*/, 7];
                                        return [4 /*yield*/, transaction.get(db.collection('clients').where('referralCode', '==', formData.referralCode.toUpperCase()).limit(1))];
                                    case 6:
                                        referrerSnap = _a.sent();
                                        if (!referrerSnap.empty && referrerSnap.docs[0].id !== lowerEmail_1) {
                                            discountAmount = settings.loyaltySettings.firstBookingReferralDiscount;
                                            discountReason = "Diskon Referral";
                                            referralCodeUsed = formData.referralCode.toUpperCase();
                                            client.referredBy = referralCodeUsed;
                                        }
                                        return [3 /*break*/, 8];
                                    case 7:
                                        if (!isNewClient) {
                                            sortedTiers = __spreadArray([], settings.loyaltySettings.loyaltyTiers, true).sort(function (a, b) { return b.bookingThreshold - a.bookingThreshold; });
                                            clientTier = sortedTiers.find(function (t) { return client.totalBookings >= t.bookingThreshold; });
                                            if (clientTier) {
                                                discountAmount = subtotal * (clientTier.discountPercentage / 100);
                                                discountReason = "Diskon Tier ".concat(clientTier.name, " (").concat(clientTier.discountPercentage, "%)");
                                            }
                                        }
                                        _a.label = 8;
                                    case 8:
                                        if (formData.usePoints && client.loyaltyPoints > 0) {
                                            pointsValue = Math.min(subtotal - discountAmount, client.loyaltyPoints * settings.loyaltySettings.rupiahPerPoint);
                                            pointsRedeemed = Math.round(pointsValue / settings.loyaltySettings.rupiahPerPoint);
                                            client.loyaltyPoints -= pointsRedeemed;
                                        }
                                        totalPrice = subtotal - discountAmount - pointsValue;
                                        newBookingData = {
                                            bookingCode: newBookingCode, clientName: formData.name, clientEmail: formData.email, clientPhone: formData.whatsapp,
                                            bookingDate: admin.firestore.Timestamp.fromDate(new Date("".concat(formData.date, "T").concat(formData.time))),
                                            package: selectedPackage,
                                            selectedSubPackage: selectedSubPackage,
                                            addOns: allAddOns.filter(function (a) { return a.subAddOns.some(function (sa) { return formData.subAddOnIds.includes(sa.id); }); }),
                                            selectedSubAddOns: selectedSubAddOns,
                                            numberOfPeople: formData.people, paymentMethod: formData.paymentMethod,
                                            paymentStatus: PaymentStatus.Pending, bookingStatus: BookingStatus.Pending,
                                            totalPrice: totalPrice, remainingBalance: totalPrice, createdAt: admin.firestore.FieldValue.serverTimestamp(),
                                            paymentProofUrl: paymentProofUrl,
                                            notes: formData.notes, discountAmount: discountAmount + pointsValue,
                                            discountReason: discountReason,
                                            referralCodeUsed: referralCodeUsed,
                                            promoCodeUsed: promoCodeUsed,
                                            pointsRedeemed: pointsRedeemed,
                                            pointsValue: pointsValue,
                                            extraPersonCharge: extraPersonCharge
                                        };
                                        transaction.set(bookingRef_1, newBookingData);
                                        transaction.set(clientRef_1, client, { merge: true });
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 5:
                    _c.sent();
                    bookingDate = new Date("".concat(formData.date, "T").concat(formData.time));
                    body = "Sesi untuk ".concat(formData.name, " pada ").concat(bookingDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'long' }));
                    sendPushNotification(db, 'Booking Baru Diterima!', body, '/admin/schedule').catch(function (err) {
                        console.error("Failed to send push notification in background:", err);
                    });
                    return [2 /*return*/, res.status(200).json({
                            success: true, message: "Booking berhasil dibuat!",
                            bookingCode: newBookingCode, cloudinaryUrl: paymentProofUrl
                        })];
                case 6:
                    transactionError_1 = _c.sent();
                    if (!paymentProofPublicId) return [3 /*break*/, 10];
                    console.warn("Firestore transaction failed. Deleting orphaned Cloudinary file: ".concat(paymentProofPublicId));
                    _c.label = 7;
                case 7:
                    _c.trys.push([7, 9, , 10]);
                    return [4 /*yield*/, cloudinary.uploader.destroy(paymentProofPublicId)];
                case 8:
                    _c.sent();
                    console.log("Successfully deleted orphaned file: ".concat(paymentProofPublicId));
                    return [3 /*break*/, 10];
                case 9:
                    deleteError_1 = _c.sent();
                    console.error("CRITICAL: Failed to delete orphaned Cloudinary file ".concat(paymentProofPublicId, ". Manual cleanup required."), deleteError_1);
                    return [3 /*break*/, 10];
                case 10: 
                // Lempar error agar ditangkap oleh handler utama.
                throw new Error("Transaksi database gagal: ".concat(transactionError_1.message));
                case 11: return [2 /*return*/];
            }
        });
    });
}
function handleCreatePublicInstitutional(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var db, bookingData, newBookingCode, requestLetterUrl, publicId, uploadResult, uploadError_2, newBooking, body, dbError_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    db = admin.firestore();
                    bookingData = req.body;
                    newBookingCode = "S8-INST-".concat(Math.random().toString(36).substring(2, 8).toUpperCase());
                    requestLetterUrl = '';
                    publicId = '';
                    if (!bookingData.requestLetterBase64) return [3 /*break*/, 4];
                    publicId = "req_".concat(newBookingCode);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, cloudinary.uploader.upload("data:application/octet-stream;base64,".concat(bookingData.requestLetterBase64), {
                            folder: "studio8_requests", public_id: publicId, resource_type: "auto"
                        })];
                case 2:
                    uploadResult = _a.sent();
                    requestLetterUrl = uploadResult.secure_url;
                    return [3 /*break*/, 4];
                case 3:
                    uploadError_2 = _a.sent();
                    console.error("Cloudinary upload failed for institutional booking:", uploadError_2);
                    throw new Error("Gagal mengunggah surat permintaan.");
                case 4:
                    _a.trys.push([4, 6, , 9]);
                    newBooking = {
                        clientName: bookingData.institutionName, clientEmail: '', clientPhone: bookingData.picContact,
                        bookingType: 'institutional', institutionName: bookingData.institutionName,
                        activityType: bookingData.activityType, picName: bookingData.picName, picContact: bookingData.picContact,
                        numberOfParticipants: Number(bookingData.numberOfParticipants),
                        requestLetterUrl: requestLetterUrl || null, bookingCode: newBookingCode,
                        bookingDate: admin.firestore.Timestamp.fromDate(new Date(bookingData.bookingDate)),
                        createdAt: admin.firestore.FieldValue.serverTimestamp(), notes: bookingData.notes,
                        promoCodeUsed: bookingData.promoCode || null, bookingStatus: BookingStatus.Pending,
                        paymentStatus: PaymentStatus.Pending, paymentMode: 'dp',
                        package: {}, selectedSubPackage: {}, addOns: [], selectedSubAddOns: [],
                        totalPrice: 0, remainingBalance: 0,
                    };
                    return [4 /*yield*/, db.collection('bookings').add(newBooking)];
                case 5:
                    _a.sent();
                    body = "Proposal dari ".concat(newBooking.institutionName, " untuk ").concat(newBooking.activityType);
                    sendPushNotification(db, 'Permintaan Booking Instansi!', body, '/admin/collaboration').catch(function (err) { return console.error("Push notification failed in background:", err); });
                    return [2 /*return*/, res.status(200).json({ success: true, bookingCode: newBookingCode })];
                case 6:
                    dbError_1 = _a.sent();
                    if (!publicId) return [3 /*break*/, 8];
                    console.warn("Firestore write failed. Deleting orphaned file: ".concat(publicId));
                    return [4 /*yield*/, cloudinary.uploader.destroy(publicId).catch(function (delErr) { return console.error("CRITICAL: Failed to delete orphaned file ".concat(publicId), delErr); })];
                case 7:
                    _a.sent();
                    _a.label = 8;
                case 8: throw new Error("Gagal menyimpan data booking instansi: ".concat(dbError_1.message));
                case 9: return [2 /*return*/];
            }
        });
    });
}
// --- Main Dispatcher ---
export default function handler(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, action, payload, _b, error_2;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (req.method !== 'POST') {
                        return [2 /*return*/, res.status(405).json({ message: 'Method Not Allowed' })];
                    }
                    _a = req.body, action = _a.action, payload = __rest(_a, ["action"]);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 10, , 11]);
                    initFirebaseAdmin();
                    initializeCloudinary();
                    req.body = payload; // Re-assign body for individual handlers to use
                    _b = action;
                    switch (_b) {
                        case 'createPublic': return [3 /*break*/, 2];
                        case 'createPublicInstitutional': return [3 /*break*/, 4];
                        case 'complete': return [3 /*break*/, 6];
                    }
                    return [3 /*break*/, 8];
                case 2: return [4 /*yield*/, handleCreatePublic(req, res)];
                case 3: return [2 /*return*/, _c.sent()];
                case 4: return [4 /*yield*/, handleCreatePublicInstitutional(req, res)];
                case 5: return [2 /*return*/, _c.sent()];
                case 6: return [4 /*yield*/, handleCompleteSession(req, res)];
                case 7: return [2 /*return*/, _c.sent()];
                case 8: return [2 /*return*/, res.status(400).json({ message: "Unknown booking action: ".concat(action) })];
                case 9: return [3 /*break*/, 11];
                case 10:
                    error_2 = _c.sent();
                    console.error("API Error in bookings handler (action: ".concat(action, "):"), error_2);
                    return [2 /*return*/, res.status(500).json({
                            success: false,
                            message: error_2.message || "Gagal memproses permintaan booking.",
                            error: error_2.message,
                        })];
                case 11: return [2 /*return*/];
            }
        });
    });
}

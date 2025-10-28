
import { User, Booking, BookingStatus, Package, AddOn, PaymentStatus, Client, Transaction, TransactionType, UserRole, SubPackage, SubAddOn, Task, Promo, SystemSettings, ActivityLog, InventoryItem, InventoryStatus, Feedback, Expense, LoyaltySettings, LoyaltyTier, Insight, Attendance, DailyReport, AttendanceStatus, ReportStatus, InternMood, MentorFeedback, InternReport, AIInsight, ChatRoom, ChatMessage, HighlightWork, Certificate, DailyProgress, WeeklyEvaluation, Quiz, QuizResult, Sponsorship, CollaborationActivity, Asset, ForumThread, ForumReply, JobPost, CommunityEvent, PracticalClass } from '../types';
import { notificationService } from './notificationService';
import { auth, db, storage, firebaseConfig } from '../firebase';
import firebase from "firebase/compat/app";
import { format } from 'date-fns';

type Timestamp = firebase.firestore.Timestamp;

// --- Helper Functions ---

// --- Data Transformation Helpers ---
const fromFirestore = <T>(doc: firebase.firestore.DocumentSnapshot, dateFields: string[] = []): T => {
    const data = { id: doc.id, ...doc.data() } as any;
    for (const field of dateFields) {
        const fieldParts = field.split('.');
        let target = data;
        let exists = true;
        for (let i = 0; i < fieldParts.length - 1; i++) {
            if (target[fieldParts[i]]) {
                target = target[fieldParts[i]];
            } else {
                exists = false;
                break;
            }
        }
        if (exists) {
            const finalField = fieldParts[fieldParts.length - 1];
            if (target[finalField] && (target[finalField] as any).toDate) {
                target[finalField] = (target[finalField] as any).toDate();
            }
        }
    }
    return data as T;
};

// --- Activity Logging ---
export const logActivity = async (userId: string, action: string, details: string = ''): Promise<void> => {
    if (!userId) {
        console.warn('Attempted to log activity without a user ID.');
        return;
    }
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        console.warn(`Activity log failed: User with ID ${userId} not found.`);
        return;
    }
    const userName = userDoc.data()?.name || 'Unknown User';

    await db.collection('activity_logs').add({
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        userId,
        userName,
        action,
        details,
    });
};

export const getActivityLogs = async (): Promise<ActivityLog[]> => {
    const snapshot = await db.collection('activity_logs').orderBy('timestamp', 'desc').limit(500).get();
    return snapshot.docs.map(doc => fromFirestore<ActivityLog>(doc, ['timestamp']));
};

// --- COLLABORATION ACTIVITY LOGS ---
export const getCollaborationActivity = async (collection: 'sponsorships' | 'bookings', docId: string): Promise<CollaborationActivity[]> => {
    const snapshot = await db.collection(collection).doc(docId).collection('activityLog').orderBy('timestamp', 'desc').get();
    return snapshot.docs.map(doc => fromFirestore<CollaborationActivity>(doc, ['timestamp']));
};

export const logCollaborationActivity = async (collection: 'sponsorships' | 'bookings', docId: string, action: string, details: string, userId: string): Promise<void> => {
    if (!userId) return;
    const userDoc = await db.collection('users').doc(userId).get();
    const userName = userDoc.data()?.name || 'Unknown User';
    
    await db.collection(collection).doc(docId).collection('activityLog').add({
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        action,
        details,
        userName,
    });
};

// --- API Functions (Firebase Implementation) ---

// --- DP Calculation Logic ---
export const calculateDpAmount = (booking: Pick<Booking, 'totalPrice' | 'package'>): number => {
    const totalPrice = booking.totalPrice;
    const packageType = booking.package.type || 'Studio'; // Default to Studio if not set

    if (packageType === 'Outdoor') {
        return totalPrice * 0.5;
    }
    // Studio type
    if (totalPrice > 150000) {
        return totalPrice * 0.5;
    }
    // Studio under or equal 150k
    return 35000;
};

export const findBookingByCode = async (code: string): Promise<Booking | null> => {
    const snapshot = await db.collection('bookings').where('bookingCode', '==', code.toUpperCase()).limit(1).get();
    if (snapshot.empty) return null;
    return fromFirestore<Booking>(snapshot.docs[0], ['bookingDate', 'createdAt', 'rescheduleRequestDate']);
};

// --- BOOKING CRUD ---
export const getBookings = async (): Promise<Booking[]> => {
    const snapshot = await db.collection('bookings').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => fromFirestore<Booking>(doc, ['bookingDate', 'createdAt', 'rescheduleRequestDate']));
};

export const getInstitutionalBookings = async (): Promise<Booking[]> => {
    const snapshot = await db.collection('bookings')
      .where('bookingType', '==', 'institutional')
      .orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => fromFirestore<Booking>(doc, ['bookingDate', 'createdAt', 'dueDate']));
};


export const updateBooking = async (bookingId: string, updatedData: Partial<Booking>, currentUserId: string): Promise<Booking | null> => {
    const bookingRef = db.collection('bookings').doc(bookingId);
    const originalDoc = await bookingRef.get();
    if (!originalDoc.exists) return null;
    
    const originalBooking = fromFirestore<Booking>(originalDoc, ['bookingDate', 'createdAt', 'rescheduleRequestDate']);

    // Recalculate total price if package or addons change
    if (updatedData.selectedSubPackage || updatedData.selectedSubAddOns) {
        const subPackagePrice = updatedData.selectedSubPackage?.price || originalBooking.selectedSubPackage.price;
        const addOnsPrice = updatedData.selectedSubAddOns?.reduce((sum, addon) => sum + addon.price, 0) || originalBooking.selectedSubAddOns.reduce((sum, addon) => sum + addon.price, 0);
        updatedData.totalPrice = subPackagePrice + addOnsPrice;
    }

    await bookingRef.update(updatedData);
    const newDoc = await bookingRef.get();
    const newBooking = fromFirestore<Booking>(newDoc, ['bookingDate', 'createdAt', 'rescheduleRequestDate']);

    // --- LOGGING ---
    // (Logging logic can be enhanced here to detail specific field changes)
    await logActivity(currentUserId, `Mengubah booking ${originalBooking.bookingCode}`);
    
    // Check for reschedule confirmation
    if (originalBooking.bookingStatus === BookingStatus.RescheduleRequested && newBooking.bookingStatus === BookingStatus.Confirmed) {
        notificationService.notify({
            recipient: UserRole.Staff, type: 'success', message: `Jadwal ulang untuk ${newBooking.clientName} telah dikonfirmasi.`, link: '/admin/schedule'
        });
    }
    
    return newBooking;
};

export const deleteBooking = async (bookingId: string, currentUserId: string): Promise<boolean> => {
    const bookingRef = db.collection('bookings').doc(bookingId);
    const doc = await bookingRef.get();
    if (!doc.exists) return false;
    const bookingToDelete = doc.data();

    // Also delete associated financial transactions
    const transactionsSnapshot = await db.collection('transactions').where('bookingId', '==', bookingId).get();
    const batch = db.batch();
    transactionsSnapshot.forEach(doc => batch.delete(doc.ref));
    batch.delete(bookingRef);
    await batch.commit();

    await logActivity(currentUserId, `Menghapus booking ${bookingToDelete?.bookingCode}`, `Klien: ${bookingToDelete?.clientName}`);
    return true;
};

export const confirmBooking = async (bookingId: string, currentUserId: string): Promise<Booking | null> => {
    const bookingRef = db.collection('bookings').doc(bookingId);
    const doc = await bookingRef.get();
    if (!doc.exists) return null;

    const bookingToConfirm = fromFirestore<Booking>(doc, ['bookingDate', 'createdAt']);
    if (bookingToConfirm.bookingStatus !== BookingStatus.Pending) return null;

    const dpAmount = calculateDpAmount(bookingToConfirm);
    const batch = db.batch();
    
    // 1. Update booking
    batch.update(bookingRef, {
        bookingStatus: BookingStatus.Confirmed,
        paymentStatus: PaymentStatus.Paid,
        remainingBalance: bookingToConfirm.totalPrice - dpAmount,
    });

    // 2. Create financial transaction
    const transactionRef = db.collection('transactions').doc();
    batch.set(transactionRef, {
        date: firebase.firestore.FieldValue.serverTimestamp(),
        description: `DP Booking ${bookingToConfirm.bookingCode} - ${bookingToConfirm.clientName}`,
        type: TransactionType.Income,
        amount: dpAmount,
        bookingId: bookingId,
    });

    await batch.commit();
    await logActivity(currentUserId, `Mengonfirmasi booking ${bookingToConfirm.bookingCode}`, `DP Rp ${dpAmount.toLocaleString('id-ID')} dicatat.`);
    notificationService.notify({ recipient: UserRole.Staff, type: 'success', message: `Booking ${bookingToConfirm.bookingCode} oleh ${bookingToConfirm.clientName} telah dikonfirmasi.`, link: '/staff/schedule'});
    
    const updatedDoc = await bookingRef.get();
    return fromFirestore<Booking>(updatedDoc, ['bookingDate', 'createdAt']);
};

export const completeBookingSession = async (bookingId: string, googleDriveLink: string, currentUserId: string): Promise<Booking | null> => {
    const bookingRef = db.collection('bookings').doc(bookingId);
    const doc = await bookingRef.get();
    if (!doc.exists) return null;
    const bookingToComplete = fromFirestore<Booking>(doc, ['bookingDate', 'createdAt']);

    const settings = await getSystemSettings();
    const client = await getClientByEmail(bookingToComplete.clientEmail);
    if (!client) {
        console.error("Client not found for booking completion");
        return null;
    }
    
    const clientRef = db.collection('clients').doc(client.email);
    const batch = db.batch();

    const pointsEarned = Math.floor(bookingToComplete.totalPrice * settings.loyaltySettings.pointsPerRupiah);

    const clientUpdateData: any = {
        loyaltyPoints: firebase.firestore.FieldValue.increment(pointsEarned),
        totalBookings: firebase.firestore.FieldValue.increment(1),
        totalSpent: firebase.firestore.FieldValue.increment(bookingToComplete.totalPrice),
        lastBooking: new Date(),
    };

    // If it's the client's first completed booking and they were referred, award bonus points.
    if (client.totalBookings === 0 && bookingToComplete.referralCodeUsed) {
        const referrer = await getClientByReferralCode(bookingToComplete.referralCodeUsed);
        if (referrer) {
            const referrerBonus = settings.loyaltySettings.referralBonusPoints;
            const referrerRef = db.collection('clients').doc(referrer.email);
            batch.update(referrerRef, { loyaltyPoints: firebase.firestore.FieldValue.increment(referrerBonus) });
            // The referred client also gets points
            clientUpdateData.loyaltyPoints = firebase.firestore.FieldValue.increment(pointsEarned + referrerBonus);
        }
    }

    // Check for new loyalty tier
    const newTotalBookings = client.totalBookings + 1;
    const sortedTiers = settings.loyaltySettings.loyaltyTiers.sort((a, b) => b.bookingThreshold - a.bookingThreshold);
    const newTier = sortedTiers.find(tier => newTotalBookings >= tier.bookingThreshold);
    
    if (newTier && newTier.name !== client.loyaltyTier) {
        clientUpdateData.loyaltyTier = newTier.name;
         notificationService.notify({ recipient: UserRole.Admin, type: 'success', message: `Selamat! Klien ${client.name} mencapai tier loyalitas ${newTier.name}.`, link: '/admin/clients'});
    }


    const finalPaymentAmount = bookingToComplete.remainingBalance;

    batch.update(bookingRef, {
        bookingStatus: BookingStatus.Completed,
        paymentStatus: PaymentStatus.Paid,
        remainingBalance: 0,
        googleDriveLink: googleDriveLink,
        pointsEarned: pointsEarned,
    });

    batch.update(clientRef, clientUpdateData);

    if (finalPaymentAmount > 0) {
        const transactionRef = db.collection('transactions').doc();
        batch.set(transactionRef, {
            date: firebase.firestore.FieldValue.serverTimestamp(),
            description: `Pelunasan Sesi ${bookingToComplete.bookingCode} - ${bookingToComplete.clientName}`,
            type: TransactionType.Income,
            amount: finalPaymentAmount,
            bookingId: bookingId,
        });
    }
    
    await batch.commit();
    await logActivity(currentUserId, `Menyelesaikan sesi ${bookingToComplete.bookingCode}`, `Pelunasan Rp ${finalPaymentAmount.toLocaleString('id-ID')} dicatat.`);
    
    const updatedDoc = await bookingRef.get();
    return fromFirestore<Booking>(updatedDoc, ['bookingDate', 'createdAt']);
};

export const requestReschedule = async (bookingId: string, newDate: Date): Promise<Booking | null> => {
    const bookingRef = db.collection('bookings').doc(bookingId);
    await bookingRef.update({
        bookingStatus: BookingStatus.RescheduleRequested,
        rescheduleRequestDate: newDate,
    });
    const doc = await bookingRef.get();
    const booking = fromFirestore<Booking>(doc, ['bookingDate', 'createdAt', 'rescheduleRequestDate']);
    
    notificationService.notify({ recipient: UserRole.Admin, type: 'warning', message: `Klien ${booking.clientName} meminta jadwal ulang.`, link: '/admin/schedule'});
    return booking;
};

export const isSlotAvailable = async (date: Date, excludeBookingId?: string): Promise<boolean> => {
    const snapshot = await db.collection('bookings')
      .where('bookingDate', '==', date)
      .where('bookingStatus', 'in', [BookingStatus.Confirmed, BookingStatus.InProgress])
      .get();
      
    if (snapshot.empty) return true;
    return snapshot.docs.every(doc => doc.id === excludeBookingId);
};

export const getTodaysBookings = async (): Promise<Booking[]> => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const snapshot = await db.collection('bookings')
      .where('bookingDate', '>=', todayStart)
      .where('bookingDate', '<=', todayEnd)
      .where('bookingStatus', 'in', [BookingStatus.Confirmed, BookingStatus.InProgress, BookingStatus.Completed])
      .orderBy('bookingDate', 'asc')
      .get();
      
    return snapshot.docs.map(doc => fromFirestore<Booking>(doc, ['bookingDate', 'createdAt']));
};

// --- SPONSORSHIP ---
export const getSponsorships = async (): Promise<Sponsorship[]> => {
    const snapshot = await db.collection('sponsorships').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => fromFirestore<Sponsorship>(doc, ['createdAt']));
};

export const updateSponsorship = async (sponsorshipId: string, updatedData: Partial<Sponsorship>, currentUserId: string): Promise<Sponsorship> => {
    const sponsorshipRef = db.collection('sponsorships').doc(sponsorshipId);
    await sponsorshipRef.update(updatedData);
    await logActivity(currentUserId, `Mengubah sponsorship ${updatedData.eventName || sponsorshipId}`, `Status baru: ${updatedData.status}`);
    const doc = await sponsorshipRef.get();
    return fromFirestore<Sponsorship>(doc, ['createdAt']);
};

export const deleteSponsorship = async (sponsorshipId: string, currentUserId: string): Promise<void> => {
    const docRef = db.collection('sponsorships').doc(sponsorshipId);
    const doc = await docRef.get();
    // TODO: delete proposal file from cloudinary
    await docRef.delete();
    await logActivity(currentUserId, `Menghapus sponsorship: ${doc.data()?.eventName}`);
};

// --- USER CRUD (Already on Firebase, verified) ---
export const getUsers = async (): Promise<User[]> => {
    const snapshot = await db.collection("users").get();
    return snapshot.docs.map(doc => fromFirestore<User>(doc, ['startDate', 'endDate']));
};

export const getUserById = async (userId: string): Promise<User | null> => {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        return null;
    }
    return fromFirestore<User>(userDoc, ['startDate', 'endDate']);
};


export const addUser = async (user: Omit<User, 'id'>, currentUserId: string): Promise<User> => {
    const userCredential = await auth.createUserWithEmailAndPassword(user.email, user.password!);
    const firebaseUser = userCredential.user;
    if (!firebaseUser) throw new Error("Failed to create user in Firebase Auth.");

    // Create a new object to avoid passing password to Firestore
    const { password, ...userDataForFirestore } = user;
    if (userDataForFirestore.username) {
        userDataForFirestore.username = userDataForFirestore.username.toLowerCase();
    }

    await db.collection('users').doc(firebaseUser.uid).set(userDataForFirestore);
    await logActivity(currentUserId, `Membuat user baru: ${user.name}`, `Role: ${user.role}`);
    return { id: firebaseUser.uid, ...userDataForFirestore };
};


export const updateUser = async (userId: string, updatedData: Partial<Omit<User, 'id' | 'email' | 'password'>>, currentUserId: string): Promise<User | null> => {
    const userDocRef = db.collection('users').doc(userId);
    await userDocRef.update(updatedData);
    const doc = await userDocRef.get();
    await logActivity(currentUserId, `Mengubah user ${doc.data()?.name}`);
    return fromFirestore<User>(doc);
};

export const deleteUser = async (userId: string, currentUserId: string): Promise<boolean> => {
    const userDocRef = db.collection('users').doc(userId);
    const doc = await userDocRef.get();
    if (!doc.exists) return false;
    const userToDelete = doc.data() as User;
    await userDocRef.delete();
    await logActivity(currentUserId, `Menghapus user (Firestore record): ${userToDelete.name}`);
    return true;
};

// --- PACKAGES & ADDONS ---
export const getPackages = async (): Promise<Package[]> => {
    const snapshot = await db.collection('packages').orderBy('name').get();
    return snapshot.docs.map(doc => fromFirestore<Package>(doc));
};

export const addPackage = async (pkg: Omit<Package, 'id'>, currentUserId: string): Promise<Package> => {
    const docRef = await db.collection('packages').add(pkg);
    await logActivity(currentUserId, `Menambah paket baru: ${pkg.name}`);
    const doc = await docRef.get();
    return fromFirestore<Package>(doc);
};

export const updatePackage = async (packageId: string, updatedData: Partial<Omit<Package, 'id'>>, currentUserId: string): Promise<Package> => {
    const packageRef = db.collection('packages').doc(packageId);
    await packageRef.update(updatedData);
    await logActivity(currentUserId, `Mengubah paket ${updatedData.name}`);
    const doc = await packageRef.get();
    return fromFirestore<Package>(doc);
};

export const deletePackage = async (packageId: string, currentUserId: string): Promise<void> => {
    const docRef = db.collection('packages').doc(packageId);
    const doc = await docRef.get();
    // Note: Deleting from Cloudinary would require a separate backend function call
    await docRef.delete();
    await logActivity(currentUserId, `Menghapus paket: ${doc.data()?.name}`);
};

export const getAddOns = async (): Promise<AddOn[]> => {
    const snapshot = await db.collection('addons').orderBy('name').get();
    return snapshot.docs.map(doc => fromFirestore<AddOn>(doc));
};

// ... (Other CRUD for Packages, Addons, Sub-items would follow a similar pattern using Firestore) ...
export const validatePromoCode = async (code: string): Promise<{ valid: boolean; message: string; promo?: Promo }> => {
    if (!code) return { valid: false, message: 'Kode tidak boleh kosong.' };
    const upperCaseCode = code.toUpperCase();
    
    const snapshot = await db.collection('promos')
        .where('code', '==', upperCaseCode)
        .where('isActive', '==', true)
        .limit(1)
        .get();

    if (snapshot.empty) {
        return { valid: false, message: 'Kode promo tidak valid atau sudah tidak berlaku.' };
    }
    
    const promo = fromFirestore<Promo>(snapshot.docs[0]);
    return { valid: true, message: `Promo "${promo.description}" berhasil diterapkan!`, promo };
};


export const validateReferralCode = async (code: string, newClientEmail: string): Promise<{ valid: boolean; message: string }> => {
    if (!code) return { valid: false, message: 'Kode tidak boleh kosong.' };
    const referrer = await getClientByReferralCode(code);
    if (!referrer) return { valid: false, message: 'Kode referral tidak ditemukan.' };
    
    const lowerEmail = newClientEmail.toLowerCase();
    if (referrer.email.toLowerCase() === lowerEmail) {
        return { valid: false, message: 'Anda tidak dapat menggunakan kode referral sendiri.' };
    }

    const newClient = await getClientByEmail(lowerEmail);
    if (newClient && newClient.totalBookings > 0) {
        return { valid: false, message: 'Kode referral hanya untuk pelanggan baru.' };
    }

    return { valid: true, message: `Kode valid! Anda akan mendapatkan diskon dari ${referrer.name}.` };
};

// --- TASKS ---
const STAFF_DAILY_TASKS_TEMPLATE = [
  { id: 'task-1', text: 'Cek dan bersihkan area studio & properti' },
  { id: 'task-2', text: 'Periksa kondisi dan baterai semua peralatan (kamera, lighting)' },
  { id: 'task-3', text: 'Siapkan ruang ganti dan area tunggu klien' },
  { id: 'task-4', text: 'Backup file foto dari sesi hari sebelumnya ke hard drive' },
  { id: 'task-5', text: 'Konfirmasi jadwal booking untuk esok hari via WhatsApp' },
  { id: 'task-6', text: 'Update status booking yang sudah selesai di sistem' },
  { id: 'task-7', text: 'Matikan semua peralatan dan lampu di akhir hari' },
];

export const getDailyTasks = async (userId: string) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const docRef = db.collection('users').doc(userId).collection('daily_task_completions').doc(todayStr);
    const doc = await docRef.get();
    const completions = doc.exists ? doc.data() : {};
    return STAFF_DAILY_TASKS_TEMPLATE.map(task => ({
        ...task,
        completed: completions?.[task.id] || false,
    }));
};

export const updateDailyTaskStatus = async (userId: string, taskId: string, completed: boolean) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const docRef = db.collection('users').doc(userId).collection('daily_task_completions').doc(todayStr);
    await docRef.set({ [taskId]: completed }, { merge: true });
};

export const getTasksForUser = async (userId: string): Promise<Task[]> => {
    const snapshot = await db.collection('tasks').where('assigneeId', '==', userId).orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => fromFirestore<Task>(doc, ['createdAt', 'dueDate']));
};

export const createTask = async (task: Omit<Task, 'id'>, currentUserId: string): Promise<Task> => {
    const docRef = await db.collection('tasks').add(task);
    await logActivity(currentUserId, `Menugaskan tugas ke ${task.assigneeName}`, task.text);
    const doc = await docRef.get();
    return fromFirestore<Task>(doc, ['createdAt', 'dueDate']);
};

export const updateTask = async (taskId: string, updates: Partial<Task>, currentUserId: string): Promise<void> => {
    await db.collection('tasks').doc(taskId).update(updates);
    // Optional: Log this activity
};

export const deleteTask = async (taskId: string, currentUserId: string): Promise<void> => {
    const doc = await db.collection('tasks').doc(taskId).get();
    await db.collection('tasks').doc(taskId).delete();
    await logActivity(currentUserId, `Menghapus tugas untuk ${doc.data()?.assigneeName}`, doc.data()?.text);
};

export const addMentorFeedback = async (internId: string, feedbackData: Omit<MentorFeedback, 'id' | 'date'>): Promise<MentorFeedback> => {
    const feedbackWithDate = { ...feedbackData, date: new Date() };
    const docRef = await db.collection('users').doc(internId).collection('mentorFeedback').add(feedbackWithDate);
    const doc = await docRef.get();
    const data = { id: doc.id, ...doc.data() } as MentorFeedback;
    if (data.date && (data.date as any).toDate) {
        data.date = (data.date as any).toDate();
    }
    return data;
};

export const getMentorFeedbackForIntern = async (internId: string): Promise<MentorFeedback[]> => {
    const snapshot = await db.collection('users').doc(internId).collection('mentorFeedback').orderBy('date', 'desc').get();
    return snapshot.docs.map(doc => fromFirestore<MentorFeedback>(doc, ['date']));
};


// FIX: Implement and export updateTaskProgress to track intern task progress.
export const updateTaskProgress = async (taskId: string, progress: number): Promise<void> => {
    await db.collection('tasks').doc(taskId).update({ progress });
};


// FIX: Implement and export functions for intern attendance and daily reports.
// --- INTERN MANAGEMENT ---

export const updateUserPoints = async (userId: string, pointsToAdd: number): Promise<void> => {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
        totalPoints: firebase.firestore.FieldValue.increment(pointsToAdd)
    });
};

export const getInternLeaderboard = async (): Promise<User[]> => {
    const snapshot = await db.collection('users')
        .where('role', 'in', [UserRole.AnakMagang, UserRole.AnakPKL])
        .orderBy('totalPoints', 'desc')
        .limit(5)
        .get();
    
    return snapshot.docs.map(doc => fromFirestore<User>(doc));
};

export const getAttendanceForUser = async (userId: string): Promise<Attendance[]> => {
    const snapshot = await db.collection('attendance').where('userId', '==', userId).orderBy('checkInTime', 'desc').get();
    return snapshot.docs.map(doc => fromFirestore<Attendance>(doc, ['checkInTime', 'checkOutTime']));
};

export const getTodaysAttendanceForAll = async (): Promise<Attendance[]> => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const snapshot = await db.collection('attendance').where('date', '==', todayStr).get();
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => fromFirestore<Attendance>(doc, ['checkInTime', 'checkOutTime']));
};

export const getDailyReportsForUser = async (userId: string): Promise<DailyReport[]> => {
    const snapshot = await db.collection('daily_reports').where('userId', '==', userId).orderBy('submittedAt', 'desc').get();
    return snapshot.docs.map(doc => fromFirestore<DailyReport>(doc, ['submittedAt']));
};

export const getTodaysAttendance = async (userId: string): Promise<Attendance | null> => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const snapshot = await db.collection('attendance').where('userId', '==', userId).where('date', '==', todayStr).limit(1).get();
    if (snapshot.empty) return null;
    return fromFirestore<Attendance>(snapshot.docs[0], ['checkInTime', 'checkOutTime']);
};

export const checkIn = async (userId: string): Promise<Attendance> => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const existing = await getTodaysAttendance(userId);
    if (existing) return existing;

    const newAttendanceData = {
        userId,
        date: todayStr,
        checkInTime: new Date(),
        status: AttendanceStatus.Present,
    };
    const docRef = await db.collection('attendance').add(newAttendanceData);
    const doc = await docRef.get();
    return fromFirestore<Attendance>(doc, ['checkInTime']);
};

export const checkOut = async (userId: string, attendanceId: string): Promise<Attendance> => {
    const docRef = db.collection('attendance').doc(attendanceId);
    await docRef.update({ checkOutTime: new Date() });
    const doc = await docRef.get();
    return fromFirestore<Attendance>(doc, ['checkInTime', 'checkOutTime']);
};

export const getTodaysReport = async (userId: string): Promise<DailyReport | null> => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const snapshot = await db.collection('daily_reports').where('userId', '==', userId).where('date', '==', todayStr).limit(1).get();
    if (snapshot.empty) return null;
    return fromFirestore<DailyReport>(snapshot.docs[0], ['submittedAt']);
};

export const submitDailyReport = async (reportData: Omit<DailyReport, 'id' | 'submittedAt' | 'date' | 'status'>): Promise<DailyReport> => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const newReportData = {
        ...reportData,
        date: todayStr,
        submittedAt: new Date(),
        status: ReportStatus.Dikirim,
    };
    const docRef = await db.collection('daily_reports').add(newReportData);
    const doc = await docRef.get();
    return fromFirestore<DailyReport>(doc, ['submittedAt']);
};

// FIX: Add the missing 'generateAiFeedbackForReport' function.
export const generateAiFeedbackForReport = async (reportId: string, reportContent: string): Promise<DailyReport> => {
    const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generateAiFeedback', reportId, reportContent }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate AI feedback');
    }
    const data = await response.json();
    // Convert ISO string back to Date object to match the type
    if (data.submittedAt) {
        data.submittedAt = new Date(data.submittedAt);
    }
    return data as DailyReport;
};

export const checkAndSendReportReminders = async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    // 1. Get all interns
    const usersSnapshot = await db.collection('users').where('role', 'in', [UserRole.AnakMagang, UserRole.AnakPKL]).get();
    const interns = usersSnapshot.docs.map(doc => fromFirestore<User>(doc));

    // 2. Get today's reports
    const reportsSnapshot = await db.collection('daily_reports').where('date', '==', todayStr).get();
    const submittedInternIds = new Set(reportsSnapshot.docs.map(doc => doc.data().userId));

    // 3. Find interns who haven't submitted
    const internsToRemind = interns.filter(intern => !submittedInternIds.has(intern.id));

    // 4. Log reminder
    if (internsToRemind.length > 0) {
        console.log(`[REMINDER SIMULATION @ ${new Date().toLocaleTimeString()}]`);
        console.log("Mengirim pengingat laporan harian kepada intern berikut:");
        internsToRemind.forEach(intern => {
            console.log(`- ${intern.name} (${intern.email})`);
        });
    } else {
        console.log(`[REMINDER SIMULATION @ ${new Date().toLocaleTimeString()}] Semua intern sudah mengirimkan laporan hari ini.`);
    }
};

export const generateInternReportContent = async (reportPayload: any): Promise<string> => {
    const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generateInternReportContent', ...reportPayload }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal membuat konten laporan.');
    }
    const data = await response.text();
    return data;
};

export const generateMouContent = async (sponsorshipData: Sponsorship): Promise<string> => {
    const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generateMouContent', sponsorshipData }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal membuat konten MoU.');
    }
    const data = await response.text();
    return data;
};

export const generatePackageDescription = async (packageName: string): Promise<string> => {
    const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generatePackageDescription', packageName }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message ||'Gagal membuat deskripsi paket.');
    }
    return await response.text();
};

export const generateSocialMediaCaption = async (asset: Asset): Promise<string[]> => {
    const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generateSocialMediaCaption', asset }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal membuat caption.');
    }
    const data = await response.json();
    return data.captions;
};


export const getInternReports = async (internId: string): Promise<InternReport[]> => {
  const snapshot = await db.collection('users').doc(internId).collection('reports').orderBy('generatedAt', 'desc').get();
  return snapshot.docs.map(doc => fromFirestore<InternReport>(doc, ['generatedAt']));
};

export const getLatestAIInsight = async (userId: string): Promise<AIInsight | null> => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const snapshot = await db.collection('users').doc(userId).collection('aiInsights')
        .where('date', '>=', todayStart)
        .orderBy('date', 'desc')
        .limit(1)
        .get();

    if (snapshot.empty) {
        return null;
    }
    return fromFirestore<AIInsight>(snapshot.docs[0], ['date']);
};

// --- Progress & Evaluation ---
export const addDailyProgress = async (progressData: Omit<DailyProgress, 'id' | 'submittedAt'>): Promise<DailyProgress> => {
    const dataToSave = {
        ...progressData,
        submittedAt: new Date(),
    };
    const docRef = await db.collection('progress').add(dataToSave);
    const doc = await docRef.get();
    return fromFirestore<DailyProgress>(doc, ['submittedAt']);
};

export const getDailyProgressForUser = async (userId: string): Promise<DailyProgress[]> => {
    const snapshot = await db.collection('progress').where('studentId', '==', userId).orderBy('submittedAt', 'desc').get();
    return snapshot.docs.map(doc => fromFirestore<DailyProgress>(doc, ['submittedAt']));
};

export const addWeeklyEvaluation = async (evalData: Omit<WeeklyEvaluation, 'id' | 'date'>): Promise<WeeklyEvaluation> => {
    const dataToSave = {
        ...evalData,
        date: new Date(),
    };
    const docRef = await db.collection('weekly_evaluations').add(dataToSave);
    const doc = await docRef.get();
    return fromFirestore<WeeklyEvaluation>(doc, ['date']);
};

export const getWeeklyEvaluationsForStudent = async (studentId: string): Promise<WeeklyEvaluation[]> => {
    const snapshot = await db.collection('weekly_evaluations').where('studentId', '==', studentId).orderBy('week', 'desc').get();
    return snapshot.docs.map(doc => fromFirestore<WeeklyEvaluation>(doc, ['date']));
};

export const getAllWeeklyEvaluations = async (): Promise<WeeklyEvaluation[]> => {
    const snapshot = await db.collection('weekly_evaluations').get();
    return snapshot.docs.map(doc => fromFirestore<WeeklyEvaluation>(doc, ['date']));
};

export const getAllDailyProgress = async (): Promise<DailyProgress[]> => {
    const snapshot = await db.collection('progress').get();
    return snapshot.docs.map(doc => fromFirestore<DailyProgress>(doc, ['submittedAt']));
};


// --- Financial, Client, Settings, Promos, Inventory, Feedback... ---

// --- FINANCIALS ---
export const getFinancialData = async (): Promise<Transaction[]> => {
    const snapshot = await db.collection('transactions').orderBy('date', 'desc').get();
    return snapshot.docs.map(doc => fromFirestore<Transaction>(doc, ['date']));
};

export const addTransaction = async (transaction: Omit<Transaction, 'id' | 'date'>, currentUserId: string): Promise<Transaction> => {
    const data = { ...transaction, date: firebase.firestore.FieldValue.serverTimestamp() };
    const docRef = await db.collection('transactions').add(data);
    await logActivity(currentUserId, `Menambah transaksi: ${transaction.description}`);
    const doc = await docRef.get();
    return fromFirestore<Transaction>(doc, ['date']);
};

export const getExpenses = async (): Promise<Expense[]> => {
    const snapshot = await db.collection('expenses').orderBy('date', 'desc').get();
    return snapshot.docs.map(doc => fromFirestore<Expense>(doc, ['date']));
};

export const addExpense = async (expense: Omit<Expense, 'id' | 'date'>, currentUserId: string): Promise<Expense> => {
    const data = { ...expense, date: firebase.firestore.FieldValue.serverTimestamp() };
    const docRef = await db.collection('expenses').add(data);
    await logActivity(currentUserId, `Menambah pengeluaran: ${expense.description}`, `Jumlah: Rp ${expense.amount.toLocaleString('id-ID')}`);
    const doc = await docRef.get();
    return fromFirestore<Expense>(doc, ['date']);
};

export const deleteExpense = async (expenseId: string, currentUserId: string): Promise<void> => {
    const expenseRef = db.collection('expenses').doc(expenseId);
    const doc = await expenseRef.get();
    if(doc.exists) {
        const expenseData = doc.data();
        await logActivity(currentUserId, `Menghapus pengeluaran: ${expenseData?.description}`);
    }
    await expenseRef.delete();
};


// --- CLIENTS ---
const generateReferralCode = (): string => `S8REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

export const getClientByEmail = async (email: string): Promise<Client | null> => {
    const doc = await db.collection('clients').doc(email.toLowerCase()).get();
    if (!doc.exists) return null;
    return fromFirestore<Client>(doc, ['firstBooking', 'lastBooking']);
};

export const deleteClient = async (clientId: string, currentUserId: string): Promise<void> => {
    const clientRef = db.collection('clients').doc(clientId);
    const doc = await clientRef.get();
    if (!doc.exists) return;
    const clientData = doc.data();
    await clientRef.delete();
    await logActivity(currentUserId, 'Menghapus data klien', `Klien: ${clientData?.name} (${clientData?.email})`);
};

export const getClientDetailsForBooking = async (email: string): Promise<Client | null> => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) return null;
    return await getClientByEmail(email);
};


export const getClientByReferralCode = async (code: string): Promise<Client | null> => {
    const snapshot = await db.collection('clients').where('referralCode', '==', code.toUpperCase()).limit(1).get();
    if (snapshot.empty) return null;
    return fromFirestore<Client>(snapshot.docs[0], ['firstBooking', 'lastBooking']);
};

export const getClientDetails = async (bookingCode: string): Promise<Client | null> => {
    const booking = await findBookingByCode(bookingCode);
    if (!booking) return null;
    return getClientByEmail(booking.clientEmail);
};

export const getOrCreateClient = async (name: string, email: string, phone: string): Promise<Client> => {
    const lowerEmail = email.toLowerCase();
    const clientRef = db.collection('clients').doc(lowerEmail);
    const doc = await clientRef.get();
    if (doc.exists) {
        return fromFirestore<Client>(doc, ['firstBooking', 'lastBooking']);
    } else {
        const newClientData: Omit<Client, 'id'> = {
            name,
            email: lowerEmail,
            phone,
            firstBooking: new Date(),
            lastBooking: new Date(),
            totalBookings: 0,
            totalSpent: 0,
            loyaltyPoints: 0,
            referralCode: generateReferralCode(),
            loyaltyTier: 'Newbie',
        };
        await clientRef.set(newClientData);
        return { id: lowerEmail, ...newClientData };
    }
};

export const getClients = async (): Promise<Client[]> => {
    const snapshot = await db.collection('clients').orderBy('lastBooking', 'desc').get();
    return snapshot.docs.map(doc => fromFirestore<Client>(doc, ['firstBooking', 'lastBooking']));
};


// --- SETTINGS ---
export const getSystemSettings = async (): Promise<SystemSettings> => {
    const defaults: SystemSettings = {
        operationalHours: { weekday: { open: '09:00', close: '17:00' }, weekend: { open: '10:00', close: '16:00' } },
        featureToggles: { chatbot: true, publicFeedback: true, publicCalendar: true },
        paymentMethods: { qris: true, bankTransfer: true, dana: true, shopeepay: true },
        contact: { whatsapp: '+6285724025425', instagram: 'studiolapan_' },
        loyaltySettings: {
            pointsPerRupiah: 0.001,
            rupiahPerPoint: 100,
            referralBonusPoints: 50,
            firstBookingReferralDiscount: 15000,
            loyaltyTiers: [
                { id: '1', name: 'Bronze', bookingThreshold: 3, discountPercentage: 5 },
                { id: '2', name: 'Silver', bookingThreshold: 10, discountPercentage: 7 },
                { id: '3', name: 'Gold', bookingThreshold: 20, discountPercentage: 10 },
            ],
        }
    };

    try {
        const doc = await db.collection('settings').doc('main').get();
        if (doc.exists && doc.data()) {
            const settings = doc.data() as SystemSettings;
            // Merge defaults for potentially missing nested objects
            return {
                ...defaults,
                ...settings,
                operationalHours: { ...defaults.operationalHours, ...settings.operationalHours },
                featureToggles: { ...defaults.featureToggles, ...settings.featureToggles },
                paymentMethods: { ...defaults.paymentMethods, ...settings.paymentMethods },
                contact: { ...defaults.contact, ...settings.contact },
                loyaltySettings: { ...defaults.loyaltySettings, ...settings.loyaltySettings },
            };
        }
        return defaults;
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            console.warn("Permission denied for anonymous user to fetch system settings. Falling back to default settings.");
        } else {
            console.error("Failed to fetch system settings, falling back to defaults:", error);
        }
        return defaults;
    }
};

export const getLatestInsight = async (): Promise<Insight | null> => {
    const snapshot = await db.collection('insights').orderBy('date', 'desc').limit(1).get();
    if (snapshot.empty) {
        return null;
    }
    return fromFirestore<Insight>(snapshot.docs[0], ['date']);
};

export const updateSystemSettings = async (settings: SystemSettings, currentUserId: string): Promise<SystemSettings> => {
    const loyalty = settings.loyaltySettings;
    loyalty.pointsPerRupiah = Number(loyalty.pointsPerRupiah);
    loyalty.rupiahPerPoint = Number(loyalty.rupiahPerPoint);
    loyalty.referralBonusPoints = Number(loyalty.referralBonusPoints);
    loyalty.firstBookingReferralDiscount = Number(loyalty.firstBookingReferralDiscount);
    loyalty.loyaltyTiers = loyalty.loyaltyTiers.map(tier => ({
        ...tier,
        bookingThreshold: Number(tier.bookingThreshold),
        discountPercentage: Number(tier.discountPercentage),
    }));

    await db.collection('settings').doc('main').set(settings, { merge: true });
    await logActivity(currentUserId, `Memperbarui Pengaturan Sistem`);
    return settings;
};

// --- FEEDBACK ---
export const getFeedbacks = async (): Promise<Feedback[]> => {
    const snapshot = await db.collection('feedbacks').orderBy('tanggal', 'desc').get();
    return snapshot.docs.map(doc => fromFirestore<Feedback>(doc, ['tanggal']));
};

export const getPublicFeedbacks = async (): Promise<Feedback[]> => {
    const snapshot = await db.collection('feedbacks')
        .where('publish', '==', true)
        .orderBy('tanggal', 'desc')
        .limit(3) // Only fetch 3 for the landing page
        .get();
    return snapshot.docs.map(doc => fromFirestore<Feedback>(doc, ['tanggal']));
};

export const addFeedback = async (feedbackData: Omit<Feedback, 'tanggal'>): Promise<Feedback> => {
    const data = { ...feedbackData, tanggal: firebase.firestore.FieldValue.serverTimestamp() };
    const docRef = await db.collection('feedbacks').add(data);
    const doc = await docRef.get();
    return fromFirestore<Feedback>(doc, ['tanggal']);
};

export const updateFeedback = async (id: string, updates: Partial<Feedback>, currentUserId: string): Promise<Feedback> => {
    const feedbackRef = db.collection('feedbacks').doc(id);
    await feedbackRef.update(updates);
    await logActivity(currentUserId, `Mengubah status feedback ${id}`);
    const doc = await feedbackRef.get();
    return fromFirestore<Feedback>(doc, ['tanggal']);
};

export const deleteFeedback = async (id: string, currentUserId: string): Promise<void> => {
    const doc = await db.collection('feedbacks').doc(id).get();
    await db.collection('feedbacks').doc(id).delete();
    await logActivity(currentUserId, `Menghapus feedback ${id}`, `Dari: ${doc.data()?.nama}`);
};

// --- CERTIFICATES ---
export const getCertificates = async (): Promise<Certificate[]> => {
    const snapshot = await db.collection('certificates').orderBy('issuedDate', 'desc').get();
    return snapshot.docs.map(doc => fromFirestore<Certificate>(doc, ['issuedDate']));
};

export const getCertificateById = async (id: string): Promise<Certificate | null> => {
    const doc = await db.collection('certificates').doc(id).get();
    if (!doc.exists) return null;
    return fromFirestore<Certificate>(doc, ['issuedDate']);
};

export const deleteCertificate = async (certificateId: string, currentUserId: string): Promise<void> => {
    const certRef = db.collection('certificates').doc(certificateId);
    const doc = await certRef.get();
    if (!doc.exists) return;
    const certData = doc.data() as Certificate;

    try {
        const response = await fetch('/api/deleteAsset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicId: `studio8_certificates/${certificateId}` })
        });
        if (!response.ok) {
            console.error(`Failed to delete certificate ${certificateId} from Cloudinary. It might need manual deletion.`);
        }
    } catch (error) {
        console.error(`Error calling deleteAsset API for ${certificateId}:`, error);
    }
    
    await certRef.delete();
    await logActivity(currentUserId, 'Menghapus sertifikat', `Sertifikat ${certificateId} untuk ${certData.studentName}`);
};


// --- CHAT ---

export const findOrCreateChatRoom = async (user1: User, user2: User): Promise<string> => {
    const participantIds = [user1.id, user2.id].sort();
    const roomId = participantIds.join('_');
    const roomRef = db.collection('chats').doc(roomId);
    const doc = await roomRef.get();

    if (doc.exists) {
        return roomId;
    }

    const newRoom: Omit<ChatRoom, 'id'> = {
        participantIds,
        participantInfo: {
            [user1.id]: { name: user1.name, email: user1.email, photoURL: user1.photoURL },
            [user2.id]: { name: user2.name, email: user2.email, photoURL: user2.photoURL },
        },
        createdAt: new Date(),
    };
    await roomRef.set(newRoom);
    return roomId;
};

export const getChatRoomsForUser = (userId: string, callback: (rooms: ChatRoom[]) => void): (() => void) => {
    return db.collection('chats')
        .where('participantIds', 'array-contains', userId)
        .orderBy('lastMessage.timestamp', 'desc')
        .onSnapshot(snapshot => {
            const rooms = snapshot.docs.map(doc => fromFirestore<ChatRoom>(doc, ['createdAt', 'lastMessage.timestamp']));
            callback(rooms);
        });
};

export const getMessagesStream = (roomId: string, callback: (messages: ChatMessage[]) => void): (() => void) => {
    return db.collection('chats').doc(roomId).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
            const messages = snapshot.docs.map(doc => fromFirestore<ChatMessage>(doc, ['timestamp']));
            callback(messages);
        });
};

export const sendMessage = async (roomId: string, senderId: string, senderName: string, text: string): Promise<void> => {
    const roomRef = db.collection('chats').doc(roomId);
    const messageRef = roomRef.collection('messages').doc();

    const timestamp = new Date();
    const messageData: Omit<ChatMessage, 'id'> = {
        senderId,
        senderName,
        text,
        timestamp,
    };

    const lastMessageData = {
        text,
        timestamp,
        senderId,
    };

    const batch = db.batch();
    batch.set(messageRef, messageData);
    batch.update(roomRef, { lastMessage: lastMessageData });
    await batch.commit();
};

// --- HIGHLIGHT WALL ---
export const getHighlightWorks = async (): Promise<HighlightWork[]> => {
    const snapshot = await db.collection('highlightWorks').orderBy('highlightDate', 'desc').get();
    return snapshot.docs.map(doc => fromFirestore<HighlightWork>(doc, ['highlightDate']));
};

export const addHighlightWork = async (workData: Omit<HighlightWork, 'id'>, currentUserId: string): Promise<HighlightWork> => {
    const docRef = await db.collection('highlightWorks').add(workData);
    await logActivity(currentUserId, `Menambah karya highlight baru: ${workData.title}`);
    const doc = await docRef.get();
    return fromFirestore<HighlightWork>(doc, ['highlightDate']);
};

export const updateHighlightWork = async (workId: string, workData: Partial<Omit<HighlightWork, 'id'>>, currentUserId: string): Promise<void> => {
    await db.collection('highlightWorks').doc(workId).update(workData);
    await logActivity(currentUserId, `Mengubah karya highlight: ${workData.title || workId}`);
};

export const deleteHighlightWork = async (workId: string, currentUserId: string): Promise<void> => {
    const doc = await db.collection('highlightWorks').doc(workId).get();
    const workTitle = doc.data()?.title || workId;
    // Note: This doesn't delete the file from Cloudinary. That would require a backend function.
    await db.collection('highlightWorks').doc(workId).delete();
    await logActivity(currentUserId, `Menghapus karya highlight: ${workTitle}`);
};

export const getHighlightWorkById = async (id: string): Promise<HighlightWork | null> => {
    const doc = await db.collection('highlightWorks').doc(id).get();
    if (!doc.exists) return null;
    return fromFirestore<HighlightWork>(doc, ['highlightDate']);
};

// --- QUIZZES ---
export const getQuizzes = async (): Promise<Quiz[]> => {
    const snapshot = await db.collection('quizzes').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => fromFirestore<Quiz>(doc, ['createdAt']));
};

export const getQuizById = async (quizId: string): Promise<Quiz | null> => {
    const doc = await db.collection('quizzes').doc(quizId).get();
    if (!doc.exists) return null;
    return fromFirestore<Quiz>(doc, ['createdAt']);
};

export const createQuiz = async (quizData: Omit<Quiz, 'id' | 'createdAt'>, currentUserId: string): Promise<Quiz> => {
    const dataToSave = {
        ...quizData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection('quizzes').add(dataToSave);
    await logActivity(currentUserId, `Membuat kuis baru: ${quizData.title}`);
    const doc = await docRef.get();
    return fromFirestore<Quiz>(doc, ['createdAt']);
};

export const updateQuiz = async (quizId: string, quizData: Partial<Omit<Quiz, 'id'>>, currentUserId: string): Promise<void> => {
    await db.collection('quizzes').doc(quizId).update(quizData);
    await logActivity(currentUserId, `Mengubah kuis: ${quizData.title || quizId}`);
};

export const deleteQuiz = async (quizId: string, currentUserId: string): Promise<void> => {
    const doc = await db.collection('quizzes').doc(quizId).get();
    const quizTitle = doc.data()?.title || quizId;
    await db.collection('quizzes').doc(quizId).delete();
    await logActivity(currentUserId, `Menghapus kuis: ${quizTitle}`);
};

export const submitQuizResult = async (resultData: Omit<QuizResult, 'id' | 'submittedAt'>): Promise<string> => {
    const dataToSave = {
        ...resultData,
        submittedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection('quiz_results').add(dataToSave);
    return docRef.id;
};

export const getQuizResultById = async (resultId: string): Promise<QuizResult | null> => {
    const doc = await db.collection('quiz_results').doc(resultId).get();
    if (!doc.exists) return null;
    return fromFirestore<QuizResult>(doc, ['submittedAt']);
};

export const getQuizResultsForStudent = async (studentId: string): Promise<QuizResult[]> => {
    const snapshot = await db.collection('quiz_results').where('studentId', '==', studentId).orderBy('submittedAt', 'desc').get();
    return snapshot.docs.map(doc => fromFirestore<QuizResult>(doc, ['submittedAt']));
};

export const getWeeklyQuizResults = async (): Promise<QuizResult[]> => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const snapshot = await db.collection('quiz_results').where('submittedAt', '>=', oneWeekAgo).orderBy('submittedAt', 'desc').get();
    return snapshot.docs.map(doc => fromFirestore<QuizResult>(doc, ['submittedAt']));
};

export const getResultsForQuiz = async (quizId: string): Promise<QuizResult[]> => {
    const snapshot = await db.collection('quiz_results').where('quizId', '==', quizId).orderBy('submittedAt', 'desc').get();
    return snapshot.docs.map(doc => fromFirestore<QuizResult>(doc, ['submittedAt']));
};

export const updateQuizResult = async (resultId: string, updates: Partial<QuizResult>): Promise<void> => {
    await db.collection('quiz_results').doc(resultId).update(updates);
};

// --- PRACTICAL CLASSES ---
export const getPracticalClasses = async (): Promise<PracticalClass[]> => {
    const snapshot = await db.collection('practical_classes').orderBy('classDate', 'desc').get();
    return snapshot.docs.map(doc => fromFirestore<PracticalClass>(doc, ['classDate']));
};

export const createPracticalClass = async (classData: Omit<PracticalClass, 'id'>, currentUserId: string): Promise<PracticalClass> => {
    const docRef = await db.collection('practical_classes').add(classData);
    await logActivity(currentUserId, `Membuat kelas praktek baru: ${classData.topic}`);
    const doc = await docRef.get();
    return fromFirestore<PracticalClass>(doc, ['classDate']);
};

export const deletePracticalClass = async (classId: string, currentUserId: string): Promise<void> => {
    const docRef = db.collection('practical_classes').doc(classId);
    const doc = await docRef.get();
    const topic = doc.data()?.topic || classId;
    await docRef.delete();
    await logActivity(currentUserId, `Menghapus kelas praktek: ${topic}`);
};

// FIX: Implement and export class registration functions.
export const registerForClass = async (classId: string, userId: string): Promise<void> => {
    const classRef = db.collection('practical_classes').doc(classId);
    await classRef.update({
        registeredInternIds: firebase.firestore.FieldValue.arrayUnion(userId)
    });
};

export const unregisterFromClass = async (classId: string, userId: string): Promise<void> => {
    const classRef = db.collection('practical_classes').doc(classId);
    await classRef.update({
        registeredInternIds: firebase.firestore.FieldValue.arrayRemove(userId)
    });
};

// --- ASSETS ---
export const getAssets = async (): Promise<Asset[]> => {
    const snapshot = await db.collection('assets').orderBy('uploadedAt', 'desc').get();
    return snapshot.docs.map(doc => fromFirestore<Asset>(doc, ['uploadedAt']));
};

export const addAsset = async (assetData: Omit<Asset, 'id' | 'uploadedAt'>, currentUserId: string): Promise<Asset> => {
    const dataToSave = {
        ...assetData,
        uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection('assets').add(dataToSave);
    await logActivity(currentUserId, `Mengunggah aset baru: ${assetData.fileName}`);
    const doc = await docRef.get();
    return fromFirestore<Asset>(doc, ['uploadedAt']);
};

// --- COMMUNITY PORTAL ---
export const getForumThreads = async (): Promise<ForumThread[]> => {
    const snapshot = await db.collection('forum_threads').orderBy('lastReplyAt', 'desc').get();
    return snapshot.docs.map(doc => fromFirestore<ForumThread>(doc, ['createdAt', 'lastReplyAt']));
};

export const getForumThreadById = async (threadId: string): Promise<ForumThread | null> => {
    const doc = await db.collection('forum_threads').doc(threadId).get();
    return doc.exists ? fromFirestore<ForumThread>(doc, ['createdAt', 'lastReplyAt']) : null;
};

export const addForumThread = async (threadData: Omit<ForumThread, 'id' | 'createdAt' | 'replyCount' | 'lastReplyAt'>): Promise<ForumThread> => {
    const dataToSave = { ...threadData, createdAt: new Date(), replyCount: 0, lastReplyAt: new Date() };
    const docRef = await db.collection('forum_threads').add(dataToSave);
    const doc = await docRef.get();
    return fromFirestore<ForumThread>(doc, ['createdAt', 'lastReplyAt']);
};

export const getRepliesForThread = (threadId: string, callback: (replies: ForumReply[]) => void): (() => void) => {
    return db.collection('forum_threads').doc(threadId).collection('replies')
        .orderBy('createdAt', 'asc')
        .onSnapshot(snapshot => {
            const replies = snapshot.docs.map(doc => fromFirestore<ForumReply>(doc, ['createdAt']));
            callback(replies);
        });
};

export const addReplyToThread = async (threadId: string, replyData: Omit<ForumReply, 'id' | 'threadId' | 'createdAt'>): Promise<ForumReply> => {
    const threadRef = db.collection('forum_threads').doc(threadId);
    const replyRef = threadRef.collection('replies').doc();
    const newReply = { ...replyData, threadId, createdAt: new Date() };

    await db.runTransaction(async (transaction) => {
        transaction.set(replyRef, newReply);
        transaction.update(threadRef, {
            replyCount: firebase.firestore.FieldValue.increment(1),
            lastReplyAt: new Date(),
        });
    });

    const doc = await replyRef.get();
    return fromFirestore<ForumReply>(doc, ['createdAt']);
};

export const getJobPosts = async (): Promise<JobPost[]> => {
    const snapshot = await db.collection('job_posts').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => fromFirestore<JobPost>(doc, ['createdAt']));
};

export const addJobPost = async (jobData: Omit<JobPost, 'id' | 'createdAt'>): Promise<JobPost> => {
    const dataToSave = { ...jobData, createdAt: new Date() };
    const docRef = await db.collection('job_posts').add(dataToSave);
    const doc = await docRef.get();
    return fromFirestore<JobPost>(doc, ['createdAt']);
};

export const getEvents = async (): Promise<CommunityEvent[]> => {
    const snapshot = await db.collection('events').orderBy('eventDate', 'asc').get();
    return snapshot.docs.map(doc => fromFirestore<CommunityEvent>(doc, ['createdAt', 'eventDate']));
};

export const addEvent = async (eventData: Omit<CommunityEvent, 'id' | 'createdAt'>): Promise<CommunityEvent> => {
    const dataToSave = { ...eventData, createdAt: new Date() };
    const docRef = await db.collection('events').add(dataToSave);
    const doc = await docRef.get();
    return fromFirestore<CommunityEvent>(doc, ['createdAt', 'eventDate']);
};


// --- The rest of the API functions (Promos, Inventory, etc.) follow the same Firestore pattern ---
export const getPromos = async (): Promise<Promo[]> => {
    const snapshot = await db.collection('promos').get();
    return snapshot.docs.map(doc => fromFirestore<Promo>(doc));
};
export const getInventoryItems = async (): Promise<InventoryItem[]> => {
    const snapshot = await db.collection('inventory').get();
    return snapshot.docs.map(doc => fromFirestore<InventoryItem>(doc, ['lastChecked']));
};
export const updateInventoryItem = async (itemId: string, updatedData: Partial<Omit<InventoryItem, 'id'>>, currentUserId: string): Promise<InventoryItem> => {
    const itemRef = db.collection('inventory').doc(itemId);
    await itemRef.update(updatedData);
    await logActivity(currentUserId, `Memperbarui item inventaris ${itemId}`);
    const doc = await itemRef.get();
    return fromFirestore<InventoryItem>(doc, ['lastChecked']);
}

// Add other CRUDs similarly
export const addPromo = async (promoData: Omit<Promo, 'id'>, currentUserId: string): Promise<Promo> => {
    const docRef = await db.collection('promos').add(promoData);
    await logActivity(currentUserId, `Menambah promo baru: ${promoData.code}`);
    return { ...promoData, id: docRef.id };
};
export const updatePromo = async (promoId: string, updatedData: Partial<Promo>, currentUserId: string): Promise<Promo> => {
    const promoRef = db.collection('promos').doc(promoId);
    await promoRef.update(updatedData);
    await logActivity(currentUserId, `Mengubah promo ${updatedData.code}`);
    const doc = await promoRef.get();
    return fromFirestore<Promo>(doc);
};
export const deletePromo = async (promoId: string, currentUserId: string): Promise<void> => {
    const doc = await db.collection('promos').doc(promoId).get();
    await db.collection('promos').doc(promoId).delete();
    await logActivity(currentUserId, `Menghapus promo: ${doc.data()?.code}`);
};
export const addInventoryItem = async (itemData: Omit<InventoryItem, 'id'>, currentUserId: string): Promise<InventoryItem> => {
    const docRef = await db.collection('inventory').add(itemData);
    await logActivity(currentUserId, `Menambah item inventaris: ${itemData.name}`);
    return { ...itemData, id: docRef.id };
};
export const deleteInventoryItem = async (itemId: string, currentUserId: string): Promise<void> => {
    const doc = await db.collection('inventory').doc(itemId).get();
    await db.collection('inventory').doc(itemId).delete();
    await logActivity(currentUserId, `Menghapus item inventaris: ${doc.data()?.name}`);
};
export const addAddOn = async (addOn: Omit<AddOn, 'id'>, currentUserId: string): Promise<AddOn> => {
    const docRef = await db.collection('addons').add(addOn);
    await logActivity(currentUserId, `Menambah addon: ${addOn.name}`);
    return { ...addOn, id: docRef.id };
}
export const updateAddOn = async (addOnId: string, updatedData: Partial<AddOn>, currentUserId: string): Promise<AddOn> => {
    const addOnRef = db.collection('addons').doc(addOnId);
    await addOnRef.update(updatedData);
    await logActivity(currentUserId, `Mengubah addon ${updatedData.name}`);
    const doc = await addOnRef.get();
    return fromFirestore<AddOn>(doc);
}
export const deleteAddOn = async (addOnId: string, currentUserId: string): Promise<void> => {
    const doc = await db.collection('addons').doc(addOnId).get();
    await db.collection('addons').doc(addOnId).delete();
    await logActivity(currentUserId, `Menghapus addon: ${doc.data()?.name}`);
}
export const addSubPackage = async (packageId: string, subPackageData: Omit<SubPackage, 'id'>, currentUserId: string): Promise<Package> => {
    const packageRef = db.collection('packages').doc(packageId);
    await packageRef.update({
        subPackages: firebase.firestore.FieldValue.arrayUnion({ ...subPackageData, id: `subpkg-${Date.now()}` })
    });
    await logActivity(currentUserId, `Menambah sub-paket ke ${packageId}`);
    const doc = await packageRef.get();
    return fromFirestore<Package>(doc);
}
export const updateSubPackage = async (packageId: string, subPackageId: string, updatedData: Partial<SubPackage>, currentUserId: string): Promise<Package> => {
    const packageRef = db.collection('packages').doc(packageId);
    const doc = await packageRef.get();
    const pkg = fromFirestore<Package>(doc);
    const subPackages = (pkg.subPackages || []).map(sp => sp.id === subPackageId ? { ...sp, ...updatedData } : sp);
    await packageRef.update({ subPackages });
    await logActivity(currentUserId, `Mengubah sub-paket ${subPackageId}`);
    const updatedDoc = await packageRef.get();
    return fromFirestore<Package>(updatedDoc);
}
export const deleteSubPackage = async (packageId: string, subPackageId: string, currentUserId: string): Promise<Package> => {
    const packageRef = db.collection('packages').doc(packageId);
    const doc = await packageRef.get();
    const pkg = fromFirestore<Package>(doc);
    const subPackages = (pkg.subPackages || []).filter(sp => sp.id !== subPackageId);
    await packageRef.update({ subPackages });
    await logActivity(currentUserId, `Menghapus sub-paket ${subPackageId}`);
    const updatedDoc = await packageRef.get();
    return fromFirestore<Package>(updatedDoc);
}
export const addSubAddOn = async (addOnId: string, subAddOnData: Omit<SubAddOn, 'id'>, currentUserId: string): Promise<AddOn> => {
    const addOnRef = db.collection('addons').doc(addOnId);
    await addOnRef.update({
        subAddOns: firebase.firestore.FieldValue.arrayUnion({ ...subAddOnData, id: `subaddon-${Date.now()}` })
    });
    await logActivity(currentUserId, `Menambah sub-addon ke ${addOnId}`);
    const doc = await addOnRef.get();
    return fromFirestore<AddOn>(doc);
}
export const updateSubAddOn = async (addOnId: string, subAddOnId: string, updatedData: Partial<SubAddOn>, currentUserId: string): Promise<AddOn> => {
    const addOnRef = db.collection('addons').doc(addOnId);
    const doc = await addOnRef.get();
    const addOn = fromFirestore<AddOn>(doc);
    const subAddOns = (addOn.subAddOns || []).map(sa => sa.id === subAddOnId ? { ...sa, ...updatedData } : sa);
    await addOnRef.update({ subAddOns });
    await logActivity(currentUserId, `Mengubah sub-addon ${subAddOnId}`);
    const updatedDoc = await addOnRef.get();
    return fromFirestore<AddOn>(updatedDoc);
}
export const deleteSubAddOn = async (addOnId: string, subAddOnId: string, currentUserId: string): Promise<AddOn> => {
    const addOnRef = db.collection('addons').doc(addOnId);
    const doc = await addOnRef.get();
    const addOn = fromFirestore<AddOn>(doc);
    const subAddOns = (addOn.subAddOns || []).filter(sa => sa.id !== subAddOnId);
    await addOnRef.update({ subAddOns });
    await logActivity(currentUserId, `Menghapus sub-addon ${subAddOnId}`);
    const updatedDoc = await addOnRef.get();
    return fromFirestore<AddOn>(updatedDoc);
}

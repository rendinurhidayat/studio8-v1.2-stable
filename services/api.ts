import { User, Booking, BookingStatus, Package, AddOn, PaymentStatus, Client, Transaction, TransactionType, UserRole, SubPackage, SubAddOn, Task, Promo, SystemSettings, ActivityLog, InventoryItem, InventoryStatus, Feedback, Expense, LoyaltySettings, LoyaltyTier, Insight } from '../types';
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
        if (data[field] && (data[field] as Timestamp).toDate) {
            data[field] = (data[field] as Timestamp).toDate();
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

// --- USER CRUD (Already on Firebase, verified) ---
export const getUsers = async (): Promise<User[]> => {
    const snapshot = await db.collection("users").get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as User);
};

export const addUser = async (user: Omit<User, 'id'>, currentUserId: string): Promise<User> => {
    const userCredential = await auth.createUserWithEmailAndPassword(user.email, user.password!);
    const firebaseUser = userCredential.user;
    if (!firebaseUser) throw new Error("Failed to create user in Firebase Auth.");

    const newUser: Omit<User, 'id' | 'password'> = {
        name: user.name, email: user.email, role: user.role, username: user.username?.toLowerCase(),
        asalSekolah: user.asalSekolah, jurusan: user.jurusan
    };
    await db.collection('users').doc(firebaseUser.uid).set(newUser);
    await logActivity(currentUserId, `Membuat user baru: ${newUser.name}`, `Role: ${newUser.role}`);
    return { id: firebaseUser.uid, ...newUser };
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
    return snapshot.docs.map(doc => fromFirestore<Task>(doc, ['createdAt']));
};

export const createTask = async (task: Omit<Task, 'id'>, currentUserId: string): Promise<Task> => {
    const docRef = await db.collection('tasks').add(task);
    await logActivity(currentUserId, `Menugaskan tugas ke ${task.assigneeName}`, task.text);
    const doc = await docRef.get();
    return fromFirestore<Task>(doc, ['createdAt']);
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
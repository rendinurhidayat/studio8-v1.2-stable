

import { User, Booking, BookingStatus, Package, AddOn, PaymentStatus, Client, Transaction, TransactionType, UserRole, SubPackage, SubAddOn, Task, Promo, SystemSettings, ActivityLog, InventoryItem, InventoryStatus, Feedback, Expense, LoyaltySettings, LoyaltyTier, Insight, Attendance, DailyReport, AttendanceStatus, ReportStatus, InternMood, MentorFeedback, InternReport, AIInsight, ChatRoom, ChatMessage, HighlightWork, Certificate, DailyProgress, WeeklyEvaluation, Quiz, QuizResult, Sponsorship, CollaborationActivity, Asset, ForumThread, ForumReply, JobPost, CommunityEvent, PracticalClass } from '../types';
import { notificationService } from './notificationService';
import { db, auth } from '../firebase';
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    limit, 
    serverTimestamp, 
    writeBatch, 
    runTransaction, 
    Timestamp, 
    increment, 
    arrayUnion, 
    arrayRemove, 
    onSnapshot,
    DocumentSnapshot,
    setDoc
} from 'firebase/firestore';
// FIX: Use named import for date-fns format function
import { format } from 'date-fns';

// --- Helper Functions ---

// --- Data Transformation Helpers ---
const fromFirestore = <T extends object>(doc: DocumentSnapshot, dateFields: string[] = []): T & { id: string } => {
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
                target[finalField] = (target[finalField] as any).toDate().toISOString();
            }
        }
    }
    return data as T & { id: string };
};

// --- Activity Logging ---
export const logActivity = async (userId: string, action: string, details: string = ''): Promise<void> => {
    try {
        if (!userId) {
            console.warn('Attempted to log activity without a user ID.');
            return;
        }
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) {
            console.warn(`Activity log failed: User with ID ${userId} not found.`);
            return;
        }
        const userName = userDoc.data()?.name || 'Unknown User';

        await addDoc(collection(db, 'activity_logs'), {
            timestamp: serverTimestamp(),
            userId,
            userName,
            action,
            details,
        });
    } catch (error) {
        console.error("Error logging activity:", error);
    }
};

export const getActivityLogs = async (): Promise<ActivityLog[]> => {
    try {
        const q = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(500));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<ActivityLog>(doc, ['timestamp']));
    } catch (error) {
        console.error("Error fetching activity logs:", error);
        return [];
    }
};

// --- COLLABORATION ACTIVITY LOGS ---
export const getCollaborationActivity = async (collectionName: 'sponsorships' | 'bookings', docId: string): Promise<CollaborationActivity[]> => {
    try {
        const q = query(collection(db, collectionName, docId, 'activityLog'), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<CollaborationActivity>(doc, ['timestamp']));
    } catch (error) {
        console.error("Error fetching collaboration activity:", error);
        return [];
    }
};

export const logCollaborationActivity = async (collectionName: 'sponsorships' | 'bookings', docId: string, action: string, details: string, userId: string): Promise<void> => {
    if (!userId) return;
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userName = userDoc.data()?.name || 'Unknown User';
        
        await addDoc(collection(db, collectionName, docId, 'activityLog'),{
            timestamp: serverTimestamp(),
            action,
            details,
            userName,
        });
    } catch (error) {
        console.error("Error logging collaboration activity:", error);
    }
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
    try {
        const q = query(collection(db, 'bookings'), where('bookingCode', '==', code.toUpperCase()), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        return fromFirestore<Booking>(snapshot.docs[0], ['bookingDate', 'createdAt', 'rescheduleRequestDate', 'dueDate']);
    } catch (error) {
        console.error("Error finding booking by code:", error);
        return null;
    }
};

// --- BOOKING CRUD ---
export const getBookings = async (): Promise<Booking[]> => {
    try {
        const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<Booking>(doc, ['bookingDate', 'createdAt', 'rescheduleRequestDate', 'dueDate']));
    } catch (error) {
        console.error("Error fetching bookings:", error);
        return [];
    }
};

export const getInstitutionalBookings = async (): Promise<Booking[]> => {
    try {
        const q = query(collection(db, 'bookings'), where('bookingType', '==', 'institutional'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<Booking>(doc, ['bookingDate', 'createdAt', 'dueDate']));
    } catch (error) {
        console.error("Error fetching institutional bookings:", error);
        return [];
    }
};


export const updateBooking = async (bookingId: string, updatedData: Partial<Booking>, currentUserId: string): Promise<Booking | null> => {
    try {
        const bookingRef = doc(db, 'bookings', bookingId);
        const originalDoc = await getDoc(bookingRef);
        if (!originalDoc.exists()) return null;
        
        const originalBooking = fromFirestore<Booking>(originalDoc, ['bookingDate', 'createdAt', 'rescheduleRequestDate', 'dueDate']);

        // Recalculate total price if package or addons change
        if (updatedData.selectedSubPackage || updatedData.selectedSubAddOns) {
            const subPackagePrice = updatedData.selectedSubPackage?.price || originalBooking.selectedSubPackage.price;
            const addOnsPrice = updatedData.selectedSubAddOns?.reduce((sum, addon) => sum + addon.price, 0) || originalBooking.selectedSubAddOns.reduce((sum, addon) => sum + addon.price, 0);
            updatedData.totalPrice = subPackagePrice + addOnsPrice;
        }

        await updateDoc(bookingRef, updatedData);
        const newDoc = await getDoc(bookingRef);
        const newBooking = fromFirestore<Booking>(newDoc, ['bookingDate', 'createdAt', 'rescheduleRequestDate', 'dueDate']);

        await logActivity(currentUserId, `Mengubah booking ${originalBooking.bookingCode}`);
        
        if (originalBooking.bookingStatus === BookingStatus.RescheduleRequested && newBooking.bookingStatus === BookingStatus.Confirmed) {
            notificationService.notify({
                recipient: UserRole.Staff, type: 'success', message: `Jadwal ulang untuk ${newBooking.clientName} telah dikonfirmasi.`, link: '/admin/schedule'
            });
        }
        
        return newBooking;
    } catch (error) {
        console.error("Error updating booking:", error);
        return null;
    }
};

export const deleteBooking = async (bookingId: string, currentUserId: string): Promise<boolean> => {
    try {
        const bookingRef = doc(db, 'bookings', bookingId);
        const docToDelete = await getDoc(bookingRef);
        if (!docToDelete.exists()) return false;
        const bookingData = docToDelete.data();

        const q = query(collection(db, 'transactions'), where('bookingId', '==', bookingId));
        const transactionsSnapshot = await getDocs(q);
        const batch = writeBatch(db);
        transactionsSnapshot.forEach(doc => batch.delete(doc.ref));
        batch.delete(bookingRef);
        await batch.commit();

        await logActivity(currentUserId, `Menghapus booking ${bookingData?.bookingCode}`, `Klien: ${bookingData?.clientName}`);
        return true;
    } catch (error) {
        console.error("Error deleting booking:", error);
        return false;
    }
};

export const confirmBooking = async (bookingId: string, currentUserId: string): Promise<Booking | null> => {
    try {
        const bookingRef = doc(db, 'bookings', bookingId);
        const docToConfirm = await getDoc(bookingRef);
        if (!docToConfirm.exists()) return null;

        const bookingToConfirm = fromFirestore<Booking>(docToConfirm, ['bookingDate', 'createdAt', 'dueDate']);
        if (bookingToConfirm.bookingStatus !== BookingStatus.Pending) return null;

        const dpAmount = calculateDpAmount(bookingToConfirm);
        const batch = writeBatch(db);
        
        batch.update(bookingRef, {
            bookingStatus: BookingStatus.Confirmed,
            paymentStatus: PaymentStatus.Paid,
            remainingBalance: bookingToConfirm.totalPrice - dpAmount,
        });

        const transactionRef = doc(collection(db, 'transactions'));
        batch.set(transactionRef, {
            date: serverTimestamp(),
            description: `DP Booking ${bookingToConfirm.bookingCode} - ${bookingToConfirm.clientName}`,
            type: TransactionType.Income,
            amount: dpAmount,
            bookingId: bookingId,
        });

        await batch.commit();
        await logActivity(currentUserId, `Mengonfirmasi booking ${bookingToConfirm.bookingCode}`, `DP Rp ${dpAmount.toLocaleString('id-ID')} dicatat.`);
        notificationService.notify({ recipient: UserRole.Staff, type: 'success', message: `Booking ${bookingToConfirm.bookingCode} oleh ${bookingToConfirm.clientName} telah dikonfirmasi.`, link: '/staff/schedule'});
        
        const updatedDoc = await getDoc(bookingRef);
        return fromFirestore<Booking>(updatedDoc, ['bookingDate', 'createdAt', 'dueDate']);
    } catch (error) {
        console.error("Error confirming booking:", error);
        return null;
    }
};

export const completeBookingSession = async (bookingId: string, googleDriveLink: string, currentUserId: string): Promise<Booking | null> => {
    try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'complete',
                bookingId,
                googleDriveLink,
                currentUserId,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal menyelesaikan sesi.');
        }

        return await response.json() as Booking;

    } catch (error) {
        console.error("Error completing booking session via API:", error);
        return null;
    }
};

export const requestReschedule = async (bookingId: string, newDate: Date): Promise<Booking | null> => {
    try {
        const bookingRef = doc(db, 'bookings', bookingId);
        await updateDoc(bookingRef, {
            bookingStatus: BookingStatus.RescheduleRequested,
            rescheduleRequestDate: newDate,
        });
        const updatedDoc = await getDoc(bookingRef);
        const booking = fromFirestore<Booking>(updatedDoc, ['bookingDate', 'createdAt', 'rescheduleRequestDate', 'dueDate']);
        
        notificationService.notify({ recipient: UserRole.Admin, type: 'warning', message: `Klien ${booking.clientName} meminta jadwal ulang.`, link: '/admin/schedule'});
        return booking;
    } catch (error) {
        console.error("Error requesting reschedule:", error);
        return null;
    }
};

export const isSlotAvailable = async (date: Date, excludeBookingId?: string): Promise<boolean> => {
    try {
        const q = query(collection(db, 'bookings'),
          where('bookingDate', '==', date),
          where('bookingStatus', 'in', [BookingStatus.Confirmed, BookingStatus.InProgress])
        );
        const snapshot = await getDocs(q);
          
        if (snapshot.empty) return true;
        return snapshot.docs.every(doc => doc.id === excludeBookingId);
    } catch (error) {
        console.error("Error checking slot availability:", error);
        return false;
    }
};

export const getTodaysBookings = async (): Promise<Booking[]> => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        
        const q = query(collection(db, 'bookings'),
          where('bookingDate', '>=', todayStart),
          where('bookingDate', '<=', todayEnd),
          where('bookingStatus', 'in', [BookingStatus.Confirmed, BookingStatus.InProgress, BookingStatus.Completed]),
          orderBy('bookingDate', 'asc')
        );
        const snapshot = await getDocs(q);
          
        return snapshot.docs.map(doc => fromFirestore<Booking>(doc, ['bookingDate', 'createdAt', 'dueDate']));
    } catch (error) {
        console.error("Error fetching today's bookings:", error);
        return [];
    }
};

// --- SPONSORSHIPS ---
export const getSponsorships = async (): Promise<Sponsorship[]> => {
    try {
        const q = query(collection(db, 'sponsorships'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<Sponsorship>(doc, ['createdAt']));
    } catch (error) {
        console.error("Error fetching sponsorships:", error);
        return [];
    }
};

export const updateSponsorship = async (sponsorshipId: string, updatedData: Partial<Sponsorship>, currentUserId: string): Promise<Sponsorship | null> => {
    try {
        const sponsorshipRef = doc(db, 'sponsorships', sponsorshipId);
        await updateDoc(sponsorshipRef, updatedData);
        const updatedDoc = await getDoc(sponsorshipRef);
        if (!updatedDoc.exists()) return null;

        const sponsorship = fromFirestore<Sponsorship>(updatedDoc, ['createdAt']);
        await logActivity(currentUserId, `Mengubah status sponsorship untuk ${sponsorship.eventName}`);
        
        return sponsorship;
    } catch (error) {
        console.error("Error updating sponsorship:", error);
        return null;
    }
};

export const deleteSponsorship = async (sponsorshipId: string, currentUserId: string): Promise<void> => {
    try {
        const sponsorshipRef = doc(db, 'sponsorships', sponsorshipId);
        const docToDelete = await getDoc(sponsorshipRef);
        if (!docToDelete.exists()) return;
        
        const sponsorshipData = docToDelete.data();
        await deleteDoc(sponsorshipRef);
        await logActivity(currentUserId, `Menghapus sponsorship: ${sponsorshipData?.eventName}`);
    } catch (error) {
        console.error("Error deleting sponsorship:", error);
    }
};

// --- USER CRUD (Already on Firebase, verified) ---
export const getUsers = async (): Promise<User[]> => {
    try {
        const snapshot = await getDocs(collection(db, "users"));
        return snapshot.docs.map(doc => fromFirestore<User>(doc, ['startDate', 'endDate']));
    } catch (error) {
        console.error("Error fetching users:", error);
        return [];
    }
};

export const getUserById = async (userId: string): Promise<User | null> => {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) {
            return null;
        }
        return fromFirestore<User>(userDoc, ['startDate', 'endDate']);
    } catch (error) {
        console.error("Error fetching user by ID:", error);
        return null;
    }
};


export const addUser = async (user: Omit<User, 'id'>, currentUserId: string): Promise<User> => {
    const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'create',
            userData: user,
            currentUserId: currentUserId,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal membuat pengguna baru.');
    }

    return await response.json() as User;
};


export const updateUser = async (userId: string, updatedData: Partial<Omit<User, 'id' | 'email' | 'password'>>, currentUserId: string): Promise<User | null> => {
    try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, updatedData);
        const updatedDoc = await getDoc(userDocRef);
        await logActivity(currentUserId, `Mengubah user ${updatedDoc.data()?.name}`);
        return fromFirestore<User>(updatedDoc, ['startDate', 'endDate']);
    } catch (error) {
        console.error("Error updating user:", error);
        return null;
    }
};

export const deleteUser = async (userId: string, currentUserId: string): Promise<boolean> => {
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'delete',
                userIdToDelete: userId,
                currentUserId: currentUserId,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal menghapus pengguna.');
        }

        return true;
    } catch (error) {
        console.error("Error deleting user via API:", error);
        alert(`Gagal menghapus pengguna: ${(error as Error).message}`);
        return false;
    }
};

// --- PACKAGES & ADDONS ---
export const getPackages = async (): Promise<Package[]> => {
    try {
        const q = query(collection(db, 'packages'), orderBy('name'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<Package>(doc));
    } catch (error) {
        console.error("Error fetching packages:", error);
        return [];
    }
};

export const addPackage = async (pkg: Omit<Package, 'id'>, currentUserId: string): Promise<Package> => {
    const docRef = await addDoc(collection(db, 'packages'), pkg);
    await logActivity(currentUserId, `Menambah paket baru: ${pkg.name}`);
    const newDoc = await getDoc(docRef);
    return fromFirestore<Package>(newDoc);
};

export const updatePackage = async (packageId: string, updatedData: Partial<Omit<Package, 'id'>>, currentUserId: string): Promise<Package> => {
    const packageRef = doc(db, 'packages', packageId);
    await updateDoc(packageRef, updatedData);
    await logActivity(currentUserId, `Mengubah paket ${updatedData.name}`);
    const updatedDoc = await getDoc(packageRef);
    return fromFirestore<Package>(updatedDoc);
};

export const deletePackage = async (packageId: string, currentUserId: string): Promise<void> => {
    const docRef = doc(db, 'packages', packageId);
    const docToDelete = await getDoc(docRef);
    await deleteDoc(docRef);
    await logActivity(currentUserId, `Menghapus paket: ${docToDelete.data()?.name}`);
};

export const getAddOns = async (): Promise<AddOn[]> => {
    try {
        const q = query(collection(db, 'addons'), orderBy('name'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<AddOn>(doc));
    } catch (error) {
        console.error("Error fetching add-ons:", error);
        return [];
    }
};

// ... (Other CRUDs for Packages, Addons, Sub-items would follow a similar pattern using Firestore) ...
export const validatePromoCode = async (code: string): Promise<{ valid: boolean; message: string; promo?: Promo }> => {
    if (!code) return { valid: false, message: 'Kode tidak boleh kosong.' };
    const upperCaseCode = code.toUpperCase();
    
    const q = query(collection(db, 'promos'),
        where('code', '==', upperCaseCode),
        where('isActive', '==', true),
        limit(1)
    );
    const snapshot = await getDocs(q);

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
    try {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const docRef = doc(db, 'users', userId, 'daily_task_completions', todayStr);
        const docSnap = await getDoc(docRef);
        const completions = docSnap.exists() ? docSnap.data() : {};
        return STAFF_DAILY_TASKS_TEMPLATE.map(task => ({
            ...task,
            completed: completions?.[task.id] || false,
        }));
    } catch (error) {
        console.error("Error fetching daily tasks:", error);
        return STAFF_DAILY_TASKS_TEMPLATE.map(t => ({...t, completed: false}));
    }
};

export const updateDailyTaskStatus = async (userId: string, taskId: string, completed: boolean) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const docRef = doc(db, 'users', userId, 'daily_task_completions', todayStr);
    await setDoc(docRef, { [taskId]: completed }, { merge: true });
};

export const getTasksForUser = async (userId: string): Promise<Task[]> => {
    try {
        const q = query(collection(db, 'tasks'), where('assigneeId', '==', userId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<Task>(doc, ['createdAt', 'dueDate']));
    } catch (error) {
        console.error("Error fetching tasks for user:", error);
        return [];
    }
};

export const createTask = async (task: Omit<Task, 'id'>, currentUserId: string): Promise<Task> => {
    const docRef = await addDoc(collection(db, 'tasks'), task);
    await logActivity(currentUserId, `Menugaskan tugas ke ${task.assigneeName}`, task.text);
    const newDoc = await getDoc(docRef);
    return fromFirestore<Task>(newDoc, ['createdAt', 'dueDate']);
};

export const updateTask = async (taskId: string, updates: Partial<Task>, currentUserId: string): Promise<void> => {
    const taskRef = doc(db, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    if (!taskSnap.exists()) return;
    const taskData = taskSnap.data();

    await updateDoc(taskRef, updates);

    let actionDetails = `Tugas: "${taskData.text}"`;
    if (updates.hasOwnProperty('completed')) {
        const action = updates.completed ? `Menandai tugas selesai` : `Membatalkan status selesai tugas`;
        await logActivity(currentUserId, action, `${actionDetails} untuk ${taskData.assigneeName}`);
    } else {
        await logActivity(currentUserId, 'Memperbarui tugas', actionDetails);
    }
};

export const deleteTask = async (taskId: string, currentUserId: string): Promise<void> => {
    const docRef = doc(db, 'tasks', taskId);
    const docToDelete = await getDoc(docRef);
    await deleteDoc(docRef);
    await logActivity(currentUserId, `Menghapus tugas untuk ${docToDelete.data()?.assigneeName}`, docToDelete.data()?.text);
};

export const addMentorFeedback = async (internId: string, feedbackData: Omit<MentorFeedback, 'id' | 'date'>): Promise<MentorFeedback> => {
    const feedbackWithDate = { ...feedbackData, date: new Date().toISOString() };
    const docRef = await addDoc(collection(db, 'users', internId, 'mentorFeedback'), feedbackWithDate);
    const newDoc = await getDoc(docRef);
    const data = fromFirestore<MentorFeedback>(newDoc, ['date']);
    return data;
};

export const getMentorFeedbackForIntern = async (internId: string): Promise<MentorFeedback[]> => {
    try {
        const q = query(collection(db, 'users', internId, 'mentorFeedback'), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<MentorFeedback>(doc, ['date']));
    } catch (error) {
        console.error("Error fetching mentor feedback:", error);
        return [];
    }
};


export const updateTaskProgress = async (taskId: string, progress: number): Promise<void> => {
    await updateDoc(doc(db, 'tasks', taskId), { progress });
};


// --- INTERN MANAGEMENT ---

export const updateUserPoints = async (userId: string, pointsToAdd: number): Promise<void> => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        totalPoints: increment(pointsToAdd)
    });
};

export const getInternLeaderboard = async (): Promise<User[]> => {
    try {
        const q = query(collection(db, 'users'),
            where('role', 'in', [UserRole.AnakMagang, UserRole.AnakPKL]),
            orderBy('totalPoints', 'desc'),
            limit(5)
        );
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => fromFirestore<User>(doc));
    } catch (error) {
        console.error("Error fetching intern leaderboard:", error);
        return [];
    }
};

export const getAttendanceForUser = async (userId: string): Promise<Attendance[]> => {
    try {
        const q = query(collection(db, 'attendance'), where('userId', '==', userId), orderBy('checkInTime', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<Attendance>(doc, ['checkInTime', 'checkOutTime']));
    } catch (error) {
        console.error("Error fetching attendance for user:", error);
        return [];
    }
};

export const getTodaysAttendanceForAll = async (): Promise<Attendance[]> => {
    try {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const q = query(collection(db, 'attendance'), where('date', '==', todayStr));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return [];
        return snapshot.docs.map(doc => fromFirestore<Attendance>(doc, ['checkInTime', 'checkOutTime']));
    } catch (error) {
        console.error("Error fetching today's attendance for all:", error);
        return [];
    }
};

export const getDailyReportsForUser = async (userId: string): Promise<DailyReport[]> => {
    try {
        const q = query(collection(db, 'daily_reports'), where('userId', '==', userId), orderBy('submittedAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<DailyReport>(doc, ['submittedAt']));
    } catch (error) {
        console.error("Error fetching daily reports for user:", error);
        return [];
    }
};

export const getTodaysAttendance = async (userId: string): Promise<Attendance | null> => {
    try {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const q = query(collection(db, 'attendance'), where('userId', '==', userId), where('date', '==', todayStr), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        return fromFirestore<Attendance>(snapshot.docs[0], ['checkInTime', 'checkOutTime']);
    } catch (error) {
        console.error("Error fetching today's attendance:", error);
        return null;
    }
};

export const checkIn = async (userId: string): Promise<Attendance> => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const existing = await getTodaysAttendance(userId);
    if (existing) return existing;

    const newAttendanceData = {
        userId,
        date: todayStr,
        checkInTime: new Date().toISOString(),
        status: AttendanceStatus.Present,
    };
    const docRef = await addDoc(collection(db, 'attendance'), newAttendanceData);
    const newDoc = await getDoc(docRef);
    return fromFirestore<Attendance>(newDoc, ['checkInTime', 'checkOutTime']);
};

export const checkOut = async (userId: string, attendanceId: string): Promise<Attendance> => {
    const docRef = doc(db, 'attendance', attendanceId);
    await updateDoc(docRef, { checkOutTime: new Date().toISOString() });
    const updatedDoc = await getDoc(docRef);
    return fromFirestore<Attendance>(updatedDoc, ['checkInTime', 'checkOutTime']);
};

export const getTodaysReport = async (userId: string): Promise<DailyReport | null> => {
    try {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const q = query(collection(db, 'daily_reports'), where('userId', '==', userId), where('date', '==', todayStr), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        return fromFirestore<DailyReport>(snapshot.docs[0], ['submittedAt']);
    } catch (error) {
        console.error("Error fetching today's report:", error);
        return null;
    }
};

export const submitDailyReport = async (reportData: Omit<DailyReport, 'id' | 'submittedAt' | 'date' | 'status'>): Promise<DailyReport> => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const newReportData = {
        ...reportData,
        date: todayStr,
        submittedAt: new Date().toISOString(),
        status: ReportStatus.Dikirim,
    };
    const docRef = await addDoc(collection(db, 'daily_reports'), newReportData);
    const newDoc = await getDoc(docRef);
    return fromFirestore<DailyReport>(newDoc, ['submittedAt']);
};

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
    return await response.json() as DailyReport;
};

export const checkAndSendReportReminders = async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const usersQuery = query(collection(db, 'users'), where('role', 'in', [UserRole.AnakMagang, UserRole.AnakPKL]));
    const usersSnapshot = await getDocs(usersQuery);
    const interns = usersSnapshot.docs.map(doc => fromFirestore<User>(doc));

    const reportsQuery = query(collection(db, 'daily_reports'), where('date', '==', todayStr));
    const reportsSnapshot = await getDocs(reportsQuery);
    const submittedInternIds = new Set(reportsSnapshot.docs.map(doc => doc.data().userId));
    
    const internsToRemind = interns.filter(intern => !submittedInternIds.has(intern.id));
    if (internsToRemind.length > 0) {
        console.log(`[REMINDER SIMULATION @ ${new Date().toLocaleTimeString()}]`);
        console.log("Mengirim pengingat laporan harian kepada intern berikut:");
        internsToRemind.forEach(intern => console.log(`- ${intern.name} (${intern.email})`));
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
  try {
    const q = query(collection(db, 'users', internId, 'reports'), orderBy('generatedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => fromFirestore<InternReport>(doc, ['generatedAt']));
  } catch (error) {
    console.error("Error fetching intern reports:", error);
    return [];
  }
};

export const getLatestAIInsight = async (userId: string): Promise<AIInsight | null> => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const q = query(collection(db, 'users', userId, 'aiInsights'),
            where('date', '>=', todayStart),
            orderBy('date', 'desc'),
            limit(1)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return null;
        }
        return fromFirestore<AIInsight>(snapshot.docs[0], ['date']);
    } catch (error) {
        console.error("Error fetching latest AI insight:", error);
        return null;
    }
};

// --- Progress & Evaluation ---
export const addDailyProgress = async (progressData: Omit<DailyProgress, 'id' | 'submittedAt'>): Promise<DailyProgress> => {
    const dataToSave = { ...progressData, submittedAt: new Date().toISOString(), };
    const docRef = await addDoc(collection(db, 'progress'), dataToSave);
    const newDoc = await getDoc(docRef);
    return fromFirestore<DailyProgress>(newDoc, ['submittedAt']);
};

export const getDailyProgressForUser = async (userId: string): Promise<DailyProgress[]> => {
    try {
        const q = query(collection(db, 'progress'), where('studentId', '==', userId), orderBy('submittedAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<DailyProgress>(doc, ['submittedAt']));
    } catch (error) {
        console.error("Error fetching daily progress:", error);
        return [];
    }
};

export const addWeeklyEvaluation = async (evalData: Omit<WeeklyEvaluation, 'id' | 'date'>): Promise<WeeklyEvaluation> => {
    const dataToSave = { ...evalData, date: new Date().toISOString(), };
    const docRef = await addDoc(collection(db, 'weekly_evaluations'), dataToSave);
    const newDoc = await getDoc(docRef);
    return fromFirestore<WeeklyEvaluation>(newDoc, ['date']);
};

export const getWeeklyEvaluationsForStudent = async (studentId: string): Promise<WeeklyEvaluation[]> => {
    try {
        const q = query(collection(db, 'weekly_evaluations'), where('studentId', '==', studentId), orderBy('week', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<WeeklyEvaluation>(doc, ['date']));
    } catch (error) {
        console.error("Error fetching weekly evaluations:", error);
        return [];
    }
};

export const getAllWeeklyEvaluations = async (): Promise<WeeklyEvaluation[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'weekly_evaluations'));
        return snapshot.docs.map(doc => fromFirestore<WeeklyEvaluation>(doc, ['date']));
    } catch (error) {
        console.error("Error fetching all weekly evaluations:", error);
        return [];
    }
};

export const getAllDailyProgress = async (): Promise<DailyProgress[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'progress'));
        return snapshot.docs.map(doc => fromFirestore<DailyProgress>(doc, ['submittedAt']));
    } catch (error) {
        console.error("Error fetching all daily progress:", error);
        return [];
    }
};


// --- Financial, Client, Settings, Promos, Inventory, Feedback... ---

// --- FINANCIALS ---
export const getFinancialData = async (): Promise<Transaction[]> => {
    try {
        const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<Transaction>(doc, ['date']));
    } catch (error) {
        console.error("Error fetching financial data:", error);
        return [];
    }
};

export const addTransaction = async (transaction: Omit<Transaction, 'id' | 'date'>, currentUserId: string): Promise<Transaction> => {
    const data = { ...transaction, date: serverTimestamp() };
    const docRef = await addDoc(collection(db, 'transactions'), data);
    await logActivity(currentUserId, `Menambah transaksi: ${transaction.description}`);
    const newDoc = await getDoc(docRef);
    return fromFirestore<Transaction>(newDoc, ['date']);
};

export const getExpenses = async (): Promise<Expense[]> => {
    try {
        const q = query(collection(db, 'expenses'), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<Expense>(doc, ['date']));
    } catch (error) {
        console.error("Error fetching expenses:", error);
        return [];
    }
};

export const addExpense = async (expense: Omit<Expense, 'id' | 'date'>, currentUserId: string): Promise<Expense> => {
    const data = { ...expense, date: serverTimestamp() };
    const docRef = await addDoc(collection(db, 'expenses'), data);
    await logActivity(currentUserId, `Menambah pengeluaran: ${expense.description}`, `Jumlah: Rp ${expense.amount.toLocaleString('id-ID')}`);
    const newDoc = await getDoc(docRef);
    return fromFirestore<Expense>(newDoc, ['date']);
};

export const deleteExpense = async (expenseId: string, currentUserId: string): Promise<void> => {
    const expenseRef = doc(db, 'expenses', expenseId);
    const docToDelete = await getDoc(expenseRef);
    if(docToDelete.exists()) {
        const expenseData = docToDelete.data();
        await logActivity(currentUserId, `Menghapus pengeluaran: ${expenseData?.description}`);
    }
    await deleteDoc(expenseRef);
};


// --- CLIENTS ---
const generateReferralCode = (): string => `S8REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

export const getClientByEmail = async (email: string): Promise<Client | null> => {
    try {
        const docRef = doc(db, 'clients', email.toLowerCase());
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return null;
        return fromFirestore<Client>(docSnap, ['firstBooking', 'lastBooking']);
    } catch (error) {
        console.error("Error fetching client by email:", error);
        return null;
    }
};

export const deleteClient = async (clientId: string, currentUserId: string): Promise<void> => {
    try {
        const clientRef = doc(db, 'clients', clientId);
        const docToDelete = await getDoc(clientRef);
        if (!docToDelete.exists()) return;
        const clientData = docToDelete.data();
        await deleteDoc(clientRef);
        await logActivity(currentUserId, 'Menghapus data klien', `Klien: ${clientData?.name} (${clientData?.email})`);
    } catch (error) {
        console.error("Error deleting client:", error);
    }
};

export const getClientDetailsForBooking = async (email: string): Promise<Client | null> => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) return null;
    return await getClientByEmail(email);
};


export const getClientByReferralCode = async (code: string): Promise<Client | null> => {
    try {
        const q = query(collection(db, 'clients'), where('referralCode', '==', code.toUpperCase()), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        return fromFirestore<Client>(snapshot.docs[0], ['firstBooking', 'lastBooking']);
    } catch (error) {
        console.error("Error fetching client by referral code:", error);
        return null;
    }
};

export const getClientDetails = async (bookingCode: string): Promise<Client | null> => {
    const booking = await findBookingByCode(bookingCode);
    if (!booking) return null;
    return getClientByEmail(booking.clientEmail);
};

export const getOrCreateClient = async (name: string, email: string, phone: string): Promise<Client> => {
    const lowerEmail = email.toLowerCase();
    const clientRef = doc(db, 'clients', lowerEmail);
    const docSnap = await getDoc(clientRef);
    if (docSnap.exists()) {
        return fromFirestore<Client>(docSnap, ['firstBooking', 'lastBooking']);
    } else {
        const newClientData: Omit<Client, 'id'> = {
            name,
            email: lowerEmail,
            phone,
            firstBooking: new Date().toISOString(),
            lastBooking: new Date().toISOString(),
            totalBookings: 0,
            totalSpent: 0,
            loyaltyPoints: 0,
            referralCode: generateReferralCode(),
            loyaltyTier: 'Newbie',
        };
        await setDoc(clientRef, newClientData);
        return { id: lowerEmail, ...newClientData };
    }
};

export const getClients = async (): Promise<Client[]> => {
    try {
        const q = query(collection(db, 'clients'), orderBy('lastBooking', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<Client>(doc, ['firstBooking', 'lastBooking']));
    } catch (error) {
        console.error("Error fetching clients:", error);
        return [];
    }
};


// --- SETTINGS ---
export const getSystemSettings = async (): Promise<SystemSettings> => {
    const defaults: SystemSettings = {
        operationalHours: { weekday: { open: '09:00', close: '17:00' }, weekend: { open: '10:00', close: '16:00' } },
        featureToggles: { chatbot: true, publicFeedback: true, publicCalendar: true },
        paymentMethods: {
            qris: true,
            qrisImage: 'https://res.cloudinary.com/dazt6g3o1/image/upload/v1717316130/studio8_uploads/QRIS_S8_ix5qom.jpg',
            bankTransfer: true,
            bankAccounts: [
                { bankName: 'BNI', accountNumber: '1311025425', accountHolder: 'CV. DELAPAN KREATIF MEDIA' },
                { bankName: 'BRI', accountNumber: '010001002305567', accountHolder: 'CV. DELAPAN KREATIF MEDIA' }
            ],
            dana: true,
            danaNumber: '085724025425',
            shopeepay: true,
            shopeepayNumber: '085724025425',
        },
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
        },
        landingPageImages: {
            hero: [
                '/images/hero-1.jpg',
                '/images/hero-2.jpg',
                '/images/hero-3.jpg',
                '/images/hero-4.jpg',
                '/images/hero-5.jpg',
            ],
            about: '/images/about-1.jpg'
        }
    };

    try {
        const docRef = doc(db, 'settings', 'main');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data()) {
            const settings = docSnap.data() as SystemSettings;
            return {
                ...defaults, ...settings,
                operationalHours: { ...defaults.operationalHours, ...settings.operationalHours },
                featureToggles: { ...defaults.featureToggles, ...settings.featureToggles },
                paymentMethods: { ...defaults.paymentMethods, ...settings.paymentMethods },
                contact: { ...defaults.contact, ...settings.contact },
                loyaltySettings: { ...defaults.loyaltySettings, ...settings.loyaltySettings },
                landingPageImages: { ...defaults.landingPageImages, ...settings.landingPageImages },
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
    try {
        const q = query(collection(db, 'insights'), orderBy('date', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        return fromFirestore<Insight>(snapshot.docs[0], ['date']);
    } catch (error) {
        console.error("Error fetching latest insight:", error);
        return null;
    }
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

    await setDoc(doc(db, 'settings', 'main'), settings, { merge: true });
    await logActivity(currentUserId, `Memperbarui Pengaturan Sistem`);
    return settings;
};

// --- FEEDBACK ---
export const getFeedbacks = async (): Promise<Feedback[]> => {
    try {
        const q = query(collection(db, 'feedbacks'), orderBy('tanggal', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<Feedback>(doc, ['tanggal']));
    } catch (error) {
        console.error("Error fetching feedbacks:", error);
        return [];
    }
};

export const getPublicFeedbacks = async (): Promise<Feedback[]> => {
    try {
        const q = query(collection(db, 'feedbacks'),
            where('publish', '==', true),
            orderBy('tanggal', 'desc'),
            limit(3)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<Feedback>(doc, ['tanggal']));
    } catch (error) {
        console.error("Error fetching public feedbacks:", error);
        return [];
    }
};

export const addFeedback = async (feedbackData: Omit<Feedback, 'tanggal'>): Promise<Feedback> => {
    const data = { ...feedbackData, tanggal: serverTimestamp() };
    const docRef = await addDoc(collection(db, 'feedbacks'), data);
    const newDoc = await getDoc(docRef);
    return fromFirestore<Feedback>(newDoc, ['tanggal']);
};

export const updateFeedback = async (id: string, updates: Partial<Feedback>, currentUserId: string): Promise<Feedback> => {
    const feedbackRef = doc(db, 'feedbacks', id);
    await updateDoc(feedbackRef, updates);
    await logActivity(currentUserId, `Mengubah status feedback ${id}`);
    const updatedDoc = await getDoc(feedbackRef);
    return fromFirestore<Feedback>(updatedDoc, ['tanggal']);
};

export const deleteFeedback = async (id: string, currentUserId: string): Promise<void> => {
    const docRef = doc(db, 'feedbacks', id);
    const docToDelete = await getDoc(docRef);
    await deleteDoc(docRef);
    await logActivity(currentUserId, `Menghapus feedback ${id}`, `Dari: ${docToDelete.data()?.nama}`);
};

// --- CERTIFICATES ---
export const getCertificates = async (): Promise<Certificate[]> => {
    try {
        const q = query(collection(db, 'certificates'), orderBy('issuedDate', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<Certificate>(doc, ['issuedDate']));
    } catch (error) {
        console.error("Error fetching certificates:", error);
        return [];
    }
};

export const getCertificateById = async (id: string): Promise<Certificate | null> => {
    try {
        const docRef = doc(db, 'certificates', id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return null;
        return fromFirestore<Certificate>(docSnap, ['issuedDate']);
    } catch (error) {
        console.error("Error fetching certificate by ID:", error);
        return null;
    }
};


// --- CHAT ---

export const findOrCreateChatRoom = async (user1: User, user2: User): Promise<string> => {
    const participantIds = [user1.id, user2.id].sort();
    const roomId = participantIds.join('_');
    const roomRef = doc(db, 'chats', roomId);
    const docSnap = await getDoc(roomRef);

    if (docSnap.exists()) {
        return roomId;
    }

    const newRoom: Omit<ChatRoom, 'id'> = {
        participantIds,
        participantInfo: {
            [user1.id]: { name: user1.name, email: user1.email, photoURL: user1.photoURL || '' },
            [user2.id]: { name: user2.name, email: user2.email, photoURL: user2.photoURL || '' },
        },
        createdAt: new Date().toISOString(),
    };
    await setDoc(roomRef, newRoom);
    return roomId;
};

export const getChatRoomsForUser = (userId: string, callback: (rooms: ChatRoom[]) => void): (() => void) => {
    const q = query(collection(db, 'chats'),
        where('participantIds', 'array-contains', userId),
        orderBy('lastMessage.timestamp', 'desc')
    );
    return onSnapshot(q, snapshot => {
        const rooms = snapshot.docs.map(doc => fromFirestore<ChatRoom>(doc, ['createdAt', 'lastMessage.timestamp']));
        callback(rooms);
    }, error => {
        console.error("Error fetching chat rooms:", error);
        callback([]);
    });
};

export const getMessagesStream = (roomId: string, callback: (messages: ChatMessage[]) => void): (() => void) => {
    const q = query(collection(db, 'chats', roomId, 'messages'),
        orderBy('timestamp', 'asc')
    );
    return onSnapshot(q, snapshot => {
        const messages = snapshot.docs.map(doc => fromFirestore<ChatMessage>(doc, ['timestamp']));
        callback(messages);
    }, error => {
        console.error("Error fetching messages:", error);
        callback([]);
    });
};

export const sendMessage = async (roomId: string, senderId: string, senderName: string, text: string): Promise<void> => {
    const roomRef = doc(db, 'chats', roomId);
    const messageRef = doc(collection(roomRef, 'messages'));
    const timestamp = new Date();
    const messageData: Omit<ChatMessage, 'id'> = { senderId, senderName, text, timestamp: timestamp.toISOString() };
    const lastMessageData = { text, timestamp: timestamp.toISOString(), senderId };
    
    const batch = writeBatch(db);
    batch.set(messageRef, messageData);
    batch.update(roomRef, { lastMessage: lastMessageData });
    await batch.commit();
};

// --- HIGHLIGHT WALL ---
export const getHighlightWorks = async (): Promise<HighlightWork[]> => {
    try {
        const q = query(collection(db, 'highlightWorks'), orderBy('highlightDate', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<HighlightWork>(doc, ['highlightDate']));
    } catch (error) {
        console.error("Error fetching highlight works:", error);
        return [];
    }
};

export const getHighlightWorkById = async (id: string): Promise<HighlightWork | null> => {
    try {
        const docRef = doc(db, 'highlightWorks', id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return null;
        return fromFirestore<HighlightWork>(docSnap, ['highlightDate']);
    } catch (error) {
        console.error("Error fetching highlight work by ID:", error);
        return null;
    }
};

export const addHighlightWork = async (workData: Omit<HighlightWork, 'id'>, currentUserId: string): Promise<HighlightWork> => {
    const docRef = await addDoc(collection(db, 'highlightWorks'), workData);
    await logActivity(currentUserId, `Menambah karya highlight: ${workData.title}`);
    const newDoc = await getDoc(docRef);
    return fromFirestore<HighlightWork>(newDoc, ['highlightDate']);
};

export const updateHighlightWork = async (workId: string, updatedData: Partial<HighlightWork>, currentUserId: string): Promise<void> => {
    await updateDoc(doc(db, 'highlightWorks', workId), updatedData);
    await logActivity(currentUserId, `Mengubah karya highlight: ${updatedData.title || workId}`);
};

export const deleteHighlightWork = async (workId: string, currentUserId: string): Promise<void> => {
    const docRef = doc(db, 'highlightWorks', workId);
    const docToDelete = await getDoc(docRef);
    // In a real app, you'd also delete the media from Cloudinary here
    await deleteDoc(docRef);
    await logActivity(currentUserId, `Menghapus karya highlight: ${docToDelete.data()?.title}`);
};

export const deleteCertificate = async (certificateId: string, currentUserId: string): Promise<void> => {
    const docRef = doc(db, 'certificates', certificateId);
    const docToDelete = await getDoc(docRef);
    if (!docToDelete.exists()) return;
    try {
        await fetch('/api/assets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', publicId: `studio8_certificates/${certificateId}` })
        });
    } catch (error) {
        console.error("Failed to delete certificate from Cloudinary, but proceeding with Firestore deletion:", error);
    }
    await deleteDoc(docRef);
    await logActivity(currentUserId, `Menghapus sertifikat ${certificateId}`, `Untuk: ${docToDelete.data()?.studentName}`);
};

// ... Remaining functions will be refactored similarly
export const getPromos = async (): Promise<Promo[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'promos'));
        return snapshot.docs.map(doc => fromFirestore<Promo>(doc));
    } catch (error) {
        console.error("Error fetching promos:", error);
        return [];
    }
};

export const getInventoryItems = async (): Promise<InventoryItem[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'inventory'));
        return snapshot.docs.map(doc => fromFirestore<InventoryItem>(doc, ['lastChecked']));
    } catch (error) {
        console.error("Error fetching inventory items:", error);
        return [];
    }
};
export const updateInventoryItem = async (itemId: string, updatedData: Partial<Omit<InventoryItem, 'id'>>, currentUserId: string): Promise<InventoryItem> => {
    const itemRef = doc(db, 'inventory', itemId);
    await updateDoc(itemRef, updatedData);
    await logActivity(currentUserId, `Memperbarui item inventaris ${itemId}`);
    const updatedDoc = await getDoc(itemRef);
    return fromFirestore<InventoryItem>(updatedDoc, ['lastChecked']);
}

// ... And so on for the rest of the file
export const addPromo = async (promoData: Omit<Promo, 'id'>, currentUserId: string): Promise<Promo> => {
    const docRef = await addDoc(collection(db, 'promos'), promoData);
    await logActivity(currentUserId, `Menambah promo baru: ${promoData.code}`);
    return { ...promoData, id: docRef.id };
};
export const updatePromo = async (promoId: string, updatedData: Partial<Promo>, currentUserId: string): Promise<Promo> => {
    const promoRef = doc(db, 'promos', promoId);
    await updateDoc(promoRef, updatedData);
    await logActivity(currentUserId, `Mengubah promo ${updatedData.code}`);
    const updatedDoc = await getDoc(promoRef);
    return fromFirestore<Promo>(updatedDoc);
};
export const deletePromo = async (promoId: string, currentUserId: string): Promise<void> => {
    const docRef = doc(db, 'promos', promoId);
    const docToDelete = await getDoc(docRef);
    await deleteDoc(docRef);
    await logActivity(currentUserId, `Menghapus promo: ${docToDelete.data()?.code}`);
};
export const addInventoryItem = async (itemData: Omit<InventoryItem, 'id'>, currentUserId: string): Promise<InventoryItem> => {
    const docRef = await addDoc(collection(db, 'inventory'), itemData);
    await logActivity(currentUserId, `Menambah item inventaris: ${itemData.name}`);
    return { ...itemData, id: docRef.id };
};
export const deleteInventoryItem = async (itemId: string, currentUserId: string): Promise<void> => {
    const docRef = doc(db, 'inventory', itemId);
    const docToDelete = await getDoc(docRef);
    await deleteDoc(docRef);
    await logActivity(currentUserId, `Menghapus item inventaris: ${docToDelete.data()?.name}`);
};
export const addAddOn = async (addOn: Omit<AddOn, 'id'>, currentUserId: string): Promise<AddOn> => {
    const docRef = await addDoc(collection(db, 'addons'), addOn);
    await logActivity(currentUserId, `Menambah addon: ${addOn.name}`);
    return { ...addOn, id: docRef.id };
}
export const updateAddOn = async (addOnId: string, updatedData: Partial<AddOn>, currentUserId: string): Promise<AddOn> => {
    const addOnRef = doc(db, 'addons', addOnId);
    await updateDoc(addOnRef, updatedData);
    await logActivity(currentUserId, `Mengubah addon ${updatedData.name}`);
    const updatedDoc = await getDoc(addOnRef);
    return fromFirestore<AddOn>(updatedDoc);
}
export const deleteAddOn = async (addOnId: string, currentUserId: string): Promise<void> => {
    const docRef = doc(db, 'addons', addOnId);
    const docToDelete = await getDoc(docRef);
    await deleteDoc(docRef);
    await logActivity(currentUserId, `Menghapus addon: ${docToDelete.data()?.name}`);
}
export const addSubPackage = async (packageId: string, subPackageData: Omit<SubPackage, 'id'>, currentUserId: string): Promise<Package> => {
    const packageRef = doc(db, 'packages', packageId);
    await updateDoc(packageRef, {
        subPackages: arrayUnion({ ...subPackageData, id: `subpkg-${Date.now()}` })
    });
    await logActivity(currentUserId, `Menambah sub-paket ke ${packageId}`);
    const updatedDoc = await getDoc(packageRef);
    return fromFirestore<Package>(updatedDoc);
}
export const updateSubPackage = async (packageId: string, subPackageId: string, updatedData: Partial<SubPackage>, currentUserId: string): Promise<Package> => {
    const packageRef = doc(db, 'packages', packageId);
    const docSnap = await getDoc(packageRef);
    const pkg = fromFirestore<Package>(docSnap);
    const subPackages = (pkg.subPackages || []).map(sp => sp.id === subPackageId ? { ...sp, ...updatedData } : sp);
    await updateDoc(packageRef, { subPackages });
    await logActivity(currentUserId, `Mengubah sub-paket ${subPackageId}`);
    const updatedDoc = await getDoc(packageRef);
    return fromFirestore<Package>(updatedDoc);
}
export const deleteSubPackage = async (packageId: string, subPackageId: string, currentUserId: string): Promise<Package> => {
    const packageRef = doc(db, 'packages', packageId);
    const docSnap = await getDoc(packageRef);
    const pkg = fromFirestore<Package>(docSnap);
    const subPackages = (pkg.subPackages || []).filter(sp => sp.id !== subPackageId);
    await updateDoc(packageRef, { subPackages });
    await logActivity(currentUserId, `Menghapus sub-paket ${subPackageId}`);
    const updatedDoc = await getDoc(packageRef);
    return fromFirestore<Package>(updatedDoc);
}
export const addSubAddOn = async (addOnId: string, subAddOnData: Omit<SubAddOn, 'id'>, currentUserId: string): Promise<AddOn> => {
    const addOnRef = doc(db, 'addons', addOnId);
    await updateDoc(addOnRef, {
        subAddOns: arrayUnion({ ...subAddOnData, id: `subaddon-${Date.now()}` })
    });
    await logActivity(currentUserId, `Menambah sub-addon ke ${addOnId}`);
    const updatedDoc = await getDoc(addOnRef);
    return fromFirestore<AddOn>(updatedDoc);
}
export const updateSubAddOn = async (addOnId: string, subAddOnId: string, updatedData: Partial<SubAddOn>, currentUserId: string): Promise<AddOn> => {
    const addOnRef = doc(db, 'addons', addOnId);
    const docSnap = await getDoc(addOnRef);
    const addOn = fromFirestore<AddOn>(docSnap);
    const subAddOns = (addOn.subAddOns || []).map(sa => sa.id === subAddOnId ? { ...sa, ...updatedData } : sa);
    await updateDoc(addOnRef, { subAddOns });
    await logActivity(currentUserId, `Mengubah sub-addon ${subAddOnId}`);
    const updatedDoc = await getDoc(addOnRef);
    return fromFirestore<AddOn>(updatedDoc);
}
export const deleteSubAddOn = async (addOnId: string, subAddOnId: string, currentUserId: string): Promise<AddOn> => {
    const addOnRef = doc(db, 'addons', addOnId);
    const docSnap = await getDoc(addOnRef);
    const addOn = fromFirestore<AddOn>(docSnap);
    const subAddOns = (addOn.subAddOns || []).filter(sa => sa.id !== subAddOnId);
    await updateDoc(addOnRef, { subAddOns });
    await logActivity(currentUserId, `Menghapus sub-addon ${subAddOnId}`);
    const updatedDoc = await getDoc(addOnRef);
    return fromFirestore<AddOn>(updatedDoc);
};
export const getQuizzes = async (): Promise<Quiz[]> => {
    try {
        const q = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<Quiz>(doc, ['createdAt']));
    } catch (error) {
        console.error("Error fetching quizzes:", error);
        return [];
    }
};
export const getQuizById = async (quizId: string): Promise<Quiz | null> => {
    try {
        const docRef = doc(db, 'quizzes', quizId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? fromFirestore<Quiz>(docSnap, ['createdAt']) : null;
    } catch (error) {
        console.error("Error fetching quiz by ID:", error);
        return null;
    }
};
export const createQuiz = async (quizData: Omit<Quiz, 'id' | 'createdAt'>, currentUserId: string): Promise<Quiz> => {
    const data = { ...quizData, createdAt: new Date().toISOString() };
    const docRef = await addDoc(collection(db, 'quizzes'), data);
    await logActivity(currentUserId, `Membuat kuis baru: ${quizData.title}`);
    const newDoc = await getDoc(docRef);
    return fromFirestore<Quiz>(newDoc, ['createdAt']);
};
export const updateQuiz = async (quizId: string, updatedData: Partial<Quiz>, currentUserId: string): Promise<void> => {
    await updateDoc(doc(db, 'quizzes', quizId), updatedData);
    await logActivity(currentUserId, `Mengubah kuis: ${updatedData.title || quizId}`);
};
export const deleteQuiz = async (quizId: string, currentUserId: string): Promise<void> => {
    const docRef = doc(db, 'quizzes', quizId);
    const docSnap = await getDoc(docRef);
    await deleteDoc(docRef);
    await logActivity(currentUserId, `Menghapus kuis: ${docSnap.data()?.title}`);
};
export const submitQuizResult = async (resultData: Omit<QuizResult, 'id' | 'submittedAt'>): Promise<string> => {
    const data = { ...resultData, submittedAt: new Date().toISOString() };
    const docRef = await addDoc(collection(db, 'quiz_results'), data);
    return docRef.id;
};
export const getQuizResultById = async (resultId: string): Promise<QuizResult | null> => {
    try {
        const docRef = doc(db, 'quiz_results', resultId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? fromFirestore<QuizResult>(docSnap, ['submittedAt']) : null;
    } catch (error) {
        console.error("Error fetching quiz result by ID:", error);
        return null;
    }
};
export const getQuizResultsForStudent = async (studentId: string): Promise<QuizResult[]> => {
    try {
        const q = query(collection(db, 'quiz_results'), where('studentId', '==', studentId), orderBy('submittedAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<QuizResult>(doc, ['submittedAt']));
    } catch (error) {
        console.error("Error fetching quiz results for student:", error);
        return [];
    }
};
export const getWeeklyQuizResults = async (): Promise<QuizResult[]> => {
    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const q = query(collection(db, 'quiz_results'), where('submittedAt', '>=', oneWeekAgo.toISOString()));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<QuizResult>(doc, ['submittedAt']));
    } catch (error) {
        console.error("Error fetching weekly quiz results:", error);
        return [];
    }
};
export const getPracticalClasses = async (): Promise<PracticalClass[]> => {
    try {
        const q = query(collection(db, 'practicalClasses'), orderBy('classDate', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<PracticalClass>(doc, ['classDate']));
    } catch (error) {
        console.error("Error fetching practical classes:", error);
        return [];
    }
};
export const createPracticalClass = async (classData: Omit<PracticalClass, 'id'>, currentUserId: string): Promise<PracticalClass> => {
    const docRef = await addDoc(collection(db, 'practicalClasses'), classData);
    await logActivity(currentUserId, `Membuat kelas praktek: ${classData.topic}`);
    const newDoc = await getDoc(docRef);
    return fromFirestore<PracticalClass>(newDoc, ['classDate']);
};
export const deletePracticalClass = async (classId: string, currentUserId: string): Promise<void> => {
    const docRef = doc(db, 'practicalClasses', classId);
    const docSnap = await getDoc(docRef);
    await deleteDoc(docRef);
    await logActivity(currentUserId, `Menghapus kelas praktek: ${docSnap.data()?.topic}`);
};
export const registerForClass = async (classId: string, internId: string): Promise<void> => {
    const classRef = doc(db, 'practicalClasses', classId);
    await updateDoc(classRef, { registeredInternIds: arrayUnion(internId) });
};
export const unregisterFromClass = async (classId: string, internId: string): Promise<void> => {
    const classRef = doc(db, 'practicalClasses', classId);
    await updateDoc(classRef, { registeredInternIds: arrayRemove(internId) });
};
export const getAssets = async (): Promise<Asset[]> => {
    try {
        const q = query(collection(db, 'assets'), orderBy('uploadedAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<Asset>(doc, ['uploadedAt']));
    } catch (error) {
        console.error("Error fetching assets:", error);
        return [];
    }
};
export const addAsset = async (assetData: Omit<Asset, 'id'>, currentUserId: string): Promise<Asset> => {
    const docRef = await addDoc(collection(db, 'assets'), assetData);
    await logActivity(currentUserId, `Mengunggah aset: ${assetData.fileName}`);
    const newDoc = await getDoc(docRef);
    return fromFirestore<Asset>(newDoc, ['uploadedAt']);
};
export const getForumThreads = async (): Promise<ForumThread[]> => {
    try {
        const q = query(collection(db, 'forumThreads'), orderBy('lastReplyAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<ForumThread>(doc, ['createdAt', 'lastReplyAt']));
    } catch (error) {
        console.error("Error fetching forum threads:", error);
        return [];
    }
};
export const getForumThreadById = async (threadId: string): Promise<ForumThread | null> => {
    try {
        const docRef = doc(db, 'forumThreads', threadId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? fromFirestore<ForumThread>(docSnap, ['createdAt', 'lastReplyAt']) : null;
    } catch (error) {
        console.error("Error fetching forum thread by ID:", error);
        return null;
    }
};
export const addForumThread = async (threadData: Omit<ForumThread, 'id' | 'createdAt' | 'replyCount' | 'lastReplyAt'>): Promise<ForumThread> => {
    const now = new Date().toISOString();
    const data = { ...threadData, createdAt: now, lastReplyAt: now, replyCount: 0 };
    const docRef = await addDoc(collection(db, 'forumThreads'), data);
    const newDoc = await getDoc(docRef);
    return fromFirestore<ForumThread>(newDoc, ['createdAt', 'lastReplyAt']);
};
export const getRepliesForThread = (threadId: string, callback: (replies: ForumReply[]) => void): (() => void) => {
    const q = query(collection(db, 'forumThreads', threadId, 'replies'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, snapshot => callback(snapshot.docs.map(doc => fromFirestore<ForumReply>(doc, ['createdAt']))));
};
export const addReplyToThread = async (threadId: string, replyData: Omit<ForumReply, 'id' | 'threadId' | 'createdAt'>): Promise<void> => {
    const threadRef = doc(db, 'forumThreads', threadId);
    const replyRef = doc(collection(threadRef, 'replies'));
    const now = new Date().toISOString();
    const batch = writeBatch(db);
    batch.set(replyRef, { ...replyData, threadId, createdAt: now });
    batch.update(threadRef, { replyCount: increment(1), lastReplyAt: now });
    await batch.commit();
};
export const getJobPosts = async (): Promise<JobPost[]> => {
    try {
        const q = query(collection(db, 'jobPosts'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<JobPost>(doc, ['createdAt']));
    } catch (error) {
        console.error("Error fetching job posts:", error);
        return [];
    }
};
export const addJobPost = async (jobData: Omit<JobPost, 'id' | 'createdAt'>): Promise<JobPost> => {
    const data = { ...jobData, createdAt: new Date().toISOString() };
    const docRef = await addDoc(collection(db, 'jobPosts'), data);
    const newDoc = await getDoc(docRef);
    return fromFirestore<JobPost>(newDoc, ['createdAt']);
};
export const getEvents = async (): Promise<CommunityEvent[]> => {
    try {
        const q = query(collection(db, 'communityEvents'), orderBy('eventDate', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => fromFirestore<CommunityEvent>(doc, ['createdAt', 'eventDate']));
    } catch (error) {
        console.error("Error fetching events:", error);
        return [];
    }
};
export const addEvent = async (eventData: Omit<CommunityEvent, 'id' | 'createdAt'>): Promise<CommunityEvent> => {
    const data = { ...eventData, createdAt: new Date().toISOString() };
    const docRef = await addDoc(collection(db, 'communityEvents'), data);
    const newDoc = await getDoc(docRef);
    return fromFirestore<CommunityEvent>(newDoc, ['createdAt', 'eventDate']);
};


import { Feedback } from '../types';
// FIX: Removed incorrect import from 'constants.ts' which caused a module error. The mock data is now defined below.
import { logActivity } from './api';

const FEEDBACK_KEY = 'studio8_feedbacks';

// FIX: Added FEEDBACKS constant locally to make this file self-contained and fix the import error.
const FEEDBACKS: Feedback[] = [
    {
        id: 'S8-ABCDE',
        nama: 'Alice J.',
        rating: 5,
        komentar: 'Hasil fotonya bagus banget, melebihi ekspektasi! Fotografernya ramah dan bisa mengarahkan gaya dengan baik. Studionya juga bersih dan nyaman. Recommended!',
        // FIX: Changed ISO string to Date object to match Feedback type.
        tanggal: new Date(new Date().setDate(new Date().getDate() - 1)),
        publish: true,
    },
    {
        id: 'S8-PQRST',
        nama: 'Diana P.',
        rating: 5,
        komentar: 'Sesi foto keluarga jadi menyenangkan di Studio 8. Anak-anak enjoy banget dan hasilnya memuaskan. Proses booking sampai selesai sesi semuanya lancar. Terima kasih!',
        // FIX: Changed ISO string to Date object to match Feedback type.
        tanggal: new Date(new Date().setDate(new Date().getDate() - 4)),
        publish: true,
    },
    {
        id: 'S8-XYZ12',
        nama: 'Samuel L.',
        rating: 4,
        komentar: 'Pengalaman yang baik. Kualitas foto bagus dan staffnya membantu. Mungkin bisa ditambahkan pilihan properti foto yang lebih beragam lagi.',
        // FIX: Changed ISO string to Date object to match Feedback type.
        tanggal: new Date(new Date().setDate(new Date().getDate() - 10)),
        publish: false, // This one won't be shown publicly
    }
];

// Helper to get data from localStorage
const getStoredFeedbacks = (): Feedback[] => {
    try {
        const data = localStorage.getItem(FEEDBACK_KEY);
        if (!data) return [];
        // FIX: Parse date strings from localStorage back into Date objects.
        const feedbacksFromStorage: any[] = JSON.parse(data);
        return feedbacksFromStorage.map(fb => ({
            ...fb,
            tanggal: new Date(fb.tanggal),
        }));
    } catch (error) {
        console.error("Error parsing feedbacks from localStorage:", error);
        return [];
    }
};

// Helper to set data to localStorage
const setStoredFeedbacks = (feedbacks: Feedback[]): void => {
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedbacks));
};

// Seed initial data if none exists
(() => {
    if (!localStorage.getItem(FEEDBACK_KEY)) {
        setStoredFeedbacks(FEEDBACKS);
    }
})();

export const getFeedbacks = async (): Promise<Feedback[]> => {
    await new Promise(res => setTimeout(res, 200)); // Simulate delay
    return getStoredFeedbacks().sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime());
};

export const addFeedback = async (feedbackData: Omit<Feedback, 'tanggal' | 'publish'> & { publish: boolean; }): Promise<Feedback> => {
    const feedbacks = getStoredFeedbacks();
    const newFeedback: Feedback = {
        ...feedbackData,
        // FIX: Changed ISO string to Date object to match Feedback type.
        tanggal: new Date(),
    };
    feedbacks.push(newFeedback);
    setStoredFeedbacks(feedbacks);
    await new Promise(res => setTimeout(res, 500)); // Simulate delay
    return newFeedback;
};

export const updateFeedback = async (id: string, updates: Partial<Feedback>, currentUserId: string): Promise<Feedback | null> => {
    let feedbacks = getStoredFeedbacks();
    let updatedFeedback: Feedback | null = null;
    const originalFeedback = feedbacks.find(fb => fb.id === id);

    feedbacks = feedbacks.map(fb => {
        if (fb.id === id) {
            updatedFeedback = { ...fb, ...updates };
            return updatedFeedback;
        }
        return fb;
    });
    setStoredFeedbacks(feedbacks);

    if (originalFeedback && updatedFeedback) {
        if (originalFeedback.publish !== updatedFeedback.publish) {
            const status = updatedFeedback.publish ? 'menampilkan' : 'menyembunyikan';
            await logActivity(currentUserId, `Mengubah status feedback ${originalFeedback.id}`, `Admin ${status} ulasan dari ${originalFeedback.nama}.`);
        }
    }

    await new Promise(res => setTimeout(res, 200)); // Simulate delay
    return updatedFeedback;
};

export const deleteFeedback = async (id: string, currentUserId: string): Promise<boolean> => {
    let feedbacks = getStoredFeedbacks();
    const feedbackToDelete = feedbacks.find(fb => fb.id === id);
    if (!feedbackToDelete) return false;

    const initialLength = feedbacks.length;
    feedbacks = feedbacks.filter(fb => fb.id !== id);
    if (feedbacks.length < initialLength) {
        setStoredFeedbacks(feedbacks);
        await logActivity(currentUserId, `Menghapus feedback ${feedbackToDelete.id}`, `Menghapus ulasan dari ${feedbackToDelete.nama}.`);
        await new Promise(res => setTimeout(res, 200)); // Simulate delay
        return true;
    }
    return false;
};

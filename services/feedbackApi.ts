import { Feedback } from '../types';
import { logActivity } from './api';

const FEEDBACK_KEY = 'studio8_feedbacks';

const FEEDBACKS: Feedback[] = [
  {
    id: 'S8-ABCDE',
    nama: 'Alice J.',
    rating: 5,
    komentar: 'Hasil fotonya bagus banget, melebihi ekspektasi! Fotografernya ramah dan bisa mengarahkan gaya dengan baik. Studionya juga bersih dan nyaman. Recommended!',
    tanggal: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
    publish: true,
  },
  {
    id: 'S8-PQRST',
    nama: 'Diana P.',
    rating: 5,
    komentar: 'Sesi foto keluarga jadi menyenangkan di Studio 8. Anak-anak enjoy banget dan hasilnya memuaskan. Proses booking sampai selesai sesi semuanya lancar. Terima kasih!',
    tanggal: new Date(new Date().setDate(new Date().getDate() - 4)).toISOString(),
    publish: true,
  },
  {
    id: 'S8-XYZ12',
    nama: 'Samuel L.',
    rating: 4,
    komentar: 'Pengalaman yang baik. Kualitas foto bagus dan staffnya membantu. Mungkin bisa ditambahkan pilihan properti foto yang lebih beragam lagi.',
    tanggal: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(),
    publish: false,
  }
];

// Helper: ambil dari localStorage
const getStoredFeedbacks = (): Feedback[] => {
  try {
    const data = localStorage.getItem(FEEDBACK_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error("Error parsing feedbacks from localStorage:", error);
    return [];
  }
};

// Helper: simpan ke localStorage
const setStoredFeedbacks = (feedbacks: Feedback[]): void => {
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedbacks));
};

// Seed initial data
(() => {
  if (!localStorage.getItem(FEEDBACK_KEY)) {
    setStoredFeedbacks(FEEDBACKS);
  }
})();

export const getFeedbacks = async (): Promise<Feedback[]> => {
  await new Promise(res => setTimeout(res, 200));
  const feedbacks = getStoredFeedbacks();
  // ✅ Convert to Date only saat sorting
  return feedbacks.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
};

export const addFeedback = async (
  feedbackData: Omit<Feedback, 'tanggal' | 'publish'> & { publish: boolean; }
): Promise<Feedback> => {
  const feedbacks = getStoredFeedbacks();
  const newFeedback: Feedback = {
    ...feedbackData,
    tanggal: new Date().toISOString(), // ✅ fix
  };
  feedbacks.push(newFeedback);
  setStoredFeedbacks(feedbacks);
  await new Promise(res => setTimeout(res, 500));
  return newFeedback;
};

export const updateFeedback = async (
  id: string,
  updates: Partial<Feedback>,
  currentUserId: string
): Promise<Feedback | null> => {
  let feedbacks = getStoredFeedbacks();
  
  const originalFeedback = feedbacks.find((fb) => fb.id === id);

  feedbacks = feedbacks.map((fb) => {
    if (fb.id === id) {
      return { ...fb, ...updates };
    }
    return fb;
  });

  setStoredFeedbacks(feedbacks);

  // ✅ Ambil updatedFeedback setelah update
  const updatedFeedback = feedbacks.find((fb) => fb.id === id);

  // ✅ Check keduanya ada
  if (originalFeedback && updatedFeedback) {
    const originalPub = Boolean(originalFeedback.publish);
    const updatedPub = Boolean(updatedFeedback.publish);

    if (originalPub !== updatedPub) {
      const status = updatedPub ? 'menampilkan' : 'menyembunyikan';
      await logActivity(
        currentUserId,
        `Mengubah status feedback ${originalFeedback.id}`,
        `Admin ${status} ulasan dari ${originalFeedback.nama}.`
      );
    }
  }

  await new Promise(res => setTimeout(res, 200));
  return updatedFeedback ?? null;
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
    await new Promise(res => setTimeout(res, 200));
    return true;
  }
  return false;
};

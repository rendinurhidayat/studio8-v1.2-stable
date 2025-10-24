import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { addFeedback } from '../services/api';
import StarRating from '../components/feedback/StarRating';
import { User, FileText, MessageSquare, CheckCircle, Loader2 } from 'lucide-react';

const FeedbackPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [nama, setNama] = useState('');
    const [bookingId, setBookingId] = useState('');
    const [rating, setRating] = useState(0);
    const [komentar, setKomentar] = useState('');
    const [publish, setPublish] = useState(true);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    
    const idFromUrl = searchParams.get('bookingId');

    useEffect(() => {
        if (idFromUrl) {
            setBookingId(idFromUrl);
        }
    }, [idFromUrl]);

    useEffect(() => {
        if (isSubmitted) {
            const timer = setTimeout(() => {
                navigate('/'); // Redirect to home page after 3 seconds
            }, 3000);

            return () => clearTimeout(timer); // Cleanup timer if component unmounts
        }
    }, [isSubmitted, navigate]);


    const validateField = (field: 'nama' | 'bookingId' | 'rating' | 'komentar', value: string | number): boolean => {
        let error = '';
        switch(field) {
            case 'nama':
                if (typeof value === 'string' && !value.trim()) error = "Nama tidak boleh kosong.";
                break;
            case 'bookingId':
                if (typeof value === 'string' && !value.trim()) error = "ID Booking tidak boleh kosong.";
                break;
            case 'rating':
                if (value === 0) error = "Beri kami rating bintang ya.";
                break;
            case 'komentar':
                 if (typeof value === 'string' && value.trim().length < 20) {
                    error = `Komentar minimal 20 karakter. (${value.trim().length}/20)`;
                }
                break;
        }
        setErrors(prev => ({...prev, [field]: error }));
        return !error;
    };
    
    const validateAll = (): boolean => {
        const isNamaValid = validateField('nama', nama);
        const isBookingIdValid = validateField('bookingId', bookingId);
        const isRatingValid = validateField('rating', rating);
        const isKomentarValid = validateField('komentar', komentar);
        return isNamaValid && isBookingIdValid && isRatingValid && isKomentarValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateAll()) return;
        
        setIsSubmitting(true);
        try {
            await addFeedback({
                id: bookingId,
                nama,
                rating,
                komentar,
                publish,
            });
            setIsSubmitted(true);
        } catch (err) {
            console.error("Submission failed", err);
            // Here you could set an API error message
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#e5e7eb] p-4" style={{ background: '#f8f9fa' }}>
            <main className="w-full max-w-2xl">
                <AnimatePresence mode="wait">
                    {!isSubmitted ? (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="text-center mb-8">
                                <h1 className="text-4xl md:text-5xl font-bold text-[#0a1d37]">
                                    Bagaimana pengalamanmu di Studio 8? 💙
                                </h1>
                                <p className="mt-3 text-gray-600">
                                    Ulasanmu sangat berarti untuk kami menjadi lebih baik.
                                </p>
                            </div>

                            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
                                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label htmlFor="nama" className="block text-sm font-semibold text-gray-700 mb-1">Nama</label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                                                <input id="nama" type="text" value={nama} 
                                                    onChange={e => {
                                                        setNama(e.target.value);
                                                        if (errors.nama) validateField('nama', e.target.value);
                                                    }}
                                                    onBlur={e => validateField('nama', e.target.value)}
                                                    placeholder="Nama kamu" className={`w-full pl-10 pr-3 py-2.5 border rounded-lg transition-all duration-300 ease-in-out ${errors.nama ? 'border-red-500' : 'border-gray-300 focus:border-[#0a1d37] focus:ring-1 focus:ring-[#0a1d37]'}`} />
                                            </div>
                                            {errors.nama && <p className="text-xs text-red-500 mt-1">{errors.nama}</p>}
                                        </div>
                                        <div>
                                            <label htmlFor="bookingId" className="block text-sm font-semibold text-gray-700 mb-1">ID Booking</label>
                                             <div className="relative">
                                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                                                <input id="bookingId" type="text" value={bookingId} 
                                                    onChange={e => {
                                                        setBookingId(e.target.value);
                                                        if (errors.bookingId) validateField('bookingId', e.target.value);
                                                    }}
                                                    onBlur={e => validateField('bookingId', e.target.value)}
                                                    readOnly={!!idFromUrl} placeholder="Contoh: S8-ABCDE" className={`w-full pl-10 pr-3 py-2.5 border rounded-lg transition-all duration-300 ease-in-out ${errors.bookingId ? 'border-red-500' : 'border-gray-300 focus:border-[#0a1d37] focus:ring-1 focus:ring-[#0a1d37]'} ${!!idFromUrl ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
                                            </div>
                                            {errors.bookingId && <p className="text-xs text-red-500 mt-1">{errors.bookingId}</p>}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Rating</label>
                                        <StarRating value={rating} onChange={(r) => {
                                            setRating(r);
                                            validateField('rating', r);
                                        }} size={32} isEditable={true} />
                                        {errors.rating && <p className="text-xs text-red-500 mt-1">{errors.rating}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="komentar" className="block text-sm font-semibold text-gray-700 mb-1">Komentar</label>
                                        <div className="relative">
                                            <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400"/>
                                            <textarea id="komentar" value={komentar} 
                                                onChange={e => {
                                                    setKomentar(e.target.value);
                                                    validateField('komentar', e.target.value);
                                                }}
                                                onBlur={e => validateField('komentar', e.target.value)}
                                                rows={5} placeholder="Ceritakan pengalamanmu di sini..." className={`w-full pl-10 pr-3 py-2.5 border rounded-lg transition-all duration-300 ease-in-out ${errors.komentar ? 'border-red-500' : 'border-gray-300 focus:border-[#0a1d37] focus:ring-1 focus:ring-[#0a1d37]'}`}></textarea>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            {errors.komentar ? 
                                                <p className="text-xs text-red-500 mt-1">{errors.komentar}</p>
                                                : <div /> 
                                            }
                                            <p className={`text-xs text-right mt-1 ${komentar.trim().length < 20 ? 'text-gray-400' : 'text-green-600'}`}>
                                                {komentar.trim().length}/20
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <input id="publish" type="checkbox" checked={publish} onChange={e => setPublish(e.target.checked)} className="h-4 w-4 text-[#1d4ed8] border-gray-300 rounded focus:ring-[#1d4ed8]"/>
                                        <label htmlFor="publish" className="ml-2 block text-sm text-gray-700">Izinkan tampilkan feedback ini di halaman publik.</label>
                                    </div>
                                    <div>
                                        <button type="submit" disabled={isSubmitting} className="w-full bg-[#0a1d37] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#1d4ed8] transition-all duration-300 ease-in-out flex items-center justify-center disabled:opacity-50">
                                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Kirim Feedback'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                            className="bg-white p-12 rounded-xl shadow-lg border border-gray-200 text-center"
                        >
                            <CheckCircle className="w-16 h-16 mx-auto text-green-500"/>
                            <h2 className="mt-4 text-3xl font-bold text-[#0a1d37]">Terima kasih atas feedback-nya! 🥰</h2>
                            <p className="mt-2 text-gray-600">Ulasan Anda membantu kami tumbuh lebih baik. Anda akan diarahkan kembali...</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default FeedbackPage;
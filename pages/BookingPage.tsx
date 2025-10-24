
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import BookingForm from '../components/client/BookingForm';
import { Camera, HelpCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../components/common/Modal';

const faqs = [
    {
        q: "Berapa DP (Uang Muka) yang harus saya bayar?",
        a: "Anda hanya perlu membayar DP sebesar Rp 35.000 untuk mengamankan jadwal sesi Anda. Sisa pembayaran dilunasi di studio."
    },
    {
        q: "Bagaimana jika saya ingin membatalkan booking?",
        a: "Pembatalan yang dilakukan lebih dari 24 jam (H-1) sebelum sesi akan mendapatkan pengembalian DP penuh. Pembatalan dalam 24 jam terakhir akan menyebabkan DP hangus."
    },
    {
        q: "Bisakah saya mengubah jadwal (reschedule) sesi saya?",
        a: "Tentu! Anda bisa mengajukan reschedule maksimal 7 hari (H-7) sebelum jadwal sesi melalui halaman 'Cek Status' menggunakan kode booking Anda."
    },
    {
        q: "Metode pembayaran apa saja yang tersedia?",
        a: "Kami menerima pembayaran melalui QRIS, Transfer Bank (BNI & BRI), Dana, dan Shopeepay."
    },
    {
        q: "Apa yang saya dapatkan dari sesi foto?",
        a: "Anda akan mendapatkan semua file foto digital (soft file) yang diambil selama sesi. Untuk paket tertentu, ada bonus foto editan sesuai deskripsi paket."
    }
];

const FAQModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Frequently Asked Questions (FAQ)">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {faqs.map((faq, index) => (
                <div key={index} className="border-b border-base-200 pb-3 last:border-b-0">
                    <h4 className="font-semibold text-base-content">{faq.q}</h4>
                    <p className="text-sm text-muted mt-1">{faq.a}</p>
                </div>
            ))}
        </div>
    </Modal>
  );
};


const BookingPage = () => {
  const [isFaqOpen, setIsFaqOpen] = useState(false);

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl w-full mx-auto">
            <div className="text-center">
                <Link to="/" className="inline-block">
                    <Camera className="mx-auto h-12 w-12 text-accent hover:text-accent/80 transition-colors" />
                </Link>
                <h1 className="mt-4 text-4xl font-extrabold text-primary">
                    Booking Sesi di <span className="text-base-content">Studio 8</span>
                </h1>
                <p className="mt-2 text-md text-muted">
                    Selangkah lagi menuju momen tak terlupakan. Isi data di bawah ya!
                </p>
            </div>
            <BookingForm />
            <footer className="text-center mt-8">
                <p className="text-sm text-muted">
                    Ingin memeriksa status pesanan Anda?{' '}
                    <Link to="/cek-status" className="font-medium text-accent hover:underline">
                        Cek Status
                    </Link>
                </p>
            </footer>
        </div>

        {/* FAQ Floating Button */}
        <button
            onClick={() => setIsFaqOpen(true)}
            className="fixed bottom-6 right-6 bg-primary text-primary-content p-4 rounded-full shadow-xl hover:bg-primary/90 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            title="Butuh Bantuan? (FAQ)"
        >
            <HelpCircle size={24} />
        </button>
        <FAQModal isOpen={isFaqOpen} onClose={() => setIsFaqOpen(false)} />
    </div>
  );
};

export default BookingPage;
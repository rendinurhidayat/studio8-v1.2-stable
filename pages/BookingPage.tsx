
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import BookingForm from '../components/client/BookingForm';
import InstitutionalBookingForm from '../components/client/InstitutionalBookingForm';
import SponsorshipForm from '../components/client/SponsorshipForm';
import { Camera, HelpCircle, User, Briefcase, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../components/common/Modal';

type FormType = 'individual' | 'institutional' | 'sponsorship';

const faqs = [
    {
        q: "Berapa DP (Uang Muka) yang harus saya bayar?",
        a: "Untuk sesi individual, Anda hanya perlu membayar DP sebesar Rp 35.000 untuk mengamankan jadwal. Untuk booking institusi, skema pembayaran (DP/Lunas/Termin) akan didiskusikan lebih lanjut setelah permintaan Anda kami terima."
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

const BookingTypeSelector: React.FC<{ selected: FormType, onSelect: (type: FormType) => void }> = ({ selected, onSelect }) => {
    const types = [
        { id: 'individual', label: 'Sesi Individu', icon: <User size={20}/> },
        { id: 'institutional', label: 'Grup / Instansi', icon: <Briefcase size={20}/> },
        { id: 'sponsorship', label: 'Sponsor / Partner', icon: <Award size={20}/> }
    ] as const;

    return (
        <div className="bg-base-200 p-2 rounded-xl flex items-center gap-2 max-w-lg mx-auto">
            {types.map(type => (
                <button
                    key={type.id}
                    onClick={() => onSelect(type.id)}
                    className={`flex-1 px-4 py-3 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${selected === type.id ? 'bg-white text-primary shadow-md' : 'text-muted hover:bg-white/50'}`}
                >
                    {type.icon}
                    <span className="hidden sm:inline">{type.label}</span>
                </button>
            ))}
        </div>
    );
};

const BookingPage = () => {
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [formType, setFormType] = useState<FormType>('individual');

  const formContent = {
      individual: {
          title: "Booking Sesi di Studio 8",
          description: "Selangkah lagi menuju momen tak terlupakan. Isi data di bawah ya!",
          component: <BookingForm />
      },
      institutional: {
          title: "Booking untuk Grup & Instansi",
          description: "Ajukan pemesanan untuk acara sekolah, kampus, atau perusahaan Anda.",
          component: <InstitutionalBookingForm />
      },
      sponsorship: {
          title: "Ajukan Kerjasama & Sponsorship",
          description: "Mari berkolaborasi! Kirimkan proposal kerjasama atau sponsorship Anda.",
          component: <SponsorshipForm />
      }
  };

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl w-full mx-auto">
            <div className="text-center">
                <Link to="/" className="inline-block">
                    <Camera className="mx-auto h-12 w-12 text-accent hover:text-accent/80 transition-colors" />
                </Link>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={formType}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.3 }}
                    >
                        <h1 className="mt-4 text-4xl font-extrabold text-primary">
                           {formContent[formType].title}
                        </h1>
                        <p className="mt-2 text-md text-muted max-w-xl mx-auto">
                           {formContent[formType].description}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="mt-8">
                <BookingTypeSelector selected={formType} onSelect={setFormType} />
            </div>

            <AnimatePresence mode="wait">
                 <motion.div
                    key={formType}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                 >
                    {formContent[formType].component}
                </motion.div>
            </AnimatePresence>

            <footer className="text-center mt-8">
                <p className="text-sm text-muted">
                    Ingin memeriksa status pesanan Anda?{' '}
                    <Link to="/cek-status" className="font-medium text-accent hover:underline">
                        Cek Status
                    </Link>
                </p>
            </footer>
        </div>

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

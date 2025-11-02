
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Booking, BookingStatus, Client, SystemSettings } from '../types';
import { findBookingByCode, requestReschedule, isSlotAvailable, getClientDetails } from '../services/api';
import { Home, Calendar, Clock, CheckCircle, AlertCircle, Loader2, Download, Star, Award, Copy, Search, X, ClipboardList, CalendarCheck, Sparkles, MessageSquare, Check, MapPin, Lightbulb, Repeat, BookOpen, User } from 'lucide-react';
import Modal from '../components/common/Modal';
import ChatbotModal from '../components/common/ChatbotModal';
import { useSystemSettings } from '../App';
import { motion, AnimatePresence } from 'framer-motion';
// FIX: Use named imports for date-fns functions
import { format, isBefore, startOfToday } from 'date-fns';
import id from 'date-fns/locale/id';


const RescheduleModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newDate: Date) => void;
  booking: Booking;
  settings: SystemSettings | null;
}> = ({ isOpen, onClose, onSubmit, booking, settings }) => {
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const { minTime, maxTime } = useMemo(() => {
    if (!settings || !newDate) return { minTime: '09:00', maxTime: '17:00' };
    
    const selectedDate = new Date(newDate);
    const day = selectedDate.getDay(); // 0 for Sunday, 6 for Saturday
    const isWeekend = day === 0 || day === 6;
    
    const hours = isWeekend ? settings.operationalHours.weekend : settings.operationalHours.weekday;
    return { minTime: hours.open, maxTime: hours.close };
  }, [settings, newDate]);


  const handleSubmit = async () => {
    setError('');
    if (!newDate || !newTime) {
      setError('Tanggal dan waktu baru harus diisi.');
      return;
    }

    const combinedDateTime = new Date(`${newDate}T${newTime}`);
    if (isBefore(combinedDateTime, new Date())) {
        setError('Tanggal dan waktu tidak boleh di masa lalu.');
        return;
    }

    setIsChecking(true);
    
    const available = await isSlotAvailable(combinedDateTime, booking.id);
    if (!available) {
        setError('Jadwal yang dipilih tidak tersedia. Silakan pilih tanggal atau jam lain.');
        setIsChecking(false);
        return;
    }
    
    setIsChecking(false);
    onSubmit(combinedDateTime);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajukan Jadwal Ulang">
      <p className="text-sm text-gray-600 mb-4">Pilih tanggal dan waktu baru untuk sesi Anda. Pengajuan akan ditinjau oleh admin kami.</p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Tanggal Baru</label>
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            min={format(startOfToday(), 'yyyy-MM-dd')}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Waktu Baru</label>
           <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"
            min={minTime}
            max={maxTime}
          />
        </div>
        {error && <p className="text-xs text-red-500 flex items-center gap-1 mt-2"><AlertCircle size={14}/>{error}</p>}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Batal</button>
        <button type="button" onClick={handleSubmit} disabled={isChecking} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 w-24 flex justify-center">
            {isChecking ? <Loader2 className="animate-spin"/> : 'Ajukan'}
        </button>
      </div>
    </Modal>
  );
};

const RECENT_SEARCHES_KEY = 'studio8_recent_booking_searches';

const TrackingTimeline: React.FC<{ booking: Booking }> = ({ booking }) => {
    const getStageIndex = (status: BookingStatus) => {
        switch (status) {
            case BookingStatus.Pending: return 0;
            case BookingStatus.RescheduleRequested: return 1;
            case BookingStatus.Confirmed: return 1;
            case BookingStatus.InProgress: return 2;
            case BookingStatus.Completed: return 3;
            case BookingStatus.Cancelled: return -1;
            default: return 0;
        }
    };

    const stageIndex = getStageIndex(booking.bookingStatus);
    
    const steps = [
        { icon: <ClipboardList size={20}/>, title: "Booking Diterima", description: "Permintaan booking Anda telah kami terima dan sedang menunggu konfirmasi pembayaran DP.", timestamp: booking.createdAt },
        { icon: <CalendarCheck size={20}/>, title: "Jadwal Terkonfirmasi", description: `Pembayaran DP berhasil! Sesi foto Anda sudah kami amankan. Sampai jumpa!` },
        { icon: <Sparkles size={20}/>, title: "Sesi & Proses Editing", description: "Sesi foto Anda sedang berlangsung atau dalam proses editing oleh tim profesional kami." },
        { icon: <CheckCircle size={20}/>, title: "Selesai & Siap Diunduh", description: "Hore! Hasil foto Anda sudah siap diunduh melalui bagian 'Akses Cepat'." },
    ];
    
    if (booking.bookingStatus === BookingStatus.Cancelled) {
        return <div className="p-4 bg-error/10 text-error rounded-lg text-center font-semibold">Booking ini telah dibatalkan.</div>
    }

    return (
        <div className="bg-white rounded-2xl shadow-lg border p-6">
             <h4 className="font-bold text-lg text-primary mb-4">Progres Booking</h4>
            <ol className="relative border-l-2 border-base-200 ml-4">
                {steps.map((step, index) => {
                    const isActive = index === stageIndex;
                    const isCompleted = index < stageIndex;
                    
                    return (
                        <li key={index} className="mb-10 ml-8">
                            <span className={`absolute flex items-center justify-center w-8 h-8 rounded-full -left-4 ring-4 ring-white transition-colors
                                ${isActive ? 'bg-primary text-primary-content animate-pulse' : isCompleted ? 'bg-success text-white' : 'bg-base-200 text-muted'}`}
                            >
                                {step.icon}
                            </span>
                            <div className="p-4 bg-base-100 rounded-lg border">
                                <h3 className="font-semibold text-primary">{step.title}</h3>
                                {step.timestamp && !isCompleted && <time className="block mb-2 text-xs font-normal leading-none text-muted">Dibuat pada {format(new Date(step.timestamp), 'd MMM yyyy, HH:mm', { locale: id })}</time>}
                                <p className="text-sm text-muted">{step.description}</p>
                            </div>
                        </li>
                    )
                })}
            </ol>
        </div>
    );
};

// --- NEW COMPONENTS ---

const BookingSummaryCard: React.FC<{ booking: Booking }> = ({ booking }) => (
    <div className="bg-white rounded-2xl shadow-lg border p-6 space-y-4">
        <div className="text-center pb-4 border-b">
            <h3 className="font-bold text-lg text-primary">Ringkasan Booking</h3>
            <p className="font-mono text-accent">{booking.bookingCode}</p>
        </div>
        <div className="flex items-center gap-3"><User size={18} className="text-muted"/> <span className="font-semibold">{booking.clientName}</span></div>
        <div className="flex items-center gap-3"><BookOpen size={18} className="text-muted"/> <span className="font-semibold">{booking.package.name} ({booking.selectedSubPackage.name})</span></div>
        <div className="flex items-center gap-3"><Calendar size={18} className="text-muted"/> <span className="font-semibold">{format(new Date(booking.bookingDate), 'eeee, d MMMM yyyy', { locale: id })}</span></div>
        <div className="flex items-center gap-3"><Clock size={18} className="text-muted"/> <span className="font-semibold">{format(new Date(booking.bookingDate), 'HH:mm')} WIB</span></div>
    </div>
);

const PaymentDetailsCard: React.FC<{ booking: Booking }> = ({ booking }) => {
    const dpPaid = booking.totalPrice - booking.remainingBalance;
    return (
        <div className="bg-white rounded-2xl shadow-lg border p-6">
            <h4 className="font-bold text-lg text-primary mb-4">Detail Pembayaran</h4>
            <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Total Harga</span> <span className="font-semibold">Rp {booking.totalPrice.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between text-success"><span>DP Dibayar</span> <span className="font-semibold">- Rp {dpPaid.toLocaleString('id-ID')}</span></div>
                <hr className="my-2 border-dashed" />
                <div className="flex justify-between font-bold text-lg text-error"><span>Sisa Bayar</span> <span>Rp {booking.remainingBalance.toLocaleString('id-ID')}</span></div>
            </div>
        </div>
    );
};

const QuickActionsCard: React.FC<{ booking: Booking, onRescheduleClick: () => void }> = ({ booking, onRescheduleClick }) => {
    const canReschedule = booking.bookingStatus === BookingStatus.Confirmed && (new Date(booking.bookingDate).getTime() - new Date().getTime()) > 7 * 24 * 60 * 60 * 1000;

    return (
        <div className="bg-white rounded-2xl shadow-lg border p-6">
            <h4 className="font-bold text-lg text-primary mb-4">Akses Cepat</h4>
            <div className="space-y-2">
                {canReschedule && (
                    <button onClick={onRescheduleClick} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-warning bg-warning/10 rounded-lg hover:bg-warning/20 transition-colors"><Repeat size={16}/> Ajukan Jadwal Ulang</button>
                )}
                 {booking.bookingStatus === BookingStatus.Completed && booking.googleDriveLink && (
                    <a href={booking.googleDriveLink} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-primary-content bg-primary rounded-lg hover:bg-primary/90">
                        <Download size={16} /> Unduh Hasil Foto
                    </a>
                )}
                {booking.bookingStatus === BookingStatus.Completed && (
                     <Link to={`/feedback?bookingId=${booking.bookingCode}`} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-accent-content bg-accent rounded-lg hover:bg-accent/90">
                        <Star size={16} /> Beri Ulasan
                    </Link>
                )}
                 {booking.bookingStatus === BookingStatus.Completed && (
                     <Link to="/pesan-sesi" className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-success bg-success/10 rounded-lg hover:bg-success/20">
                        <CalendarCheck size={16} /> Booking Lagi
                    </Link>
                )}
            </div>
        </div>
    );
};

const PreparationTipsCard: React.FC = () => (
    <div className="bg-white rounded-2xl shadow-lg border p-6">
        <h4 className="font-bold text-lg text-primary mb-4 flex items-center gap-2"><Lightbulb size={20} className="text-yellow-400"/> Tips Persiapan Sesi</h4>
        <ul className="space-y-2 text-sm text-muted list-disc list-inside">
            <li>Datang 10-15 menit lebih awal untuk persiapan.</li>
            <li>Siapkan beberapa referensi pose yang kamu suka.</li>
            <li>Kenakan pakaian yang nyaman dan kamu percaya diri.</li>
            <li>Yang terpenting, bersenang-senanglah!</li>
        </ul>
    </div>
);

const LocationCard: React.FC = () => (
    <div className="bg-white rounded-2xl shadow-lg border p-6">
         <h4 className="font-bold text-lg text-primary mb-4 flex items-center gap-2"><MapPin size={20}/> Lokasi Kami</h4>
         <p className="text-sm text-muted">Jl. Banjar - Pangandaran (Depan SMK 4 Banjar), Sukamukti, Kec. Pataruman, Kota Banjar</p>
         <a href="https://maps.app.goo.gl/3RLxGUn5isbUd3UeA" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-accent hover:underline mt-2 inline-block">Buka di Google Maps</a>
    </div>
);


const StatusPage = () => {
  const [bookingCode, setBookingCode] = useState('');
  const [booking, setBooking] = useState<Booking | null | undefined>(undefined);
  const [client, setClient] = useState<Client | null>(null);
  const { settings, loading: settingsLoading } = useSystemSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const storedSearches = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (storedSearches) {
        setRecentSearches(JSON.parse(storedSearches));
    }
  }, []);
  
  const handleSearch = async (e: React.FormEvent | null, codeToSearch?: string) => {
    e?.preventDefault();
    const code = (codeToSearch || bookingCode).trim().toUpperCase();
    if (!code) return;

    setIsLoading(true);
    setBooking(undefined);
    setClient(null);
    setNotification(null);
    
    try {
        const foundBooking = await findBookingByCode(code);
        setBooking(foundBooking);

        if (foundBooking) {
            const clientData = await getClientDetails(foundBooking.bookingCode);
            setClient(clientData);
            
            const updatedSearches = [code, ...recentSearches.filter(s => s !== code)].slice(0, 5);
            setRecentSearches(updatedSearches);
            localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedSearches));
        } else {
            setNotification({ type: 'error', message: 'Kode booking tidak ditemukan. Mohon periksa kembali.' });
        }
    } catch (err) {
        setNotification({ type: 'error', message: 'Gagal mencari data. Periksa koneksi Anda.' });
    } finally {
        setIsLoading(false);
        setBookingCode('');
    }
  };

  const handleRescheduleSubmit = async (newDate: Date) => {
    if (!booking) return;
    setIsLoading(true);
    const updatedBooking = await requestReschedule(booking.id, newDate);
    if (updatedBooking) {
      setBooking(updatedBooking);
      setNotification({ type: 'success', message: 'Pengajuan jadwal ulang berhasil dikirim!' });
    } else {
      setNotification({ type: 'error', message: 'Gagal mengajukan jadwal ulang. Coba lagi.' });
    }
    setIsRescheduleModalOpen(false);
    setIsLoading(false);
  };

  const handleCopyReferral = () => {
    if (client?.referralCode) {
        navigator.clipboard.writeText(client.referralCode);
        setNotification({type: 'success', message: 'Kode referral disalin!'});
        setTimeout(() => setNotification(null), 2000);
    }
  };

  const removeSearchHistory = (code: string) => {
    const updatedSearches = recentSearches.filter(s => s !== code);
    setRecentSearches(updatedSearches);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedSearches));
  };
  
  const ClientPortal: React.FC = () => {
    if (!client || !settings) return null;
    const pointValue = settings.loyaltySettings.rupiahPerPoint;
    return (
      <div className="bg-white rounded-2xl shadow-lg border p-6">
        <h4 className="font-bold text-lg text-primary mb-1 flex items-center gap-2"><Award /> Portal Loyalitas Anda</h4>
        {client.loyaltyTier && <span className="inline-block bg-accent/10 text-accent text-xs font-bold px-2 py-1 rounded-full mb-4">{client.loyaltyTier} Member</span>}

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="bg-base-100 p-4 rounded-lg flex-1 text-center">
            <p className="text-sm text-muted">Poin Anda</p>
            <p className="text-3xl font-bold text-primary">{client.loyaltyPoints.toLocaleString('id-ID')}</p>
            <p className="text-xs text-muted">(Setara Rp {(client.loyaltyPoints * pointValue).toLocaleString('id-ID')})</p>
          </div>

          <div className="bg-base-100 p-4 rounded-lg flex-1">
            <h4 className="font-semibold text-primary/80 mb-2 text-center">Kode Referral</h4>
            <div className="flex items-center gap-2 p-2 bg-white border-2 border-dashed rounded-lg">
              <span className="font-mono text-primary flex-grow text-center">{client.referralCode}</span>
              <button onClick={handleCopyReferral} className="p-2 text-muted hover:text-primary rounded-md transition-colors text-sm flex items-center gap-1">
                  <Copy size={16}/> Salin
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-base-100">
      <header className="p-4 border-b bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link to="/" className="text-xl font-bold text-primary">STUDIO <span className="text-accent">8</span></Link>
          <Link to="/" className="inline-flex items-center text-sm text-muted hover:text-base-content transition-colors">
            <Home className="w-4 h-4 mr-2" />
            Kembali ke Beranda
          </Link>
        </div>
      </header>
      
      <main className="max-w-5xl mx-auto p-4 md:p-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-bold text-primary text-center">Lacak Status Booking Anda</h1>
          <p className="text-muted text-center mt-2">Masukkan kode booking untuk melihat progres, mengajukan jadwal ulang, atau mengunduh hasil foto.</p>
        </motion.div>
        
        <form onSubmit={handleSearch} className="mt-8 max-w-2xl mx-auto flex items-center gap-2 bg-white p-2 rounded-full shadow-lg border">
          <input
            type="text"
            value={bookingCode}
            onChange={(e) => setBookingCode(e.target.value)}
            placeholder="Masukkan kode booking (cth: S8-ABCDEF)"
            className="w-full bg-transparent p-3 rounded-full focus:outline-none text-base-content"
          />
          <button type="submit" disabled={isLoading} className="bg-primary text-primary-content rounded-full p-3 hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {isLoading ? <Loader2 className="animate-spin"/> : <Search />}
          </button>
        </form>

        {recentSearches.length > 0 && !booking && (
            <div className="mt-4 max-w-2xl mx-auto">
                <p className="text-xs text-center text-muted">Pencarian terakhir:</p>
                <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                    {recentSearches.map(code => (
                        <div key={code} className="flex items-center gap-1 bg-base-200 rounded-full text-sm">
                            <button onClick={(e) => handleSearch(e, code)} className="px-3 py-1 hover:bg-base-300 rounded-l-full">{code}</button>
                            <button onClick={() => removeSearchHistory(code)} className="px-2 py-1 hover:bg-base-300 rounded-r-full"><X size={14}/></button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <AnimatePresence>
            {notification && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className={`mt-4 max-w-2xl mx-auto p-3 text-sm rounded-lg flex items-center gap-2 ${notification.type === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                    {notification.type === 'success' ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
                    {notification.message}
                </motion.div>
            )}
        </AnimatePresence>

        <div className="mt-8">
          {booking === undefined && !isLoading && <div />}
          
          {booking && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                 <BookingSummaryCard booking={booking} />
                 <PaymentDetailsCard booking={booking} />
                 <QuickActionsCard booking={booking} onRescheduleClick={() => setIsRescheduleModalOpen(true)} />
              </div>
              <div className="lg:col-span-2 space-y-6">
                <ClientPortal />
                <TrackingTimeline booking={booking} />
                {booking.bookingStatus === BookingStatus.Confirmed && isBefore(new Date(), new Date(booking.bookingDate)) && <PreparationTipsCard />}
                <LocationCard />
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {booking && (
        <RescheduleModal 
            isOpen={isRescheduleModalOpen} 
            onClose={() => setIsRescheduleModalOpen(false)} 
            onSubmit={handleRescheduleSubmit}
            booking={booking}
            settings={settings}
        />
      )}
      
      {settings?.featureToggles.chatbot && (
        <>
            <ChatbotModal isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} pageKey="status" />
            <button onClick={() => setIsChatbotOpen(true)} className="fixed bottom-6 right-6 bg-accent text-accent-content p-4 rounded-full shadow-lg hover:scale-110 transition-transform">
                <MessageSquare />
            </button>
        </>
      )}
    </div>
  );
};

export default StatusPage;
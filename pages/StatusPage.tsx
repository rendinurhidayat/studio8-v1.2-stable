import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Booking, BookingStatus, Client, SystemSettings } from '../types';
import { findBookingByCode, requestReschedule, isSlotAvailable, getClientDetails, getSystemSettings } from '../services/api';
import { Home, Calendar, Clock, CheckCircle, AlertCircle, Loader2, Download, Star, MapPin, Award, Copy, ChevronRight } from 'lucide-react';
import Modal from '../components/common/Modal';

const RescheduleModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newDate: Date) => void;
  booking: Booking;
}> = ({ isOpen, onClose, onSubmit, booking }) => {
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const timeSlots = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];

  const handleSubmit = async () => {
    if (!newDate || !newTime) {
      setError('Tanggal dan waktu baru harus diisi.');
      return;
    }
    setError('');
    setIsChecking(true);
    const combinedDateTime = new Date(`${newDate}T${newTime}`);
    
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
            min={new Date().toISOString().split('T')[0]}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Waktu Baru</label>
           <select
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"
          >
            <option value="" disabled>Pilih Jam</option>
            {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
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

const StatusPage = () => {
  const [bookingCode, setBookingCode] = useState('');
  const [booking, setBooking] = useState<Booking | null | undefined>(undefined);
  const [client, setClient] = useState<Client | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  useEffect(() => {
    getSystemSettings().then(setSettings);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingCode) return;
    setIsLoading(true);
    setBooking(undefined);
    setClient(null);
    setNotification(null);
    const foundBooking = await findBookingByCode(bookingCode.toUpperCase());
    setBooking(foundBooking);
    if (foundBooking) {
        const clientData = await getClientDetails(foundBooking.bookingCode);
        setClient(clientData);
    }
    setIsLoading(false);
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
    }
  };

  const canReschedule = booking?.bookingStatus === BookingStatus.Confirmed && (new Date(booking.bookingDate).getTime() - new Date().getTime()) > 7 * 24 * 60 * 60 * 1000;
  
  const GOOGLE_MAPS_REVIEW_URL = window.appConfig?.googleMapsReviewUrl || "https://maps.app.goo.gl/3RLxGUn5isbUd3UeA";

  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const colorClasses: { [key: string]: string } = {
        'Pending': 'bg-yellow-100 text-yellow-800',
        'Confirmed': 'bg-blue-100 text-blue-800',
        'In Progress': 'bg-indigo-100 text-indigo-800',
        'Completed': 'bg-green-100 text-green-800',
        'Cancelled': 'bg-gray-600 text-white',
        'Paid': 'bg-green-100 text-green-800',
        'Failed': 'bg-red-100 text-red-800',
        'Reschedule Requested': 'bg-orange-100 text-orange-800',
    };
    return (
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${colorClasses[status] || 'bg-gray-100 text-gray-800'}`}>
            {status}
        </span>
    );
  };
  
  const ClientPortal = () => {
    if (!client || !settings) return null;
    
    const sortedTiers = [...settings.loyaltySettings.loyaltyTiers].sort((a,b) => a.bookingThreshold - b.bookingThreshold);
    const currentTierIndex = sortedTiers.findIndex(t => t.name === client.loyaltyTier);
    const nextTier = currentTierIndex > -1 && currentTierIndex < sortedTiers.length - 1 ? sortedTiers[currentTierIndex + 1] : null;

    const progressPercentage = nextTier ? (client.totalBookings / nextTier.bookingThreshold) * 100 : 100;
    const bookingsToNextTier = nextTier ? nextTier.bookingThreshold - client.totalBookings : 0;
    
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 animate-fade-in mt-6 border-t-4 border-blue-500">
        <h3 className="text-xl font-bold text-gray-900 mb-1">Portal Klien: {client.name}</h3>
        {client.loyaltyTier && <span className="inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-4">{client.loyaltyTier} Member</span>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Status Loyalitas</h4>
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-sm text-blue-800">Poin Anda</p>
                    <p className="text-3xl font-bold text-blue-900">{client.loyaltyPoints.toLocaleString('id-ID')}</p>
                </div>
                <Award className="h-10 w-10 text-blue-500"/>
            </div>
            {nextTier && (
              <div className="mt-3">
                <div className="w-full bg-blue-200 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
                </div>
                <p className="text-xs text-blue-800 mt-1 text-center">{bookingsToNextTier} booking lagi untuk mencapai tier {nextTier.name}!</p>
              </div>
            )}
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2 text-center">Program Referral</h4>
            <p className="text-xs text-center text-green-700 mb-2">Bagikan kode di bawah & dapatkan poin bonus untukmu dan temanmu!</p>
            <div className="flex items-center gap-2 p-2 bg-white border-2 border-dashed rounded-lg">
              <span className="font-mono text-green-900 flex-grow text-center">{client.referralCode}</span>
              <button onClick={handleCopyReferral} title="Salin Kode" className="p-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200">
                <Copy size={16}/>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Cek Status Pesanan Anda</h1>
        <p className="mt-2 text-gray-600">Masukkan kode booking unik Anda di bawah ini.</p>
      </div>
      
      <div className="w-full max-w-md mt-8">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={bookingCode}
            onChange={(e) => setBookingCode(e.target.value)}
            placeholder="Contoh: S8-ABCDE"
            className="flex-grow px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" disabled={isLoading} className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400">
            {isLoading ? 'Mencari...' : 'Cari'}
          </button>
        </form>
      </div>

      <div className="w-full max-w-2xl mt-8">
        {notification && (
            <div className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {notification.type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
                <span>{notification.message}</span>
            </div>
        )}
        {booking === null && <p className="text-center text-red-500">Kode booking tidak ditemukan. Mohon periksa kembali.</p>}
        {booking && (
          <div className="bg-white rounded-lg shadow-lg p-8 animate-fade-in">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Detail Pesanan</h2>
            <div className="mt-6 space-y-4">
              <div className="flex justify-between"><span className="font-medium text-gray-500">Kode Booking:</span> <span className="font-mono text-gray-800">{booking.bookingCode}</span></div>
              <div className="flex justify-between"><span className="font-medium text-gray-500">Nama Klien:</span> <span className="text-gray-800">{booking.clientName}</span></div>
              <div className="flex justify-between"><span className="font-medium text-gray-500">Tanggal:</span> <span className="text-gray-800">{booking.bookingDate.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Jakarta' })}</span></div>
               <div className="flex justify-between"><span className="font-medium text-gray-500">Waktu:</span> <span className="text-gray-800">{booking.bookingDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}</span></div>
              <div className="flex justify-between items-center"><span className="font-medium text-gray-500">Status Booking:</span> <StatusBadge status={booking.bookingStatus} /></div>
              <div className="flex justify-between items-center"><span className="font-medium text-gray-500">Status Pembayaran:</span> <StatusBadge status={booking.paymentStatus} /></div>
            </div>
            
            {booking.bookingStatus === BookingStatus.Completed && (
              <div className="mt-6 border-t pt-6 bg-green-50 p-6 rounded-lg">
                <h3 className="text-lg sm:text-xl font-bold text-center text-green-800">Sesi Selesai! 🎉</h3>
                <p className="text-center text-sm text-green-700 mt-1">Terima kasih telah mempercayakan momen Anda pada kami. Ulasan Anda sangat berarti untuk kami.</p>
                <div className="mt-4 space-y-4">
                  {booking.googleDriveLink && (
                    <a href={booking.googleDriveLink} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gray-800 rounded-lg hover:bg-gray-900 transition-colors">
                      <Download className="w-4 h-4" />
                      Buka Folder Hasil Foto
                    </a>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Link to={`/feedback?bookingId=${booking.bookingCode}`} className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-blue-800 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors">
                      <Star className="w-4 h-4" />
                      Beri Ulasan di Website
                    </Link>
                    <a href={GOOGLE_MAPS_REVIEW_URL} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-red-800 bg-red-100 rounded-lg hover:bg-red-200 transition-colors">
                      <MapPin className="w-4 h-4" />
                      Beri Rating di Google Maps
                    </a>
                  </div>
                </div>
              </div>
            )}

            {canReschedule && (
                 <div className="mt-6 border-t pt-6 text-center">
                    <p className="text-sm text-gray-600 mb-3">Butuh mengubah jadwal sesi Anda?</p>
                    <button onClick={() => setIsRescheduleModalOpen(true)} className="flex items-center justify-center mx-auto px-6 py-2 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors">
                        <Calendar className="w-4 h-4 mr-2"/>
                        Ajukan Jadwal Ulang
                    </button>
                    <p className="text-xs text-gray-500 mt-2">(Maksimal H-7 sebelum sesi)</p>
                </div>
            )}
            {booking.bookingStatus === BookingStatus.RescheduleRequested && (
                <div className="mt-6 border-t pt-6 text-center bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">Anda telah mengajukan penjadwalan ulang. Mohon tunggu konfirmasi dari admin kami melalui WhatsApp.</p>
                </div>
            )}
          </div>
        )}
        
        <ClientPortal />
      </div>
      
      <div className="mt-8">
          <Link to="/" className="flex items-center justify-center px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-200 rounded-2xl hover:bg-gray-300 transition-colors">
              <Home className="w-4 h-4 mr-2"/>
              Kembali ke Beranda
          </Link>
      </div>
       {booking && <RescheduleModal isOpen={isRescheduleModalOpen} onClose={() => setIsRescheduleModalOpen(false)} onSubmit={handleRescheduleSubmit} booking={booking} />}
    </div>
  );
};

export default StatusPage;
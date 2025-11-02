
import React, { useState, useEffect } from 'react';
import { getBookings, completeBookingSession } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Booking, BookingStatus } from '../../types';
import Modal from '../../components/common/Modal';
import { CheckCircle, Link as LinkIcon, Loader2 } from 'lucide-react';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const colorClasses: { [key: string]: string } = {
        [BookingStatus.Pending]: 'bg-yellow-100 text-yellow-800',
        [BookingStatus.Confirmed]: 'bg-blue-100 text-blue-800',
        [BookingStatus.InProgress]: 'bg-indigo-100 text-indigo-800',
        [BookingStatus.Completed]: 'bg-green-100 text-green-800',
        [BookingStatus.Cancelled]: 'bg-gray-100 text-gray-800',
        [BookingStatus.RescheduleRequested]: 'bg-orange-100 text-orange-800',
    };
    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses[status] || 'bg-gray-100 text-gray-800'}`}>
            {status}
        </span>
    );
};

const CompleteSessionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    booking: Booking | null;
    onConfirm: (bookingId: string, driveLink: string) => Promise<void>;
}> = ({ isOpen, onClose, booking, onConfirm }) => {
    const [driveLink, setDriveLink] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setDriveLink(''); // Reset on close
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        if (!booking || !driveLink.trim()) {
            alert('Link Google Drive tidak boleh kosong.');
            return;
        }
        setIsSubmitting(true);
        await onConfirm(booking.id, driveLink);
        setIsSubmitting(false);
        onClose();
    };

    if (!booking) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Selesaikan Sesi: ${booking.clientName}`}>
            <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">Total Biaya Sesi:</span>
                        <span className="font-semibold text-slate-800">Rp {booking.totalPrice.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-slate-600">DP Dibayar:</span>
                        <span className="font-semibold text-green-700">- Rp {(booking.totalPrice - booking.remainingBalance).toLocaleString('id-ID')}</span>
                    </div>
                    <hr className="my-2"/>
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-700">Sisa Pembayaran:</span>
                        <span className="font-extrabold text-lg text-orange-600">Rp {booking.remainingBalance.toLocaleString('id-ID')}</span>
                    </div>
                </div>
                <div>
                    <label htmlFor="driveLink" className="block text-sm font-medium text-slate-700 mb-1">Link Folder Google Drive</label>
                    <input
                        id="driveLink"
                        type="url"
                        value={driveLink}
                        onChange={(e) => setDriveLink(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        required
                        className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500"
                    />
                </div>
                 <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mt-4 rounded-r-lg">
                    <p className="text-xs text-blue-800">
                        Dengan menyelesaikan sesi, sistem akan otomatis mencatat pelunasan dan mengubah status booking menjadi 'Completed'.
                    </p>
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Batal</button>
                <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-green-400 w-48 flex justify-center">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Selesaikan & Simpan'}
                </button>
            </div>
        </Modal>
    );
};


const StaffBookingsPage = () => {
    const { user: currentUser } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

    const fetchBookings = async () => {
        setLoading(true);
        const data = await getBookings();
        setBookings(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const handleCompleteSession = async (bookingId: string, driveLink: string) => {
        if (!currentUser) return;
        await completeBookingSession(bookingId, driveLink, currentUser.id);
        fetchBookings(); // Refresh list
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Jadwal Booking</h1>
            <div className="bg-white shadow-sm rounded-lg overflow-x-auto border border-slate-200">
                {loading ? (
                     <div className="p-8 text-center text-slate-500">Memuat data booking...</div>
                ) : bookings.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">Belum ada data booking.</div>
                ) : (
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Waktu</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Klien</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Paket</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Catatan</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {bookings.map((booking) => (
                                <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                        {new Date(booking.bookingDate).toLocaleDateString('id-ID', {day: '2-digit', month:'short', year:'numeric', timeZone: 'Asia/Jakarta'})}
                                        <span className="text-slate-500 block text-xs">
                                            {new Date(booking.bookingDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{booking.clientName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{booking.package.name} ({booking.selectedSubPackage.name})</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm"><StatusBadge status={booking.bookingStatus} /></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 max-w-xs truncate">{booking.notes || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                        {[BookingStatus.Confirmed, BookingStatus.InProgress].includes(booking.bookingStatus) && (
                                            <button 
                                                onClick={() => setSelectedBooking(booking)}
                                                className="px-3 py-1.5 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors text-xs flex items-center gap-1.5"
                                            >
                                                <CheckCircle size={14} />
                                                Selesaikan Sesi
                                            </button>
                                        )}
                                        {booking.bookingStatus === BookingStatus.Completed && booking.googleDriveLink && (
                                            <a 
                                                href={booking.googleDriveLink} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline text-xs font-semibold"
                                                title="Buka Folder Hasil Foto"
                                            >
                                                <LinkIcon size={14} />
                                                Lihat Hasil
                                            </a>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <CompleteSessionModal 
                isOpen={!!selectedBooking}
                onClose={() => setSelectedBooking(null)}
                booking={selectedBooking}
                onConfirm={handleCompleteSession}
            />
        </div>
    );
};

export default StaffBookingsPage;
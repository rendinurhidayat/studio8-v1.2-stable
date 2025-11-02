
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    getBookings, 
    confirmBooking, 
    deleteBooking, 
    updateBooking,
    getPackages, 
    getAddOns,
    calculateDpAmount
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Booking, BookingStatus, PaymentStatus, Package, AddOn, SubPackage, SubAddOn } from '../../types';
import { Edit, Trash2, CheckCircle, MoreVertical, XCircle, DollarSign, Loader2, User, Mail, Phone, Download, FileText, Printer, MessageSquare, AlertTriangle, Clock, Calendar as CalendarIcon, List, Link as LinkIcon } from 'lucide-react';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import Modal from '../../components/common/Modal';
import BookingCalendar from '../../components/admin/BookingCalendar';
import { generateGoogleCalendarLink } from '../../utils/calendar';
import InvoiceModal from '../../components/admin/InvoiceModal';
// FIX: Use named import for date-fns format function
import { format } from 'date-fns';
import id from 'date-fns/locale/id';


const StatusBadge: React.FC<{ status: string, type: 'booking' | 'payment' }> = ({ status, type }) => {
    const bookingStatusColors: { [key: string]: string } = {
        [BookingStatus.Pending]: 'bg-yellow-100 text-yellow-800',
        [BookingStatus.Confirmed]: 'bg-blue-100 text-blue-800',
        [BookingStatus.InProgress]: 'bg-indigo-100 text-indigo-800',
        [BookingStatus.Completed]: 'bg-green-100 text-green-800',
        [BookingStatus.Cancelled]: 'bg-gray-100 text-gray-800',
        [BookingStatus.RescheduleRequested]: 'bg-orange-100 text-orange-800',
    };

    const paymentStatusColors: { [key: string]: string } = {
        [PaymentStatus.Paid]: 'bg-green-100 text-green-800',
        [PaymentStatus.Pending]: 'bg-yellow-100 text-yellow-800',
        [PaymentStatus.Failed]: 'bg-red-100 text-red-800',
    };

    const colors = type === 'booking' ? bookingStatusColors : paymentStatusColors;
    const colorClass = colors[status] || 'bg-gray-100 text-gray-800';

    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>
            {status}
        </span>
    );
};

const ManageBookingModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    booking: Booking | null;
    onSave: (bookingId: string, updatedData: Partial<Booking>) => void;
}> = ({ isOpen, onClose, booking, onSave }) => {
    const [formData, setFormData] = useState<Partial<Booking>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (booking) {
            setFormData({
                ...booking,
                bookingDate: format(new Date(booking.bookingDate), "yyyy-MM-dd'T'HH:mm"),
            });
        }
    }, [booking]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!booking) return;

        setIsSaving(true);
        // Create a separate object for submission to avoid type issues with date
        const dataToSubmit: Partial<Booking> = {
            ...formData,
            bookingDate: new Date(formData.bookingDate as any).toISOString(),
            totalPrice: Number(formData.totalPrice),
            remainingBalance: Number(formData.remainingBalance),
        };
        await onSave(booking.id, dataToSubmit);
        setIsSaving(false);
        onClose();
    };

    if (!booking) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Kelola Booking: ${booking.bookingCode}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Status Booking</label>
                        <select name="bookingStatus" value={formData.bookingStatus} onChange={handleChange} className="w-full p-2 border rounded mt-1">
                            {Object.values(BookingStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Jadwal</label>
                        <input type="datetime-local" name="bookingDate" value={formData.bookingDate as any} onChange={handleChange} className="w-full p-2 border rounded mt-1"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Total Harga (Rp)</label>
                        <input type="number" name="totalPrice" value={formData.totalPrice || ''} onChange={handleChange} className="w-full p-2 border rounded mt-1"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Sisa Bayar (Rp)</label>
                        <input type="number" name="remainingBalance" value={formData.remainingBalance || ''} onChange={handleChange} className="w-full p-2 border rounded mt-1"/>
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium">Link Google Drive</label>
                    <input type="url" name="googleDriveLink" value={formData.googleDriveLink || ''} onChange={handleChange} placeholder="https://drive.google.com/..." className="w-full p-2 border rounded mt-1"/>
                </div>
                <div>
                    <label className="block text-sm font-medium">Catatan Internal</label>
                    <textarea name="notes" value={formData.notes || ''} onChange={handleChange} rows={3} className="w-full p-2 border rounded mt-1"></textarea>
                </div>
                <div className="flex justify-end pt-4 gap-2">
                     <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-md">Batal</button>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 bg-primary text-white rounded-md w-28 flex justify-center">
                        {isSaving ? <Loader2 className="animate-spin" /> : 'Simpan'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

const AdminBookingsPage = () => {
    const { user: currentUser } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'calendar'>('list');

    const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
    const [bookingToEdit, setBookingToEdit] = useState<Booking | null>(null);
    const [bookingToInvoice, setBookingToInvoice] = useState<Booking | null>(null);

    const fetchData = async () => {
        setLoading(true);
        const bookingsData = await getBookings();
        setBookings(bookingsData);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleConfirmBooking = async (bookingId: string) => {
        if (!currentUser) return;
        await confirmBooking(bookingId, currentUser.id);
        fetchData();
    };

    const handleUpdateBooking = async (bookingId: string, data: Partial<Booking>) => {
        if (!currentUser) return;
        await updateBooking(bookingId, data, currentUser.id);
        fetchData();
    };

    const handleDeleteBooking = async () => {
        if (bookingToDelete && currentUser) {
            await deleteBooking(bookingToDelete.id, currentUser.id);
            setBookingToDelete(null);
            fetchData();
        }
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Jadwal Booking</h1>
                <div className="flex items-center gap-2 p-1 bg-base-200 rounded-lg">
                    <button onClick={() => setView('list')} className={`px-3 py-1.5 text-sm font-semibold rounded-md flex items-center gap-2 ${view === 'list' ? 'bg-white shadow' : ''}`}><List size={16}/> Daftar</button>
                    <button onClick={() => setView('calendar')} className={`px-3 py-1.5 text-sm font-semibold rounded-md flex items-center gap-2 ${view === 'calendar' ? 'bg-white shadow' : ''}`}><CalendarIcon size={16}/> Kalender</button>
                </div>
            </div>

            {view === 'list' && (
                 <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full leading-normal">
                         <thead className="bg-slate-50">
                            <tr>
                                <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold">Klien</th>
                                <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold">Jadwal</th>
                                <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold">Paket</th>
                                <th className="px-5 py-3 border-b-2 text-center text-xs font-semibold">Status</th>
                                <th className="px-5 py-3 border-b-2 text-right text-xs font-semibold">Total</th>
                                <th className="px-5 py-3 border-b-2 text-center text-xs font-semibold">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.map(booking => (
                                <tr key={booking.id} className="hover:bg-gray-50">
                                    <td className="px-5 py-4 border-b text-sm">
                                        <p className="font-medium">{booking.clientName}</p>
                                        <p className="text-xs text-muted">{booking.clientPhone}</p>
                                    </td>
                                    <td className="px-5 py-4 border-b text-sm">{format(new Date(booking.bookingDate), 'd MMM yyyy, HH:mm', { locale: id })}</td>
                                    <td className="px-5 py-4 border-b text-sm">{booking.package.name} ({booking.selectedSubPackage.name})</td>
                                    <td className="px-5 py-4 border-b text-sm text-center"><StatusBadge status={booking.bookingStatus} type="booking" /></td>
                                    <td className="px-5 py-4 border-b text-sm text-right font-semibold">Rp {booking.totalPrice.toLocaleString('id-ID')}</td>
                                    <td className="px-5 py-4 border-b text-sm text-center">
                                         <div className="flex justify-center items-center gap-1">
                                            {booking.bookingStatus === BookingStatus.Pending && (
                                                <button onClick={() => handleConfirmBooking(booking.id)} className="p-2 text-green-600 hover:bg-green-100 rounded-full" title="Konfirmasi DP"><CheckCircle size={16}/></button>
                                            )}
                                            {booking.bookingStatus === BookingStatus.RescheduleRequested && (
                                                <div className="p-2 text-orange-500" title="Menunggu persetujuan jadwal ulang"><Clock size={16}/></div>
                                            )}
                                             <button onClick={() => setBookingToInvoice(booking)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full" title="Lihat Invoice"><FileText size={16}/></button>
                                            <button onClick={() => setBookingToEdit(booking)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full" title="Edit"><Edit size={16}/></button>
                                            <button onClick={() => setBookingToDelete(booking)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full" title="Hapus"><Trash2 size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            )}
            
            {view === 'calendar' && (
                <BookingCalendar bookings={bookings} onSelectBooking={(booking) => setBookingToEdit(booking)} />
            )}

            <ConfirmationModal isOpen={!!bookingToDelete} onClose={() => setBookingToDelete(null)} onConfirm={handleDeleteBooking} title="Hapus Booking" message={`Anda yakin ingin menghapus booking ${bookingToDelete?.bookingCode}?`} />
            <ManageBookingModal isOpen={!!bookingToEdit} onClose={() => setBookingToEdit(null)} booking={bookingToEdit} onSave={handleUpdateBooking} />
            <InvoiceModal isOpen={!!bookingToInvoice} onClose={() => setBookingToInvoice(null)} booking={bookingToInvoice} />
        </div>
    );
};

export default AdminBookingsPage;

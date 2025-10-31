
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
import format from 'date-fns/format';
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
    booking: Booking;
    onSave: (bookingId: string, updatedData: Partial<Booking>) => Promise<void>;
}> = ({ isOpen, onClose, booking, onSave }) => {
    const [formData, setFormData] = useState<Partial<Booking>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (booking) {
            setFormData({
                bookingStatus: booking.bookingStatus,
                notes: booking.notes,
                googleDriveLink: booking.googleDriveLink,
            });
        }
    }, [booking]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await onSave(booking.id, formData);
        setIsSaving(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Kelola Booking: ${booking.bookingCode}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Status Booking</label>
                    <select name="bookingStatus" value={formData.bookingStatus} onChange={handleChange} className="mt-1 w-full p-2 border rounded">
                        {Object.values(BookingStatus).map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium">Link Google Drive</label>
                    <input type="url" name="googleDriveLink" value={formData.googleDriveLink || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="block text-sm font-medium">Catatan Internal</label>
                    <textarea name="notes" value={formData.notes || ''} onChange={handleChange} rows={3} className="mt-1 w-full p-2 border rounded" />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-base-200 rounded-md">Batal</button>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 bg-primary text-primary-content rounded-md w-24 flex justify-center">
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
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    
    // Modal states
    const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
    const [bookingToManage, setBookingToManage] = useState<Booking | null>(null);
    const [bookingToInvoice, setBookingToInvoice] = useState<Booking | null>(null);
    
    // Action loading state
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    const fetchData = async () => {
        setLoading(true);
        const bookingsData = await getBookings();
        setBookings(bookingsData);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleConfirm = async (bookingId: string) => {
        if (!currentUser) return;
        setActionLoading(prev => ({ ...prev, [bookingId]: true }));
        await confirmBooking(bookingId, currentUser.id);
        await fetchData();
        setActionLoading(prev => ({ ...prev, [bookingId]: false }));
    };

    const handleDelete = async () => {
        if (!bookingToDelete || !currentUser) return;
        setActionLoading(prev => ({ ...prev, [bookingToDelete.id]: true }));
        await deleteBooking(bookingToDelete.id, currentUser.id);
        setBookingToDelete(null);
        await fetchData();
    };
    
    const handleSaveManagement = async (bookingId: string, updatedData: Partial<Booking>) => {
        if (!currentUser) return;
        await updateBooking(bookingId, updatedData, currentUser.id);
        await fetchData();
    };

    const ActionMenu: React.FC<{ booking: Booking }> = ({ booking }) => {
        const [isOpen, setIsOpen] = useState(false);
        const menuRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                    setIsOpen(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);

        return (
            <div className="relative" ref={menuRef}>
                <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                    <MoreVertical size={16} />
                </button>
                {isOpen && (
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border z-10">
                        <button onClick={() => { setBookingToManage(booking); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"><Edit size={14}/> Kelola</button>
                        <button onClick={() => { setBookingToInvoice(booking); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"><FileText size={14}/> Lihat Invoice</button>
                        <a href={generateGoogleCalendarLink(booking)} target="_blank" rel="noopener noreferrer" className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"><CalendarIcon size={14}/> Add to Calendar</a>
                        <button onClick={() => { setBookingToDelete(booking); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14}/> Hapus</button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Jadwal Booking</h1>
            <div className="flex border-b mb-6">
                <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold ${viewMode === 'list' ? 'border-b-2 border-primary text-primary' : 'text-muted'}`}><List size={16}/> Daftar Booking</button>
                <button onClick={() => setViewMode('calendar')} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold ${viewMode === 'calendar' ? 'border-b-2 border-primary text-primary' : 'text-muted'}`}><CalendarIcon size={16}/> Kalender</button>
            </div>

            {viewMode === 'list' ? (
                 <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full leading-normal">
                        <thead className="bg-base-100">
                            <tr>
                                <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold">Klien</th>
                                <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold">Jadwal</th>
                                <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold">Paket</th>
                                <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold">Status</th>
                                <th className="px-5 py-3 border-b-2 text-center text-xs font-semibold">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} className="text-center p-8"><Loader2 className="animate-spin mx-auto"/></td></tr>
                            ) : bookings.map(b => (
                                <tr key={b.id} className="hover:bg-base-100/50">
                                    <td className="px-5 py-4 border-b">
                                        <p className="font-semibold text-sm">{b.clientName}</p>
                                        <p className="text-xs text-muted">{b.bookingCode}</p>
                                    </td>
                                    <td className="px-5 py-4 border-b text-sm">
                                        <p>{format(b.bookingDate, 'd MMM yyyy', { locale: id })}</p>
                                        <p className="text-xs text-muted">{format(b.bookingDate, 'HH:mm')} WIB</p>
                                        {b.bookingStatus === BookingStatus.RescheduleRequested && b.rescheduleRequestDate && (
                                            <div className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                                                <Clock size={12}/> Minta Pindah ke: {format(b.rescheduleRequestDate, 'd MMM, HH:mm')}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 border-b text-sm">{b.package.name} ({b.selectedSubPackage.name})</td>
                                    <td className="px-5 py-4 border-b text-sm"><StatusBadge status={b.bookingStatus} type="booking" /></td>
                                    <td className="px-5 py-4 border-b text-sm text-center">
                                        {b.bookingStatus === BookingStatus.Pending ? (
                                            <button onClick={() => handleConfirm(b.id)} disabled={actionLoading[b.id]} className="px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-100 rounded-md hover:bg-green-200 w-28 flex justify-center">
                                                {actionLoading[b.id] ? <Loader2 size={14} className="animate-spin"/> : 'Konfirmasi DP'}
                                            </button>
                                        ) : (
                                            <ActionMenu booking={b} />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <BookingCalendar bookings={bookings} onSelectBooking={setBookingToManage} />
            )}

            <ConfirmationModal
                isOpen={!!bookingToDelete}
                onClose={() => setBookingToDelete(null)}
                onConfirm={handleDelete}
                title="Hapus Booking"
                message={`Anda yakin ingin menghapus booking ${bookingToDelete?.bookingCode}? Aksi ini juga akan menghapus transaksi terkait.`}
            />
            {bookingToManage && (
                <ManageBookingModal 
                    isOpen={!!bookingToManage}
                    onClose={() => setBookingToManage(null)}
                    booking={bookingToManage}
                    onSave={handleSaveManagement}
                />
            )}
            <InvoiceModal
                isOpen={!!bookingToInvoice}
                onClose={() => setBookingToInvoice(null)}
                booking={bookingToInvoice}
            />
        </div>
    );
};

export default AdminBookingsPage;

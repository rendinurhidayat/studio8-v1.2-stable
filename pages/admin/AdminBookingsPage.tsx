



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


const StatusBadge: React.FC<{ status: string, type: 'booking' | 'payment' }> = ({ status, type }) => {
    const bookingColors: { [key: string]: string } = {
        [BookingStatus.Pending]: 'bg-yellow-100 text-yellow-800',
        [BookingStatus.Confirmed]: 'bg-blue-100 text-blue-800',
        [BookingStatus.InProgress]: 'bg-indigo-100 text-indigo-800',
        [BookingStatus.Completed]: 'bg-green-100 text-green-800',
        [BookingStatus.Cancelled]: 'bg-gray-100 text-gray-800',
        [BookingStatus.RescheduleRequested]: 'bg-orange-100 text-orange-800',
    };
    const paymentColors: { [key: string]: string } = {
        [PaymentStatus.Pending]: 'bg-yellow-100 text-yellow-800',
        [PaymentStatus.Paid]: 'bg-green-100 text-green-800',
        [PaymentStatus.Failed]: 'bg-red-100 text-red-800',
    };
    const colors = type === 'booking' ? bookingColors : paymentColors;
    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
            {status}
        </span>
    );
};

const EditBookingModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    booking: Booking | null,
    packages: Package[],
    addOns: AddOn[],
    onSave: (id: string, data: Partial<Booking>) => Promise<void>
}> = ({ isOpen, onClose, booking, packages, addOns, onSave }) => {
    const [formData, setFormData] = useState<Omit<Partial<Booking>, 'bookingDate'> & { bookingDate?: string | Date }>({});
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

    useEffect(() => {
        if (booking) {
            const dateToSet = booking.bookingStatus === BookingStatus.RescheduleRequested && booking.rescheduleRequestDate ? booking.rescheduleRequestDate : booking.bookingDate;
            setFormData({
                ...booking,
                bookingDate: format(dateToSet, "yyyy-MM-dd'T'HH:mm") // Format for datetime-local
            });
            setSelectedPackage(booking.package);
        }
    }, [booking]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };
    
    const handlePackageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const pkg = packages.find(p => p.id === e.target.value) || null;
        setSelectedPackage(pkg);
        setFormData({ ...formData, package: pkg, selectedSubPackage: undefined });
    };

    const handleSubPackageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const subPkg = selectedPackage?.subPackages.find(sp => sp.id === e.target.value) || undefined;
        setFormData({ ...formData, selectedSubPackage: subPkg });
    };
    
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!booking) return;

        const dataToSave: Partial<Booking> = {
            ...formData,
            bookingDate: formData.bookingDate ? new Date(formData.bookingDate) : booking.bookingDate,
            bookingStatus: booking.bookingStatus === BookingStatus.RescheduleRequested ? BookingStatus.Confirmed : booking.bookingStatus,
            rescheduleRequestDate: undefined,
        };
        await onSave(booking.id, dataToSave);
        onClose();
    };

    if (!booking) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit Booking: ${booking.bookingCode}`}>
             {booking.bookingStatus === BookingStatus.RescheduleRequested && (
                <div className="mb-4 p-3 bg-orange-50 border-l-4 border-orange-400 text-orange-800 text-sm">
                    Klien meminta reschedule ke tanggal <strong>{booking.rescheduleRequestDate?.toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta'})} jam {booking.rescheduleRequestDate?.toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta'})}</strong>. Tanggal di bawah sudah di-update. Simpan untuk mengonfirmasi.
                </div>
             )}
            <form onSubmit={handleSave} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Nama Klien</label>
                    <input type="text" name="clientName" value={formData.clientName || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Jadwal</label>
                    <input type="datetime-local" name="bookingDate" value={formData.bookingDate?.toString() || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Paket</label>
                    <select value={selectedPackage?.id || ''} onChange={handlePackageChange} className="mt-1 w-full p-2 border rounded">
                        {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                {selectedPackage && (
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Varian Paket</label>
                        <select name="selectedSubPackage" value={formData.selectedSubPackage?.id || ''} onChange={handleSubPackageChange} className="mt-1 w-full p-2 border rounded">
                             <option value="">Pilih Varian</option>
                            {selectedPackage.subPackages.map(sp => <option key={sp.id} value={sp.id}>{sp.name} - Rp {sp.price.toLocaleString('id-ID')}</option>)}
                        </select>
                    </div>
                )}
                 <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Batal</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Simpan</button>
                </div>
            </form>
        </Modal>
    );
};

const BookingConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    booking: Booking | null;
}> = ({ isOpen, onClose, onConfirm, booking }) => {
    if (!booking) return null;

    const DetailRow: React.FC<{ icon: React.ReactNode, label: string, value: React.ReactNode }> = ({ icon, label, value }) => (
        <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-400">{icon}</span>
            <span className="text-gray-500 w-24">{label}</span>
            <span className="font-semibold text-gray-800">{value}</span>
        </div>
    );
    const dpAmount = calculateDpAmount(booking);
    const remainingBalance = booking.totalPrice - dpAmount;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Konfirmasi Booking: ${booking.bookingCode}`}>
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Detail Klien</h3>
                    <div className="space-y-2 p-4 bg-slate-50 rounded-lg">
                        <DetailRow icon={<User size={16}/>} label="Nama" value={booking.clientName} />
                        <DetailRow icon={<Mail size={16}/>} label="Email" value={booking.clientEmail} />
                        <DetailRow icon={<Phone size={16}/>} label="Telepon" value={booking.clientPhone} />
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Detail Pembayaran</h3>
                    <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                        <div className="flex justify-between items-center"><span className="text-gray-500">Total Harga Paket:</span> <span className="font-bold text-gray-800">Rp {booking.totalPrice.toLocaleString('id-ID')}</span></div>
                        <div className="flex justify-between items-center"><span className="text-gray-500">DP Dibayar:</span> <span className="font-bold text-green-600">Rp {dpAmount.toLocaleString('id-ID')}</span></div>
                         <hr/>
                        <div className="flex justify-between items-center"><span className="text-gray-500 font-semibold">Sisa Pembayaran:</span> <span className="font-bold text-lg text-orange-600">Rp {remainingBalance.toLocaleString('id-ID')}</span></div>
                        <hr/>
                        <div className="flex justify-between items-center"><span className="text-gray-500">Metode:</span> <span className="font-semibold text-gray-800">{booking.paymentMethod}</span></div>
                        <div className="flex flex-col items-start">
                            <span className="text-gray-500 flex items-center gap-2 mb-2"><FileText size={16}/> Bukti Transfer:</span>
                             {booking.paymentProofUrl ? (
                                <a href={booking.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="block w-full">
                                    <img src={booking.paymentProofUrl} alt="Bukti Pembayaran" className="w-full h-auto max-h-64 object-contain rounded-md border bg-white cursor-pointer"/>
                                </a>
                            ) : (
                                <span className="text-sm font-medium text-red-600">Tidak ada file bukti transfer.</span>
                            )}
                        </div>
                    </div>
                </div>
                 <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
                    <p className="text-xs text-yellow-800">
                        Pastikan bukti transfer sudah valid sebelum melanjutkan. Tindakan ini akan mencatat transaksi DP ke dalam data keuangan.
                    </p>
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Batal</button>
                <button type="button" onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2">
                    <CheckCircle size={16}/>
                    Konfirmasi & Catat Transaksi
                </button>
            </div>
        </Modal>
    );
};

const BookingDetailModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    booking: Booking | null;
}> = ({ isOpen, onClose, booking }) => {
    if (!booking) return null;
    const gCalLink = generateGoogleCalendarLink(booking);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Detail Booking: ${booking.bookingCode}`}>
            <div className="space-y-4">
                <p><strong>Klien:</strong> {booking.clientName}</p>
                <p><strong>Jadwal:</strong> {booking.bookingDate.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Jakarta' })}</p>
                <p><strong>Paket:</strong> {booking.package.name} ({booking.selectedSubPackage.name})</p>
                <p><strong>Status:</strong> <StatusBadge status={booking.bookingStatus} type="booking" /></p>
                <a href={gCalLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
                    <CalendarIcon size={16}/> Tambah ke Google Calendar
                </a>
            </div>
        </Modal>
    );
};

const AdminBookingsPage = () => {
    const { user: currentUser } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [packages, setPackages] = useState<Package[]>([]);
    const [addOns, setAddOns] = useState<AddOn[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
    const [view, setView] = useState<'list' | 'calendar'>('list');

    const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
    const [bookingToConfirm, setBookingToConfirm] = useState<Booking | null>(null);
    const [bookingToInvoice, setBookingToInvoice] = useState<Booking | null>(null);
    const [selectedCalendarBooking, setSelectedCalendarBooking] = useState<Booking | null>(null);

    const fetchData = async () => {
        setLoading(true);
        const [bookingsData, packagesData, addOnsData] = await Promise.all([getBookings(), getPackages(), getAddOns()]);
        setBookings(bookingsData);
        setPackages(packagesData);
        setAddOns(addOnsData);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);
    
    const confirmedBookings = useMemo(() => {
        return bookings.filter(b => b.bookingStatus === BookingStatus.Confirmed || b.bookingStatus === BookingStatus.RescheduleRequested || b.bookingStatus === BookingStatus.InProgress);
    }, [bookings]);

    const handleAction = async (bookingId: string, action: Promise<any>) => {
        setActionLoading(prev => ({ ...prev, [bookingId]: true }));
        await action;
        await fetchData(); // Refresh all data
        setActionLoading(prev => ({ ...prev, [bookingId]: false }));
    };

    const handleConfirmClick = (booking: Booking) => setBookingToConfirm(booking);
    const handleConfirmSubmit = () => {
        if (bookingToConfirm && currentUser) {
            handleAction(bookingToConfirm.id, confirmBooking(bookingToConfirm.id, currentUser.id));
            setBookingToConfirm(null);
        }
    };
    
    const handleDeleteClick = (booking: Booking) => setBookingToDelete(booking);
    const handleDeleteConfirm = () => {
        if (bookingToDelete && currentUser) {
            handleAction(bookingToDelete.id, deleteBooking(bookingToDelete.id, currentUser.id));
            setBookingToDelete(null);
        }
    };
    
    const handleEditClick = (booking: Booking) => {
        setEditingBooking(booking);
        setIsEditModalOpen(true);
    };
    
    const handleInvoiceClick = (booking: Booking) => setBookingToInvoice(booking);
    const handleSaveBooking = async (id: string, data: Partial<Booking>) => {
       if (!currentUser) return;
       await handleAction(id, updateBooking(id, data, currentUser.id));
    };

    const renderListView = () => (
         <div className="bg-white shadow-md rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-base-200">
                <thead className="bg-base-100">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">Klien</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">Jadwal</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">Detail Paket</th>
                         <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">Total Harga</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">Status Booking</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">Pembayaran</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-muted uppercase">Aksi</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-base-200">
                    {bookings.map((booking) => (
                        <tr key={booking.id} className={`hover:bg-base-100/50 ${booking.bookingStatus === BookingStatus.RescheduleRequested ? 'bg-orange-50' : ''}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                     {booking.bookingStatus === BookingStatus.Completed && booking.googleDriveLink && (
                                        <a href={booking.googleDriveLink} target="_blank" rel="noopener noreferrer" title="Buka Folder Google Drive">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 hover:text-gray-800"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M10.266 14.326a2.13 2.13 0 0 1 2.24-2.321h0a2.13 2.13 0 0 1 2.241 2.321L13.5 20l-3.234-5.674Z"></path></svg>
                                        </a>
                                    )}
                                    <div>
                                        <div className="text-sm font-medium text-base-content">{booking.clientName}</div>
                                        <div className="text-sm text-muted">{booking.clientEmail}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-base-content">
                                {booking.bookingDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })}
                                <span className="text-muted"> jam {booking.bookingDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-base-content">
                                <p className="font-semibold">{booking.package.name}</p>
                                <p className="text-xs text-muted">{booking.selectedSubPackage.name}</p>
                            </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-base-content">
                                Rp {booking.totalPrice.toLocaleString('id-ID')}
                             </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={booking.bookingStatus} type="booking" />
                                    {booking.bookingStatus === BookingStatus.RescheduleRequested && <span title="Klien meminta reschedule"><AlertTriangle size={16} className="text-orange-500" /></span>}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <StatusBadge status={booking.paymentStatus} type="payment" />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                                <div className="flex items-center justify-center gap-1">
                                    {actionLoading[booking.id] ? (
                                        <Loader2 size={20} className="animate-spin text-muted" />
                                    ) : booking.bookingStatus === BookingStatus.Pending ? (
                                        <>
                                            <button onClick={() => handleConfirmClick(booking)} className="flex items-center gap-1.5 p-2 text-xs font-semibold text-green-700 bg-green-100 rounded-md hover:bg-green-200" title="Konfirmasi Booking">
                                                <CheckCircle size={16}/> Konfirmasi
                                            </button>
                                            <button onClick={() => handleEditClick(booking)} className="p-2 text-muted hover:text-accent hover:bg-base-200 rounded-md" title="Edit Booking">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteClick(booking)} className="flex items-center gap-1.5 p-2 text-xs font-semibold text-red-700 bg-red-100 rounded-md hover:bg-red-200" title="Tolak Booking">
                                                <XCircle size={16}/> Tolak
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            {booking.bookingStatus === BookingStatus.RescheduleRequested && (
                                                <button onClick={() => handleEditClick(booking)} className="flex items-center gap-1.5 p-2 text-xs font-semibold text-orange-700 bg-orange-100 rounded-md hover:bg-orange-200" title="Proses Reschedule">
                                                    <Clock size={16}/> Reschedule
                                                </button>
                                            )}

                                            {[BookingStatus.Confirmed, BookingStatus.InProgress, BookingStatus.Completed].includes(booking.bookingStatus) && (
                                                <button onClick={() => handleInvoiceClick(booking)} className="p-2 text-muted hover:text-indigo-600 hover:bg-base-200 rounded-md" title="Lihat Invoice">
                                                    <FileText size={16} />
                                                </button>
                                            )}
                                            
                                            <button onClick={() => handleEditClick(booking)} className="p-2 text-muted hover:text-accent hover:bg-base-200 rounded-md" title="Edit Booking">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteClick(booking)} className="p-2 text-muted hover:text-error hover:bg-base-200 rounded-md" title="Hapus Booking">
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    if (loading) return <div>Loading bookings...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Manajemen Booking</h1>
                <div className="flex items-center gap-2 p-1 bg-base-200 rounded-lg">
                    <button onClick={() => setView('list')} className={`px-3 py-1.5 text-sm font-semibold flex items-center gap-2 rounded-md ${view === 'list' ? 'bg-white text-base-content shadow' : 'text-muted'}`}>
                        <List size={16}/> Daftar
                    </button>
                     <button onClick={() => setView('calendar')} className={`px-3 py-1.5 text-sm font-semibold flex items-center gap-2 rounded-md ${view === 'calendar' ? 'bg-white text-base-content shadow' : 'text-muted'}`}>
                       <CalendarIcon size={16}/> Kalender
                    </button>
                </div>
            </div>
           
            {view === 'list' ? renderListView() : <BookingCalendar bookings={confirmedBookings} onSelectBooking={setSelectedCalendarBooking} />}
            
            <ConfirmationModal
                isOpen={!!bookingToDelete}
                onClose={() => setBookingToDelete(null)}
                onConfirm={handleDeleteConfirm}
                title="Hapus Booking"
                message={`Apakah Anda yakin ingin menghapus booking untuk ${bookingToDelete?.clientName}? Transaksi DP terkait juga akan dihapus.`}
            />
            <EditBookingModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                booking={editingBooking}
                packages={packages}
                addOns={addOns}
                onSave={handleSaveBooking}
            />
            <BookingConfirmationModal
                isOpen={!!bookingToConfirm}
                onClose={() => setBookingToConfirm(null)}
                onConfirm={handleConfirmSubmit}
                booking={bookingToConfirm}
            />
            <InvoiceModal 
                isOpen={!!bookingToInvoice}
                onClose={() => setBookingToInvoice(null)}
                booking={bookingToInvoice}
            />
             <BookingDetailModal
                isOpen={!!selectedCalendarBooking}
                onClose={() => setSelectedCalendarBooking(null)}
                booking={selectedCalendarBooking}
            />
        </div>
    );
};

export default AdminBookingsPage;
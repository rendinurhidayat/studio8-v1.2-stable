import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getInstitutionalBookings, getPackages, updateBooking } from '../../services/api';
import { Booking, Package, BookingStatus } from '../../types';
import Modal from '../../components/common/Modal';
import InvoiceModal from '../../components/admin/InvoiceModal';
import { Edit, Loader2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import id from 'date-fns/locale/id';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const bookingColors: { [key: string]: string } = {
        [BookingStatus.Pending]: 'bg-yellow-100 text-yellow-800',
        [BookingStatus.Confirmed]: 'bg-blue-100 text-blue-800',
        [BookingStatus.Completed]: 'bg-green-100 text-green-800',
        [BookingStatus.Cancelled]: 'bg-gray-100 text-gray-800',
    };
    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bookingColors[status] || 'bg-gray-100 text-gray-800'}`}>
            {status}
        </span>
    );
};

const ManageBookingModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    booking: Booking | null;
    packages: Package[];
    onSave: (id: string, data: Partial<Booking>) => Promise<void>;
}> = ({ isOpen, onClose, booking, packages, onSave }) => {
    const [formData, setFormData] = useState<Partial<Booking>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (booking) {
            setFormData(booking);
        }
    }, [booking]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePackageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const pkg = packages.find(p => p.id === e.target.value);
        setFormData(prev => ({...prev, package: pkg, selectedSubPackage: undefined, totalPrice: 0, remainingBalance: 0 }));
    };

    const handleSubPackageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const subPkg = formData.package?.subPackages.find(sp => sp.id === e.target.value);
        if (subPkg) {
            const price = subPkg.price;
            setFormData(prev => ({ ...prev, selectedSubPackage: subPkg, totalPrice: price, remainingBalance: price }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (booking) {
            setIsSaving(true);
            const dataToSave: Partial<Booking> = { ...formData };
            if (dataToSave.dueDate) {
                dataToSave.dueDate = new Date(dataToSave.dueDate).toISOString();
            }
            if(dataToSave.totalPrice) {
                dataToSave.totalPrice = Number(dataToSave.totalPrice);
                dataToSave.remainingBalance = Number(dataToSave.totalPrice); // Assume full balance on update
            }
            await onSave(booking.id, dataToSave);
            setIsSaving(false);
        }
    };

    if (!booking) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Kelola Booking: ${booking.institutionName}`}>
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                 <div><label className="text-sm font-medium">Status Booking</label>
                    <select name="bookingStatus" value={formData.bookingStatus} onChange={handleChange} className="w-full p-2 border rounded mt-1">
                        {Object.values(BookingStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div><label className="text-sm font-medium">Paket</label><select value={formData.package?.id || ''} onChange={handlePackageChange} required className="w-full p-2 border rounded mt-1"><option value="">-- Pilih Paket --</option>{packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                {formData.package && <div><label className="text-sm font-medium">Varian Paket</label><select value={formData.selectedSubPackage?.id || ''} onChange={handleSubPackageChange} required className="w-full p-2 border rounded mt-1"><option value="">-- Pilih Varian --</option>{formData.package.subPackages.map(sp => <option key={sp.id} value={sp.id}>{sp.name} - Rp {sp.price.toLocaleString('id-ID')}</option>)}</select></div>}
                <div><label className="text-sm font-medium">Total Harga (Rp)</label><input name="totalPrice" type="number" value={formData.totalPrice || ''} onChange={handleChange} required className="w-full p-2 border rounded mt-1"/></div>
                <div><label className="text-sm font-medium">Mode Pembayaran</label><select name="paymentMode" value={formData.paymentMode} onChange={handleChange} className="w-full p-2 border rounded mt-1"><option value="dp">DP</option><option value="lunas">Lunas</option><option value="termin">Termin</option></select></div>
                {formData.paymentMode === 'termin' && <div><label className="text-sm font-medium">Jatuh Tempo</label><input name="dueDate" type="date" value={formData.dueDate ? format(new Date(formData.dueDate), 'yyyy-MM-dd') : ''} onChange={handleChange} className="w-full p-2 border rounded mt-1"/></div>}
                <div className="flex justify-end pt-4"><button type="submit" disabled={isSaving} className="px-4 py-2 bg-primary text-white rounded-lg w-32 flex justify-center">{isSaving ? <Loader2 className="animate-spin"/> : 'Simpan'}</button></div>
            </form>
        </Modal>
    );
};

const AdminInstitutionalBookingsPage = () => {
    const { user: currentUser } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [packages, setPackages] = useState<Package[]>([]);
    const [loading, setLoading] = useState({ page: true, modal: false });
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [bookingToInvoice, setBookingToInvoice] = useState<Booking | null>(null);

    const fetchData = async () => {
        setLoading(p => ({ ...p, page: true }));
        const [bookingsData, packagesData] = await Promise.all([getInstitutionalBookings(), getPackages()]);
        setBookings(bookingsData);
        setPackages(packagesData);
        setLoading(p => ({ ...p, page: false }));
    };

    useEffect(() => { fetchData(); }, []);
    
    const handleOpenManageModal = (booking: Booking) => {
        setSelectedBooking(booking);
        setIsManageModalOpen(true);
    };

    const handleManageSave = async (bookingId: string, data: Partial<Booking>) => {
        if(!currentUser) return;
        await updateBooking(bookingId, data, currentUser.id);
        setIsManageModalOpen(false);
        fetchData();
    };


    if (loading.page) return <div className="text-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Booking Instansi</h1>
            </div>
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-base-100">
                        <tr>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-muted">Instansi</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-muted">Jadwal</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-muted">Paket</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-muted">Total Harga</th>
                            <th className="px-5 py-3 text-center text-xs font-semibold text-muted">Status</th>
                            <th className="px-5 py-3 text-center text-xs font-semibold text-muted">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bookings.map(booking => (
                            <tr key={booking.id} className="hover:bg-gray-50 border-b">
                                <td className="px-5 py-4"><p className="font-semibold">{booking.institutionName}</p><p className="text-xs text-muted">{booking.picName} ({booking.picContact})</p></td>
                                <td className="px-5 py-4 text-sm">{format(new Date(booking.bookingDate), 'd MMM yyyy, HH:mm', { locale: id })}</td>
                                <td className="px-5 py-4 text-sm">{booking.package?.name || 'Belum diatur'}</td>
                                <td className="px-5 py-4 text-sm font-semibold">Rp {(booking.totalPrice || 0).toLocaleString('id-ID')}</td>
                                <td className="px-5 py-4 text-center"><StatusBadge status={booking.bookingStatus} /></td>
                                <td className="px-5 py-4 text-center space-x-2">
                                    <button onClick={() => handleOpenManageModal(booking)} className="p-2 text-muted hover:text-blue-600 rounded-full hover:bg-base-200" title="Kelola Booking"><Edit size={16}/></button>
                                    {booking.bookingStatus === BookingStatus.Confirmed && 
                                        <button onClick={() => setBookingToInvoice(booking)} className="p-2 text-muted hover:text-green-600 rounded-full hover:bg-base-200" title="Lihat Invoice"><FileText size={16}/></button>
                                    }
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <ManageBookingModal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} booking={selectedBooking} packages={packages} onSave={handleManageSave} />
            <InvoiceModal isOpen={!!bookingToInvoice} onClose={() => setBookingToInvoice(null)} booking={bookingToInvoice}/>
        </div>
    );
};

export default AdminInstitutionalBookingsPage;
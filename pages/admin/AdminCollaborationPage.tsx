

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getSponsorships, getInstitutionalBookings, getPackages, updateSponsorship, deleteSponsorship, updateBooking, logCollaborationActivity, getCollaborationActivity, generateMouContent } from '../../services/api';
import { Sponsorship, SponsorshipStatus, Booking, Package, BookingStatus, CollaborationActivity } from '../../types';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import InvoiceModal from '../../components/admin/InvoiceModal';
import Modal from '../../components/common/Modal';
import { Loader2, FileText, Download, Trash2, MessageCircle, Edit, Award, Briefcase, History, Clock, Sparkles, Copy } from 'lucide-react';
import format from 'date-fns/format';
import id from 'date-fns/locale/id';
import { AnimatePresence, motion } from 'framer-motion';

// --- Reusable Components for this Page ---

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-t-lg transition-colors ${active ? 'bg-white text-primary border-b-2 border-primary' : 'text-muted bg-base-100 hover:text-primary'}`}
    >
        {children}
    </button>
);

const ActivityLogModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    activities: CollaborationActivity[];
    loading: boolean;
}> = ({ isOpen, onClose, activities, loading }) => (
    <Modal isOpen={isOpen} onClose={onClose} title="Riwayat Aktivitas">
        <div className="max-h-[60vh] overflow-y-auto pr-2">
            {loading ? <Loader2 className="animate-spin mx-auto text-primary" /> : activities.length === 0 ? <p className="text-center text-muted">Belum ada aktivitas.</p> : (
                <ul className="space-y-4">
                    {activities.map(act => (
                        <li key={act.id} className="flex gap-3">
                            <div className="w-10 h-10 bg-base-100 rounded-full flex items-center justify-center text-muted flex-shrink-0"><History size={20}/></div>
                            <div>
                                <p className="text-sm font-semibold text-primary">{act.action}</p>
                                <p className="text-sm text-muted">{act.details}</p>
                                <p className="text-xs text-muted/70 mt-1">{act.userName} &bull; {format(new Date(act.timestamp), 'd MMM yyyy, HH:mm', { locale: id })}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    </Modal>
);

const GeneratedContentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    content: string;
}> = ({ isOpen, onClose, title, content }) => {
    const [isCopied, setIsCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="max-h-[60vh] overflow-y-auto pr-2 bg-gray-50 p-4 rounded-lg border">
                <pre className="whitespace-pre-wrap text-sm font-sans">{content}</pre>
            </div>
            <div className="mt-4 flex justify-end">
                <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                    <Copy size={16} /> {isCopied ? 'Tersalin!' : 'Salin Teks'}
                </button>
            </div>
        </Modal>
    );
};


// --- Main Page Component ---

const AdminCollaborationPage = () => {
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'sponsorships' | 'bookings'>('sponsorships');
    
    // Data states
    const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [packages, setPackages] = useState<Package[]>([]);
    const [activities, setActivities] = useState<CollaborationActivity[]>([]);
    const [generatedMouContent, setGeneratedMouContent] = useState('');
    
    // Loading states
    const [loading, setLoading] = useState({ page: true, mou: '', activity: false });

    // Modal states
    const [modal, setModal] = useState<{
        confirmDelete: { isOpen: boolean, item: Sponsorship | Booking | null, type: 'sponsorship' | 'booking' };
        manageBooking: { isOpen: boolean, item: Booking | null };
        invoice: { isOpen: boolean, item: Booking | null };
        activityLog: { isOpen: boolean, item: Sponsorship | Booking | null, type: 'sponsorship' | 'booking' };
        generatedContent: { isOpen: boolean };
    }>({
        confirmDelete: { isOpen: false, item: null, type: 'sponsorship' },
        manageBooking: { isOpen: false, item: null },
        invoice: { isOpen: false, item: null },
        activityLog: { isOpen: false, item: null, type: 'sponsorship' },
        generatedContent: { isOpen: false },
    });

    const fetchData = async () => {
        setLoading(p => ({ ...p, page: true }));
        const [sponsorshipsData, bookingsData, packagesData] = await Promise.all([getSponsorships(), getInstitutionalBookings(), getPackages()]);
        setSponsorships(sponsorshipsData);
        setBookings(bookingsData);
        setPackages(packagesData);
        setLoading(p => ({ ...p, page: false }));
    };

    useEffect(() => { fetchData(); }, []);
    
    // --- Handlers for Sponsorships ---
    const handleSponsorshipStatusChange = async (sponsorship: Sponsorship, status: SponsorshipStatus) => {
        if (!currentUser) return;
        const oldStatus = sponsorship.status;
        setSponsorships(sponsorships.map(s => s.id === sponsorship.id ? { ...s, status } : s)); // Optimistic update
        try {
            await updateSponsorship(sponsorship.id, { status }, currentUser.id);
            await logCollaborationActivity('sponsorships', sponsorship.id, 'Status Diubah', `Dari "${oldStatus}" menjadi "${status}"`, currentUser.id);
        } catch (e) {
            setSponsorships(sponsorships); // Revert on fail
            alert('Gagal memperbarui status.');
        }
    };

    const handleGenerateMoU = async (sponsorship: Sponsorship) => {
        setLoading(p => ({ ...p, mou: sponsorship.id }));
        try {
            const content = await generateMouContent(sponsorship);
            setGeneratedMouContent(content);
            setModal(m => ({...m, generatedContent: { isOpen: true }}));
        } catch (error) {
            console.error("Failed to generate MoU:", error);
            alert("Gagal membuat konten MoU.");
        } finally {
            setLoading(p => ({ ...p, mou: '' }));
        }
    };

    const handleSponsorshipDelete = async () => {
        if (!currentUser || !modal.confirmDelete.item) return;
        await deleteSponsorship(modal.confirmDelete.item.id, currentUser.id);
        setModal(m => ({ ...m, confirmDelete: { isOpen: false, item: null, type: 'sponsorship' } }));
        fetchData();
    };

    // --- Handlers for Bookings ---
    const handleManageBookingSave = async (bookingId: string, data: Partial<Booking>) => {
        if(!currentUser) return;
        const oldStatus = bookings.find(b => b.id === bookingId)?.bookingStatus;
        await updateBooking(bookingId, data, currentUser.id);
        if (data.bookingStatus !== oldStatus) {
            await logCollaborationActivity('bookings', bookingId, 'Status Diubah', `Dari "${oldStatus}" menjadi "${data.bookingStatus}"`, currentUser.id);
        } else {
             await logCollaborationActivity('bookings', bookingId, 'Detail Diubah', `Admin mengubah detail booking.`, currentUser.id);
        }
        setModal(m => ({ ...m, manageBooking: { isOpen: false, item: null } }));
        fetchData();
    };
    
    // --- Generic Handlers ---
    const handleOpenActivityLog = async (item: Sponsorship | Booking, type: 'sponsorships' | 'bookings') => {
        setModal(m => ({ ...m, activityLog: { isOpen: true, item, type: type as any } }));
        setLoading(p => ({ ...p, activity: true }));
        setActivities([]);
        const activityData = await getCollaborationActivity(type, item.id);
        setActivities(activityData);
        setLoading(p => ({ ...p, activity: false }));
    };

    const getWaLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '')}`;

    if (loading.page) return <div className="text-center p-8"><Loader2 className="animate-spin text-primary" size={48} /></div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Pusat Kolaborasi</h1>
            </div>
            <div className="border-b mb-6">
                <TabButton active={activeTab === 'sponsorships'} onClick={() => setActiveTab('sponsorships')}><Award size={16}/> Sponsorship & Partner</TabButton>
                <TabButton active={activeTab === 'bookings'} onClick={() => setActiveTab('bookings')}><Briefcase size={16}/> Event & Instansi</TabButton>
            </div>
            
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                >
                    {activeTab === 'sponsorships' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {sponsorships.map(sp => (
                                <div key={sp.id} className="bg-white rounded-lg shadow-md border p-5 flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-lg text-primary">{sp.eventName}</p>
                                            <p className="text-sm text-muted">{sp.institutionName}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-sm">{sp.picName}</p>
                                            <p className="text-xs text-muted">PIC</p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted">Status</label>
                                        <select value={sp.status} onChange={e => handleSponsorshipStatusChange(sp, e.target.value as SponsorshipStatus)} className="w-full text-sm p-1.5 border rounded-md bg-transparent focus:ring-accent focus:border-accent">
                                            {Object.values(SponsorshipStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex-grow"></div>
                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t">
                                        <div className="flex items-center gap-2">
                                            <a href={sp.proposalUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-semibold text-primary/80 hover:underline"><FileText size={14}/> Proposal</a>
                                            {sp.agreementUrl && <a href={sp.agreementUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-semibold text-success/80 hover:underline"><Download size={14}/> MoU</a>}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {(sp.status === SponsorshipStatus.Approved || sp.status === SponsorshipStatus.Negotiation) && (
                                                <button onClick={() => handleGenerateMoU(sp)} disabled={loading.mou === sp.id} className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-md w-32 flex justify-center hover:bg-primary/20">
                                                    {loading.mou === sp.id ? <Loader2 className="animate-spin" size={14} /> : <><Sparkles size={14} className="mr-1"/> Generate MoU (AI)</>}
                                                </button>
                                            )}
                                            <button onClick={() => handleOpenActivityLog(sp, 'sponsorships')} className="p-2 text-muted hover:text-primary rounded-full" title="Riwayat"><History size={16} /></button>
                                            <a href={getWaLink(sp.picContact)} target="_blank" rel="noreferrer" title="Hubungi PIC" className="p-2 text-muted hover:text-success rounded-full"><MessageCircle size={16} /></a>
                                            <button onClick={() => setModal(m => ({ ...m, confirmDelete: { isOpen: true, item: sp, type: 'sponsorship' } }))} className="p-2 text-muted hover:text-error rounded-full" title="Hapus"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {bookings.map(b => (
                                <div key={b.id} className="bg-white rounded-lg shadow-md border p-5 flex flex-col gap-4">
                                     <div>
                                        <p className="font-bold text-lg text-primary">{b.institutionName}</p>
                                        <p className="text-sm text-muted">{b.activityType}</p>
                                    </div>
                                    <div className="text-sm space-y-2 p-3 bg-base-100 rounded-lg">
                                        <p><strong>Jadwal:</strong> {format(new Date(b.bookingDate), 'd MMM yyyy, HH:mm', { locale: id })}</p>
                                        <p><strong>PIC:</strong> {b.picName} ({b.picContact})</p>
                                        <p><strong>Peserta:</strong> {b.numberOfParticipants} orang</p>
                                        {b.promoCodeUsed && <p><strong>Kode Promo:</strong> <span className="font-mono bg-accent/10 text-accent px-2 py-0.5 rounded">{b.promoCodeUsed}</span></p>}
                                    </div>
                                    <div className="flex-grow"></div>
                                    <div className="flex items-center justify-between gap-2 pt-4 border-t">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${b.bookingStatus === BookingStatus.Confirmed ? 'bg-success/10 text-success' : 'bg-yellow-100 text-yellow-800'}`}>{b.bookingStatus}</span>
                                        <div className="flex items-center gap-1">
                                            {b.bookingStatus === BookingStatus.Confirmed && <button onClick={() => setModal(m => ({ ...m, invoice: { isOpen: true, item: b } }))} className="p-2 text-muted hover:text-success rounded-full" title="Lihat Invoice"><FileText size={16} /></button>}
                                            <button onClick={() => handleOpenActivityLog(b, 'bookings')} className="p-2 text-muted hover:text-primary rounded-full" title="Riwayat"><History size={16} /></button>
                                            <button onClick={() => setModal(m => ({ ...m, manageBooking: { isOpen: true, item: b } }))} className="p-2 text-muted hover:text-accent rounded-full" title="Kelola"><Edit size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* --- Modals --- */}
            <ConfirmationModal
                isOpen={modal.confirmDelete.isOpen}
                onClose={() => setModal(m => ({ ...m, confirmDelete: { isOpen: false, item: null, type: 'sponsorship' } }))}
                onConfirm={modal.confirmDelete.type === 'sponsorship' ? handleSponsorshipDelete : () => {}}
                title={`Hapus ${modal.confirmDelete.type === 'sponsorship' ? 'Sponsorship' : 'Booking'}`}
                message={`Anda yakin ingin menghapus data ini?`}
            />
            <ActivityLogModal isOpen={modal.activityLog.isOpen} onClose={() => setModal(m => ({ ...m, activityLog: { isOpen: false, item: null, type: 'sponsorship' } }))} activities={activities} loading={loading.activity} />
            <InvoiceModal isOpen={modal.invoice.isOpen} onClose={() => setModal(m => ({ ...m, invoice: { isOpen: false, item: null } }))} booking={modal.invoice.item} />
            {modal.manageBooking.item && <ManageBookingModal isOpen={modal.manageBooking.isOpen} onClose={() => setModal(m => ({ ...m, manageBooking: { isOpen: false, item: null } }))} booking={modal.manageBooking.item} onSave={handleManageBookingSave} />}
            <GeneratedContentModal isOpen={modal.generatedContent.isOpen} onClose={() => setModal(m => ({...m, generatedContent: {isOpen: false}}))} title="Draf Konten MoU (AI)" content={generatedMouContent} />
        </div>
    );
};

// Re-implementing ManageBookingModal locally to use it in this file
const ManageBookingModal: React.FC<{
    isOpen: boolean; onClose: () => void; booking: Booking | null; onSave: (id: string, data: Partial<Booking>) => Promise<void>;
}> = ({ isOpen, onClose, booking, onSave }) => {
    const [formData, setFormData] = useState<Partial<Booking>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => { if (booking) setFormData(booking); }, [booking]);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (booking) {
            setIsSaving(true);
            const data: Partial<Booking> = { bookingStatus: formData.bookingStatus, totalPrice: Number(formData.totalPrice), paymentMode: formData.paymentMode };
            if (formData.totalPrice) data.remainingBalance = Number(formData.totalPrice);
            await onSave(booking.id, data);
            setIsSaving(false);
        }
    };
    if (!booking) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Kelola: ${booking.institutionName}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div><label className="text-sm font-medium">Status</label><select name="bookingStatus" value={formData.bookingStatus} onChange={handleChange} className="w-full p-2 border rounded mt-1">{Object.values(BookingStatus).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="text-sm font-medium">Total Harga (Rp)</label><input name="totalPrice" type="number" value={formData.totalPrice || ''} onChange={handleChange} required className="w-full p-2 border rounded mt-1"/></div>
                <div><label className="text-sm font-medium">Mode Pembayaran</label><select name="paymentMode" value={formData.paymentMode} onChange={handleChange} className="w-full p-2 border rounded mt-1"><option value="dp">DP</option><option value="lunas">Lunas</option><option value="termin">Termin</option></select></div>
                {formData.promoCodeUsed && <div><label className="text-sm font-medium">Kode Promo Digunakan</label><input type="text" value={formData.promoCodeUsed} readOnly className="w-full p-2 border rounded mt-1 bg-gray-100 font-mono"/></div>}
                <div className="flex justify-end pt-4"><button type="submit" disabled={isSaving} className="px-4 py-2 bg-primary text-white rounded-lg w-32 flex justify-center">{isSaving ? <Loader2 className="animate-spin"/> : 'Simpan'}</button></div>
            </form>
        </Modal>
    );
};


export default AdminCollaborationPage;
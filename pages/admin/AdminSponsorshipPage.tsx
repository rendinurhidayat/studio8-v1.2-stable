import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getSponsorships, updateSponsorship, deleteSponsorship } from '../../services/api';
import { Sponsorship, SponsorshipStatus } from '../../types';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { Loader2, FileText, Download, Trash2, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import id from 'date-fns/locale/id';

const AdminSponsorshipPage = () => {
    const { user: currentUser } = useAuth();
    const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
    const [loading, setLoading] = useState({ page: true, mou: '' });
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedSponsorship, setSelectedSponsorship] = useState<Sponsorship | null>(null);

    const fetchData = async () => {
        setLoading(p => ({ ...p, page: true }));
        setSponsorships(await getSponsorships());
        setLoading(p => ({ ...p, page: false }));
    };

    useEffect(() => { fetchData(); }, []);

    const handleStatusChange = async (sponsorshipId: string, status: SponsorshipStatus) => {
        if (!currentUser) return;
        const originalSponsorship = sponsorships.find(s => s.id === sponsorshipId);
        if (!originalSponsorship) return;

        // Optimistic UI update
        const updatedSponsorships = sponsorships.map(s => s.id === sponsorshipId ? { ...s, status } : s);
        setSponsorships(updatedSponsorships);

        try {
            await updateSponsorship(sponsorshipId, { status }, currentUser.id);
            // No need to call fetchData() again due to optimistic update
        } catch (error) {
            console.error("Failed to update status:", error);
            // Revert on failure
            setSponsorships(sponsorships); 
            alert("Gagal memperbarui status.");
        }
    };
    
    const handleGenerateMoU = async (sponsorship: Sponsorship) => {
        if (!currentUser) return;
        setLoading(p => ({ ...p, mou: sponsorship.id }));
        try {
            const response = await fetch('/api/generateMou', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sponsorshipData: sponsorship, mentorName: currentUser.name })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Gagal membuat MoU");
            }
            // The API updates the status and URL, so we refetch to get the latest data
            await fetchData();

        } catch (error) {
            alert("Terjadi kesalahan saat membuat MoU.");
            console.error(error);
        } finally {
            setLoading(p => ({ ...p, mou: '' }));
        }
    };

    const handleDelete = async () => {
        if (!currentUser || !selectedSponsorship) return;
        await deleteSponsorship(selectedSponsorship.id, currentUser.id);
        setIsConfirmOpen(false);
        fetchData();
    };
    
    const getWaLink = (phone: string) => {
        const cleaned = phone.replace(/\D/g, '');
        const number = cleaned.startsWith('0') ? `62${cleaned.substring(1)}` : cleaned;
        return `https://wa.me/${number}`;
    }

    if (loading.page) return <div className="text-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Manajemen Sponsorship</h1>
                {/* Add button can be re-added if admin needs to manually input sponsorships */}
            </div>
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-base-100">
                        <tr>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-muted">Event/Instansi</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-muted">PIC</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-muted">Status</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-muted">Dokumen</th>
                            <th className="px-5 py-3 text-center text-xs font-semibold text-muted">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sponsorships.map(sp => (
                            <tr key={sp.id} className="hover:bg-gray-50 border-b">
                                <td className="px-5 py-4">
                                    <p className="font-semibold text-primary">{sp.eventName}</p>
                                    <p className="text-xs text-muted">{sp.institutionName}</p>
                                </td>
                                <td className="px-5 py-4 text-sm">
                                    <p className="font-medium">{sp.picName}</p>
                                    <p className="text-xs text-muted">{sp.picContact}</p>
                                </td>
                                <td className="px-5 py-4">
                                    <select 
                                        value={sp.status} 
                                        onChange={e => handleStatusChange(sp.id, e.target.value as SponsorshipStatus)}
                                        className="text-xs p-1.5 border rounded-md bg-transparent focus:ring-accent focus:border-accent"
                                    >
                                        {Object.values(SponsorshipStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </td>
                                <td className="px-5 py-4 text-sm">
                                    <a href={sp.proposalUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline" title="Lihat Proposal">
                                        <FileText size={16}/> Proposal
                                    </a>
                                    {sp.agreementUrl && 
                                    <a href={sp.agreementUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-success hover:underline mt-2" title="Download MoU">
                                        <Download size={16}/> MoU
                                    </a>}
                                </td>
                                <td className="px-5 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        {(sp.status === SponsorshipStatus.Approved || sp.status === SponsorshipStatus.Negotiation) && (
                                            <button onClick={() => handleGenerateMoU(sp)} disabled={loading.mou === sp.id} className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-md w-32 flex justify-center hover:bg-primary/20">
                                                {loading.mou === sp.id ? <Loader2 className="animate-spin" size={14} /> : 'Generate MoU'}
                                            </button>
                                        )}
                                        <a href={getWaLink(sp.picContact)} target="_blank" rel="noopener noreferrer" title="Hubungi PIC" className="p-2 text-muted hover:text-success rounded-full hover:bg-base-200"><MessageCircle size={18} /></a>
                                        <button onClick={() => { setSelectedSponsorship(sp); setIsConfirmOpen(true); }} className="p-2 text-muted hover:text-error rounded-full hover:bg-base-200" title="Hapus">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleDelete}
                title="Hapus Sponsorship"
                message={`Anda yakin ingin menghapus kerjasama dengan ${selectedSponsorship?.institutionName}?`}
            />
        </div>
    );
};

export default AdminSponsorshipPage;
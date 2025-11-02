import React, { useState, useEffect, useMemo } from 'react';
import { getInventoryItems, updateInventoryItem } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { InventoryItem, InventoryStatus } from '../../types';
import { Check, AlertTriangle, MessageSquare, Loader2 } from 'lucide-react';
import Modal from '../../components/common/Modal';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import id from 'date-fns/locale/id';

const StatusBadge: React.FC<{ status: InventoryStatus }> = ({ status }) => {
    const statusClasses = {
        [InventoryStatus.Available]: 'bg-green-100 text-green-800',
        [InventoryStatus.UnderRepair]: 'bg-yellow-100 text-yellow-800',
        [InventoryStatus.Missing]: 'bg-red-100 text-red-800',
    };
    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusClasses[status]}`}>
            {status}
        </span>
    );
};

const ReportIssueModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    item: InventoryItem | null;
    onReport: (itemId: string, status: InventoryStatus, notes: string) => void;
}> = ({ isOpen, onClose, item, onReport }) => {
    const [status, setStatus] = useState(InventoryStatus.UnderRepair);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (item) {
            setStatus(item.status === InventoryStatus.Available ? InventoryStatus.UnderRepair : item.status);
            setNotes(item.notes || '');
        }
    }, [item]);
    
    if (!item) return null;

    const handleSubmit = () => {
        onReport(item.id, status, notes);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Laporkan Masalah: ${item.name}`}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Ubah Status Menjadi</label>
                    <select value={status} onChange={e => setStatus(e.target.value as InventoryStatus)} className="mt-1 w-full p-2 border rounded">
                        <option value={InventoryStatus.UnderRepair}>Perbaikan</option>
                        <option value={InventoryStatus.Missing}>Hilang</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Catatan (Wajib)</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1 w-full p-2 border rounded" placeholder="Contoh: Tombol shutter macet."/>
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200">Batal</button>
                <button onClick={handleSubmit} disabled={!notes.trim()} className="px-4 py-2 rounded bg-yellow-500 text-white hover:bg-yellow-600 disabled:bg-yellow-300">
                    Laporkan
                </button>
            </div>
        </Modal>
    );
};

const StaffInventoryPage = () => {
    const { user: currentUser } = useAuth();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
    const [itemToReport, setItemToReport] = useState<InventoryItem | null>(null);

    const fetchData = async () => {
        setLoading(true);
        const data = await getInventoryItems();
        setInventory(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCheckItem = async (item: InventoryItem) => {
        if (!currentUser) return;
        setActionLoading(prev => ({ ...prev, [item.id]: true }));
        await updateInventoryItem(item.id, {
            status: InventoryStatus.Available,
            lastChecked: new Date().toISOString(),
            notes: '' // Clear notes when checked as okay
        }, currentUser.id);
        await fetchData();
        setActionLoading(prev => ({ ...prev, [item.id]: false }));
    };
    
    const handleReportIssue = async (itemId: string, status: InventoryStatus, notes: string) => {
        if (!currentUser) return;
        setActionLoading(prev => ({ ...prev, [itemId]: true }));
         await updateInventoryItem(itemId, {
            status,
            notes,
            lastChecked: new Date().toISOString()
        }, currentUser.id);
        await fetchData();
        setActionLoading(prev => ({ ...prev, [itemId]: false }));
    }

    const groupedInventory = useMemo(() => {
        const grouped: Record<string, InventoryItem[]> = {};
        for (const item of inventory) {
            const category = item.category;
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(item);
        }
        return grouped;
    }, [inventory]);

    if (loading) return <p>Loading inventory...</p>;

    return (
        <div>
            <h1 className="text-3xl font-bold">Cek Inventaris Studio</h1>
            <p className="text-muted mt-1 mb-6">Pastikan semua peralatan dalam kondisi baik dan siap digunakan.</p>

            <div className="space-y-8">
                {Object.keys(groupedInventory).map((category) => {
                    const items = groupedInventory[category];
                    return (
                        <div key={category}>
                            <h2 className="text-xl font-semibold mb-3 pb-2 border-b">{category}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {items.map(item => (
                                    <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm border flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold text-base-content">{item.name}</h3>
                                                <StatusBadge status={item.status} />
                                            </div>
                                            <p className="text-xs text-muted mt-1">
                                                Terakhir dicek: {item.lastChecked ? formatDistanceToNow(new Date(item.lastChecked), { addSuffix: true, locale: id }) : 'Belum pernah'}
                                            </p>
                                            {item.notes && item.status !== InventoryStatus.Available && (
                                                <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 text-xs rounded flex items-start gap-2">
                                                    <MessageSquare size={14} className="flex-shrink-0 mt-0.5"/>
                                                    <span>{item.notes}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-4">
                                            <button 
                                                onClick={() => handleCheckItem(item)}
                                                disabled={actionLoading[item.id]}
                                                className="flex-1 flex justify-center items-center gap-2 px-3 py-2 text-sm font-semibold text-green-700 bg-green-100 hover:bg-green-200 rounded-md disabled:opacity-50"
                                            >
                                                {actionLoading[item.id] ? <Loader2 size={16} className="animate-spin"/> : <><Check size={16} /> Cek & Konfirmasi</>}
                                            </button>
                                            <button 
                                                onClick={() => setItemToReport(item)}
                                                disabled={actionLoading[item.id]}
                                                className="flex-1 flex justify-center items-center gap-2 px-3 py-2 text-sm font-semibold text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded-md disabled:opacity-50"
                                            >
                                                <AlertTriangle size={16} /> Laporkan Masalah
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
            <ReportIssueModal 
                isOpen={!!itemToReport}
                onClose={() => setItemToReport(null)}
                item={itemToReport}
                onReport={handleReportIssue}
            />
        </div>
    );
};

export default StaffInventoryPage;
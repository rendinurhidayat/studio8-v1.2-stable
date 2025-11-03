import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { createPracticalClass, getPracticalClasses, deletePracticalClass, getUsers } from '../../services/api';
import { PracticalClass, User, UserRole } from '../../types';
import Modal from '../../components/common/Modal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { PlusCircle, Trash2, Loader2, BookOpen, Clock, Users, Sparkles, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import id from 'date-fns/locale/id';

const PracticalClassManagerPage = () => {
    const { user: currentUser } = useAuth();
    const [classes, setClasses] = useState<PracticalClass[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState({ page: true, modal: false });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState<PracticalClass | null>(null);

    const [formData, setFormData] = useState({
        topic: '',
        description: '',
        classDate: '',
        mentorName: currentUser?.name || '',
        maxParticipants: 10,
    });
    
    const interns = users.filter(u => u.role === UserRole.AnakMagang || u.role === UserRole.AnakPKL);
    
    const fetchData = async () => {
        setLoading(p => ({ ...p, page: true }));
        const [classesData, usersData] = await Promise.all([getPracticalClasses(), getUsers()]);
        setClasses(classesData);
        setUsers(usersData);
        setLoading(p => ({ ...p, page: false }));
    };

    useEffect(() => {
        fetchData();
    }, []);
    
    const handleGenerateDescription = async () => {
        if (!formData.topic.trim()) return;
        setLoading(p => ({ ...p, modal: true }));
        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generateClassDescription', topic: formData.topic }),
            });
            if (!response.ok) throw new Error('Failed to generate description.');
            const description = await response.text();
            setFormData(p => ({ ...p, description }));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(p => ({ ...p, modal: false }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        setLoading(p => ({ ...p, modal: true }));
        try {
            await createPracticalClass({
                topic: formData.topic,
                description: formData.description,
                classDate: new Date(formData.classDate).toISOString(),
                mentorName: formData.mentorName,
                maxParticipants: Number(formData.maxParticipants),
                registeredInternIds: [],
            }, currentUser.id);
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(p => ({ ...p, modal: false }));
        }
    };

    const handleDelete = async () => {
        if (!currentUser || !selectedClass) return;
        await deletePracticalClass(selectedClass.id, currentUser.id);
        setIsConfirmOpen(false);
        fetchData();
    };
    
    if (loading.page) return <div className="text-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Manajemen Kelas Praktek</h1>
                <button onClick={() => { setFormData({ topic: '', description: '', classDate: '', mentorName: currentUser?.name || '', maxParticipants: 10 }); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                    <PlusCircle size={18} /> Buat Kelas Baru
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map(cls => (
                    <div key={cls.id} className="bg-white rounded-lg shadow-md border p-5 flex flex-col">
                        <div className="flex justify-between items-start">
                             <h3 className="font-bold text-lg text-primary">{cls.topic}</h3>
                             <button onClick={() => { setSelectedClass(cls); setIsConfirmOpen(true); }} className="p-1 text-muted hover:text-error"><Trash2 size={16}/></button>
                        </div>
                        <p className="text-sm text-muted mt-2 flex-grow">{cls.description}</p>
                        <div className="text-xs text-muted mt-4 pt-4 border-t space-y-2">
                            <div className="flex items-center gap-2"><Clock size={14}/> {format(new Date(cls.classDate), 'd MMM yyyy, HH:mm', { locale: id })}</div>
                            <div className="flex items-center gap-2"><UserIcon size={14}/> Mentor: {cls.mentorName}</div>
                            <div className="flex items-center gap-2"><Users size={14}/> {cls.registeredInternIds.length} / {cls.maxParticipants} Peserta</div>
                        </div>
                         {cls.registeredInternIds.length > 0 && (
                            <div className="mt-2 pt-2 border-t">
                                <p className="text-xs font-semibold mb-1">Peserta Terdaftar:</p>
                                <ul className="text-xs text-muted list-disc list-inside">
                                    {cls.registeredInternIds.map(internId => {
                                        const intern = interns.find(i => i.id === internId);
                                        return <li key={internId}>{intern ? intern.name : 'Unknown'}</li>;
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Buat Kelas Praktek Baru">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="font-semibold text-sm">Topik Kelas</label><input type="text" value={formData.topic} onChange={e => setFormData(p => ({...p, topic: e.target.value}))} required className="w-full p-2 border rounded mt-1"/></div>
                    <div>
                        <label className="font-semibold text-sm">Deskripsi</label>
                        <div className="flex items-center gap-2">
                             <textarea value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} required rows={3} className="w-full p-2 border rounded mt-1"/>
                             <button type="button" onClick={handleGenerateDescription} disabled={loading.modal} className="p-2 bg-accent/10 text-accent rounded-full h-fit" title="Generate with AI"><Sparkles size={18}/></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="font-semibold text-sm">Jadwal</label><input type="datetime-local" value={formData.classDate} onChange={e => setFormData(p => ({...p, classDate: e.target.value}))} required className="w-full p-2 border rounded mt-1"/></div>
                        <div><label className="font-semibold text-sm">Peserta (Max)</label><input type="number" value={formData.maxParticipants} onChange={e => setFormData(p => ({...p, maxParticipants: Number(e.target.value)}))} required className="w-full p-2 border rounded mt-1"/></div>
                    </div>
                    <div><label className="font-semibold text-sm">Nama Mentor</label><input type="text" value={formData.mentorName} onChange={e => setFormData(p => ({...p, mentorName: e.target.value}))} required className="w-full p-2 border rounded mt-1"/></div>
                    <div className="flex justify-end pt-4"><button type="submit" disabled={loading.modal} className="px-4 py-2 bg-primary text-white rounded-lg w-28 flex justify-center">{loading.modal ? <Loader2 className="animate-spin"/> : 'Simpan'}</button></div>
                </form>
            </Modal>
            
            <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleDelete} title="Hapus Kelas" message={`Anda yakin ingin menghapus kelas "${selectedClass?.topic}"?`} />
        </div>
    );
};

export default PracticalClassManagerPage;

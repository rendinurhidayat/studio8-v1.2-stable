import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { addJobPost } from '../../services/api';
import { JobType } from '../../types';
import Modal from '../common/Modal';
import { Loader2, Send } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onJobCreated: () => void;
}

const CreateJobModal: React.FC<Props> = ({ isOpen, onClose, onJobCreated }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        title: '',
        company: '',
        location: 'Banjar',
        type: JobType.Freelance,
        description: '',
        applyLink: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        setIsSubmitting(true);
        try {
            await addJobPost({
                ...formData,
                postedById: user.id,
                postedByName: user.name,
            });
            onJobCreated();
        } catch (error) {
            console.error("Failed to create job post:", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Pasang Lowongan Kerja Baru">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium">Posisi</label><input type="text" name="title" value={formData.title} onChange={handleChange} required className="mt-1 w-full p-2 border rounded" /></div>
                    <div><label className="block text-sm font-medium">Perusahaan/Pencari</label><input type="text" name="company" value={formData.company} onChange={handleChange} required className="mt-1 w-full p-2 border rounded" /></div>
                    <div><label className="block text-sm font-medium">Lokasi</label><input type="text" name="location" value={formData.location} onChange={handleChange} required className="mt-1 w-full p-2 border rounded" /></div>
                    <div><label className="block text-sm font-medium">Tipe</label><select name="type" value={formData.type} onChange={handleChange} className="mt-1 w-full p-2 border rounded">{Object.values(JobType).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                </div>
                <div><label className="block text-sm font-medium">Deskripsi</label><textarea name="description" value={formData.description} onChange={handleChange} required rows={5} className="mt-1 w-full p-2 border rounded" /></div>
                <div><label className="block text-sm font-medium">Link/Email Lamaran</label><input type="text" name="applyLink" value={formData.applyLink} onChange={handleChange} required className="mt-1 w-full p-2 border rounded" /></div>
                
                <div className="flex justify-end pt-2">
                    <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send size={16} /> Publikasikan</>}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateJobModal;
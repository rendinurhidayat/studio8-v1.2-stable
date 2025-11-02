

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { addEvent } from '../../services/api';
import Modal from '../common/Modal';
import { Loader2, Send } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onEventCreated: () => void;
}

const CreateEventModal: React.FC<Props> = ({ isOpen, onClose, onEventCreated }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        eventDate: '',
        location: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        setIsSubmitting(true);
        try {
            await addEvent({
                ...formData,
                eventDate: new Date(formData.eventDate).toISOString(),
                createdById: user.id,
                createdByName: user.name,
            });
            onEventCreated();
        } catch (error) {
            console.error("Failed to create event:", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Buat Event Baru">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium">Nama Event</label><input type="text" name="title" value={formData.title} onChange={handleChange} required className="mt-1 w-full p-2 border rounded" /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium">Tanggal & Waktu</label><input type="datetime-local" name="eventDate" value={formData.eventDate} onChange={handleChange} required className="mt-1 w-full p-2 border rounded" /></div>
                    <div><label className="block text-sm font-medium">Lokasi</label><input type="text" name="location" value={formData.location} onChange={handleChange} required className="mt-1 w-full p-2 border rounded" /></div>
                </div>
                <div><label className="block text-sm font-medium">Deskripsi</label><textarea name="description" value={formData.description} onChange={handleChange} required rows={4} className="mt-1 w-full p-2 border rounded" /></div>
                
                <div className="flex justify-end pt-2">
                    <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send size={16} /> Publikasikan Event</>}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateEventModal;
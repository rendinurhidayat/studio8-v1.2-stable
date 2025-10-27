import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { addForumThread } from '../../services/api';
import { ForumCategory } from '../../types';
import Modal from '../common/Modal';
import { Loader2, Send } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onThreadCreated: () => void;
}

const CreateThreadModal: React.FC<Props> = ({ isOpen, onClose, onThreadCreated }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<ForumCategory>(ForumCategory.Fotografi);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !title.trim() || !content.trim()) return;

        setIsSubmitting(true);
        try {
            await addForumThread({
                title,
                content,
                category,
                authorId: user.id,
                authorName: user.name,
            });
            onThreadCreated();
        } catch (error) {
            console.error("Failed to create thread:", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Mulai Diskusi Baru">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Judul</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="block text-sm font-medium">Kategori</label>
                    <select value={category} onChange={e => setCategory(e.target.value as ForumCategory)} className="mt-1 w-full p-2 border rounded">
                        {Object.values(ForumCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium">Isi</label>
                    <textarea value={content} onChange={e => setContent(e.target.value)} required rows={5} className="mt-1 w-full p-2 border rounded" />
                </div>
                <div className="flex justify-end pt-2">
                    <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send size={16} /> Publikasikan</>}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateThreadModal;
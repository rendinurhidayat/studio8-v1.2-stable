import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getHighlightWorks, addHighlightWork, updateHighlightWork, deleteHighlightWork, getUsers } from '../../services/api';
import { HighlightWork, User, UserRole } from '../../types';
import Modal from '../../components/common/Modal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { PlusCircle, Edit, Trash2, Loader2, Upload, Box } from 'lucide-react';
import format from 'date-fns/format';
import id from 'date-fns/locale/id';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
             if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('FileReader result is not a string'));
            }
        };
        reader.onerror = error => reject(error);
    });
};

const AdminHighlightManagerPage = () => {
    const { user: currentUser } = useAuth();
    const [works, setWorks] = useState<HighlightWork[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState({ page: true, modal: false });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedWork, setSelectedWork] = useState<HighlightWork | null>(null);

    const [formData, setFormData] = useState<Partial<HighlightWork>>({});
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

    const interns = users.filter(u => u.role === UserRole.AnakMagang || u.role === UserRole.AnakPKL);
    const mentors = users.filter(u => u.role === UserRole.Admin || u.role === UserRole.Staff);

    const fetchData = async () => {
        setLoading(p => ({ ...p, page: true }));
        const [worksData, usersData] = await Promise.all([getHighlightWorks(), getUsers()]);
        setWorks(worksData);
        setUsers(usersData);
        setLoading(p => ({ ...p, page: false }));
    };

    useEffect(() => {
        fetchData();
    }, []);

    const resetForm = () => {
        setFormData({
            title: '', author: '', mentor: '', major: '', description: '',
            type: 'Image', category: 'PKL', highlightDate: new Date().toISOString(), instagramUrl: ''
        });
        setMediaFile(null); setThumbnailFile(null);
        setMediaPreview(null); setThumbnailPreview(null);
    };

    const handleOpenModal = (mode: 'add' | 'edit', work?: HighlightWork) => {
        resetForm();
        setIsEditing(mode === 'edit');
        if (mode === 'edit' && work) {
            setSelectedWork(work);
            setFormData({ ...work });
            setMediaPreview(work.mediaUrl);
            setThumbnailPreview(work.thumbnailUrl);
        }
        setIsModalOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'media' | 'thumbnail') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            if (type === 'media') {
                setMediaFile(file);
                setMediaPreview(reader.result as string);
            } else {
                setThumbnailFile(file);
                setThumbnailPreview(reader.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    const uploadFile = async (file: File, folder: string, publicId?: string): Promise<string> => {
        const imageBase64 = await fileToBase64(file);
        const response = await fetch('/api/assets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'upload', imageBase64, folder, publicId })
        });
        if (!response.ok) throw new Error('File upload failed');
        const result = await response.json();
        return result.secure_url;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        setLoading(p => ({ ...p, modal: true }));
        
        try {
            let mediaUrl = formData.mediaUrl || '';
            let thumbnailUrl = formData.thumbnailUrl || '';

            if (mediaFile) {
                mediaUrl = await uploadFile(mediaFile, 'highlight_media');
                // Auto-generate thumbnail URL from video URL
                if (formData.type === 'Video' && mediaUrl) {
                    thumbnailUrl = mediaUrl.replace(/\.(mp4|mov|avi|wmv|flv|webm|mkv)$/i, '.jpg');
                }
            }
            if (thumbnailFile && formData.type !== 'Video') { // Only upload manual thumbnail if not a video
                thumbnailUrl = await uploadFile(thumbnailFile, 'highlight_thumbnails');
            }

            if (!thumbnailUrl && formData.type !== 'Video') {
                throw new Error("Thumbnail is required for image or design types.");
            }

            const payload: Omit<HighlightWork, 'id'> = {
                title: formData.title!, author: formData.author!,
                major: formData.major, mentor: formData.mentor,
                description: formData.description!, mediaUrl, thumbnailUrl,
                type: formData.type!, highlightDate: new Date(formData.highlightDate!).toISOString(),
                category: formData.category!,
                instagramUrl: formData.instagramUrl,
            };

            if (isEditing && selectedWork) {
                await updateHighlightWork(selectedWork.id, payload, currentUser.id);
            } else {
                await addHighlightWork(payload, currentUser.id);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Gagal menyimpan data: " + (error as Error).message);
        } finally {
            setLoading(p => ({ ...p, modal: false }));
        }
    };

    const handleDelete = async () => {
        if (!currentUser || !selectedWork) return;
        await deleteHighlightWork(selectedWork.id, currentUser.id);
        setIsConfirmOpen(false);
        fetchData();
    };

    if (loading.page) return <div className="text-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Manajemen Highlight Wall</h1>
                <button onClick={() => handleOpenModal('add')} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                    <PlusCircle size={18} /> Tambah Karya Baru
                </button>
            </div>
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-5 py-3 text-left text-xs font-semibold">Karya</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold">Kreator</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold">Kategori</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold">Tipe</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold">Tanggal</th>
                            <th className="px-5 py-3 text-center text-xs font-semibold">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {works.map(work => (
                            <tr key={work.id} className="hover:bg-gray-50 border-b">
                                <td className="px-5 py-2 flex items-center gap-3">
                                    <img src={work.thumbnailUrl} alt={work.title} className="w-16 h-10 object-cover rounded-md"/>
                                    <span className="font-medium">{work.title}</span>
                                </td>
                                <td className="px-5 py-2">{work.author}</td>
                                <td className="px-5 py-2"><span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{work.category}</span></td>
                                <td className="px-5 py-2">{work.type}</td>
                                <td className="px-5 py-2 text-sm text-muted">{format(new Date(work.highlightDate), 'd MMM yyyy', { locale: id })}</td>
                                <td className="px-5 py-2 text-center">
                                    <button onClick={() => handleOpenModal('edit', work)} className="p-2 text-muted hover:text-blue-600"><Edit size={16}/></button>
                                    <button onClick={() => { setSelectedWork(work); setIsConfirmOpen(true); }} className="p-2 text-muted hover:text-red-600"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Edit Karya' : 'Tambah Karya Baru'}>
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="font-semibold text-sm">Judul</label><input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required className="w-full p-2 border rounded mt-1"/></div>
                        <div><label className="font-semibold text-sm">Tanggal</label><input type="date" value={formData.highlightDate ? format(new Date(formData.highlightDate), 'yyyy-MM-dd') : ''} onChange={e => setFormData({...formData, highlightDate: e.target.value})} required className="w-full p-2 border rounded mt-1"/></div>
                        <div><label className="font-semibold text-sm">Kreator (Intern)</label><select value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} required className="w-full p-2 border rounded mt-1"><option value="">-- Pilih Intern --</option>{interns.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}</select></div>
                        <div><label className="font-semibold text-sm">Mentor</label><select value={formData.mentor} onChange={e => setFormData({...formData, mentor: e.target.value})} required className="w-full p-2 border rounded mt-1"><option value="">-- Pilih Mentor --</option>{mentors.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}</select></div>
                        <div><label className="font-semibold text-sm">Tipe</label><select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full p-2 border rounded mt-1"><option>Image</option><option>Video</option><option>Design</option></select></div>
                        <div><label className="font-semibold text-sm">Kategori</label><select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="w-full p-2 border rounded mt-1"><option>Client</option><option>PKL</option><option>Event</option><option>BTS</option></select></div>
                    </div>
                     <div><label className="font-semibold text-sm">Link Instagram (Opsional)</label><input type="url" value={formData.instagramUrl || ''} onChange={e => setFormData({...formData, instagramUrl: e.target.value})} placeholder="https://www.instagram.com/p/..." className="w-full p-2 border rounded mt-1"/></div>
                     <div><label className="font-semibold text-sm">Deskripsi</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required rows={3} className="w-full p-2 border rounded mt-1"/></div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="font-semibold text-sm block mb-1">File Media (Gambar/Video)</label>
                            <label htmlFor="media-upload" className="cursor-pointer text-sm font-semibold text-primary bg-primary/10 px-3 py-2 rounded-lg hover:bg-primary/20">Pilih File</label>
                            <input id="media-upload" type="file" onChange={e => handleFileChange(e, 'media')} className="hidden"/>
                            {mediaPreview && (formData.type === 'Video' ? <video src={mediaPreview} className="w-32 h-20 object-cover rounded-md mt-2" /> : <img src={mediaPreview} className="w-32 h-20 object-cover rounded-md mt-2" />)}
                        </div>
                        {formData.type !== 'Video' && (
                            <div>
                                <label className="font-semibold text-sm block mb-1">File Thumbnail</label>
                                <label htmlFor="thumbnail-upload" className="cursor-pointer text-sm font-semibold text-primary bg-primary/10 px-3 py-2 rounded-lg hover:bg-primary/20">Pilih File</label>
                                <input id="thumbnail-upload" type="file" onChange={e => handleFileChange(e, 'thumbnail')} className="hidden"/>
                                 {thumbnailPreview && <img src={thumbnailPreview} className="w-32 h-20 object-cover rounded-md mt-2" />}
                            </div>
                        )}
                     </div>
                    <div className="flex justify-end pt-4"><button type="submit" disabled={loading.modal} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 w-28 flex justify-center">{loading.modal ? <Loader2 className="animate-spin"/> : 'Simpan'}</button></div>
                </form>
            </Modal>
            
            <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleDelete} title="Hapus Karya" message={`Anda yakin ingin menghapus karya "${selectedWork?.title}"?`} />
        </div>
    );
};

export default AdminHighlightManagerPage;
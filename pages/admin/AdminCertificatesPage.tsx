
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getCertificates, getUsers, deleteCertificate } from '../../services/api';
import { Certificate, User, UserRole } from '../../types';
import Modal from '../../components/common/Modal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { Award, PlusCircle, Download, QrCode, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import id from 'date-fns/locale/id';
import { fileToBase64 } from '../../utils/fileUtils';

const AdminCertificatesPage = () => {
    const { user: currentUser } = useAuth();
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [interns, setInterns] = useState<User[]>([]);
    const [loading, setLoading] = useState({ page: true, modal: false });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState('');
    const [certToDelete, setCertToDelete] = useState<Certificate | null>(null);

    const [formData, setFormData] = useState({
        studentId: '',
        period: '',
        mentor: currentUser?.name || '',
    });
    const [pdfFile, setPdfFile] = useState<File | null>(null);

    const fetchData = async () => {
        setLoading(p => ({ ...p, page: true }));
        const [certsData, usersData] = await Promise.all([getCertificates(), getUsers()]);
        setCertificates(certsData);
        setInterns(usersData.filter(u => u.role === UserRole.AnakMagang || u.role === UserRole.AnakPKL));
        setLoading(p => ({ ...p, page: false }));
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = () => {
        setError('');
        setFormData({ studentId: '', period: '', mentor: currentUser?.name || '' });
        setPdfFile(null);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!formData.studentId || !formData.period || !formData.mentor) {
            setError('Semua field harus diisi.');
            return;
        }
        if (!pdfFile) {
            setError('File PDF sertifikat wajib diunggah.');
            return;
        }

        setLoading(p => ({ ...p, modal: true }));
        const selectedIntern = interns.find(i => i.id === formData.studentId);
        if (!selectedIntern) {
            setError('Siswa tidak ditemukan.');
            setLoading(p => ({ ...p, modal: false }));
            return;
        }

        try {
            const pdfBase64 = await fileToBase64(pdfFile);

            const response = await fetch('/api/certificates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentName: selectedIntern.name,
                    major: selectedIntern.jurusan || 'N/A',
                    period: formData.period,
                    mentor: formData.mentor,
                    pdfBase64: pdfBase64,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal membuat sertifikat.');
            }

            await fetchData(); // Refresh data
            setIsModalOpen(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(p => ({ ...p, modal: false }));
        }
    };
    
    const handleDeleteConfirm = async () => {
        if (certToDelete && currentUser) {
            await deleteCertificate(certToDelete.id, currentUser.id);
            setCertToDelete(null);
            fetchData();
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Manajemen Sertifikat</h1>
                <button onClick={handleOpenModal} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                    <PlusCircle size={18} />
                    Buat Sertifikat Baru
                </button>
            </div>
            
            {loading.page ? (
                <div className="text-center"><Loader2 className="animate-spin mx-auto text-primary" size={32}/></div>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <table className="min-w-full leading-normal">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold">ID Sertifikat</th>
                                <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold">Nama Siswa</th>
                                <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold">Periode</th>
                                <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold">Tanggal Terbit</th>
                                <th className="px-5 py-3 border-b-2 text-center text-xs font-semibold uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {certificates.map(cert => (
                                <tr key={cert.id} className="hover:bg-gray-50">
                                    <td className="px-5 py-4 border-b text-sm font-mono text-accent">{cert.id}</td>
                                    <td className="px-5 py-4 border-b text-sm">{cert.studentName}</td>
                                    <td className="px-5 py-4 border-b text-sm">{cert.period}</td>
                                    <td className="px-5 py-4 border-b text-sm">{format(new Date(cert.issuedDate), 'd MMMM yyyy', { locale: id })}</td>
                                    <td className="px-5 py-4 border-b text-sm text-center">
                                        <a href={cert.certificateUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-muted hover:text-success" title="Download PDF"><Download size={16}/></a>
                                        <a href={cert.qrValidationUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-muted hover:text-accent" title="Test Link Validasi"><QrCode size={16}/></a>
                                        <button onClick={() => setCertToDelete(cert)} className="p-2 text-muted hover:text-error" title="Hapus"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Buat Sertifikat Baru">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-md">{error}</p>}
                    <div>
                        <label className="block text-sm font-medium">Pilih Intern</label>
                        <select value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})} required className="mt-1 w-full p-2 border rounded">
                            <option value="">-- Pilih Nama Siswa --</option>
                            {interns.map(i => <option key={i.id} value={i.id}>{i.name} ({i.jurusan})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Periode</label>
                        <input type="text" value={formData.period} onChange={e => setFormData({...formData, period: e.target.value})} required className="mt-1 w-full p-2 border rounded" placeholder="Contoh: 2 Feb 2026 - 30 Mei 2026"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium">Nama Mentor</label>
                        <input type="text" value={formData.mentor} onChange={e => setFormData({...formData, mentor: e.target.value})} required className="mt-1 w-full p-2 border rounded"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium">Upload PDF Sertifikat</label>
                        <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files ? e.target.files[0] : null)} required className="mt-1 w-full text-sm"/>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="submit" disabled={loading.modal} className="flex items-center justify-center w-32 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
                            {loading.modal ? <Loader2 className="animate-spin" /> : 'Generate & Simpan'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal 
                isOpen={!!certToDelete}
                onClose={() => setCertToDelete(null)}
                onConfirm={handleDeleteConfirm}
                title="Hapus Sertifikat"
                message={`Anda yakin ingin menghapus sertifikat untuk ${certToDelete?.studentName}? File PDF juga akan dihapus permanen.`}
            />
        </div>
    );
};

export default AdminCertificatesPage;

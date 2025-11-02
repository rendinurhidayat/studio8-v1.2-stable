


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
                                <th className="px-5 py-3 border-b
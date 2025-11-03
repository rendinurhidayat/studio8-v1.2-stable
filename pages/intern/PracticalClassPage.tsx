import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getPracticalClasses, registerForClass, unregisterFromClass } from '../../services/api';
import { PracticalClass } from '../../types';
import { Loader2, BookOpen, Clock, User, Users, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import id from 'date-fns/locale/id';
import ConfirmationModal from '../../components/common/ConfirmationModal';

const PracticalClassPage = () => {
    const { user } = useAuth();
    const [classes, setClasses] = useState<PracticalClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [modal, setModal] = useState<{ isOpen: boolean, action: 'register' | 'unregister', class: PracticalClass | null }>({ isOpen: false, action: 'register', class: null });

    const fetchData = async () => {
        setLoading(true);
        const data = await getPracticalClasses();
        setClasses(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAction = async () => {
        if (!user || !modal.class) return;
        
        setActionLoading(modal.class.id);
        
        if (modal.action === 'register') {
            await registerForClass(modal.class.id, user.id);
        } else {
            await unregisterFromClass(modal.class.id, user.id);
        }
        
        await fetchData();
        setActionLoading(null);
        setModal({ isOpen: false, action: 'register', class: null });
    };

    const { upcomingClasses, pastClasses } = useMemo(() => {
        const now = new Date();
        return {
            upcomingClasses: classes.filter(c => new Date(c.classDate) >= now),
            pastClasses: classes.filter(c => new Date(c.classDate) < now),
        };
    }, [classes]);

    if (loading) {
        return <div className="text-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
    }

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-primary/10 rounded-lg text-primary"><BookOpen size={28} /></div>
                <div>
                    <h1 className="text-3xl font-bold text-primary">Kelas Praktek</h1>
                    <p className="text-muted mt-1">Daftar untuk sesi praktek langsung di studio untuk mengasah skill-mu.</p>
                </div>
            </div>

            <h2 className="text-xl font-bold text-primary mb-4">Kelas yang Akan Datang</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {upcomingClasses.map(cls => {
                    const isRegistered = cls.registeredInternIds.includes(user?.id || '');
                    const isFull = cls.registeredInternIds.length >= cls.maxParticipants;
                    return (
                        <div key={cls.id} className="bg-white rounded-lg shadow-md border p-5 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-lg text-primary">{cls.topic}</h3>
                                <p className="text-sm text-muted mt-2 flex-grow">{cls.description}</p>
                                <div className="text-xs text-muted mt-4 pt-4 border-t space-y-2">
                                    <div className="flex items-center gap-2"><Clock size={14}/> {format(new Date(cls.classDate), 'eeee, d MMM yyyy, HH:mm', { locale: id })}</div>
                                    <div className="flex items-center gap-2"><User size={14}/> Mentor: {cls.mentorName}</div>
                                    <div className="flex items-center gap-2"><Users size={14}/> Kuota: {cls.registeredInternIds.length} / {cls.maxParticipants}</div>
                                </div>
                            </div>
                            <div className="mt-4">
                                {isRegistered ? (
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 text-sm font-semibold text-success"><CheckCircle size={16}/> Terdaftar</span>
                                        <button onClick={() => setModal({ isOpen: true, action: 'unregister', class: cls })} className="text-xs text-error hover:underline">Batalkan</button>
                                    </div>
                                ) : isFull ? (
                                    <span className="w-full block text-center py-2 text-sm font-semibold text-muted bg-base-200 rounded-lg">Penuh</span>
                                ) : (
                                    <button onClick={() => setModal({ isOpen: true, action: 'register', class: cls })} disabled={actionLoading === cls.id} className="w-full py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50">
                                        {actionLoading === cls.id ? <Loader2 className="animate-spin mx-auto"/> : 'Daftar Kelas'}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {upcomingClasses.length === 0 && <p className="text-muted text-center py-8 bg-base-100 rounded-lg">Belum ada kelas yang dijadwalkan.</p>}

            <ConfirmationModal 
                isOpen={modal.isOpen}
                onClose={() => setModal({ isOpen: false, action: 'register', class: null })}
                onConfirm={handleAction}
                title={`${modal.action === 'register' ? 'Konfirmasi Pendaftaran' : 'Batalkan Pendaftaran'}`}
                message={`Anda yakin ingin ${modal.action === 'register' ? 'mendaftar untuk' : 'membatalkan pendaftaran dari'} kelas "${modal.class?.topic}"?`}
            />
        </div>
    );
};

export default PracticalClassPage;

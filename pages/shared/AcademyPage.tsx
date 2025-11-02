

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getQuizzes, getQuizResultsForStudent, getPracticalClasses, createPracticalClass, deletePracticalClass, getUsers, registerForClass, unregisterFromClass } from '../../services/api';
import { Quiz, QuizCategory, QuizResult, PracticalClass, UserRole } from '../../types';
import { Loader2, Camera, Video, TrendingUp, Library, CheckCircle, ArrowRight, PlusCircle, Trash2, BookOpen, Clock, User as UserIcon, Sparkles, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import Modal from '../../components/common/Modal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import format from 'date-fns/format';
import id from 'date-fns/locale/id';

// Manager View for Admin/Staff
const PracticalClassManager: React.FC<{
    classes: PracticalClass[];
    onUpdate: () => void;
}> = ({ classes, onUpdate }) => {
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState({ modal: false });
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
            onUpdate();
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
        onUpdate();
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-base-200">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-primary flex items-center gap-3"><BookOpen /> Kelas Praktek Wajib</h2>
                <button onClick={() => { setFormData({ topic: '', description: '', classDate: '', mentorName: currentUser?.name || '', maxParticipants: 10 }); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                    <PlusCircle size={18} /> Buat Kelas Baru
                </button>
            </div>
            {classes.length === 0 ? <p className="text-center text-muted py-4">Belum ada kelas yang dibuat.</p> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2">
                    {classes.map(cls => (
                        <div key={cls.id} className="bg-base-100 p-4 rounded-lg flex flex-col">
                             <div className="flex justify-between items-start">
                                 <h3 className="font-bold text-primary">{cls.topic}</h3>
                                 <button onClick={() => { setSelectedClass(cls); setIsConfirmOpen(true); }} className="p-1 text-muted hover:text-error"><Trash2 size={16}/></button>
                            </div>
                            <p className="text-sm text-muted mt-1 flex-grow">{cls.description}</p>
                            <div className="text-xs text-muted mt-3 pt-3 border-t space-y-1">
                                <div className="flex items-center gap-2"><Clock size={14}/> {format(new Date(cls.classDate), 'd MMM yyyy, HH:mm', { locale: id })}</div>
                                <div className="flex items-center gap-2"><UserIcon size={14}/> Mentor: {cls.mentorName}</div>
                                <div className="flex items-center gap-2"><Users size={14}/> {cls.registeredInternIds.length} / {cls.maxParticipants} Peserta</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
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

// Viewer for Interns
const PracticalClassViewer: React.FC<{ classes: PracticalClass[]; onUpdate: () => void; }> = ({ classes, onUpdate }) => {
    const { user } = useAuth();
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [modal, setModal] = useState<{ isOpen: boolean, action: 'register' | 'unregister', class: PracticalClass | null }>({ isOpen: false, action: 'register', class: null });

    const handleAction = async () => {
        if (!user || !modal.class) return;
        
        setActionLoading(modal.class.id);
        
        if (modal.action === 'register') {
            await registerForClass(modal.class.id, user.id);
        } else {
            await unregisterFromClass(modal.class.id, user.id);
        }
        
        onUpdate();
        setActionLoading(null);
        setModal({ isOpen: false, action: 'register', class: null });
    };

    const { upcomingClasses, pastClasses } = useMemo(() => {
        const now = new Date();
        const sortedClasses = [...classes].sort((a, b) => new Date(a.classDate).getTime() - new Date(b.classDate).getTime());
        return {
            upcomingClasses: sortedClasses.filter(c => new Date(c.classDate) >= now),
            pastClasses: sortedClasses.filter(c => new Date(c.classDate) < now).reverse(),
        };
    }, [classes]);

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-primary/20">
                <h2 className="text-2xl font-bold text-primary flex items-center gap-3"><BookOpen /> Kelas Wajib Akan Datang</h2>
                {upcomingClasses.length > 0 ? (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {upcomingClasses.map(cls => {
                            const isRegistered = cls.registeredInternIds.includes(user?.id || '');
                            const isFull = cls.registeredInternIds.length >= cls.maxParticipants;
                            return (
                                <div key={cls.id} className="bg-base-100 p-4 rounded-lg flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold text-accent">{cls.topic}</h3>
                                        <p className="text-sm text-muted mt-1">{cls.description}</p>
                                        <div className="text-xs text-base-content pt-3 mt-3 border-t space-y-2">
                                            <div className="flex items-center gap-2"><Clock size={16}/> {format(new Date(cls.classDate), 'eeee, d MMMM yyyy, HH:mm', { locale: id })}</div>
                                            <div className="flex items-center gap-2"><UserIcon size={16}/> Mentor: {cls.mentorName}</div>
                                            <div className="flex items-center gap-2"><Users size={16}/> Kuota: {cls.registeredInternIds.length} / {cls.maxParticipants}</div>
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
                            )
                        })}
                    </div>
                ) : (
                    <p className="mt-4 text-center text-muted py-4">Jadwal kelas wajib akan segera diumumkan.</p>
                )}
            </div>

            <div>
                <h3 className="text-xl font-semibold text-primary mb-3">Riwayat Kelas</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {pastClasses.map(cls => (
                        <div key={cls.id} className="bg-white p-4 rounded-lg border">
                             <p className="font-semibold text-primary">{cls.topic}</p>
                             <p className="text-xs text-muted mt-1">{format(new Date(cls.classDate), 'd MMM yyyy', { locale: id })} - oleh {cls.mentorName}</p>
                        </div>
                    ))}
                </div>
            </div>
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

interface LearningModule {
    title: string;
    description: string;
    category: QuizCategory;
    icon: React.ReactNode;
}

const modules: LearningModule[] = [
    { title: "Kuis Fotografi", description: "Asah kemampuan fotografimu, mulai dari dasar hingga teknik profesional.", category: QuizCategory.Fotografi, icon: <Camera size={24} /> },
    { title: "Kuis Videografi", description: "Pelajari seluk beluk videografi, dari pengambilan gambar hingga proses editing.", category: QuizCategory.Videografi, icon: <Video size={24} /> },
    { title: "Kuis Marketing", description: "Tingkatkan pemahamanmu tentang strategi marketing di industri kreatif.", category: QuizCategory.Marketing, icon: <TrendingUp size={24} /> },
];

const AcademyPage = () => {
    const { user } = useAuth();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [myResults, setMyResults] = useState<QuizResult[]>([]);
    const [practicalClasses, setPracticalClasses] = useState<PracticalClass[]>([]);
    const [loading, setLoading] = useState(true);

    const isIntern = user?.role === UserRole.AnakMagang || user?.role === UserRole.AnakPKL;

    const fetchData = async () => {
        setLoading(true);
        const [quizzesData, classesData] = await Promise.all([
            getQuizzes(),
            getPracticalClasses(),
        ]);
        setQuizzes(quizzesData);
        setPracticalClasses(classesData);

        if (user) {
            const myResultsData = await getQuizResultsForStudent(user.id);
            setMyResults(myResultsData);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const moduleData = useMemo(() => {
        return modules.map(module => {
            const moduleQuizzes = quizzes.filter(q => q.category === module.category);
            const completedCount = moduleQuizzes.filter(q => myResults.some(r => r.quizId === q.id)).length;
            return {
                ...module,
                quizzes: moduleQuizzes,
                progress: moduleQuizzes.length > 0 ? (completedCount / moduleQuizzes.length) * 100 : 0,
            };
        });
    }, [quizzes, myResults]);

    if (loading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin text-primary" size={48} /></div>;
    }

    return (
        <div>
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-primary/10 rounded-lg text-primary"><Library size={28} /></div>
                <div>
                    <h1 className="text-3xl font-bold text-primary">Akademi Studio 8</h1>
                    <p className="text-muted mt-1">Pusat pembelajaran untuk meningkatkan skill dan pengetahuanmu.</p>
                </div>
            </div>

            <div className="my-8">
                {isIntern ? <PracticalClassViewer classes={practicalClasses} onUpdate={fetchData} /> : <PracticalClassManager classes={practicalClasses} onUpdate={fetchData} />}
            </div>

            <div className="space-y-8 mt-12">
                {moduleData.map(module => (
                    <motion.div 
                        key={module.category}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white p-6 rounded-2xl shadow-lg border border-base-200"
                    >
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="p-3 bg-accent/10 rounded-lg text-accent self-start">{module.icon}</div>
                            <div className="flex-grow">
                                <h2 className="text-2xl font-bold text-primary">{module.title}</h2>
                                <p className="text-muted text-sm mt-1">{module.description}</p>
                            </div>
                            {isIntern && (
                                <div className="w-full md:w-48 flex-shrink-0">
                                    <div className="flex justify-between text-xs text-muted mb-1">
                                        <span>Progres</span>
                                        <span>{Math.round(module.progress)}%</span>
                                    </div>
                                    <div className="w-full bg-base-200 rounded-full h-2.5">
                                        <div className="bg-accent h-2.5 rounded-full" style={{ width: `${module.progress}%` }}></div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-6 pt-4 border-t border-base-200 space-y-3">
                            {module.quizzes.length > 0 ? module.quizzes.map(quiz => {
                                const result = myResults.find(r => r.quizId === quiz.id);
                                return (
                                    <div key={quiz.id} className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            {result ? <CheckCircle className="text-success" size={20} /> : <div className="w-5 h-5 border-2 border-base-300 rounded-full" />}
                                            <div>
                                                <p className="font-semibold text-primary">{quiz.title}</p>
                                                <p className="text-xs text-muted">{quiz.questions.length} Soal</p>
                                            </div>
                                        </div>
                                        {isIntern && (
                                            result ? (
                                                <div className="flex items-center gap-4">
                                                    <span className={`font-bold text-sm ${result.score > 70 ? 'text-success' : 'text-warning'}`}>{result.score}%</span>
                                                    <Link to={`/intern/quiz/result/${result.id}`} className="px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary rounded-md hover:bg-primary/20">
                                                        Lihat Hasil
                                                    </Link>
                                                </div>
                                            ) : (
                                                <Link to={`/intern/quiz/take/${quiz.id}`} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-accent text-accent-content rounded-md hover:bg-accent/90">
                                                    Mulai Kuis <ArrowRight size={14} />
                                                </Link>
                                            )
                                        )}
                                    </div>
                                )
                            }) : (
                                <p className="text-center text-sm text-muted py-4">Belum ada kuis untuk modul ini.</p>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default AcademyPage;
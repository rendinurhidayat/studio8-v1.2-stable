

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { addDailyProgress, getDailyProgressForUser, getTodaysAttendance, getWeeklyEvaluationsForStudent } from '../../services/api';
import { DailyProgress, DailyProgressTask, Attendance, WeeklyEvaluation, Badge, BadgeIconName } from '../../types';
import format from 'date-fns/format';
import getWeek from 'date-fns/getWeek';
import id from 'date-fns/locale/id';
import { Loader2, Plus, Trash2, Upload, Send, ClipboardList, CheckCircle, BarChart, TrendingUp, Award, ShieldCheck, Zap } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, Bar, Cell } from 'recharts';
import { fileToBase64 } from '../../utils/fileUtils';
import { AnimatePresence, motion } from 'framer-motion';


// --- Helper Functions & Components ---
const ProgressCard: React.FC<{ title: string, children: React.ReactNode, icon: React.ReactNode }> = ({ title, children, icon }) => (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-base-200">
        <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">{icon}</div>
            <h3 className="font-bold text-lg text-primary">{title}</h3>
        </div>
        {children}
    </div>
);

const TabButton: React.FC<{
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-colors relative ${isActive ? 'text-primary' : 'text-muted hover:text-primary'}`}
    >
        {icon}
        {label}
        {isActive && (
            <motion.div
                layoutId="active-progress-tab"
                className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary"
            />
        )}
    </button>
);


const icons: Record<BadgeIconName, React.FC<any>> = {
    CheckCircle,
    TrendingUp,
    Zap,
    ShieldCheck
};

const BadgeIcon: React.FC<{ name: BadgeIconName; className?: string }> = ({ name, className }) => {
    const Icon = icons[name];
    return Icon ? <Icon className={className} /> : null;
};

const availableBadges: (Badge & { points: number })[] = [
    { id: 'b1', name: 'Inisiator', description: 'Kirim progres pertamamu.', icon: 'CheckCircle', points: 1 },
    { id: 'b2', name: 'Rajin Lapor', description: 'Kirim 5 laporan progres.', icon: 'TrendingUp', points: 50 },
    { id: 'b3', name: 'Pekerja Keras', description: 'Capai 100 poin.', icon: 'Zap', points: 100 },
    { id: 'b4', name: 'Siap Jadi Mentor', description: 'Capai 200 poin.', icon: 'ShieldCheck', points: 200 },
];


// --- Main Page Component ---
const InternProgressPage = () => {
    const { user } = useAuth();
    const [history, setHistory] = useState<DailyProgress[]>([]);
    const [attendance, setAttendance] = useState<Attendance | null>(null);
    const [evaluations, setEvaluations] = useState<WeeklyEvaluation[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');

    // Form state
    const [tasks, setTasks] = useState<DailyProgressTask[]>([{ title: '', status: 'pending' }]);
    const [note, setNote] = useState('');
    const [documentationFile, setDocumentationFile] = useState<File | null>(null);
    const [error, setError] = useState('');

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const hasSubmittedToday = useMemo(() => history.some(item => item.date === todayStr), [history, todayStr]);

    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            setLoading(true);
            const [progressHistory, todayAttendance, evals] = await Promise.all([
                getDailyProgressForUser(user.id),
                getTodaysAttendance(user.id),
                getWeeklyEvaluationsForStudent(user.id)
            ]);
            setHistory(progressHistory);
            setAttendance(todayAttendance);
            setEvaluations(evals);
            setLoading(false);
        };
        fetchData();
    }, [user]);

    const handleTaskChange = (index: number, value: string) => {
        const newTasks = [...tasks];
        newTasks[index].title = value;
        setTasks(newTasks);
    };

    const handleAddTask = () => {
        if (tasks.length < 5) {
            setTasks([...tasks, { title: '', status: 'pending' }]);
        }
    };

    const handleRemoveTask = (index: number) => {
        if (tasks.length > 1) {
            setTasks(tasks.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!user || tasks.every(t => !t.title.trim()) || !note.trim()) {
            setError('Minimal isi satu tugas dan catatan harian.');
            return;
        }

        setIsSubmitting(true);
        let documentationUrl = '';
        if (documentationFile) {
            try {
                const dataUrl = await fileToBase64(documentationFile);
                const uploadResponse = await fetch('/api/assets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'upload', imageBase64: dataUrl, folder: 'intern_progress' })
                });
                if (!uploadResponse.ok) throw new Error('Gagal mengunggah dokumentasi.');
                const result = await uploadResponse.json();
                documentationUrl = result.secure_url;
            } catch (err) {
                setError((err as Error).message);
                setIsSubmitting(false);
                return;
            }
        }
        
        const filledTasks = tasks.filter(t => t.title.trim()).map(t => ({...t, status: 'done' as const}));

        const progressData: Omit<DailyProgress, 'id' | 'submittedAt'> = {
            studentId: user.id,
            date: todayStr,
            tasks: filledTasks,
            note,
            documentationUrl: documentationUrl || undefined,
            weekNumber: getWeek(new Date()),
        };

        try {
            const newProgress = await addDailyProgress(progressData);
            setHistory([newProgress, ...history]);
            // Reset form
            setTasks([{ title: '', status: 'pending' }]);
            setNote('');
            setDocumentationFile(null);
        } catch (err) {
            setError('Gagal menyimpan progres. Coba lagi.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const skillData = useMemo(() => {
        if (evaluations.length === 0) return [];
        const latestEval = evaluations[0];
        return Object.entries(latestEval.criteria).map(([subject, value]) => ({
            subject: subject.charAt(0).toUpperCase() + subject.slice(1),
            value,
            fullMark: 10,
        }));
    }, [evaluations]);
    
    if (loading) return <div className="text-center p-8"><Loader2 className="animate-spin text-primary" size={32} /></div>;

    const userPoints = user?.totalPoints || 0;

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-primary/10 rounded-lg text-primary"><TrendingUp size={28} /></div>
                <div>
                    <h1 className="text-3xl font-bold text-primary">Progres Harian</h1>
                    <p className="text-muted mt-1">Catat aktivitas dan lihat perkembanganmu di sini.</p>
                </div>
            </div>

             <div className="flex border-b mb-6">
                <TabButton label="Input Progres Hari Ini" icon={<ClipboardList size={16}/>} isActive={activeTab === 'submit'} onClick={() => setActiveTab('submit')} />
                <TabButton label="Riwayat & Analitik" icon={<BarChart size={16}/>} isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
            </div>

             <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3 }}
                >
                    {activeTab === 'submit' && (
                        <div className="max-w-3xl mx-auto">
                            {hasSubmittedToday ? (
                                <div className="bg-white p-8 rounded-2xl shadow-lg border text-center">
                                    <CheckCircle className="mx-auto text-success" size={48} />
                                    <h3 className="mt-4 text-xl font-bold text-primary">Laporan progres hari ini sudah dikirim!</h3>
                                    <p className="text-muted mt-1">Kerja bagus! Sampai jumpa besok.</p>
                                </div>
                            ) : (
                                <ProgressCard title="Input Progres Hari Ini" icon={<ClipboardList size={20}/>}>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <label className="text-sm font-semibold block mb-2">Tugas yang Dikerjakan (max 5)</label>
                                            {tasks.map((task, index) => (
                                                <div key={index} className="flex items-center gap-2 mb-2">
                                                    <input type="text" value={task.title} onChange={e => handleTaskChange(index, e.target.value)} placeholder={`Tugas #${index + 1}`} className="flex-grow p-2 border rounded-md text-sm" />
                                                    {index > 0 && <button type="button" onClick={() => handleRemoveTask(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={16}/></button>}
                                                </div>
                                            ))}
                                            {tasks.length < 5 && <button type="button" onClick={handleAddTask} className="text-sm text-primary font-semibold flex items-center gap-1"><Plus size={16}/> Tambah Tugas</button>}
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold block mb-2">Catatan Harian</label>
                                            <textarea value={note} onChange={e => setNote(e.target.value)} rows={4} placeholder="Ceritakan apa yang kamu pelajari atau kerjakan hari ini..." className="w-full p-2 border rounded-md text-sm"></textarea>
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold block mb-2">Dokumentasi (Opsional)</label>
                                            <label htmlFor="doc-upload" className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-base-200 transition-colors">
                                                <Upload size={20} className="text-muted" />
                                                <span className="text-sm text-muted flex-grow truncate">{documentationFile ? documentationFile.name : 'Pilih file (gambar, pdf, doc)...'}</span>
                                                <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-md">Browse</span>
                                                <input id="doc-upload" type="file" className="hidden" onChange={e => setDocumentationFile(e.target.files ? e.target.files[0] : null)} accept="image/*,.pdf,.doc,.docx" />
                                            </label>
                                        </div>
                                        {error && <p className="text-xs text-red-500">{error}</p>}
                                        <button type="submit" disabled={isSubmitting} className="w-full flex justify-center items-center gap-2 p-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50">
                                            {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send size={16}/> Kirim Progres</>}
                                        </button>
                                    </form>
                                </ProgressCard>
                            )}
                        </div>
                    )}
                     {activeTab === 'history' && (
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                             <div className="lg:col-span-3">
                                <ProgressCard title="Riwayat Progres" icon={<ClipboardList size={20}/>}>
                                    {history.length > 0 ? (
                                        <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                                            {history.map(item => (
                                                <div key={item.id} className="p-4 bg-base-100 rounded-lg">
                                                    <p className="font-semibold text-sm">{format(new Date(item.submittedAt), 'eeee, d MMMM yyyy', { locale: id })}</p>
                                                    <p className="text-sm text-muted mt-1">{item.note}</p>
                                                    <ul className="list-disc list-inside text-sm mt-2">
                                                        {item.tasks.map((t, i) => <li key={i}>{t.title}</li>)}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                     ) : (
                                        <p className="text-center text-muted py-8">Belum ada riwayat progres.</p>
                                    )}
                                </ProgressCard>
                            </div>
                            <div className="lg:col-span-2 space-y-6">
                                <ProgressCard title="Analitik Kinerja Mingguan" icon={<BarChart size={20}/>}>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillData}>
                                                <PolarGrid />
                                                <PolarAngleAxis dataKey="subject" />
                                                <Radar name="Skor" dataKey="value" stroke="#0a1a2f" fill="#3b82f6" fillOpacity={0.6} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <p className="text-xs text-center text-muted">Berdasarkan evaluasi mingguan dari mentor.</p>
                                </ProgressCard>
                                 <ProgressCard title="Lencana & Pencapaian" icon={<Award size={20}/>}>
                                    <p className="text-sm text-muted mb-4">Terus kumpulkan poin untuk membuka semua lencana!</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        {availableBadges.map(badge => {
                                            const isUnlocked = userPoints >= badge.points;
                                            return (
                                                <div key={badge.id} className={`p-3 text-center rounded-lg border-2 transition-all ${isUnlocked ? 'border-amber-400 bg-amber-50' : 'bg-base-100 border-transparent opacity-50'}`} title={badge.description}>
                                                    <BadgeIcon name={badge.icon} className={`w-8 h-8 mx-auto mb-2 ${isUnlocked ? 'text-amber-500' : 'text-muted'}`} />
                                                    <p className={`font-bold text-sm ${isUnlocked ? 'text-amber-600' : 'text-base-content'}`}>{badge.name}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ProgressCard>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default InternProgressPage;

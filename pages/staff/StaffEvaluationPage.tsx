import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getUsers, getWeeklyEvaluationsForStudent, addWeeklyEvaluation } from '../../services/api';
import { User, UserRole, WeeklyEvaluation } from '../../types';
import { Loader2, Star, User as UserIcon, Send, X } from 'lucide-react';
import Modal from '../../components/common/Modal';
import getWeek from 'date-fns/getWeek';
import format from 'date-fns/format';
import id from 'date-fns/locale/id';

const EvaluationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    intern: User | null;
    onEvaluationSubmit: () => void;
}> = ({ isOpen, onClose, intern, onEvaluationSubmit }) => {
    const { user: currentUser } = useAuth();
    const [evaluations, setEvaluations] = useState<WeeklyEvaluation[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [criteria, setCriteria] = useState({ discipline: 5, creativity: 5, teamwork: 5, initiative: 5 });
    const [mentorNote, setMentorNote] = useState('');

    const currentWeek = getWeek(new Date(), { weekStartsOn: 1 });
    const hasEvaluatedThisWeek = evaluations.some(e => e.week === currentWeek);

    useEffect(() => {
        if (isOpen && intern) {
            const fetchHistory = async () => {
                setLoadingHistory(true);
                const data = await getWeeklyEvaluationsForStudent(intern.id);
                setEvaluations(data);
                setLoadingHistory(false);
            };
            fetchHistory();
            // Reset form
            setCriteria({ discipline: 5, creativity: 5, teamwork: 5, initiative: 5 });
            setMentorNote('');
        }
    }, [isOpen, intern]);

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCriteria(prev => ({ ...prev, [name]: parseInt(value) }));
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!intern || !currentUser || !mentorNote.trim()) return;

        setIsSubmitting(true);
        const averageScore = (criteria.discipline + criteria.creativity + criteria.teamwork + criteria.initiative) / 4;
        const evalData: Omit<WeeklyEvaluation, 'id' | 'date'> = {
            studentId: intern.id,
            week: currentWeek,
            criteria,
            mentorNote,
            averageScore,
            mentorId: currentUser.id,
            mentorName: currentUser.name,
        };
        await addWeeklyEvaluation(evalData);
        setIsSubmitting(false);
        onEvaluationSubmit(); // To refetch data on the main page
        onClose();
    };

    if (!intern) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Evaluasi: ${intern.name}`}>
            <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-6">
                {/* --- Evaluation Form --- */}
                {hasEvaluatedThisWeek ? (
                    <div className="p-4 bg-green-50 text-green-800 rounded-lg text-center">Evaluasi untuk minggu ini sudah diisi.</div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-base-100">
                        <h3 className="font-bold">Evaluasi Minggu Ini (Minggu ke-{currentWeek})</h3>
                        {Object.keys(criteria).map(key => (
                            <div key={key}>
                                <label className="block text-sm font-medium capitalize flex justify-between">
                                    <span>{key}</span>
                                    <span className="font-bold text-primary">{criteria[key as keyof typeof criteria]}</span>
                                </label>
                                <input type="range" name={key} min="1" max="10" value={criteria[key as keyof typeof criteria]} onChange={handleSliderChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary" />
                            </div>
                        ))}
                        <div>
                             <label className="block text-sm font-medium">Catatan Mentor</label>
                             <textarea value={mentorNote} onChange={e => setMentorNote(e.target.value)} rows={3} required className="mt-1 w-full p-2 border rounded-md"></textarea>
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
                                {isSubmitting ? <Loader2 className="animate-spin"/> : <><Send size={16}/> Kirim Evaluasi</>}
                            </button>
                        </div>
                    </form>
                )}
                
                {/* --- History --- */}
                <div>
                    <h3 className="font-bold mt-6 border-t pt-4">Riwayat Evaluasi</h3>
                    {loadingHistory ? <Loader2 className="animate-spin" /> : evaluations.length === 0 ? (
                        <p className="text-sm text-muted text-center py-4">Belum ada riwayat evaluasi.</p>
                    ) : (
                        <div className="space-y-3 mt-2">
                            {evaluations.map(ev => (
                                <div key={ev.id} className="p-3 bg-base-100 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold text-sm">Minggu ke-{ev.week}</p>
                                        <p className="text-sm font-bold text-[#D9A441]">Skor: {ev.averageScore.toFixed(2)}</p>
                                    </div>
                                    <p className="text-sm text-muted italic mt-1">"{ev.mentorNote}"</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}

const StaffEvaluationPage = () => {
    const [interns, setInterns] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIntern, setSelectedIntern] = useState<User | null>(null);

    const fetchData = async () => {
        setLoading(true);
        const allUsers = await getUsers();
        setInterns(allUsers.filter(u => u.role === UserRole.AnakMagang || u.role === UserRole.AnakPKL));
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) return <div className="text-center p-8"><Loader2 className="animate-spin mx-auto text-primary" size={32} /></div>;

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-primary/10 rounded-lg text-primary"><Star size={28} /></div>
                <div>
                    <h1 className="text-3xl font-bold text-primary">Evaluasi Magang</h1>
                    <p className="text-muted mt-1">Berikan evaluasi mingguan untuk para intern.</p>
                </div>
            </div>
            
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full leading-normal">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold">Nama Intern</th>
                            <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold">Jurusan</th>
                            <th className="px-5 py-3 border-b-2 text-center text-xs font-semibold">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {interns.map(intern => (
                            <tr key={intern.id}>
                                <td className="px-5 py-4 border-b text-sm font-medium">{intern.name}</td>
                                <td className="px-5 py-4 border-b text-sm text-muted">{intern.jurusan}</td>
                                <td className="px-5 py-4 border-b text-sm text-center">
                                    <button onClick={() => setSelectedIntern(intern)} className="px-3 py-1.5 text-sm font-semibold bg-primary/10 text-primary rounded-md hover:bg-primary/20">
                                        Beri / Lihat Evaluasi
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <EvaluationModal 
                isOpen={!!selectedIntern}
                onClose={() => setSelectedIntern(null)}
                intern={selectedIntern}
                onEvaluationSubmit={fetchData} // A simple way to refresh any potential aggregate data
            />
        </div>
    );
};

export default StaffEvaluationPage;
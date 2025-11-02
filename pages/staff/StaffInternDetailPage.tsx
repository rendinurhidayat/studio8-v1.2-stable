

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getUsers, getAttendanceForUser, getDailyReportsForUser, getTasksForUser, getMentorFeedbackForIntern, addMentorFeedback, generateAiFeedbackForReport } from '../../services/api';
import { User, Attendance, DailyReport, Task, MentorFeedback, UserRole, AttendanceStatus } from '../../types';
import { format } from 'date-fns';
import id from 'date-fns/locale/id';
import { Loader2, Calendar, ClipboardList, CheckSquare, MessageSquare, ArrowLeft, Star, Send, Sparkles } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Card from '../../components/common/Card';
import StarRating from '../../components/feedback/StarRating';

const TabButton: React.FC<{ label: string; icon: React.ReactNode; isActive: boolean; onClick: () => void }> = ({ label, icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-colors rounded-t-lg ${isActive ? 'bg-white border-b-2 border-primary text-primary' : 'text-muted bg-base-100 hover:bg-base-200'}`}
    >
        {icon}{label}
    </button>
);

const FeedbackForm: React.FC<{ intern: User, tasks: Task[], onFeedbackSent: () => void }> = ({ intern, tasks, onFeedbackSent }) => {
    const { user: currentUser } = useAuth();
    const [selectedTaskId, setSelectedTaskId] = useState('');
    const [rating, setRating] = useState(0);
    const [feedbackText, setFeedbackText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const completableTasks = tasks.filter(t => t.completed);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !selectedTaskId || rating === 0 || !feedbackText.trim()) {
            alert("Tugas, rating, dan teks feedback harus diisi.");
            return;
        }
        setIsSubmitting(true);
        const selectedTask = tasks.find(t => t.id === selectedTaskId);
        if (selectedTask) {
            await addMentorFeedback(intern.id, {
                taskId: selectedTask.id,
                taskTitle: selectedTask.text,
                feedback: feedbackText,
                rating,
                mentorId: currentUser.id,
                mentorName: currentUser.name,
            });
            setSelectedTaskId('');
            setRating(0);
            setFeedbackText('');
            onFeedbackSent();
        }
        setIsSubmitting(false);
    };

    return (
        <Card>
            <h3 className="font-bold text-lg mb-4">Tambah Feedback Baru</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Tugas Terkait</label>
                    <select value={selectedTaskId} onChange={e => setSelectedTaskId(e.target.value)} required className="mt-1 w-full p-2 border rounded">
                        <option value="" disabled>Pilih tugas yang selesai</option>
                        {completableTasks.map(task => <option key={task.id} value={task.id}>{task.text}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium">Rating</label>
                    <StarRating value={rating} onChange={setRating} isEditable={true} size={28}/>
                </div>
                <div>
                     <label className="block text-sm font-medium">Komentar</label>
                     <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} rows={4} required className="mt-1 w-full p-2 border rounded" />
                </div>
                <div className="flex justify-end">
                    <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send size={16}/> Kirim Feedback</>}
                    </button>
                </div>
            </form>
        </Card>
    );
};


const StaffInternDetailPage = () => {
    const { id: internId } = useParams<{ id: string }>();
    const [intern, setIntern] = useState<User | null>(null);
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [reports, setReports] = useState<DailyReport[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [feedback, setFeedback] = useState<MentorFeedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('attendance');
    const [generatingFeedbackId, setGeneratingFeedbackId] = useState<string | null>(null);

    const fetchData = async () => {
        if (!internId) return;
        setLoading(true);
        const allUsers = await getUsers();
        const currentIntern = allUsers.find(u => u.id === internId);
        setIntern(currentIntern || null);

        if (currentIntern) {
            const [attData, repData, taskData, feedbackData] = await Promise.all([
                getAttendanceForUser(internId),
                getDailyReportsForUser(internId),
                getTasksForUser(internId),
                getMentorFeedbackForIntern(internId),
            ]);
            setAttendance(attData);
            setReports(repData);
            setTasks(taskData);
            setFeedback(feedbackData);
        }
        setLoading(false);
    };
    
    useEffect(() => {
        fetchData();
    }, [internId]);

    const handleGenerateFeedback = async (report: DailyReport) => {
        if (!report.content) return;
        setGeneratingFeedbackId(report.id);
        try {
            const updatedReport = await generateAiFeedbackForReport(report.id, report.content);
            setReports(prevReports => 
                prevReports.map(r => r.id === updatedReport.id ? updatedReport : r)
            );
        } catch (error) {
            console.error("Failed to generate AI feedback:", error);
            alert("Gagal membuat feedback AI. Coba lagi nanti.");
        } finally {
            setGeneratingFeedbackId(null);
        }
    };

    if (loading) {
        return <div className="text-center p-8"><Loader2 className="animate-spin mx-auto" size={48} /></div>;
    }
    if (!intern) {
        return <p className="text-center text-red-500">Intern tidak ditemukan.</p>;
    }

    const renderTabContent = () => {
        switch(activeTab) {
            case 'attendance':
                return <ul className="space-y-2 mt-2">{attendance.map(att => <li key={att.id} className="text-sm p-3 bg-base-100 rounded-lg flex justify-between"><span>{format(new Date(att.checkInTime), 'eeee, d MMMM yyyy', {locale: id})}</span><span className="font-semibold">{format(new Date(att.checkInTime), 'HH:mm')} - {att.checkOutTime ? format(new Date(att.checkOutTime), 'HH:mm') : '...'}</span></li>)}</ul>;
            case 'reports':
                return <ul className="space-y-3 mt-2">{reports.map(rep => (
                    <li key={rep.id} className="p-4 bg-base-100 rounded-lg">
                        <div className="flex justify-between items-center">
                            <p className="font-semibold">{format(new Date(rep.submittedAt), 'd MMMM yyyy', {locale: id})}</p>
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">{rep.mood}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-2">{rep.content}</p>
                        {rep.blockers && <p className="text-sm text-red-600 mt-1">Kendala: {rep.blockers}</p>}
                        
                        <div className="mt-4 pt-3 border-t">
                            {rep.mentorFeedback ? (
                                <div>
                                    <p className="text-xs font-semibold text-primary flex items-center gap-1.5"><Sparkles size={14}/> AI Mentor Feedback:</p>
                                    <p className="text-sm text-primary/80 italic mt-1">"{rep.mentorFeedback}"</p>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => handleGenerateFeedback(rep)} 
                                    disabled={generatingFeedbackId === rep.id}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary rounded-md hover:bg-primary/20 disabled:opacity-50"
                                >
                                    {generatingFeedbackId === rep.id 
                                        ? <><Loader2 size={14} className="animate-spin"/> Menganalisis...</>
                                        : <><Sparkles size={14}/> Generate AI Feedback</>
                                    }
                                </button>
                            )}
                        </div>
                    </li>
                ))}</ul>;
            case 'tasks':
                return <ul className="space-y-3 mt-2">{tasks.map(task => <li key={task.id} className={`p-3 rounded-lg ${task.completed ? 'bg-green-50' : 'bg-yellow-50'}`}><p className={`font-semibold ${task.completed ? 'line-through' : ''}`}>{task.text}</p><p className="text-xs text-muted">Progres: {task.progress || 0}%</p></li>)}</ul>;
            case 'feedback':
                return (
                    <div className="space-y-4 mt-2">
                        <FeedbackForm intern={intern} tasks={tasks} onFeedbackSent={fetchData} />
                        <h3 className="font-bold text-lg pt-4 border-t">Riwayat Feedback</h3>
                        {feedback.map(fb => (
                            <div key={fb.id} className="p-3 bg-base-100 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <StarRating value={fb.rating} isEditable={false} size={16}/>
                                    <span className="text-xs text-muted">{format(new Date(fb.date), 'd MMM yyyy', {locale: id})}</span>
                                </div>
                                <p className="text-sm italic my-1">"{fb.feedback}"</p>
                                <p className="text-xs text-muted">Tugas: "{fb.taskTitle}"</p>
                            </div>
                        ))}
                    </div>
                );
        }
    }

    return (
        <div>
            <Link to="/staff/mentoring" className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary mb-4">
                <ArrowLeft size={16}/> Kembali ke Dasbor Mentoring
            </Link>
            <div className="flex items-center gap-4 mb-6">
                 <div>
                    <h1 className="text-3xl font-bold text-primary">{intern.name}</h1>
                    <p className="text-muted mt-1">{intern.jurusan} - {intern.asalSekolah}</p>
                </div>
            </div>
            
            <div className="flex items-stretch border-b border-base-300">
                <TabButton label="Absensi" icon={<Calendar size={16}/>} isActive={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} />
                <TabButton label="Laporan Harian" icon={<ClipboardList size={16}/>} isActive={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
                <TabButton label="Tugas" icon={<CheckSquare size={16}/>} isActive={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} />
                <TabButton label="Feedback" icon={<MessageSquare size={16}/>} isActive={activeTab === 'feedback'} onClick={() => setActiveTab('feedback')} />
            </div>

            <div className="mt-6">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default StaffInternDetailPage;
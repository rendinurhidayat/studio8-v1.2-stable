
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getTasksForUser, getMentorFeedbackForIntern, updateTask, updateUserPoints } from '../../services/api';
import { Task, MentorFeedback } from '../../types';
import { format } from 'date-fns';
import id from 'date-fns/locale/id';
import { Loader2, CheckSquare, Calendar, MessageSquare, Star, AlertTriangle } from 'lucide-react';
import StarRating from '../../components/feedback/StarRating';

const TaskCard: React.FC<{
    task: Task;
    feedback: MentorFeedback | undefined;
    onMarkDone: (taskId: string) => void;
    actionLoading: boolean;
}> = ({ task, feedback, onMarkDone, actionLoading }) => {
    
    const isOverdue = task.dueDate && !task.completed && new Date(task.dueDate) < new Date();

    return (
        <div className="bg-white border border-base-200 rounded-2xl p-6 shadow-lg flex flex-col md:flex-row gap-6">
            <div className="flex-grow">
                <div className="flex justify-between items-start">
                    <h3 className={`font-bold text-lg ${task.completed ? 'line-through text-muted' : 'text-primary'}`}>{task.text}</h3>
                    {task.completed ? (
                         <span className="text-xs font-semibold px-2 py-1 bg-success/10 text-success rounded-full">Selesai</span>
                    ) : (
                         <span className="text-xs font-semibold px-2 py-1 bg-base-200 text-base-content rounded-full">Pending</span>
                    )}
                </div>
                {task.description && <p className="text-sm text-muted mt-2">{task.description}</p>}
                <div className="flex items-center gap-4 text-xs text-muted mt-3 pt-3 border-t border-base-200">
                    <span>Dibuat oleh: {task.creatorName}</span>
                    {task.dueDate && (
                        <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-error font-semibold' : ''}`}>
                            {isOverdue && <AlertTriangle size={14} />}
                            <Calendar size={14} />
                            <span>Tenggat: {format(new Date(task.dueDate), 'd MMM yyyy', { locale: id })}</span>
                        </div>
                    )}
                </div>
            </div>
            <div className="md:w-1/3 flex-shrink-0">
                {task.completed ? (
                    feedback ? (
                        <div className="p-4 bg-base-100 rounded-lg h-full">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm text-accent flex items-center gap-2"><MessageSquare size={16}/> Feedback Mentor</h4>
                                <StarRating value={feedback.rating} isEditable={false} size={16} />
                            </div>
                            <p className="text-sm text-base-content italic mt-2">"{feedback.feedback}"</p>
                            <p className="text-xs text-right text-muted mt-2">- {feedback.mentorName}</p>
                        </div>
                    ) : (
                        <div className="p-4 bg-base-100 rounded-lg text-center text-sm text-muted h-full flex items-center justify-center">
                            Menunggu feedback...
                        </div>
                    )
                ) : (
                    <button onClick={() => onMarkDone(task.id)} disabled={actionLoading} className="w-full h-full p-4 bg-accent text-accent-content font-bold rounded-lg hover:bg-accent/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                         {actionLoading ? <Loader2 className="animate-spin"/> : <><CheckSquare size={20} /> Tandai Selesai</>}
                    </button>
                )}
            </div>
        </div>
    );
};


const InternTasksPage = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [feedback, setFeedback] = useState<MentorFeedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        const [taskData, feedbackData] = await Promise.all([
            getTasksForUser(user.id),
            getMentorFeedbackForIntern(user.id),
        ]);
        setTasks(taskData);
        setFeedback(feedbackData);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const handleMarkDone = async (taskId: string) => {
        if (!user) return;
        setActionLoading(taskId);
        await updateTask(taskId, { completed: true }, user.id);
    
        // Gamification: Add points for completing a task
        await updateUserPoints(user.id, 10);
        
        // Optimistic update
        setTasks(current => current.map(t => t.id === taskId ? { ...t, completed: true } : t));
        setActionLoading(null);
    };
    
    const pendingTasks = useMemo(() => tasks.filter(t => !t.completed).sort((a,b) => (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) - (b.dueDate ? new Date(b.dueDate).getTime() : Infinity)), [tasks]);
    const completedTasks = useMemo(() => tasks.filter(t => t.completed).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [tasks]);

    if (loading) {
        return <div className="text-center p-8 min-h-full"><Loader2 className="animate-spin text-primary mx-auto" size={32} /></div>;
    }

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-accent/10 rounded-lg text-accent">
                    <CheckSquare size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-primary">Tugas & Assignment</h1>
                    <p className="text-muted mt-1">Lihat dan selesaikan tugas-tugas yang diberikan oleh mentormu.</p>
                </div>
            </div>

            <div className="space-y-8">
                <div>
                    <h2 className="text-xl font-semibold text-primary mb-4">Tugas Aktif ({pendingTasks.length})</h2>
                    <div className="space-y-4">
                        {pendingTasks.length > 0 ? pendingTasks.map(task => (
                            <TaskCard 
                                key={task.id} 
                                task={task} 
                                feedback={undefined} 
                                onMarkDone={handleMarkDone} 
                                actionLoading={actionLoading === task.id}
                            />
                        )) : <p className="text-muted text-center py-8 bg-base-100 rounded-lg">Tidak ada tugas aktif. Kerja bagus!</p>}
                    </div>
                </div>
                 <div>
                    <h2 className="text-xl font-semibold text-primary mb-4">Tugas Selesai ({completedTasks.length})</h2>
                    <div className="space-y-4">
                         {completedTasks.length > 0 ? completedTasks.map(task => (
                            <TaskCard 
                                key={task.id} 
                                task={task} 
                                feedback={feedback.find(f => f.taskId === task.id)} 
                                onMarkDone={() => {}}
                                actionLoading={false}
                            />
                        )) : <p className="text-muted text-center py-8 bg-base-100 rounded-lg">Belum ada tugas yang diselesaikan.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InternTasksPage;
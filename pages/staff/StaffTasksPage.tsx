

import React, { useState, useEffect } from 'react';
import { getDailyTasks, updateDailyTaskStatus, getTasksForUser, updateTask } from '../../services/api';
import { Task } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import id from 'date-fns/locale/id';

interface DailyTaskItem {
  id: string;
  text: string;
  completed: boolean;
}

const StaffTasksPage = () => {
    const { user } = useAuth();
    const [dailyTasks, setDailyTasks] = useState<DailyTaskItem[]>([]);
    const [specialTasks, setSpecialTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        const [dailyData, specialData] = await Promise.all([
            getDailyTasks(user.id),
            getTasksForUser(user.id),
        ]);
        setDailyTasks(dailyData);
        setSpecialTasks(specialData);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const handleToggleDailyTask = async (taskId: string, completed: boolean) => {
        if (!user) return;
        // Optimistic UI update
        setDailyTasks(current => current.map(task => 
            task.id === taskId ? { ...task, completed } : task
        ));
        await updateDailyTaskStatus(user.id, taskId, completed);
    };
    
    const handleToggleSpecialTask = async (task: Task) => {
        if (!user) return;
         // Optimistic UI update
        setSpecialTasks(current => current.map(t => 
            t.id === task.id ? { ...t, completed: !t.completed } : t
        ));
        // FIX: 't' was used here instead of 'task', causing a reference error.
        await updateTask(task.id, { completed: !task.completed }, user.id);
    };

    if (loading) {
        return <div className="text-center p-8 text-slate-500"><Loader2 className="animate-spin inline-block mr-2" /> Memuat tugas...</div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Papan Tugas</h1>
            <p className="text-slate-600 mb-6">Kelola tugas rutin harian dan tugas khusus yang diberikan oleh admin.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Daily Routine Tasks */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold text-slate-700 mb-4 border-b pb-2">Tugas Rutin Harian</h2>
                    <div className="space-y-4">
                        {dailyTasks.map(task => (
                            <div key={task.id} className="flex items-center">
                                <input
                                    type="checkbox"
                                    id={`task-${task.id}`}
                                    checked={task.completed}
                                    onChange={(e) => handleToggleDailyTask(task.id, e.target.checked)}
                                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <label 
                                    htmlFor={`task-${task.id}`} 
                                    className={`ml-3 block text-sm font-medium cursor-pointer transition-colors ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}
                                >
                                    {task.text}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Special Assigned Tasks */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                     <h2 className="text-xl font-bold text-slate-700 mb-4 border-b pb-2">Tugas Khusus dari Admin</h2>
                     {specialTasks.length === 0 ? (
                         <p className="text-center text-gray-500 p-4">Tidak ada tugas khusus saat ini. Kerja bagus!</p>
                     ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                             {specialTasks.map(task => (
                                <div key={task.id} 
                                    onClick={() => handleToggleSpecialTask(task)}
                                    className={`p-4 rounded-lg flex items-start gap-3 cursor-pointer transition-colors ${task.completed ? 'bg-green-50 hover:bg-green-100' : 'bg-blue-50 hover:bg-blue-100'}`}
                                >
                                     <div className={`mt-1 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-2 ${task.completed ? 'bg-green-500 border-green-500' : 'border-blue-400'}`}>
                                        {task.completed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                                     </div>
                                     <div>
                                        <p className={`font-medium ${task.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{task.text}</p>
                                        <div className="text-xs text-gray-400 mt-1 space-x-2">
                                            <span>Dari: {task.creatorName}</span>
                                            {task.dueDate && <span>Tenggat: {format(new Date(task.dueDate), 'd MMM yyyy', { locale: id })}</span>}
                                        </div>
                                     </div>
                                </div>
                             ))}
                        </div>
                     )}
                </div>
            </div>
        </div>
    );
};

export default StaffTasksPage;


import React, { useState, useEffect, useMemo } from 'react';
import { getUsers, getAttendanceForUser, getDailyReportsForUser, getTasksForUser } from '../../services/api';
import { User, UserRole, Attendance, DailyReport, Task, AttendanceStatus } from '../../types';
import { format, differenceInDays } from 'date-fns';
import id from 'date-fns/locale/id';
import Modal from '../../components/common/Modal';
import { Loader2, Calendar, ClipboardList, CheckSquare, FileText, CalendarCheck, ClipboardCheck } from 'lucide-react';
import Card from '../../components/common/Card';
import { motion } from 'framer-motion';

const InternDetailModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    intern: User | null
}> = ({ isOpen, onClose, intern }) => {
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [reports, setReports] = useState<DailyReport[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && intern) {
            const fetchData = async () => {
                setLoading(true);
                const [attData, repData, taskData] = await Promise.all([
                    getAttendanceForUser(intern.id),
                    getDailyReportsForUser(intern.id),
                    getTasksForUser(intern.id),
                ]);
                setAttendance(attData);
                setReports(repData);
                setTasks(taskData);
                setLoading(false);
            };
            fetchData();
        }
    }, [isOpen, intern]);

    const attendanceRate = useMemo(() => {
        if (!intern?.startDate) return 0;
        const today = new Date();
        const start = new Date(intern.startDate);
        let workingDays = 0;
        for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sunday and Saturday
                workingDays++;
            }
        }
        const presentDays = attendance.filter(a => a.status === AttendanceStatus.Present).length;
        return workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;
    }, [attendance, intern]);

    const avgTaskProgress = useMemo(() => {
        if (tasks.length === 0) return 0;
        const totalProgress = tasks.reduce((sum, task) => sum + (task.progress || 0), 0);
        return Math.round(totalProgress / tasks.length);
    }, [tasks]);
    
    const internData = useMemo(() => {
        if (!intern) return { totalDays: 0, daysPassed: 0, progress: 0 };
        const totalDays = intern.startDate && intern.endDate ? differenceInDays(new Date(intern.endDate), new Date(intern.startDate)) + 1 : 0;
        const daysPassed = intern.startDate ? differenceInDays(new Date(), new Date(intern.startDate)) + 1 : 0;
        const progress = totalDays > 0 ? Math.min(Math.round((daysPassed / totalDays) * 100), 100) : 0;
        return { totalDays, daysPassed, progress };
    }, [intern]);

    if (!intern) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Detail Kinerja: ${intern.name}`}>
            {loading ? <div className="text-center p-8"><Loader2 className="animate-spin mx-auto"/></div> : (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <Card>
                        <h3 className="font-bold text-lg">Ringkasan</h3>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 my-2">
                            <div className="bg-blue-600 h-2.5 rounded-full" style={{width: `${internData.progress}%`}}></div>
                        </div>
                        <p className="text-sm text-gray-600 text-center">{internData.progress}% Periode Magang Selesai</p>
                        <div className="grid grid-cols-2 gap-4 mt-4 text-center">
                            <div>
                                <p className="font-bold text-2xl text-green-600">{attendanceRate}%</p>
                                <p className="text-xs text-gray-500">Tingkat Kehadiran</p>
                            </div>
                             <div>
                                <p className="font-bold text-2xl text-purple-600">{avgTaskProgress}%</p>
                                <p className="text-xs text-gray-500">Rata-rata Progres Tugas</p>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="font-bold text-lg flex items-center gap-2"><Calendar size={20}/> Riwayat Absensi</h3>
                        <ul className="space-y-2 mt-2">
                            {attendance.map(att => (
                                <li key={att.id} className="text-sm p-3 bg-base-100 rounded-lg flex justify-between items-center">
                                    <span className="font-semibold">{format(new Date(att.checkInTime), 'eeee, d MMMM yyyy', { locale: id })}</span>
                                    <span className="text-muted">{format(new Date(att.checkInTime), 'HH:mm')} - {att.checkOutTime ? format(new Date(att.checkOutTime), 'HH:mm') : '...'}</span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                    <Card>
                        <h3 className="font-bold text-lg flex items-center gap-2"><ClipboardList size={20}/> Laporan Harian</h3>
                        <ul className="space-y-2 mt-2">
                            {reports.map(rep => (
                                <li key={rep.id} className="text-sm p-2 bg-gray-50 rounded">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold">{format(new Date(rep.submittedAt), 'd MMMM yyyy', { locale: id })}</p>
                                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">{rep.mood}</span>
                                    </div>
                                    <p className="text-gray-700 mt-1">{rep.content}</p>
                                    {rep.blockers && <p className="text-sm text-red-600 mt-1">Kendala: {rep.blockers}</p>}
                                </li>
                            ))}
                        </ul>
                    </Card>
                     <Card>
                        <h3 className="font-bold text-lg flex items-center gap-2"><CheckSquare size={20}/> Progres Tugas Khusus</h3>
                        <ul className="space-y-3 mt-2">
                            {tasks.map(task => (
                                <li key={task.id}>
                                    <div className="flex justify-between items-center text-sm mb-1">
                                        <p>{task.text}</p>
                                        <p className="font-semibold">{task.progress || 0}%</p>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div className="bg-purple-600 h-1.5 rounded-full" style={{width: `${task.progress || 0}%`}}></div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            )}
        </Modal>
    );
}

const StatPill: React.FC<{ icon: React.ReactNode; value: string; label: string; }> = ({ icon, value, label }) => (
    <div className="text-center p-2 rounded-lg bg-base-100 flex-1">
        <div className="w-8 h-8 mx-auto bg-primary/10 text-primary rounded-full flex items-center justify-center mb-1">
            {icon}
        </div>
        <p className="font-bold text-lg text-primary">{value}</p>
        <p className="text-xs text-muted">{label}</p>
    </div>
);

const InternProfileCard: React.FC<{ intern: User; onSelect: (intern: User) => void; }> = ({ intern, onSelect }) => {
    const [stats, setStats] = useState<{
        attendanceRate: number;
        totalReports: number;
        tasksCompletedPercent: number;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInternData = async () => {
            setLoading(true);
            try {
                const [attendanceData, reportsData, tasksData] = await Promise.all([
                    getAttendanceForUser(intern.id),
                    getDailyReportsForUser(intern.id),
                    getTasksForUser(intern.id),
                ]);

                let attendanceRate = 0;
                if (intern.startDate) {
                    const today = new Date();
                    const start = new Date(intern.startDate);
                    let workingDays = 0;
                    if (today >= start) {
                        for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
                            const dayOfWeek = d.getDay();
                            if (dayOfWeek !== 0 && dayOfWeek !== 6) { 
                                workingDays++;
                            }
                        }
                    }
                    const presentDays = attendanceData.filter(a => a.status === AttendanceStatus.Present).length;
                    attendanceRate = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;
                }

                const tasksCompletedPercent = tasksData.length > 0
                    ? Math.round((tasksData.filter(t => t.completed).length / tasksData.length) * 100)
                    : 100;

                setStats({
                    attendanceRate,
                    totalReports: reportsData.length,
                    tasksCompletedPercent,
                });

            } catch (error) {
                console.error("Failed to fetch intern stats:", error);
                setStats(null);
            } finally {
                setLoading(false);
            }
        };

        fetchInternData();
    }, [intern]);

    const calculateProgress = (startDate?: string, endDate?: string) => {
        if (!startDate || !endDate) return 0;
        const totalDuration = differenceInDays(new Date(endDate), new Date(startDate));
        const daysPassed = differenceInDays(new Date(), new Date(startDate));
        if (totalDuration <= 0 || daysPassed < 0) return 0;
        return Math.min(Math.round((daysPassed / totalDuration) * 100), 100);
    };

    const progress = calculateProgress(intern.startDate, intern.endDate);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            className="bg-white rounded-2xl shadow-lg border border-base-200/50 p-6 flex flex-col"
        >
            <div className="flex-grow">
                <div className="text-center">
                    <h3 className="font-bold text-lg text-primary">{intern.name}</h3>
                    <p className="text-sm text-muted">{intern.asalSekolah} ({intern.jurusan})</p>
                </div>

                <div className="my-4">
                    <div className="flex justify-between text-xs text-muted mb-1">
                        <span>Progres Magang</span>
                        <span className="font-semibold">{progress}%</span>
                    </div>
                    <div className="w-full bg-base-200 rounded-full h-2.5">
                        <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="animate-spin text-primary" />
                    </div>
                ) : stats ? (
                    <div className="flex justify-between items-center gap-2">
                        <StatPill icon={<CalendarCheck size={16} />} value={`${stats.attendanceRate}%`} label="Kehadiran" />
                        <StatPill icon={<FileText size={16} />} value={stats.totalReports.toString()} label="Laporan" />
                        <StatPill icon={<ClipboardCheck size={16} />} value={`${stats.tasksCompletedPercent}%`} label="Tugas" />
                    </div>
                ) : (
                    <div className="text-center text-error text-sm h-24 flex items-center justify-center">Gagal memuat data.</div>
                )}
            </div>
            <button onClick={() => onSelect(intern)} className="mt-6 w-full bg-primary/10 text-primary font-semibold py-2 px-4 rounded-lg hover:bg-primary/20 transition-colors">
                Lihat Detail
            </button>
        </motion.div>
    );
};


const StaffMentoringPage = () => {
    const [interns, setInterns] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIntern, setSelectedIntern] = useState<User | null>(null);

    useEffect(() => {
        const fetchInterns = async () => {
            setLoading(true);
            const allUsers = await getUsers();
            setInterns(allUsers.filter(u => u.role === UserRole.AnakMagang || u.role === UserRole.AnakPKL));
            setLoading(false);
        };
        fetchInterns();
    }, []);

    if (loading) return <div className="text-center p-8"><Loader2 className="animate-spin mx-auto"/></div>;

    return (
        <div>
            <h1 className="text-3xl font-bold">Dasbor Mentoring</h1>
            <p className="text-muted mt-1 mb-6">Pantau progres, absensi, dan laporan harian anak magang.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {interns.map(intern => (
                    <InternProfileCard key={intern.id} intern={intern} onSelect={setSelectedIntern} />
                ))}
            </div>

            <InternDetailModal isOpen={!!selectedIntern} onClose={() => setSelectedIntern(null)} intern={selectedIntern} />
        </div>
    );
}

export default StaffMentoringPage;
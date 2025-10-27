import React, { useState, useEffect, useMemo } from 'react';
import { getUsers, getAttendanceForUser, getDailyReportsForUser, getTasksForUser } from '../../services/api';
import { User, UserRole, Attendance, DailyReport, Task, AttendanceStatus } from '../../types';
import { format, differenceInDays, isBefore } from 'date-fns';
import id from 'date-fns/locale/id';
import Modal from '../../components/common/Modal';
import { Loader2, Calendar, ClipboardList, CheckSquare, Percent } from 'lucide-react';
import Card from '../../components/common/Card';

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
    
    if (!intern) return null;

    const totalDays = intern.startDate && intern.endDate ? differenceInDays(intern.endDate, intern.startDate) + 1 : 0;
    const daysPassed = intern.startDate ? differenceInDays(new Date(), intern.startDate) + 1 : 0;
    const progress = totalDays > 0 ? Math.min(Math.round((daysPassed / totalDays) * 100), 100) : 0;

    const attendanceRate = useMemo(() => {
        if (!intern?.startDate) return 0;
        const today = new Date();
        const start = intern.startDate;
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


    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Detail Kinerja: ${intern.name}`}>
            {loading ? <div className="text-center p-8"><Loader2 className="animate-spin mx-auto"/></div> : (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <Card>
                        <h3 className="font-bold text-lg">Ringkasan</h3>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 my-2">
                            <div className="bg-blue-600 h-2.5 rounded-full" style={{width: `${progress}%`}}></div>
                        </div>
                        <p className="text-sm text-gray-600 text-center">{progress}% Periode Magang Selesai</p>
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
                                <li key={att.id} className="text-sm p-2 bg-gray-50 rounded flex justify-between">
                                    <span>{format(att.checkInTime, 'd MMMM yyyy', {locale: id})}</span>
                                    <span>{format(att.checkInTime, 'HH:mm')} - {att.checkOutTime ? format(att.checkOutTime, 'HH:mm') : '...'}</span>
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
                                        <p className="font-semibold">{format(rep.submittedAt, 'd MMMM yyyy', {locale: id})}</p>
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


const AdminInternsPage = () => {
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

    const calculateProgress = (intern: User) => {
        if (!intern.startDate || !intern.endDate) return 0;
        const totalDuration = differenceInDays(intern.endDate, intern.startDate);
        const daysPassed = differenceInDays(new Date(), intern.startDate);
        if (totalDuration <= 0 || daysPassed < 0) return 0;
        return Math.min(Math.round((daysPassed / totalDuration) * 100), 100);
    };

    if (loading) return <div className="text-center p-8"><Loader2 className="animate-spin mx-auto"/></div>;

    return (
        <div>
            <h1 className="text-3xl font-bold">Manajemen Magang & PKL</h1>
            <p className="text-muted mt-1 mb-6">Pantau progres, absensi, dan laporan harian anak magang.</p>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full leading-normal">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold uppercase">Nama</th>
                            <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold uppercase">Asal Sekolah</th>
                            <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold uppercase">Periode</th>
                            <th className="px-5 py-3 border-b-2 text-left text-xs font-semibold uppercase">Progres</th>
                        </tr>
                    </thead>
                    <tbody>
                        {interns.map(intern => (
                            <tr key={intern.id} onClick={() => setSelectedIntern(intern)} className="hover:bg-gray-50 cursor-pointer">
                                <td className="px-5 py-5 border-b text-sm">
                                    <p className="font-semibold text-blue-600">{intern.name}</p>
                                    <p className="text-xs text-gray-500">{intern.role}</p>
                                </td>
                                <td className="px-5 py-5 border-b text-sm">{intern.asalSekolah} ({intern.jurusan})</td>
                                <td className="px-5 py-5 border-b text-sm">
                                    {intern.startDate ? format(intern.startDate, 'd MMM yyyy', {locale: id}) : 'N/A'} - 
                                    {intern.endDate ? format(intern.endDate, 'd MMM yyyy', {locale: id}) : 'N/A'}
                                </td>
                                <td className="px-5 py-5 border-b text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div className="bg-blue-600 h-2.5 rounded-full" style={{width: `${calculateProgress(intern)}%`}}></div>
                                        </div>
                                        <span className="font-semibold">{calculateProgress(intern)}%</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <InternDetailModal isOpen={!!selectedIntern} onClose={() => setSelectedIntern(null)} intern={selectedIntern} />
        </div>
    );
}

export default AdminInternsPage;
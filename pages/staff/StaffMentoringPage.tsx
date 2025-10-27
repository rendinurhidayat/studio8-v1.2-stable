
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getUsers, getTodaysAttendanceForAll } from '../../services/api';
import { User, UserRole, Attendance, AttendanceStatus } from '../../types';
import { Loader2, User as UserIcon, Award, Briefcase, CheckCircle, XCircle } from 'lucide-react';

const getInternLevel = (points: number): { level: string, color: string } => {
    if (points > 150) return { level: 'Mentor Ready', color: 'text-blue-500' };
    if (points > 50) return { level: 'Contributor', color: 'text-green-500' };
    return { level: 'Rookie', color: 'text-gray-500' };
};

const StaffMentoringPage = () => {
    const [interns, setInterns] = useState<User[]>([]);
    const [attendance, setAttendance] = useState<Map<string, Attendance>>(new Map());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [allUsers, allAttendance] = await Promise.all([
                getUsers(),
                getTodaysAttendanceForAll(),
            ]);

            setInterns(allUsers.filter(u => u.role === UserRole.AnakMagang || u.role === UserRole.AnakPKL));

            const attendanceMap = new Map<string, Attendance>();
            allAttendance.forEach(att => {
                attendanceMap.set(att.userId, att);
            });
            setAttendance(attendanceMap);
            setLoading(false);
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-primary/10 rounded-lg text-primary">
                    <Briefcase size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-primary">Dasbor Mentoring</h1>
                    <p className="text-muted mt-1">Pantau aktivitas dan progres semua anak magang secara real-time.</p>
                </div>
            </div>

            {interns.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl shadow-sm border">
                    <p className="text-xl text-gray-500">Tidak ada data intern yang aktif saat ini.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {interns.map(intern => {
                        const internAttendance = attendance.get(intern.id);
                        const status = internAttendance ? 'Hadir' : 'Belum Absen';
                        const levelInfo = getInternLevel(intern.totalPoints || 0);

                        return (
                            <div key={intern.id} className="bg-white rounded-2xl shadow-lg border border-base-200/50 p-6 flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg text-primary">{intern.name}</h3>
                                            <p className="text-sm text-muted">{intern.jurusan}</p>
                                        </div>
                                        <div className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full ${status === 'Hadir' ? 'bg-success/10 text-success' : 'bg-base-200 text-muted'}`}>
                                            {status === 'Hadir' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                            {status}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                        <div className="text-center">
                                            <p className="font-bold text-xl">{intern.totalPoints || 0}</p>
                                            <p className="text-xs text-muted">Poin</p>
                                        </div>
                                        <div className="text-center">
                                            <p className={`font-bold text-xl ${levelInfo.color}`}>{levelInfo.level}</p>
                                            <p className="text-xs text-muted">Level</p>
                                        </div>
                                    </div>
                                </div>
                                <Link to={`/staff/intern/${intern.id}`} className="block text-center mt-6 w-full bg-primary text-primary-content font-semibold py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors">
                                    Lihat Detail
                                </Link>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default StaffMentoringPage;

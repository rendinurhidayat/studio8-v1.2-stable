
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getTodaysAttendance, checkIn, checkOut, getTodaysReport, getTasksForUser, getMentorFeedbackForIntern, updateTaskProgress, getLatestAIInsight, getInternLeaderboard, getUserById, updateUserPoints } from '../../services/api';
import { Attendance, DailyReport, Task, MentorFeedback, AIInsight, User } from '../../types';
import { format, differenceInDays } from 'date-fns';
import id from 'date-fns/locale/id';
import { Calendar, ClipboardList, CheckSquare, LogIn, LogOut, Send, Loader2, Star, Target, ArrowRight, Lightbulb, Award, Trophy } from 'lucide-react';
import InternCard from '../../components/intern/InternCard';
import Modal from '../../components/common/Modal';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import StarRating from '../../components/feedback/StarRating';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const getGamificationDetails = (points: number) => {
    if (points <= 50) {
        return {
            level: 'Rookie',
            progress: (points / 50) * 100,
            nextLevelPoints: 51,
            currentLevelPoints: 0,
        };
    }
    if (points <= 150) {
        return {
            level: 'Contributor',
            progress: ((points - 50) / (150 - 50)) * 100,
            nextLevelPoints: 151,
            currentLevelPoints: 50,
        };
    }
    return {
        level: 'Mentor Ready',
        progress: 100,
        nextLevelPoints: Infinity,
        currentLevelPoints: 150,
    };
};


const InternDashboardPage = () => {
    const { user } = useAuth();
    const [attendance, setAttendance] = useState<Attendance | null>(null);
    const [report, setReport] = useState<DailyReport | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [feedback, setFeedback] = useState<MentorFeedback[]>([]);
    const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
    const [leaderboard, setLeaderboard] = useState<User[]>([]);
    const [freshInternData, setFreshInternData] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({ checkin: false, checkout: false });

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        const [attData, repData, taskData, feedbackData, insightData, leaderboardData, internData] = await Promise.all([
            getTodaysAttendance(user.id),
            getTodaysReport(user.id),
            getTasksForUser(user.id),
            getMentorFeedbackForIntern(user.id),
            getLatestAIInsight(user.id),
            getInternLeaderboard(),
            getUserById(user.id),
        ]);
        setAttendance(attData);
        setReport(repData);
        setTasks(taskData);
        setFeedback(feedbackData);
        setAiInsight(insightData);
        setLeaderboard(leaderboardData);
        setFreshInternData(internData);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const handleCheckIn = async () => {
        if (!user) return;
        setActionLoading(p => ({ ...p, checkin: true }));
        const newAttendance = await checkIn(user.id);
        setAttendance(newAttendance);

        // Gamification: Add points for on-time check-in
        const checkinTime = new Date();
        if (checkinTime.getHours() < 8) {
            await updateUserPoints(user.id, 2);
        }
        
        setActionLoading(p => ({ ...p, checkin: false }));
    };

    const handleCheckOut = async () => {
        if (!user || !attendance) return;
        setActionLoading(p => ({ ...p, checkout: true }));
        const updatedAttendance = await checkOut(user.id, attendance.id);
        setAttendance(updatedAttendance);
        setActionLoading(p => ({ ...p, checkout: false }));
    };

    const gamificationDetails = useMemo(() => getGamificationDetails(freshInternData?.totalPoints || 0), [freshInternData]);
    const latestFeedback = useMemo(() => feedback.length > 0 ? feedback[0] : null, [feedback]);


    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    const hasCheckedIn = !!attendance?.checkInTime;
    const hasCheckedOut = !!attendance?.checkOutTime;

    return (
        <div>
            <h1 className="text-3xl font-bold text-primary">Dashboard Magang</h1>
            <p className="text-muted mt-1 mb-6">Selamat datang, {user?.name}! Lakukan absensi dan laporkan aktivitas harianmu di sini.</p>
            
            {aiInsight && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-accent/20 flex items-start gap-4"
                >
                    <div className="p-2 bg-yellow-300 rounded-full text-yellow-800 flex-shrink-0 mt-1">
                        <Lightbulb size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-primary">Insight Harianmu dari AI</h3>
                        <p className="text-sm text-muted italic">"{aiInsight.insight}"</p>
                    </div>
                </motion.div>
            )}

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                <InternCard title="Level & Poin" icon={<Award size={24} />} className="md:col-span-2 lg:col-span-2">
                    <div className="flex items-center gap-6 mt-2">
                        <div className="flex-shrink-0">
                            <Award size={80} className="text-accent" strokeWidth={1.5} />
                        </div>
                        <div className="flex-grow">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-sm text-muted">Level Saat Ini</p>
                                    <p className="text-2xl font-bold text-primary">{gamificationDetails.level}</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-accent">{freshInternData?.totalPoints || 0}</p>
                                    <p className="text-sm text-muted text-right">Total Poin</p>
                                </div>
                            </div>
                            <div className="w-full bg-base-200 rounded-full h-4 mt-3">
                                <motion.div 
                                    className="bg-accent h-4 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${gamificationDetails.progress}%` }}
                                    transition={{ duration: 1, ease: "easeInOut" }}
                                />
                            </div>
                             <div className="flex justify-between text-xs text-muted mt-1">
                                <span>{gamificationDetails.currentLevelPoints} Poin</span>
                                {gamificationDetails.nextLevelPoints !== Infinity && <span>{gamificationDetails.nextLevelPoints} Poin ke level selanjutnya</span>}
                            </div>
                        </div>
                    </div>
                </InternCard>

                <InternCard title="Papan Peringkat" icon={<Trophy size={24} />}>
                    <ul className="space-y-3 mt-2">
                        {leaderboard.map((intern, index) => (
                            <li key={intern.id} className="flex items-center justify-between p-2 bg-base-100 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <span className={`font-bold text-lg w-6 text-center ${index < 3 ? 'text-gold' : 'text-muted'}`}>{index + 1}</span>
                                    <div>
                                        <p className="font-semibold text-sm text-base-content">{intern.name}</p>
                                        <p className="text-xs text-muted">{intern.jurusan}</p>
                                    </div>
                                </div>
                                <span className="font-bold text-accent">{intern.totalPoints || 0} Poin</span>
                            </li>
                        ))}
                    </ul>
                </InternCard>

                <InternCard title="Absensi Hari Ini" icon={<Calendar size={24} />}>
                    <p className="text-sm text-muted mb-4">{format(new Date(), 'eeee, d MMMM yyyy', { locale: id })}</p>
                    <div className="space-y-3">
                        <button onClick={handleCheckIn} disabled={hasCheckedIn || actionLoading.checkin} className="w-full flex items-center justify-center gap-2 p-3 bg-primary text-primary-content font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
                            {actionLoading.checkin ? <Loader2 className="animate-spin" /> : <LogIn size={18} />} Check-in
                        </button>
                        <button onClick={handleCheckOut} disabled={!hasCheckedIn || hasCheckedOut || actionLoading.checkout} className="w-full flex items-center justify-center gap-2 p-3 bg-base-200 text-base-content font-semibold rounded-xl hover:bg-base-300 disabled:opacity-50 disabled:cursor-not-allowed">
                            {actionLoading.checkout ? <Loader2 className="animate-spin" /> : <LogOut size={18} />} Check-out
                        </button>
                    </div>
                    {attendance && hasCheckedIn && (
                        <div className="text-sm mt-4 text-center bg-success/10 border border-success/20 text-green-800 p-3 rounded-lg">
                            <p>Status: <span className="font-semibold">Hadir</span></p>
                            <p>Check-in: <span className="font-semibold">{format(new Date(attendance.checkInTime), 'HH:mm')}</span></p>
                            {hasCheckedOut && <p>Check-out: <span className="font-semibold">{format(new Date(attendance.checkOutTime!), 'HH:mm')}</span></p>}
                        </div>
                    )}
                </InternCard>
                
                <InternCard title="Aktivitas" icon={<ClipboardList size={24} />} className="justify-between">
                    <p className="text-sm text-muted mb-4">Laporkan kegiatan harian dan lihat tugas khusus yang diberikan.</p>
                    <div className="space-y-3">
                         <Link to="/intern/report" className={`w-full flex items-center justify-between p-3 bg-base-200 text-base-content rounded-xl hover:bg-base-300 transition-colors ${report ? 'pointer-events-none opacity-60' : ''}`}>
                            <span className="font-semibold">Isi Laporan Harian</span>
                            {report ? <CheckSquare className="text-success" /> : <ArrowRight />}
                        </Link>
                         <Link to="/intern/tasks" className="w-full flex items-center justify-between p-3 bg-base-200 text-base-content rounded-xl hover:bg-base-300 transition-colors">
                             <span className="font-semibold">Lihat Tugas & Assignment</span>
                             <ArrowRight />
                        </Link>
                    </div>
                </InternCard>

                 <InternCard title="Feedback Terbaru" icon={<Star size={24} />}>
                   {latestFeedback ? (
                       <div>
                           <div className="flex justify-between items-center">
                               <StarRating value={latestFeedback.rating} isEditable={false} size={20} />
                               <p className="text-xs text-muted">{format(new Date(latestFeedback.date), 'd MMM', { locale: id })}</p>
                           </div>
                           <p className="text-sm text-base-content mt-2 line-clamp-2 italic">"{latestFeedback.feedback}"</p>
                           <p className="text-xs text-muted mt-2">Dari: {latestFeedback.mentorName} untuk tugas "{latestFeedback.taskTitle}"</p>
                       </div>
                   ) : (
                       <p className="text-sm text-center text-muted py-4">Belum ada feedback yang diterima.</p>
                   )}
                </InternCard>
            </motion.div>
        </div>
    );
};

export default InternDashboardPage;
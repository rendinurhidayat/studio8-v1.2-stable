
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getTodaysAttendance, checkIn, checkOut, updateUserPoints } from '../../services/api';
import { Attendance } from '../../types';
import { format } from 'date-fns';
import id from 'date-fns/locale/id';
import { Calendar, LogIn, LogOut, Loader2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const InternAttendancePage = () => {
    const { user } = useAuth();
    const [attendance, setAttendance] = useState<Attendance | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({ checkin: false, checkout: false });

    useEffect(() => {
        const fetchAttendance = async () => {
            if (!user) return;
            setLoading(true);
            const attData = await getTodaysAttendance(user.id);
            setAttendance(attData);
            setLoading(false);
        };
        fetchAttendance();
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

    const hasCheckedIn = !!attendance?.checkInTime;
    const hasCheckedOut = !!attendance?.checkOutTime;

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-accent/10 rounded-lg text-accent">
                    <Calendar size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-primary">Absensi Harian</h1>
                    <p className="text-muted mt-1">Lakukan check-in untuk mencatat kehadiranmu hari ini.</p>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-md mx-auto bg-white border border-base-200/50 rounded-2xl p-8 shadow-lg text-center"
            >
                {loading ? (
                    <Loader2 className="animate-spin text-primary mx-auto" size={32} />
                ) : hasCheckedOut ? (
                    <div className="space-y-4">
                        <CheckCircle size={48} className="text-success mx-auto" />
                        <h2 className="text-xl font-bold text-primary">Sampai Jumpa Besok!</h2>
                        <p className="text-muted">Absensi hari ini telah selesai.</p>
                        {attendance && (
                            <div className="text-sm bg-base-100 p-3 rounded-lg">
                                <p>Check-in: <span className="font-semibold">{format(new Date(attendance.checkInTime), 'HH:mm:ss')}</span></p>
                                <p>Check-out: <span className="font-semibold">{attendance.checkOutTime ? format(new Date(attendance.checkOutTime), 'HH:mm:ss') : ''}</span></p>
                            </div>
                        )}
                    </div>
                ) : hasCheckedIn ? (
                     <div className="space-y-4">
                        <CheckCircle size={48} className="text-success mx-auto" />
                        <h2 className="text-xl font-bold text-primary">Anda Sudah Check-in!</h2>
                        <p className="text-muted">Kehadiranmu tercatat pukul <span className="font-semibold text-base-content">{attendance && format(new Date(attendance.checkInTime), 'HH:mm:ss')}</span>.</p>
                        <p className="text-muted">Silakan check-out di akhir jam kerja.</p>
                         <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleCheckOut}
                            disabled={actionLoading.checkout}
                            className="w-full flex items-center justify-center gap-3 py-3 px-4 text-md font-semibold rounded-xl text-white bg-error hover:bg-error/90 disabled:opacity-50"
                        >
                            {actionLoading.checkout ? <Loader2 className="animate-spin" /> : <><LogOut size={20} /> Check Out</>}
                        </motion.button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-primary">Siap Memulai Hari?</h2>
                        <p className="text-muted">Klik tombol di bawah untuk mencatat waktu check-in Anda untuk tanggal <span className="font-semibold text-base-content">{format(new Date(), 'd MMMM yyyy', { locale: id })}</span>.</p>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleCheckIn}
                            disabled={actionLoading.checkin}
                            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-transparent text-md font-semibold rounded-xl text-white bg-success hover:bg-success/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-success disabled:opacity-50 transition-colors"
                        >
                            {actionLoading.checkin ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <>
                                    <LogIn size={20} />
                                    Check In Sekarang
                                </>
                            )}
                        </motion.button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default InternAttendancePage;

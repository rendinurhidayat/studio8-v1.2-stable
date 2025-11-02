
import React, { useState, useEffect, useMemo } from 'react';
import { getTodaysBookings, getBookings, getClients } from '../../services/api';
import { Booking, BookingStatus, Client } from '../../types';
import StatCard from '../../components/admin/StatCard';
import { Link } from 'react-router-dom';
import { BookOpen, UserCheck, Clock, ArrowRight, Calendar, User, Package as PackageIcon } from 'lucide-react';
// FIX: Use named import for date-fns format function
import { format } from 'date-fns';

const IconWrapper: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div className={`p-3 rounded-full ${className}`}>
        {children}
    </div>
);

const TodaysBookingCard: React.FC<{ booking: Booking }> = ({ booking }) => (
    <div className="flex items-center justify-between p-4 bg-white hover:bg-base-100/50 rounded-xl transition-colors border border-base-200">
        <div className="flex items-center gap-4">
            <div className="flex flex-col items-center justify-center w-16 h-16 bg-accent/10 text-accent rounded-lg font-bold">
                <span className="text-xl">{format(new Date(booking.bookingDate), 'HH:mm')}</span>
            </div>
            <div>
                <p className="font-semibold text-sm text-base-content">{booking.clientName}</p>
                <p className="text-xs text-muted">{booking.package.name} ({booking.selectedSubPackage.name})</p>
            </div>
        </div>
        <Link to="/staff/schedule" className="p-2 text-muted hover:text-accent rounded-full">
            <ArrowRight size={18} />
        </Link>
    </div>
);


const StaffDashboardPage = () => {
    const [todaysBookings, setTodaysBookings] = useState<Booking[]>([]);
    const [allBookings, setAllBookings] = useState<Booking[]>([]);
    const [lastClient, setLastClient] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [todayData, allData] = await Promise.all([getTodaysBookings(), getBookings()]);
            setTodaysBookings(todayData);
            setAllBookings(allData);

            const lastCompleted = allData
                .filter(b => b.bookingStatus === BookingStatus.Completed)
                .sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime())[0];
            setLastClient(lastCompleted || null);
            
            setLoading(false);
        };
        fetchData();
    }, []);

    const weeklyBookingsCount = useMemo(() => {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return allBookings.filter(b => new Date(b.createdAt) >= oneWeekAgo).length;
    }, [allBookings]);

    if (loading) {
        return <div className="text-center p-8 text-muted">Loading dashboard...</div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-primary mb-6">Staff Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <StatCard 
                    title="Booking Minggu Ini" 
                    value={weeklyBookingsCount.toString()} 
                    icon={<IconWrapper className="bg-accent/10 text-accent"><BookOpen size={24} /></IconWrapper>}
                />
                <StatCard 
                    title="Klien Terakhir" 
                    value={lastClient?.clientName || 'N/A'}
                    icon={<IconWrapper className="bg-success/10 text-success"><UserCheck size={24} /></IconWrapper>}
                />
                <StatCard 
                    title="Jadwal Hari Ini" 
                    value={`${todaysBookings.length} Sesi`}
                    icon={<IconWrapper className="bg-warning/10 text-warning"><Clock size={24} /></IconWrapper>}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-lg border border-base-200">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-primary">Jadwal Sesi Hari Ini</h2>
                        <Link to="/staff/schedule" className="text-sm font-medium text-accent hover:underline">Lihat Semua</Link>
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {todaysBookings.length > 0 ? (
                            todaysBookings.map(booking => <TodaysBookingCard key={booking.id} booking={booking} />)
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center text-muted p-8 h-full">
                                <Calendar size={40} className="mb-2 text-base-300" />
                                <p className="text-sm font-semibold">Tidak ada jadwal hari ini.</p>
                                <p className="text-xs">Waktu yang tepat untuk merapikan studio!</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-base-200">
                        <h2 className="text-xl font-semibold text-primary mb-4">Pengingat Shift</h2>
                         <div className="p-4 bg-base-100/80 rounded-xl">
                            <p className="font-bold text-base-content">Shift Pagi</p>
                            <p className="text-sm text-muted">08:00 - 16:00</p>
                            <p className="text-xs text-muted mt-2">Jangan lupa untuk mempersiapkan studio 30 menit sebelum sesi pertama dimulai.</p>
                         </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-base-200">
                         <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-primary">Tugas Cepat</h2>
                            <Link to="/staff/tasks" className="text-sm font-medium text-accent hover:underline">Lihat Tugas</Link>
                        </div>
                        <ul className="text-sm text-base-content space-y-2">
                            <li className="flex items-center gap-2">✅ Cek kebersihan studio</li>
                            <li className="flex items-center gap-2">✅ Konfirmasi jadwal besok</li>
                            <li className="flex items-center gap-2">✅ Backup file foto</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffDashboardPage;
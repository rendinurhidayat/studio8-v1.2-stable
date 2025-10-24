import React, { useState, useEffect } from 'react';
import { getBookings, getFinancialData, getLatestInsight } from '../../services/api';
import { Booking, Transaction, TransactionType, BookingStatus, UserRole, Insight } from '../../types';
import StatCard from '../../components/admin/StatCard';
import BookingChart from '../../components/admin/BookingChart';
import { DollarSign, BookOpen, Clock, CalendarCheck2, ArrowRight, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';

const IconWrapper: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div className={`p-3 rounded-full ${className}`}>
        {children}
    </div>
);

const UpcomingBookingCard: React.FC<{ booking: Booking }> = ({ booking }) => (
    <div className="flex items-center justify-between p-3 bg-white hover:bg-base-100 rounded-xl transition-colors">
        <div className="flex items-center gap-4">
            <div className="flex flex-col items-center justify-center w-12 h-12 bg-accent/10 text-accent rounded-lg">
                <span className="text-sm font-bold">{booking.bookingDate.toLocaleDateString('id-ID', { day: '2-digit', timeZone: 'Asia/Jakarta' })}</span>
                <span className="text-xs">{booking.bookingDate.toLocaleDateString('id-ID', { month: 'short', timeZone: 'Asia/Jakarta' })}</span>
            </div>
            <div>
                <p className="font-semibold text-sm text-base-content">{booking.clientName}</p>
                <p className="text-xs text-muted">{booking.package.name} ({booking.selectedSubPackage.name}) at {booking.bookingDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}</p>
            </div>
        </div>
        <Link to="/admin/schedule" className="p-2 text-muted hover:text-accent rounded-full">
            <ArrowRight size={18} />
        </Link>
    </div>
);


const AdminDashboardPage: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [insight, setInsight] = useState<Insight | null>(null);
    const [loading, setLoading] = useState(true);
    const { addNotification } = useNotifications();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [bookingsData, transactionsData, insightData] = await Promise.all([
                getBookings(),
                getFinancialData(),
                getLatestInsight()
            ]);
            setBookings(bookingsData);
            setTransactions(transactionsData);
            setInsight(insightData);
            setLoading(false);
        };
        fetchData();
    }, []);

    // H-1 Reminder Logic
    useEffect(() => {
        if (bookings.length > 0) {
            const now = new Date();
            const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const remindersSentKey = 'studio8_reminders_sent';
            const sentReminders: { [key: string]: string } = JSON.parse(localStorage.getItem(remindersSentKey) || '{}');

            bookings.forEach(booking => {
                if (
                    booking.bookingStatus === BookingStatus.Confirmed &&
                    booking.bookingDate > now &&
                    booking.bookingDate <= twentyFourHoursFromNow &&
                    !sentReminders[booking.id] // Check if reminder was already sent
                ) {
                    addNotification({
                        recipient: UserRole.Staff,
                        type: 'info',
                        message: `Pengingat: Sesi ${booking.clientName} besok jam ${booking.bookingDate.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', timeZone: 'Asia/Jakarta' })}.`,
                        link: '/staff/schedule'
                    });
                     addNotification({
                        recipient: UserRole.Admin,
                        type: 'info',
                        message: `Pengingat: Sesi ${booking.clientName} besok jam ${booking.bookingDate.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', timeZone: 'Asia/Jakarta' })}.`,
                        link: '/admin/schedule'
                    });

                    // Simulate sending reminder to client
                    console.log(`[SIMULASI NOTIFIKASI] Mengirim H-1 Reminder ke klien ${booking.clientName} (${booking.clientPhone})`);

                    // Mark as sent
                    sentReminders[booking.id] = new Date().toISOString();
                }
            });
            localStorage.setItem(remindersSentKey, JSON.stringify(sentReminders));
        }
    }, [bookings, addNotification]);
    
    // --- Data Calculation ---
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

    const monthlyRevenue = transactions
        .filter(t => t.type === TransactionType.Income && t.date >= startOfMonth)
        .reduce((sum, t) => sum + t.amount, 0);

    const weeklyBookingsCount = bookings
        .filter(b => b.createdAt >= startOfWeek)
        .length;

    const upcomingBookings = bookings
        .filter(b => b.bookingDate > new Date() && b.bookingStatus === BookingStatus.Confirmed)
        .sort((a, b) => a.bookingDate.getTime() - b.bookingDate.getTime())
        .slice(0, 4);
    
    const pendingBookingsCount = bookings.filter(b => b.bookingStatus === BookingStatus.Pending).length;


    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <p className="text-muted">Memuat data dashboard...</p>
        </div>
    );

    return (
        <div>
            <h1 className="text-3xl font-bold text-primary mb-6">Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <StatCard 
                    title="Pemasukan Bulan Ini" 
                    value={`Rp ${monthlyRevenue.toLocaleString('id-ID')}`} 
                    icon={<IconWrapper className="bg-success/10 text-success"><DollarSign size={24} /></IconWrapper>}
                />
                <StatCard 
                    title="Booking Minggu Ini" 
                    value={weeklyBookingsCount.toString()}
                    icon={<IconWrapper className="bg-accent/10 text-accent"><BookOpen size={24} /></IconWrapper>}
                />
                <StatCard 
                    title="Menunggu Konfirmasi" 
                    value={pendingBookingsCount.toString()}
                    icon={<IconWrapper className="bg-warning/10 text-warning"><Clock size={24} /></IconWrapper>}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
                <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-lg border border-base-200">
                    <h2 className="text-xl font-semibold text-primary mb-4">Aktivitas Booking Mingguan</h2>
                    <div className="h-72">
                         <BookingChart bookings={bookings} />
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-base-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-primary">Jadwal Terdekat</h2>
                            <Link to="/admin/schedule" className="text-sm font-medium text-accent hover:underline">Lihat Semua</Link>
                        </div>
                        <div className="space-y-3">
                            {upcomingBookings.length > 0 ? (
                                upcomingBookings.map(booking => <UpcomingBookingCard key={booking.id} booking={booking} />)
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center text-muted p-8">
                                    <CalendarCheck2 size={40} className="mb-2 text-base-300" />
                                    <p className="text-sm">Tidak ada jadwal terdekat yang dikonfirmasi.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-base-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
                                <Lightbulb size={22} className="text-yellow-500" />
                                AI Daily Insight
                            </h2>
                        </div>
                        {insight ? (
                            <div>
                                <p className="text-sm text-base-content italic">"{insight.insight}"</p>
                                <p className="text-xs text-muted text-right mt-2">
                                    {insight.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center text-muted py-8">
                                <Lightbulb size={40} className="mb-2 text-base-300" />
                                <p className="text-sm">Belum ada insight harian dari AI.</p>
                                <p className="text-xs mt-1">Insight baru akan dibuat setiap pagi.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardPage;
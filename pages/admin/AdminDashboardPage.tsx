
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getBookings, getFinancialData, getExpenses, getActivityLogs } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Booking, Transaction, BookingStatus, Expense, ActivityLog } from '../../types';
import StatCard from '../../components/admin/StatCard';
import Card from '../../components/common/Card';
import ChartCard from '../../components/admin/ChartCard';
import { DollarSign, BookOpen, Clock, TrendingUp, History, ArrowRight, UserCheck, CheckCircle, Loader2, Lightbulb, Sparkles, PlusCircle, Shield, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
// FIX: Use named imports for date-fns functions
import { format, isSameDay, eachDayOfInterval, subDays, formatDistanceToNow } from 'date-fns';
import id from 'date-fns/locale/id';
import { motion, type Variants } from 'framer-motion';


const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
        },
    },
};

const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: 'spring',
            stiffness: 100,
        },
    },
};

const IconWrapper: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div className={`p-3 rounded-full ${className}`}>
        {children}
    </div>
);

const UpcomingBookingCard: React.FC<{ booking: Booking }> = ({ booking }) => (
    <motion.div variants={itemVariants} className="flex items-center justify-between p-3 bg-white hover:bg-base-100/50 rounded-xl transition-colors border">
        <div className="flex items-center gap-4">
            <div className="flex flex-col items-center justify-center w-12 h-12 bg-accent/10 text-accent rounded-lg">
                <span className="text-sm font-bold">{new Date(booking.bookingDate).toLocaleDateString('id-ID', { day: '2-digit', timeZone: 'Asia/Jakarta' })}</span>
                <span className="text-xs">{new Date(booking.bookingDate).toLocaleDateString('id-ID', { month: 'short', timeZone: 'Asia/Jakarta' })}</span>
            </div>
            <div>
                <p className="font-semibold text-sm text-base-content">{booking.clientName}</p>
                <p className="text-xs text-muted">{booking.package.name} at {new Date(booking.bookingDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}</p>
            </div>
        </div>
        <Link to="/admin/schedule" className="p-2 text-muted hover:text-accent rounded-full">
            <ArrowRight size={18} />
        </Link>
    </motion.div>
);

const QuickAction: React.FC<{ to: string, icon: React.ReactNode, label: string }> = ({ to, icon, label }) => (
    <Link to={to} className="flex flex-col items-center justify-center gap-2 p-4 bg-base-100 hover:bg-base-200 rounded-xl transition-colors text-center">
        {icon}
        <span className="text-sm font-semibold text-primary">{label}</span>
    </Link>
);

const AdminDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [marketingInsight, setMarketingInsight] = useState<string>('');
    const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
    const [insightError, setInsightError] = useState<string|null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [bookingsData, transactionsData, expensesData, logsData] = await Promise.all([
                getBookings(),
                getFinancialData(),
                getExpenses(),
                getActivityLogs(),
            ]);
            setBookings(bookingsData);
            setTransactions(transactionsData);
            setExpenses(expensesData);
            setLogs(logsData);
            setLoading(false);
        };
        fetchData();
    }, []);
    
    const kpiData = useMemo(() => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const todaysRevenue = transactions.filter(t => isSameDay(new Date(t.date), now)).reduce((sum, t) => sum + t.amount, 0);
        const newBookingsToday = bookings.filter(b => isSameDay(new Date(b.createdAt), now)).length;
        const completedToday = bookings.filter(b => b.bookingStatus === BookingStatus.Completed && isSameDay(new Date(b.bookingDate), now)).length;
        const monthlyIncome = transactions.filter(t => new Date(t.date) >= monthStart).reduce((sum, t) => sum + t.amount, 0);
        const monthlyExpense = expenses.filter(e => new Date(e.date) >= monthStart).reduce((sum, e) => sum + e.amount, 0);

        return { todaysRevenue, newBookingsToday, completedToday, monthlyProfit: monthlyIncome - monthlyExpense };
    }, [transactions, bookings, expenses]);
    
    const recentActivity = useMemo(() => logs.slice(0, 5), [logs]);

    const chartData = useMemo(() => {
        const last30Days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
        const dailyData = last30Days.map(date => {
            const Pemasukan = transactions.filter(t => isSameDay(new Date(t.date), date)).reduce((sum, t) => sum + t.amount, 0);
            const Pengeluaran = expenses.filter(e => isSameDay(new Date(e.date), date)).reduce((sum, e) => sum + e.amount, 0);
            return { name: format(date, 'd MMM'), Pemasukan, Pengeluaran };
        });

        const packageMap = new Map<string, number>();
        bookings.forEach(b => {
            if ([BookingStatus.Confirmed, BookingStatus.Completed, BookingStatus.InProgress].includes(b.bookingStatus)) {
                packageMap.set(b.package.name, (packageMap.get(b.package.name) || 0) + 1);
            }
        });
        const packagePopularity = Array.from(packageMap.entries()).map(([name, value]) => ({ name, value }));

        return { dailyData, packagePopularity };
    }, [transactions, expenses, bookings]);

    const fetchMarketingInsight = useCallback(async () => {
        if (bookings.length === 0 && transactions.length === 0) return;

        setIsGeneratingInsight(true);
        setMarketingInsight('');
        setInsightError(null);
        try {
            const payload = {
                packagePopularity: chartData.packagePopularity,
                dailyRevenue: chartData.dailyData.slice(-7),
                recentActivity: recentActivity,
            };
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generateMarketingInsight', ...payload }),
            });
            if (!response.ok) throw new Error('Failed to generate insight');
            const data = await response.json();
            setMarketingInsight(data.insight);
        } catch (error) {
            console.error(error);
            setInsightError("Gagal menghasilkan insight. Coba lagi nanti.");
        } finally {
            setIsGeneratingInsight(false);
        }
    }, [chartData, recentActivity, bookings.length, transactions.length]);
    
    useEffect(() => {
        if (!loading) {
            fetchMarketingInsight();
        }
    }, [loading, fetchMarketingInsight]);


    const upcomingBookings = useMemo(() => bookings
        .filter(b => new Date(b.bookingDate) > new Date() && b.bookingStatus === BookingStatus.Confirmed)
        .sort((a, b) => new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime())
        .slice(0, 5), [bookings]);
    
    
    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-primary" size={48} />
        </div>
    );

    const PIE_COLORS = ['#3b82f6', '#16a34a', '#f59e0b', '#dc2626', '#6b7280'];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-primary">Welcome back, {user?.name?.split(' ')[0]}!</h1>
                <p className="text-muted mt-1">Here's a real-time overview of Studio 8's performance.</p>
            </div>
            
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div variants={itemVariants}><StatCard title="Pemasukan Hari Ini" value={`Rp ${kpiData.todaysRevenue.toLocaleString('id-ID')}`} icon={<IconWrapper className="bg-success/10 text-success"><DollarSign size={24} /></IconWrapper>}/></motion.div>
                <motion.div variants={itemVariants}><StatCard title="Booking Baru Hari Ini" value={kpiData.newBookingsToday.toString()} icon={<IconWrapper className="bg-accent/10 text-accent"><BookOpen size={24} /></IconWrapper>}/></motion.div>
                <motion.div variants={itemVariants}><StatCard title="Sesi Selesai Hari Ini" value={kpiData.completedToday.toString()} icon={<IconWrapper className="bg-indigo-100 text-indigo-600"><CheckCircle size={24} /></IconWrapper>}/></motion.div>
                <motion.div variants={itemVariants}><StatCard title="Profit Bulan Ini" value={`Rp ${kpiData.monthlyProfit.toLocaleString('id-ID')}`} icon={<IconWrapper className="bg-warning/10 text-warning"><TrendingUp size={24} /></IconWrapper>}/></motion.div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <motion.div className="lg:col-span-2 space-y-6" variants={containerVariants} initial="hidden" animate="visible">
                    <motion.div variants={itemVariants}>
                        <ChartCard title="Pendapatan & Pengeluaran (30 Hari Terakhir)">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData.dailyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--tw-colors-base-200)"/>
                                    <XAxis dataKey="name" tick={{ fill: 'var(--tw-colors-muted)', fontSize: 12 }} />
                                    <YAxis tick={{ fill: 'var(--tw-colors-muted)', fontSize: 12 }} tickFormatter={(val) => `Rp${Number(val)/1000}k`}/>
                                    <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`} />
                                    <Legend />
                                    <Bar dataKey="Pemasukan" fill="var(--tw-colors-success)" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Pengeluaran" fill="var(--tw-colors-error)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                         <Card>
                            <h3 className="text-xl font-semibold text-primary mb-4">Aksi Cepat</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                               <QuickAction to="/admin/schedule" icon={<PlusCircle className="text-accent" size={24}/>} label="Booking Baru" />
                               <QuickAction to="/admin/users" icon={<Shield className="text-accent" size={24}/>} label="Kelola Staf" />
                               <QuickAction to="/admin/finance" icon={<Wallet className="text-accent" size={24}/>} label="Lihat Keuangan" />
                            </div>
                        </Card>
                    </motion.div>
                     <motion.div variants={itemVariants}>
                        <Card>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-semibold text-primary flex items-center gap-2"><Lightbulb size={20}/> AI Marketing Insight</h3>
                            </div>
                            {isGeneratingInsight ? (
                                <div className="text-center text-muted p-4 flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Menganalisis data...</div>
                            ) : insightError ? (
                                <p className="text-sm text-error p-4 bg-error/10 rounded-lg">{insightError}</p>
                            ) : (
                                <div className="text-sm text-base-content bg-base-100 p-4 rounded-lg whitespace-pre-wrap">{marketingInsight}</div>
                            )}
                            <button onClick={fetchMarketingInsight} disabled={isGeneratingInsight} className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-content rounded-lg hover:bg-primary/90 transition-colors font-semibold text-sm disabled:opacity-50">
                                {isGeneratingInsight ? <><Loader2 size={16} className="animate-spin" /> Menganalisis...</> : <><Sparkles size={16} /> Generate Insight Baru</>}
                            </button>
                        </Card>
                     </motion.div>
                </motion.div>

                <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
                     <motion.div variants={itemVariants}>
                        <Card>
                             <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-primary">Jadwal Terdekat</h2>
                                <Link to="/admin/schedule" className="text-sm font-medium text-accent hover:underline">Lihat Semua</Link>
                            </div>
                            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
                                {upcomingBookings.length > 0 ? (
                                    upcomingBookings.map(booking => <UpcomingBookingCard key={booking.id} booking={booking} />)
                                ) : (
                                    <p className="text-center text-muted p-4">Tidak ada jadwal terdekat.</p>
                                )}
                            </motion.div>
                        </Card>
                     </motion.div>
                     <motion.div variants={itemVariants}>
                        <Card>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-semibold text-primary flex items-center gap-2"><History size={20}/> Aktivitas Terbaru</h3>
                                <Link to="/admin/activity-log" className="text-sm font-medium text-accent hover:underline">Lihat Semua</Link>
                            </div>
                            <motion.ul variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
                                {recentActivity.map(log => (
                                    <motion.li variants={itemVariants} key={log.id} className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-base-200 flex items-center justify-center flex-shrink-0"><UserCheck size={16} className="text-muted"/></div>
                                        <div>
                                            <p className="text-sm text-base-content leading-tight"><span className="font-semibold">{log.userName}</span> {log.action.toLowerCase()}</p>
                                            <p className="text-xs text-muted">{formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: id })}</p>
                                        </div>
                                    </motion.li>
                                ))}
                            </motion.ul>
                        </Card>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <ChartCard title="Popularitas Paket">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={chartData.packagePopularity} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                        {chartData.packagePopularity.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(value) => `${value} bookings`}/>
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </motion.div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default AdminDashboardPage;
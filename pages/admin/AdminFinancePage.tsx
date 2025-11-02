
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getBookings, getPackages, getExpenses, addExpense, deleteExpense } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Booking, Package, BookingStatus, PaymentHistoryStatus, Expense } from '../../types';
import StatCard from '../../components/admin/StatCard';
import { DollarSign, ArrowUpCircle, ArrowDownCircle, FileText, Filter, X, Download, PlusCircle, Trash2, PieChart, BarChart, Sparkles, Loader2, Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react';
import InvoiceModal from '../../components/admin/InvoiceModal';
import Modal from '../../components/common/Modal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { exportToCSV } from '../../utils/export';
// FIX: Use named imports for date-fns functions
import { format, endOfMonth, endOfWeek, isWithinInterval, parse, startOfMonth, startOfWeek, subDays } from 'date-fns';
import id from 'date-fns/locale/id';
import { ResponsiveContainer, BarChart as RechartsBarChart, LineChart, Line, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart as RechartsPieChart, Pie, Cell, Legend } from 'recharts';
import ChartCard from '../../components/admin/ChartCard';

declare global {
    interface Window {
        jspdf: any;
        html2canvas: any;
    }
}

// --- Type Definitions for AI Forecast ---
interface BudgetRecommendation {
    marketing: number;
    equipment: number;
    maintenance: number;
    savings: number;
    operation: number;
}
interface ForecastResult {
    predictedRevenue: number;
    budgetRecommendation: BudgetRecommendation;
    aiAlert: string;
}


const getPaymentStatus = (booking: Booking): { status: PaymentHistoryStatus, color: string } => {
    switch (booking.bookingStatus) {
        case BookingStatus.Pending:
            return { status: PaymentHistoryStatus.Pending, color: 'bg-yellow-100 text-yellow-800' };
        case BookingStatus.Confirmed:
        case BookingStatus.InProgress:
            return { status: PaymentHistoryStatus.DPPaid, color: 'bg-blue-100 text-blue-800' };
        case BookingStatus.Completed:
            return { status: PaymentHistoryStatus.Completed, color: 'bg-green-100 text-green-800' };
        case BookingStatus.Cancelled:
            return { status: PaymentHistoryStatus.Cancelled, color: 'bg-gray-100 text-gray-800' };
        default:
            return { status: PaymentHistoryStatus.Pending, color: 'bg-gray-100 text-gray-800' };
    }
};

const COLORS = ['#3b82f6', '#16a34a', '#f59e0b', '#dc2626', '#6b7280', '#6366f1'];

const ExpenseModal: React.FC<{isOpen: boolean, onClose: () => void, onAdd: (desc: string, amount: number) => void}> = ({ isOpen, onClose, onAdd }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd(description, parseFloat(amount));
        setDescription('');
        setAmount('');
        onClose();
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Tambah Pengeluaran Baru">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Deskripsi</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} required className="mt-1 w-full p-2 border rounded-md" placeholder="Contoh: Pembelian Properti Foto"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium">Jumlah (Rp)</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required className="mt-1 w-full p-2 border rounded-md" placeholder="500000"/>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-base-200 rounded-md">Batal</button>
                    <button type="submit" className="px-4 py-2 bg-primary text-primary-content rounded-md">Simpan</button>
                </div>
            </form>
        </Modal>
    )
}

const FinancialForecastingSection: React.FC<{ bookings: Booking[] }> = ({ bookings }) => {
    const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const forecastRef = useRef<HTMLDivElement>(null);

    const monthlyRevenueHistory = useMemo(() => {
        const history: { [key: string]: number } = {};
        const completedBookings = bookings.filter(b => b.bookingStatus === BookingStatus.Completed);

        completedBookings.forEach(b => {
            const monthKey = format(new Date(b.bookingDate), 'yyyy-MM');
            history[monthKey] = (history[monthKey] || 0) + b.totalPrice;
        });

        return Object.entries(history)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, revenue]) => ({
                month: format(new Date(`${month}-02`), 'MMM yyyy', { locale: id }),
                revenue,
            }));
    }, [bookings]);

    const handleGenerateForecast = async () => {
        setIsLoading(true);
        setError(null);
        setForecastResult(null);

        if (monthlyRevenueHistory.length < 3) {
            setError("Membutuhkan setidaknya 3 bulan data pendapatan untuk membuat prediksi yang akurat.");
            setIsLoading(false);
            return;
        }

        const historicalData = monthlyRevenueHistory.slice(-6);
        const historicalDataString = historicalData.map(d => `${d.month}: Rp ${d.revenue.toLocaleString('id-ID')}`).join('\n');
        
        try {
             const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generateForecast', historicalDataString }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to generate forecast.');
            }
            
            const result: ForecastResult = await response.json();
            setForecastResult(result);

        } catch (e: any) {
            console.error("AI Forecasting Error:", e);
            setError(e.message || "Gagal menghasilkan prediksi. Mungkin ada masalah dengan koneksi atau layanan AI. Silakan coba lagi.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleExportPdf = async () => {
        if (!forecastRef.current) return;
        const { jsPDF } = window.jspdf;
        const canvas = await window.html2canvas(forecastRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Laporan-Prediksi-Keuangan-Studio8-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    const handleExportCsv = () => {
        if (!forecastResult) return;
        const dataToExport = [
            { Kategori: 'Prediksi Pendapatan', Jumlah: forecastResult.predictedRevenue },
            ...Object.entries(forecastResult.budgetRecommendation).map(([key, value]) => ({
                Kategori: `Anggaran ${key}`,
                Jumlah: value,
            })),
            { Kategori: 'AI Alert', Jumlah: `"${forecastResult.aiAlert}"` }
        ];
        exportToCSV(dataToExport, `Data-Prediksi-Keuangan-Studio8-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    };


    const budgetChartData = forecastResult ? Object.entries(forecastResult.budgetRecommendation).map(([name, value]) => ({ name, value })) : [];
    const projectionChartData = forecastResult ? [
        ...monthlyRevenueHistory.slice(-5),
        { month: 'Bulan Depan', revenue: forecastResult.predictedRevenue }
    ] : [];

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border mt-8">
            <h2 className="text-2xl font-bold text-primary mb-1">🧠 Peramalan Keuangan & Perencanaan Anggaran (AI)</h2>
            <p className="text-muted mb-4">Gunakan AI untuk memprediksi pendapatan, mendapatkan rekomendasi anggaran, dan wawasan strategis.</p>
            
            {!forecastResult && (
                <div className="text-center p-4">
                    <button onClick={handleGenerateForecast} disabled={isLoading} className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-content rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50">
                        {isLoading ? <><Loader2 size={18} className="animate-spin" /> Menganalisis...</> : <><Sparkles size={18} /> Buat Prediksi & Rencana</>}
                    </button>
                    {error && <p className="text-error text-sm mt-4">{error}</p>}
                </div>
            )}

            {forecastResult && (
                 <div className="border-t pt-4">
                     <div className="flex justify-end gap-2 mb-4">
                        <button onClick={handleExportCsv} className="flex items-center gap-2 px-3 py-1.5 bg-success text-white rounded-lg hover:bg-success/90 text-sm font-semibold"><Download size={16}/> Export CSV</button>
                        <button onClick={handleExportPdf} className="flex items-center gap-2 px-3 py-1.5 bg-error text-white rounded-lg hover:bg-error/90 text-sm font-semibold"><Download size={16}/> Export PDF</button>
                    </div>
                    <div ref={forecastRef} className="p-4 bg-base-100 rounded-lg">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                            {/* Card: Predicted Revenue */}
                            <div className="bg-white p-4 rounded-lg shadow border">
                                <p className="text-sm font-medium text-muted">Prediksi Pemasukan Bulan Depan</p>
                                <p className="text-3xl font-bold text-primary mt-1">Rp {forecastResult.predictedRevenue.toLocaleString('id-ID')}</p>
                            </div>
                            {/* Card: Budget Recommendation */}
                            <div className="bg-white p-4 rounded-lg shadow border">
                                <p className="text-sm font-medium text-muted mb-2">Rekomendasi Anggaran</p>
                                <div className="h-32 -mt-4">
                                     <ResponsiveContainer width="100%" height="100%">
                                        <RechartsPieChart>
                                            <Pie data={budgetChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={5}>
                                                {budgetChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip formatter={(value) => `Rp ${Number(value).toLocaleString('id-ID')}`} />
                                        </RechartsPieChart>
                                    </ResponsiveContainer>
                                </div>
                                 <div className="text-xs grid grid-cols-2 gap-x-2">
                                    {budgetChartData.map((d, i) => <div key={i} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></span><span className="capitalize">{d.name}</span></div>)}
                                </div>
                            </div>
                            {/* Card: AI Alert */}
                            <div className="bg-white p-4 rounded-lg shadow border">
                                <p className="text-sm font-medium text-muted flex items-center gap-2"><Lightbulb size={16}/> AI Alert & Insight</p>
                                <p className="text-sm text-base-content mt-2">{forecastResult.aiAlert}</p>
                            </div>
                        </div>
                        {/* Projection Chart */}
                        <ChartCard title="Proyeksi Pendapatan" className="bg-white">
                             <ResponsiveContainer width="100%" height="100%">
                                <RechartsBarChart data={projectionChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" fontSize={12} />
                                    <YAxis fontSize={12} tickFormatter={(value) => `Rp${Number(value) / 1000}k`} />
                                    <Tooltip formatter={(value) => `Rp ${Number(value).toLocaleString('id-ID')}`} />
                                    <Bar dataKey="revenue" name="Pendapatan" radius={[4, 4, 0, 0]}>
                                        {projectionChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === projectionChartData.length - 1 ? 'var(--tw-colors-warning)' : 'var(--tw-colors-accent)'} />
                                        ))}
                                    </Bar>
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </div>
                </div>
            )}
        </div>
    );
};


const AdminFinancePage = () => {
    const { user: currentUser } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [packages, setPackages] = useState<Package[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookingToInvoice, setBookingToInvoice] = useState<Booking | null>(null);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

    const [filterMonth, setFilterMonth] = useState<string>('all');
    const [filterPackage, setFilterPackage] = useState<string>('all');
    
    const fetchData = async () => {
        setLoading(true);
        const [bookingsData, packagesData, expensesData] = await Promise.all([getBookings(), getPackages(), getExpenses()]);
        setBookings(bookingsData);
        setPackages(packagesData);
        setExpenses(expensesData);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const { weeklyIncome, monthlyIncome, monthlyExpenses, monthlyProfit } = useMemo(() => {
        const now = new Date();
        const startOfWeekDate = startOfWeek(now, { weekStartsOn: 1 });
        const endOfWeekDate = endOfWeek(now, { weekStartsOn: 1 });
        const startOfMonthDate = startOfMonth(now);
        const endOfMonthDate = endOfMonth(now);
        
        const completedBookings = bookings.filter(b => b.bookingStatus === BookingStatus.Completed);

        const weekly = completedBookings.filter(b => isWithinInterval(new Date(b.bookingDate), { start: startOfWeekDate, end: endOfWeekDate })).reduce((sum, b) => sum + b.totalPrice, 0);
        const monthlyInc = completedBookings.filter(b => isWithinInterval(new Date(b.bookingDate), { start: startOfMonthDate, end: endOfMonthDate })).reduce((sum, b) => sum + b.totalPrice, 0);
        const monthlyExp = expenses.filter(e => isWithinInterval(new Date(e.date), { start: startOfMonthDate, end: endOfMonthDate })).reduce((sum, e) => sum + e.amount, 0);

        return { weeklyIncome: weekly, monthlyIncome: monthlyInc, monthlyExpenses: monthlyExp, monthlyProfit: monthlyInc - monthlyExp };
    }, [bookings, expenses]);

    const incomeChartData = useMemo(() => {
        const last30Days = Array.from({ length: 30 }, (_, i) => subDays(new Date(), i)).reverse();
        const data = last30Days.map(date => ({
            name: format(date, 'd MMM', { locale: id }),
            Pemasukan: 0,
        }));
        
        bookings.filter(b => b.bookingStatus === 'Completed').forEach(b => {
            const dayIndex = last30Days.findIndex(d => format(d, 'yyyy-MM-dd') === format(new Date(b.bookingDate), 'yyyy-MM-dd'));
            if (dayIndex > -1) {
                data[dayIndex].Pemasukan += b.totalPrice;
            }
        });
        return data;
    }, [bookings]);

    const packageRevenueData = useMemo(() => {
        const revenueMap = new Map<string, number>();
        bookings.filter(b => b.bookingStatus === 'Completed').forEach(b => {
            const name = b.package.name;
            revenueMap.set(name, (revenueMap.get(name) || 0) + b.totalPrice);
        });
        return Array.from(revenueMap.entries()).map(([name, value]) => ({ name, value }));
    }, [bookings]);


    const filteredBookings = useMemo(() => {
        return bookings.filter(booking => {
            const bookingMonth = format(new Date(booking.bookingDate), 'yyyy-MM');
            const monthMatch = filterMonth === 'all' || bookingMonth === filterMonth;
            const packageMatch = filterPackage === 'all' || booking.package.id === filterPackage;
            return monthMatch && packageMatch;
        });
    }, [bookings, filterMonth, filterPackage]);

    const monthOptions = useMemo(() => {
        const months = new Set<string>();
        bookings.forEach(b => months.add(format(new Date(b.bookingDate), 'yyyy-MM')));
        return Array.from(months).sort().reverse();
    }, [bookings]);

    const handleExportInvoices = () => {
        const dataToExport = filteredBookings.map(b => ({
            'Kode Invoice': b.bookingCode, 'Nama Klien': b.clientName, 'Tanggal': format(new Date(b.bookingDate), 'dd-MM-yyyy HH:mm'), 'Paket': `${b.package.name} (${b.selectedSubPackage.name})`, 'Total Harga': b.totalPrice, 'Sisa Bayar': b.remainingBalance, 'Status': getPaymentStatus(b).status
        }));
        exportToCSV(dataToExport, `laporan-invoice-${filterMonth}-${filterPackage}.csv`);
    };
    
    const handleExportExpenses = () => {
        const dataToExport = expenses.map(e => ({
            'Tanggal': format(new Date(e.date), 'dd-MM-yyyy'), 'Deskripsi': e.description, 'Jumlah': e.amount,
        }));
        exportToCSV(dataToExport, 'laporan-pengeluaran.csv');
    };

    const handleAddExpense = async (description: string, amount: number) => {
        if (!currentUser) return;
        await addExpense({ description, amount, addedBy: currentUser.id }, currentUser.id);
        fetchData();
    };

    const handleDeleteExpense = async () => {
        if (!expenseToDelete || !currentUser) return;
        await deleteExpense(expenseToDelete.id, currentUser.id);
        setExpenseToDelete(null);
        fetchData();
    };

    if (loading) return <div>Loading financial data...</div>;

    return (
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Dasbor Keuangan & Analitik</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-6">
                <StatCard title="Pendapatan Minggu Ini" value={`Rp ${weeklyIncome.toLocaleString('id-ID')}`} icon={<div className="p-3 bg-success/10 text-success rounded-full"><DollarSign /></div>} />
                <StatCard title="Pendapatan Bulan Ini" value={`Rp ${monthlyIncome.toLocaleString('id-ID')}`} icon={<div className="p-3 bg-success/10 text-success rounded-full"><ArrowUpCircle /></div>} />
                <StatCard title="Pengeluaran Bulan Ini" value={`Rp ${monthlyExpenses.toLocaleString('id-ID')}`} icon={<div className="p-3 bg-error/10 text-error rounded-full"><ArrowDownCircle /></div>} />
                <StatCard title="Laba Bulan Ini" value={`Rp ${monthlyProfit.toLocaleString('id-ID')}`} icon={<div className="p-3 bg-indigo-100 text-indigo-600 rounded-full"><PieChart /></div>} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
                <ChartCard title="Tren Pendapatan (30 Hari Terakhir)" className="lg:col-span-3">
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={incomeChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rp${Number(value) / 1000}k`} />
                            <Tooltip formatter={(value) => [`Rp ${Number(value).toLocaleString('id-ID')}`, "Pemasukan"]}/>
                            <Bar dataKey="Pemasukan" fill="var(--tw-colors-accent)" radius={[4, 4, 0, 0]} />
                        </RechartsBarChart>
                    </ResponsiveContainer>
                </ChartCard>
                 <ChartCard title="Komposisi Pendapatan by Paket" className="lg:col-span-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                            <Pie data={packageRevenueData} cx="50%" cy="50%" labelLine={false} outerRadius={80} dataKey="value" nameKey="name">
                                {packageRevenueData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => `Rp ${Number(value).toLocaleString('id-ID')}`}/>
                            <Legend iconSize={10} />
                        </RechartsPieChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            <FinancialForecastingSection bookings={bookings} />
            
            <div className="bg-white p-6 rounded-lg shadow-md border my-6">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Manajemen Pengeluaran</h2>
                    <div className="flex gap-2">
                         <button onClick={handleExportExpenses} className="flex items-center gap-2 px-3 py-1.5 bg-base-200 text-base-content rounded-lg hover:bg-base-300 transition-colors text-sm font-semibold">
                            <Download size={16}/> Export
                        </button>
                        <button onClick={() => setIsExpenseModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-content rounded-lg hover:bg-primary/90 transition-colors text-sm font-semibold">
                            <PlusCircle size={16}/> Tambah Pengeluaran
                        </button>
                    </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                    <table className="min-w-full">
                        <thead className="bg-base-100 sticky top-0"><tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold">Tanggal</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold">Deskripsi</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold">Jumlah</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold">Aksi</th>
                        </tr></thead>
                        <tbody>
                            {expenses.map(e => (
                                <tr key={e.id} className="border-b">
                                    <td className="px-4 py-2 text-sm">{format(new Date(e.date), 'dd MMM yyyy', { locale: id })}</td>
                                    <td className="px-4 py-2 text-sm">{e.description}</td>
                                    <td className="px-4 py-2 text-sm text-right font-semibold">Rp {e.amount.toLocaleString('id-ID')}</td>
                                    <td className="px-4 py-2 text-center">
                                        <button onClick={() => setExpenseToDelete(e)} className="p-1 text-muted hover:text-error"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {expenses.length === 0 && <p className="text-center text-muted p-4">Belum ada pengeluaran tercatat.</p>}
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md border mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-muted"/>
                        <span className="font-semibold text-sm">Filter Invoice:</span>
                    </div>
                    <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="p-2 border rounded-md text-sm bg-base-100">
                        <option value="all">Semua Bulan</option>
                        {monthOptions.map(month => (
                            <option key={month} value={month}>{format(new Date(month + '-02'), 'MMMM yyyy', { locale: id})}</option>
                        ))}
                    </select>
                    <select value={filterPackage} onChange={e => setFilterPackage(e.target.value)} className="p-2 border rounded-md text-sm bg-base-100">
                        <option value="all">Semua Paket</option>
                        {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button onClick={() => { setFilterMonth('all'); setFilterPackage('all'); }} className="p-2 text-muted hover:text-base-content">
                        <X size={18}/>
                    </button>
                    <div className="flex-grow"></div>
                    <button onClick={handleExportInvoices} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-content rounded-lg hover:bg-primary/90 transition-colors text-sm font-semibold">
                        <Download size={16}/>
                        Export Invoice
                    </button>
                </div>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-base-100">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">Invoice</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">Klien</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">Tanggal</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-muted uppercase">Total</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-muted uppercase">Status</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-muted uppercase">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-base-200">
                        {filteredBookings.map(b => {
                            const paymentInfo = getPaymentStatus(b);
                            return (
                                <tr key={b.id} className="hover:bg-base-100/50">
                                    <td className="px-6 py-4 text-sm font-mono text-accent">{b.bookingCode}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-base-content">{b.clientName}</td>
                                    <td className="px-6 py-4 text-sm text-muted">{format(new Date(b.bookingDate), 'dd MMM yyyy')}</td>
                                    <td className="px-6 py-4 text-sm font-semibold text-right text-base-content">Rp {b.totalPrice.toLocaleString('id-ID')}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${paymentInfo.color}`}>
                                            {paymentInfo.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                       <button 
                                            onClick={() => setBookingToInvoice(b)}
                                            className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 disabled:opacity-50"
                                            disabled={paymentInfo.status === PaymentHistoryStatus.Pending || paymentInfo.status === PaymentHistoryStatus.Cancelled}
                                       >
                                           Lihat Invoice
                                       </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                 {filteredBookings.length === 0 && <p className="text-center text-muted p-8">Tidak ada data yang cocok dengan filter Anda.</p>}
            </div>

            <InvoiceModal
                isOpen={!!bookingToInvoice}
                onClose={() => setBookingToInvoice(null)}
                booking={bookingToInvoice}
            />
            <ExpenseModal
                isOpen={isExpenseModalOpen}
                onClose={() => setIsExpenseModalOpen(false)}
                onAdd={handleAddExpense}
            />
            <ConfirmationModal
                isOpen={!!expenseToDelete}
                onClose={() => setExpenseToDelete(null)}
                onConfirm={handleDeleteExpense}
                title="Hapus Pengeluaran"
                message={`Anda yakin ingin menghapus pengeluaran "${expenseToDelete?.description}"?`}
            />
        </div>
    );
};

export default AdminFinancePage;
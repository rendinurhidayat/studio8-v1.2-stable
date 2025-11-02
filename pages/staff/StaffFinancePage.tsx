
import React, { useState, useEffect, useMemo } from 'react';
import { getFinancialData } from '../../services/api';
import { Transaction, TransactionType } from '../../types';
import StatCard from '../../components/admin/StatCard';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

const StaffFinancePage = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTransactions = async () => {
            setLoading(true);
            const data = await getFinancialData();
            setTransactions(data);
            setLoading(false);
        };
        fetchTransactions();
    }, []);

    const { monthlyIncome, monthlyExpense } = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const monthlyTransactions = transactions.filter(t => new Date(t.date) >= startOfMonth);
        
        const income = monthlyTransactions.filter(t => t.type === TransactionType.Income).reduce((acc, t) => acc + t.amount, 0);
        const expense = monthlyTransactions.filter(t => t.type === TransactionType.Expense).reduce((acc, t) => acc + t.amount, 0);

        return { monthlyIncome: income, monthlyExpense: expense };
    }, [transactions]);
    
    if (loading) return <div className="text-center p-8 text-slate-500">Memuat data keuangan...</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Ringkasan Keuangan</h1>
            <p className="text-slate-600 mb-8 -mt-4">Menampilkan ringkasan pemasukan dan pengeluaran untuk bulan ini. Data bersifat read-only.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard 
                    title="Total Pemasukan Bulan Ini" 
                    value={`Rp ${monthlyIncome.toLocaleString('id-ID')}`} 
                    icon={<div className="p-3 bg-green-100 text-green-600 rounded-full"><ArrowUpCircle /></div>} 
                />
                <StatCard 
                    title="Total Pengeluaran Bulan Ini" 
                    value={`Rp ${monthlyExpense.toLocaleString('id-ID')}`} 
                    icon={<div className="p-3 bg-red-100 text-red-600 rounded-full"><ArrowDownCircle /></div>} 
                />
            </div>
             <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <p className="text-sm text-blue-800">
                    Halaman ini hanya menampilkan ringkasan. Untuk detail transaksi dan manajemen keuangan, silakan hubungi admin.
                </p>
            </div>
        </div>
    );
};

export default StaffFinancePage;
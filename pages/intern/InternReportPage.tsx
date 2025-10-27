import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { getTodaysReport, submitDailyReport, updateUserPoints } from '../../services/api';
import { DailyReport, InternMood, UserRole } from '../../types';
import { ClipboardList, Send, Loader2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const InternReportPage = () => {
    const { user } = useAuth();
    const { addNotification } = useNotifications();
    const [report, setReport] = useState<DailyReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const [content, setContent] = useState('');
    const [mood, setMood] = useState<InternMood>(InternMood.Netral);
    const [blockers, setBlockers] = useState('');

    useEffect(() => {
        const fetchReport = async () => {
            if (!user) return;
            setLoading(true);
            const repData = await getTodaysReport(user.id);
            setReport(repData);
            setLoading(false);
        };
        fetchReport();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !content.trim()) return;
        
        setActionLoading(true);
        try {
            const newReport = await submitDailyReport({
                userId: user.id,
                content,
                mood,
                blockers: blockers || undefined,
            });
            setReport(newReport);
            addNotification({
                recipient: UserRole.AnakMagang,
                type: 'success',
                message: 'Laporan harian berhasil dikirim!',
            });

            // Gamification: Add points for on-time report
            const submissionTime = new Date();
            if (submissionTime.getHours() < 21) {
                await updateUserPoints(user.id, 5);
            }

            // Fire-and-forget call to the analysis API
            fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'analyzeInternReport', userId: user.id, reportContent: content }),
            }).catch(error => {
                // Log error but don't block UI
                console.error("Failed to trigger AI analysis:", error);
            });

        } catch (error) {
            console.error('Failed to submit report:', error);
             addNotification({
                recipient: UserRole.AnakMagang,
                type: 'warning',
                message: 'Gagal mengirim laporan. Coba lagi.',
            });
        } finally {
            setActionLoading(false);
        }
    };

    const hasSubmitted = !!report;

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-accent/10 rounded-lg text-accent">
                    <ClipboardList size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-primary">Laporan Harian</h1>
                    <p className="text-muted mt-1">Ceritakan progres dan kegiatanmu hari ini.</p>
                </div>
            </div>
            
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-2xl mx-auto bg-white border border-base-200/50 rounded-2xl p-8 shadow-lg"
            >
                {loading ? (
                    <div className="text-center"><Loader2 className="animate-spin text-primary mx-auto" size={32} /></div>
                ) : hasSubmitted ? (
                     <div className="text-center space-y-4">
                        <CheckCircle size={48} className="text-success mx-auto" />
                        <h2 className="text-xl font-bold text-primary">Laporan Hari Ini Terkirim!</h2>
                        <p className="text-muted">Terima kasih telah melaporkan aktivitasmu. Sampai jumpa besok!</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="content" className="block text-sm font-semibold text-base-content mb-2">Kegiatan Hari Ini</label>
                            <textarea id="content" value={content} onChange={e => setContent(e.target.value)} required rows={6} placeholder="Contoh: Mengedit 50 foto untuk klien, membantu persiapan sesi foto grup, dll." className="w-full p-3 bg-base-100 border border-base-300 rounded-xl text-sm text-base-content focus:ring-2 focus:ring-accent focus:outline-none"></textarea>
                        </div>
                        <div>
                             <label htmlFor="mood" className="block text-sm font-semibold text-base-content mb-2">Mood Hari Ini</label>
                             <select id="mood" value={mood} onChange={e => setMood(e.target.value as InternMood)} className="w-full p-3 bg-base-100 border border-base-300 rounded-xl text-sm text-base-content focus:ring-2 focus:ring-accent focus:outline-none">
                                <option value={InternMood.Baik}>😊 Baik</option>
                                <option value={InternMood.Netral}>😐 Netral</option>
                                <option value={InternMood.Lelah}>😩 Lelah</option>
                             </select>
                        </div>
                         <div>
                            <label htmlFor="blockers" className="block text-sm font-semibold text-base-content mb-2">Kendala (Opsional)</label>
                            <textarea id="blockers" value={blockers} onChange={e => setBlockers(e.target.value)} rows={3} placeholder="Apakah ada kesulitan yang kamu hadapi hari ini?" className="w-full p-3 bg-base-100 border border-base-300 rounded-xl text-sm text-base-content focus:ring-2 focus:ring-accent focus:outline-none"></textarea>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={actionLoading || !content.trim()}
                            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-transparent text-md font-semibold rounded-xl text-accent-content bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 transition-colors"
                        >
                            {actionLoading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                            Kirim Laporan
                        </motion.button>
                    </form>
                )}
            </motion.div>
        </div>
    );
};

export default InternReportPage;
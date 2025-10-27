import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getUsers, getAttendanceForUser, getDailyReportsForUser, getTasksForUser, getMentorFeedbackForIntern, saveInternReport, getInternReports } from '../../services/api';
import { User, UserRole, Task, MentorFeedback, AttendanceStatus, InternReport } from '../../types';
import { Loader2, FileText, Download, Briefcase } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { format } from 'date-fns';
import id from 'date-fns/locale/id';

// jsPDF is loaded from a script tag, so we declare it for TypeScript
declare global {
    interface Window {
        jspdf: any;
    }
}

interface ReportData {
    totalAttendance: number;
    totalReports: number;
    tasksCompleted: number;
    avgRating: number;
}

const StaffReportPage = () => {
    const { user: currentUser } = useAuth();
    const [interns, setInterns] = useState<User[]>([]);
    const [selectedInternId, setSelectedInternId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pastReports, setPastReports] = useState<InternReport[]>([]);

    useEffect(() => {
        const fetchInterns = async () => {
            setLoading(true);
            const allUsers = await getUsers();
            setInterns(allUsers.filter(u => u.role === UserRole.AnakMagang || u.role === UserRole.AnakPKL));
            setLoading(false);
        };
        fetchInterns();
    }, []);

    useEffect(() => {
        if (selectedInternId) {
            const fetchPastReports = async () => {
                const reports = await getInternReports(selectedInternId);
                setPastReports(reports);
            };
            fetchPastReports();
        } else {
            setPastReports([]);
        }
    }, [selectedInternId]);

    const handleGenerateClick = async () => {
        if (!selectedInternId) return;
        setIsGenerating(true);

        const intern = interns.find(i => i.id === selectedInternId);
        if (!intern) return;

        const [attendance, reports, tasks, feedback] = await Promise.all([
            getAttendanceForUser(intern.id),
            getDailyReportsForUser(intern.id),
            getTasksForUser(intern.id),
            getMentorFeedbackForIntern(intern.id),
        ]);

        const totalAttendance = attendance.filter(a => a.status === AttendanceStatus.Present).length;
        const totalReports = reports.length;
        const tasksCompleted = tasks.filter(t => t.completed).length;
        const avgRating = feedback.length > 0 ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length : 0;

        setReportData({
            totalAttendance,
            totalReports,
            tasksCompleted,
            avgRating,
        });
        setIsGenerating(false);
        setIsModalOpen(true);
    };

    const getInternLevel = (points: number): string => {
        if (points > 150) return 'Mentor Ready';
        if (points > 50) return 'Contributor';
        return 'Rookie';
    };

    const handleDownloadAndSave = async () => {
        if (!reportData || !selectedInternId || !currentUser) return;
        setIsGenerating(true);
        const intern = interns.find(i => i.id === selectedInternId);
        if (!intern) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor('#0a1a2f');
        doc.text("Laporan Progres PKL/Magang", 105, 22, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor('#6b7280');
        doc.text("Studio 8", 105, 30, { align: 'center' });
        
        const { autoTable } = doc;
        autoTable({
            startY: 40,
            head: [['Kategori', 'Detail']],
            body: [
                ['Nama', intern.name],
                ['Jurusan', intern.jurusan || 'N/A'],
                ['Asal Sekolah', intern.asalSekolah || 'N/A'],
                ['Mentor', currentUser.name],
                ['Periode', `${intern.startDate ? format(intern.startDate, 'd MMMM yyyy', {locale: id}) : 'N/A'} - ${intern.endDate ? format(intern.endDate, 'd MMMM yyyy', {locale: id}) : 'N/A'}`],
            ],
            theme: 'grid',
            headStyles: { fillColor: '#0a1a2f' }
        });

        autoTable({
            startY: doc.previousAutoTable.finalY + 15,
            head: [['Indikator Kinerja', 'Hasil']],
            body: [
                ['Total Hari Hadir', reportData.totalAttendance.toString()],
                ['Jumlah Laporan Harian', reportData.totalReports.toString()],
                ['Jumlah Tugas Selesai', reportData.tasksCompleted.toString()],
                ['Rata-rata Rating Mentor', `${reportData.avgRating.toFixed(1)} / 5`],
                ['Total Poin', (intern.totalPoints || 0).toString()],
                ['Level Saat Ini', getInternLevel(intern.totalPoints || 0)],
            ],
            theme: 'striped',
            headStyles: { fillColor: '#3b82f6' }
        });
        
        doc.setFontSize(10);
        doc.setTextColor('#6b7280');
        doc.text(`Laporan dibuat pada: ${format(new Date(), 'd MMMM yyyy, HH:mm', { locale: id })}`, 14, doc.internal.pageSize.height - 10);

        const fileName = `Laporan_${intern.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        doc.save(fileName);
        
        const pdfBlob = doc.output('blob');
        try {
            await saveInternReport(intern.id, pdfBlob, currentUser.name);
            const reports = await getInternReports(selectedInternId);
            setPastReports(reports);
        } catch (error) {
            console.error("Failed to save report to server:", error);
            alert("Gagal menyimpan laporan ke server. File telah diunduh secara lokal.");
        }
        
        setIsGenerating(false);
        setIsModalOpen(false);
    };

    const selectedIntern = interns.find(i => i.id === selectedInternId);

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-primary/10 rounded-lg text-primary">
                    <Briefcase size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-primary">Generator Laporan PKL</h1>
                    <p className="text-muted mt-1">Buat laporan progres PDF untuk anak magang.</p>
                </div>
            </div>

             <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg border">
                <h2 className="text-xl font-bold text-center mb-6 text-primary">Pilih Intern</h2>
                {loading ? <Loader2 className="animate-spin mx-auto text-primary" /> : (
                    <div className="space-y-4">
                        <div>
                            <select value={selectedInternId} onChange={e => setSelectedInternId(e.target.value)} className="w-full p-3 border rounded-lg bg-base-100 text-base-content focus:ring-2 focus:ring-accent">
                                <option value="" disabled>-- Pilih nama intern --</option>
                                {interns.map(i => <option key={i.id} value={i.id}>{i.name} ({i.jurusan})</option>)}
                            </select>
                        </div>
                        <button onClick={handleGenerateClick} disabled={!selectedInternId || isGenerating} className="w-full flex justify-center items-center gap-2 p-3 bg-primary text-primary-content font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
                            {isGenerating ? <Loader2 className="animate-spin" /> : <><FileText size={18}/> Generate Laporan</>}
                        </button>
                    </div>
                )}
            </div>

            {selectedInternId && (
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg border mt-8">
                    <h3 className="text-lg font-bold mb-4 text-primary">Riwayat Laporan untuk {selectedIntern?.name}</h3>
                    {pastReports.length > 0 ? (
                        <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {pastReports.map(report => (
                                <li key={report.id} className="flex justify-between items-center p-3 bg-base-100 rounded-lg">
                                    <div>
                                        <p className="font-semibold text-sm">{report.fileName}</p>
                                        <p className="text-xs text-muted">Dibuat: {format(report.generatedAt, 'd MMM yyyy, HH:mm')}</p>
                                    </div>
                                    <a href={report.downloadUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors" title="Download Laporan">
                                        <Download size={18} />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-muted text-sm py-4">Belum ada laporan yang dibuat.</p>
                    )}
                </div>
            )}
            
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Pratinjau Laporan untuk ${selectedIntern?.name}`}>
                {reportData && selectedIntern && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="bg-base-100 p-3 rounded-lg"><p className="font-bold text-2xl text-primary">{reportData.totalAttendance}</p><p className="text-xs text-muted">Hari Hadir</p></div>
                            <div className="bg-base-100 p-3 rounded-lg"><p className="font-bold text-2xl text-primary">{reportData.totalReports}</p><p className="text-xs text-muted">Laporan Harian</p></div>
                            <div className="bg-base-100 p-3 rounded-lg"><p className="font-bold text-2xl text-primary">{reportData.tasksCompleted}</p><p className="text-xs text-muted">Tugas Selesai</p></div>
                            <div className="bg-base-100 p-3 rounded-lg"><p className="font-bold text-2xl text-primary">{reportData.avgRating.toFixed(1)}</p><p className="text-xs text-muted">Avg. Rating</p></div>
                        </div>
                         <div className="bg-accent/10 border-l-4 border-accent p-3">
                            <p className="text-sm text-accent/90">
                                Laporan akan dibuat dalam format PDF, diunduh ke perangkat Anda, dan disimpan di riwayat laporan intern.
                            </p>
                        </div>
                        <button onClick={handleDownloadAndSave} disabled={isGenerating} className="w-full flex justify-center items-center gap-2 p-3 bg-accent text-accent-content font-semibold rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors">
                            {isGenerating ? <Loader2 className="animate-spin" /> : <><Download size={18}/> Download PDF & Simpan</>}
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default StaffReportPage;
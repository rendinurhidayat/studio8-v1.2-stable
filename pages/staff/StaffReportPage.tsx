import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getUsers, getAttendanceForUser, getDailyReportsForUser, getTasksForUser, getMentorFeedbackForIntern, saveInternReport, getInternReports } from '../../services/api';
import { User, UserRole, Task, MentorFeedback, AttendanceStatus, InternReport } from '../../types';
import { Loader2, FileText, Download, Briefcase } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { format } from 'date-fns';
import id from 'date-fns/locale/id';

// jsPDF & html2canvas dimuat dari tag script, jadi kita deklarasikan untuk TypeScript
declare global {
    interface Window {
        jspdf: any;
        html2canvas: any;
    }
}

interface ReportData {
    totalAttendance: number;
    totalReports: number;
    tasksCompleted: number;
    avgRating: number;
}

const ReportPreviewModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onDownloadAndSave: (pdfBlob: Blob) => void;
    isSaving: boolean;
    intern: User | null;
    reportData: ReportData | null;
}> = ({ isOpen, onClose, onDownloadAndSave, isSaving, intern, reportData }) => {
    const reportContentRef = useRef<HTMLDivElement>(null);

    const handleDownload = async () => {
        if (!reportContentRef.current) return;
        
        const { jsPDF } = window.jspdf;
        const canvas = await window.html2canvas(reportContentRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        // Simpan sebagai blob untuk diunggah
        const pdfBlob = pdf.output('blob');
        onDownloadAndSave(pdfBlob);

        // Unduh di sisi klien
        pdf.save(`Laporan_${intern?.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    if (!intern || !reportData) return null;
    
    const getInternLevel = (points: number): string => {
        if (points > 150) return 'Mentor Ready';
        if (points > 50) return 'Contributor';
        return 'Rookie';
    };


    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Pratinjau Laporan untuk ${intern.name}`}>
            <div className="max-h-[60vh] overflow-y-auto pr-2 bg-gray-50 p-4">
                <div ref={reportContentRef} className="bg-white p-8">
                    {/* Header */}
                    <div className="text-center border-b pb-4">
                        <h1 className="text-2xl font-bold text-primary">Laporan Progres PKL/Magang</h1>
                        <p className="text-muted">Studio 8</p>
                    </div>

                    {/* Intern Details */}
                    <div className="grid grid-cols-2 gap-4 my-6 text-sm">
                        <div>
                            <p className="font-bold">Nama:</p><p>{intern.name}</p>
                            <p className="font-bold mt-2">Jurusan:</p><p>{intern.jurusan || 'N/A'}</p>
                            <p className="font-bold mt-2">Asal Sekolah:</p><p>{intern.asalSekolah || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                             <p className="font-bold">Periode:</p><p>{`${intern.startDate ? format(intern.startDate, 'd MMM yyyy', {locale: id}) : 'N/A'} - ${intern.endDate ? format(intern.endDate, 'd MMM yyyy', {locale: id}) : 'N/A'}`}</p>
                             <p className="font-bold mt-2">Tanggal Laporan:</p><p>{format(new Date(), 'd MMMM yyyy', { locale: id })}</p>
                        </div>
                    </div>

                    {/* Performance Metrics */}
                    <h2 className="font-bold text-lg text-primary mb-2">Ringkasan Kinerja</h2>
                    <table className="w-full text-sm border">
                        <thead className="bg-base-100">
                            <tr>
                                <th className="p-2 text-left border">Indikator</th>
                                <th className="p-2 text-left border">Hasil</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td className="p-2 border">Total Hari Hadir</td><td className="p-2 border font-semibold">{reportData.totalAttendance} hari</td></tr>
                            <tr><td className="p-2 border">Jumlah Laporan Harian</td><td className="p-2 border font-semibold">{reportData.totalReports} laporan</td></tr>
                            <tr><td className="p-2 border">Jumlah Tugas Selesai</td><td className="p-2 border font-semibold">{reportData.tasksCompleted} tugas</td></tr>
                            <tr><td className="p-2 border">Rata-rata Rating Mentor</td><td className="p-2 border font-semibold">{reportData.avgRating.toFixed(1)} / 5</td></tr>
                            <tr><td className="p-2 border">Total Poin</td><td className="p-2 border font-semibold">{intern.totalPoints || 0} poin</td></tr>
                            <tr><td className="p-2 border">Level Saat Ini</td><td className="p-2 border font-semibold">{getInternLevel(intern.totalPoints || 0)}</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
             <div className="mt-6 flex justify-end">
                <button onClick={handleDownload} disabled={isSaving} className="w-full flex justify-center items-center gap-2 p-3 bg-accent text-accent-content font-semibold rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors">
                    {isSaving ? <Loader2 className="animate-spin" /> : <><Download size={18}/> Download & Simpan ke Riwayat</>}
                </button>
            </div>
        </Modal>
    );
};

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
    
    const handleDownloadAndSave = async (pdfBlob: Blob) => {
        if (!selectedInternId || !currentUser) return;
        setIsGenerating(true);
        const intern = interns.find(i => i.id === selectedInternId);
        if (!intern) return;

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
                            {isGenerating ? <Loader2 className="animate-spin" /> : <><FileText size={18}/> Generate Pratinjau Laporan</>}
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
            
           <ReportPreviewModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onDownloadAndSave={handleDownloadAndSave}
                isSaving={isGenerating}
                intern={selectedIntern || null}
                reportData={reportData}
           />
        </div>
    );
};

export default StaffReportPage;




import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getUsers, getInternReports, generateInternReportContent, getAttendanceForUser, getTasksForUser, getDailyReportsForUser } from '../../services/api';
import { User, UserRole, InternReport, Attendance, Task, DailyReport } from '../../types';
import { Loader2, FileText, Download, Briefcase, Sparkles, Copy } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { format } from 'date-fns';
import id from 'date-fns/locale/id';

const GeneratedReportModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    content: string;
    isGenerating: boolean;
}> = ({ isOpen, onClose, content, isGenerating }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Draf Laporan Progres (AI)">
            {isGenerating ? (
                <div className="text-center p-8">
                    <Loader2 className="animate-spin text-primary mx-auto mb-4" size={32} />
                    <p className="text-muted">AI sedang merangkum dan membuat laporan...</p>
                </div>
            ) : (
                <>
                    <div className="max-h-[60vh] overflow-y-auto pr-2 bg-gray-50 p-4 rounded-lg border">
                        <pre className="whitespace-pre-wrap text-sm font-sans">{content}</pre>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                            <Copy size={16} /> {isCopied ? 'Tersalin!' : 'Salin Teks'}
                        </button>
                    </div>
                </>
            )}
        </Modal>
    );
};


const StaffReportPage = () => {
    const { user: currentUser } = useAuth();
    const [interns, setInterns] = useState<User[]>([]);
    const [selectedInternId, setSelectedInternId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [generatedContent, setGeneratedContent] = useState('');
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
    
    const handleGenerateReport = async () => {
        if (!selectedInternId || !currentUser) return;

        setIsGenerating(true);
        setIsModalOpen(true);
        setGeneratedContent('');

        try {
            const intern = interns.find(i => i.id === selectedInternId);
            if (!intern) throw new Error("Intern not found");

            const [attendance, tasks, dailyReports] = await Promise.all([
                getAttendanceForUser(intern.id),
                getTasksForUser(intern.id),
                getDailyReportsForUser(intern.id),
            ]);
            
            // Summarize data for the AI
            const attendanceSummary = `Total ${attendance.length} hari hadir.`;
            const tasksSummary = tasks.length > 0 ? `${tasks.filter(t => t.completed).length} dari ${tasks.length} tugas khusus telah diselesaikan.` : "Tidak ada tugas khusus yang diberikan.";
            const reportsSummary = dailyReports.length > 0 ? `Telah mengirim ${dailyReports.length} laporan harian. Secara umum menunjukkan mood yang ${dailyReports[0]?.mood || 'netral'}.` : "Belum ada laporan harian yang dikirim.";
            
            const period = intern.startDate && intern.endDate ? `${format(new Date(intern.startDate), 'd MMM yyyy', { locale: id })} - ${format(new Date(intern.endDate), 'd MMM yyyy', { locale: id })}` : 'N/A';

            const content = await generateInternReportContent({
                internName: intern.name,
                period: period,
                attendanceSummary,
                tasksSummary,
                reportsSummary,
            });
            
            setGeneratedContent(content);

        } catch (error) {
            console.error("Failed to generate report:", error);
            setGeneratedContent("Gagal membuat laporan. Silakan coba lagi.");
        } finally {
            setIsGenerating(false);
        }
    };
    
    const selectedIntern = interns.find(i => i.id === selectedInternId);

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-primary/10 rounded-lg text-primary">
                    <Briefcase size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-primary">Laporan Progres PKL</h1>
                    <p className="text-muted mt-1">Buat rangkuman laporan progres untuk anak magang menggunakan AI.</p>
                </div>
            </div>

             <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg border">
                <h2 className="text-xl font-bold text-center mb-6 text-primary">Pilih Intern</h2>
                {loading ? <Loader2 className="animate-spin mx-auto text-primary" /> : (
                    <div className="space-y-4">
                        <div>
                            <select 
                                value={selectedInternId} 
                                onChange={e => { setSelectedInternId(e.target.value); setPastReports([]); }} 
                                className="w-full p-3 border rounded-lg bg-base-100 text-base-content focus:ring-2 focus:ring-accent"
                            >
                                <option value="" disabled>-- Pilih nama intern --</option>
                                {interns.map(i => <option key={i.id} value={i.id}>{i.name} ({i.jurusan})</option>)}
                            </select>
                        </div>
                        <button onClick={handleGenerateReport} disabled={!selectedInternId || isGenerating} className="w-full flex justify-center items-center gap-2 p-3 bg-primary text-primary-content font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
                            {isGenerating ? <Loader2 className="animate-spin" /> : <><Sparkles size={18}/> Generate Laporan (AI)</>}
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
                                        <p className="text-xs text-muted">Dibuat: {format(new Date(report.generatedAt), 'd MMM yyyy, HH:mm')}</p>
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
            
           <GeneratedReportModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                content={generatedContent}
                isGenerating={isGenerating}
           />
        </div>
    );
};

export default StaffReportPage;

import React, { useState, useEffect, useMemo } from 'react';
import { getFeedbacks, updateFeedback, deleteFeedback } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Feedback, FeedbackAnalysis } from '../../types';
import StarRating from '../../components/feedback/StarRating';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { Trash2, Eye, EyeOff, Download, Filter, X, Sparkles, Loader2, Bot, Lightbulb, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';
import Modal from '../../components/common/Modal';

const FeedbackAnalysisModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    isAnalyzing: boolean;
    analysisResult: FeedbackAnalysis | null;
    error: string | null;
}> = ({ isOpen, onClose, isAnalyzing, analysisResult, error }) => {

    const renderContent = () => {
        if (isAnalyzing) {
            return (
                <div className="text-center p-8">
                    <Loader2 className="animate-spin text-primary mx-auto mb-4" size={48} />
                    <p className="text-muted">AI sedang menganalisis ulasan... Mohon tunggu sebentar.</p>
                </div>
            );
        }
        if (error) {
            return (
                <div className="text-center p-8 bg-error/10 rounded-lg">
                    <AlertCircle className="text-error mx-auto mb-4" size={48} />
                    <h3 className="font-bold text-error">Analisis Gagal</h3>
                    <p className="text-sm text-error/80 mt-2">{error}</p>
                </div>
            );
        }
        if (analysisResult) {
            return (
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 text-sm">
                    <div className="bg-primary/5 p-4 rounded-lg">
                        <h4 className="font-bold text-primary flex items-center gap-2"><Bot size={18}/> Sentimen Keseluruhan</h4>
                        <p className="mt-1 text-base-content">{analysisResult.overallSentiment}</p>
                    </div>
                     <div>
                        <h4 className="font-bold text-success flex items-center gap-2"><ThumbsUp size={18}/> Poin Positif Utama</h4>
                        <ul className="list-disc list-inside space-y-1 mt-2 pl-2 text-base-content">
                            {analysisResult.positivePoints.map((point, i) => <li key={i}>{point}</li>)}
                        </ul>
                    </div>
                     <div>
                        <h4 className="font-bold text-warning flex items-center gap-2"><ThumbsDown size={18}/> Area untuk Peningkatan</h4>
                         <ul className="list-disc list-inside space-y-1 mt-2 pl-2 text-base-content">
                            {analysisResult.areasForImprovement.map((point, i) => <li key={i}>{point}</li>)}
                        </ul>
                    </div>
                     <div>
                        <h4 className="font-bold text-accent flex items-center gap-2"><Lightbulb size={18}/> Saran & Tindak Lanjut</h4>
                         <ul className="list-disc list-inside space-y-1 mt-2 pl-2 text-base-content">
                            {analysisResult.actionableSuggestions.map((point, i) => <li key={i}>{point}</li>)}
                        </ul>
                    </div>
                </div>
            );
        }
        return null;
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Hasil Analisis Feedback AI">
            {renderContent()}
        </Modal>
    );
};

const AdminFeedbackPage: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterRating, setFilterRating] = useState<number>(0);
    const [feedbackToDelete, setFeedbackToDelete] = useState<Feedback | null>(null);

    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<FeedbackAnalysis | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    const fetchFeedbacks = async () => {
        setLoading(true);
        const data = await getFeedbacks();
        setFeedbacks(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchFeedbacks();
    }, []);

    const handleAnalyzeFeedback = async () => {
        if (feedbacks.length === 0) return;
        setIsAnalysisModalOpen(true);
        setIsAnalyzing(true);
        setAnalysisResult(null);
        setAnalysisError(null);

        try {
            const feedbackText = feedbacks.map((fb, i) => `${i + 1}. Rating: ${fb.rating}/5. Komentar: "${fb.komentar}"`).join('\n');
            
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'analyzeFeedback', feedbackText }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to analyze feedback.');
            }

            const resultJson: FeedbackAnalysis = await response.json();
            setAnalysisResult(resultJson);

        } catch (error: any) {
            console.error("AI Analysis Error:", error);
            setAnalysisError(error.message || "Gagal menghubungi layanan AI. Periksa konsol untuk detailnya atau coba lagi nanti.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleTogglePublish = async (feedback: Feedback) => {
        if (!currentUser) return;
        await updateFeedback(feedback.id, { publish: !feedback.publish }, currentUser.id);
        fetchFeedbacks(); // Re-fetch to update the list
    };
    
    const handleDeleteClick = (feedback: Feedback) => {
        setFeedbackToDelete(feedback);
    };

    const handleDeleteConfirm = async () => {
        if (feedbackToDelete && currentUser) {
            await deleteFeedback(feedbackToDelete.id, currentUser.id);
            setFeedbackToDelete(null);
            fetchFeedbacks(); // Re-fetch
        }
    };
    
    const handleExport = () => {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(feedbacks, null, 2)
        )}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `studio8-feedbacks-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    };

    const filteredFeedbacks = useMemo(() => {
        if (filterRating === 0) {
            return feedbacks;
        }
        return feedbacks.filter(fb => fb.rating === filterRating);
    }, [feedbacks, filterRating]);
    
    return (
        <div>
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-[#0a1d37]">Ulasan Klien</h1>
                <div className="flex items-center gap-2">
                    <div className="relative">
                         <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"/>
                        <select
                            value={filterRating}
                            onChange={e => setFilterRating(Number(e.target.value))}
                            className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0a1d37]"
                        >
                            <option value={0}>Semua Rating</option>
                            <option value={5}>⭐⭐⭐⭐⭐ (5)</option>
                            <option value={4}>⭐⭐⭐⭐ (4)</option>
                            <option value={3}>⭐⭐⭐ (3)</option>
                            <option value={2}>⭐⭐ (2)</option>
                            <option value={1}>⭐ (1)</option>
                        </select>
                         {filterRating > 0 && <button onClick={() => setFilterRating(0)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={16}/></button>}
                    </div>
                     <button onClick={handleAnalyzeFeedback} disabled={isAnalyzing || feedbacks.length === 0} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm font-semibold disabled:opacity-50">
                        {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        Analisis dengan AI
                    </button>
                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-[#0a1d37] text-white rounded-lg hover:bg-[#1d4ed8] transition-all duration-300 ease-in-out text-sm font-semibold">
                        <Download size={16} />
                        Export JSON
                    </button>
                </div>
            </div>

            {loading ? (
                 <p className="text-center text-gray-500 mt-8">Memuat ulasan...</p>
            ) : filteredFeedbacks.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl shadow-sm border">
                    <p className="text-xl text-gray-500">Belum ada feedback masuk 💭</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Nama</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Rating</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Komentar</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Tanggal</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredFeedbacks.map(fb => (
                                    <tr key={fb.id} className="hover:bg-gray-50 transition-colors duration-200">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <p className="font-semibold text-sm text-[#0a1d37]">{fb.nama}</p>
                                            <p className="text-xs text-gray-500">{fb.id}</p>
                                        </td>
                                        <td className="px-6 py-4"><StarRating value={fb.rating} size={18} /></td>
                                        <td className="px-6 py-4 text-sm text-gray-700 max-w-sm"><p className="line-clamp-3">{fb.komentar}</p></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(fb.tanggal).toLocaleDateString('id-ID')}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${fb.publish ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                                                {fb.publish ? 'Published' : 'Hidden'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            <div className="flex justify-center items-center gap-2">
                                                <button onClick={() => handleTogglePublish(fb)} title={fb.publish ? 'Sembunyikan' : 'Tampilkan'} className="p-2 text-gray-500 hover:text-[#1d4ed8] rounded-full hover:bg-gray-100 transition-colors">
                                                    {fb.publish ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                                 <button onClick={() => handleDeleteClick(fb)} title="Hapus" className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            <ConfirmationModal
                isOpen={!!feedbackToDelete}
                onClose={() => setFeedbackToDelete(null)}
                onConfirm={handleDeleteConfirm}
                title="Hapus Feedback"
                message={`Apakah Anda yakin ingin menghapus feedback dari ${feedbackToDelete?.nama}? Tindakan ini tidak dapat dibatalkan.`}
            />

            <FeedbackAnalysisModal
                isOpen={isAnalysisModalOpen}
                onClose={() => setIsAnalysisModalOpen(false)}
                isAnalyzing={isAnalyzing}
                analysisResult={analysisResult}
                error={analysisError}
            />
        </div>
    );
};

export default AdminFeedbackPage;
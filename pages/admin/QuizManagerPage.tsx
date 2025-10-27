import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { createQuiz, getQuizzes, updateQuiz, deleteQuiz } from '../../services/api';
import { Quiz, QuizCategory, QuizQuestion } from '../../types';
import Modal from '../../components/common/Modal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { PlusCircle, Edit, Trash2, Loader2, BookOpenCheck, Send, X, Plus } from 'lucide-react';
import { format } from 'date-fns';
import id from 'date-fns/locale/id';

const QuizManagerPage = () => {
    const { user: currentUser } = useAuth();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        category: QuizCategory.Fotografi,
        questions: [{ id: `q-${Date.now()}`, questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0 }] as QuizQuestion[]
    });

    const fetchData = async () => {
        setLoading(true);
        const data = await getQuizzes();
        setQuizzes(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const resetForm = () => {
        setFormData({
            title: '',
            category: QuizCategory.Fotografi,
            questions: [{ id: `q-${Date.now()}`, questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0 }]
        });
    };

    const handleOpenAddModal = () => {
        setIsEditing(false);
        setSelectedQuiz(null);
        resetForm();
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (quiz: Quiz) => {
        setIsEditing(true);
        setSelectedQuiz(quiz);
        setFormData({
            title: quiz.title,
            category: quiz.category,
            questions: quiz.questions
        });
        setIsModalOpen(true);
    };

    const handleOpenDeleteModal = (quiz: Quiz) => {
        setSelectedQuiz(quiz);
        setIsConfirmOpen(true);
    };
    
    // Form handlers
    const handleQuestionChange = (qIndex: number, value: string) => {
        const newQuestions = [...formData.questions];
        newQuestions[qIndex].questionText = value;
        setFormData(prev => ({ ...prev, questions: newQuestions }));
    };

    const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
        const newQuestions = [...formData.questions];
        newQuestions[qIndex].options[oIndex] = value;
        setFormData(prev => ({ ...prev, questions: newQuestions }));
    };
    
    const handleCorrectAnswerChange = (qIndex: number, oIndex: number) => {
        const newQuestions = [...formData.questions];
        newQuestions[qIndex].correctAnswerIndex = oIndex;
        setFormData(prev => ({ ...prev, questions: newQuestions }));
    };

    const handleAddQuestion = () => {
        setFormData(prev => ({
            ...prev,
            questions: [...prev.questions, { id: `q-${Date.now()}`, questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0 }]
        }));
    };

    const handleRemoveQuestion = (qIndex: number) => {
        setFormData(prev => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== qIndex)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        
        if (isEditing && selectedQuiz) {
            await updateQuiz(selectedQuiz.id, { ...formData }, currentUser.id);
        } else {
            await createQuiz({ ...formData, createdBy: currentUser.id }, currentUser.id);
        }
        setIsModalOpen(false);
        fetchData();
    };

    const handleDelete = async () => {
        if (!currentUser || !selectedQuiz) return;
        await deleteQuiz(selectedQuiz.id, currentUser.id);
        setIsConfirmOpen(false);
        fetchData();
    };

    if (loading) return <div className="text-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Manajemen Kuis</h1>
                <button onClick={handleOpenAddModal} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                    <PlusCircle size={18} /> Buat Kuis Baru
                </button>
            </div>
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-5 py-3 text-left text-xs font-semibold">Judul Kuis</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold">Kategori</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold">Jumlah Soal</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold">Dibuat Pada</th>
                            <th className="px-5 py-3 text-center text-xs font-semibold">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quizzes.map(quiz => (
                            <tr key={quiz.id} className="hover:bg-gray-50 border-b">
                                <td className="px-5 py-4 font-medium">{quiz.title}</td>
                                <td className="px-5 py-4"><span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{quiz.category}</span></td>
                                <td className="px-5 py-4">{quiz.questions.length}</td>
                                <td className="px-5 py-4 text-sm text-muted">{format(quiz.createdAt, 'd MMM yyyy', { locale: id })}</td>
                                <td className="px-5 py-4 text-center">
                                    <button onClick={() => handleOpenEditModal(quiz)} className="p-2 text-muted hover:text-blue-600"><Edit size={16}/></button>
                                    <button onClick={() => handleOpenDeleteModal(quiz)} className="p-2 text-muted hover:text-red-600"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Edit Kuis' : 'Buat Kuis Baru'}>
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
                    <div><label className="font-semibold">Judul Kuis</label><input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required className="w-full p-2 border rounded mt-1"/></div>
                    <div><label className="font-semibold">Kategori</label><select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as QuizCategory})} className="w-full p-2 border rounded mt-1">{Object.values(QuizCategory).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div className="space-y-4 pt-4 border-t">
                        <h3 className="font-semibold">Pertanyaan</h3>
                        {formData.questions.map((q, qIndex) => (
                            <div key={q.id} className="p-4 border rounded-lg bg-base-100 relative">
                                <button type="button" onClick={() => handleRemoveQuestion(qIndex)} className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 rounded-full"><X size={16}/></button>
                                <label className="font-medium">Soal #{qIndex + 1}</label>
                                <textarea value={q.questionText} onChange={e => handleQuestionChange(qIndex, e.target.value)} required rows={2} className="w-full p-2 border rounded mt-1"/>
                                <div className="mt-2 space-y-2">
                                    {q.options.map((opt, oIndex) => (
                                        <div key={oIndex} className="flex items-center gap-2">
                                            <input type="radio" name={`correct-${q.id}`} checked={q.correctAnswerIndex === oIndex} onChange={() => handleCorrectAnswerChange(qIndex, oIndex)} className="accent-green-500"/>
                                            <input type="text" value={opt} onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)} required placeholder={`Opsi ${oIndex + 1}`} className="flex-grow p-2 border rounded text-sm"/>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={handleAddQuestion} className="w-full flex items-center justify-center gap-2 p-2 text-sm bg-blue-100 text-blue-700 font-semibold rounded-lg hover:bg-blue-200"><Plus size={16}/> Tambah Pertanyaan</button>
                    </div>
                    <div className="flex justify-end pt-4"><button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">Simpan Kuis</button></div>
                </form>
            </Modal>
            
            <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleDelete} title="Hapus Kuis" message={`Anda yakin ingin menghapus kuis "${selectedQuiz?.title}"?`} />
        </div>
    );
};

export default QuizManagerPage;

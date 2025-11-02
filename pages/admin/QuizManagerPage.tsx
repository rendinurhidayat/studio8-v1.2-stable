

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { createQuiz, getQuizzes, updateQuiz, deleteQuiz } from '../../services/api';
import { Quiz, QuizCategory, QuizQuestion } from '../../types';
import Modal from '../../components/common/Modal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { PlusCircle, Edit, Trash2, Loader2, BookOpenCheck, Send, X, Plus, Sparkles, Image as ImageIcon, Check } from 'lucide-react';
import format from 'date-fns/format';
import id from 'date-fns/locale/id';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject('Failed to read file');
        reader.onerror = error => reject(error);
    });
};

const AiQuizGeneratorModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onQuizGenerated: (data: { title: string; category: QuizCategory; questions: any[] }) => void;
}> = ({ isOpen, onClose, onQuizGenerated }) => {
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [category, setCategory] = useState(QuizCategory.Fotografi);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Topik tidak boleh kosong.');
      return;
    }
    setIsGenerating(true);
    setError('');
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generateQuizQuestions', topic, numQuestions, category }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Gagal membuat kuis.');
      }
      const questions = await response.json();
      onQuizGenerated({ title: `Kuis AI: ${topic}`, category, questions });
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Kuis dengan AI">
        <div className="space-y-4">
            <div><label className="font-semibold">Topik Kuis</label><input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Contoh: Teknik Dasar Lighting" className="w-full p-2 border rounded mt-1"/></div>
            <div><label className="font-semibold">Jumlah Pertanyaan</label><input type="number" value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))} min="1" max="15" className="w-full p-2 border rounded mt-1"/></div>
            <div><label className="font-semibold">Kategori</label><select value={category} onChange={e => setCategory(e.target.value as QuizCategory)} className="w-full p-2 border rounded mt-1">{Object.values(QuizCategory).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            {error && <p className="text-sm text-red-500">{error}</p>}
             <div className="flex justify-end pt-4">
                <button onClick={handleGenerate} disabled={isGenerating} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 w-32 flex justify-center">
                    {isGenerating ? <Loader2 className="animate-spin" /> : 'Generate'}
                </button>
            </div>
        </div>
    </Modal>
  );
};


const QuizManagerPage = () => {
    const { user: currentUser } = useAuth();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        category: QuizCategory.Fotografi,
        questions: [{ id: `q-${Date.now()}`, questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0, explanation: '', imageUrl: '' }] as QuizQuestion[]
    });
    
    const [imagePrompts, setImagePrompts] = useState<Record<string, string>>({});
    const [imageUploadStates, setImageUploadStates] = useState<Record<string, 'idle' | 'uploading' | 'error' | 'done'>>({});

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
            questions: [{ id: `q-${Date.now()}`, questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0, explanation: '', imageUrl: '' }]
        });
        setImagePrompts({});
        setImageUploadStates({});
    };
    
    const handleQuizGeneratedByAi = ({ title, category, questions }: { title: string; category: QuizCategory; questions: any[] }) => {
        const newPrompts: Record<string, string> = {};
        const formattedQuestions: QuizQuestion[] = questions.map((q: any, index: number) => {
            const newId = `q-${Date.now()}-${index}`;
            if (q.imagePrompt) {
                newPrompts[newId] = q.imagePrompt;
            }
            const { imagePrompt, ...rest } = q;
            return { ...rest, id: newId, imageUrl: '' };
        });

        setFormData({
            title,
            category,
            questions: formattedQuestions,
        });
        setImagePrompts(newPrompts);
        setIsEditing(false);
        setIsModalOpen(true);
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
    const handleQuestionChange = (qIndex: number, field: 'questionText' | 'explanation', value: string) => {
        const newQuestions = [...formData.questions];
        newQuestions[qIndex][field] = value;
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
    
    const handleImageUpload = async (qIndex: number, file: File | null) => {
        if (!file) return;
        const questionId = formData.questions[qIndex].id;
        setImageUploadStates(prev => ({ ...prev, [questionId]: 'uploading' }));
        try {
            const base64 = await fileToBase64(file);
            const response = await fetch('/api/uploadImage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: base64, folder: 'quiz_images' }),
            });
            if (!response.ok) throw new Error('Upload gagal');
            const { secure_url } = await response.json();
            const newQuestions = [...formData.questions];
            newQuestions[qIndex].imageUrl = secure_url;
            setFormData(prev => ({ ...prev, questions: newQuestions }));
            setImageUploadStates(prev => ({ ...prev, [questionId]: 'done' }));
        } catch (error) {
            console.error(error);
            setImageUploadStates(prev => ({ ...prev, [questionId]: 'error' }));
        }
    };


    const handleAddQuestion = () => {
        setFormData(prev => ({
            ...prev,
            questions: [...prev.questions, { id: `q-${Date.now()}`, questionText: '', options: ['', '', '', ''], correctAnswerIndex: 0, explanation: '', imageUrl: '' }]
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
                <div className="flex gap-2">
                    <button onClick={() => setIsAiModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90">
                        <Sparkles size={18} /> Generate Kuis (AI)
                    </button>
                    <button onClick={handleOpenAddModal} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                        <PlusCircle size={18} /> Buat Kuis Manual
                    </button>
                </div>
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
                                <td className="px-5 py-4 text-sm text-muted">{format(new Date(quiz.createdAt), 'd MMM yyyy', { locale: id })}</td>
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
                                <textarea value={q.questionText} onChange={e => handleQuestionChange(qIndex, 'questionText', e.target.value)} required rows={2} className="w-full p-2 border rounded mt-1"/>
                                <div className="mt-2 space-y-2">
                                    {q.options.map((opt, oIndex) => (
                                        <div key={oIndex} className="flex items-center gap-2">
                                            <input type="radio" name={`correct-${q.id}`} checked={q.correctAnswerIndex === oIndex} onChange={() => handleCorrectAnswerChange(qIndex, oIndex)} className="accent-green-500"/>
                                            <input type="text" value={opt} onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)} required placeholder={`Opsi ${oIndex + 1}`} className="flex-grow p-2 border rounded text-sm"/>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2"><label className="font-medium text-sm">Penjelasan Jawaban</label><textarea value={q.explanation || ''} onChange={e => handleQuestionChange(qIndex, 'explanation', e.target.value)} rows={2} className="w-full p-2 border rounded mt-1 text-sm"/></div>
                                <div className="mt-2">
                                    <label className="font-medium text-sm">Gambar (Opsional)</label>
                                    {imagePrompts[q.id] && <p className="text-xs text-muted italic">Saran AI: "{imagePrompts[q.id]}"</p>}
                                    <div className="flex items-center gap-2 mt-1">
                                        <input type="file" accept="image/*" onChange={e => handleImageUpload(qIndex, e.target.files ? e.target.files[0] : null)} className="text-xs"/>
                                        {imageUploadStates[q.id] === 'uploading' && <Loader2 size={16} className="animate-spin" />}
                                        {imageUploadStates[q.id] === 'done' && <Check size={16} className="text-green-500" />}
                                    </div>
                                    {q.imageUrl && <img src={q.imageUrl} alt="preview" className="mt-2 h-24 w-auto rounded"/>}
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={handleAddQuestion} className="w-full flex items-center justify-center gap-2 p-2 text-sm bg-blue-100 text-blue-700 font-semibold rounded-lg hover:bg-blue-200"><Plus size={16}/> Tambah Pertanyaan</button>
                    </div>
                    <div className="flex justify-end pt-4"><button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">Simpan Kuis</button></div>
                </form>
            </Modal>
            
            <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleDelete} title="Hapus Kuis" message={`Anda yakin ingin menghapus kuis "${selectedQuiz?.title}"?`} />
            <AiQuizGeneratorModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} onQuizGenerated={handleQuizGeneratedByAi} />
        </div>
    );
};

export default QuizManagerPage;

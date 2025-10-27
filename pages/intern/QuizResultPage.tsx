import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getQuizResultById } from '../../services/api';
import { QuizResult } from '../../types';
import { Loader2, Check, X, Sparkles, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

const ExplanationPill: React.FC<{
    questionText: string,
    options: string[],
    correctAnswerIndex: number,
    userAnswerIndex: number
}> = ({ questionText, options, correctAnswerIndex, userAnswerIndex }) => {
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const generateExplanation = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'generateQuizExplanation',
                    questionText, 
                    options, 
                    correctAnswerIndex, 
                    userAnswerIndex 
                }),
            });
            if (!response.ok) throw new Error('Gagal mendapatkan penjelasan dari AI.');
            const text = await response.text();
            setExplanation(text);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (explanation) {
        return <p className="text-xs text-yellow-700 italic mt-2">{explanation}</p>
    }

    return (
        <div className="mt-2">
            <button onClick={generateExplanation} disabled={isLoading} className="text-xs inline-flex items-center gap-1.5 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 disabled:opacity-50">
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <><Sparkles size={14} /> Dapatkan Penjelasan (AI)</>}
            </button>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
    );
};

const QuizResultPage = () => {
    const { resultId } = useParams<{ resultId: string }>();
    const [result, setResult] = useState<QuizResult | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!resultId) return;
        const fetchData = async () => {
            setLoading(true);
            const data = await getQuizResultById(resultId);
            setResult(data);
            setLoading(false);
        };
        fetchData();
    }, [resultId]);

    if (loading) {
        return <div className="flex h-full w-full items-center justify-center bg-base-100"><Loader2 className="animate-spin text-primary" size={48} /></div>;
    }

    if (!result) {
        return <div className="flex h-full w-full items-center justify-center bg-base-100 text-base-content">Hasil kuis tidak ditemukan.</div>;
    }

    const scoreColor = result.score >= 80 ? 'text-success' : result.score >= 50 ? 'text-warning' : 'text-error';

    return (
        <div className="bg-base-100 text-base-content min-h-full p-6">
            <div className="max-w-3xl mx-auto">
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center p-8 bg-white rounded-2xl border border-base-200 shadow-lg">
                    <h1 className="text-xl text-muted">{result.quizTitle}</h1>
                    <p className="text-sm text-muted">Hasil Kuis</p>
                    <p className={`text-6xl md:text-7xl font-bold my-4 ${scoreColor}`}>{result.score}<span className="text-4xl">%</span></p>
                    <Link to="/intern/quiz" className="px-6 py-2 bg-primary text-primary-content font-bold rounded-lg hover:bg-primary/90">
                        Kembali ke Daftar Kuis
                    </Link>
                </motion.div>

                <div className="mt-8">
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-3"><BookOpen /> Pembahasan</h2>
                    <div className="space-y-4">
                        {result.answers.map((ans, index) => {
                            const question = result.quiz?.questions.find(q=>q.id === ans.questionId);
                            return (
                            <div key={ans.questionId} className="p-4 bg-white rounded-lg border border-base-200">
                                {question?.imageUrl && <img src={question.imageUrl} alt="Ilustrasi soal" className="mb-4 rounded-lg max-h-56 w-full object-contain bg-base-100 p-2" />}
                                <p className="font-semibold">{index + 1}. {ans.questionText}</p>
                                <div className="mt-3 space-y-2 text-sm">
                                    <div className={`flex items-start gap-2 p-2 rounded ${ans.isCorrect ? 'bg-success/10' : 'bg-error/10'}`}>
                                        {ans.isCorrect ? <Check className="text-success mt-0.5 flex-shrink-0" /> : <X className="text-error mt-0.5 flex-shrink-0" />}
                                        <p>Jawabanmu: <span className="font-medium">{question?.options[ans.selectedAnswerIndex] ?? '...'}</span></p>
                                    </div>
                                    {!ans.isCorrect && (
                                        <div className="flex items-start gap-2 p-2 rounded bg-success/10">
                                            <Check className="text-success mt-0.5 flex-shrink-0" />
                                            <p>Jawaban Benar: <span className="font-medium">{question?.options[ans.correctAnswerIndex] ?? '...'}</span></p>
                                        </div>
                                    )}
                                    {!ans.isCorrect && result.quiz?.questions && question && (
                                        <ExplanationPill 
                                            questionText={ans.questionText}
                                            options={question.options ?? []}
                                            correctAnswerIndex={ans.correctAnswerIndex}
                                            userAnswerIndex={ans.selectedAnswerIndex}
                                        />
                                    )}
                                </div>
                            </div>
                        )})}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuizResultPage;
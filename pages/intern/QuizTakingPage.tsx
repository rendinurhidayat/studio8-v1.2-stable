import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getQuizById, submitQuizResult, updateUserPoints } from '../../services/api';
import { Quiz } from '../../types';
import { Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const QuizTakingPage = () => {
    const { quizId } = useParams<{ quizId: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<(number | null)[]>([]);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

    useEffect(() => {
        if (!quizId) return;
        const fetchData = async () => {
            setLoading(true);
            const data = await getQuizById(quizId);
            setQuiz(data);
            if (data) {
                setAnswers(new Array(data.questions.length).fill(null));
            }
            setLoading(false);
        };
        fetchData();
    }, [quizId]);

    const handleNextQuestion = async () => {
        if (selectedAnswer === null) return;
        
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = selectedAnswer;
        setAnswers(newAnswers);
        setSelectedAnswer(null);

        if (currentQuestionIndex < quiz!.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            // End of quiz, submit results
            if (!user || !quiz) return;
            setLoading(true);
            
            const results = quiz.questions.map((q, i) => {
                const isCorrect = newAnswers[i] === q.correctAnswerIndex;
                return {
                    questionId: q.id,
                    questionText: q.questionText,
                    selectedAnswerIndex: newAnswers[i]!,
                    correctAnswerIndex: q.correctAnswerIndex,
                    isCorrect
                };
            });

            const correctCount = results.filter(r => r.isCorrect).length;
            const score = Math.round((correctCount / quiz.questions.length) * 100);

            // Add points for completing a quiz
            await updateUserPoints(user.id, 10);
            if (score > 80) { // Bonus for high score
                await updateUserPoints(user.id, 5);
            }

            const resultId = await submitQuizResult({
                quizId: quiz.id,
                quizTitle: quiz.title,
                studentId: user.id,
                studentName: user.name,
                score,
                answers: results,
                quiz: quiz,
            });
            navigate(`/intern/quiz/result/${resultId}`);
        }
    };

    if (loading) {
        return <div className="flex h-full w-full items-center justify-center bg-base-100"><Loader2 className="animate-spin text-primary" size={48} /></div>;
    }

    if (!quiz) {
        return <div className="flex h-full w-full items-center justify-center bg-base-100 text-base-content">Kuis tidak ditemukan.</div>;
    }

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

    return (
        <div className="bg-base-100 text-base-content min-h-full flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-2xl">
                <p className="text-sm text-muted">{quiz.category}</p>
                <h1 className="text-xl md:text-2xl font-bold text-accent">{quiz.title}</h1>
                
                <div className="mt-4">
                    <div className="flex justify-between text-sm text-muted mb-1">
                        <span>Soal {currentQuestionIndex + 1} dari {quiz.questions.length}</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-base-200 rounded-full h-2 sm:h-2.5">
                        <motion.div className="bg-accent h-2 sm:h-2.5 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentQuestionIndex}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                        className="mt-8"
                    >
                        {currentQuestion.imageUrl && (
                            <img src={currentQuestion.imageUrl} alt="Ilustrasi pertanyaan" className="mb-4 rounded-lg max-h-64 w-full object-contain bg-base-200 p-2" />
                        )}
                        <p className="text-lg md:text-xl font-semibold mb-6">{currentQuestion.questionText}</p>
                        <div className="space-y-3">
                            {currentQuestion.options.map((option, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedAnswer(index)}
                                    className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                                        selectedAnswer === index
                                            ? 'border-accent bg-accent/10 scale-105'
                                            : 'border-base-200 bg-white hover:border-base-300'
                                    }`}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>

                <div className="mt-8 text-right">
                    <button onClick={handleNextQuestion} disabled={selectedAnswer === null} className="inline-flex items-center gap-2 px-6 py-2.5 sm:px-8 sm:py-3 bg-primary text-primary-content font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
                        {currentQuestionIndex === quiz.questions.length - 1 ? 'Selesai & Lihat Hasil' : 'Selanjutnya'}
                        <ArrowRight />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuizTakingPage;
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getQuizzes, getQuizResultsForStudent } from '../../services/api';
import { Quiz, QuizCategory, QuizResult } from '../../types';
import { Loader2, Camera, Video, TrendingUp, Library, CheckCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface LearningModule {
    title: string;
    description: string;
    category: QuizCategory;
    icon: React.ReactNode;
}

const modules: LearningModule[] = [
    { title: "Akademi Fotografi", description: "Asah kemampuan fotografimu, mulai dari dasar hingga teknik profesional.", category: QuizCategory.Fotografi, icon: <Camera size={24} /> },
    { title: "Akademi Videografi", description: "Pelajari seluk beluk videografi, dari pengambilan gambar hingga proses editing.", category: QuizCategory.Videografi, icon: <Video size={24} /> },
    { title: "Akademi Marketing", description: "Tingkatkan pemahamanmu tentang strategi marketing di industri kreatif.", category: QuizCategory.Marketing, icon: <TrendingUp size={24} /> },
];

const AcademyPage = () => {
    const { user } = useAuth();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [myResults, setMyResults] = useState<QuizResult[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            setLoading(true);
            const [quizzesData, myResultsData] = await Promise.all([
                getQuizzes(),
                getQuizResultsForStudent(user.id)
            ]);
            setQuizzes(quizzesData);
            setMyResults(myResultsData);
            setLoading(false);
        };
        fetchData();
    }, [user]);

    const moduleData = useMemo(() => {
        return modules.map(module => {
            const moduleQuizzes = quizzes.filter(q => q.category === module.category);
            const completedCount = moduleQuizzes.filter(q => myResults.some(r => r.quizId === q.id)).length;
            return {
                ...module,
                quizzes: moduleQuizzes,
                progress: moduleQuizzes.length > 0 ? (completedCount / moduleQuizzes.length) * 100 : 0,
            };
        });
    }, [quizzes, myResults]);

    if (loading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin text-primary" size={48} /></div>;
    }

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-primary/10 rounded-lg text-primary"><Library size={28} /></div>
                <div>
                    <h1 className="text-3xl font-bold text-primary">Akademi Studio 8</h1>
                    <p className="text-muted mt-1">Pusat pembelajaran untuk meningkatkan skill dan pengetahuanmu.</p>
                </div>
            </div>

            <div className="space-y-8">
                {moduleData.map(module => (
                    <motion.div 
                        key={module.category}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white p-6 rounded-2xl shadow-lg border border-base-200"
                    >
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="p-3 bg-accent/10 rounded-lg text-accent self-start">{module.icon}</div>
                            <div className="flex-grow">
                                <h2 className="text-2xl font-bold text-primary">{module.title}</h2>
                                <p className="text-muted text-sm mt-1">{module.description}</p>
                            </div>
                            <div className="w-full md:w-48 flex-shrink-0">
                                <div className="flex justify-between text-xs text-muted mb-1">
                                    <span>Progres</span>
                                    <span>{Math.round(module.progress)}%</span>
                                </div>
                                <div className="w-full bg-base-200 rounded-full h-2.5">
                                    <div className="bg-accent h-2.5 rounded-full" style={{ width: `${module.progress}%` }}></div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-base-200 space-y-3">
                            {module.quizzes.length > 0 ? module.quizzes.map(quiz => {
                                const result = myResults.find(r => r.quizId === quiz.id);
                                return (
                                    <div key={quiz.id} className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            {result ? <CheckCircle className="text-success" size={20} /> : <div className="w-5 h-5 border-2 border-base-300 rounded-full" />}
                                            <div>
                                                <p className="font-semibold text-primary">{quiz.title}</p>
                                                <p className="text-xs text-muted">{quiz.questions.length} Soal</p>
                                            </div>
                                        </div>
                                        {result ? (
                                            <div className="flex items-center gap-4">
                                                <span className={`font-bold text-sm ${result.score > 70 ? 'text-success' : 'text-warning'}`}>{result.score}%</span>
                                                <Link to={`/intern/quiz/result/${result.id}`} className="px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary rounded-md hover:bg-primary/20">
                                                    Lihat Hasil
                                                </Link>
                                            </div>
                                        ) : (
                                            <Link to={`/intern/quiz/take/${quiz.id}`} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-accent text-accent-content rounded-md hover:bg-accent/90">
                                                Mulai Kuis <ArrowRight size={14} />
                                            </Link>
                                        )}
                                    </div>
                                )
                            }) : (
                                <p className="text-center text-sm text-muted py-4">Belum ada kuis untuk modul ini.</p>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default AcademyPage;
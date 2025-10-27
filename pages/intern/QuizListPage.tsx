import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getQuizzes, getWeeklyQuizResults, getQuizResultsForStudent } from '../../services/api';
import { Quiz, QuizCategory, QuizResult } from '../../types';
import { Loader2, BookOpen, Trophy, BarChart, ArrowRight, Camera, Video, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const categoryIcons: { [key in QuizCategory]: React.ReactNode } = {
    [QuizCategory.Fotografi]: <Camera className="w-8 h-8 text-accent" />,
    [QuizCategory.Videografi]: <Video className="w-8 h-8 text-yellow-500" />,
    [QuizCategory.Marketing]: <TrendingUp className="w-8 h-8 text-success" />,
};

const QuizListPage = () => {
    const { user } = useAuth();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [leaderboard, setLeaderboard] = useState<{ name: string; score: number }[]>([]);
    const [myResults, setMyResults] = useState<QuizResult[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            setLoading(true);
            const [quizzesData, weeklyResults, myResultsData] = await Promise.all([
                getQuizzes(),
                getWeeklyQuizResults(),
                getQuizResultsForStudent(user.id)
            ]);

            setQuizzes(quizzesData);
            setMyResults(myResultsData);

            // Process leaderboard
            const studentScores: { [key: string]: { totalScore: number; count: number, name: string } } = {};
            weeklyResults.forEach(result => {
                if (!studentScores[result.studentId]) {
                    studentScores[result.studentId] = { totalScore: 0, count: 0, name: result.studentName };
                }
                studentScores[result.studentId].totalScore += result.score;
                studentScores[result.studentId].count++;
            });
            const avgScores = Object.values(studentScores).map(s => ({ name: s.name, score: Math.round(s.totalScore / s.count) }));
            setLeaderboard(avgScores.sort((a, b) => b.score - a.score).slice(0, 5));

            setLoading(false);
        };
        fetchData();
    }, [user]);

    const myChartData = useMemo(() => {
        return myResults.slice(0, 10).reverse().map(r => ({
            name: r.quizTitle.substring(0, 10) + '...',
            Skor: r.score
        }));
    }, [myResults]);

    if (loading) {
        return <div className="flex h-full w-full items-center justify-center bg-base-100"><Loader2 className="animate-spin text-primary" size={48} /></div>;
    }

    const groupedQuizzes = quizzes.reduce((acc, quiz) => {
        (acc[quiz.category] = acc[quiz.category] || []).push(quiz);
        return acc;
    }, {} as Record<QuizCategory, Quiz[]>);

    return (
        <div className="bg-base-100 text-base-content min-h-full p-6">
            <h1 className="text-2xl md:text-3xl font-bold text-primary mb-6">Kuis Interaktif</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {Object.keys(groupedQuizzes).map((category) => (
                        <div key={category}>
                            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-3">
                                {categoryIcons[category as QuizCategory]} {category}
                            </h2>
                            <div className="space-y-3">
                                {groupedQuizzes[category as QuizCategory].map(quiz => (
                                    <motion.div whileHover={{ scale: 1.02 }} key={quiz.id}>
                                        <Link to={`/intern/quiz/take/${quiz.id}`} className="flex items-center justify-between p-4 bg-white rounded-lg border border-base-200 hover:border-accent transition-colors shadow-sm">
                                            <div>
                                                <p className="font-semibold">{quiz.title}</p>
                                                <p className="text-sm text-muted">{quiz.questions.length} Soal</p>
                                            </div>
                                            <ArrowRight className="text-gray-400" />
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-6">
                    <div className="p-4 bg-white rounded-lg border border-base-200 shadow-sm">
                        <h3 className="font-bold mb-4 flex items-center gap-2"><Trophy className="text-gold" /> Papan Peringkat Mingguan</h3>
                        <ul className="space-y-2">
                            {leaderboard.map((player, index) => (
                                <li key={index} className="flex items-center justify-between text-sm p-2 bg-base-100 rounded">
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold w-6">{index + 1}.</span>
                                        <span>{player.name}</span>
                                    </div>
                                    <span className="font-bold text-gold">{player.score}%</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-base-200 shadow-sm">
                        <h3 className="font-bold mb-4 flex items-center gap-2"><BarChart className="text-accent" /> Rata-rata Nilaimu</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsBarChart data={myChartData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--tw-colors-base-200)" />
                                    <XAxis type="number" domain={[0, 100]} stroke="var(--tw-colors-muted)" />
                                    <YAxis type="category" dataKey="name" stroke="var(--tw-colors-muted)" width={80} fontSize={12} />
                                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }} />
                                    <Bar dataKey="Skor" fill="var(--tw-colors-accent)" barSize={15} />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuizListPage;
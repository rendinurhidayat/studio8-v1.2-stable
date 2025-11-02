

import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getForumThreadById, getRepliesForThread, addReplyToThread } from '../../services/api';
import { ForumThread, ForumReply } from '../../types';
import { Loader2, ArrowLeft, Send } from 'lucide-react';
import format from 'date-fns/format';
import id from 'date-fns/locale/id';
import { motion, AnimatePresence } from 'framer-motion';

const ForumThreadPage = () => {
    const { threadId } = useParams<{ threadId: string }>();
    const { user } = useAuth();
    const [thread, setThread] = useState<ForumThread | null>(null);
    const [replies, setReplies] = useState<ForumReply[]>([]);
    const [loading, setLoading] = useState(true);
    const [newReply, setNewReply] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!threadId) return;

        let isMounted = true;

        const fetchThread = async () => {
            const threadData = await getForumThreadById(threadId);
            if (isMounted) {
                setThread(threadData);
                setLoading(false);
            }
        };

        fetchThread();
        const unsubscribeReplies = getRepliesForThread(threadId, (newReplies) => {
            if (isMounted) {
                setReplies(newReplies);
            }
        });

        return () => {
            isMounted = false;
            unsubscribeReplies();
        };
    }, [threadId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [replies]);

    const handleReplySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReply.trim() || !user || !threadId) return;

        setIsReplying(true);
        try {
            await addReplyToThread(threadId, {
                content: newReply,
                authorId: user.id,
                authorName: user.name,
            });
            setNewReply('');
        } catch (error) {
            console.error("Failed to post reply:", error);
        } finally {
            setIsReplying(false);
        }
    };
    
    if (loading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin text-primary" size={48} /></div>;
    }

    if (!thread) {
        return <div className="flex h-screen w-full items-center justify-center">Topik tidak ditemukan.</div>;
    }

    return (
        <div className="min-h-screen bg-base-100 flex flex-col">
            <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b p-4 z-10">
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    <Link to="/admin/community" className="p-2 text-muted hover:text-primary rounded-full hover:bg-base-200">
                        <ArrowLeft />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-primary">{thread.title}</h1>
                        <p className="text-sm text-muted">oleh {thread.authorName}</p>
                    </div>
                </div>
            </header>

            <main className="flex-grow p-4">
                <div className="max-w-4xl mx-auto">
                    {/* Original Post */}
                    <div className="bg-white p-6 rounded-lg border shadow-sm mb-6">
                        <div className="flex justify-between items-center text-sm text-muted mb-4">
                            <span>{thread.authorName}</span>
                            <span>{format(new Date(thread.createdAt), 'd MMM yyyy, HH:mm', { locale: id })}</span>
                        </div>
                        <p className="text-base-content whitespace-pre-wrap">{thread.content}</p>
                    </div>

                    {/* Replies */}
                    <AnimatePresence>
                        <motion.div layout className="space-y-4">
                            {replies.map(reply => (
                                <motion.div
                                    layout
                                    key={reply.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white p-4 rounded-lg border"
                                >
                                    <div className="flex justify-between items-center text-xs text-muted mb-2">
                                        <span className="font-semibold text-primary">{reply.authorName}</span>
                                        <span>{format(new Date(reply.createdAt), 'd MMM, HH:mm', { locale: id })}</span>
                                    </div>
                                    <p className="text-sm text-base-content whitespace-pre-wrap">{reply.content}</p>
                                </motion.div>
                            ))}
                        </motion.div>
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>
            </main>

            <footer className="sticky bottom-0 bg-white border-t p-4">
                <form onSubmit={handleReplySubmit} className="max-w-4xl mx-auto flex items-center gap-2">
                    <textarea
                        value={newReply}
                        onChange={e => setNewReply(e.target.value)}
                        placeholder="Tulis balasan..."
                        rows={1}
                        className="flex-grow p-3 bg-base-100 border rounded-full focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                    />
                    <button type="submit" disabled={isReplying || !newReply.trim()} className="p-3 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50">
                        {isReplying ? <Loader2 className="animate-spin"/> : <Send />}
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default ForumThreadPage;

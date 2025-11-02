

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getForumThreads } from '../../services/api';
import { ForumThread } from '../../types';
import { motion } from 'framer-motion';
import { Loader2, PlusCircle, MessageSquare } from 'lucide-react';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import id from 'date-fns/locale/id';
import CreateThreadModal from './CreateThreadModal';

const ForumList = () => {
    const [threads, setThreads] = useState<ForumThread[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();

    const fetchData = async () => {
        setLoading(true);
        const data = await getForumThreads();
        setThreads(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleThreadCreated = () => {
        setIsModalOpen(false);
        fetchData();
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-primary">Topik Diskusi</h3>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-content text-sm font-semibold rounded-lg hover:bg-primary/90"
                >
                    <PlusCircle size={16} /> Mulai Diskusi Baru
                </button>
            </div>
            
            {threads.length === 0 ? (
                <p className="text-center text-muted p-8">Belum ada diskusi. Jadilah yang pertama!</p>
            ) : (
                <div className="space-y-3">
                    {threads.map((thread, index) => (
                        <motion.div
                            key={thread.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => navigate(`/community/forum/${thread.id}`)}
                            className="bg-base-100 hover:bg-base-200 p-4 rounded-lg cursor-pointer border border-base-200"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-primary">{thread.title}</p>
                                    <p className="text-xs text-muted">
                                        oleh {thread.authorName} &bull; {formatDistanceToNow(new Date(thread.lastReplyAt || thread.createdAt), { locale: id, addSuffix: true })}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted flex-shrink-0 ml-4">
                                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">{thread.category}</span>
                                    <div className="flex items-center gap-1">
                                        <MessageSquare size={14} />
                                        <span>{thread.replyCount}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
            <CreateThreadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onThreadCreated={handleThreadCreated} />
        </div>
    );
};

export default ForumList;

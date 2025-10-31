import React, { useState, useEffect } from 'react';
import { getJobPosts } from '../../services/api';
import { JobPost, UserRole } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, PlusCircle, MapPin, Clock, Briefcase as BriefcaseIcon } from 'lucide-react';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import id from 'date-fns/locale/id';
import CreateJobModal from './CreateJobModal';

const JobBoardList = () => {
    const { user } = useAuth();
    const [jobs, setJobs] = useState<JobPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

    const canPostJob = user?.role === UserRole.Admin || user?.role === UserRole.Staff;

    const fetchData = async () => {
        setLoading(true);
        setJobs(await getJobPosts());
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleJobCreated = () => {
        setIsModalOpen(false);
        fetchData();
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-primary">Lowongan Kerja</h3>
                {canPostJob && (
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90">
                        <PlusCircle size={16} /> Pasang Lowongan Baru
                    </button>
                )}
            </div>

            {jobs.length === 0 ? (
                <p className="text-center text-muted p-8">Belum ada lowongan kerja saat ini.</p>
            ) : (
                <div className="space-y-4">
                    {jobs.map(job => (
                        <div key={job.id} className="bg-base-100 rounded-lg border border-base-200 overflow-hidden">
                            <div onClick={() => setSelectedJobId(selectedJobId === job.id ? null : job.id)} className="p-4 cursor-pointer hover:bg-base-200">
                                <h4 className="font-semibold text-primary">{job.title}</h4>
                                <p className="text-sm text-muted">{job.company}</p>
                                <div className="flex items-center gap-4 text-xs text-muted mt-2">
                                    <span className="flex items-center gap-1"><MapPin size={12} /> {job.location}</span>
                                    <span className="flex items-center gap-1"><Clock size={12} /> {job.type}</span>
                                </div>
                            </div>
                            <AnimatePresence>
                                {selectedJobId === job.id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-4 border-t border-base-200">
                                            <p className="text-sm whitespace-pre-wrap">{job.description}</p>
                                            <a href={job.applyLink} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 px-3 py-1.5 bg-accent text-white text-xs font-bold rounded-md hover:bg-accent/90">
                                                Lamar Sekarang
                                            </a>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            )}
            {canPostJob && <CreateJobModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onJobCreated={handleJobCreated} />}
        </div>
    );
};

export default JobBoardList;
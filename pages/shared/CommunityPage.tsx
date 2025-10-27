import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquare, Briefcase, Calendar } from 'lucide-react';
import ForumList from '../../components/community/ForumList';
import JobBoardList from '../../components/community/JobBoardList';
import EventList from '../../components/community/EventList';

type Tab = 'forum' | 'jobs' | 'events';

const TabButton: React.FC<{
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-2 p-4 text-sm font-semibold transition-colors relative ${isActive ? 'text-primary' : 'text-muted hover:text-primary'}`}
    >
        {icon}
        {label}
        {isActive && (
            <motion.div
                layoutId="active-community-tab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
            />
        )}
    </button>
);

const CommunityPage = () => {
    const [activeTab, setActiveTab] = useState<Tab>('forum');

    const renderContent = () => {
        switch (activeTab) {
            case 'forum':
                return <ForumList />;
            case 'jobs':
                return <JobBoardList />;
            case 'events':
                return <EventList />;
            default:
                return null;
        }
    };

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                 <div className="p-3 bg-primary/10 rounded-lg text-primary">
                    <Briefcase size={28} />
                 </div>
                 <div>
                    <h1 className="text-3xl font-bold text-primary">Portal Komunitas</h1>
                    <p className="text-muted mt-1">Terhubung, berdiskusi, dan temukan peluang di komunitas kreatif Studio 8.</p>
                 </div>
            </div>

            <div className="bg-white rounded-t-lg border-b sticky top-0">
                <div className="flex">
                    <TabButton label="Forum Diskusi" icon={<MessageSquare size={16} />} isActive={activeTab === 'forum'} onClick={() => setActiveTab('forum')} />
                    <TabButton label="Lowongan Kerja" icon={<Briefcase size={16} />} isActive={activeTab === 'jobs'} onClick={() => setActiveTab('jobs')} />
                    <TabButton label="Event Komunitas" icon={<Calendar size={16} />} isActive={activeTab === 'events'} onClick={() => setActiveTab('events')} />
                </div>
            </div>

            <div className="p-6 bg-white rounded-b-lg shadow-sm">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.2 }}
                    >
                        {renderContent()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default CommunityPage;
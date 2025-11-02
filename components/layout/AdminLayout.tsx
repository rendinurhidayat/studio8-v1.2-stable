
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import PushNotificationManager from '../common/PushNotificationManager';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';
import AiTipsModal from '../admin/AiTipsModal';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [isAiTipsModalOpen, setIsAiTipsModalOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const getContextFromPath = (path: string): string => {
    const parts = path.split('/').filter(Boolean);
    if (parts.length < 2) return 'Dashboard';
    // Example: /admin/finance -> "Admin Finance"
    const page = parts[parts.length - 1].replace(/-/g, ' ');
    const role = parts[parts.length - 2].replace(/-/g, ' ');
    
    const toTitleCase = (str: string) => str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

    return `${toTitleCase(role)} ${toTitleCase(page)}`;
  };


  return (
    <div className="flex h-screen bg-base-100 text-base-content">
      {/* Sidebar for all screen sizes */}
      <AnimatePresence>
        {isSidebarOpen && <Sidebar />}
      </AnimatePresence>
      
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-base-100 p-4 md:p-6">
          {children}
        </main>
      </div>
      <PushNotificationManager />

      {/* AI Productivity Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsAiTipsModalOpen(true)}
        className="fixed bottom-6 right-6 bg-amber-400 text-black p-4 rounded-full shadow-lg z-40 hover:bg-amber-300"
        aria-label="Get AI Productivity Tip"
        title="Dapatkan Tips Produktivitas (AI)"
      >
        <Lightbulb size={24} />
      </motion.button>
      
      {/* AI Tips Modal */}
      <AiTipsModal
        isOpen={isAiTipsModalOpen}
        onClose={() => setIsAiTipsModalOpen(false)}
        pageContext={getContextFromPath(location.pathname)}
      />

    </div>
  );
};

export default AdminLayout;

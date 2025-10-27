import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import PushNotificationManager from '../common/PushNotificationManager';
import { AnimatePresence, motion } from 'framer-motion';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 768);

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
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-base-100 p-6">
          {children}
        </main>
      </div>
      <PushNotificationManager />
    </div>
  );
};

export default AdminLayout;

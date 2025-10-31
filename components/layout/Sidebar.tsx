

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { LayoutDashboard, CalendarDays, Wallet, Users, Settings, Shield, CheckSquare, ClipboardList, MessageSquare, History, Archive, Briefcase, Calendar, FileText, MessagesSquare, GalleryHorizontal, Award, TrendingUp, Star, BookOpenCheck, Library, FolderKanban, Network } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminNavLinks = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { path: '/admin/schedule', label: 'Jadwal Booking', icon: <CalendarDays size={20} /> },
  { path: '/admin/finance', label: 'Pusat Keuangan', icon: <Wallet size={20} /> },
  { path: '/admin/clients', label: 'Data Klien', icon: <Users size={20} /> },
  { path: '/admin/users', label: 'Manajemen Staf', icon: <Shield size={20} /> },
  { path: '/admin/interns', label: 'Manajemen Magang', icon: <Briefcase size={20} /> },
  { path: '/admin/collaboration', label: 'Pusat Kolaborasi', icon: <Award size={20} /> },
  { path: '/admin/academy', label: 'Akademi', icon: <Library size={20} /> },
  { path: '/admin/community', label: 'Komunitas', icon: <Network size={20} /> },
  { path: '/admin/quiz-manager', label: 'Manajemen Kuis', icon: <BookOpenCheck size={20} /> },
  { path: '/admin/highlight-manager', label: 'Highlight Wall', icon: <GalleryHorizontal size={20} /> },
  { path: '/admin/assets', label: 'Manajemen Aset', icon: <FolderKanban size={20} /> },
  { path: '/admin/certificates', label: 'Sertifikat', icon: <Award size={20} /> },
  { path: '/admin/feedback', label: 'Ulasan Klien', icon: <MessageSquare size={20} /> },
  { path: '/admin/settings', label: 'Pengaturan', icon: <Settings size={20} /> },
  { path: '/admin/activity-log', label: 'Log Aktivitas', icon: <History size={20} /> },
];

const StaffNavLinks = [
  { path: '/staff/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { path: '/staff/schedule', label: 'Jadwal Booking', icon: <ClipboardList size={20} /> },
  { path: '/staff/clients', label: 'Data Klien', icon: <Users size={20} /> },
  { path: '/staff/finance', label: 'Keuangan', icon: <Wallet size={20} /> },
  { path: '/staff/tasks', label: 'Tugas Harian', icon: <CheckSquare size={20} /> },
  { path: '/staff/inventory', label: 'Cek Inventaris', icon: <Archive size={20} /> },
  { path: '/staff/mentoring', label: 'Mentoring', icon: <Briefcase size={20} /> },
  { path: '/staff/report', label: 'Laporan PKL', icon: <FileText size={20} /> },
  { path: '/staff/academy', label: 'Akademi', icon: <Library size={20} /> },
  { path: '/staff/community', label: 'Komunitas', icon: <Network size={20} /> },
  { path: '/staff/quiz-manager', label: 'Manajemen Kuis', icon: <BookOpenCheck size={20} /> },
  { path: '/staff/evaluation', label: 'Evaluasi Magang', icon: <Star size={20} /> },
  { path: '/staff/certificates', label: 'Sertifikat PKL', icon: <Award size={20} /> },
  { path: '/staff/highlight-manager', label: 'Highlight Wall', icon: <GalleryHorizontal size={20} /> },
  { path: '/staff/assets', label: 'Manajemen Aset', icon: <FolderKanban size={20} /> },
  { path: '/staff/chat', label: 'Chat', icon: <MessagesSquare size={20} /> },
];

const InternNavLinks = [
  { path: '/intern/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { path: '/intern/tasks', label: 'Tugas & Assignment', icon: <CheckSquare size={20} /> },
  { path: '/intern/attendance', label: 'Absensi Harian', icon: <Calendar size={20} /> },
  { path: '/intern/progress', label: 'Progres Harian', icon: <TrendingUp size={20} /> },
  { path: '/intern/report', label: 'Laporan Harian', icon: <ClipboardList size={20} /> },
  { path: '/intern/academy', label: 'Akademi', icon: <Library size={20} /> },
  { path: '/intern/community', label: 'Komunitas', icon: <Network size={20} /> },
  { path: '/intern/quiz', label: 'Kuis Interaktif', icon: <BookOpenCheck size={20} /> },
  { path: '/intern/chat', label: 'Chat dengan Mentor', icon: <MessagesSquare size={20} /> },
];

const NavLink: React.FC<{ to: string; icon: React.ReactNode; children: React.ReactNode }> = ({ to, icon, children }) => {
    const location = useLocation();
    const isActive = location.pathname.startsWith(to);

    return (
        <Link 
            to={to} 
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ease-in-out group ${isActive ? 'bg-accent text-white shadow-lg' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
        >
            <span className={isActive ? 'text-white' : 'text-white/60 group-hover:text-white transition-colors duration-200'}>{icon}</span>
            <span className="ml-4">{children}</span>
        </Link>
    );
}

const Sidebar = () => {
  const { user } = useAuth();
  
  const getNavLinks = () => {
      switch(user?.role) {
          case UserRole.Admin:
              return AdminNavLinks;
          case UserRole.AnakMagang:
          case UserRole.AnakPKL:
              return InternNavLinks;
          default:
              return StaffNavLinks;
      }
  };

  const navLinks = getNavLinks();

  return (
    <motion.aside
      // On mobile, it's an overlay. On desktop, it pushes content.
      // The parent `AdminLayout` handles the main content margin shift for desktop.
      initial={{ width: 0 }}
      animate={{ width: "16rem" }}
      exit={{ width: 0, transition: { duration: 0.2, ease: "easeInOut" } }}
      transition={{ type: "spring", stiffness: 400, damping: 40 }}
      className="bg-primary flex-shrink-0 overflow-hidden fixed inset-y-0 left-0 z-40 md:relative"
    >
      <div className="w-64 h-full flex flex-col p-4">
        <div className="flex flex-col items-center text-center p-4 border-b border-white/10 mb-4">
            {user?.photoURL ? (
                 <img src={user.photoURL} alt={user.name} className="w-16 h-16 rounded-full object-cover mb-3 border-2 border-white/20" />
            ) : (
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-2xl mb-3 border-2 border-white/20">
                    {user?.name?.charAt(0)}
                </div>
            )}
            <p className="font-semibold text-white truncate w-full">{user?.name}</p>
            <p className="text-xs text-white/60">{user?.role}</p>
        </div>

        <nav className="flex-grow space-y-2 overflow-y-auto pr-2">
          {navLinks.map(link => (
            <NavLink key={link.path} to={link.path} icon={link.icon}>{link.label}</NavLink>
          ))}
        </nav>
        <div className="shrink-0 p-2">
           <div className="bg-white/5 p-4 rounded-xl text-center">
              <p className="text-sm font-semibold text-white">Butuh Bantuan?</p>
              <p className="text-xs text-white/60 mt-1">Hubungi support kami jika ada kendala.</p>
              <a 
                href="https://wa.me/6285724025425"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center mt-3 text-xs bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-accent/90 w-full"
              >
                Hubungi Support
              </a>
           </div>
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
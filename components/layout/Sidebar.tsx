
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { LayoutDashboard, CalendarDays, Wallet, Users, Settings, Shield, CheckSquare, ClipboardList, MessageSquare, History, Archive } from 'lucide-react';

const AdminNavLinks = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { path: '/admin/schedule', label: 'Jadwal Booking', icon: <CalendarDays size={20} /> },
  { path: '/admin/finance', label: 'Pusat Keuangan', icon: <Wallet size={20} /> },
  { path: '/admin/clients', label: 'Data Klien', icon: <Users size={20} /> },
  { path: '/admin/users', label: 'Manajemen Staf', icon: <Shield size={20} /> },
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
  const navLinks = user?.role === UserRole.Admin ? AdminNavLinks : StaffNavLinks;

  return (
    <aside className="w-64 flex-shrink-0 p-4 bg-primary flex flex-col">
      <div className="flex items-center justify-center h-16 shrink-0">
        {/* Intentionally empty for spacing, logo is in header */}
      </div>
      <nav className="mt-6 flex-grow space-y-2">
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
    </aside>
  );
};

export default Sidebar;

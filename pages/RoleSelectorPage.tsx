import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { UserRole } from '../types';
import { ShieldCheck, User, Home, Briefcase } from 'lucide-react';

interface RoleCardProps {
    role: string;
    link: string;
    icon: React.ReactNode;
    description: string;
    themeClasses: {
        iconBg: string;
        hoverBorder: string;
    };
}

const RoleCard: React.FC<RoleCardProps> = ({ role, link, icon, description, themeClasses }) => (
    <Link to={link} className="w-full">
        <motion.div
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.98 }}
            className={`flex flex-col items-center justify-center p-8 rounded-2xl shadow-lg cursor-pointer transition-all bg-white border-2 border-transparent ${themeClasses.hoverBorder}`}
        >
            <div className={`p-4 ${themeClasses.iconBg} rounded-full mb-4 transition-colors`}>
                {icon}
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Login sebagai {role}</h2>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
        </motion.div>
    </Link>
);

const RoleSelectorPage = () => {
    const { user } = useAuth();

    if (user) {
        let dashboardPath = '/';
        switch (user.role) {
            case UserRole.Admin: dashboardPath = '/admin/dashboard'; break;
            case UserRole.Staff: dashboardPath = '/staff/dashboard'; break;
            case UserRole.AnakMagang:
            case UserRole.AnakPKL:
                dashboardPath = '/intern/dashboard'; break;
        }
        return <Navigate to={dashboardPath} />;
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center mb-12"
            >
                <h1 className="text-4xl font-extrabold text-slate-800">Studio 8 Management</h1>
                <p className="mt-2 text-gray-600">Silakan pilih peran Anda untuk masuk.</p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8"
            >
                <RoleCard
                    role="Admin"
                    link="/login?role=Admin"
                    icon={<ShieldCheck className="w-8 h-8 text-blue-600"/>}
                    description="Akses penuh ke sistem."
                    themeClasses={{
                        iconBg: 'bg-blue-100',
                        hoverBorder: 'hover:border-blue-500'
                    }}
                />
                <RoleCard
                    role="Staff"
                    link="/login?role=Staff"
                    icon={<User className="w-8 h-8 text-green-600"/>}
                    description="Kelola jadwal & tugas."
                     themeClasses={{
                        iconBg: 'bg-green-100',
                        hoverBorder: 'hover:border-green-500'
                    }}
                />
                 <RoleCard
                    role="Internship"
                    link="/intern-login"
                    icon={<Briefcase className="w-8 h-8 text-purple-600"/>}
                    description="Akses absensi & laporan."
                     themeClasses={{
                        iconBg: 'bg-purple-100',
                        hoverBorder: 'hover:border-purple-500'
                    }}
                />
            </motion.div>
             
             <div className="mt-12 text-center">
                 <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                    className="mb-4"
                >
                    <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-800 transition-colors">
                        <Home className="w-4 h-4 mr-2" />
                        Kembali ke Beranda
                    </Link>
                </motion.div>
                 <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="text-xs text-slate-500"
                 >
                    Akses hanya untuk internal Studio 8 yaa~
                 </motion.p>
            </div>
        </div>
    );
};

export default RoleSelectorPage;
import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { UserRole } from '../types';
import { ShieldCheck, User, Home } from 'lucide-react';

interface RoleCardProps {
    role: 'Admin' | 'Staff';
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
        const dashboardPath = user.role === UserRole.Admin ? '/admin/dashboard' : '/staff/dashboard';
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
                className="w-full max-w-lg flex flex-col md:flex-row gap-8"
            >
                <RoleCard
                    role="Admin"
                    link="/login?role=Admin"
                    icon={<ShieldCheck className="w-8 h-8 text-blue-600"/>}
                    description="Akses penuh ke sistem manajemen."
                    themeClasses={{
                        iconBg: 'bg-blue-100',
                        hoverBorder: 'hover:border-blue-500'
                    }}
                />
                <RoleCard
                    role="Staff"
                    link="/login?role=Staff"
                    icon={<User className="w-8 h-8 text-green-600"/>}
                    description="Lihat dan kelola jadwal harian."
                     themeClasses={{
                        iconBg: 'bg-green-100',
                        hoverBorder: 'hover:border-green-500'
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
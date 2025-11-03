import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRole } from '../types';
import { ShieldCheck, User, Briefcase, Eye, EyeOff, Loader2, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

// Role type for state management
type SelectedRole = 'Admin' | 'Staff' | 'Internship';

const roles: { name: SelectedRole; icon: React.ReactNode; description: string }[] = [
    { name: 'Admin', icon: <ShieldCheck className="w-6 h-6" />, description: 'Akses penuh ke sistem.' },
    { name: 'Staff', icon: <User className="w-6 h-6" />, description: 'Kelola jadwal & tugas.' },
    { name: 'Internship', icon: <Briefcase className="w-6 h-6" />, description: 'Akses absensi & laporan.' },
];

// KOMPONEN INI SEKARANG MENANGANI SEMUA PERAN
const StaffAdminLogin: React.FC<{ role: 'Admin' | 'Staff' | 'Internship' }> = ({ role }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login, loginWithGoogle, error: authError, isLoading, clearError } = useAuth();

    useEffect(() => {
        clearError();
        setUsername('');
        setPassword('');
    }, [role, clearError]);

    // FUNGSI INI DIPERBARUI
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) return;

        // Tentukan peran yang diizinkan berdasarkan 'role' prop
        let allowedRoles: UserRole[] = [];
        if (role === 'Admin') {
            allowedRoles = [UserRole.Admin];
        } else if (role === 'Staff') {
            allowedRoles = [UserRole.Staff];
        } else if (role === 'Internship') {
            allowedRoles = [UserRole.AnakMagang, UserRole.AnakPKL];
        }

        await login(username, password, allowedRoles);
    };
    
    // FUNGSI INI JUGA DIPERBARUI
    const handleGoogleLogin = async () => {
        // Tentukan peran yang diizinkan berdasarkan 'role' prop
        let allowedRoles: UserRole[] = [];
        if (role === 'Admin') {
            allowedRoles = [UserRole.Admin];
        } else if (role === 'Staff') {
            allowedRoles = [UserRole.Staff];
        } else if (role === 'Internship') {
            allowedRoles = [UserRole.AnakMagang, UserRole.AnakPKL];
        }
        
        await loginWithGoogle(allowedRoles);
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-primary">Selamat Datang!</h1>
                <p className="mt-1 text-muted">Login sebagai <span className="font-semibold">{role}</span> untuk melanjutkan.</p>
            </div>
            
            {authError && <p className="text-sm text-error text-center bg-error/10 p-3 rounded-lg">{authError}</p>}

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                <div>
                    <label className="text-sm font-medium text-gray-700">Username</label>
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="mt-1 w-full p-3 border rounded-lg bg-base-100 focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700">Password</label>
                    <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 w-full p-3 border rounded-lg bg-base-100 focus:outline-none focus:ring-2 focus:ring-accent" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 bg-primary text-primary-content font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50">
                    {isLoading ? <Loader2 className="animate-spin" /> : 'Masuk'}
                </motion.button>
            </form>

            <div className="relative flex items-center">
                <div className="flex-grow border-t"></div><span className="flex-shrink mx-4 text-xs text-muted uppercase">Atau</span><div className="flex-grow border-t"></div>
            </div>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" disabled={isLoading} onClick={handleGoogleLogin} className="w-full flex justify-center items-center py-3 px-4 border text-sm font-medium rounded-lg hover:bg-base-100">
                <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.136,44,30.022,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
                Masuk dengan Google
            </motion.button>
        </div>
    );
};

// KOMPONEN InternLogin TELAH DIHAPUS

const RoleSelectorPage = () => {
    const { user } = useAuth();
    const [selectedRole, setSelectedRole] = useState<SelectedRole>('Staff');
    
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

    // FUNGSI INI DIPERBARUI
    const renderLoginContent = () => {
        switch (selectedRole) {
            case 'Admin': return <StaffAdminLogin role="Admin" />;
            case 'Staff': return <StaffAdminLogin role="Staff" />;
            case 'Internship': return <StaffAdminLogin role="Internship" />; // Menggunakan StaffAdminLogin
            default: return null;
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-base-100 p-4 text-base-content">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-base-200/50">
                {/* Left Pane */}
                <div className="w-full md:w-2/5 bg-base-100/30 p-8 border-b md:border-b-0 md:border-r">
                    <div className="mb-8">
                        <h1 className="font-bold text-2xl text-primary">STUDIO 8</h1>
                        <p className="text-muted mt-1">Pilih peran Anda untuk masuk ke sistem.</p>
                    </div>
                    <div className="space-y-3">
                        {roles.map((role) => (
                            <button
                                key={role.name}
                                onClick={() => setSelectedRole(role.name)}
                                className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${selectedRole === role.name ? 'bg-primary text-white shadow-lg' : 'bg-white hover:bg-base-100'}`}
                            >
                                <div className={`p-3 rounded-lg ${selectedRole === role.name ? 'bg-white/10' : 'bg-primary/10 text-primary'}`}>
                                    {role.icon}
                                </div>
                                <div>
                                    <h3 className="font-bold">{role.name}</h3>
                                    <p className={`text-sm ${selectedRole === role.name ? 'text-white/70' : 'text-muted'}`}>{role.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                     <div className="mt-8 text-center border-t pt-4">
                        <Link to="/" className="inline-flex items-center text-sm text-muted hover:text-primary transition-colors">
                            <Home className="w-4 h-4 mr-2" />
                            Kembali ke Beranda
                        </Link>
                    </div>
                </div>
                {/* Right Pane */}
                <div className="w-full md:w-3/5 p-8 flex flex-col justify-center min-h-[550px]">
                    <AnimatePresence mode="wait">
                         <motion.div
                            key={selectedRole}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {renderLoginContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default RoleSelectorPage;
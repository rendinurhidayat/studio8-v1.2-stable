import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserRole } from '../../types';

const InternLoginPage = () => {
    const { loginWithGoogle, user, error: authError, clearError } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState('');

    useEffect(() => {
        clearError();
    }, [clearError]);

    useEffect(() => {
        if (authError) {
            setApiError(authError);
            setIsLoading(false);
        }
    }, [authError]);

    const handleGoogleLogin = async () => {
        setApiError('');
        setIsLoading(true);
        try {
            await loginWithGoogle();
        } catch (error: any) {
            let errorMessage = 'Gagal masuk dengan Google. Pastikan akun Anda sudah terdaftar oleh admin.';
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'Jendela login Google ditutup. Silakan coba lagi.';
            } else if (error.code === 'auth/account-exists-with-different-credential') {
                errorMessage = 'Akun dengan email ini sudah ada, coba login dengan metode lain.';
            }
            setApiError(errorMessage);
            setIsLoading(false);
        }
    };

    if (user) {
        if (user.role === UserRole.AnakMagang || user.role === UserRole.AnakPKL) {
            return <Navigate to="/intern/dashboard" />;
        } else {
             if (!apiError) {
                setApiError(`Akun ini terdaftar sebagai ${user.role}. Hanya role magang/PKL yang diizinkan.`);
             }
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-base-100 p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-sm p-8 space-y-6 bg-white rounded-2xl shadow-xl relative border border-base-200"
            >
                 <Link to="/auth" className="absolute top-4 left-4 text-muted hover:text-base-content">
                    <ArrowLeft />
                </Link>
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-primary">STUDIO 8</h1>
                    <p className="mt-2 text-muted">Intern Dashboard ✨</p>
                    <p className="text-sm text-muted">Login dengan akun Google yang terdaftar</p>
                </div>

                {apiError && <p className="text-sm text-error text-center">{apiError}</p>}

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    disabled={isLoading}
                    onClick={handleGoogleLogin}
                    className="group relative w-full flex justify-center items-center py-3 px-4 border border-base-300 text-sm font-medium rounded-xl text-base-content bg-white hover:bg-base-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-60 transition-colors"
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : (
                        <>
                            <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
                                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.136,44,30.022,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                            </svg>
                            Masuk dengan Google
                        </>
                    )}
                </motion.button>
                 <div className="text-center mt-4 border-t pt-4 border-base-200">
                    <Link to="/" className="inline-flex items-center text-sm text-muted hover:text-base-content transition-colors">
                        <Home className="w-4 h-4 mr-2" />
                        Kembali ke Beranda
                    </Link>
                </div>
            </motion.div>
        </div>
    );
};

export default InternLoginPage;

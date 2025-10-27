

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserRole } from '../types';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [errors, setErrors] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWithGoogle, user, error: authError, clearError } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const role = searchParams.get('role');

  const getDashboardPath = (role: UserRole) => {
      switch (role) {
          case UserRole.Admin: return '/admin/dashboard';
          case UserRole.Staff: return '/staff/dashboard';
          case UserRole.AnakMagang:
          case UserRole.AnakPKL:
              return '/intern/dashboard';
          default: return '/';
      }
  }

  useEffect(() => {
    if (!role || !Object.values(UserRole).includes(role as UserRole)) {
        navigate('/auth');
    }
    // Clear any auth errors when component mounts or role changes
    clearError();
  }, [role, navigate, clearError]);
  
  useEffect(() => {
    if (authError) {
      setApiError(authError);
      setIsLoading(false); // Stop loading if context reports an error
    }
  }, [authError]);


  const validateField = (field: 'username' | 'password', value: string) => {
    let message = '';
    if (!value.trim()) {
        message = 'Field ini tidak boleh kosong.';
    }
    setErrors(prev => ({ ...prev, [field]: message }));
    return !message;
  };

  const validateAll = (): boolean => {
    const isUsernameValid = validateField('username', username);
    const isPasswordValid = validateField('password', password);
    return isUsernameValid && isPasswordValid;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (!validateAll()) {
      return;
    }
    
    setIsLoading(true);
    try {
        await login(username, password);
    } catch (error: any) {
        console.error("Login Gagal:", error);
        let errorMessage = 'Terjadi kesalahan saat mencoba masuk.';

        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/invalid-credential':
            case 'auth/wrong-password':
                errorMessage = 'Username atau password salah.';
                break;
            case 'permission-denied':
                errorMessage = 'Kesalahan izin. Hubungi administrator untuk memeriksa aturan keamanan.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
                break;
            case 'auth/invalid-api-key':
                errorMessage = 'API Key tidak valid. Periksa file konfigurasi Firebase Anda.';
                break;
            default:
                console.log(`Unhandled error code: ${error.code}`);
                break;
        }
        
        setApiError(errorMessage);
        setIsLoading(false);
    }
  };
  
  const handleGoogleLogin = async () => {
    setApiError('');
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      console.error("Google Login Failed:", error);
      let errorMessage = 'Gagal masuk dengan Google. Pastikan akun Anda sudah terdaftar oleh admin.';

      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Jendela login Google ditutup. Silakan coba lagi.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'Akun dengan email ini sudah ada, coba login dengan metode lain.';
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'Domain aplikasi ini tidak diizinkan untuk otentikasi. Mohon hubungi administrator untuk menambahkan domain ini ke daftar yang diizinkan di Firebase.';
      }
      setApiError(errorMessage);
      setIsLoading(false);
    }
    // Don't set isLoading to false here in the finally block anymore,
    // because the AuthContext's isLoading state is the source of truth
    // during the auth state change process. The useEffect for authError
    // will handle it if something goes wrong.
  };
  
  if (user) {
      if (user.role === role) {
        const dashboardPath = getDashboardPath(user.role);
        return <Navigate to={dashboardPath} />;
      } else {
         if (!apiError) {
            setApiError(`Akun ini terdaftar sebagai ${user.role}, bukan ${role}. Silakan logout dan coba lagi.`);
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
            <h1 className="text-3xl font-bold text-primary">Studio 8</h1>
            <p className="mt-2 text-muted">Selamat datang kembali ✨</p>
            <p className="text-sm text-muted">Login sebagai <span className="font-bold text-base-content">{role}</span></p>
        </div>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <div className="relative">
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => {
                    setUsername(e.target.value);
                    if (errors.username) validateField('username', e.target.value);
                }}
                onBlur={(e) => validateField('username', e.target.value)}
                className={`peer h-12 w-full border rounded-xl text-base-content bg-base-100 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-accent transition-colors ${errors.username ? 'border-error' : 'border-base-300 focus:border-accent'}`}
                placeholder="Username"
              />
              <label htmlFor="username" className="absolute left-3 -top-2.5 bg-white px-1 text-muted text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-muted peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-accent peer-focus:text-sm">
                  Username
              </label>
            </div>
            {errors.username && <p className="text-xs text-error mt-1">{errors.username}</p>}
          </div>
          <div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) validateField('password', e.target.value);
                }}
                onBlur={(e) => validateField('password', e.target.value)}
                className={`peer h-12 w-full border rounded-xl text-base-content bg-base-100 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-accent transition-colors ${errors.password ? 'border-error' : 'border-base-300 focus:border-accent'}`}
                placeholder="Password"
              />
               <label htmlFor="password" className="absolute left-3 -top-2.5 bg-white px-1 text-muted text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-muted peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-accent peer-focus:text-sm">
                  Password
              </label>
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-muted hover:text-base-content transition-colors">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
             {errors.password && <p className="text-xs text-error mt-1">{errors.password}</p>}
          </div>

          {apiError && <p className="text-sm text-error text-center">{apiError}</p>}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-primary-content bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors shadow-lg"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : 'Masuk'}
            </button>
          </div>
        </form>

        <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-base-200"></div>
            <span className="flex-shrink mx-4 text-xs text-muted uppercase">Atau</span>
            <div className="flex-grow border-t border-base-200"></div>
        </div>
        
        <button
            type="button"
            disabled={isLoading}
            onClick={handleGoogleLogin}
            className="group relative w-full flex justify-center py-3 px-4 border border-base-300 text-sm font-medium rounded-xl text-base-content bg-white hover:bg-base-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-60 transition-colors"
        >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.136,44,30.022,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
            </svg>
            Masuk dengan Google
        </button>

         <p className="text-xs text-center text-muted pt-2">Masuk ke sistem, atur jadwal & senyum klien hari ini 😄</p>
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

export default LoginPage;
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { auth, db, GoogleAuthProvider } from '../firebase';
import { 
    onAuthStateChanged, 
    signOut, 
    signInWithEmailAndPassword, 
    signInWithPopup,
    User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, query, collection, where, getDocs, limit, DocumentData } from 'firebase/firestore';
import { User, UserRole } from '../types';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    error: string | null;
    login: (emailOrUsername: string, password: string, role?: UserRole | string | null) => Promise<void>;
    loginWithGoogle: (allowedRoles?: UserRole[]) => Promise<void>;
    logout: () => Promise<void>;
    clearError: () => void;
    setError: (error: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setIsLoading(true);
            
            if (firebaseUser) {
                try {
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        const data = userDoc.data() as DocumentData;
                        
                        const appUser: User = {
                            id: firebaseUser.uid,
                            name: data.name || 'No Name',
                            email: data.email || firebaseUser.email!,
                            role: data.role,
                            photoURL: firebaseUser.photoURL || data.photoURL || undefined,
                            username: data.username,
                            asalSekolah: data.asalSekolah,
                            jurusan: data.jurusan,
                            startDate: data.startDate?.toDate(),
                            endDate: data.endDate?.toDate(),
                            totalPoints: data.totalPoints
                        };
                        setUser(appUser);
                        setError(null);
                    } else {
                        await signOut(auth);
                        setUser(null);
                        setError('Akun Anda tidak ditemukan di database kami.');
                    }
                } catch (e: any) {
                    await signOut(auth);
                    setUser(null);
                    setError('Gagal memuat data pengguna.');
                }
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (emailOrUsername: string, password: string, role?: UserRole | string | null) => {
        setError(null);
        setIsLoading(true);
        try {
            let email = emailOrUsername.trim();
            if (!email.includes('@')) {
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('username', '==', email.toLowerCase()), limit(1));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    throw { code: 'auth/user-not-found' };
                }
                email = snapshot.docs[0].data().email;
            }
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;
            if (firebaseUser && role) {
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data() as Omit<User, 'id'>;
                    if (userData.role !== role) {
                        await signOut(auth);
                        throw new Error(`Akun ini terdaftar sebagai ${userData.role}, bukan ${role}.`);
                    }
                }
            }
        } catch (err: any) {
            let errorMessage = err.message || 'Terjadi kesalahan saat mencoba masuk.';
            if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
                errorMessage = 'Username atau password salah.';
            }
            setError(errorMessage);
            setIsLoading(false);
        }
    };

    const loginWithGoogle = async (allowedRoles?: UserRole[]) => {
        setError(null);
        setIsLoading(true);
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const firebaseUser = result.user;
            if (!firebaseUser) {
                throw new Error("Gagal mendapatkan informasi user dari Google.");
            }
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
                await signOut(auth);
                throw { code: 'auth/user-not-found', message: 'Akun Google Anda tidak terdaftar. Silakan hubungi admin.' };
            }

            if (allowedRoles && allowedRoles.length > 0) {
                 const userData = userDoc.data() as Omit<User, 'id'>;
                 if (!allowedRoles.includes(userData.role)) {
                    await signOut(auth);
                    throw new Error(`Akun ini terdaftar sebagai ${userData.role}. Hanya peran ${allowedRoles.join(' atau ')} yang diizinkan.`);
                 }
            }
        } catch (err: any) {
            let errorMessage = err.message || 'Gagal masuk dengan Google.';
            if (err.code === 'auth/popup-closed-by-user') {
                errorMessage = 'Jendela login Google ditutup. Silakan coba lagi.';
            }
            setError(errorMessage);
            setIsLoading(false);
        }
    };
    
    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            setError(null);
        } catch (err: any) {
            setError('Gagal untuk logout.');
        }
    };

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const value = {
        user,
        isLoading,
        error,
        login,
        loginWithGoogle,
        logout,
        clearError,
        setError,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
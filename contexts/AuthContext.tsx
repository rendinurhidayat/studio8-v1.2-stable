
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { auth, db } from '../firebase'; // Import dari file firebase.ts
// FIX: Switched to Firebase v8 compatibility syntax to resolve module export errors.
// FIX: Use 'compat' imports for Firebase v9 compatibility mode.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const clearError = () => setError(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: firebase.User | null) => {
      try {
        if (firebaseUser) {
            let userDocSnap = await db.collection("users").doc(firebaseUser.uid).get();

            if (!userDocSnap.exists && firebaseUser.email) {
                console.log(`User not found by UID (${firebaseUser.uid}), attempting lookup by email: ${firebaseUser.email}`);
                const usersQuery = await db.collection("users").where('email', '==', firebaseUser.email).limit(1).get();
                if (!usersQuery.empty) {
                    userDocSnap = usersQuery.docs[0];
                }
            }
            
            if (userDocSnap.exists) {
              const userData = { id: userDocSnap.id, ...userDocSnap.data() } as User;
              setUser(userData);
              localStorage.setItem('studio8-user', JSON.stringify(userData));
              setError(null);
            } else {
              console.warn("User authenticated but not found in Firestore by UID or email. Preventing login. Email:", firebaseUser.email);
              setError("Akun Google Anda berhasil diautentikasi, namun profil tidak ditemukan di sistem kami. Mohon pastikan admin telah mendaftarkan email Anda.");
              setUser(null);
              localStorage.removeItem('studio8-user');
            }
        } else {
          setUser(null);
          localStorage.removeItem('studio8-user');
          setError(null); // Clear error on successful sign out
        }
      } catch (dbError: any) {
          console.error("Error fetching user profile from Firestore:", dbError);
          setError("Gagal memverifikasi profil pengguna dari database. Coba lagi nanti.");
          setUser(null);
          localStorage.removeItem('studio8-user');
      } finally {
          setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    setError(null);
    const usersRef = db.collection('users');
    const querySnapshot = await usersRef.where('username', '==', username.toLowerCase()).limit(1).get();

    if (querySnapshot.empty) {
      const error = new Error("User not found with this username.");
      (error as any).code = 'auth/user-not-found';
      throw error;
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    const email = userData.email;

    if (!email) {
      console.error(`User document for username '${username}' is missing an email field.`);
      const error = new Error("Configuration error for user account.");
      (error as any).code = 'auth/internal-error';
      throw error;
    }
    
    await auth.signInWithEmailAndPassword(email, password);
  };

  const loginWithGoogle = async (): Promise<void> => {
    setError(null);
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      await auth.signInWithPopup(provider);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      throw error;
    }
  };

  const logout = async () => {
    await auth.signOut();
    setError(null);
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, loginWithGoogle, logout, clearError }}>
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

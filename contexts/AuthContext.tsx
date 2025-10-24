
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
  login: (username: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Listener ini berjalan saat komponen pertama kali dimuat & setiap kali status auth berubah
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: firebase.User | null) => {
      if (firebaseUser) {
        // Pengguna berhasil login di Firebase.
        // Coba ambil data via UID dulu (untuk user email/password).
        let userDocSnap = await db.collection("users").doc(firebaseUser.uid).get();

        // Jika tidak ketemu via UID (kemungkinan login via Google), coba cari via email.
        if (!userDocSnap.exists && firebaseUser.email) {
            console.log(`User not found by UID (${firebaseUser.uid}), attempting lookup by email: ${firebaseUser.email}`);
            const usersQuery = await db.collection("users").where('email', '==', firebaseUser.email).limit(1).get();
            if (!usersQuery.empty) {
                userDocSnap = usersQuery.docs[0];
            }
        }
        
        if (userDocSnap.exists) {
          // Gabungkan data dari Firestore dengan uid dari Firebase Auth
          const userData = { id: userDocSnap.id, ...userDocSnap.data() } as User;
          setUser(userData);
          localStorage.setItem('studio8-user', JSON.stringify(userData));
        } else {
          // User is authenticated with a provider (e.g., Google) but doesn't have a profile in our system.
          // This is a security measure: only pre-approved users can access the dashboard.
          // We sign them out to prevent unauthorized access. An admin must create their user profile first.
          console.warn("User authenticated but not found in Firestore by UID or email. Signing out. Email:", firebaseUser.email);
          await auth.signOut();
          setUser(null);
        }
      } else {
        // Pengguna logout.
        setUser(null);
        localStorage.removeItem('studio8-user');
      }
      setIsLoading(false);
    });

    // Cleanup listener saat komponen di-unmount
    return () => unsubscribe();
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    // Note: This logic is updated to support login via username.
    // It first finds the user's email from Firestore based on the username,
    // then uses that email to authenticate with Firebase Auth.
    const usersRef = db.collection('users');
    const querySnapshot = await usersRef.where('username', '==', username.toLowerCase()).limit(1).get();

    if (querySnapshot.empty) {
      // To prevent username enumeration attacks, we throw an error that the login page
      // will interpret as a generic "invalid credentials" message.
      const error = new Error("User not found with this username.");
      (error as any).code = 'auth/user-not-found';
      throw error;
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    const email = userData.email;

    if (!email) {
      // This is a data consistency error on the backend.
      console.error(`User document for username '${username}' is missing an email field.`);
      const error = new Error("Configuration error for user account.");
      (error as any).code = 'auth/internal-error'; // A generic code for the login page
      throw error;
    }
    
    // Now, attempt to sign in using the retrieved email and provided password.
    // The LoginPage is already set up to handle common Firebase Auth errors
    // like 'auth/wrong-password' and show a generic message.
    await auth.signInWithEmailAndPassword(email, password);
    // If successful, onAuthStateChanged will automatically handle fetching the full user profile and navigating.
  };

  const loginWithGoogle = async (): Promise<void> => {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      await auth.signInWithPopup(provider);
      // If successful, onAuthStateChanged will handle fetching user data.
      // If the user document doesn't exist in Firestore, onAuthStateChanged will sign them out.
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      // Re-throw the error for the login page to handle UI feedback.
      throw error;
    }
  };

  const logout = async () => {
    await auth.signOut();
    // onAuthStateChanged akan menangani pembersihan state user
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithGoogle, logout }}>
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

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, DocumentSnapshot, initializeFirestore, CACHE_SIZE_UNLIMITED, Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';

// This allows us to check for a config injected at build time.
declare global {
    interface Window {
        firebaseConfig?: any;
    }
}

// This configuration is for local development ONLY.
// In a deployed environment, the configuration is injected via index.html
const localDevFirebaseConfig = {
  apiKey: "AIzaSyBq6T-Zwo39mOTIqHLaa6d1zYPIIQH0g34",
  authDomain: "studio-8-manager-ec159.firebaseapp.com",
  projectId: "studio-8-manager-ec159",
  storageBucket: "studio-8-manager-ec159.appspot.com",
  messagingSenderId: "433216636123",
  appId: "1:433216636123:web:6f05722c4617f1d44c78fe",
  measurementId: "G-Z68L1FS2NQ"
};

// Use the injected config from index.html if it's available and not a placeholder.
// Otherwise, fall back to the local development config.
const firebaseConfig = 
  window.firebaseConfig && window.firebaseConfig.apiKey && !window.firebaseConfig.apiKey.startsWith('__FIREBASE') 
  ? window.firebaseConfig 
  : localDevFirebaseConfig;

// Inisialisasi Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Warn the developer if they are using placeholder/local keys.
if (firebaseConfig.apiKey.startsWith("AIzaSyB") || (window.firebaseConfig && window.firebaseConfig.apiKey.startsWith("__FIREBASE"))) {
   console.warn(
      "=======================================================================\n" +
      "WARNING: Firebase is using placeholder/local credentials.\n" +
      "This is okay for local development, but will fail on deployment.\n" +
      "Ensure your CI/CD process correctly replaces the placeholders in index.html.\n" +
      "======================================================================="
  );
}

// Ekspor layanan yang akan digunakan di seluruh aplikasi
const auth = getAuth(app);
const storage = getStorage(app);
const messaging = getMessaging(app);

// Apply experimental settings to mitigate potential connectivity issues in certain environments (e.g., Vercel deployments).
// This forces Firestore to use HTTP long-polling instead of WebSockets.
// It must be called before any other Firestore operations are initiated.
let db: Firestore;
try {
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    });
} catch (error) {
    if (error instanceof Error && (error as any).code === 'failed-precondition') {
        // This error is expected in hot-reload development environments where settings cannot be changed after the first use.
        console.warn('Firestore settings were not applied, likely due to hot-reloading. Using existing instance.');
        db = getFirestore(app);
    } else {
        console.error('An unexpected error occurred while initializing Firestore:', error);
        // Fallback to default instance
        db = getFirestore(app);
    }
}


export { app, auth, db, storage, messaging, GoogleAuthProvider };
export type { DocumentSnapshot };
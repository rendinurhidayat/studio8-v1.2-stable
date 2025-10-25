// FIX: Updated imports to use Firebase v9 compatibility layer to resolve namespace errors.
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";

// This configuration is for local development ONLY.
// In a deployed environment, the configuration is injected via index.html
const localDevFirebaseConfig = {
  apiKey: "AIzaSyBq6T-Zwo39mOTIqHLaa6d1zYPIIQH0g34",
  authDomain: "studio-8-manager-ec159.firebaseapp.com",
  projectId: "studio-8-manager-ec159",
  storageBucket: "studio-8-manager-ec159.firebasestorage.app",
  messagingSenderId: "433216636123",
  appId: "1:433216636123:web:6f05722c4617f1d44c78fe",
  measurementId: "G-Z68L1FS2NQ"
};

// Use the injected config from index.html if it's available and not a placeholder.
// Otherwise, fall back to the local development config.
const firebaseConfig = 
  window.firebaseConfig && !window.firebaseConfig.apiKey.startsWith('__FIREBASE') 
  ? window.firebaseConfig 
  : localDevFirebaseConfig;

// Inisialisasi Firebase
if (!firebase.apps.length) {
  // Warn the developer if they are using placeholder/local keys.
  if (firebaseConfig.apiKey.startsWith("AIzaSyB") || firebaseConfig.apiKey.startsWith("__FIREBASE")) {
     console.warn(
        "=======================================================================\n" +
        "WARNING: Firebase is using placeholder credentials.\n" +
        "This is okay for local development, but will fail on deployment.\n" +
        "Ensure your CI/CD process correctly replaces the placeholders in index.html.\n" +
        "======================================================================="
    );
  }
  firebase.initializeApp(firebaseConfig);
}

// Ekspor layanan yang akan digunakan di seluruh aplikasi
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Apply experimental settings to mitigate potential connectivity issues in certain environments (e.g., Vercel deployments).
// This forces Firestore to use HTTP long-polling instead of WebSockets, which can be more reliable if WebSockets are blocked or unstable.
// This must be called before any other Firestore operations are initiated.
try {
  // FIX: Removed 'useFetchStreams' as it does not exist in the Firestore 'Settings' type.
  db.settings({
    experimentalForceLongPolling: true,
  });
} catch (error) {
  if (error instanceof Error && (error as any).code === 'failed-precondition') {
    // This error is expected in hot-reload development environments where settings cannot be changed after the first use.
    // It is safe to ignore in this context.
    console.warn('Firestore settings were not applied, likely due to hot-reloading. This is expected in development.');
  } else {
    console.error('An unexpected error occurred while applying Firestore settings:', error);
  }
}

export { auth, db, storage, firebaseConfig };
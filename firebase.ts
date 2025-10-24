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
export const firebaseConfig = 
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
export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Configuración de Firebase para Tour Challenger Tejo 2026
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoKeyTourChallengerTejo2026",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "tour-challenger-tejo.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://tour-challenger-tejo-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "tour-challenger-tejo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "tour-challenger-tejo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456"
};

let app;
let db;
let firebaseInitialized = false;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getDatabase(app);
  firebaseInitialized = true;
} catch (error) {
  console.warn('Firebase no pudo inicializarse con el servidor remoto. Operando en modo local resiliente.', error);
}

export { app, db, firebaseInitialized };

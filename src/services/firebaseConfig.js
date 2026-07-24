import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Configuración REAL de Firebase — Tour Challenger Tejo 2026
const firebaseConfig = {
  apiKey: "AIzaSyAPH09io4cgwiABYz_-WTwOIwxtyOocZOI",
  authDomain: "tour-challenger-tejo.firebaseapp.com",
  databaseURL: "https://tour-challenger-tejo-default-rtdb.firebaseio.com",
  projectId: "tour-challenger-tejo",
  storageBucket: "tour-challenger-tejo.firebasestorage.app",
  messagingSenderId: "801673622563",
  appId: "1:801673622563:web:f03f2ea8d3653f1a752d96"
};

let app;
let db;
let firebaseInitialized = false;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getDatabase(app);
  firebaseInitialized = true;
  console.log('✅ Firebase conectado — Realtime Database activo');
} catch (error) {
  console.warn('⚠️ Firebase no pudo inicializarse. Operando en modo local.', error);
}

export { app, db, firebaseInitialized };

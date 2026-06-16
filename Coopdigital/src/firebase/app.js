import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { firebaseConfig, isFirebaseConfigured } from '../config/firebase.config.js';

let app;

export function getFirebaseApp() {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase no está configurado. Defina window.COOPDIGITAL_FIREBASE_CONFIG antes de cargar la app o complete src/config/firebase.config.js.');
  }
  if (!app) app = initializeApp(firebaseConfig);
  return app;
}

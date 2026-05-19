import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Reemplazá estos valores por los de tu proyecto Firebase.
// Si quedan placeholders, la autenticación y Firestore no funcionarán.
const firebaseConfig = {
  apiKey: 'REEMPLAZAR_API_KEY',
  authDomain: 'REEMPLAZAR_AUTH_DOMAIN',
  projectId: 'REEMPLAZAR_PROJECT_ID',
  storageBucket: 'REEMPLAZAR_STORAGE_BUCKET',
  messagingSenderId: 'REEMPLAZAR_SENDER_ID',
  appId: 'REEMPLAZAR_APP_ID'
};

export const isFirebaseConfigured = !Object.values(firebaseConfig).some((value) =>
  String(value).startsWith('REEMPLAZAR_')
);

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

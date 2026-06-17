import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-storage.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAGVwye2zQoxG_eWjj0JzJAyFJ5vNg85jA',
  authDomain: 'coopdigital-dev.firebaseapp.com',
  projectId: 'coopdigital-dev',
  storageBucket: 'coopdigital-dev.firebasestorage.app',
  messagingSenderId: '640065202456',
  appId: '1:640065202456:web:df260e48f59b167f03966d'
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

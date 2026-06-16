import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getFirebaseApp } from './app.js';
export const firestore = () => getFirestore(getFirebaseApp());

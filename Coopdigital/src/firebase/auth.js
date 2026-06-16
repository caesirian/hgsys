import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirebaseApp } from './app.js';
export const auth = () => getAuth(getFirebaseApp());

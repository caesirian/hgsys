import { getStorage } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';
import { getFirebaseApp } from './app.js';
export const storage = () => getStorage(getFirebaseApp());

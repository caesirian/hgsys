import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { firestore } from '../firebase/firestore.js';

export const cooperativaService = {
  async getCurrent(user) {
    const snap = await getDoc(doc(firestore(), 'cooperativas', user.cooperativaId));
    if (!snap.exists()) throw new Error('La cooperativa no existe o no está habilitada.');
    return { id: snap.id, ...snap.data() };
  }
};

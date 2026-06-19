import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';
import { db } from '../firebase/firebase.config.js';
import { APP_CONFIG } from '../config/app.config.js';
import { authStore } from '../stores/auth.store.js';

function col(name) {
  return collection(db, 'cooperativas', APP_CONFIG.cooperativaId, name);
}

function snap(querySnap) {
  return querySnap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function auditCreate() {
  return {
    creadoPor: authStore.get()?.uid ?? 'sistema',
    fechaCreacion: serverTimestamp(),
    modificadoPor: authStore.get()?.uid ?? 'sistema',
    fechaModificacion: serverTimestamp(),
    cooperativaId: APP_CONFIG.cooperativaId
  };
}

function auditUpdate() {
  return {
    modificadoPor: authStore.get()?.uid ?? 'sistema',
    fechaModificacion: serverTimestamp()
  };
}

export const firestoreDb = {
  // Sin orderBy: no requiere índices compuestos en Firestore.
  async list(colName) {
    return snap(await getDocs(col(colName)));
  },

  async create(colName, data) {
    const payload = { ...data, ...auditCreate() };
    const ref = await addDoc(col(colName), payload);
    return { id: ref.id, ...payload };
  },

  async update(colName, id, data) {
    const ref = doc(db, 'cooperativas', APP_CONFIG.cooperativaId, colName, id);
    const payload = { ...data, ...auditUpdate() };
    await updateDoc(ref, payload);
    return { id, ...payload };
  },

  async remove(colName, id) {
    const ref = doc(db, 'cooperativas', APP_CONFIG.cooperativaId, colName, id);
    await deleteDoc(ref);
    return id;
  },

  async get(colName, id) {
    const ref = doc(db, 'cooperativas', APP_CONFIG.cooperativaId, colName, id);
    const s = await getDoc(ref);
    return s.exists() ? { id: s.id, ...s.data() } : null;
  }
};

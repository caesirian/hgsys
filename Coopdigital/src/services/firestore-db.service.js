import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';
import { db } from '../firebase/firebase.config.js';
import { APP_CONFIG } from '../config/app.config.js';
import { authStore } from '../stores/auth.store.js';

// Devuelve la referencia a una subcolección dentro de la cooperativa activa.
function col(name) {
  return collection(db, 'cooperativas', APP_CONFIG.cooperativaId, name);
}

// Convierte un QuerySnapshot en un array plano con el id del documento incluido.
function snap(querySnap) {
  return querySnap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Campos de auditoría que se agregan en cada escritura.
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
  // Lee todos los documentos de una colección, ordenados por fechaCreacion desc.
  async list(colName) {
    const q = query(col(colName), orderBy('fechaCreacion', 'desc'));
    return snap(await getDocs(q));
  },

  // Crea un nuevo documento con campos de auditoría.
  async create(colName, data) {
    const payload = { ...data, ...auditCreate() };
    const ref = await addDoc(col(colName), payload);
    return { id: ref.id, ...payload };
  },

  // Actualiza un documento existente.
  async update(colName, id, data) {
    const ref = doc(db, 'cooperativas', APP_CONFIG.cooperativaId, colName, id);
    const payload = { ...data, ...auditUpdate() };
    await updateDoc(ref, payload);
    return { id, ...payload };
  },

  // Elimina un documento.
  async remove(colName, id) {
    const ref = doc(db, 'cooperativas', APP_CONFIG.cooperativaId, colName, id);
    await deleteDoc(ref);
    return id;
  },

  // Lee un único documento por id.
  async get(colName, id) {
    const ref = doc(db, 'cooperativas', APP_CONFIG.cooperativaId, colName, id);
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }
};

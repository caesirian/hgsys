import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';
import { db } from '../firebase/firebase.config.js';
import { authStore } from '../stores/auth.store.js';

// El cooperativaId NUNCA es una constante fija: viene del perfil del
// usuario en sesión (resuelto vía usuariosIndex en auth.service.js). Esto
// es lo que aísla los datos de cada cooperativa entre sí (multi-tenant).
function cooperativaId() {
  const id = authStore.get()?.cooperativaId;
  if (!id) throw new Error('No hay una cooperativa activa en la sesión.');
  return id;
}

function col(name) {
  return collection(db, 'cooperativas', cooperativaId(), name);
}

// Subcolección de un documento dentro de la cooperativa activa, p. ej.
// gastosARendir/{gastoId}/firmas. Uso puntual (una única subcolección real
// en el sistema hoy); si se repite en más módulos, evaluar generalizar
// firestoreDb con un helper de nivel más alto.
function subCol(parentColName, parentId, subName) {
  return collection(db, 'cooperativas', cooperativaId(), parentColName, parentId, subName);
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
    cooperativaId: cooperativaId()
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
    const ref = doc(db, 'cooperativas', cooperativaId(), colName, id);
    const payload = { ...data, ...auditUpdate() };
    await updateDoc(ref, payload);
    return { id, ...payload };
  },

  async remove(colName, id) {
    const ref = doc(db, 'cooperativas', cooperativaId(), colName, id);
    await deleteDoc(ref);
    return id;
  },

  async listSub(parentColName, parentId, subName) {
    return snap(await getDocs(subCol(parentColName, parentId, subName)));
  },

  async createSub(parentColName, parentId, subName, data) {
    const payload = { ...data, ...auditCreate() };
    const ref = await addDoc(subCol(parentColName, parentId, subName), payload);
    return { id: ref.id, ...payload };
  },

  async get(colName, id) {
    const ref = doc(db, 'cooperativas', cooperativaId(), colName, id);
    const s = await getDoc(ref);
    return s.exists() ? { id: s.id, ...s.data() } : null;
  },

  // Lee el documento raíz de la cooperativa activa (nombre, matrícula, etc).
  async getCooperativa() {
    const ref = doc(db, 'cooperativas', cooperativaId());
    const s = await getDoc(ref);
    return s.exists() ? { id: s.id, ...s.data() } : null;
  },

  // Actualiza el documento raíz de la cooperativa activa (datos institucionales).
  async updateCooperativa(data) {
    const ref = doc(db, 'cooperativas', cooperativaId());
    const payload = { ...data, ...auditUpdate() };
    await updateDoc(ref, payload);
    return { id: cooperativaId(), ...payload };
  }
};


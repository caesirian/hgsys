import { firestoreDb } from '../../../services/firestore-db.service.js';
import { hasPermission } from '../../../config/permissions.config.js';
import { authStore } from '../../../stores/auth.store.js';
import { validateCooperativa } from '../../../validators/cooperativa.validator.js';
import { collection, addDoc, doc, updateDoc, getDocs, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';
import { db } from '../../../firebase/firebase.config.js';

function guard(action) {
  if (!hasPermission(authStore.get(), 'configuracion', action)) throw new Error('Permiso insuficiente');
}

function cooperativaId() {
  const id = authStore.get()?.cooperativaId;
  if (!id) throw new Error('No hay una cooperativa activa en la sesión.');
  return id;
}

function apiKeysCol() {
  return collection(db, 'cooperativas', cooperativaId(), 'apiKeys');
}

export const configuracionService = {
  async get() {
    guard('read');
    return firestoreDb.getCooperativa();
  },

  async update(data) {
    guard('update');
    return firestoreDb.updateCooperativa(validateCooperativa(data));
  },

  async listApiKeys() {
    guard('read');
    const snap = await getDocs(apiKeysCol());
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async createApiKey(nombre) {
    guard('update');
    if (!nombre?.trim()) throw new Error('El nombre de la API key es obligatorio.');
    const key = `cdapi_${crypto.randomUUID().replace(/-/g, '')}`;
    const payload = {
      nombre: nombre.trim(),
      key,
      activa: true,
      creadoPor: authStore.get()?.uid ?? 'sistema',
      creadoEn: serverTimestamp()
    };
    const ref = await addDoc(apiKeysCol(), payload);
    return { id: ref.id, ...payload };
  },

  async revokeApiKey(keyId) {
    guard('update');
    const ref = doc(db, 'cooperativas', cooperativaId(), 'apiKeys', keyId);
    await updateDoc(ref, { activa: false });
  }
};

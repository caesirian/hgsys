import { addDoc, collection, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { firestore } from '../firebase/firestore.js';

export const auditService = {
  async registerEvent(user, tipo, descripcion, metadata = {}) {
    await addDoc(collection(firestore(), 'cooperativas', user.cooperativaId, 'eventos'), {
      tipo,
      descripcion,
      usuarioId: user.uid,
      fecha: serverTimestamp(),
      metadata
    });
  },
  createFields(user) {
    return { creadoPor: user.uid, fechaCreacion: serverTimestamp(), modificadoPor: user.uid, fechaModificacion: serverTimestamp() };
  },
  updateFields(user) {
    return { modificadoPor: user.uid, fechaModificacion: serverTimestamp() };
  }
};

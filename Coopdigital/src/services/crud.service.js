import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { firestore } from '../firebase/firestore.js';
import { hasPermission } from '../config/permissions.config.js';
import { auditService } from './audit.service.js';

export function makeCrudService(moduleName, collectionName, validator, events = {}) {
  function guard(user, action) {
    if (!hasPermission(user, moduleName, action)) throw new Error('Permiso insuficiente');
  }
  function col(user) {
    return collection(firestore(), 'cooperativas', user.cooperativaId, collectionName);
  }
  return {
    async list(user) {
      guard(user, 'read');
      const snap = await getDocs(query(col(user), orderBy('fechaModificacion', 'desc')));
      return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
    },
    async create(user, data) {
      guard(user, 'create');
      const clean = validator(data);
      const ref = await addDoc(col(user), { ...clean, ...auditService.createFields(user) });
      await auditService.registerEvent(user, events.create || `alta_${collectionName}`, `Creación en ${collectionName}`, { id: ref.id });
      return ref.id;
    },
    async update(user, id, data) {
      guard(user, 'update');
      const clean = validator(data);
      await updateDoc(doc(firestore(), 'cooperativas', user.cooperativaId, collectionName, id), { ...clean, ...auditService.updateFields(user) });
      await auditService.registerEvent(user, events.update || `modificacion_${collectionName}`, `Modificación en ${collectionName}`, { id });
    },
    async remove(user, id) {
      guard(user, 'delete');
      await deleteDoc(doc(firestore(), 'cooperativas', user.cooperativaId, collectionName, id));
      await auditService.registerEvent(user, events.delete || `eliminacion_${collectionName}`, `Eliminación en ${collectionName}`, { id });
    }
  };
}

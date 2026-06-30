import { firestoreDb } from '../../../services/firestore-db.service.js';
import { hasPermission } from '../../../config/permissions.config.js';
import { authStore } from '../../../stores/auth.store.js';
import { validateCooperativa } from '../../../validators/cooperativa.validator.js';

function guard(action) {
  if (!hasPermission(authStore.get(), 'configuracion', action)) throw new Error('Permiso insuficiente');
}

export const configuracionService = {
  async get() {
    guard('read');
    return firestoreDb.getCooperativa();
  },
  async update(data) {
    guard('update');
    return firestoreDb.updateCooperativa(validateCooperativa(data));
  }
};

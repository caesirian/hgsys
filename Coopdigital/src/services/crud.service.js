import { firestoreDb } from './firestore-db.service.js';
import { hasPermission } from '../config/permissions.config.js';
import { authStore } from '../stores/auth.store.js';

export function makeCrudService(module, col, validator) {
  function guard(action) {
    if (!hasPermission(authStore.get(), module, action)) throw new Error('Permiso insuficiente');
  }
  return {
    async list()         { guard('read');   return firestoreDb.list(col); },
    async create(data)   { guard('create'); return firestoreDb.create(col, validator(data)); },
    async update(id,data){ guard('update'); return firestoreDb.update(col, id, validator(data)); },
    async remove(id)     { guard('delete'); return firestoreDb.remove(col, id); }
  };
}

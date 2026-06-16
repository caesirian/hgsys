import { collection, getDocs, orderBy, query, where } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { firestore } from '../../../firebase/firestore.js';
import { hasPermission } from '../../../config/permissions.config.js';

export const eventoService = {
  async list(user, filters = {}) {
    if (!hasPermission(user, 'eventos', 'read')) throw new Error('Permiso insuficiente');
    const constraints = [orderBy('fecha', 'desc')];
    if (filters.tipo) constraints.unshift(where('tipo', '==', filters.tipo));
    if (filters.usuarioId) constraints.unshift(where('usuarioId', '==', filters.usuarioId));
    const snap = await getDocs(query(collection(firestore(), 'cooperativas', user.cooperativaId, 'eventos'), ...constraints));
    return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
  }
};

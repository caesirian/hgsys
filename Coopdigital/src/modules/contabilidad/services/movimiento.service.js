import { firestoreDb } from '../../../services/firestore-db.service.js';
import { hasPermission } from '../../../config/permissions.config.js';
import { authStore } from '../../../stores/auth.store.js';
import { validateMovimientoContable } from '../../../validators/movimiento-contable.validator.js';

function guard(action) {
  if (!hasPermission(authStore.get(), 'contabilidad', action))
    throw new Error('Permiso insuficiente');
}

export const movimientoService = {
  async list() {
    guard('read');
    return firestoreDb.list('movimientosContables');
  },

  // Crea con número de asiento correlativo persistente (transacción atómica)
  async create(data) {
    guard('create');
    return firestoreDb.createMovimiento(validateMovimientoContable(data));
  },

  // Los movimientos registrados NO se editan — se anulan y se crea uno nuevo.
  // Solo se permite editar mientras el ejercicio no esté cerrado.
  async update(id, data) {
    guard('update');
    return firestoreDb.update('movimientosContables', id, validateMovimientoContable(data));
  },

  // Anula el movimiento creando un asiento contrario (inmutabilidad contable)
  async anular(id, motivo) {
    guard('update');
    return firestoreDb.anularMovimiento(id, motivo);
  },

  // Eliminación física solo para admin y solo si el ejercicio no está cerrado
  async remove(id) {
    guard('delete');
    return firestoreDb.remove('movimientosContables', id);
  }
};

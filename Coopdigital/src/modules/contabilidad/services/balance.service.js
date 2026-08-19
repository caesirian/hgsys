// balance.service.js
// Gestiona la configuración contable inicial: saldo de caja al inicio,
// capital social, reservas y cuentas de balance (activos/pasivos que no
// surgen de movimientos de caja sino de inventario o acuerdos previos).
//
// Persiste en: cooperativas/{id}/configuracionContable/balance (doc único).
import { firestoreDb } from '../../../services/firestore-db.service.js';
import { hasPermission } from '../../../config/permissions.config.js';
import { authStore } from '../../../stores/auth.store.js';

const COL = 'configuracionContable';
const ID  = 'balance';

function guard(action) {
  if (!hasPermission(authStore.get(), 'contabilidad', action))
    throw new Error('Permiso insuficiente');
}

export const balanceService = {
  async get() {
    guard('read');
    return (await firestoreDb.get(COL, ID)) ?? {
      // Valores por defecto si nunca fue configurado
      saldoInicialCaja:   0,
      capitalSocial:      0,
      reservaLegal:       0,
      otrasReservas:      0,
      // Cuentas de balance manuales
      cuentasActivo:  [],   // [{ nombre, monto }]
      cuentasPasivo:  [],   // [{ nombre, monto }]
      fechaApertura:  null,
      ejercicioDesde: null,
      ejercicioHasta: null,
    };
  },

  async save(data) {
    guard('update');
    const x = {
      saldoInicialCaja:   Number(data.saldoInicialCaja  ?? 0),
      capitalSocial:      Number(data.capitalSocial     ?? 0),
      reservaLegal:       Number(data.reservaLegal      ?? 0),
      otrasReservas:      Number(data.otrasReservas     ?? 0),
      cuentasActivo:      Array.isArray(data.cuentasActivo)  ? data.cuentasActivo  : [],
      cuentasPasivo:      Array.isArray(data.cuentasPasivo)  ? data.cuentasPasivo  : [],
      fechaApertura:      data.fechaApertura  ?? null,
      ejercicioDesde:     data.ejercicioDesde ?? null,
      ejercicioHasta:     data.ejercicioHasta ?? null,
    };
    return firestoreDb.upsert(COL, ID, x);
  }
};

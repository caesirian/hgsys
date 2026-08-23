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
      saldoInicialCaja:    0,
      capitalSocial:       0,
      reservaLegal:        0,
      otrasReservas:       0,
      cuentasActivo:       [],
      cuentasPasivo:       [],
      fechaApertura:       null,
      ejercicioDesde:      null,
      ejercicioHasta:      null,
      ejercicioCerrado:    false,
      historialEjercicios: []
    };
  },

  async save(data) {
    guard('update');
    const actual = await this.get();
    if (actual.ejercicioCerrado)
      throw new Error('El ejercicio está cerrado. Abrí uno nuevo antes de modificar.');
    const x = {
      saldoInicialCaja:    Number(data.saldoInicialCaja ?? 0),
      capitalSocial:       Number(data.capitalSocial    ?? 0),
      reservaLegal:        Number(data.reservaLegal     ?? 0),
      otrasReservas:       Number(data.otrasReservas    ?? 0),
      cuentasActivo:       Array.isArray(data.cuentasActivo) ? data.cuentasActivo : [],
      cuentasPasivo:       Array.isArray(data.cuentasPasivo) ? data.cuentasPasivo : [],
      fechaApertura:       data.fechaApertura  ?? null,
      ejercicioDesde:      data.ejercicioDesde ?? null,
      ejercicioHasta:      data.ejercicioHasta ?? null,
      ejercicioCerrado:    false,
      historialEjercicios: actual.historialEjercicios ?? []
    };
    return firestoreDb.upsert(COL, ID, x);
  },

  // Cierra el ejercicio: congela el período, traslada el resultado al
  // patrimonio neto y prepara el saldo inicial del próximo ejercicio.
  async cerrarEjercicio({ resultadoEjercicio, fechaCierre, nuevoSaldoCaja }) {
    guard('update');
    const actual = await this.get();
    if (actual.ejercicioCerrado)
      throw new Error('El ejercicio ya está cerrado.');

    const historial = [...(actual.historialEjercicios ?? [])];
    historial.push({
      ejercicioDesde:   actual.ejercicioDesde,
      ejercicioHasta:   actual.ejercicioHasta ?? fechaCierre,
      resultadoFinal:   resultadoEjercicio,
      capitalSocial:    actual.capitalSocial,
      reservaLegal:     actual.reservaLegal,
      otrasReservas:    actual.otrasReservas,
      saldoInicialCaja: actual.saldoInicialCaja,
      cerradoEl:        fechaCierre,
      cerradoPor:       authStore.get()?.uid ?? 'sistema'
    });

    // Resultado del ejercicio se incorpora al capital social
    const nuevoCapital = Number(actual.capitalSocial ?? 0) + Number(resultadoEjercicio ?? 0);

    return firestoreDb.upsert(COL, ID, {
      saldoInicialCaja:    Number(nuevoSaldoCaja ?? 0),
      capitalSocial:       nuevoCapital,
      reservaLegal:        Number(actual.reservaLegal  ?? 0),
      otrasReservas:       Number(actual.otrasReservas ?? 0),
      cuentasActivo:       actual.cuentasActivo ?? [],
      cuentasPasivo:       actual.cuentasPasivo ?? [],
      fechaApertura:       fechaCierre,
      ejercicioDesde:      fechaCierre,
      ejercicioHasta:      null,
      ejercicioCerrado:    false,
      historialEjercicios: historial
    });
  }
};

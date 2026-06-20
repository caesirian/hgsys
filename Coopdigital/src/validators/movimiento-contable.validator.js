import { escapeText } from '../utils/security.js';
import { categoriasIngreso, categoriasEgreso } from '../config/contabilidad.config.js';

const tipos = ['ingreso', 'egreso'];

export function validateMovimientoContable(d) {
  const tipo = escapeText(d.tipo);
  const categoria = escapeText(d.categoria);
  const monto = Number(d.monto);

  const x = {
    tipo,
    categoria,
    monto,
    fecha: d.fecha,
    descripcion: escapeText(d.descripcion),
    medioPago: escapeText(d.medioPago)
  };

  if (!tipos.includes(x.tipo)) {
    throw new Error('El tipo de movimiento debe ser ingreso o egreso.');
  }
  if (!Number.isFinite(x.monto) || x.monto <= 0) {
    throw new Error('El monto debe ser un número mayor a cero.');
  }
  if (!x.fecha) {
    throw new Error('La fecha es obligatoria.');
  }
  if (!x.descripcion) {
    throw new Error('La descripción es obligatoria.');
  }

  const categoriasValidas = x.tipo === 'ingreso' ? categoriasIngreso : categoriasEgreso;
  if (!categoriasValidas.includes(x.categoria)) {
    throw new Error('La categoría no corresponde al tipo de movimiento seleccionado.');
  }

  return x;
}

import { categoriasIngreso, categoriasEgreso } from '../../../config/contabilidad.config.js';

const categoriaOptions = [
  ...categoriasIngreso.map(c => ({ value: c, label: `${c} (ingreso)` })),
  ...categoriasEgreso.map(c => ({ value: c, label: `${c} (egreso)` }))
];

export const movimientoFields = [
  ['tipo', 'Tipo', 'select', ['ingreso', 'egreso']],
  ['categoria', 'Categoría', 'select', categoriaOptions],
  ['monto', 'Monto', 'number'],
  ['fecha', 'Fecha', 'date'],
  ['medioPago', 'Medio de pago'],
  ['descripcion', 'Descripción', 'textarea']
].map(([name, label, type, options]) => ({ name, label, type, options, full: name === 'descripcion' }));

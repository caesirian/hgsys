// Categorías de movimientos contables alineadas al esquema simplificado
// que utiliza INAES para cooperativas (Resolución 1481/2009 y modelos de
// Memoria y Estados Contables para entidades pequeñas). No constituye
// partida doble: es un registro de ingresos/egresos por categoría que
// alimenta un Estado de Resultados y un Balance simplificado, ambos
// pensados como borrador para revisión del profesional contable
// matriculado antes de su presentación formal.

export const categoriasIngreso = [
  'Cuotas sociales',
  'Ingresos por servicios',
  'Ingresos por venta de bienes',
  'Subsidios y aportes',
  'Ingresos extraordinarios',
  'Otros ingresos'
];

export const categoriasEgreso = [
  'Gastos de administración',
  'Gastos de personal',
  'Gastos generales y servicios',
  'Impuestos y tasas',
  'Gastos extraordinarios',
  'Otros egresos'
];

export const categoriasContables = [...categoriasIngreso, ...categoriasEgreso];

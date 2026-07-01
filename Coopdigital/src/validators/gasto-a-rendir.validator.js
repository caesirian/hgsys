import { escapeText } from '../utils/security.js';

const categorias = ['Mantenimiento', 'Insumos', 'Combustible', 'Viáticos', 'Servicios', 'Otros'];
const estados = ['pendiente', 'firmado'];

export function validateGastoARendir(d) {
  const x = {
    concepto: escapeText(d.concepto),
    categoria: escapeText(d.categoria),
    monto: Number(d.monto),
    fecha: d.fecha,
    consejeroId: escapeText(d.consejeroId),
    comprobanteUrl: escapeText(d.comprobanteUrl),
    observaciones: escapeText(d.observaciones),
    estado: escapeText(d.estado) || 'pendiente'
  };

  if (!x.concepto) throw new Error('El concepto es obligatorio.');
  if (!categorias.includes(x.categoria)) throw new Error('Elegí una categoría válida.');
  if (!Number.isFinite(x.monto) || x.monto <= 0) throw new Error('El monto debe ser un número mayor a cero.');
  if (!x.fecha) throw new Error('La fecha es obligatoria.');
  if (!x.consejeroId) throw new Error('Elegí el consejero que rindió el gasto.');
  if (!estados.includes(x.estado)) throw new Error('Estado de gasto inválido.');

  return x;
}

// Validación mínima de la firma en papel (subcolección). No pasa por
// escapeText de más campos porque firmadoPor/fecha se completan desde el
// sistema (usuario en sesión / fecha actual), no desde un input libre.
export function validateFirmaGasto(d) {
  const x = { consejeroId: escapeText(d.consejeroId) };
  if (!x.consejeroId) throw new Error('Elegí el consejero cuya firma en papel estás registrando.');
  return x;
}

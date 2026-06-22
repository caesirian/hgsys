import { escapeText } from '../utils/security.js';

const tipos = ['ordinaria', 'extraordinaria', 'informativa'];
const estados = ['planificada', 'realizada', 'cerrada'];

export function validateAsamblea(d) {
  const ordenDelDia = String(d.ordenDelDia ?? '')
    .split('\n')
    .map(line => escapeText(line))
    .filter(Boolean);

  const x = {
    tipo: escapeText(d.tipo),
    fechaAsamblea: d.fechaAsamblea,
    fechaConvocatoria: d.fechaConvocatoria,
    ordenDelDia,
    estado: escapeText(d.estado),
    actaId: escapeText(d.actaId) || null,
    observaciones: escapeText(d.observaciones)
  };

  if (!tipos.includes(x.tipo)) throw new Error('Elegí un tipo de asamblea válido.');
  if (!x.fechaAsamblea) throw new Error('La fecha de la asamblea es obligatoria.');
  if (!x.fechaConvocatoria) throw new Error('La fecha de convocatoria es obligatoria.');
  if (!ordenDelDia.length) throw new Error('El orden del día no puede estar vacío (un punto por línea).');
  if (!estados.includes(x.estado)) throw new Error('Elegí un estado válido.');

  return x;
}

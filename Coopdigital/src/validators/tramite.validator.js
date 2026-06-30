import { escapeText } from '../utils/security.js';

const tipos = ['INAES', 'ARCA/AFIP', 'Municipal', 'Bancario', 'Legal', 'Otro'];
const estados = ['iniciado', 'en proceso', 'observado', 'finalizado'];

export function validateTramite(d) {
  const x = {
    titulo: escapeText(d.titulo),
    tipo: escapeText(d.tipo),
    organismo: escapeText(d.organismo),
    fechaInicio: d.fechaInicio,
    fechaLimite: d.fechaLimite || null,
    estado: escapeText(d.estado) || 'iniciado',
    responsable: escapeText(d.responsable),
    observaciones: escapeText(d.observaciones)
  };
  if (!x.titulo) throw new Error('El título es obligatorio.');
  if (!tipos.includes(x.tipo)) throw new Error('Elegí un tipo válido.');
  if (!x.organismo) throw new Error('El organismo es obligatorio.');
  if (!x.fechaInicio) throw new Error('La fecha de inicio es obligatoria.');
  if (!estados.includes(x.estado)) throw new Error('Elegí un estado válido.');
  return x;
}

import { escapeText } from '../utils/security.js';

const canales = ['Email', 'WhatsApp', 'Cartelera', 'Circular', 'Otro'];
const estados = ['borrador', 'enviada', 'archivada'];

export function validateComunicacion(d) {
  const x = {
    titulo: escapeText(d.titulo),
    canal: escapeText(d.canal),
    fecha: d.fecha,
    destinatarios: escapeText(d.destinatarios),
    contenido: escapeText(d.contenido),
    estado: escapeText(d.estado) || 'borrador'
  };
  if (!x.titulo) throw new Error('El título es obligatorio.');
  if (!canales.includes(x.canal)) throw new Error('Elegí un canal válido.');
  if (!x.fecha) throw new Error('La fecha es obligatoria.');
  if (!x.destinatarios) throw new Error('Indicá los destinatarios.');
  if (!x.contenido) throw new Error('El contenido es obligatorio.');
  if (!estados.includes(x.estado)) throw new Error('Elegí un estado válido.');
  return x;
}

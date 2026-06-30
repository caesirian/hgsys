import { escapeText } from '../utils/security.js';

const tipos = ['entrada', 'salida'];
const categorias = ['Nota', 'Expediente', 'Oficio', 'Solicitud', 'Reclamo', 'Otro'];
const estados = ['pendiente', 'en proceso', 'resuelto', 'archivado'];

export function validateRegistro(d) {
  const x = {
    tipo: escapeText(d.tipo),
    numero: escapeText(d.numero),
    fecha: d.fecha,
    categoria: escapeText(d.categoria),
    remitenteDestinatario: escapeText(d.remitenteDestinatario),
    asunto: escapeText(d.asunto),
    estado: escapeText(d.estado) || 'pendiente',
    observaciones: escapeText(d.observaciones)
  };
  if (!tipos.includes(x.tipo)) throw new Error('El tipo debe ser entrada o salida.');
  if (!x.numero) throw new Error('El número de registro es obligatorio.');
  if (!x.fecha) throw new Error('La fecha es obligatoria.');
  if (!categorias.includes(x.categoria)) throw new Error('Elegí una categoría válida.');
  if (!x.remitenteDestinatario) throw new Error('Indicá el remitente o destinatario.');
  if (!x.asunto) throw new Error('El asunto es obligatorio.');
  if (!estados.includes(x.estado)) throw new Error('Elegí un estado válido.');
  return x;
}

import { escapeText } from '../utils/security.js';

const tipos = ['Nota', 'Acta', 'Certificado', 'Comunicación', 'Otro'];

export function validatePlantilla(d) {
  const x = {
    nombre: escapeText(d.nombre),
    tipo: escapeText(d.tipo),
    descripcion: escapeText(d.descripcion),
    contenido: escapeText(d.contenido),
    activa: d.activa === 'true' || d.activa === true
  };
  if (!x.nombre) throw new Error('El nombre es obligatorio.');
  if (!tipos.includes(x.tipo)) throw new Error('Elegí un tipo válido.');
  if (!x.contenido) throw new Error('El contenido de la plantilla es obligatorio.');
  return x;
}

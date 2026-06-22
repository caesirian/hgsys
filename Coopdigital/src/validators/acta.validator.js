import { escapeText, isSafeUrl } from '../utils/security.js';

const tipos = ['Consejo', 'Asamblea Ordinaria', 'Asamblea Extraordinaria', 'Comisión Interna'];

export function validateActa(d) {
  const x = {
    numeroActa: escapeText(d.numeroActa),
    tipo: escapeText(d.tipo),
    fecha: d.fecha,
    titulo: escapeText(d.titulo),
    contenido: escapeText(d.contenido),
    archivoPdfUrl: escapeText(d.archivoPdfUrl),
    firmada: d.firmada === 'true' || d.firmada === true
  };
  if (!x.numeroActa) throw new Error('El número de acta es obligatorio.');
  if (!tipos.includes(x.tipo)) throw new Error('Elegí un tipo de acta válido.');
  if (!x.fecha) throw new Error('La fecha es obligatoria.');
  if (!x.titulo) throw new Error('El título es obligatorio.');
  if (!x.contenido) throw new Error('El contenido del acta es obligatorio.');
  if (x.archivoPdfUrl && !isSafeUrl(x.archivoPdfUrl)) throw new Error('La URL del archivo debe empezar con http:// o https://');
  return x;
}

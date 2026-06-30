import { escapeText, isSafeUrl } from '../utils/security.js';

const categorias = ['Ley', 'Resolución INAES', 'Decreto', 'Disposición ARCA/AFIP', 'Normativa Municipal', 'Otro'];

export function validateBibliotecaNormativa(d) {
  const x = {
    titulo: escapeText(d.titulo),
    categoria: escapeText(d.categoria),
    numeroNorma: escapeText(d.numeroNorma),
    descripcion: escapeText(d.descripcion),
    storagePath: escapeText(d.storagePath),
    url: escapeText(d.url),
    fechaCarga: d.fechaCarga,
    visible: d.visible === 'true' || d.visible === true
  };
  if (!x.titulo) throw new Error('El título es obligatorio.');
  if (!categorias.includes(x.categoria)) throw new Error('Elegí una categoría válida.');
  if (!x.storagePath || !x.url) throw new Error('Tenés que subir un archivo antes de guardar.');
  if (!isSafeUrl(x.url)) throw new Error('La URL debe empezar con http:// o https://');
  return x;
}

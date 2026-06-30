import { escapeText, isSafeUrl } from '../utils/security.js';

const categorias = ['Estatuto', 'Reglamento', 'Manual', 'Historia institucional', 'Memoria y Balance', 'Otro'];

export function validateBibliotecaInstitucional(d) {
  const x = {
    titulo: escapeText(d.titulo),
    categoria: escapeText(d.categoria),
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

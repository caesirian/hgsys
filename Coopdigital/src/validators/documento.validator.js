import { escapeText } from '../utils/security.js';
const categories = ['INAES', 'ARCA', 'AFIP', 'Municipal', 'Legal', 'Contable', 'Contratos', 'Convenios', 'Actas'];
export function validateDocumento(data) {
  const document = { nombre: escapeText(data.nombre), categoria: escapeText(data.categoria), descripcion: escapeText(data.descripcion), storagePath: escapeText(data.storagePath), url: escapeText(data.url), fechaCarga: data.fechaCarga || new Date().toISOString(), visible: data.visible === 'true' || data.visible === true };
  if (!document.nombre || !categories.includes(document.categoria) || !document.storagePath || !document.url) throw new Error('Datos de documento inválidos');
  return document;
}

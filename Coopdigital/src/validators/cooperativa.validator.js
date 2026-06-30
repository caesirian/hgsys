import { escapeText, isSafeUrl } from '../utils/security.js';

export function validateCooperativa(d) {
  const x = {
    nombre: escapeText(d.nombre),
    cuit: escapeText(d.cuit),
    matricula: escapeText(d.matricula),
    domicilio: escapeText(d.domicilio),
    localidad: escapeText(d.localidad),
    provincia: escapeText(d.provincia),
    telefono: escapeText(d.telefono),
    email: escapeText(d.email),
    sitioWeb: escapeText(d.sitioWeb)
  };
  if (!x.nombre) throw new Error('La razón social es obligatoria.');
  if (!x.cuit) throw new Error('El CUIT es obligatorio.');
  if (!x.matricula) throw new Error('La matrícula INAES es obligatoria.');
  if (x.sitioWeb && !isSafeUrl(x.sitioWeb)) throw new Error('El sitio web debe empezar con http:// o https://');
  return x;
}

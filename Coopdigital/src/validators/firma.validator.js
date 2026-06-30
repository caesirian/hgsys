import { escapeText } from '../utils/security.js';

const tiposDocumento = ['Acta', 'Comunicación', 'Trámite', 'Documento', 'Otro'];

export function validateFirma(d) {
  const x = {
    documentoTipo: escapeText(d.documentoTipo),
    documentoId: escapeText(d.documentoId),
    documentoTitulo: escapeText(d.documentoTitulo),
    firmanteNombre: escapeText(d.firmanteNombre),
    firmanteDni: escapeText(d.firmanteDni),
    fechaFirma: d.fechaFirma,
    ip: escapeText(d.ip),
    userAgent: escapeText(d.userAgent),
    aceptoTerminos: d.aceptoTerminos === 'true' || d.aceptoTerminos === true
  };
  if (!tiposDocumento.includes(x.documentoTipo)) throw new Error('Elegí un tipo de documento válido.');
  if (!x.documentoTitulo) throw new Error('El título del documento es obligatorio.');
  if (!x.firmanteNombre) throw new Error('El nombre del firmante es obligatorio.');
  if (!x.firmanteDni) throw new Error('El DNI del firmante es obligatorio.');
  if (!x.fechaFirma) throw new Error('La fecha de firma es obligatoria.');
  if (!x.aceptoTerminos) throw new Error('Debe aceptar los términos de la firma simple para continuar.');
  return x;
}

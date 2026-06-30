import { escapeText } from '../utils/security.js';

const estados = ['habilitado', 'inhabilitado', 'observado'];

export function validatePadronElectoral(d) {
  const x = {
    asociadoId: escapeText(d.asociadoId),
    numeroAsociado: escapeText(d.numeroAsociado),
    apellidoNombre: escapeText(d.apellidoNombre),
    dni: escapeText(d.dni),
    estado: escapeText(d.estado) || 'habilitado',
    motivo: escapeText(d.motivo)
  };
  if (!x.asociadoId) throw new Error('El asociado es obligatorio.');
  if (!x.numeroAsociado) throw new Error('El número de asociado es obligatorio.');
  if (!x.apellidoNombre) throw new Error('El apellido y nombre son obligatorios.');
  if (!x.dni) throw new Error('El DNI es obligatorio.');
  if (!estados.includes(x.estado)) throw new Error('Elegí un estado válido.');
  if (x.estado !== 'habilitado' && !x.motivo) throw new Error('Indicá el motivo si el asociado no está habilitado.');
  return x;
}

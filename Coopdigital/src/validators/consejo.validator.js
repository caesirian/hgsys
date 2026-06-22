import { escapeText } from '../utils/security.js';

const cargos = ['Presidente', 'Vicepresidente', 'Secretario', 'Tesorero', 'Vocal Titular', 'Vocal Suplente'];

export function validateConsejo(d) {
  const x = {
    asociadoId: escapeText(d.asociadoId),
    cargo: escapeText(d.cargo),
    inicioMandato: d.inicioMandato,
    finMandato: d.finMandato,
    vigente: d.vigente === 'true' || d.vigente === true
  };
  if (!x.asociadoId) throw new Error('Elegí un asociado.');
  if (!cargos.includes(x.cargo)) throw new Error('Elegí un cargo válido.');
  if (!x.inicioMandato) throw new Error('La fecha de inicio de mandato es obligatoria.');
  if (x.finMandato && x.finMandato < x.inicioMandato) throw new Error('La fecha de fin de mandato no puede ser anterior al inicio.');
  return x;
}

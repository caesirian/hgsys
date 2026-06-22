import { escapeText } from '../utils/security.js';

const tipos = ['titular', 'suplente'];

export function validateSindicatura(d) {
  const x = {
    asociadoId: escapeText(d.asociadoId),
    tipo: escapeText(d.tipo),
    inicioMandato: d.inicioMandato,
    finMandato: d.finMandato,
    vigente: d.vigente === 'true' || d.vigente === true
  };
  if (!x.asociadoId) throw new Error('Elegí un asociado.');
  if (!tipos.includes(x.tipo)) throw new Error('El tipo debe ser titular o suplente.');
  if (!x.inicioMandato) throw new Error('La fecha de inicio de mandato es obligatoria.');
  if (x.finMandato && x.finMandato < x.inicioMandato) throw new Error('La fecha de fin de mandato no puede ser anterior al inicio.');
  return x;
}

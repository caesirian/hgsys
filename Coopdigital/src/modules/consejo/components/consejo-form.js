import { asociadoService } from '../../asociados/services/asociado.service.js';

const cargos = ['Presidente', 'Vicepresidente', 'Secretario', 'Tesorero', 'Vocal Titular', 'Vocal Suplente'];

// Función async: se resuelve recién al abrir el modal, así el select de
// asociados siempre refleja el padrón actual (altas/bajas recientes).
export async function consejoFields() {
  const asociados = await asociadoService.list();
  const options = asociados
    .sort((a, b) => (a.apellido ?? '').localeCompare(b.apellido ?? ''))
    .map(a => ({ value: a.id, label: `${a.apellido}, ${a.nombre} (N° ${a.numeroAsociado ?? '-'})` }));

  return [
    ['asociadoId', 'Asociado', 'select', options],
    ['cargo', 'Cargo', 'select', cargos],
    ['inicioMandato', 'Inicio de mandato', 'date'],
    ['finMandato', 'Fin de mandato', 'date'],
    ['vigente', 'Vigente', 'select', ['true', 'false']]
  ].map(([name, label, type, opts]) => ({ name, label, type, options: opts }));
}

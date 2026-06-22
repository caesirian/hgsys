import { asociadoService } from '../../asociados/services/asociado.service.js';

export async function sindicaturaFields() {
  const asociados = await asociadoService.list();
  const options = asociados
    .sort((a, b) => (a.apellido ?? '').localeCompare(b.apellido ?? ''))
    .map(a => ({ value: a.id, label: `${a.apellido}, ${a.nombre} (N° ${a.numeroAsociado ?? '-'})` }));

  return [
    ['asociadoId', 'Asociado', 'select', options],
    ['tipo', 'Tipo', 'select', ['titular', 'suplente']],
    ['inicioMandato', 'Inicio de mandato', 'date'],
    ['finMandato', 'Fin de mandato', 'date'],
    ['vigente', 'Vigente', 'select', ['true', 'false']]
  ].map(([name, label, type, opts]) => ({ name, label, type, options: opts }));
}

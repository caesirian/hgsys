import { actaService } from '../../actas/services/acta.service.js';

export async function asambleaFields() {
  const actas = await actaService.list().catch(() => []);
  const actaOptions = [
    { value: '', label: '— Sin acta vinculada —' },
    ...actas
      .sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''))
      .map(a => ({ value: a.id, label: `${a.numeroActa} — ${a.titulo}` }))
  ];

  return [
    ['tipo', 'Tipo', 'select', ['ordinaria', 'extraordinaria', 'informativa']],
    ['fechaConvocatoria', 'Fecha de convocatoria', 'date'],
    ['fechaAsamblea', 'Fecha de la asamblea', 'date'],
    ['ordenDelDia', 'Orden del día (un punto por línea)', 'textarea'],
    ['estado', 'Estado', 'select', ['planificada', 'realizada', 'cerrada']],
    ['actaId', 'Acta vinculada', 'select', actaOptions],
    ['observaciones', 'Observaciones', 'textarea']
  ].map(([name, label, type, opts]) => ({
    name, label, type, options: opts,
    full: ['ordenDelDia', 'observaciones'].includes(name)
  }));
}

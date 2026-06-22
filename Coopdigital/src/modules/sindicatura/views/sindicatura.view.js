import { sindicaturaService } from '../services/sindicatura.service.js';
import { sindicaturaFields } from '../components/sindicatura-form.js';
import { asociadoService } from '../../asociados/services/asociado.service.js';
import { crudView, bindCrud } from '../../../utils/render-crud.js';
import { fmt } from '../../../utils/date.js';
import { escapeHtml } from '../../../utils/security.js';

export function sindicaturaView() {
  return crudView({
    title: 'Sindicatura',
    subtitle: 'Síndicos titulares y suplentes, mandatos y vigencia.',
    newLabel: 'Nuevo síndico'
  });
}

export async function bindSindicatura() {
  const asociados = await asociadoService.list().catch(() => []);
  const nombres = Object.fromEntries(asociados.map(a => [a.id, `${a.apellido}, ${a.nombre}`]));

  const columns = [
    { key: 'asociadoId', label: 'Asociado', render: r => escapeHtml(nombres[r.asociadoId] ?? '(asociado no encontrado)') },
    { key: 'tipo',  label: 'Tipo', render: r => `<span class="badge">${escapeHtml(r.tipo)}</span>` },
    { key: 'inicioMandato', label: 'Inicio', render: r => fmt(r.inicioMandato) },
    { key: 'finMandato',    label: 'Fin',    render: r => r.finMandato ? fmt(r.finMandato) : '—' },
    { key: 'vigente', label: 'Vigente', render: r => r.vigente === true || r.vigente === 'true'
        ? '<span class="badge ok">vigente</span>'
        : '<span class="badge bad">finalizado</span>' }
  ];

  return bindCrud({ service: sindicaturaService, fields: sindicaturaFields, columns });
}

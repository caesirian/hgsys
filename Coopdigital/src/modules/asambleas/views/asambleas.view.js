import { asambleaService } from '../services/asamblea.service.js';
import { asambleaFields } from '../components/asamblea-form.js';
import { actaService } from '../../actas/services/acta.service.js';
import { crudView, bindCrud } from '../../../utils/render-crud.js';
import { fmt } from '../../../utils/date.js';
import { escapeHtml } from '../../../utils/security.js';

const estadoBadge = e => `<span class="badge ${e === 'realizada' ? 'ok' : e === 'cerrada' ? 'bad' : 'warn'}">${escapeHtml(e)}</span>`;

export function asambleasView() {
  return crudView({
    title: 'Asambleas',
    subtitle: 'Convocatorias, orden del día y estado de asambleas.',
    newLabel: 'Nueva asamblea'
  });
}

export async function bindAsambleas() {
  const actas = await actaService.list().catch(() => []);
  const actaLabels = Object.fromEntries(actas.map(a => [a.id, `${a.numeroActa} — ${a.titulo}`]));

  const columns = [
    { key: 'tipo', label: 'Tipo', render: r => `<span class="badge">${escapeHtml(r.tipo)}</span>` },
    { key: 'fechaConvocatoria', label: 'Convocatoria', render: r => fmt(r.fechaConvocatoria) },
    { key: 'fechaAsamblea',     label: 'Fecha',         render: r => fmt(r.fechaAsamblea) },
    { key: 'ordenDelDia', label: 'Orden del día', render: r => Array.isArray(r.ordenDelDia)
        ? escapeHtml(r.ordenDelDia.join(' · '))
        : '—' },
    { key: 'estado', label: 'Estado', render: r => estadoBadge(r.estado) },
    { key: 'actaId', label: 'Acta', render: r => r.actaId ? escapeHtml(actaLabels[r.actaId] ?? '(acta no encontrada)') : '—' }
  ];

  return bindCrud({ service: asambleaService, fields: asambleaFields, columns });
}

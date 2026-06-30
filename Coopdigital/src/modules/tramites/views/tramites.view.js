import { tramitesService } from '../services/tramites.service.js';
import { tramiteFields } from '../components/tramite-form.js';
import { crudView, bindCrud } from '../../../utils/render-crud.js';
import { escapeHtml } from '../../../utils/security.js';

const badge = e => {
  const cls = e === 'finalizado' ? 'ok' : e === 'observado' ? 'bad' : 'warn';
  return `<span class="badge ${cls}">${escapeHtml(e)}</span>`;
};

const columns = [
  { key: 'titulo',       label: 'Título' },
  { key: 'tipo',         label: 'Tipo' },
  { key: 'organismo',    label: 'Organismo' },
  { key: 'fechaInicio',  label: 'Inicio' },
  { key: 'fechaLimite',  label: 'Límite' },
  { key: 'estado',       label: 'Estado', render: r => badge(r.estado) },
  { key: 'responsable',  label: 'Responsable' }
];

export function tramitesView() {
  return crudView({ title: 'Trámites', subtitle: 'Gestiones ante organismos: INAES, ARCA/AFIP, municipalidad y otros.', newLabel: 'Nuevo trámite' });
}
export function bindTramites() {
  return bindCrud({ service: tramitesService, fields: tramiteFields, columns });
}

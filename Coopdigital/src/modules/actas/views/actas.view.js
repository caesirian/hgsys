import { actaService } from '../services/acta.service.js';
import { actaFields } from '../components/acta-form.js';
import { crudView, bindCrud } from '../../../utils/render-crud.js';
import { fmt } from '../../../utils/date.js';
import { escapeHtml, isSafeUrl } from '../../../utils/security.js';

const columns = [
  { key: 'numeroActa', label: 'N°' },
  { key: 'tipo',        label: 'Tipo',    render: r => `<span class="badge">${escapeHtml(r.tipo)}</span>` },
  { key: 'fecha',       label: 'Fecha',   render: r => fmt(r.fecha) },
  { key: 'titulo',      label: 'Título' },
  { key: 'firmada',     label: 'Firmada', render: r => r.firmada === true || r.firmada === 'true'
      ? '<span class="badge ok">sí</span>'
      : '<span class="badge bad">no</span>' },
  { key: 'archivoPdfUrl', label: 'PDF', render: r => r.archivoPdfUrl && isSafeUrl(r.archivoPdfUrl)
      ? `<a href="${escapeHtml(r.archivoPdfUrl)}" target="_blank" rel="noreferrer">Abrir</a>`
      : '—' }
];

export function actasView() {
  return crudView({
    title: 'Actas',
    subtitle: 'Actas de Consejo, Asamblea y Comisión Interna.',
    newLabel: 'Nueva acta'
  });
}

export function bindActas() {
  return bindCrud({ service: actaService, fields: actaFields, columns });
}

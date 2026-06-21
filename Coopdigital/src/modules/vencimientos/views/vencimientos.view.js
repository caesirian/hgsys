import { vencimientoService } from '../services/vencimiento.service.js';
import { vencimientoFields } from '../components/vencimiento-form.js';
import { crudView, bindCrud } from '../../../utils/render-crud.js';
import { daysUntil } from '../../../utils/date.js';
import { escapeHtml } from '../../../utils/security.js';

const badge = e => `<span class="badge ${e === 'cumplido' ? 'ok' : e === 'vencido' ? 'bad' : 'warn'}">${escapeHtml(e)}</span>`;

const columns = [
  { key: 'descripcion',     label: 'Descripción' },
  { key: 'organismoId',     label: 'Organismo' },
  { key: 'fechaVencimiento',label: 'Fecha' },
  { key: 'dias',            label: 'Días', render: r => daysUntil(r.fechaVencimiento) },
  { key: 'estado',          label: 'Estado', render: r => badge(r.estado) },
  { key: 'observaciones',   label: 'Observaciones' }
];

export function vencimientosView() {
  return crudView({ title: 'Vencimientos', subtitle: 'Control de obligaciones, organismos y estados.', newLabel: 'Nuevo vencimiento' });
}
export function bindVencimientos() {
  return bindCrud({ service: vencimientoService, fields: vencimientoFields, columns });
}

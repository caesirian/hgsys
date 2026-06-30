import { comunicacionesService } from '../services/comunicaciones.service.js';
import { comunicacionFields } from '../components/comunicacion-form.js';
import { crudView, bindCrud } from '../../../utils/render-crud.js';
import { escapeHtml } from '../../../utils/security.js';

const badgeEstado = e => {
  const cls = e === 'enviada' ? 'ok' : e === 'archivada' ? 'muted' : 'warn';
  return `<span class="badge ${cls}">${escapeHtml(e)}</span>`;
};

const columns = [
  { key: 'titulo',        label: 'Título' },
  { key: 'canal',         label: 'Canal' },
  { key: 'fecha',         label: 'Fecha' },
  { key: 'destinatarios', label: 'Destinatarios' },
  { key: 'estado',        label: 'Estado', render: r => badgeEstado(r.estado) }
];

export function comunicacionesView() {
  return crudView({ title: 'Comunicaciones', subtitle: 'Circulares, avisos y mensajes a asociados.', newLabel: 'Nueva comunicación' });
}
export function bindComunicaciones() {
  return bindCrud({ service: comunicacionesService, fields: comunicacionFields, columns });
}

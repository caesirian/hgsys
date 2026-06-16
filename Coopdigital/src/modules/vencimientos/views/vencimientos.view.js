import { vencimientoService } from '../services/vencimiento.service.js';
import { vencimientoFields } from '../components/vencimiento-form.js';
import { crudView, bindCrud } from '../../../utils/render-crud.js';
import { daysUntil, fmt } from '../../../utils/date.js';
import { asText } from '../../../utils/formatters.js';
const badge = (estado) => `<span class="badge ${estado === 'cumplido' ? 'ok' : estado === 'vencido' ? 'bad' : 'warn'}">${asText(estado)}</span>`;
export async function vencimientosView(user) {
  const estado = new URLSearchParams(location.hash.split('?')[1] || '').get('estado') || '';
  const rows = (await vencimientoService.list(user)).filter((item) => !estado || item.estado === estado);
  const calendar = `<div class="card"><h3>Calendario de alertas</h3>${rows.map((item) => `<p><b>${fmt(item.fechaVencimiento)}</b> · ${asText(item.descripcion)} <span class="badge ${daysUntil(item.fechaVencimiento) < 10 ? 'bad' : 'warn'}">${daysUntil(item.fechaVencimiento)} días</span></p>`).join('')}</div>`;
  return { html: crudView({ title: 'Vencimientos', subtitle: 'Tabla, calendario y alertas por fecha.', rows, newLabel: 'Nuevo vencimiento', filters: `<form class="toolbar" data-search><select name="estado"><option value="">Todos</option>${['pendiente', 'cumplido', 'vencido'].map((item) => `<option value="${item}" ${estado === item ? 'selected' : ''}>${item}</option>`).join('')}</select><button class="btn ghost">Filtrar</button></form>${calendar}`, columns: [{ key: 'descripcion', label: 'Descripción', render: (row) => asText(row.descripcion) }, { key: 'organismoId', label: 'Organismo' }, { key: 'fechaVencimiento', label: 'Fecha', render: (row) => fmt(row.fechaVencimiento) }, { key: 'dias', label: 'Alerta', render: (row) => `${daysUntil(row.fechaVencimiento)} días` }, { key: 'estado', label: 'Estado', render: (row) => badge(row.estado) }] }), bind: (rerender) => { bindCrud({ user, service: vencimientoService, fields: vencimientoFields, rows, rerender }); document.querySelector('[data-search]').onsubmit = (event) => { event.preventDefault(); location.hash = `/vencimientos?estado=${encodeURIComponent(new FormData(event.currentTarget).get('estado'))}`; }; } };
}

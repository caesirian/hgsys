import { eventoService } from '../services/evento.service.js';
import { table } from '../../../components/table/data-table.js';
import { fmt } from '../../../utils/date.js';
import { asText } from '../../../utils/formatters.js';
export async function eventosView(user) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const filters = { tipo: params.get('tipo') || '', usuarioId: params.get('usuarioId') || '' };
  const rows = await eventoService.list(user, filters);
  return { html: `<section><h1>Eventos</h1><p class="muted">Auditoría, historial y filtros. Escritura reservada a servicios del sistema.</p><form class="toolbar" data-search><input name="tipo" value="${asText(filters.tipo)}" placeholder="Tipo de evento"><input name="usuarioId" value="${asText(filters.usuarioId)}" placeholder="Usuario"><button class="btn ghost">Filtrar</button></form>${table([{ key: 'fecha', label: 'Fecha', render: (row) => fmt(row.fecha) }, { key: 'tipo', label: 'Tipo', render: (row) => `<span class="badge">${asText(row.tipo)}</span>` }, { key: 'descripcion', label: 'Descripción', render: (row) => asText(row.descripcion) }, { key: 'usuarioId', label: 'Usuario', render: (row) => asText(row.usuarioId) }, { key: 'metadata', label: 'Metadata', render: (row) => asText(JSON.stringify(row.metadata || {})) }], rows, () => '<span class="muted">Sistema</span>')}</section>`, bind: () => { document.querySelector('[data-search]').onsubmit = (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); location.hash = `/eventos?tipo=${encodeURIComponent(data.get('tipo'))}&usuarioId=${encodeURIComponent(data.get('usuarioId'))}`; }; } };
}

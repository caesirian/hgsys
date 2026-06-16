import { asociadoService } from '../services/asociado.service.js';
import { asociadoFields } from '../components/asociado-form.js';
import { crudView, bindCrud } from '../../../utils/render-crud.js';
import { downloadCsv, printReport } from '../../../utils/export.js';
import { asText } from '../../../utils/formatters.js';
const badge = (estado) => `<span class="badge ${estado === 'activo' ? 'ok' : estado === 'suspendido' ? 'warn' : 'bad'}">${asText(estado)}</span>`;
export async function asociadosView(user) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const q = params.get('q') || '', estado = params.get('estado') || '';
  const allRows = await asociadoService.list(user);
  const rows = allRows.filter((item) => (!estado || item.estado === estado) && `${item.numeroAsociado} ${item.apellido} ${item.nombre} ${item.dni} ${item.cuit}`.toLowerCase().includes(q.toLowerCase()));
  const filters = `<form class="toolbar" data-search><input name="q" value="${asText(q)}" placeholder="Buscar asociado"><select name="estado"><option value="">Todos</option>${['activo', 'suspendido', 'dadoDeBaja', 'fallecido'].map((item) => `<option value="${item}" ${estado === item ? 'selected' : ''}>${item}</option>`).join('')}</select><button class="btn ghost">Filtrar</button><button class="btn ghost" type="button" data-export>Excel CSV</button><button class="btn ghost" type="button" data-print>PDF</button></form>`;
  return { html: crudView({ title: 'Asociados', subtitle: 'CRUD completo, filtros, buscador y exportaciones.', rows, newLabel: 'Nuevo asociado', filters, columns: [{ key: 'numeroAsociado', label: 'N°' }, { key: 'apellido', label: 'Asociado', render: (row) => `${asText(row.apellido)}, ${asText(row.nombre)}` }, { key: 'dni', label: 'DNI' }, { key: 'cuit', label: 'CUIT' }, { key: 'estado', label: 'Estado', render: (row) => badge(row.estado) }] }), bind: (rerender) => { bindCrud({ user, service: asociadoService, fields: asociadoFields, rows, rerender }); document.querySelector('[data-search]').onsubmit = (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); location.hash = `/asociados?q=${encodeURIComponent(data.get('q'))}&estado=${encodeURIComponent(data.get('estado'))}`; }; document.querySelector('[data-export]').onclick = () => downloadCsv('asociados.csv', rows); document.querySelector('[data-print]').onclick = printReport; } };
}

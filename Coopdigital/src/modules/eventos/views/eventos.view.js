import { eventoService } from '../services/evento.service.js';
import { table } from '../../../components/table/data-table.js';
import { fmt } from '../../../utils/date.js';

const columns = [
  { key: 'fecha',       label: 'Fecha',       render: r => fmt(r.fecha?.toDate ? r.fecha.toDate() : r.fecha) },
  { key: 'tipo',        label: 'Tipo',         render: r => `<span class="badge">${r.tipo ?? '—'}</span>` },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'usuarioId',   label: 'Usuario' }
];

export function eventosView() {
  return `<section>
    <div class="page-header">
      <h1>Eventos / Auditoría</h1>
      <p class="muted">Registro de actividad del sistema. Solo lectura.</p>
    </div>
    <div id="eventosTable"><div class="loading">Cargando…</div></div>
  </section>`;
}

export async function bindEventos() {
  const el = document.querySelector('#eventosTable');
  try {
    const rows = await eventoService.list();
    el.innerHTML = rows.length
      ? table(columns, rows, () => '')
      : '<p class="muted empty">Sin eventos registrados.</p>';
  } catch (err) {
    el.innerHTML = `<p class="error">${err.message}</p>`;
  }
}

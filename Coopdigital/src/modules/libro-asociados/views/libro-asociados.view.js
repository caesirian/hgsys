import { asociadoService } from '../../asociados/services/asociado.service.js';
import { table } from '../../../components/table/data-table.js';
import { downloadCsv, printReport } from '../../../utils/export.js';
import { escapeHtml } from '../../../utils/security.js';

const columns = [
  { key: 'numeroAsociado', label: 'N°' },
  { key: 'apellido', label: 'Apellido' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'dni', label: 'DNI' },
  { key: 'cuit', label: 'CUIT' },
  { key: 'fechaIngreso', label: 'Ingreso' },
  { key: 'fechaEgreso', label: 'Egreso' },
  { key: 'estado', label: 'Estado' }
];

export function libroAsociadosView() {
  return `<section>
    <div class="toolbar">
      <div>
        <h1>Libro de Asociados</h1>
        <p class="muted">Generado automáticamente desde asociados. Exportación CSV e impresión PDF.</p>
      </div>
      <div>
        <button class="btn ghost" data-export>Exportar CSV</button>
        <button class="btn primary" data-print>Imprimir PDF</button>
      </div>
    </div>
    <div id="libroTable"><div class="loading">Cargando datos…</div></div>
  </section>`;
}

export async function bindLibro() {
  const el = document.querySelector('#libroTable');
  let rows = [];
  try {
    rows = (await asociadoService.list()).sort((a, b) => (a.numeroAsociado ?? '').localeCompare(b.numeroAsociado ?? ''));
    el.innerHTML = rows.length
      ? table(columns, rows, () => '<span class="muted">Automático</span>')
      : '<p class="muted empty">Sin asociados registrados.</p>';
  } catch (err) {
    el.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
  }
  document.querySelector('[data-export]')?.addEventListener('click', () => downloadCsv('libro-asociados.csv', rows));
  document.querySelector('[data-print]')?.addEventListener('click', printReport);
}

import { table } from '../components/table/data-table.js';
import { openModal } from '../components/modal/modal.js';
import { escapeHtml } from './security.js';

// Devuelve el HTML estático de la página (sin datos aún).
// Los datos se cargan en bindCrud de forma asíncrona.
export function crudView({ title, subtitle, newLabel }) {
  return `<section>
    <div class="toolbar">
      <div><h1>${escapeHtml(title)}</h1><p class="muted">${escapeHtml(subtitle)}</p></div>
      <button class="btn primary" data-create>${escapeHtml(newLabel)}</button>
    </div>
    <div id="crudTable"><div class="loading">Cargando datos…</div></div>
  </section>`;
}

// Carga los datos, renderiza la tabla y enlaza todos los eventos.
export async function bindCrud({ service, fields, columns, rerender }) {
  const tableEl = document.querySelector('#crudTable');

  async function loadTable() {
    tableEl.innerHTML = '<div class="loading">Cargando datos…</div>';
    try {
      const rows = await service.list();
      if (!rows.length) {
        tableEl.innerHTML = '<p class="muted empty">Sin registros todavía.</p>';
      } else {
        tableEl.innerHTML = table(
          columns,
          rows,
          r => `<button class="btn ghost" data-edit="${r.id}">Editar</button>
                <button class="btn danger" data-del="${r.id}">Eliminar</button>`
        );
      }
      bindRowActions();
    } catch (err) {
      tableEl.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
    }
  }

  function bindRowActions() {
    document.querySelectorAll('[data-edit]').forEach(b => {
      b.onclick = async () => {
        const row = await service.list().then(rows => rows.find(x => x.id === b.dataset.edit));
        openModal('Editar registro', fields, row, async data => {
          await service.update(row.id, data);
          await loadTable();
        });
      };
    });
    document.querySelectorAll('[data-del]').forEach(b => {
      b.onclick = async () => {
        if (!confirm('¿Eliminar este registro?')) return;
        await service.remove(b.dataset.del);
        await loadTable();
      };
    });
  }

  document.querySelector('[data-create]')?.addEventListener('click', () => {
    openModal('Nuevo registro', fields, {}, async data => {
      await service.create(data);
      await loadTable();
    });
  });

  await loadTable();
}

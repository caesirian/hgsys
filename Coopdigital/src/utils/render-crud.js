import { table } from '../components/table/data-table.js';
import { openModal } from '../components/modal/modal.js';
import { escapeHtml } from './security.js';
import { toast } from './toast.js';

// Devuelve el HTML estático de la página con barra de búsqueda incluida.
// Los datos se cargan en bindCrud de forma asíncrona.
export function crudView({ title, subtitle, newLabel }) {
  return `<section>
    <div class="toolbar">
      <div><h1>${escapeHtml(title)}</h1><p class="muted">${escapeHtml(subtitle)}</p></div>
      <div class="toolbar-right">
        <input class="search-input" type="search" placeholder="Buscar…" id="tableSearch">
        <button class="btn primary" data-create>${escapeHtml(newLabel)}</button>
      </div>
    </div>
    <div id="crudTable"><div class="loading">Cargando datos…</div></div>
  </section>`;
}

// Filtra filas: compara el texto del input contra todos los valores de
// cada fila (stringify simple, sin importar el campo). Case-insensitive.
function filterRows(rows, q) {
  if (!q) return rows;
  const lower = q.toLowerCase();
  return rows.filter(r =>
    Object.values(r).some(v => String(v ?? '').toLowerCase().includes(lower))
  );
}

// Carga los datos, renderiza la tabla, enlaza búsqueda y eventos CRUD.
// `fields` puede ser un array fijo o una función async.
// `extraActions` es una función opcional (r) => string de HTML adicional
// que se agrega a cada fila junto con Editar y Eliminar.
export async function bindCrud({ service, fields, columns, extraActions }) {
  const tableEl = document.querySelector('#crudTable');
  let allRows = [];

  async function resolveFields() {
    return typeof fields === 'function' ? await fields() : fields;
  }

  function renderTable(rows) {
    if (!rows.length) {
      tableEl.innerHTML = '<p class="muted empty">Sin registros todavía.</p>';
      return;
    }
    tableEl.innerHTML = table(
      columns,
      rows,
      r => `<button class="btn ghost" data-edit="${r.id}">Editar</button>
            <button class="btn danger" data-del="${r.id}">Eliminar</button>
            ${extraActions ? extraActions.render(r) : ''}`
    );
    bindRowActions();
    if (extraActions) bindExtraActions();
  }

  async function loadTable() {
    tableEl.innerHTML = '<div class="loading">Cargando datos…</div>';
    try {
      allRows = await service.list();
      const q = document.querySelector('#tableSearch')?.value ?? '';
      renderTable(filterRows(allRows, q));
    } catch (err) {
      tableEl.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
    }
  }

  function bindRowActions() {
    document.querySelectorAll('[data-edit]').forEach(b => {
      b.onclick = async () => {
        const row = allRows.find(x => x.id === b.dataset.edit);
        openModal('Editar registro', await resolveFields(), row, async data => {
          try {
            await service.update(row.id, data);
            toast.ok('Cambios guardados.');
            await loadTable();
          } catch (err) {
            toast.err(err.message);
          }
        });
      };
    });
    document.querySelectorAll('[data-del]').forEach(b => {
      b.onclick = async () => {
        if (!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
        try {
          await service.remove(b.dataset.del);
          toast.ok('Registro eliminado.');
          await loadTable();
        } catch (err) {
          toast.err(err.message);
        }
      };
    });
  }

  // Si extraActions tiene un método bind(), se llama después de renderizar.
  // Eso permite que cada módulo maneje sus propios listeners sin acoplar
  // lógica de dominio (certificados, etc.) en el motor genérico.
  function bindExtraActions() {
    if (typeof extraActions?.bind === 'function') {
      extraActions.bind(allRows);
    }
  }
  document.querySelector('#tableSearch')?.addEventListener('input', e => {
    renderTable(filterRows(allRows, e.target.value));
  });

  document.querySelector('[data-create]')?.addEventListener('click', async () => {
    openModal('Nuevo registro', await resolveFields(), {}, async data => {
      try {
        await service.create(data);
        toast.ok('Registro creado.');
        await loadTable();
      } catch (err) {
        toast.err(err.message);
      }
    });
  });

  await loadTable();
}

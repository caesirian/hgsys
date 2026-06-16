import { table } from '../components/table/data-table.js';
import { openModal } from '../components/modal/modal.js';

export function crudView({ title, subtitle, rows, columns, newLabel, filters = '' }) {
  return `<section><div class="toolbar"><div><h1>${title}</h1><p class="muted">${subtitle}</p></div><button class="btn primary" data-create>${newLabel}</button></div>${filters}<div id="crudTable">${table(columns, rows, (row) => `<button class="btn ghost" data-edit="${row.id}">Editar</button><button class="btn danger" data-del="${row.id}">Eliminar</button>`)}</div></section>`;
}

export function bindCrud({ user, service, fields, rows, rerender, beforeSave = async (data) => data }) {
  document.querySelector('[data-create]')?.addEventListener('click', () => openModal('Nuevo registro', fields, {}, async (data) => { await service.create(user, await beforeSave(data)); await rerender(); }));
  document.querySelectorAll('[data-edit]').forEach((button) => button.onclick = () => {
    const row = rows.find((item) => item.id === button.dataset.edit);
    openModal('Editar registro', fields, row, async (data) => { await service.update(user, row.id, await beforeSave(data, row)); await rerender(); });
  });
  document.querySelectorAll('[data-del]').forEach((button) => button.onclick = async () => {
    if (confirm('¿Eliminar registro?')) { await service.remove(user, button.dataset.del); await rerender(); }
  });
}

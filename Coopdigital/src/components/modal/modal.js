import { escapeHtml } from '../../utils/security.js';

export function openModal(title, fields, row, onSave) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `<form class="modal-panel"><h2>${escapeHtml(title)}</h2><div class="form-grid">${fields.map(f => `<div class="field ${f.full ? 'full' : ''}"><label>${escapeHtml(f.label)}</label>${
    f.type === 'select'
      ? `<select name="${f.name}">${f.options.map(o => {
          const v = typeof o === 'object' ? o.value : o;
          const l = typeof o === 'object' ? o.label : o;
          return `<option value="${escapeHtml(v)}" ${row?.[f.name] == v ? 'selected' : ''}>${escapeHtml(l)}</option>`;
        }).join('')}</select>`
      : f.type === 'textarea'
      ? `<textarea name="${f.name}" rows="3">${escapeHtml(row?.[f.name] ?? '')}</textarea>`
      : `<input name="${f.name}" type="${f.type || 'text'}" value="${escapeHtml(row?.[f.name] ?? '')}">`
  }</div>`).join('')}</div><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px"><button class="btn ghost" type="button" data-close>Cancelar</button><button class="btn primary">Guardar</button></div></form>`;
  document.body.append(modal);
  modal.querySelector('[data-close]').onclick = () => modal.remove();
  modal.querySelector('form').onsubmit = e => {
    e.preventDefault();
    onSave(Object.fromEntries(new FormData(e.currentTarget)));
    modal.remove();
  };
}

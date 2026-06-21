import { escapeHtml } from '../../utils/security.js';

export function openModal(title, fields, row, onSave) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `<form class="modal-panel"><h2>${escapeHtml(title)}</h2><div class="form-grid">${fields.map(f => `<div class="field ${f.full ? 'full' : ''}"><label>${escapeHtml(f.label)}</label>${
    f.type === 'select'
      ? `<select name="${f.name}">${f.options.map(o => {
          const v = typeof o === 'object' ? o.value : o;
          const l = typeof o === 'object' ? o.label : o;
          const isSelected = String(row?.[f.name] ?? '') === String(v);
          return `<option value="${escapeHtml(v)}" ${isSelected ? 'selected' : ''}>${escapeHtml(l)}</option>`;
        }).join('')}</select>`
      : f.type === 'textarea'
      ? `<textarea name="${f.name}" rows="3">${escapeHtml(row?.[f.name] ?? '')}</textarea>`
      : `<input name="${f.name}" type="${f.type || 'text'}" value="${escapeHtml(row?.[f.name] ?? '')}">`
  }</div>`).join('')}</div><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px"><button class="btn ghost" type="button" data-close>Cancelar</button><button class="btn primary">Guardar</button></div></form>`;
  document.body.append(modal);
  modal.querySelector('[data-close]').onclick = () => modal.remove();
  modal.querySelector('form').onsubmit = async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const submitBtn = form.querySelector('button.primary');
    submitBtn.disabled = true;
    try {
      await onSave(Object.fromEntries(new FormData(form)));
      modal.remove();
    } catch (err) {
      submitBtn.disabled = false;
      let alertEl = form.querySelector('.alert.error');
      if (!alertEl) {
        alertEl = document.createElement('div');
        alertEl.className = 'alert error';
        form.insertBefore(alertEl, form.firstElementChild.nextSibling);
      }
      alertEl.textContent = err?.message || 'No se pudo guardar el registro.';
    }
  };
}

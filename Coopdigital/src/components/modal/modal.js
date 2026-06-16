export function openModal(title, fields, row, onSave) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `<form class="modal-panel"><h2>${title}</h2><div class="form-grid">${fields.map((field) => fieldHtml(field, row)).join('')}</div><div class="modal-actions"><button class="btn ghost" type="button" data-close>Cancelar</button><button class="btn primary">Guardar</button></div></form>`;
  document.body.append(modal);
  modal.querySelector('[data-close]').onclick = () => modal.remove();
  modal.querySelector('form').onsubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    fields.filter((field) => field.type === 'file').forEach((field) => { data[field.name] = form.elements[field.name].files[0] || null; });
    await onSave(data);
    modal.remove();
  };
}

function fieldHtml(field, row) {
  const value = row?.[field.name] ?? '';
  if (field.type === 'select') return `<div class="field ${field.full ? 'full' : ''}"><label>${field.label}</label><select name="${field.name}">${field.options.map((option) => `<option value="${option}" ${String(value) === String(option) ? 'selected' : ''}>${option}</option>`).join('')}</select></div>`;
  if (field.type === 'textarea') return `<div class="field ${field.full ? 'full' : ''}"><label>${field.label}</label><textarea name="${field.name}" rows="3">${value}</textarea></div>`;
  return `<div class="field ${field.full ? 'full' : ''}"><label>${field.label}</label><input name="${field.name}" type="${field.type || 'text'}" value="${field.type === 'file' ? '' : value}" ${field.required ? 'required' : ''}></div>`;
}

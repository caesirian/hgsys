import { escapeHtml } from '../../utils/security.js';
import { cloudinaryService } from '../../services/cloudinary.service.js';

// Renderiza el contenido de un campo según su tipo. El tipo 'file' es un
// caso especial: no se mapea 1 a 1 con un único input nombrado, sino que
// produce un selector de archivo (sin name, no se envía) más dos inputs
// ocultos (url, storagePath) que se completan recién cuando termina la
// subida a Cloudinary. Acoplar el upload acá, en vez de duplicar todo el
// modal solo para Documentos, es la opción más simple mientras sea el
// único módulo que necesita subir archivos.
function renderField(f, row) {
  if (f.type === 'select') {
    return `<select name="${f.name}">${f.options.map(o => {
      const v = typeof o === 'object' ? o.value : o;
      const l = typeof o === 'object' ? o.label : o;
      const isSelected = String(row?.[f.name] ?? '') === String(v);
      return `<option value="${escapeHtml(v)}" ${isSelected ? 'selected' : ''}>${escapeHtml(l)}</option>`;
    }).join('')}</select>`;
  }
  if (f.type === 'textarea') {
    return `<textarea name="${f.name}" rows="3">${escapeHtml(row?.[f.name] ?? '')}</textarea>`;
  }
  if (f.type === 'file') {
    const urlActual = row?.url ?? '';
    return `<div class="file-field" data-file-field>
      <input type="file" data-file-input accept="${escapeHtml(f.accept ?? '')}">
      <input type="hidden" name="url" value="${escapeHtml(urlActual)}">
      <input type="hidden" name="storagePath" value="${escapeHtml(row?.storagePath ?? '')}">
      <span class="file-status muted" data-file-status>${urlActual ? 'Archivo cargado ✓' : 'Sin archivo todavía'}</span>
    </div>`;
  }
  return `<input name="${f.name}" type="${f.type || 'text'}" value="${escapeHtml(row?.[f.name] ?? '')}">`;
}

export function openModal(title, fields, row, onSave) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `<form class="modal-panel"><h2>${escapeHtml(title)}</h2><div class="form-grid">${fields.map(f => `<div class="field ${f.full ? 'full' : ''}"><label>${escapeHtml(f.label)}</label>${renderField(f, row)}</div>`).join('')}</div><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px"><button class="btn ghost" type="button" data-close>Cancelar</button><button class="btn primary" data-submit>Guardar</button></div></form>`;
  document.body.append(modal);

  modal.querySelector('[data-close]').onclick = () => modal.remove();
  // Cablear la subida para cada campo tipo 'file' presente en el formulario.
  modal.querySelectorAll('[data-file-field]').forEach(wrapper => {
    const fileInput = wrapper.querySelector('[data-file-input]');
    const urlHidden = wrapper.querySelector('input[name="url"]');
    const pathHidden = wrapper.querySelector('input[name="storagePath"]');
    const status = wrapper.querySelector('[data-file-status]');
    const submitBtn = modal.querySelector('[data-submit]');

    fileInput.onchange = async () => {
      const file = fileInput.files[0];
      if (!file) return;
      fileInput.disabled = true;
      submitBtn.disabled = true;
      status.textContent = 'Subiendo…';
      status.className = 'file-status muted';
      try {
        const { url, storagePath } = await cloudinaryService.upload(file);
        urlHidden.value = url;
        pathHidden.value = storagePath;
        status.textContent = `Archivo cargado ✓ (${file.name})`;
        status.className = 'file-status ok-text';
      } catch (err) {
        status.textContent = err.message;
        status.className = 'file-status error-text';
      } finally {
        fileInput.disabled = false;
        submitBtn.disabled = false;
      }
    };
  });

  modal.querySelector('form').onsubmit = async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const submitBtn = form.querySelector('[data-submit]');
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

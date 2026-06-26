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
      const seleccionado = String(v) === String(row?.[f.name]);
      return `<option value="${escapeHtml(v)}" ${seleccionado ? 'selected' : ''}>${escapeHtml(l)}</option>`;
    }).join('')}</select>`;
  }
  if (f.type === 'textarea') {
    const raw = row?.[f.name];
    const texto = Array.isArray(raw) ? raw.join('\n') : (raw ?? '');
    return `<textarea name="${f.name}" rows="3">${escapeHtml(texto)}</textarea>`;
  }
  if (f.type === 'file') {
    const urlField = f.urlField ?? 'url';
    const pathField = f.pathField;
    const urlActual = row?.[urlField] ?? '';
    return `<div class="file-field" data-file-field data-url-field="${escapeHtml(urlField)}" ${pathField ? `data-path-field="${escapeHtml(pathField)}"` : ''}>
      <input type="file" data-file-input accept="${escapeHtml(f.accept ?? '')}">
      <input type="hidden" name="${urlField}" value="${escapeHtml(urlActual)}">
      ${pathField ? `<input type="hidden" name="${pathField}" value="${escapeHtml(row?.[pathField] ?? '')}">` : ''}
      <span class="file-status muted" data-file-status>${urlActual ? 'Archivo cargado ✓' : 'Sin archivo todavía'}</span>
    </div>`;
  }
  return `<input name="${f.name}" type="${f.type || 'text'}" value="${escapeHtml(row?.[f.name] ?? '')}">`;
}

export function openModal(title, fields, row, onSave) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `<form class="modal-panel"><h2>${escapeHtml(title)}</h2><div class="form-grid">${
    fields.map(f => `<div class="field ${f.full ? 'full' : ''}" data-field-name="${escapeHtml(f.name)}">
      <label>${escapeHtml(f.label)}</label>
      ${renderField(f, row)}
      ${f.hint ? `<span class="field-hint muted" data-hint="${escapeHtml(f.name)}"></span>` : ''}
    </div>`).join('')
  }</div><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px"><button class="btn ghost" type="button" data-close>Cancelar</button><button class="btn primary" data-submit>Guardar</button></div></form>`;
  document.body.append(modal);

  modal.querySelector('[data-close]').onclick = () => modal.remove();

  // ── Cablear onBlur por campo ──────────────────────────────────────────────
  // Si un field define `onBlur: async (valor, setField, setHint) => {}`,
  // se ejecuta al salir del input. setField(name, val) modifica otro campo
  // del mismo form. setHint(name, msg, tipo) muestra un mensaje debajo del campo.
  fields.forEach(f => {
    if (typeof f.onBlur !== 'function') return;

    const input = modal.querySelector(`[name="${f.name}"]`);
    if (!input) return;

    input.addEventListener('blur', async () => {
      const valor = input.value.trim();
      if (!valor) return;

      // setField: escribe el valor en otro input del mismo modal
      const setField = (fieldName, val) => {
        const target = modal.querySelector(`[name="${fieldName}"]`);
        if (target && !target.value) {
          // Solo autocompleta si el campo está vacío (no pisa lo que el
          // usuario ya escribió a mano)
          target.value = val ?? '';
        }
      };

      // setHint: muestra un mensaje informativo bajo el campo con onBlur
      const setHint = (fieldName, msg, tipo = 'muted') => {
        const hint = modal.querySelector(`[data-hint="${fieldName}"]`);
        if (!hint) return;
        hint.textContent = msg;
        hint.className = `field-hint ${tipo}`;
      };

      // Deshabilitar input mientras consulta
      input.disabled = true;
      setHint(f.name, 'Consultando ARCA…', 'muted');

      try {
        await f.onBlur(valor, setField, setHint);
      } catch {
        setHint(f.name, '', 'muted');
      } finally {
        input.disabled = false;
        input.focus();
      }
    });
  });

  // ── Cablear subida de archivos ─────────────────────────────────────────────
  modal.querySelectorAll('[data-file-field]').forEach(wrapper => {
    const fileInput  = wrapper.querySelector('[data-file-input]');
    const urlField   = wrapper.dataset.urlField;
    const pathField  = wrapper.dataset.pathField;
    const urlHidden  = wrapper.querySelector(`input[name="${urlField}"]`);
    const pathHidden = pathField ? wrapper.querySelector(`input[name="${pathField}"]`) : null;
    const status     = wrapper.querySelector('[data-file-status]');
    const submitBtn  = modal.querySelector('[data-submit]');

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
        if (pathHidden) pathHidden.value = storagePath;
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

  // ── Submit ─────────────────────────────────────────────────────────────────
  modal.querySelector('form').onsubmit = async e => {
    e.preventDefault();
    const submitBtn = modal.querySelector('[data-submit]');
    submitBtn.disabled = true;
    try {
      await onSave(Object.fromEntries(new FormData(e.currentTarget)));
      modal.remove();
    } catch {
      submitBtn.disabled = false;
    }
  };
}

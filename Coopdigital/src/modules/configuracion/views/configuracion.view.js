import { configuracionService } from '../services/configuracion.service.js';
import { toast } from '../../../utils/toast.js';
import { escapeHtml } from '../../../utils/security.js';

const campos = [
  ['nombre',    'Razón social'],
  ['cuit',      'CUIT'],
  ['matricula', 'Matrícula INAES'],
  ['domicilio', 'Domicilio'],
  ['localidad', 'Localidad'],
  ['provincia', 'Provincia'],
  ['telefono',  'Teléfono'],
  ['email',     'Email institucional'],
  ['sitioWeb',  'Sitio web']
];

export function configuracionView() {
  return `<section>
    <div class="toolbar">
      <div><h1>Configuración</h1><p class="muted">Datos institucionales y acceso para integraciones externas.</p></div>
    </div>

    <h2>Datos institucionales</h2>
    <form id="configForm" class="form-grid" style="max-width:640px;margin-bottom:40px">
      ${campos.map(([name, label]) => `
        <div class="field">
          <label>${escapeHtml(label)}</label>
          <input name="${name}" type="text">
        </div>`).join('')}
      <div style="margin-top:16px">
        <button class="btn primary" type="submit">Guardar cambios</button>
      </div>
    </form>

    <h2>API Keys</h2>
    <p class="muted" style="margin-bottom:16px">
      Las API keys permiten a sistemas externos consultar datos vía la API pública de CoopDigital.
      Enviá el header <code>x-api-key: &lt;key&gt;</code> en cada request.
      Una key revocada no se puede reactivar — generá una nueva si necesitás reemplazarla.
    </p>
    <div class="toolbar" style="margin-bottom:12px">
      <div class="field" style="display:flex;gap:8px;align-items:center;margin:0">
        <input id="nuevaKeyNombre" type="text" placeholder="Nombre (ej: Integración Contable)" style="max-width:280px">
        <button class="btn primary" id="btnGenerarKey">Generar API key</button>
      </div>
    </div>
    <div id="apiKeysTable"><div class="loading">Cargando…</div></div>
  </section>`;
}

export async function bindConfiguracion() {
  const form = document.querySelector('#configForm');
  const nuevaKeyNombre = document.querySelector('#nuevaKeyNombre');
  const btnGenerarKey = document.querySelector('#btnGenerarKey');
  const apiKeysTable = document.querySelector('#apiKeysTable');

  // --- Datos institucionales ---
  try {
    const coop = await configuracionService.get();
    if (coop) {
      campos.forEach(([name]) => {
        const input = form.querySelector(`[name="${name}"]`);
        if (input) input.value = coop[name] ?? '';
      });
    }
  } catch (err) {
    toast.err(err.message);
  }

  form.onsubmit = async e => {
    e.preventDefault();
    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(form));
      await configuracionService.update(data);
      toast.ok('Datos institucionales actualizados.');
    } catch (err) {
      toast.err(err.message);
    } finally {
      submitBtn.disabled = false;
    }
  };

  // --- API Keys ---
  async function renderApiKeys() {
    apiKeysTable.innerHTML = '<div class="loading">Cargando…</div>';
    try {
      const keys = await configuracionService.listApiKeys();
      if (!keys.length) {
        apiKeysTable.innerHTML = '<p class="muted empty">No hay API keys generadas todavía.</p>';
        return;
      }
      apiKeysTable.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Nombre</th><th>Key</th><th>Estado</th><th>Creada por</th><th>Acciones</th>
            </tr></thead>
            <tbody>
              ${keys.map(k => `
                <tr>
                  <td>${escapeHtml(k.nombre)}</td>
                  <td><code class="key-value" style="font-size:0.78rem;word-break:break-all">${k.activa ? escapeHtml(k.key) : '••••••••••••••••'}</code></td>
                  <td>${k.activa
                    ? '<span class="badge ok">Activa</span>'
                    : '<span class="badge muted">Revocada</span>'}</td>
                  <td>${escapeHtml(k.creadoPor ?? '')}</td>
                  <td class="actions">
                    ${k.activa
                      ? `<button class="btn danger btn-revocar" data-id="${k.id}">Revocar</button>`
                      : '—'}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;

      apiKeysTable.querySelectorAll('.btn-revocar').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm('¿Revocar esta API key? No se puede reactivar.')) return;
          btn.disabled = true;
          try {
            await configuracionService.revokeApiKey(btn.dataset.id);
            toast.ok('API key revocada.');
            await renderApiKeys();
          } catch (err) {
            toast.err(err.message);
            btn.disabled = false;
          }
        };
      });
    } catch (err) {
      apiKeysTable.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
    }
  }

  btnGenerarKey.onclick = async () => {
    const nombre = nuevaKeyNombre.value.trim();
    if (!nombre) { toast.err('Escribí un nombre para la API key antes de generarla.'); return; }
    btnGenerarKey.disabled = true;
    try {
      const result = await configuracionService.createApiKey(nombre);
      toast.ok(`API key generada. Copiala ahora, no se vuelve a mostrar completa: ${result.key}`);
      nuevaKeyNombre.value = '';
      await renderApiKeys();
    } catch (err) {
      toast.err(err.message);
    } finally {
      btnGenerarKey.disabled = false;
    }
  };

  await renderApiKeys();
}

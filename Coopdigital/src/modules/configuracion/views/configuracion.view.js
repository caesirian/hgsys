import { configuracionService } from '../services/configuracion.service.js';
import { toast } from '../../../utils/toast.js';
import { escapeHtml } from '../../../utils/security.js';

const campos = [
  ['nombre',     'Razón social'],
  ['cuit',       'CUIT'],
  ['matricula',  'Matrícula INAES'],
  ['domicilio',  'Domicilio'],
  ['localidad',  'Localidad'],
  ['provincia',  'Provincia'],
  ['telefono',   'Teléfono'],
  ['email',      'Email institucional'],
  ['sitioWeb',   'Sitio web']
];

export function configuracionView() {
  return `<section>
    <div class="toolbar">
      <div><h1>Configuración</h1><p class="muted">Datos institucionales de la cooperativa.</p></div>
    </div>
    <form id="configForm" class="form-grid" style="max-width:640px">
      ${campos.map(([name, label]) => `
        <div class="field">
          <label>${escapeHtml(label)}</label>
          <input name="${name}" type="text">
        </div>`).join('')}
      <div style="margin-top:16px">
        <button class="btn primary" type="submit">Guardar cambios</button>
      </div>
    </form>
  </section>`;
}

export async function bindConfiguracion() {
  const form = document.querySelector('#configForm');
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
}

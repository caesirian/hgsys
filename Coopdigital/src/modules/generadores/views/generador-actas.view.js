import { plantillasService } from '../../plantillas/services/plantillas.service.js';
import { actaService } from '../../actas/services/acta.service.js';
import { configuracionService } from '../../configuracion/services/configuracion.service.js';
import { renderTemplate } from '../../../utils/template-engine.js';
import { toast } from '../../../utils/toast.js';
import { escapeHtml } from '../../../utils/security.js';

export function generadorActasView() {
  return `<section>
    <div class="toolbar">
      <div><h1>Generador de Actas</h1><p class="muted">Combiná una plantilla con los datos de un acta para generar el texto final.</p></div>
    </div>
    <div class="form-grid" style="max-width:720px">
      <div class="field">
        <label>Plantilla</label>
        <select id="selPlantilla"><option value="">Cargando…</option></select>
      </div>
      <div class="field">
        <label>Acta</label>
        <select id="selActa"><option value="">Cargando…</option></select>
      </div>
      <div class="field full">
        <button class="btn primary" id="btnGenerar">Generar texto</button>
      </div>
      <div class="field full">
        <label>Resultado</label>
        <textarea id="resultado" rows="14" readonly placeholder="El texto generado va a aparecer acá…"></textarea>
      </div>
      <div class="field full" id="copyWrap" style="display:none">
        <button class="btn ghost" id="btnCopiar">Copiar al portapapeles</button>
      </div>
    </div>
  </section>`;
}

export async function bindGeneradorActas() {
  const selPlantilla = document.querySelector('#selPlantilla');
  const selActa = document.querySelector('#selActa');
  const resultado = document.querySelector('#resultado');
  const btnGenerar = document.querySelector('#btnGenerar');
  const btnCopiar = document.querySelector('#btnCopiar');
  const copyWrap = document.querySelector('#copyWrap');

  let plantillas = [];
  let actas = [];
  let cooperativa = null;

  try {
    [plantillas, actas, cooperativa] = await Promise.all([
      plantillasService.list(),
      actaService.list(),
      configuracionService.get().catch(() => null)
    ]);
  } catch (err) {
    toast.err(err.message);
    return;
  }

  const plantillasActa = plantillas.filter(p => p.tipo === 'Acta' && p.activa);

  selPlantilla.innerHTML = plantillasActa.length
    ? plantillasActa.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('')
    : '<option value="">No hay plantillas de tipo Acta activas</option>';

  selActa.innerHTML = actas.length
    ? actas.map(a => `<option value="${a.id}">${escapeHtml(a.numeroActa)} — ${escapeHtml(a.titulo)}</option>`).join('')
    : '<option value="">No hay actas cargadas</option>';

  btnGenerar.onclick = () => {
    const plantilla = plantillas.find(p => p.id === selPlantilla.value);
    const acta = actas.find(a => a.id === selActa.value);
    if (!plantilla) { toast.err('Elegí una plantilla.'); return; }
    if (!acta) { toast.err('Elegí un acta.'); return; }

    const datos = {
      nombre: acta.titulo,
      fecha: acta.fecha,
      cooperativa: cooperativa?.nombre ?? '',
      numeroActa: acta.numeroActa,
      tipoActa: acta.tipo,
      contenidoActa: acta.contenido
    };

    resultado.value = renderTemplate(plantilla.contenido, datos);
    copyWrap.style.display = resultado.value ? 'block' : 'none';
  };

  btnCopiar.onclick = async () => {
    try {
      await navigator.clipboard.writeText(resultado.value);
      toast.ok('Texto copiado.');
    } catch {
      toast.err('No se pudo copiar. Seleccioná el texto manualmente.');
    }
  };
}

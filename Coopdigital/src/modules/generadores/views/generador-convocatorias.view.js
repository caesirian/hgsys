import { plantillasService } from '../../plantillas/services/plantillas.service.js';
import { asambleaService } from '../../asambleas/services/asamblea.service.js';
import { configuracionService } from '../../configuracion/services/configuracion.service.js';
import { renderTemplate } from '../../../utils/template-engine.js';
import { toast } from '../../../utils/toast.js';
import { escapeHtml } from '../../../utils/security.js';

export function generadorConvocatoriasView() {
  return `<section>
    <div class="toolbar">
      <div><h1>Generador de Convocatorias</h1><p class="muted">Combiná una plantilla con los datos de una asamblea para generar la convocatoria.</p></div>
    </div>
    <div class="form-grid" style="max-width:720px">
      <div class="field">
        <label>Plantilla</label>
        <select id="selPlantilla"><option value="">Cargando…</option></select>
      </div>
      <div class="field">
        <label>Asamblea</label>
        <select id="selAsamblea"><option value="">Cargando…</option></select>
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

export async function bindGeneradorConvocatorias() {
  const selPlantilla = document.querySelector('#selPlantilla');
  const selAsamblea = document.querySelector('#selAsamblea');
  const resultado = document.querySelector('#resultado');
  const btnGenerar = document.querySelector('#btnGenerar');
  const btnCopiar = document.querySelector('#btnCopiar');
  const copyWrap = document.querySelector('#copyWrap');

  let plantillas = [];
  let asambleas = [];
  let cooperativa = null;

  try {
    [plantillas, asambleas, cooperativa] = await Promise.all([
      plantillasService.list(),
      asambleaService.list(),
      configuracionService.get().catch(() => null)
    ]);
  } catch (err) {
    toast.err(err.message);
    return;
  }

  const plantillasConvocatoria = plantillas.filter(p => p.tipo === 'Convocatoria' && p.activa);

  selPlantilla.innerHTML = plantillasConvocatoria.length
    ? plantillasConvocatoria.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('')
    : '<option value="">No hay plantillas de tipo Convocatoria activas</option>';

  selAsamblea.innerHTML = asambleas.length
    ? asambleas.map(a => `<option value="${a.id}">${escapeHtml(a.tipo)} — ${escapeHtml(a.fechaAsamblea)}</option>`).join('')
    : '<option value="">No hay asambleas cargadas</option>';

  btnGenerar.onclick = () => {
    const plantilla = plantillas.find(p => p.id === selPlantilla.value);
    const asamblea = asambleas.find(a => a.id === selAsamblea.value);
    if (!plantilla) { toast.err('Elegí una plantilla.'); return; }
    if (!asamblea) { toast.err('Elegí una asamblea.'); return; }

    const datos = {
      nombre: asamblea.tipo,
      fecha: asamblea.fechaAsamblea,
      fechaConvocatoria: asamblea.fechaConvocatoria,
      cooperativa: cooperativa?.nombre ?? '',
      domicilio: cooperativa?.domicilio ?? '',
      tipoAsamblea: asamblea.tipo,
      ordenDelDia: (asamblea.ordenDelDia || []).map((p, i) => `${i + 1}. ${p}`).join('\n')
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

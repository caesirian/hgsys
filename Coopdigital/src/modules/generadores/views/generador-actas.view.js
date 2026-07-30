import { plantillasService } from '../../plantillas/services/plantillas.service.js';
import { actaService } from '../../actas/services/acta.service.js';
import { configuracionService } from '../../configuracion/services/configuracion.service.js';
import { renderTemplate } from '../../../utils/template-engine.js';
import { toast } from '../../../utils/toast.js';
import { escapeHtml } from '../../../utils/security.js';
import { fmt } from '../../../utils/date.js';

// Variables disponibles para plantillas de tipo Acta:
// {{numeroActa}}   — número del acta
// {{tipoActa}}     — tipo (Consejo, Asamblea Ordinaria, etc.)
// {{fecha}}        — fecha formateada
// {{titulo}}       — título del acta
// {{contenido}}    — cuerpo del acta
// {{cooperativa}}  — nombre de la cooperativa
// {{cuit}}         — CUIT de la cooperativa
// {{matricula}}    — matrícula INAES
// {{domicilio}}    — domicilio fiscal

export function generadorActasView() {
  return `<section>
    <div class="toolbar">
      <div>
        <h1>Generador de Actas</h1>
        <p class="muted">Combiná una plantilla con los datos de un acta para generar el documento.</p>
      </div>
    </div>

    <div class="form-grid" style="max-width:760px">
      <div class="field">
        <label>Plantilla de acta</label>
        <select id="selPlantilla"><option value="">Cargando…</option></select>
      </div>
      <div class="field">
        <label>Acta</label>
        <select id="selActa"><option value="">Cargando…</option></select>
      </div>

      <div class="field full" style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn primary" id="btnGenerar">Generar documento</button>
        <button class="btn ghost" id="btnVariables" title="Ver variables disponibles">Variables disponibles</button>
      </div>

      <div class="field full" id="varsPanel" style="display:none">
        <div class="card" style="padding:16px;font-size:.82rem">
          <p style="margin-bottom:8px;font-weight:600">Variables que podés usar en tus plantillas:</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px">
            ${[
              ['{{numeroActa}}','Número del acta'],
              ['{{tipoActa}}','Tipo de acta'],
              ['{{fecha}}','Fecha del acta'],
              ['{{titulo}}','Título del acta'],
              ['{{contenido}}','Cuerpo del acta'],
              ['{{cooperativa}}','Nombre de la cooperativa'],
              ['{{cuit}}','CUIT de la cooperativa'],
              ['{{matricula}}','Matrícula INAES'],
              ['{{domicilio}}','Domicilio fiscal'],
            ].map(([v,d]) => `<code style="color:var(--cyan)">${v}</code><span class="muted">${d}</span>`).join('')}
          </div>
        </div>
      </div>

      <div class="field full">
        <label>Documento generado</label>
        <textarea id="resultado" rows="18" readonly
          placeholder="Seleccioná una plantilla y un acta, luego presioná Generar documento…"
          style="font-family:'Courier New',monospace;font-size:.85rem;line-height:1.6"></textarea>
      </div>

      <div class="field full" id="copyWrap" style="display:none;gap:8px;flex-wrap:wrap">
        <button class="btn ghost" id="btnCopiar">📋 Copiar al portapapeles</button>
        <button class="btn ghost" id="btnImprimir">🖨️ Imprimir</button>
      </div>
    </div>
  </section>`;
}

export async function bindGeneradorActas() {
  const selPlantilla = document.querySelector('#selPlantilla');
  const selActa      = document.querySelector('#selActa');
  const resultado    = document.querySelector('#resultado');
  const btnGenerar   = document.querySelector('#btnGenerar');
  const btnCopiar    = document.querySelector('#btnCopiar');
  const btnImprimir  = document.querySelector('#btnImprimir');
  const btnVariables = document.querySelector('#btnVariables');
  const varsPanel    = document.querySelector('#varsPanel');
  const copyWrap     = document.querySelector('#copyWrap');

  let plantillas = [];
  let actas = [];
  let cooperativa = null;

  btnVariables.onclick = () => {
    const visible = varsPanel.style.display !== 'none';
    varsPanel.style.display = visible ? 'none' : 'block';
    btnVariables.textContent = visible ? 'Variables disponibles' : 'Ocultar variables';
  };

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

  // Filtro robusto: acepta activa como booleano true o string 'true'
  const plantillasActa = plantillas.filter(p =>
    p.tipo === 'Acta' && (p.activa === true || p.activa === 'true')
  );

  if (!plantillasActa.length) {
    selPlantilla.innerHTML = '<option value="">No hay plantillas de tipo Acta activas — cargá una en Plantillas</option>';
  } else {
    selPlantilla.innerHTML = '<option value="">— elegí una plantilla —</option>' +
      plantillasActa.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('');
  }

  // Ordenar actas por número descendente
  const actasOrdenadas = [...actas].sort((a, b) =>
    String(b.numeroActa).localeCompare(String(a.numeroActa), undefined, { numeric: true })
  );

  if (!actasOrdenadas.length) {
    selActa.innerHTML = '<option value="">No hay actas cargadas</option>';
  } else {
    selActa.innerHTML = '<option value="">— elegí un acta —</option>' +
      actasOrdenadas.map(a =>
        `<option value="${a.id}">N° ${escapeHtml(a.numeroActa)} — ${escapeHtml(a.titulo)} (${escapeHtml(a.tipo)})</option>`
      ).join('');
  }

  btnGenerar.onclick = () => {
    const plantilla = plantillas.find(p => p.id === selPlantilla.value);
    const acta      = actas.find(a => a.id === selActa.value);

    if (!plantilla) { toast.err('Elegí una plantilla.'); return; }
    if (!acta)      { toast.err('Elegí un acta.'); return; }

    const datos = {
      numeroActa:  acta.numeroActa  ?? '',
      tipoActa:    acta.tipo        ?? '',
      fecha:       acta.fecha ? fmt(acta.fecha) : '',
      titulo:      acta.titulo      ?? '',
      contenido:   acta.contenido   ?? '',
      cooperativa: cooperativa?.nombre    ?? '',
      cuit:        cooperativa?.cuit      ?? '',
      matricula:   cooperativa?.matricula ?? '',
      domicilio:   cooperativa?.domicilio ?? '',
    };

    const texto = renderTemplate(plantilla.contenido, datos);
    resultado.value = texto;
    copyWrap.style.display = texto.trim() ? 'flex' : 'none';
    if (texto.trim()) resultado.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  btnCopiar.onclick = async () => {
    try {
      await navigator.clipboard.writeText(resultado.value);
      toast.ok('Texto copiado al portapapeles.');
    } catch {
      toast.err('No se pudo copiar automáticamente. Seleccioná el texto manualmente con Ctrl+A.');
    }
  };

  btnImprimir.onclick = () => {
    const ventana = window.open('', '_blank');
    ventana.document.write(`<!DOCTYPE html><html lang="es"><head>
      <meta charset="utf-8">
      <title>Acta generada</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.8;
               margin: 3cm 2.5cm; color: #000; }
        pre  { white-space: pre-wrap; font-family: inherit; font-size: inherit; }
        @media print { body { margin: 2cm; } }
      </style>
    </head><body><pre>${escapeHtml(resultado.value)}</pre></body></html>`);
    ventana.document.close();
    ventana.focus();
    ventana.print();
    ventana.close();
  };
}

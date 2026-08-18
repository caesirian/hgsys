import { plantillasService } from '../../plantillas/services/plantillas.service.js';
import { actaService } from '../../actas/services/acta.service.js';
import { configuracionService } from '../../configuracion/services/configuracion.service.js';
import { renderTemplate } from '../../../utils/template-engine.js';
import { toast } from '../../../utils/toast.js';
import { escapeHtml } from '../../../utils/security.js';
import { fmt } from '../../../utils/date.js';

const PLANTILLAS_MODELO = [
  {
    nombre: 'Acta de Reunión de Consejo de Administración',
    tipo: 'Acta', activa: true,
    descripcion: 'Plantilla estándar para actas del Consejo de Administración.',
    contenido: 'ACTA N° {{numeroActa}} — REUNIÓN DE {{tipoActa}}\n{{cooperativa}} | Mat. INAES N° {{matricula}} | CUIT {{cuit}}\n{{domicilio}}\n\nEn la Ciudad Autónoma de Buenos Aires, a los {{fecha}}, siendo las _____ horas, se reúne el Consejo de Administración de {{cooperativa}}.\n\nORDEN DEL DÍA:\n{{contenido}}\n\nSin más temas a tratar, se da por finalizada la reunión siendo las _____ horas.\n\n___________________________     ___________________________\nPRESIDENTE                       SECRETARIO\n\n___________________________     ___________________________\nTESOREO                          VOCAL TITULAR\n\n___________________________\nSÍNDICO TITULAR'
  },
  {
    nombre: 'Acta de Asamblea General Ordinaria',
    tipo: 'Acta', activa: true,
    descripcion: 'Plantilla para Asamblea General Ordinaria (art. 47 Ley 20.337).',
    contenido: 'ACTA N° {{numeroActa}} — {{tipoActa}}\n{{cooperativa}} | Mat. INAES N° {{matricula}} | CUIT {{cuit}}\n{{domicilio}}\n\nEn la Ciudad Autónoma de Buenos Aires, a los {{fecha}}, siendo las _____ horas, se realiza la {{tipoActa}} de {{cooperativa}}, previa convocatoria conforme art. 47 Ley 20.337.\n\nASOCIADOS PRESENTES: _____ sobre _____ con derecho a voto. Quórum verificado.\n\nPresidente de asamblea: _____________________________\nSecretario de asamblea: _____________________________\n\nORDEN DEL DÍA:\n{{contenido}}\n\nAgotados los temas, se da por finalizada la asamblea siendo las _____ horas.\n\n___________________________     ___________________________\nPRESIDENTE DE ASAMBLEA           SECRETARIO DE ASAMBLEA\n\n___________________________\nSÍNDICO TITULAR'
  },
  {
    nombre: 'Acta de Asamblea General Extraordinaria',
    tipo: 'Acta', activa: true,
    descripcion: 'Plantilla para Asamblea General Extraordinaria.',
    contenido: 'ACTA N° {{numeroActa}} — {{tipoActa}}\n{{cooperativa}} | Mat. INAES N° {{matricula}} | CUIT {{cuit}}\n{{domicilio}}\n\nEn la Ciudad Autónoma de Buenos Aires, a los {{fecha}}, siendo las _____ horas, se realiza la {{tipoActa}} de {{cooperativa}}, convocada para tratar puntos de carácter urgente.\n\nASOCIADOS PRESENTES: _____ sobre _____ con derecho a voto. Quórum verificado.\n\nPresidente de asamblea: _____________________________\nSecretario de asamblea: _____________________________\n\nPUNTOS A TRATAR:\n{{contenido}}\n\nSe da por finalizada la asamblea siendo las _____ horas.\n\n___________________________     ___________________________\nPRESIDENTE DE ASAMBLEA           SECRETARIO DE ASAMBLEA\n\n___________________________\nSÍNDICO TITULAR'
  },
  {
    nombre: 'Acta de Comisión Interna',
    tipo: 'Acta', activa: true,
    descripcion: 'Plantilla para reuniones de comisión interna o comité.',
    contenido: 'ACTA N° {{numeroActa}} — COMISIÓN INTERNA\n{{cooperativa}} | Mat. INAES N° {{matricula}}\n\nFecha: {{fecha}} | Lugar: {{domicilio}}\n\nPRESENTES:\n_____________________________________________________________\n\nTEMAS TRATADOS:\n{{contenido}}\n\nRESOLUCIONES ADOPTADAS:\n_____________________________________________________________\n\nSe firma la presente al pie siendo las _____ horas.\n\n___________________________     ___________________________\nCOORDINADOR                      SECRETARIO DE ACTAS'
  }
];

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

      <div class="field full" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <button class="btn primary" id="btnGenerar">Generar documento</button>
        <button class="btn ghost" id="btnVariables">Variables disponibles</button>
        <button class="btn ghost" id="btnCargarModelos">⬇️ Cargar plantillas modelo</button>
      </div>

      <div class="field full" id="varsPanel" style="display:none">
        <div class="card" style="padding:16px;font-size:.82rem">
          <p style="margin-bottom:8px;font-weight:600">Variables disponibles en tus plantillas:</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px">
            <code style="color:var(--cyan)">{{numeroActa}}</code><span class="muted">Número del acta</span>
            <code style="color:var(--cyan)">{{tipoActa}}</code><span class="muted">Tipo de acta</span>
            <code style="color:var(--cyan)">{{fecha}}</code><span class="muted">Fecha del acta</span>
            <code style="color:var(--cyan)">{{titulo}}</code><span class="muted">Título del acta</span>
            <code style="color:var(--cyan)">{{contenido}}</code><span class="muted">Cuerpo del acta</span>
            <code style="color:var(--cyan)">{{cooperativa}}</code><span class="muted">Nombre de la cooperativa</span>
            <code style="color:var(--cyan)">{{cuit}}</code><span class="muted">CUIT de la cooperativa</span>
            <code style="color:var(--cyan)">{{matricula}}</code><span class="muted">Matrícula INAES</span>
            <code style="color:var(--cyan)">{{domicilio}}</code><span class="muted">Domicilio fiscal</span>
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
        <button class="btn ghost" id="btnCopiar">📋 Copiar</button>
        <button class="btn ghost" id="btnImprimir">🖨️ Imprimir / PDF</button>
      </div>
    </div>
  </section>`;
}

export async function bindGeneradorActas() {
  const selPlantilla     = document.querySelector('#selPlantilla');
  const selActa          = document.querySelector('#selActa');
  const resultado        = document.querySelector('#resultado');
  const btnGenerar       = document.querySelector('#btnGenerar');
  const btnCopiar        = document.querySelector('#btnCopiar');
  const btnImprimir      = document.querySelector('#btnImprimir');
  const btnVariables     = document.querySelector('#btnVariables');
  const varsPanel        = document.querySelector('#varsPanel');
  const copyWrap         = document.querySelector('#copyWrap');
  const btnCargarModelos = document.querySelector('#btnCargarModelos');

  let plantillas = [];
  let actas = [];
  let cooperativa = null;

  async function cargarDatos() {
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

    const plantillasActa = plantillas.filter(p =>
      p.tipo === 'Acta' && (p.activa === true || p.activa === 'true')
    );

    selPlantilla.innerHTML = plantillasActa.length
      ? '<option value="">— elegí una plantilla —</option>' +
        plantillasActa.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('')
      : '<option value="">Sin plantillas — usá "Cargar plantillas modelo"</option>';

    const actasOrd = [...actas].sort((a, b) =>
      String(b.numeroActa).localeCompare(String(a.numeroActa), undefined, { numeric: true })
    );

    selActa.innerHTML = actasOrd.length
      ? '<option value="">— elegí un acta —</option>' +
        actasOrd.map(a =>
          `<option value="${a.id}">N° ${escapeHtml(a.numeroActa)} — ${escapeHtml(a.titulo)} (${escapeHtml(a.tipo)})</option>`
        ).join('')
      : '<option value="">No hay actas cargadas</option>';
  }

  await cargarDatos();

  btnVariables.onclick = () => {
    const vis = varsPanel.style.display !== 'none';
    varsPanel.style.display = vis ? 'none' : 'block';
    btnVariables.textContent = vis ? 'Variables disponibles' : 'Ocultar variables';
  };

  btnCargarModelos.onclick = async () => {
    if (!confirm(`¿Cargar ${PLANTILLAS_MODELO.length} plantillas modelo de actas?\nSi ya existen con el mismo nombre se van a duplicar.`)) return;
    btnCargarModelos.disabled = true;
    btnCargarModelos.textContent = 'Cargando…';
    try {
      for (const p of PLANTILLAS_MODELO) {
        await plantillasService.create(p);
      }
      toast.ok(`${PLANTILLAS_MODELO.length} plantillas modelo cargadas.`);
      await cargarDatos();
    } catch (err) {
      toast.err('Error al cargar plantillas: ' + err.message);
    } finally {
      btnCargarModelos.disabled = false;
      btnCargarModelos.textContent = '⬇️ Cargar plantillas modelo';
    }
  };

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
      toast.ok('Copiado al portapapeles.');
    } catch {
      toast.err('No se pudo copiar automáticamente. Seleccioná el texto con Ctrl+A.');
    }
  };

  btnImprimir.onclick = () => {
    const ventana = window.open('', '_blank');
    ventana.document.write(`<!DOCTYPE html><html lang="es"><head>
      <meta charset="utf-8"><title>Acta generada</title>
      <style>
        body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.8;margin:3cm 2.5cm;color:#000}
        pre{white-space:pre-wrap;font-family:inherit;font-size:inherit}
        @media print{body{margin:2cm}}
      </style>
    </head><body><pre>${escapeHtml(resultado.value)}</pre></body></html>`);
    ventana.document.close();
    ventana.focus();
    ventana.print();
    setTimeout(() => ventana.close(), 1000);
  };
}

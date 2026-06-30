import { firmasService } from '../services/firmas.service.js';
import { toast } from '../../../utils/toast.js';
import { escapeHtml } from '../../../utils/security.js';
import { table } from '../../../components/table/data-table.js';

async function obtenerIp() {
  try {
    const resp = await fetch('https://api.ipify.org?format=json');
    const data = await resp.json();
    return data.ip || '';
  } catch {
    return '';
  }
}

const columns = [
  { key: 'documentoTipo',    label: 'Tipo' },
  { key: 'documentoTitulo',  label: 'Documento' },
  { key: 'firmanteNombre',   label: 'Firmante' },
  { key: 'firmanteDni',      label: 'DNI' },
  { key: 'fechaFirma',       label: 'Fecha' },
  { key: 'ip',               label: 'IP' }
];

export function firmasView() {
  return `<section>
    <div class="toolbar">
      <div><h1>Firma Digital</h1><p class="muted">Registro de aceptación simple (nombre, DNI, fecha e IP). No constituye firma digital con valor legal bajo la Ley 25.506.</p></div>
    </div>
    <form id="firmaForm" class="form-grid" style="max-width:640px;margin-bottom:24px">
      <div class="field">
        <label>Tipo de documento</label>
        <select name="documentoTipo">
          <option value="Acta">Acta</option>
          <option value="Comunicación">Comunicación</option>
          <option value="Trámite">Trámite</option>
          <option value="Documento">Documento</option>
          <option value="Otro">Otro</option>
        </select>
      </div>
      <div class="field">
        <label>ID de referencia (opcional)</label>
        <input name="documentoId" type="text">
      </div>
      <div class="field full">
        <label>Título del documento</label>
        <input name="documentoTitulo" type="text" required>
      </div>
      <div class="field">
        <label>Nombre del firmante</label>
        <input name="firmanteNombre" type="text" required>
      </div>
      <div class="field">
        <label>DNI del firmante</label>
        <input name="firmanteDni" type="text" required>
      </div>
      <div class="field full">
        <label><input type="checkbox" name="aceptoTerminos" value="true"> Confirmo que esta firma simple registra mi aceptación del documento indicado, sin valor de firma digital certificada.</label>
      </div>
      <div class="field full">
        <button class="btn primary" type="submit">Registrar firma</button>
      </div>
    </form>
    <h2>Historial de firmas</h2>
    <div id="firmasTable"><div class="loading">Cargando datos…</div></div>
  </section>`;
}

export async function bindFirmas() {
  const form = document.querySelector('#firmaForm');
  const tableEl = document.querySelector('#firmasTable');

  async function loadTable() {
    tableEl.innerHTML = '<div class="loading">Cargando datos…</div>';
    try {
      const rows = await firmasService.list();
      tableEl.innerHTML = rows.length
        ? table(columns, rows, () => '')
        : '<p class="muted empty">Todavía no hay firmas registradas.</p>';
    } catch (err) {
      tableEl.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
    }
  }

  form.onsubmit = async e => {
    e.preventDefault();
    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(form));
      data.fechaFirma = new Date().toISOString();
      data.userAgent = navigator.userAgent;
      data.ip = await obtenerIp();
      await firmasService.create(data);
      toast.ok('Firma registrada.');
      form.reset();
      await loadTable();
    } catch (err) {
      toast.err(err.message);
    } finally {
      submitBtn.disabled = false;
    }
  };

  await loadTable();
}

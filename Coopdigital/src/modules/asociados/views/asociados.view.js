import { asociadoService } from '../services/asociado.service.js';
import { asociadoFields } from '../components/asociado-form.js';
import { crudView, bindCrud } from '../../../utils/render-crud.js';
import { certificadoService } from '../../certificados/services/certificado.service.js';
import { cooperativaService } from '../../../services/cooperativa.service.js';
import { exportarNominaInaes } from '../../../utils/export-inaes.js';
import { escapeHtml } from '../../../utils/security.js';
import { toast } from '../../../utils/toast.js';

const badge = e => `<span class="badge ${e === 'activo' ? 'ok' : e === 'suspendido' ? 'warn' : 'bad'}">${escapeHtml(e)}</span>`;

const columns = [
  { key: 'numeroAsociado', label: 'N°' },
  { key: 'apellido', label: 'Asociado', render: r => `${escapeHtml(r.apellido)}, ${escapeHtml(r.nombre)}` },
  { key: 'dni',      label: 'DNI' },
  { key: 'cuit',     label: 'CUIT' },
  { key: 'email',    label: 'Email' },
  { key: 'estado',   label: 'Estado', render: r => badge(r.estado) },
  { key: 'fechaIngreso', label: 'Ingreso' }
];

// Dropdown con los tres tipos de certificado por cada fila de asociado.
const extraActions = {
  render: (r) => `
    <div class="cert-menu">
      <button class="btn ghost cert-toggle">Certificado ▾</button>
      <div class="cert-dropdown" hidden>
        <button data-cert="${r.id}" data-tipo="asociado">Asociado activo</button>
        <button data-cert="${r.id}" data-tipo="cargo">Cargo</button>
        <button data-cert="${r.id}" data-tipo="constancia">Constancia</button>
      </div>
    </div>`,

  bind: (allRows) => {
    // Toggle del dropdown
    document.querySelectorAll('.cert-toggle').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const dd = btn.nextElementSibling;
        const wasHidden = dd.hidden;
        document.querySelectorAll('.cert-dropdown').forEach(d => { d.hidden = true; });
        dd.hidden = !wasHidden;
      };
    });

    // Emisión del certificado
    document.querySelectorAll('[data-cert]').forEach(btn => {
      btn.onclick = async () => {
        btn.closest('.cert-dropdown').hidden = true;
        const row = allRows.find(r => r.id === btn.dataset.cert);
        try {
          await certificadoService.emitir(btn.dataset.tipo, row);
          toast.ok('Certificado generado. Usá Imprimir / Guardar PDF en la ventana.');
        } catch (err) {
          toast.err(err.message);
        }
      };
    });

    // Cerrar dropdowns al hacer click fuera
    document.addEventListener('click', () => {
      document.querySelectorAll('.cert-dropdown').forEach(d => { d.hidden = true; });
    });
  }
};

export function asociadosView() {
  // Mismo skeleton que crudView pero con botón de exportación INAES adicional.
  return `<section>
    <div class="toolbar">
      <div><h1>Asociados</h1><p class="muted">CRUD completo de asociados.</p></div>
      <div class="toolbar-right">
        <input class="search-input" type="search" placeholder="Buscar…" id="tableSearch">
        <button class="btn ghost" id="btnExportInaes" title="Exportar nómina en formato INAES (Excel)">
          ⬇ Exportar INAES
        </button>
        <button class="btn primary" data-create>Nuevo asociado</button>
      </div>
    </div>
    <div id="crudTable"><div class="loading">Cargando datos…</div></div>
  </section>`;
}

export function bindAsociados() {
  // Bind del botón de exportación INAES (independiente del ciclo CRUD).
  const btnExport = document.querySelector('#btnExportInaes');
  if (btnExport) {
    btnExport.addEventListener('click', async () => {
      btnExport.disabled = true;
      btnExport.textContent = '⬇ Generando…';
      try {
        const [asociados, cooperativa] = await Promise.all([
          asociadoService.list(),
          cooperativaService.getCurrent().catch(() => null),
        ]);
        const resultado = await exportarNominaInaes(asociados, cooperativa);
        toast.ok(`Nómina exportada (${resultado.cantidad} asociados, formato ${resultado.formato.toUpperCase()}).`);
      } catch (err) {
        toast.err(err.message);
      } finally {
        btnExport.disabled = false;
        btnExport.textContent = '⬇ Exportar INAES';
      }
    });
  }

  return bindCrud({ service: asociadoService, fields: asociadoFields, columns, extraActions });
}

import { movimientoService } from '../services/movimiento.service.js';
import { balanceService } from '../services/balance.service.js';
import { movimientoFields } from '../components/movimiento-form.js';
import { bindCrud } from '../../../utils/render-crud.js';
import { fmt } from '../../../utils/date.js';
import { escapeHtml } from '../../../utils/security.js';
import { toast } from '../../../utils/toast.js';

const money = n => Number(n ?? 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const esc = escapeHtml;

function calcularKPIs(movimientos) {
  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const activos = movimientos.filter(m => !m.anulado);
  const delMes  = activos.filter(m => (m.fecha ?? '').startsWith(mesActual));
  const ingresosMes   = delMes.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + Number(m.monto ?? 0), 0);
  const egresosMes    = delMes.filter(m => m.tipo === 'egreso').reduce((s, m) => s + Number(m.monto ?? 0), 0);
  const totalIngresos = activos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + Number(m.monto ?? 0), 0);
  const totalEgresos  = activos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + Number(m.monto ?? 0), 0);
  return { ingresosMes, egresosMes, saldo: totalIngresos - totalEgresos };
}

function renderKPIs(movimientos) {
  const { ingresosMes, egresosMes, saldo } = calcularKPIs(movimientos);
  const mesLabel = new Date().toLocaleString('es-AR', { month: 'long', year: 'numeric' });
  const resMes = ingresosMes - egresosMes;
  return `<div class="kpi-row" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">
    <div class="card kpi-card" style="flex:1;min-width:160px;padding:16px">
      <p class="muted" style="font-size:.8rem;margin:0 0 4px">Ingresos — ${mesLabel}</p>
      <p style="margin:0;font-size:1.25rem;font-weight:700;color:var(--success)">${money(ingresosMes)}</p>
    </div>
    <div class="card kpi-card" style="flex:1;min-width:160px;padding:16px">
      <p class="muted" style="font-size:.8rem;margin:0 0 4px">Egresos — ${mesLabel}</p>
      <p style="margin:0;font-size:1.25rem;font-weight:700;color:var(--danger)">${money(egresosMes)}</p>
    </div>
    <div class="card kpi-card" style="flex:1;min-width:160px;padding:16px">
      <p class="muted" style="font-size:.8rem;margin:0 0 4px">Resultado mes</p>
      <p style="margin:0;font-size:1.25rem;font-weight:700;color:${resMes >= 0 ? 'var(--success)' : 'var(--danger)'}">${money(resMes)}</p>
    </div>
    <div class="card kpi-card" style="flex:1;min-width:160px;padding:16px">
      <p class="muted" style="font-size:.8rem;margin:0 0 4px">Saldo acumulado</p>
      <p style="margin:0;font-size:1.25rem;font-weight:700;color:${saldo >= 0 ? 'var(--success)' : 'var(--danger)'}">${money(saldo)}</p>
    </div>
  </div>`;
}

const columns = [
  { key: 'nroAsiento',     label: 'N° Asiento',   render: r => r.nroAsiento
      ? `<span class="muted" style="font-size:.8rem">#${r.nroAsiento}</span>` : '—' },
  { key: 'fecha',          label: 'Fecha',         render: r => fmt(r.fecha) },
  { key: 'tipo',           label: 'Tipo',           render: r => {
      const badge = `<span class="badge ${r.tipo === 'ingreso' ? 'ok' : 'bad'}">${esc(r.tipo)}</span>`;
      if (r.anulado)     return `${badge} <span class="badge muted">ANULADO</span>`;
      if (r.esAnulacion) return `${badge} <span class="badge warn">ANULACIÓN</span>`;
      return badge;
    }
  },
  { key: 'categoria',      label: 'Categoría' },
  { key: 'monto',          label: 'Monto',          render: r => {
      const style = r.anulado ? 'text-decoration:line-through;opacity:.5' : '';
      return `<span style="${style}">${money(r.monto)}</span>`;
    }
  },
  { key: 'comprobante',    label: 'Comprobante' },
  { key: 'comprobanteUrl', label: 'Archivo',        render: r => r.comprobanteUrl
      ? `<a href="${esc(r.comprobanteUrl)}" target="_blank" rel="noopener">Ver</a>` : '—' },
  { key: 'descripcion',    label: 'Descripción' }
];

// Acción extra: anular movimiento (en vez de borrar)
function extraActions(row, reload) {
  if (row.anulado || row.esAnulacion) return '';
  return `<button class="btn danger btn-anular" data-id="${esc(row.id)}"
    style="font-size:.78rem;padding:4px 8px">Anular</button>`;
}

export function contabilidadView() {
  return `<section>
    <div class="toolbar">
      <div>
        <h1>Contabilidad</h1>
        <p class="muted">Registro simplificado de ingresos y egresos por categoría INAES.</p>
      </div>
      <div class="toolbar-right" style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn ghost" id="btnCerrarEjercicio">🔒 Cerrar ejercicio</button>
        <input class="search-input" type="search" placeholder="Buscar…" id="tableSearch">
        <button class="btn primary" data-create>+ Nuevo movimiento</button>
      </div>
    </div>
    <div id="kpiResumen"></div>
    <div id="crudTable"><div class="loading">Cargando datos…</div></div>

    <!-- Panel cierre de ejercicio (colapsable) -->
    <div id="cierrePanel" style="display:none;margin-top:20px">
      <div class="card" style="padding:20px;border:2px solid var(--danger);max-width:600px">
        <h3 style="color:var(--danger);margin-bottom:8px">⚠️ Cierre de Ejercicio</h3>
        <p class="muted" style="font-size:.85rem;margin-bottom:16px">
          Esta operación es irreversible. El resultado del ejercicio se incorpora al capital social
          y se genera un nuevo período. Confirmá los datos con el contador antes de proceder.
        </p>
        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:12px;max-width:500px">
          <div class="field">
            <label>Resultado del ejercicio ($)</label>
            <input type="number" id="cierreResultado" step="0.01" readonly
              style="opacity:.7" placeholder="Se calcula automáticamente">
          </div>
          <div class="field">
            <label>Saldo real de caja al cierre ($)</label>
            <input type="number" id="cierreSaldoCaja" step="0.01" placeholder="Verificar con arqueo">
          </div>
          <div class="field">
            <label>Fecha de cierre</label>
            <input type="date" id="cierreFecha" value="${new Date().toISOString().slice(0,10)}">
          </div>
          <div class="field" style="display:flex;align-items:flex-end">
            <button class="btn danger" id="btnConfirmarCierre" style="width:100%">Confirmar cierre</button>
          </div>
        </div>
        <button class="btn ghost" id="btnCancelarCierre" style="margin-top:8px">Cancelar</button>
      </div>
    </div>
  </section>`;
}

export async function bindContabilidad() {
  const cierrePanel = document.querySelector('#cierrePanel');
  const btnCerrar   = document.querySelector('#btnCerrarEjercicio');
  const btnCancelar = document.querySelector('#btnCancelarCierre');
  const btnConfirmar = document.querySelector('#btnConfirmarCierre');

  let movimientosCargados = [];

  // Cablear anulación después de cada render de la tabla
  function bindAnulaciones() {
    document.querySelectorAll('.btn-anular').forEach(btn => {
      btn.onclick = async () => {
        const motivo = prompt('Motivo de la anulación (requerido):');
        if (motivo === null) return;
        if (!motivo.trim()) { toast.err('El motivo es obligatorio.'); return; }
        btn.disabled = true;
        try {
          await movimientoService.anular(btn.dataset.id, motivo.trim());
          toast.ok('Movimiento anulado. Se generó el asiento de anulación.');
          document.querySelector('[data-reload]')?.click();
        } catch (err) {
          toast.err(err.message);
          btn.disabled = false;
        }
      };
    });
  }

  await bindCrud({
    service: movimientoService,
    fields: movimientoFields,
    columns,
    extraActions: (row) => extraActions(row),
    onAfterLoad: (movimientos) => {
      movimientosCargados = movimientos;
      const el = document.querySelector('#kpiResumen');
      if (el) el.innerHTML = renderKPIs(movimientos);
      setTimeout(bindAnulaciones, 0);
    }
  });

  // Cierre de ejercicio
  btnCerrar.onclick = async () => {
    const visible = cierrePanel.style.display !== 'none';
    cierrePanel.style.display = visible ? 'none' : 'block';
    if (!visible) {
      // Calcular resultado automáticamente
      const activos = movimientosCargados.filter(m => !m.anulado);
      const totalI  = activos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + Number(m.monto ?? 0), 0);
      const totalE  = activos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + Number(m.monto ?? 0), 0);
      document.querySelector('#cierreResultado').value = (totalI - totalE).toFixed(2);
    }
  };

  btnCancelar.onclick = () => { cierrePanel.style.display = 'none'; };

  btnConfirmar.onclick = async () => {
    const resultado   = Number(document.querySelector('#cierreResultado').value);
    const saldoCaja   = Number(document.querySelector('#cierreSaldoCaja').value);
    const fechaCierre = document.querySelector('#cierreFecha').value;

    if (!fechaCierre)    { toast.err('Ingresá la fecha de cierre.'); return; }
    if (!saldoCaja && saldoCaja !== 0) { toast.err('Ingresá el saldo real de caja.'); return; }
    if (!confirm(`¿Confirmar cierre del ejercicio al ${fechaCierre}?\n\nResultado: ${money(resultado)}\nSaldo de caja: ${money(saldoCaja)}\n\nEsta operación no se puede deshacer.`)) return;

    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Cerrando…';
    try {
      await balanceService.cerrarEjercicio({
        resultadoEjercicio: resultado,
        fechaCierre,
        nuevoSaldoCaja: saldoCaja
      });
      toast.ok('Ejercicio cerrado correctamente. El nuevo período comienza desde ' + fechaCierre);
      cierrePanel.style.display = 'none';
    } catch (err) {
      toast.err(err.message);
    } finally {
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = 'Confirmar cierre';
    }
  };
}

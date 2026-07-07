import { movimientoService } from '../services/movimiento.service.js';
import { movimientoFields } from '../components/movimiento-form.js';
import { bindCrud } from '../../../utils/render-crud.js';
import { fmt } from '../../../utils/date.js';
import { escapeHtml } from '../../../utils/security.js';

const money = n => Number(n ?? 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

function calcularKPIs(movimientos) {
  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const delMes = movimientos.filter(m => (m.fecha ?? '').startsWith(mesActual));
  const ingresosMes = delMes.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + Number(m.monto ?? 0), 0);
  const egresosMes  = delMes.filter(m => m.tipo === 'egreso').reduce((s, m) => s + Number(m.monto ?? 0), 0);
  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + Number(m.monto ?? 0), 0);
  const totalEgresos  = movimientos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + Number(m.monto ?? 0), 0);
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
  { key: 'fecha',          label: 'Fecha',        render: r => fmt(r.fecha) },
  { key: 'tipo',           label: 'Tipo',          render: r => `<span class="badge ${r.tipo === 'ingreso' ? 'ok' : 'bad'}">${escapeHtml(r.tipo)}</span>` },
  { key: 'categoria',      label: 'Categoría' },
  { key: 'monto',          label: 'Monto',         render: r => money(r.monto) },
  { key: 'medioPago',      label: 'Medio de pago' },
  { key: 'comprobante',    label: 'Comprobante' },
  { key: 'comprobanteUrl', label: 'Archivo',       render: r => r.comprobanteUrl
      ? `<a href="${escapeHtml(r.comprobanteUrl)}" target="_blank" rel="noopener">Ver</a>` : '—' },
  { key: 'descripcion',    label: 'Descripción' }
];

export function contabilidadView() {
  return `<section>
    <div class="toolbar">
      <div><h1>Contabilidad</h1><p class="muted">Registro simplificado de ingresos y egresos por categoría INAES.</p></div>
      <div class="toolbar-right">
        <input class="search-input" type="search" placeholder="Buscar…" id="tableSearch">
        <button class="btn primary" data-create>+ Nuevo movimiento</button>
      </div>
    </div>
    <div id="kpiResumen"></div>
    <div id="crudTable"><div class="loading">Cargando datos…</div></div>
  </section>`;
}

export function bindContabilidad() {
  return bindCrud({
    service: movimientoService,
    fields: movimientoFields,
    columns,
    onAfterLoad: (movimientos) => {
      const el = document.querySelector('#kpiResumen');
      if (el) el.innerHTML = renderKPIs(movimientos);
    }
  });
}

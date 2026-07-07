import { movimientoService } from '../services/movimiento.service.js';
import { downloadCsv, printReport } from '../../../utils/export.js';
import { escapeHtml } from '../../../utils/security.js';

const money = n => Number(n ?? 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

function agruparPorCategoria(rows, tipo) {
  const totales = {};
  rows.filter(r => r.tipo === tipo).forEach(r => {
    totales[r.categoria] = (totales[r.categoria] ?? 0) + Number(r.monto ?? 0);
  });
  return Object.entries(totales).sort((a, b) => b[1] - a[1]);
}

function flujoPorMes(rows) {
  const meses = {};
  rows.forEach(r => {
    const mes = (r.fecha ?? '').slice(0, 7); // YYYY-MM
    if (!mes) return;
    if (!meses[mes]) meses[mes] = { ingresos: 0, egresos: 0 };
    if (r.tipo === 'ingreso') meses[mes].ingresos += Number(r.monto ?? 0);
    else meses[mes].egresos += Number(r.monto ?? 0);
  });
  return Object.entries(meses).sort(([a], [b]) => a.localeCompare(b));
}

function labelMes(yyyymm) {
  const [y, m] = yyyymm.split('-');
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleString('es-AR', { month: 'short', year: '2-digit' });
}

function renderTabla(titulo, entradas, total) {
  if (!entradas.length) return `<h3>${escapeHtml(titulo)}</h3><p class="muted empty">Sin movimientos en el período.</p>`;
  return `<h3>${escapeHtml(titulo)}</h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Categoría</th><th>Monto</th></tr></thead>
        <tbody>${entradas.map(([cat, monto]) =>
          `<tr><td>${escapeHtml(cat)}</td><td>${money(monto)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td><b>Total</b></td><td><b>${money(total)}</b></td></tr></tfoot>
      </table>
    </div>`;
}

function renderFlujoCaja(flujo) {
  if (!flujo.length) return '<p class="muted empty">Sin movimientos para mostrar flujo de caja.</p>';
  const rows = flujo.map(([mes, { ingresos, egresos }]) => {
    const resultado = ingresos - egresos;
    const cls = resultado >= 0 ? 'color:var(--success)' : 'color:var(--danger)';
    return `<tr>
      <td>${labelMes(mes)}</td>
      <td style="color:var(--success)">${money(ingresos)}</td>
      <td style="color:var(--danger)">${money(egresos)}</td>
      <td style="${cls}"><b>${money(resultado)}</b></td>
    </tr>`;
  });
  const totI = flujo.reduce((s, [, v]) => s + v.ingresos, 0);
  const totE = flujo.reduce((s, [, v]) => s + v.egresos, 0);
  const totR = totI - totE;
  return `<h3>Flujo de caja mensual</h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Mes</th><th>Ingresos</th><th>Egresos</th><th>Resultado</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
        <tfoot><tr>
          <td><b>Total</b></td>
          <td style="color:var(--success)"><b>${money(totI)}</b></td>
          <td style="color:var(--danger)"><b>${money(totE)}</b></td>
          <td style="${totR >= 0 ? 'color:var(--success)' : 'color:var(--danger)'}"><b>${money(totR)}</b></td>
        </tr></tfoot>
      </table>
    </div>`;
}

export function reportesContablesView() {
  const hoy = new Date().toISOString().slice(0, 10);
  const inicioAnio = `${new Date().getFullYear()}-01-01`;
  return `<section>
    <div class="toolbar">
      <div>
        <h1>Estado de Recursos y Gastos</h1>
        <p class="muted">Borrador simplificado para revisión del profesional contable matriculado. No reemplaza el Balance General.</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <button class="btn ghost" id="exportCsv">Exportar CSV</button>
        <button class="btn primary" id="printReport">Imprimir</button>
      </div>
    </div>
    <div class="toolbar" style="margin-bottom:16px">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <label>Desde</label>
        <input type="date" id="rangoDesde" value="${inicioAnio}">
        <label>Hasta</label>
        <input type="date" id="rangoHasta" value="${hoy}">
        <button class="btn ghost" id="aplicarRango">Aplicar</button>
      </div>
    </div>
    <div id="reporteContent"><div class="loading">Cargando datos…</div></div>
  </section>`;
}

export async function bindReportesContables() {
  const content = document.querySelector('#reporteContent');
  let movimientos = [];

  async function cargar() {
    content.innerHTML = '<div class="loading">Cargando datos…</div>';
    try {
      movimientos = await movimientoService.list();
      renderReporte();
    } catch (err) {
      content.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
    }
  }

  function renderReporte() {
    const desde = document.querySelector('#rangoDesde').value;
    const hasta = document.querySelector('#rangoHasta').value;
    const filtrados = movimientos.filter(m => m.fecha >= desde && m.fecha <= hasta);

    const ingresos = agruparPorCategoria(filtrados, 'ingreso');
    const egresos  = agruparPorCategoria(filtrados, 'egreso');
    const totalI   = ingresos.reduce((a, [, m]) => a + m, 0);
    const totalE   = egresos.reduce((a, [, m]) => a + m, 0);
    const resultado = totalI - totalE;
    const flujo    = flujoPorMes(filtrados);

    content.innerHTML = `
      <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div class="card">${renderTabla('Recursos (ingresos)', ingresos, totalI)}</div>
        <div class="card">${renderTabla('Gastos (egresos)', egresos, totalE)}</div>
      </div>
      <div class="card" style="margin-bottom:16px;padding:20px;text-align:right">
        <span class="muted">Resultado del período: </span>
        <strong style="font-size:1.3rem;color:${resultado >= 0 ? 'var(--success)' : 'var(--danger)'}">
          ${money(resultado)}
        </strong>
      </div>
      <div class="card">${renderFlujoCaja(flujo)}</div>`;
  }

  document.querySelector('#aplicarRango').onclick = renderReporte;

  document.querySelector('#exportCsv').onclick = () => {
    const desde = document.querySelector('#rangoDesde').value;
    const hasta = document.querySelector('#rangoHasta').value;
    const filtrados = movimientos.filter(m => m.fecha >= desde && m.fecha <= hasta);
    downloadCsv('estado-recursos-gastos.csv', filtrados.map(m => ({
      fecha: m.fecha, tipo: m.tipo, categoria: m.categoria,
      monto: m.monto, comprobante: m.comprobante ?? '', descripcion: m.descripcion
    })));
  };

  document.querySelector('#printReport').onclick = printReport;

  await cargar();
}

import { movimientoService } from '../services/movimiento.service.js';
import { configuracionService } from '../../configuracion/services/configuracion.service.js';
import { downloadCsv, printReport } from '../../../utils/export.js';
import { escapeHtml } from '../../../utils/security.js';

const money  = n => Number(n ?? 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const pct    = (a, b) => b === 0 ? '—' : `${((a - b) / Math.abs(b) * 100).toFixed(1)}%`;
const signo  = n => n >= 0 ? '+' : '';
const esc    = escapeHtml;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function filtrar(movs, desde, hasta) {
  return movs.filter(m => m.fecha >= desde && m.fecha <= hasta);
}

function agruparPorCategoria(rows, tipo) {
  const map = {};
  rows.filter(r => r.tipo === tipo).forEach(r => {
    map[r.categoria] = (map[r.categoria] ?? 0) + Number(r.monto ?? 0);
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function flujoPorMes(rows) {
  const meses = {};
  rows.forEach(r => {
    const mes = (r.fecha ?? '').slice(0, 7);
    if (!mes) return;
    if (!meses[mes]) meses[mes] = { ingresos: 0, egresos: 0 };
    if (r.tipo === 'ingreso') meses[mes].ingresos += Number(r.monto ?? 0);
    else                      meses[mes].egresos  += Number(r.monto ?? 0);
  });
  return Object.entries(meses).sort(([a], [b]) => a.localeCompare(b));
}

function labelMes(yyyymm) {
  const [y, m] = yyyymm.split('-');
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleString('es-AR', { month: 'short', year: '2-digit' });
}

// ─── Renders ──────────────────────────────────────────────────────────────────

function renderComparativo(ingresosA, egresosA, totalIA, totalEA, resultadoA,
                            ingresosB, egresosB, totalIB, totalEB, resultadoB,
                            anioA, anioB) {
  // Unir todas las categorías de ambos períodos
  const catIngr = [...new Set([...ingresosA.map(x=>x[0]), ...ingresosB.map(x=>x[0])])];
  const catEgr  = [...new Set([...egresosA.map(x=>x[0]),  ...egresosB.map(x=>x[0])])];
  const mapIA = Object.fromEntries(ingresosA);
  const mapIB = Object.fromEntries(ingresosB);
  const mapEA = Object.fromEntries(egresosA);
  const mapEB = Object.fromEntries(egresosB);

  const filasIngr = catIngr.map(cat => {
    const vA = mapIA[cat] ?? 0;
    const vB = mapIB[cat] ?? 0;
    const dif = vA - vB;
    return `<tr>
      <td style="padding-left:16px">${esc(cat)}</td>
      <td style="text-align:right;color:var(--success)">${money(vA)}</td>
      <td style="text-align:right;color:var(--muted)">${money(vB)}</td>
      <td style="text-align:right;color:${dif>=0?'var(--success)':'var(--danger)'}">
        ${signo(dif)}${money(dif)}
      </td>
      <td style="text-align:right;font-size:.8rem;color:var(--muted)">${pct(vA,vB)}</td>
    </tr>`;
  }).join('');

  const filasEgr = catEgr.map(cat => {
    const vA = mapEA[cat] ?? 0;
    const vB = mapEB[cat] ?? 0;
    const dif = vA - vB;
    return `<tr>
      <td style="padding-left:16px">${esc(cat)}</td>
      <td style="text-align:right;color:var(--danger)">${money(vA)}</td>
      <td style="text-align:right;color:var(--muted)">${money(vB)}</td>
      <td style="text-align:right;color:${dif<=0?'var(--success)':'var(--danger)'}">
        ${signo(dif)}${money(dif)}
      </td>
      <td style="text-align:right;font-size:.8rem;color:var(--muted)">${pct(vA,vB)}</td>
    </tr>`;
  }).join('');

  const difRes = resultadoA - resultadoB;

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Concepto</th>
            <th style="text-align:right">${esc(anioA)} (actual)</th>
            <th style="text-align:right">${esc(anioB)} (anterior)</th>
            <th style="text-align:right">Variación $</th>
            <th style="text-align:right">Variación %</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background:var(--surface2)">
            <td colspan="5" style="font-weight:700;font-size:.82rem;text-transform:uppercase;letter-spacing:.5px;color:var(--muted)">
              Recursos (ingresos)
            </td>
          </tr>
          ${filasIngr}
          <tr style="border-top:1px solid var(--border)">
            <td style="font-weight:700">Total recursos</td>
            <td style="text-align:right;font-weight:700;color:var(--success)">${money(totalIA)}</td>
            <td style="text-align:right;font-weight:700;color:var(--muted)">${money(totalIB)}</td>
            <td style="text-align:right;font-weight:700;color:${(totalIA-totalIB)>=0?'var(--success)':'var(--danger)'}">
              ${signo(totalIA-totalIB)}${money(totalIA-totalIB)}
            </td>
            <td style="text-align:right;font-size:.8rem;color:var(--muted)">${pct(totalIA,totalIB)}</td>
          </tr>

          <tr style="background:var(--surface2)">
            <td colspan="5" style="font-weight:700;font-size:.82rem;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);padding-top:12px">
              Gastos (egresos)
            </td>
          </tr>
          ${filasEgr}
          <tr style="border-top:1px solid var(--border)">
            <td style="font-weight:700">Total gastos</td>
            <td style="text-align:right;font-weight:700;color:var(--danger)">${money(totalEA)}</td>
            <td style="text-align:right;font-weight:700;color:var(--muted)">${money(totalEB)}</td>
            <td style="text-align:right;font-weight:700;color:${(totalEA-totalEB)<=0?'var(--success)':'var(--danger)'}">
              ${signo(totalEA-totalEB)}${money(totalEA-totalEB)}
            </td>
            <td style="text-align:right;font-size:.8rem;color:var(--muted)">${pct(totalEA,totalEB)}</td>
          </tr>

          <tr style="background:var(--surface2);border-top:2px solid var(--border)">
            <td style="font-weight:700;font-size:1rem">RESULTADO DEL EJERCICIO</td>
            <td style="text-align:right;font-weight:700;font-size:1rem;color:${resultadoA>=0?'var(--success)':'var(--danger)'}">
              ${money(resultadoA)}
            </td>
            <td style="text-align:right;font-weight:700;color:var(--muted)">${money(resultadoB)}</td>
            <td style="text-align:right;font-weight:700;color:${difRes>=0?'var(--success)':'var(--danger)'}">
              ${signo(difRes)}${money(difRes)}
            </td>
            <td style="text-align:right;font-size:.8rem;color:var(--muted)">${pct(resultadoA,resultadoB)}</td>
          </tr>
        </tbody>
      </table>
    </div>`;
}

function renderFlujoCaja(flujo) {
  if (!flujo.length) return '<p class="muted empty">Sin movimientos para mostrar flujo de caja.</p>';
  const rows = flujo.map(([mes, { ingresos, egresos }]) => {
    const res = ingresos - egresos;
    return `<tr>
      <td>${labelMes(mes)}</td>
      <td style="text-align:right;color:var(--success)">${money(ingresos)}</td>
      <td style="text-align:right;color:var(--danger)">${money(egresos)}</td>
      <td style="text-align:right;color:${res>=0?'var(--success)':'var(--danger)'}"><b>${money(res)}</b></td>
    </tr>`;
  });
  const totI = flujo.reduce((s,[,v])=>s+v.ingresos,0);
  const totE = flujo.reduce((s,[,v])=>s+v.egresos,0);
  const totR = totI - totE;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Mes</th>
          <th style="text-align:right">Ingresos</th>
          <th style="text-align:right">Egresos</th>
          <th style="text-align:right">Resultado</th>
        </tr></thead>
        <tbody>${rows.join('')}</tbody>
        <tfoot><tr>
          <td><b>Total</b></td>
          <td style="text-align:right;color:var(--success)"><b>${money(totI)}</b></td>
          <td style="text-align:right;color:var(--danger)"><b>${money(totE)}</b></td>
          <td style="text-align:right;color:${totR>=0?'var(--success)':'var(--danger)'}"><b>${money(totR)}</b></td>
        </tr></tfoot>
      </table>
    </div>`;
}

// ─── View ─────────────────────────────────────────────────────────────────────

export function reportesContablesView() {
  const anio       = new Date().getFullYear();
  const anioAnt    = anio - 1;
  return `<section>
    <div class="toolbar">
      <div>
        <h1>Estado de Recursos y Gastos</h1>
        <p class="muted">Borrador para revisión del contador matriculado (Res. INAES 1481/2009). No reemplaza los libros legales.</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn ghost" id="exportCsv">CSV</button>
        <button class="btn ghost" id="printReport">🖨️ Imprimir</button>
      </div>
    </div>

    <div class="card" style="padding:16px;margin-bottom:20px">
      <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end">
        <div>
          <label style="font-size:.8rem;color:var(--muted);display:block;margin-bottom:4px">Ejercicio actual — desde</label>
          <input type="date" id="rangoDesde" value="${anio}-01-01">
        </div>
        <div>
          <label style="font-size:.8rem;color:var(--muted);display:block;margin-bottom:4px">hasta</label>
          <input type="date" id="rangoHasta" value="${new Date().toISOString().slice(0,10)}">
        </div>
        <div style="display:flex;align-items:center;gap:8px;padding-top:12px">
          <input type="checkbox" id="chkComparativo" style="width:16px;height:16px">
          <label for="chkComparativo" style="font-size:.88rem">Comparar con ejercicio anterior</label>
        </div>
        <div id="periodoAntWrap" style="display:none;gap:8px;flex-wrap:wrap;align-items:flex-end">
          <div>
            <label style="font-size:.8rem;color:var(--muted);display:block;margin-bottom:4px">Anterior — desde</label>
            <input type="date" id="antDesde" value="${anioAnt}-01-01">
          </div>
          <div>
            <label style="font-size:.8rem;color:var(--muted);display:block;margin-bottom:4px">hasta</label>
            <input type="date" id="antHasta" value="${anioAnt}-12-31">
          </div>
        </div>
        <button class="btn ghost" id="aplicarRango" style="margin-bottom:1px">Aplicar</button>
      </div>
    </div>

    <div id="reporteContent"><div class="loading">Cargando datos…</div></div>
  </section>`;
}

export async function bindReportesContables() {
  const content = document.querySelector('#reporteContent');
  const chk     = document.querySelector('#chkComparativo');
  const antWrap = document.querySelector('#periodoAntWrap');
  let movimientos  = [];
  let cooperativa  = null;

  chk.onchange = () => {
    antWrap.style.display = chk.checked ? 'flex' : 'none';
  };

  async function cargar() {
    content.innerHTML = '<div class="loading">Cargando datos…</div>';
    try {
      [movimientos, cooperativa] = await Promise.all([
        movimientoService.list(),
        configuracionService.get().catch(() => null)
      ]);
      renderReporte();
    } catch (err) {
      content.innerHTML = `<p class="error">${esc(err.message)}</p>`;
    }
  }

  function renderReporte() {
    const desde = document.querySelector('#rangoDesde').value;
    const hasta = document.querySelector('#rangoHasta').value;
    const anioA = `${desde.slice(0,4)}`;

    const filtA     = filtrar(movimientos, desde, hasta);
    const ingresosA = agruparPorCategoria(filtA, 'ingreso');
    const egresosA  = agruparPorCategoria(filtA, 'egreso');
    const totalIA   = ingresosA.reduce((s,[,m])=>s+m,0);
    const totalEA   = egresosA.reduce((s,[,m])=>s+m,0);
    const resultA   = totalIA - totalEA;
    const flujo     = flujoPorMes(filtA);
    const coop      = cooperativa?.nombre ?? '';

    let tablaRecursos = '';

    if (chk.checked) {
      const antDesde = document.querySelector('#antDesde').value;
      const antHasta = document.querySelector('#antHasta').value;
      const anioB    = `${antDesde.slice(0,4)}`;
      const filtB     = filtrar(movimientos, antDesde, antHasta);
      const ingresosB = agruparPorCategoria(filtB, 'ingreso');
      const egresosB  = agruparPorCategoria(filtB, 'egreso');
      const totalIB   = ingresosB.reduce((s,[,m])=>s+m,0);
      const totalEB   = egresosB.reduce((s,[,m])=>s+m,0);
      const resultB   = totalIB - totalEB;
      tablaRecursos = renderComparativo(
        ingresosA, egresosA, totalIA, totalEA, resultA,
        ingresosB, egresosB, totalIB, totalEB, resultB,
        anioA, anioB
      );
    } else {
      // Vista simple (sin comparativo)
      const filasI = ingresosA.length
        ? ingresosA.map(([cat, m]) =>
            `<tr><td style="padding-left:16px">${esc(cat)}</td><td style="text-align:right;color:var(--success)">${money(m)}</td></tr>`
          ).join('')
        : '<tr><td colspan="2" class="muted" style="text-align:center">Sin ingresos en el período</td></tr>';

      const filasE = egresosA.length
        ? egresosA.map(([cat, m]) =>
            `<tr><td style="padding-left:16px">${esc(cat)}</td><td style="text-align:right;color:var(--danger)">${money(m)}</td></tr>`
          ).join('')
        : '<tr><td colspan="2" class="muted" style="text-align:center">Sin egresos en el período</td></tr>';

      tablaRecursos = `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Concepto</th><th style="text-align:right">Monto</th></tr></thead>
            <tbody>
              <tr style="background:var(--surface2)">
                <td colspan="2" style="font-weight:700;font-size:.82rem;text-transform:uppercase;letter-spacing:.5px;color:var(--muted)">Recursos (ingresos)</td>
              </tr>
              ${filasI}
              <tr style="border-top:1px solid var(--border)">
                <td style="font-weight:700">Total recursos</td>
                <td style="text-align:right;font-weight:700;color:var(--success)">${money(totalIA)}</td>
              </tr>
              <tr style="background:var(--surface2)">
                <td colspan="2" style="font-weight:700;font-size:.82rem;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);padding-top:12px">Gastos (egresos)</td>
              </tr>
              ${filasE}
              <tr style="border-top:1px solid var(--border)">
                <td style="font-weight:700">Total gastos</td>
                <td style="text-align:right;font-weight:700;color:var(--danger)">${money(totalEA)}</td>
              </tr>
              <tr style="background:var(--surface2);border-top:2px solid var(--border)">
                <td style="font-weight:700;font-size:1rem">RESULTADO DEL EJERCICIO</td>
                <td style="text-align:right;font-weight:700;font-size:1rem;color:${resultA>=0?'var(--success)':'var(--danger)'}">
                  ${money(resultA)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>`;
    }

    content.innerHTML = `
      <div id="reporteImprimible">
        ${coop ? `<div style="font-weight:700;font-size:1.05rem;margin-bottom:4px">${esc(coop)}</div>
        <div class="muted" style="font-size:.82rem;margin-bottom:16px">
          Mat. INAES N° ${esc(cooperativa?.matricula??'')} — CUIT ${esc(cooperativa?.cuit??'')}
        </div>` : ''}

        <div class="card" style="padding:16px;margin-bottom:16px">
          <h3 style="margin-bottom:12px;color:var(--cyan)">Estado de Recursos y Gastos</h3>
          ${tablaRecursos}
        </div>

        <div class="card" style="padding:16px">
          <h3 style="margin-bottom:12px;color:var(--cyan)">Flujo de caja mensual</h3>
          ${renderFlujoCaja(flujo)}
        </div>

        <div style="margin-top:40px;display:flex;gap:48px;flex-wrap:wrap">
          <div style="text-align:center;min-width:200px">
            <div style="border-top:1px solid var(--border);padding-top:8px;margin-top:40px;font-size:.82rem;color:var(--muted)">
              Firma Presidente / Tesorero
            </div>
          </div>
          <div style="text-align:center;min-width:200px">
            <div style="border-top:1px solid var(--border);padding-top:8px;margin-top:40px;font-size:.82rem;color:var(--muted)">
              Firma Contador/a Matriculado/a
            </div>
          </div>
        </div>
      </div>`;
  }

  document.querySelector('#aplicarRango').onclick = renderReporte;

  document.querySelector('#exportCsv').onclick = () => {
    const desde = document.querySelector('#rangoDesde').value;
    const hasta = document.querySelector('#rangoHasta').value;
    const filtA = filtrar(movimientos, desde, hasta);
    downloadCsv('estado-recursos-gastos.csv', filtA.map(m => ({
      fecha:       m.fecha,
      tipo:        m.tipo,
      categoria:   m.categoria,
      monto:       m.monto,
      comprobante: m.comprobante ?? '',
      descripcion: m.descripcion
    })));
  };

  document.querySelector('#printReport').onclick = () => {
    const contenido = document.querySelector('#reporteImprimible')?.innerHTML ?? '';
    const ventana = window.open('', '_blank');
    ventana.document.write(`<!DOCTYPE html><html lang="es"><head>
      <meta charset="utf-8"><title>Estado de Recursos y Gastos</title>
      <style>
        body{font-family:'Times New Roman',serif;font-size:10pt;color:#000;margin:1.5cm}
        table{width:100%;border-collapse:collapse;margin-bottom:12px}
        th,td{padding:4px 8px;text-align:left;border-bottom:1px solid #ddd}
        th{background:#f5f5f5;font-weight:700;border-bottom:2px solid #000}
        tfoot td{border-top:2px solid #000;font-weight:700}
        .card{border:1px solid #ccc;padding:12px;margin-bottom:12px}
        .muted{color:#666}
        @media print{body{margin:1cm}}
      </style>
    </head><body>${contenido}</body></html>`);
    ventana.document.close();
    ventana.focus();
    ventana.print();
    setTimeout(() => ventana.close(), 1000);
  };

  await cargar();
}

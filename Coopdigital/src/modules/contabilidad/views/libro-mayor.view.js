// libro-mayor.view.js
// Libro Mayor simplificado para cooperativas bajo Res. INAES 1481/2009.
//
// Organiza los movimientos por CUENTA (categoría contable), mostrando
// para cada una:
//   - Todos los asientos que la afectan
//   - Total Debe, total Haber, saldo de la cuenta
//
// Las cuentas de ingresos tienen saldo acreedor (Haber > Debe).
// Las cuentas de egresos tienen saldo deudor (Debe > Haber).
// La cuenta "Caja y bancos" resume el movimiento total de fondos.
//
// No implementa el plan de cuentas completo del PCGA — usa las
// categorías ya definidas en contabilidad.config.js como cuentas.

import { movimientoService } from '../services/movimiento.service.js';
import { balanceService } from '../services/balance.service.js';
import { configuracionService } from '../../configuracion/services/configuracion.service.js';
import { downloadCsv } from '../../../utils/export.js';
import { escapeHtml } from '../../../utils/security.js';
import { fmt } from '../../../utils/date.js';

const LEYENDA_LEGAL = `<div style="margin-top:20px;padding:12px;border:1px solid var(--border);border-radius:6px;font-size:.78rem;color:var(--muted);text-align:center">
  📋 <strong>Documento de uso interno.</strong> Borrador sujeto a revisión y firma de contador/a matriculado/a.<br>
  No válido como libro legal hasta su rubricación ante el CPCE jurisdiccional.<br>
  Generado por CoopDigital conforme Res. INAES 1481/2009 y 3369/2009.
</div>`;

const money = n => Number(n ?? 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const esc = escapeHtml;

export function libroMayorView() {
  const hoy = new Date().toISOString().slice(0, 10);
  const inicioAnio = `${new Date().getFullYear()}-01-01`;
  return `<section>
    <div class="toolbar">
      <div>
        <h1>Libro Mayor</h1>
        <p class="muted">Movimientos agrupados por cuenta (categoría). Borrador para firma del contador matriculado.</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn ghost" id="btnExportarLM">CSV</button>
        <button class="btn ghost" id="btnImprimirLM">🖨️ Imprimir</button>
      </div>
    </div>

    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:20px">
      <label>Desde</label>
      <input type="date" id="lmDesde" value="${inicioAnio}">
      <label>Hasta</label>
      <input type="date" id="lmHasta" value="${hoy}">
      <button class="btn ghost" id="btnFiltrarLM">Aplicar</button>
    </div>

    <div id="lmContent"><div class="loading">Cargando…</div></div>
  </section>`;
}

export async function bindLibroMayor() {
  const lmContent   = document.querySelector('#lmContent');
  const btnExportar = document.querySelector('#btnExportarLM');
  const btnImprimir = document.querySelector('#btnImprimirLM');
  const btnFiltrar  = document.querySelector('#btnFiltrarLM');

  let movimientos  = [];
  let saldoInicial = 0;
  let cooperativa  = null;

  async function cargar() {
    lmContent.innerHTML = '<div class="loading">Cargando…</div>';
    try {
      const [movs, cfg, coop] = await Promise.all([
        movimientoService.list(),
        balanceService.get(),
        configuracionService.get().catch(() => null)
      ]);
      movimientos  = movs;
      saldoInicial = Number(cfg?.saldoInicialCaja ?? 0);
      cooperativa  = coop;
      renderMayor();
    } catch (err) {
      lmContent.innerHTML = `<p class="error">${esc(err.message)}</p>`;
    }
  }

  function filtrados() {
    const desde = document.querySelector('#lmDesde').value;
    const hasta = document.querySelector('#lmHasta').value;
    return [...movimientos]
      .filter(m => m.fecha >= desde && m.fecha <= hasta)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  function agruparPorCuenta(rows) {
    // Cuenta especial: Caja y bancos (resume todo el movimiento de fondos)
    const cajaBancos = {
      cuenta: 'Caja y bancos',
      tipo: 'activo',
      asientos: rows.map((m, i) => ({
        nro:         i + 1,
        fecha:       m.fecha,
        descripcion: m.descripcion,
        debe:        m.tipo === 'egreso'  ? Number(m.monto) : 0,
        haber:       m.tipo === 'ingreso' ? Number(m.monto) : 0,
      }))
    };
    cajaBancos.totalDebe  = cajaBancos.asientos.reduce((s, a) => s + a.debe,  0);
    cajaBancos.totalHaber = cajaBancos.asientos.reduce((s, a) => s + a.haber, 0);
    cajaBancos.saldoInicial = saldoInicial;
    cajaBancos.saldo = saldoInicial + cajaBancos.totalHaber - cajaBancos.totalDebe;

    // Cuentas por categoría
    const mapa = new Map();
    rows.forEach((m, i) => {
      if (!mapa.has(m.categoria)) {
        mapa.set(m.categoria, { cuenta: m.categoria, tipo: m.tipo, asientos: [] });
      }
      const c = mapa.get(m.categoria);
      c.asientos.push({
        nro:         i + 1,
        fecha:       m.fecha,
        descripcion: m.descripcion,
        comprobante: m.comprobante ?? '',
        // Ingresos: acreedor → Haber. Egresos: deudor → Debe.
        debe:  m.tipo === 'egreso'  ? Number(m.monto) : 0,
        haber: m.tipo === 'ingreso' ? Number(m.monto) : 0,
      });
    });

    const cuentas = [];
    mapa.forEach(c => {
      c.totalDebe  = c.asientos.reduce((s, a) => s + a.debe,  0);
      c.totalHaber = c.asientos.reduce((s, a) => s + a.haber, 0);
      c.saldo      = c.totalHaber - c.totalDebe;
      c.naturaleza = c.saldo >= 0 ? 'Acreedor' : 'Deudor';
      cuentas.push(c);
    });

    // Ordenar: primero ingresos (acreedores), luego egresos (deudores)
    cuentas.sort((a, b) => {
      if (a.tipo !== b.tipo) return a.tipo === 'ingreso' ? -1 : 1;
      return a.cuenta.localeCompare(b.cuenta);
    });

    return [cajaBancos, ...cuentas];
  }

  function renderCuentaT(c) {
    const filas = c.asientos.map(a => `
      <tr>
        <td style="font-size:.78rem;color:var(--muted);text-align:center">${a.nro}</td>
        <td style="font-size:.82rem">${fmt(a.fecha)}</td>
        <td style="font-size:.82rem">${esc(a.descripcion)}${a.comprobante ? `<span style="color:var(--muted);margin-left:4px">(${esc(a.comprobante)})</span>` : ''}</td>
        <td style="text-align:right;color:var(--danger)">${a.debe  > 0 ? money(a.debe)  : ''}</td>
        <td style="text-align:right;color:var(--success)">${a.haber > 0 ? money(a.haber) : ''}</td>
      </tr>`).join('');

    const saldoColor = c.saldo >= 0 ? 'var(--success)' : 'var(--danger)';
    const saldoLabel = c.naturaleza ?? (c.saldo >= 0 ? 'Acreedor' : 'Deudor');
    const saldoInicialRow = c.saldoInicial != null ? `
      <tr style="background:var(--surface2)">
        <td colspan="3" style="font-size:.8rem;color:var(--muted)">Saldo inicial</td>
        <td></td>
        <td style="text-align:right;color:var(--muted)">${money(c.saldoInicial)}</td>
      </tr>` : '';

    return `
      <div class="card" style="margin-bottom:16px;padding:0;overflow:hidden">
        <div style="padding:12px 16px;background:var(--surface2);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            <span style="font-weight:700">${esc(c.cuenta)}</span>
            ${c.tipo ? `<span class="badge ${c.tipo === 'ingreso' ? 'ok' : 'bad'}" style="margin-left:8px;font-size:.75rem">${c.tipo}</span>` : ''}
          </div>
          <div style="font-size:.85rem">
            <span class="muted">Debe: </span><strong style="color:var(--danger)">${money(c.totalDebe)}</strong>
            <span style="margin:0 8px">|</span>
            <span class="muted">Haber: </span><strong style="color:var(--success)">${money(c.totalHaber)}</strong>
            <span style="margin:0 8px">|</span>
            <span class="muted">Saldo ${saldoLabel}: </span><strong style="color:${saldoColor}">${money(Math.abs(c.saldo))}</strong>
          </div>
        </div>
        <div class="table-wrap" style="border-top:1px solid var(--border)">
          <table>
            <thead><tr>
              <th style="width:40px;text-align:center">N°</th>
              <th style="width:90px">Fecha</th>
              <th>Descripción</th>
              <th style="text-align:right;width:120px">Debe</th>
              <th style="text-align:right;width:120px">Haber</th>
            </tr></thead>
            <tbody>
              ${saldoInicialRow}
              ${filas}
            </tbody>
            <tfoot>
              <tr style="border-top:2px solid var(--border)">
                <td colspan="3" style="font-weight:700">Total</td>
                <td style="text-align:right;font-weight:700;color:var(--danger)">${money(c.totalDebe)}</td>
                <td style="text-align:right;font-weight:700;color:var(--success)">${money(c.totalHaber)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>`;
  }

  function renderMayor() {
    const rows = filtrados();
    if (!rows.length) {
      lmContent.innerHTML = '<p class="muted empty">No hay movimientos en el período seleccionado.</p>';
      return;
    }

    const cuentas = agruparPorCuenta(rows);
    const desde = document.querySelector('#lmDesde').value;
    const hasta = document.querySelector('#lmHasta').value;
    const coop  = cooperativa?.nombre ?? 'Cooperativa';

    // Resumen de saldos al pie
    const cuentasSinCaja = cuentas.filter(c => c.cuenta !== 'Caja y bancos');
    const totalIngresos = cuentasSinCaja.filter(c => c.tipo === 'ingreso').reduce((s, c) => s + c.totalHaber, 0);
    const totalEgresos  = cuentasSinCaja.filter(c => c.tipo === 'egreso').reduce((s, c) => s + c.totalDebe, 0);

    lmContent.innerHTML = `
      <div id="lmImprimible">
        <div style="margin-bottom:16px">
          <div style="font-weight:700;font-size:1.05rem">${esc(coop)}</div>
          <div class="muted" style="font-size:.82rem">
            Mat. INAES N° ${esc(cooperativa?.matricula ?? '')} — CUIT ${esc(cooperativa?.cuit ?? '')} |
            Período: ${fmt(desde)} al ${fmt(hasta)}
          </div>
        </div>

        ${cuentas.map(c => renderCuentaT(c)).join('')}

        <div class="card" style="padding:16px;margin-top:8px">
          <h3 style="margin-bottom:12px;color:var(--cyan)">Resumen de saldos</h3>
          <table>
            <thead><tr>
              <th>Cuenta</th>
              <th style="text-align:right">Debe</th>
              <th style="text-align:right">Haber</th>
              <th style="text-align:right">Saldo</th>
              <th>Naturaleza</th>
            </tr></thead>
            <tbody>
              ${cuentas.map(c => `
                <tr>
                  <td>${esc(c.cuenta)}</td>
                  <td style="text-align:right;color:var(--danger)">${money(c.totalDebe)}</td>
                  <td style="text-align:right;color:var(--success)">${money(c.totalHaber)}</td>
                  <td style="text-align:right;font-weight:600;color:${Math.abs(c.saldo) > 0.01 ? (c.saldo >= 0 ? 'var(--success)' : 'var(--danger)') : 'var(--muted)'}">${money(Math.abs(c.saldo))}</td>
                  <td style="font-size:.82rem;color:var(--muted)">${c.naturaleza ?? (c.saldo >= 0 ? 'Acreedor' : 'Deudor')}</td>
                </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr style="border-top:2px solid var(--border)">
                <td><strong>Resultado del ejercicio</strong></td>
                <td></td><td></td>
                <td style="text-align:right;font-weight:700;color:${(totalIngresos - totalEgresos) >= 0 ? 'var(--success)' : 'var(--danger)'}">
                  ${money(totalIngresos - totalEgresos)}
                </td>
                <td style="font-size:.82rem;color:var(--muted)">${(totalIngresos - totalEgresos) >= 0 ? 'Superávit' : 'Déficit'}</td>
              </tr>
            </tfoot>
          </table>
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
        ${LEYENDA_LEGAL}
      </div>`;
  }

  await cargar();

  btnFiltrar.onclick = renderMayor;

  btnExportar.onclick = () => {
    const rows = filtrados();
    const cuentas = agruparPorCuenta(rows);
    const csvRows = [];
    cuentas.forEach(c => {
      c.asientos.forEach(a => {
        csvRows.push({
          cuenta:      c.cuenta,
          asiento:     a.nro,
          fecha:       a.fecha,
          descripcion: a.descripcion,
          comprobante: a.comprobante ?? '',
          debe:        a.debe  || '',
          haber:       a.haber || '',
        });
      });
      csvRows.push({
        cuenta: c.cuenta,
        asiento: '', fecha: '', descripcion: 'TOTAL',
        comprobante: '',
        debe:  c.totalDebe,
        haber: c.totalHaber,
      });
      csvRows.push({});
    });
    downloadCsv('libro-mayor.csv', csvRows);
  };

  btnImprimir.onclick = () => {
    const contenido = document.querySelector('#lmImprimible')?.innerHTML ?? '';
    const ventana = window.open('', '_blank');
    ventana.document.write(`<!DOCTYPE html><html lang="es"><head>
      <meta charset="utf-8"><title>Libro Mayor</title>
      <style>
        body{font-family:'Times New Roman',serif;font-size:10pt;color:#000;margin:1.5cm}
        table{width:100%;border-collapse:collapse;margin-bottom:16px}
        th,td{padding:4px 6px;text-align:left;border-bottom:1px solid #ddd}
        th{background:#f5f5f5;font-weight:700;border-bottom:2px solid #000}
        tfoot td{border-top:2px solid #000;font-weight:700}
        .card{border:1px solid #ccc;margin-bottom:12px;page-break-inside:avoid}
        .badge{display:inline-block;padding:1px 6px;border:1px solid #999;border-radius:3px;font-size:8pt}
        .muted{color:#666}
        @media print{body{margin:1cm}.card{page-break-inside:avoid}}
      </style>
    </head><body>${contenido}${LEYENDA_LEGAL}</body></html>`);
    ventana.document.close();
    ventana.focus();
    ventana.print();
    setTimeout(() => ventana.close(), 1000);
  };
}

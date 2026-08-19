// libro-diario.view.js
// Libro Diario simplificado para cooperativas bajo Res. INAES 1481/2009.
//
// Formato: registro cronológico de movimientos con:
//   N° asiento | Fecha | Descripción | Comprobante | Debe | Haber | Saldo
//
// Los ingresos se registran en el Haber (acrecentan el patrimonio).
// Los egresos se registran en el Debe (disminuyen el patrimonio).
// El saldo es acumulado desde el saldo inicial de caja configurado en Balance.
//
// No implementa partida doble ni cuentas T — es el registro simplificado
// habilitado para cooperativas pequeñas por resolución INAES.
// Para rubricación legal, el contador matriculado toma este reporte como
// insumo para el Libro Diario oficial con firma profesional.

import { movimientoService } from '../services/movimiento.service.js';
import { balanceService } from '../services/balance.service.js';
import { configuracionService } from '../../configuracion/services/configuracion.service.js';
import { downloadCsv } from '../../../utils/export.js';
import { escapeHtml } from '../../../utils/security.js';
import { fmt } from '../../../utils/date.js';

const money = n => Number(n ?? 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const esc = escapeHtml;

export function libroDiarioView() {
  const hoy = new Date().toISOString().slice(0, 10);
  const inicioAnio = `${new Date().getFullYear()}-01-01`;
  return `<section>
    <div class="toolbar">
      <div>
        <h1>Libro Diario</h1>
        <p class="muted">Registro cronológico simplificado (Res. INAES 1481/2009). Borrador para firma del contador matriculado.</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn ghost" id="btnExportarLD">CSV</button>
        <button class="btn ghost" id="btnImprimirLD">🖨️ Imprimir</button>
      </div>
    </div>

    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:20px">
      <label>Desde</label>
      <input type="date" id="ldDesde" value="${inicioAnio}">
      <label>Hasta</label>
      <input type="date" id="ldHasta" value="${hoy}">
      <button class="btn ghost" id="btnFiltrarLD">Aplicar</button>
    </div>

    <div id="ldContent"><div class="loading">Cargando…</div></div>
  </section>`;
}

export async function bindLibroDiario() {
  const ldContent  = document.querySelector('#ldContent');
  const btnExportar = document.querySelector('#btnExportarLD');
  const btnImprimir = document.querySelector('#btnImprimirLD');
  const btnFiltrar  = document.querySelector('#btnFiltrarLD');

  let movimientos = [];
  let saldoInicial = 0;
  let cooperativa = null;

  async function cargar() {
    ldContent.innerHTML = '<div class="loading">Cargando…</div>';
    try {
      const [movs, cfg, coop] = await Promise.all([
        movimientoService.list(),
        balanceService.get(),
        configuracionService.get().catch(() => null)
      ]);
      movimientos = movs;
      saldoInicial = Number(cfg?.saldoInicialCaja ?? 0);
      cooperativa = coop;
      renderDiario();
    } catch (err) {
      ldContent.innerHTML = `<p class="error">${esc(err.message)}</p>`;
    }
  }

  function filtrados() {
    const desde = document.querySelector('#ldDesde').value;
    const hasta = document.querySelector('#ldHasta').value;
    return [...movimientos]
      .filter(m => m.fecha >= desde && m.fecha <= hasta)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  function construirAsientos(rows) {
    let saldo = saldoInicial;
    return rows.map((m, i) => {
      const debe  = m.tipo === 'egreso'   ? Number(m.monto ?? 0) : 0;
      const haber = m.tipo === 'ingreso'  ? Number(m.monto ?? 0) : 0;
      saldo = saldo + haber - debe;
      return {
        nro:         i + 1,
        fecha:       m.fecha,
        descripcion: m.descripcion,
        categoria:   m.categoria,
        comprobante: m.comprobante ?? '',
        medioPago:   m.medioPago ?? '',
        debe,
        haber,
        saldo,
        tipo:        m.tipo,
        url:         m.comprobanteUrl ?? ''
      };
    });
  }

  function renderDiario() {
    const rows = filtrados();
    if (!rows.length) {
      ldContent.innerHTML = '<p class="muted empty">No hay movimientos en el período seleccionado.</p>';
      return;
    }

    const asientos = construirAsientos(rows);
    const totalDebe  = asientos.reduce((s, a) => s + a.debe,  0);
    const totalHaber = asientos.reduce((s, a) => s + a.haber, 0);
    const saldoFinal = asientos[asientos.length - 1]?.saldo ?? saldoInicial;

    const filas = asientos.map(a => `
      <tr>
        <td style="text-align:center;color:var(--muted);font-size:.8rem">${a.nro}</td>
        <td>${fmt(a.fecha)}</td>
        <td>
          <div>${esc(a.descripcion)}</div>
          <div style="font-size:.75rem;color:var(--muted)">${esc(a.categoria)}${a.medioPago ? ' · ' + esc(a.medioPago) : ''}</div>
        </td>
        <td style="font-size:.8rem">
          ${a.comprobante ? esc(a.comprobante) : ''}
          ${a.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener" style="margin-left:4px;font-size:.75rem">📎</a>` : ''}
        </td>
        <td style="text-align:right;color:var(--danger)">${a.debe > 0 ? money(a.debe) : ''}</td>
        <td style="text-align:right;color:var(--success)">${a.haber > 0 ? money(a.haber) : ''}</td>
        <td style="text-align:right;font-weight:600;color:${a.saldo >= 0 ? 'var(--success)' : 'var(--danger)'}">${money(a.saldo)}</td>
      </tr>`).join('');

    const desde = document.querySelector('#ldDesde').value;
    const hasta = document.querySelector('#ldHasta').value;
    const coop = cooperativa?.nombre ?? 'Cooperativa';

    ldContent.innerHTML = `
      <div id="ldImprimible">
        <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:8px">
          <div>
            <div style="font-weight:700">${esc(coop)}</div>
            <div class="muted" style="font-size:.82rem">Mat. INAES N° ${esc(cooperativa?.matricula ?? '')} — CUIT ${esc(cooperativa?.cuit ?? '')}</div>
          </div>
          <div class="muted" style="font-size:.82rem;text-align:right">
            Período: ${fmt(desde)} al ${fmt(hasta)}<br>
            Saldo inicial: ${money(saldoInicial)}
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="text-align:center;width:48px">N°</th>
                <th style="width:90px">Fecha</th>
                <th>Descripción / Categoría</th>
                <th style="width:110px">Comprobante</th>
                <th style="text-align:right;width:120px">Debe</th>
                <th style="text-align:right;width:120px">Haber</th>
                <th style="text-align:right;width:130px">Saldo</th>
              </tr>
              <tr style="font-size:.78rem;color:var(--muted)">
                <td colspan="4"></td>
                <td style="text-align:right;padding-top:0">Egresos</td>
                <td style="text-align:right;padding-top:0">Ingresos</td>
                <td></td>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
            <tfoot>
              <tr style="border-top:2px solid var(--border)">
                <td colspan="4" style="font-weight:700;padding-top:10px">TOTALES DEL PERÍODO</td>
                <td style="text-align:right;font-weight:700;color:var(--danger);padding-top:10px">${money(totalDebe)}</td>
                <td style="text-align:right;font-weight:700;color:var(--success);padding-top:10px">${money(totalHaber)}</td>
                <td style="text-align:right;font-weight:700;color:${saldoFinal >= 0 ? 'var(--success)' : 'var(--danger)'};padding-top:10px">${money(saldoFinal)}</td>
              </tr>
              <tr>
                <td colspan="7" style="text-align:right;font-size:.82rem;color:var(--muted);padding-top:6px">
                  Resultado del período: ${money(totalHaber - totalDebe)} |
                  ${totalDebe === totalHaber ? '✓ Debe = Haber' : `Diferencia: ${money(Math.abs(totalHaber - totalDebe))}`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style="margin-top:32px;display:flex;gap:48px;flex-wrap:wrap">
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

  await cargar();

  btnFiltrar.onclick = renderDiario;

  btnExportar.onclick = () => {
    const rows = filtrados();
    const asientos = construirAsientos(rows);
    downloadCsv('libro-diario.csv', asientos.map(a => ({
      asiento:      a.nro,
      fecha:        a.fecha,
      descripcion:  a.descripcion,
      categoria:    a.categoria,
      comprobante:  a.comprobante,
      medio_pago:   a.medioPago,
      debe:         a.debe || '',
      haber:        a.haber || '',
      saldo:        a.saldo
    })));
  };

  btnImprimir.onclick = () => {
    const contenido = document.querySelector('#ldImprimible')?.innerHTML ?? '';
    const ventana = window.open('', '_blank');
    ventana.document.write(`<!DOCTYPE html><html lang="es"><head>
      <meta charset="utf-8"><title>Libro Diario</title>
      <style>
        body{font-family:'Times New Roman',serif;font-size:10pt;color:#000;margin:1.5cm}
        table{width:100%;border-collapse:collapse}
        th,td{padding:4px 6px;text-align:left;border-bottom:1px solid #ddd}
        th{background:#f5f5f5;font-weight:700;border-bottom:2px solid #000}
        tfoot td{border-top:2px solid #000;font-weight:700}
        .muted{color:#555}
        a{color:#000}
        @media print{body{margin:1cm}a{text-decoration:none}}
      </style>
    </head><body>${contenido}</body></html>`);
    ventana.document.close();
    ventana.focus();
    ventana.print();
    setTimeout(() => ventana.close(), 1000);
  };
}

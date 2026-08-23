// balance.view.js
// Balance General simplificado para cooperativas bajo Res. INAES 1481/2009.
// Estructura:
//   ACTIVO
//     Activo corriente:
//       Caja y bancos       = saldoInicialCaja + ingresos - egresos (de movimientos)
//       Créditos            = cuentasActivo tipo 'credito'
//       Otros activos       = cuentasActivo tipo 'otro'
//     Activo no corriente:
//       Bienes de uso       = cuentasActivo tipo 'bienesDeUso'
//   PASIVO
//     Pasivo corriente      = cuentasPasivo tipo 'corriente'
//     Pasivo no corriente   = cuentasPasivo tipo 'noCorriente'
//   PATRIMONIO NETO
//     Capital social        = configurado manualmente
//     Reserva legal         = configurado manualmente
//     Otras reservas        = configurado manualmente
//     Resultado ejercicio   = ingresos - egresos del período (calculado)
//
// ACTIVO = PASIVO + PATRIMONIO NETO  ← ecuación contable fundamental

import { balanceService } from '../services/balance.service.js';
import { movimientoService } from '../services/movimiento.service.js';
import { configuracionService } from '../../configuracion/services/configuracion.service.js';
import { toast } from '../../../utils/toast.js';
import { escapeHtml } from '../../../utils/security.js';

const LEYENDA_LEGAL = `<div style="margin-top:20px;padding:12px;border:1px solid var(--border);border-radius:6px;font-size:.78rem;color:var(--muted);text-align:center">
  📋 <strong>Documento de uso interno.</strong> Borrador sujeto a revisión y firma de contador/a matriculado/a.<br>
  No válido como libro legal hasta su rubricación ante el CPCE jurisdiccional.<br>
  Generado por CoopDigital conforme Res. INAES 1481/2009 y 3369/2009.
</div>`;

const money = n => Number(n ?? 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const esc = escapeHtml;

export function balanceView() {
  const hoy = new Date().toISOString().slice(0, 10);
  const inicioAnio = `${new Date().getFullYear()}-01-01`;
  return `<section>
    <div class="toolbar">
      <div>
        <h1>Balance General</h1>
        <p class="muted">Borrador para revisión del contador matriculado. No reemplaza los libros contables legales.</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn ghost" id="btnConfigBalance">⚙️ Configurar saldo inicial</button>
        <button class="btn ghost" id="btnImprimirBalance">🖨️ Imprimir</button>
      </div>
    </div>

    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:20px">
      <label>Ejercicio desde</label>
      <input type="date" id="ejercicioDesde" value="${inicioAnio}">
      <label>hasta</label>
      <input type="date" id="ejercicioHasta" value="${hoy}">
      <button class="btn ghost" id="btnCalcular">Calcular</button>
    </div>

    <!-- Panel de configuración (colapsable) -->
    <div id="configPanel" style="display:none;margin-bottom:24px">
      <div class="card" style="padding:20px">
        <h2 style="color:var(--cyan);margin-bottom:16px">Configuración contable inicial</h2>
        <p class="muted" style="margin-bottom:16px;font-size:.85rem">
          Ingresá los valores al inicio del ejercicio o al momento de comenzar a usar el sistema.
          El resultado del ejercicio se calcula automáticamente de los movimientos registrados.
        </p>

        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:12px;max-width:640px">
          <div class="field">
            <label>Fecha de apertura del ejercicio</label>
            <input type="date" id="cfgFechaApertura">
          </div>
          <div class="field">
            <label>Saldo inicial de caja/bancos ($)</label>
            <input type="number" id="cfgSaldoInicial" min="0" step="0.01" placeholder="0.00">
          </div>
          <div class="field">
            <label>Capital social ($)</label>
            <input type="number" id="cfgCapitalSocial" min="0" step="0.01" placeholder="0.00">
          </div>
          <div class="field">
            <label>Reserva legal ($)</label>
            <input type="number" id="cfgReservaLegal" min="0" step="0.01" placeholder="0.00">
          </div>
          <div class="field full">
            <label>Otras reservas ($)</label>
            <input type="number" id="cfgOtrasReservas" min="0" step="0.01" placeholder="0.00">
          </div>
        </div>

        <h3 style="margin:20px 0 12px">Otras cuentas del Activo</h3>
        <p class="muted" style="font-size:.82rem;margin-bottom:10px">Créditos, bienes de uso, otros activos que no surgen de los movimientos de caja.</p>
        <div id="listActivo"></div>
        <button class="btn ghost" id="btnAddActivo" style="margin-top:8px;font-size:.85rem">+ Agregar cuenta de activo</button>

        <h3 style="margin:20px 0 12px">Cuentas del Pasivo</h3>
        <p class="muted" style="font-size:.82rem;margin-bottom:10px">Deudas, obligaciones y otros pasivos.</p>
        <div id="listPasivo"></div>
        <button class="btn ghost" id="btnAddPasivo" style="margin-top:8px;font-size:.85rem">+ Agregar cuenta de pasivo</button>

        <div style="margin-top:20px">
          <button class="btn primary" id="btnGuardarConfig">Guardar configuración</button>
          <button class="btn ghost" id="btnCancelarConfig" style="margin-left:8px">Cancelar</button>
        </div>
      </div>
    </div>

    <div id="balanceContent"><div class="loading">Cargando…</div></div>
  </section>`;
}

export async function bindBalance() {
  const configPanel    = document.querySelector('#configPanel');
  const balanceContent = document.querySelector('#balanceContent');
  const btnConfig      = document.querySelector('#btnConfigBalance');
  const btnCalcular    = document.querySelector('#btnCalcular');
  const btnImprimir    = document.querySelector('#btnImprimirBalance');
  const btnGuardar     = document.querySelector('#btnGuardarConfig');
  const btnCancelar    = document.querySelector('#btnCancelarConfig');
  const btnAddActivo   = document.querySelector('#btnAddActivo');
  const btnAddPasivo   = document.querySelector('#btnAddPasivo');
  const listActivoEl   = document.querySelector('#listActivo');
  const listPasivoEl   = document.querySelector('#listPasivo');

  let cfg = null;
  let movimientos = [];
  let cooperativa = null;
  let cuentasActivo = [];
  let cuentasPasivo = [];

  // Cargar datos
  async function cargar() {
    balanceContent.innerHTML = '<div class="loading">Cargando…</div>';
    try {
      [cfg, movimientos, cooperativa] = await Promise.all([
        balanceService.get(),
        movimientoService.list(),
        configuracionService.get().catch(() => null)
      ]);
      cuentasActivo = [...(cfg.cuentasActivo ?? [])];
      cuentasPasivo = [...(cfg.cuentasPasivo ?? [])];
      calcular();
    } catch (err) {
      balanceContent.innerHTML = `<p class="error">${esc(err.message)}</p>`;
    }
  }

  function calcular() {
    const desde = document.querySelector('#ejercicioDesde').value;
    const hasta = document.querySelector('#ejercicioHasta').value;
    const filtrados = movimientos.filter(m => m.fecha >= desde && m.fecha <= hasta);

    const ingresos = filtrados.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + Number(m.monto ?? 0), 0);
    const egresos  = filtrados.filter(m => m.tipo === 'egreso').reduce((s, m) => s + Number(m.monto ?? 0), 0);
    const resultadoEjercicio = ingresos - egresos;
    const cajaBancos = Number(cfg?.saldoInicialCaja ?? 0) + resultadoEjercicio;

    const totalOtrosActivos = cuentasActivo.reduce((s, c) => s + Number(c.monto ?? 0), 0);
    const totalPasivo       = cuentasPasivo.reduce((s, c) => s + Number(c.monto ?? 0), 0);
    const capitalSocial     = Number(cfg?.capitalSocial   ?? 0);
    const reservaLegal      = Number(cfg?.reservaLegal    ?? 0);
    const otrasReservas     = Number(cfg?.otrasReservas   ?? 0);
    const totalPN = capitalSocial + reservaLegal + otrasReservas + resultadoEjercicio;
    const totalActivo = cajaBancos + totalOtrosActivos;
    const cuadra = Math.abs(totalActivo - (totalPasivo + totalPN)) < 0.01;

    const filasActivo = cuentasActivo.map(c =>
      `<tr><td style="padding-left:32px">${esc(c.nombre)}</td><td>${money(c.monto)}</td></tr>`
    ).join('');

    const filasPasivo = cuentasPasivo.map(c =>
      `<tr><td style="padding-left:32px">${esc(c.nombre)}</td><td>${money(c.monto)}</td></tr>`
    ).join('');

    const coop = cooperativa?.nombre ?? 'Cooperativa';
    const fechaHasta = hasta ? new Date(hasta + 'T12:00:00').toLocaleDateString('es-AR') : '';

    balanceContent.innerHTML = `
      <div id="balanceImprimible">
        <p style="text-align:center;margin-bottom:4px;font-weight:700;font-size:1.05rem">${esc(coop)}</p>
        <p style="text-align:center;margin-bottom:4px;color:var(--muted);font-size:.85rem">
          Mat. INAES N° ${esc(cooperativa?.matricula ?? '')} — CUIT ${esc(cooperativa?.cuit ?? '')}
        </p>
        <p style="text-align:center;margin-bottom:20px;color:var(--muted);font-size:.85rem">
          BALANCE GENERAL AL ${fechaHasta} — Estado simplificado (Res. INAES 1481/2009)
        </p>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <!-- ACTIVO -->
          <div class="card" style="padding:16px">
            <table style="width:100%">
              <thead><tr>
                <th colspan="2" style="text-align:left;padding-bottom:12px;border-bottom:2px solid var(--border)">ACTIVO</th>
              </tr></thead>
              <tbody>
                <tr><td colspan="2" style="padding:8px 0 4px;font-weight:600;font-size:.82rem;color:var(--muted);text-transform:uppercase">Activo corriente</td></tr>
                <tr><td style="padding-left:16px">Caja y bancos</td><td>${money(cajaBancos)}</td></tr>
                ${filasActivo}
                <tr style="border-top:1px solid var(--border)">
                  <td style="padding-top:8px"><b>Total Activo</b></td>
                  <td style="padding-top:8px"><b>${money(totalActivo)}</b></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- PASIVO + PN -->
          <div class="card" style="padding:16px">
            <table style="width:100%">
              <thead><tr>
                <th colspan="2" style="text-align:left;padding-bottom:12px;border-bottom:2px solid var(--border)">PASIVO Y PATRIMONIO NETO</th>
              </tr></thead>
              <tbody>
                <tr><td colspan="2" style="padding:8px 0 4px;font-weight:600;font-size:.82rem;color:var(--muted);text-transform:uppercase">Pasivo</td></tr>
                ${filasPasivo || '<tr><td style="padding-left:16px;color:var(--muted)">Sin pasivos registrados</td><td>—</td></tr>'}
                <tr><td style="padding-left:16px"><b>Total Pasivo</b></td><td><b>${money(totalPasivo)}</b></td></tr>
                <tr><td colspan="2" style="padding:12px 0 4px;font-weight:600;font-size:.82rem;color:var(--muted);text-transform:uppercase">Patrimonio Neto</td></tr>
                <tr><td style="padding-left:16px">Capital social</td><td>${money(capitalSocial)}</td></tr>
                <tr><td style="padding-left:16px">Reserva legal</td><td>${money(reservaLegal)}</td></tr>
                <tr><td style="padding-left:16px">Otras reservas</td><td>${money(otrasReservas)}</td></tr>
                <tr><td style="padding-left:16px">Resultado del ejercicio</td>
                  <td style="color:${resultadoEjercicio >= 0 ? 'var(--success)' : 'var(--danger)'}">
                    <b>${money(resultadoEjercicio)}</b>
                  </td>
                </tr>
                <tr><td style="padding-left:16px"><b>Total Patrimonio Neto</b></td><td><b>${money(totalPN)}</b></td></tr>
                <tr style="border-top:1px solid var(--border)">
                  <td style="padding-top:8px"><b>Total Pasivo + PN</b></td>
                  <td style="padding-top:8px"><b>${money(totalPasivo + totalPN)}</b></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card" style="margin-top:12px;padding:14px;text-align:right;display:flex;align-items:center;justify-content:space-between">
          <span class="muted" style="font-size:.82rem">
            Saldo inicial caja: ${money(cfg?.saldoInicialCaja ?? 0)} |
            Ingresos período: ${money(ingresos)} |
            Egresos período: ${money(egresos)}
          </span>
          <span>
            <span class="badge ${cuadra ? 'ok' : 'bad'}" style="font-size:.85rem">
              ${cuadra ? '✓ Ecuación contable cuadra' : '⚠ No cuadra — revisá los datos'}
            </span>
          </span>
        </div>
      ${LEYENDA_LEGAL}
      </div>`
  }

  await cargar();

  btnCalcular.onclick = calcular;

  // Panel de configuración
  btnConfig.onclick = () => {
    configPanel.style.display = configPanel.style.display === 'none' ? 'block' : 'none';
    if (configPanel.style.display === 'block') poblarConfig();
  };
  btnCancelar.onclick = () => { configPanel.style.display = 'none'; };

  function poblarConfig() {
    document.querySelector('#cfgFechaApertura').value = cfg?.fechaApertura ?? '';
    document.querySelector('#cfgSaldoInicial').value  = cfg?.saldoInicialCaja ?? 0;
    document.querySelector('#cfgCapitalSocial').value = cfg?.capitalSocial ?? 0;
    document.querySelector('#cfgReservaLegal').value  = cfg?.reservaLegal ?? 0;
    document.querySelector('#cfgOtrasReservas').value = cfg?.otrasReservas ?? 0;
    renderListaCuentas();
  }

  function renderListaCuentas() {
    listActivoEl.innerHTML = cuentasActivo.map((c, i) => `
      <div style="display:flex;gap:8px;margin-bottom:6px;align-items:center">
        <input type="text" value="${esc(c.nombre)}" placeholder="Nombre" data-i="${i}" data-tipo="activo" data-campo="nombre"
          style="flex:2;padding:7px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text)">
        <input type="number" value="${c.monto}" placeholder="Monto" min="0" step="0.01" data-i="${i}" data-tipo="activo" data-campo="monto"
          style="flex:1;padding:7px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text)">
        <button class="btn danger btn-remove" data-i="${i}" data-tipo="activo" style="padding:6px 10px;font-size:.8rem">✕</button>
      </div>`).join('') || '<p class="muted" style="font-size:.82rem">Sin cuentas de activo agregadas.</p>';

    listPasivoEl.innerHTML = cuentasPasivo.map((c, i) => `
      <div style="display:flex;gap:8px;margin-bottom:6px;align-items:center">
        <input type="text" value="${esc(c.nombre)}" placeholder="Nombre" data-i="${i}" data-tipo="pasivo" data-campo="nombre"
          style="flex:2;padding:7px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text)">
        <input type="number" value="${c.monto}" placeholder="Monto" min="0" step="0.01" data-i="${i}" data-tipo="pasivo" data-campo="monto"
          style="flex:1;padding:7px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text)">
        <button class="btn danger btn-remove" data-i="${i}" data-tipo="pasivo" style="padding:6px 10px;font-size:.8rem">✕</button>
      </div>`).join('') || '<p class="muted" style="font-size:.82rem">Sin cuentas de pasivo agregadas.</p>';

    // Eventos input
    configPanel.querySelectorAll('input[data-campo]').forEach(input => {
      input.oninput = () => {
        const i = Number(input.dataset.i);
        const tipo = input.dataset.tipo;
        const campo = input.dataset.campo;
        const arr = tipo === 'activo' ? cuentasActivo : cuentasPasivo;
        arr[i][campo] = campo === 'monto' ? Number(input.value) : input.value;
      };
    });

    // Eliminar
    configPanel.querySelectorAll('.btn-remove').forEach(btn => {
      btn.onclick = () => {
        const i = Number(btn.dataset.i);
        if (btn.dataset.tipo === 'activo') cuentasActivo.splice(i, 1);
        else cuentasPasivo.splice(i, 1);
        renderListaCuentas();
      };
    });
  }

  btnAddActivo.onclick = () => {
    cuentasActivo.push({ nombre: '', monto: 0 });
    renderListaCuentas();
  };
  btnAddPasivo.onclick = () => {
    cuentasPasivo.push({ nombre: '', monto: 0 });
    renderListaCuentas();
  };

  btnGuardar.onclick = async () => {
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando…';
    try {
      cfg = await balanceService.save({
        fechaApertura:   document.querySelector('#cfgFechaApertura').value,
        saldoInicialCaja: Number(document.querySelector('#cfgSaldoInicial').value),
        capitalSocial:    Number(document.querySelector('#cfgCapitalSocial').value),
        reservaLegal:     Number(document.querySelector('#cfgReservaLegal').value),
        otrasReservas:    Number(document.querySelector('#cfgOtrasReservas').value),
        cuentasActivo: cuentasActivo.filter(c => c.nombre),
        cuentasPasivo: cuentasPasivo.filter(c => c.nombre),
      });
      toast.ok('Configuración contable guardada.');
      configPanel.style.display = 'none';
      calcular();
    } catch (err) {
      toast.err(err.message);
    } finally {
      btnGuardar.disabled = false;
      btnGuardar.textContent = 'Guardar configuración';
    }
  };

  btnImprimir.onclick = () => {
    const contenido = document.querySelector('#balanceImprimible')?.innerHTML ?? '';
    const ventana = window.open('', '_blank');
    ventana.document.write(`<!DOCTYPE html><html lang="es"><head>
      <meta charset="utf-8"><title>Balance General</title>
      <style>
        body{font-family:'Times New Roman',serif;font-size:11pt;color:#000;margin:2cm}
        table{width:100%;border-collapse:collapse}
        th,td{padding:4px 8px;text-align:left}
        th{border-bottom:2px solid #000}
        .card{border:1px solid #ccc;padding:12px;margin-bottom:12px}
        .badge{display:inline-block;padding:2px 8px;border:1px solid #000;border-radius:3px;font-size:9pt}
        @media print{body{margin:1.5cm}}
      </style>
    </head><body>${contenido}${LEYENDA_LEGAL}</body></html>`);
    ventana.document.close();
    ventana.focus();
    ventana.print();
    setTimeout(() => ventana.close(), 1000);
  };
}

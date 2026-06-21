import { asociadoService } from '../../modules/asociados/services/asociado.service.js';
import { usuarioService } from '../../modules/usuarios/services/usuario.service.js';
import { documentoService } from '../../modules/documentos/services/documento.service.js';
import { vencimientoService } from '../../modules/vencimientos/services/vencimiento.service.js';
import { movimientoService } from '../../modules/contabilidad/services/movimiento.service.js';
import { eventoService } from '../../modules/eventos/services/evento.service.js';
import { cooperativaService } from '../../services/cooperativa.service.js';
import { fmt, daysUntil } from '../../utils/date.js';
import { escapeHtml } from '../../utils/security.js';

const money = n => Number(n ?? 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

const kpiLabels = ['Asociados activos', 'Usuarios activos', 'Documentos', 'Vencimientos pendientes', 'Resultado del mes'];

// Devuelve el skeleton del dashboard (sin datos).
// Los datos se cargan en bindDashboard() de forma asíncrona.
export function dashboardView() {
  return `<section class="dashboard">
    <div class="page-header">
      <h1>Dashboard</h1>
      <p class="muted" id="dashCoopInfo">Cargando…</p>
    </div>
    <div class="kpis" id="dashKpis">
      ${kpiLabels.map(l =>
        `<div class="card kpi"><span class="muted">${l}</span><div class="num kpi-loading">—</div></div>`
      ).join('')}
    </div>
    <div class="dash-grid">
      <div class="card" id="dashVencimientos"><h3>Próximos vencimientos</h3><div class="loading">Cargando…</div></div>
      <div class="card" id="dashEventos"><h3>Actividad reciente</h3><div class="loading">Cargando…</div></div>
    </div>
  </section>`;
}

export async function bindDashboard(user) {
  const [cooperativa, asociados, usuarios, documentos, vencimientos, movimientos, eventos] = await Promise.all([
    cooperativaService.getCurrent().catch(() => null),
    asociadoService.list().catch(() => []),
    usuarioService.list().catch(() => []),
    documentoService.list().catch(() => []),
    vencimientoService.list().catch(() => []),
    movimientoService.list().catch(() => []),
    eventoService.list().catch(() => [])
  ]);

  // Info cooperativa
  const info = document.querySelector('#dashCoopInfo');
  if (info) info.textContent = cooperativa?.nombre ? `Cooperativa · ${cooperativa.nombre}` : `Cooperativa · ${user.cooperativaId}`;

  // Resultado contable del mes en curso
  const inicioMes = new Date().toISOString().slice(0, 7) + '-01';
  const delMes = movimientos.filter(m => m.fecha >= inicioMes);
  const resultadoMes = delMes.reduce((acc, m) => acc + (m.tipo === 'ingreso' ? Number(m.monto) : -Number(m.monto)), 0);

  // KPIs
  const kpiEl = document.querySelectorAll('.kpi .num');
  const kpiData = [
    asociados.filter(a => a.estado === 'activo').length,
    usuarios.filter(u => u.activo === true || u.activo === 'true').length,
    documentos.filter(d => d.visible === true || d.visible === 'true').length,
    vencimientos.filter(v => v.estado === 'pendiente').length,
    money(resultadoMes)
  ];
  kpiEl.forEach((el, i) => {
    el.textContent = kpiData[i];
    el.classList.remove('kpi-loading');
  });

  // Vencimientos
  const venEl = document.querySelector('#dashVencimientos');
  const proximos = vencimientos
    .filter(v => v.estado === 'pendiente')
    .sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento))
    .slice(0, 5);
  venEl.innerHTML = `<h3>Próximos vencimientos</h3>` + (proximos.length
    ? proximos.map(v => `<div class="dash-row">
        <b>${escapeHtml(v.descripcion)}</b>
        <span class="muted">${escapeHtml(v.organismoId ?? '—')} · ${fmt(v.fechaVencimiento)} · ${daysUntil(v.fechaVencimiento)} días</span>
      </div>`).join('')
    : '<p class="muted empty">Sin vencimientos pendientes.</p>');

  // Eventos recientes
  const evEl = document.querySelector('#dashEventos');
  evEl.innerHTML = `<h3>Actividad reciente</h3>` + (eventos.length
    ? eventos.slice(0, 6).map(e => `<div class="dash-row">
        <b>${escapeHtml(e.tipo ?? e.descripcion ?? '—')}</b>
        <span class="muted">${fmt(e.fecha)} · ${escapeHtml(e.descripcion ?? '')}</span>
      </div>`).join('')
    : '<p class="muted empty">Sin actividad registrada.</p>');
}

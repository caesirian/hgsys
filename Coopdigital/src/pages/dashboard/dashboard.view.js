import { asociadoService } from '../../modules/asociados/services/asociado.service.js';
import { usuarioService } from '../../modules/usuarios/services/usuario.service.js';
import { documentoService } from '../../modules/documentos/services/documento.service.js';
import { vencimientoService } from '../../modules/vencimientos/services/vencimiento.service.js';
import { movimientoService } from '../../modules/contabilidad/services/movimiento.service.js';
import { eventoService } from '../../modules/eventos/services/evento.service.js';
import { cooperativaService } from '../../services/cooperativa.service.js';
import { authService } from '../../services/auth.service.js';
import { webauthnService } from '../../services/webauthn.service.js';
import { toast } from '../../utils/toast.js';
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
      <div class="card" id="dashSeguridad">
        <h3>Seguridad de tu cuenta</h3>
        <p class="muted">Activá el ingreso con huella o Face ID en este dispositivo, sin escribir tu contraseña cada vez.</p>
        <button class="btn ghost" id="btnActivarBiometria" style="display:none">🔐 Activar biometría en este dispositivo</button>
        <p class="muted" id="bioNoSoportado" style="display:none">Este navegador o dispositivo no soporta login biométrico.</p>
      </div>
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

  // Seguridad — activar biometría en este dispositivo. Chequeo puramente
  // local (localStorage) para no mostrar dos veces el botón en el mismo
  // dispositivo; no es la fuente de verdad (esa es webauthnCredentials en
  // Firestore, solo accesible desde el backend), es solo una comodidad de UI.
  const btnBio = document.querySelector('#btnActivarBiometria');
  const bioNoSoportado = document.querySelector('#bioNoSoportado');
  const yaEnroladoKey = `webauthnEnrolado:${user.uid}`;

  if (!webauthnService.soportado()) {
    bioNoSoportado.style.display = '';
  } else if (localStorage.getItem(yaEnroladoKey) === '1') {
    btnBio.style.display = '';
    btnBio.textContent = '🔐 Biometría activa en este dispositivo';
    btnBio.disabled = true;
  } else {
    btnBio.style.display = '';
    btnBio.onclick = async () => {
      btnBio.disabled = true;
      btnBio.textContent = 'Activando…';
      try {
        const deviceName = `${navigator.platform || 'Dispositivo'} · ${new Date().toLocaleDateString('es-AR')}`;
        await authService.registerPasskey(deviceName);
        localStorage.setItem(yaEnroladoKey, '1');
        btnBio.textContent = '🔐 Biometría activa en este dispositivo';
        toast.ok('Biometría activada en este dispositivo.');
      } catch (err) {
        btnBio.disabled = false;
        btnBio.textContent = '🔐 Activar biometría en este dispositivo';
        toast.err(err.message);
      }
    };
  }
}

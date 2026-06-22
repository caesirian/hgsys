import { authService } from './services/auth.service.js';
import { layout } from './layouts/main-layout/main-layout.js';
import { loginView } from './pages/login/login.view.js';
import { dashboardView, bindDashboard } from './pages/dashboard/dashboard.view.js';
import { usuariosView, bindUsuarios } from './modules/usuarios/views/usuarios.view.js';
import { asociadosView, bindAsociados } from './modules/asociados/views/asociados.view.js';
import { libroAsociadosView, bindLibro } from './modules/libro-asociados/views/libro-asociados.view.js';
import { documentosView, bindDocumentos } from './modules/documentos/views/documentos.view.js';
import { vencimientosView, bindVencimientos } from './modules/vencimientos/views/vencimientos.view.js';
import { contabilidadView, bindContabilidad } from './modules/contabilidad/views/contabilidad.view.js';
import { reportesContablesView, bindReportesContables } from './modules/contabilidad/views/reportes-contables.view.js';
import { eventosView, bindEventos } from './modules/eventos/views/eventos.view.js';
import { consejoView, bindConsejo } from './modules/consejo/views/consejo.view.js';
import { sindicaturaView, bindSindicatura } from './modules/sindicatura/views/sindicatura.view.js';
import { asambleasView, bindAsambleas } from './modules/asambleas/views/asambleas.view.js';
import { actasView, bindActas } from './modules/actas/views/actas.view.js';

const app = document.querySelector('#app');
let user = null;
let authReady = false;

const route = () => location.hash.replace('#', '') || '/dashboard';

function renderLoading() {
  app.innerHTML = '<main class="auth"><p class="muted">Cargando sesión…</p></main>';
}

function renderLogin(errorMessage) {
  app.innerHTML = loginView();
  if (errorMessage) {
    const errEl = document.querySelector('#loginError');
    if (errEl) {
      const div = document.createElement('div');
      div.className = 'alert error';
      div.textContent = errorMessage;
      errEl.appendChild(div);
    }
  }
  const form = document.querySelector('#loginForm');
  const submitBtn = document.querySelector('#loginSubmit');
  form.onsubmit = async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Ingresando…';
    const data = new FormData(e.currentTarget);
    try {
      user = await authService.login(data.get('email'), data.get('password'));
      location.hash = '/dashboard';
      render();
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Ingresar';
      renderLogin(mapAuthError(err));
    }
  };
}

function mapAuthError(err) {
  const code = err?.code || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'Email o contraseña incorrectos.';
  }
  if (code.includes('too-many-requests')) {
    return 'Demasiados intentos. Esperá un momento.';
  }
  return err?.message || 'No se pudo iniciar sesión.';
}

function bindLayout() {
  document.querySelector('#logout').onclick = async () => {
    await authService.logout();
  };
  document.querySelector('#collapseSidebar').onclick = () =>
    document.querySelector('#sidebar').classList.toggle('collapsed');
  document.querySelector('#openSidebar')?.addEventListener('click', () =>
    document.querySelector('#sidebar').classList.toggle('open'));
}

async function render() {
  const path = route();

  if (!user) {
    if (path !== '/login') location.hash = '/login';
    renderLogin();
    return;
  }

  if (path === '/login') {
    location.hash = '/dashboard';
    return;
  }

  // Determinar vista y bind
  let view = '';
  let bind = null;

  if (path === '/usuarios') {
    view = usuariosView();
    bind = () => bindUsuarios();
  } else if (path === '/asociados') {
    view = asociadosView();
    bind = () => bindAsociados();
  } else if (path === '/libro-asociados') {
    view = libroAsociadosView();
    bind = () => bindLibro();
  } else if (path === '/documentos') {
    view = documentosView();
    bind = () => bindDocumentos();
  } else if (path === '/vencimientos') {
    view = vencimientosView();
    bind = () => bindVencimientos();
  } else if (path === '/contabilidad') {
    view = contabilidadView();
    bind = () => bindContabilidad();
  } else if (path === '/reportes-contables') {
    view = reportesContablesView();
    bind = () => bindReportesContables();
  } else if (path === '/eventos') {
    view = eventosView();
    bind = () => bindEventos();
  } else if (path === '/consejo') {
    view = consejoView();
    bind = () => bindConsejo();
  } else if (path === '/sindicatura') {
    view = sindicaturaView();
    bind = () => bindSindicatura();
  } else if (path === '/asambleas') {
    view = asambleasView();
    bind = () => bindAsambleas();
  } else if (path === '/actas') {
    view = actasView();
    bind = () => bindActas();
  } else {
    view = dashboardView();
    bind = () => bindDashboard(user);
  }

  app.innerHTML = layout(user, path, view);
  bindLayout();
  if (bind) await bind();
}

renderLoading();
addEventListener('hashchange', render);

authService.onChange((sessionUser) => {
  user = sessionUser;
  if (!authReady) authReady = true;
  render();
});

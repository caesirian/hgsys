import { authService } from './services/auth.service.js';
import { layout } from './layouts/main-layout/main-layout.js';
import { loginView } from './pages/login/login.view.js';
import { dashboardView } from './pages/dashboard/dashboard.view.js';
import { usuariosView, bindUsuarios } from './modules/usuarios/views/usuarios.view.js';
import { asociadosView, bindAsociados } from './modules/asociados/views/asociados.view.js';
import { libroAsociadosView, bindLibro } from './modules/libro-asociados/views/libro-asociados.view.js';
import { documentosView, bindDocumentos } from './modules/documentos/views/documentos.view.js';
import { vencimientosView, bindVencimientos } from './modules/vencimientos/views/vencimientos.view.js';
import { eventosView } from './modules/eventos/views/eventos.view.js';

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
    document.querySelector('#loginError').innerHTML =
      `<div class="alert error"></div>`;
    document.querySelector('#loginError .error').textContent = errorMessage;
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
    return 'Demasiados intentos. Esperá un momento y volvé a probar.';
  }
  return err?.message || 'No se pudo iniciar sesión.';
}

function render() {
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

  let view = '';
  let bind = () => {};

  if (path === '/usuarios') {
    view = usuariosView();
    bind = () => bindUsuarios(render);
  } else if (path === '/asociados') {
    view = asociadosView();
    bind = () => bindAsociados(render);
  } else if (path === '/libro-asociados') {
    view = libroAsociadosView();
    bind = bindLibro;
  } else if (path === '/documentos') {
    view = documentosView();
    bind = () => bindDocumentos(render);
  } else if (path === '/vencimientos') {
    view = vencimientosView();
    bind = () => bindVencimientos(render);
  } else if (path === '/eventos') {
    view = eventosView();
  } else {
    view = dashboardView();
  }

  app.innerHTML = layout(user, path, view);

  document.querySelector('#logout').onclick = async () => {
    await authService.logout();
  };
  document.querySelector('#collapseSidebar').onclick = () =>
    document.querySelector('#sidebar').classList.toggle('collapsed');
  document.querySelector('#openSidebar')?.addEventListener('click', () =>
    document.querySelector('#sidebar').classList.toggle('open')
  );

  bind();
}

renderLoading();
addEventListener('hashchange', render);

authService.onChange((sessionUser) => {
  user = sessionUser;
  if (!authReady) {
    authReady = true;
  }
  render();
});

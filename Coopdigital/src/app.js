import { isFirebaseConfigured } from './config/firebase.config.js';
import { APP_CONFIG } from './config/app.config.js';
import { authService } from './services/auth.service.js';
import { layout } from './layouts/main-layout/main-layout.js';
import { loginView } from './pages/login/login.view.js';
import { dashboardView } from './pages/dashboard/dashboard.view.js';
import { usuariosView } from './modules/usuarios/views/usuarios.view.js';
import { asociadosView } from './modules/asociados/views/asociados.view.js';
import { libroAsociadosView } from './modules/libro-asociados/views/libro-asociados.view.js';
import { documentosView } from './modules/documentos/views/documentos.view.js';
import { vencimientosView } from './modules/vencimientos/views/vencimientos.view.js';
import { eventosView } from './modules/eventos/views/eventos.view.js';

const app = document.querySelector('#app');
let currentUser = null;
const cleanRoute = () => (location.hash.replace('#', '').split('?')[0] || APP_CONFIG.defaultRoute);

function renderLogin(error = '') {
  app.innerHTML = loginView(error);
  document.querySelector('#loginForm').onsubmit = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      currentUser = await authService.login(data.get('email'), data.get('password'));
      location.hash = APP_CONFIG.defaultRoute;
      await render();
    } catch (err) {
      renderLogin(err.message);
    }
  };
}

async function resolveView(path) {
  if (path === '/usuarios') return usuariosView(currentUser);
  if (path === '/asociados') return asociadosView(currentUser);
  if (path === '/libro-asociados') return libroAsociadosView(currentUser);
  if (path === '/documentos') return documentosView(currentUser);
  if (path === '/vencimientos') return vencimientosView(currentUser);
  if (path === '/eventos') return eventosView(currentUser);
  return { html: await dashboardView(currentUser), bind: () => {} };
}

async function render() {
  if (!isFirebaseConfigured()) {
    app.innerHTML = `<main class="auth"><section class="auth-card"><div class="logo">CD</div><h1>Firebase Configuration</h1><p class="alert error">Configure Firebase en <b>src/config/firebase.config.js</b> o defina <b>window.COOPDIGITAL_FIREBASE_CONFIG</b>.</p></section></main>`;
    return;
  }
  if (!currentUser) {
    if (cleanRoute() !== '/login') location.hash = '/login';
    renderLogin();
    return;
  }
  const path = cleanRoute();
  app.innerHTML = layout(currentUser, path, '<div class="card">Cargando...</div>');
  try {
    const view = await resolveView(path);
    app.innerHTML = layout(currentUser, path, view.html);
    document.querySelector('#logout').onclick = async () => { await authService.logout(); currentUser = null; location.hash = '/login'; renderLogin(); };
    document.querySelector('#collapseSidebar').onclick = () => document.querySelector('#sidebar').classList.toggle('collapsed');
    document.querySelector('#openSidebar')?.addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('open'));
    view.bind?.(render);
  } catch (error) {
    app.querySelector('.content').innerHTML = `<div class="alert error">${error.message}</div>`;
  }
}

window.addEventListener('hashchange', render);
if (isFirebaseConfigured()) {
  authService.waitForUser(async (user, error) => {
    currentUser = user;
    if (error) renderLogin(error.message);
    else await render();
  });
} else {
  render();
}

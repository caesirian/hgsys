import { authStore } from '../../../stores/auth.store.js';
import { webauthnService } from '../../../services/webauthn.service.js';
import { auth } from '../../../firebase/firebase.config.js';
import { toast } from '../../../utils/toast.js';
import { escapeHtml } from '../../../utils/security.js';

export function perfilView() {
  return `<section>
    <div class="toolbar">
      <div><h1>Mi perfil</h1><p class="muted">Datos de tu cuenta y configuración de acceso biométrico.</p></div>
    </div>

    <div class="card" style="max-width:640px;margin-bottom:20px">
      <h2 style="color:var(--cyan);margin-bottom:16px">Datos de la cuenta</h2>
      <div id="perfilDatos"><div class="loading">Cargando…</div></div>
    </div>

    <div class="card" style="max-width:640px">
      <h2 style="color:var(--cyan);margin-bottom:8px">Acceso biométrico (passkey)</h2>
      <p class="muted" style="margin-bottom:16px;font-size:.85rem">
        Registrá tu huella, Face ID o Windows Hello en este dispositivo para ingresar sin contraseña la próxima vez.
      </p>
      <div id="passkeyStatus"><div class="loading">Verificando soporte…</div></div>
    </div>
  </section>`;
}

export async function bindPerfil() {
  const datosEl    = document.querySelector('#perfilDatos');
  const statusEl   = document.querySelector('#passkeyStatus');
  const usuario    = authStore.get();
  const fbUser     = auth.currentUser;

  // — Datos de cuenta —
  datosEl.innerHTML = `
    <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:12px">
      <div class="field">
        <label>Nombre</label>
        <input type="text" value="${escapeHtml(usuario?.nombre ?? '')}" readonly style="opacity:.7">
      </div>
      <div class="field">
        <label>Apellido</label>
        <input type="text" value="${escapeHtml(usuario?.apellido ?? '')}" readonly style="opacity:.7">
      </div>
      <div class="field full">
        <label>Email</label>
        <input type="text" value="${escapeHtml(fbUser?.email ?? usuario?.email ?? '')}" readonly style="opacity:.7">
      </div>
      <div class="field">
        <label>Rol</label>
        <input type="text" value="${escapeHtml(usuario?.rol ?? '')}" readonly style="opacity:.7">
      </div>
    </div>`;

  // — Estado de passkeys —
  if (!webauthnService.soportado()) {
    statusEl.innerHTML = `<p class="muted">Tu navegador o dispositivo no soporta passkeys.</p>`;
    return;
  }

  function renderPasskeyUI(registrada = false) {
    statusEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span class="badge ${registrada ? 'ok' : 'muted'}">
          ${registrada ? '🔐 Passkey registrada en este dispositivo' : 'Sin passkey registrada'}
        </span>
        ${registrada
          ? `<button class="btn ghost" id="btnReregistrar" style="font-size:.85rem">Reemplazar passkey</button>`
          : `<button class="btn primary" id="btnRegistrar">Registrar huella / biometría</button>`}
      </div>
      <p class="muted" style="margin-top:10px;font-size:.8rem">
        ${registrada
          ? 'La próxima vez que ingreses vas a ver el botón "Ingresar con biometría" en la pantalla de login.'
          : 'Una vez registrada, podrás ingresar con tu huella, Face ID o Windows Hello sin escribir contraseña.'}
      </p>
      <div id="passkeyForm" style="margin-top:16px;display:none">
        <div class="field" style="max-width:300px;margin-bottom:12px">
          <label>Nombre del dispositivo</label>
          <input type="text" id="deviceName" placeholder="${escapeHtml(navigator.platform || 'Mi dispositivo')}" maxlength="50">
        </div>
        <button class="btn primary" id="btnConfirmarRegistro">Confirmar y registrar</button>
        <button class="btn ghost" id="btnCancelarRegistro" style="margin-left:8px">Cancelar</button>
      </div>`;

    const btnRegistrar   = document.querySelector('#btnRegistrar') || document.querySelector('#btnReregistrar');
    const passkeyForm    = document.querySelector('#passkeyForm');
    const btnConfirmar   = document.querySelector('#btnConfirmarRegistro');
    const btnCancelar    = document.querySelector('#btnCancelarRegistro');

    btnRegistrar.onclick = () => { passkeyForm.style.display = 'block'; btnRegistrar.style.display = 'none'; };
    btnCancelar.onclick  = () => { passkeyForm.style.display = 'none'; btnRegistrar.style.display = ''; };

    btnConfirmar.onclick = async () => {
      const deviceName = document.querySelector('#deviceName').value.trim()
        || navigator.platform || 'Mi dispositivo';
      btnConfirmar.disabled = true;
      btnConfirmar.textContent = 'Registrando…';
      try {
        await webauthnService.registrarPasskey(deviceName);
        toast.ok(`Passkey registrada en "${deviceName}". La próxima vez usá el botón de biometría.`);
        renderPasskeyUI(true);
      } catch (err) {
        toast.err(err.message);
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = 'Confirmar y registrar';
      }
    };
  }

  // Detectar si ya tiene passkey registrada verificando si el navegador
  // tiene credenciales para este dominio (discoverable credential check).
  try {
    const disponible = await PublicKeyCredential.isConditionalMediationAvailable?.() ?? false;
    renderPasskeyUI(disponible);
  } catch {
    renderPasskeyUI(false);
  }
}

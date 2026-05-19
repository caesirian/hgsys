import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { auth, googleProvider, isFirebaseConfigured } from './firebase.js';

const button = document.getElementById('google-login');
const feedback = document.getElementById('auth-feedback');

const isSecureContextForAuth =
  window.location.protocol === 'https:' || window.location.hostname === 'localhost';

if (!isFirebaseConfigured) {
  button.disabled = true;
  feedback.textContent =
    'Configurá tu proyecto Firebase en js/firebase.js para habilitar el login.';
}

if (!isSecureContextForAuth) {
  button.disabled = true;
  feedback.textContent =
    'Abrí la app en https:// o localhost. Google Login no funciona en file://.';
}

onAuthStateChanged(auth, (user) => {
  if (user) window.location.href = './index.html';
});

// Completa el flujo cuando se usa redirect (fallback para navegadores que bloquean popups).
getRedirectResult(auth).catch((error) => {
  feedback.textContent = `Error de autenticación: ${error.code ?? 'desconocido'}`;
});

button.addEventListener('click', async () => {
  if (!isFirebaseConfigured || !isSecureContextForAuth) return;

  try {
    await signInWithPopup(auth, googleProvider);
    window.location.href = './index.html';
  } catch (error) {
    if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, googleProvider);
      return;
    }
    feedback.textContent = `No se pudo iniciar sesión (${error.code ?? 'error desconocido'}).`;
  }
});

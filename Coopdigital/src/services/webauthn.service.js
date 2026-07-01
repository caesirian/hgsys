import { auth } from '../firebase/firebase.config.js';
import { API_BASE } from '../config/api.config.js';

// --- helpers base64url <-> ArrayBuffer (WebAuthn habla en ArrayBuffers en
// el navegador, pero JSON no transporta binarios, así que el backend
// manda/recibe todo en base64url) ---

function base64urlToBuffer(base64url) {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    base64url.length + (4 - (base64url.length % 4)) % 4, '='
  );
  const raw = atob(padded);
  const buffer = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buffer[i] = raw.charCodeAt(i);
  return buffer.buffer;
}

function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function post(path, body, idToken) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {})
    },
    body: JSON.stringify(body ?? {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de comunicación con el servidor de login biométrico.');
  return data;
}

export function passkeysSoportadas() {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential;
}

export const webauthnService = {
  soportado: passkeysSoportadas,

  // Registra una passkey para el usuario ya logueado, en este dispositivo.
  async registrarPasskey(deviceName) {
    if (!auth.currentUser) throw new Error('Tenés que estar logueado para activar la biometría.');
    const idToken = await auth.currentUser.getIdToken();

    const options = await post('/auth/webauthn/register-options', {}, idToken);

    const publicKey = {
      ...options,
      challenge: base64urlToBuffer(options.challenge),
      user: { ...options.user, id: base64urlToBuffer(options.user.id) },
      excludeCredentials: (options.excludeCredentials || []).map(c => ({ ...c, id: base64urlToBuffer(c.id) }))
    };

    const credential = await navigator.credentials.create({ publicKey });
    if (!credential) throw new Error('No se completó el registro de la passkey.');

    const response = {
      id: credential.id,
      rawId: bufferToBase64url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: bufferToBase64url(credential.response.clientDataJSON),
        attestationObject: bufferToBase64url(credential.response.attestationObject),
        transports: credential.response.getTransports ? credential.response.getTransports() : []
      },
      clientExtensionResults: credential.getClientExtensionResults ? credential.getClientExtensionResults() : {}
    };

    return post('/auth/webauthn/register-verify', { response, deviceName }, idToken);
  },

  // Login passwordless: devuelve un Firebase custom token para usar con
  // signInWithCustomToken (lo hace auth.service.js, no este archivo, para
  // no acoplar WebAuthn con Firebase Auth acá).
  async loginConPasskey() {
    const { sessionId, options } = await post('/auth/webauthn/login-options');

    const publicKey = {
      ...options,
      challenge: base64urlToBuffer(options.challenge),
      allowCredentials: (options.allowCredentials || []).map(c => ({ ...c, id: base64urlToBuffer(c.id) }))
    };

    const assertion = await navigator.credentials.get({ publicKey });
    if (!assertion) throw new Error('No se completó el login biométrico.');

    const response = {
      id: assertion.id,
      rawId: bufferToBase64url(assertion.rawId),
      type: assertion.type,
      response: {
        clientDataJSON: bufferToBase64url(assertion.response.clientDataJSON),
        authenticatorData: bufferToBase64url(assertion.response.authenticatorData),
        signature: bufferToBase64url(assertion.response.signature),
        userHandle: assertion.response.userHandle ? bufferToBase64url(assertion.response.userHandle) : undefined
      },
      clientExtensionResults: assertion.getClientExtensionResults ? assertion.getClientExtensionResults() : {}
    };

    const { customToken } = await post('/auth/webauthn/login-verify', { sessionId, response });
    return customToken;
  }
};

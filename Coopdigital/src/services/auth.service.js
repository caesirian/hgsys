import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  getIdTokenResult
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';
import { auth, db } from '../firebase/firebase.config.js';
import { authStore } from '../stores/auth.store.js';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Lee los Custom Claims del token (cooperativaId, role, active), asignados
// por el Cloud Function syncUserClaims al escribirse el perfil en Firestore.
// Si el usuario acaba de ser dado de alta, el trigger puede tardar unos
// segundos en correr: reintenta con backoff corto antes de fallar.
async function resolveClaims(firebaseUser) {
  for (let intento = 0; intento < 4; intento++) {
    const tokenResult = await getIdTokenResult(firebaseUser, true);
    if (tokenResult.claims.cooperativaId) return tokenResult.claims;
    await sleep(1200);
  }
  throw new Error('Tu usuario todavía no fue activado en ninguna cooperativa. Esperá unos segundos e intentá de nuevo, o pedile a un administrador que verifique tu alta.');
}

// Combina los claims (fuente de verdad para cooperativaId/role/active) con
// los datos de perfil de Firestore (nombre, apellido) para mostrar en la UI.
async function loadPerfil(firebaseUser) {
  const claims = await resolveClaims(firebaseUser);

  if (claims.active !== true) {
    throw new Error('Tu usuario está inactivo. Contactá a un administrador de tu cooperativa.');
  }

  const ref = doc(db, 'cooperativas', claims.cooperativaId, 'usuarios', firebaseUser.uid);
  const snap = await getDoc(ref);
  const datos = snap.exists() ? snap.data() : {};

  const perfil = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    cooperativaId: claims.cooperativaId,
    rol: claims.role,
    activo: claims.active,
    nombre: datos.nombre ?? '',
    apellido: datos.apellido ?? ''
  };
  authStore.set(perfil);
  return perfil;
}

export const authService = {
  async login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return loadPerfil(cred.user);
  },
  async logout() {
    authStore.set(null);
    await signOut(auth);
  },
  getUser() {
    return authStore.get();
  },
  // Se ejecuta una vez al cargar la app y cada vez que cambia el estado de
  // sesión (login/logout, expiración de token).
  onChange(callback) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        authStore.set(null);
        callback(null);
        return;
      }
      try {
        callback(await loadPerfil(firebaseUser));
      } catch (err) {
        authStore.set(null);
        callback(null, err);
      }
    });
  }
};

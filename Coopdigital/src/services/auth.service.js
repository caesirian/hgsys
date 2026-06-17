import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';
import { auth, db } from '../firebase/firebase.config.js';
import { APP_CONFIG } from '../config/app.config.js';
import { authStore } from '../stores/auth.store.js';

// NOTA (bootstrap temporal): hasta que exista el Cloud Function que asigna
// Custom Claims (cooperativaId/role/active), el perfil se resuelve leyendo
// directamente cooperativas/{cooperativaId}/usuarios/{uid} con un
// cooperativaId fijo de desarrollo. Esto NO es multi-tenant real todavía.
async function loadPerfil(firebaseUser) {
  const ref = doc(db, 'cooperativas', APP_CONFIG.cooperativaId, 'usuarios', firebaseUser.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('No existe un perfil para este usuario en la cooperativa. Pedile a un admin que te dé de alta.');
  }
  const data = snap.data();
  if (!data.activo) {
    throw new Error('Tu usuario está inactivo. Contactá a un administrador.');
  }
  const perfil = { ...data, uid: firebaseUser.uid, email: firebaseUser.email, cooperativaId: APP_CONFIG.cooperativaId };
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
  // sesión (login/logout, expiración de token). callback(null) si no hay sesión.
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

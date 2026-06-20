import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';
import { auth, db } from '../firebase/firebase.config.js';
import { authStore } from '../stores/auth.store.js';

// Resuelve cooperativaId leyendo la entrada propia en el índice global
// usuariosIndex/{uid}. Esa entrada la crea exclusivamente un Admin SDK
// (script de alta), nunca el cliente: ver firestore.rules.
async function resolveCooperativaId(uid) {
  const ref = doc(db, 'usuariosIndex', uid);
  const snap = await getDoc(ref);
  if (!snap.exists() || !snap.data().cooperativaId) {
    throw new Error('Tu usuario no está asociado a ninguna cooperativa. Pedile a un administrador que verifique tu alta.');
  }
  return snap.data().cooperativaId;
}

// Lee el perfil completo (rol, activo, nombre, apellido) dentro de la
// cooperativa ya resuelta.
async function loadPerfil(firebaseUser) {
  const cooperativaId = await resolveCooperativaId(firebaseUser.uid);

  const ref = doc(db, 'cooperativas', cooperativaId, 'usuarios', firebaseUser.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('No existe un perfil para este usuario en la cooperativa. Pedile a un admin que te dé de alta.');
  }
  const datos = snap.data();
  if (datos.activo !== true) {
    throw new Error('Tu usuario está inactivo. Contactá a un administrador de tu cooperativa.');
  }

  const perfil = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    cooperativaId,
    rol: datos.rol,
    activo: datos.activo,
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

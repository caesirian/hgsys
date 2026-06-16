import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { doc, getDoc, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { auth } from '../firebase/auth.js';
import { firestore } from '../firebase/firestore.js';

async function loadProfile(firebaseUser) {
  const claims = await firebaseUser.getIdTokenResult();
  const cooperativaId = claims.claims.cooperativaId;
  if (!cooperativaId) throw new Error('El usuario no posee cooperativaId en Custom Claims.');
  const ref = doc(firestore(), 'cooperativas', cooperativaId, 'usuarios', firebaseUser.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('El perfil de usuario no existe en Firestore.');
  const profile = { id: snap.id, ...snap.data(), cooperativaId };
  if (!profile.activo) throw new Error('Usuario inactivo.');
  await setDoc(ref, { ultimoAcceso: serverTimestamp(), modificadoPor: firebaseUser.uid, fechaModificacion: serverTimestamp() }, { merge: true });
  return profile;
}

export const authService = {
  login(email, password) {
    return signInWithEmailAndPassword(auth(), email, password).then(({ user }) => loadProfile(user));
  },
  logout() {
    return signOut(auth());
  },
  waitForUser(callback) {
    return onAuthStateChanged(auth(), async (firebaseUser) => {
      if (!firebaseUser) return callback(null);
      try { callback(await loadProfile(firebaseUser)); } catch (error) { callback(null, error); }
    });
  }
};

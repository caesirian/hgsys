// Estado global de sesión. Única fuente de verdad sobre el usuario autenticado.
// Sustituye al antiguo `currentUser` hardcodeado en config/app.config.js.
let sessionUser = null;
const listeners = new Set();

export const authStore = {
  get() {
    return sessionUser;
  },
  set(user) {
    sessionUser = user;
    listeners.forEach((fn) => fn(sessionUser));
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }
};

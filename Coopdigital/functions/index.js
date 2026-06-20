const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');

initializeApp();

// ─────────────────────────────────────────────────────────────────
// Trigger: cualquier escritura en cooperativas/{coopId}/usuarios/{uid}
// sincroniza Custom Claims (cooperativaId, role, active) en el token
// del usuario de Firebase Auth correspondiente a ese {uid}.
//
// Esto es lo que hace que el aislamiento multi-tenant sea real: las
// Firestore Rules ya no necesitan leer el documento de perfil con
// get() (costoso e inseguro si el documento se borra), sino que leen
// directamente request.auth.token.cooperativaId / role / active.
// ─────────────────────────────────────────────────────────────────
exports.syncUserClaims = onDocumentWritten(
  'cooperativas/{cooperativaId}/usuarios/{uid}',
  async (event) => {
    const { cooperativaId, uid } = event.params;
    const after = event.data?.after?.data();

    if (!after) {
      // El perfil fue borrado: quitamos los claims para que pierda acceso.
      await getAuth().setCustomUserClaims(uid, null);
      return;
    }

    await getAuth().setCustomUserClaims(uid, {
      cooperativaId,
      role: after.rol ?? null,
      active: after.activo === true
    });
  }
);

// ─────────────────────────────────────────────────────────────────
// Callable: permite forzar la sincronización de claims manualmente
// (por ejemplo, justo después del primer login, antes de que el
// trigger de Firestore haya corrido) y devuelve los claims actuales.
// Solo el propio usuario puede invocarlo para sí mismo.
// ─────────────────────────────────────────────────────────────────
exports.refreshMyClaims = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Se requiere sesión iniciada.');
  }
  const uid = request.auth.uid;
  const user = await getAuth().getUser(uid);
  return user.customClaims ?? {};
});

// Verifica el ID token de Firebase (header Authorization: Bearer <token>)
// de un usuario ya logueado en el panel. Se usa SOLO para el paso de
// registro de una passkey (el usuario ya está autenticado por
// email/contraseña y quiere sumar biometría a este dispositivo).
//
// No confundir con apiKeyAuth: esa es para integraciones externas de
// terceros (x-api-key), esta es para el propio panel de CoopDigital.
import { admin } from '../lib/firebase-admin.js';

export async function firebaseAuth(req, res, next) {
  const header = req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Falta el header Authorization: Bearer <idToken>.' });
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;
    next();
  } catch (err) {
    console.error('ID token inválido:', err.message);
    res.status(401).json({ error: 'Sesión inválida o expirada.' });
  }
}

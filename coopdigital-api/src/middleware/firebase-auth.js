// Middleware que verifica el Firebase ID token enviado en el header
// Authorization: Bearer <idToken>
// Adjunta req.uid con el UID del usuario verificado.
import { admin } from '../lib/firebase-admin.js';

export async function firebaseAuth(req, res, next) {
  const header = req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Falta el token de autenticación.' });
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

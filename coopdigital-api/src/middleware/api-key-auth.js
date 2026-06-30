// Autenticación por API key simple.
//
// Cada cooperativa puede generar una o más API keys, guardadas en:
//   cooperativas/{cooperativaId}/apiKeys/{keyId} -> { key, activa, nombre, creadoEn }
//
// El cliente externo manda la key en el header `x-api-key`. Este middleware
// la busca con collectionGroup (para no requerir que el cliente conozca su
// propio cooperativaId) y, si la encuentra activa, adjunta req.cooperativaId.
//
// Limitación conocida: esto NO es OAuth ni JWT. Es deliberadamente simple
// (alcance acordado para esta fase). Cualquiera con la key tiene acceso de
// lectura/escritura según los endpoints habilitados. Rotar la key si se
// filtra (ver endpoint de administración de keys, gestionado desde el panel,
// no desde esta API pública).
import { db } from '../lib/firebase-admin.js';

export async function apiKeyAuth(req, res, next) {
  const key = req.header('x-api-key');
  if (!key) {
    return res.status(401).json({ error: 'Falta el header x-api-key.' });
  }

  try {
    const snapshot = await db
      .collectionGroup('apiKeys')
      .where('key', '==', key)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(401).json({ error: 'API key inválida.' });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    if (!data.activa) {
      return res.status(403).json({ error: 'API key deshabilitada.' });
    }

    // El padre de apiKeys/{keyId} es cooperativas/{cooperativaId}
    const cooperativaRef = doc.ref.parent.parent;
    if (!cooperativaRef) {
      return res.status(500).json({ error: 'No se pudo resolver la cooperativa de la API key.' });
    }

    req.cooperativaId = cooperativaRef.id;
    req.apiKeyId = doc.id;
    next();
  } catch (err) {
    console.error('Error validando API key:', err);
    res.status(500).json({ error: 'Error interno validando la API key.' });
  }
}

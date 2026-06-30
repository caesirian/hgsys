// Inicializa Firebase Admin SDK usando credenciales de service account
// provistas vía variable de entorno (nunca commiteadas al repo).
//
// En Render: configurar FIREBASE_SERVICE_ACCOUNT con el JSON completo del
// service account (Project Settings > Service Accounts > Generate new
// private key), pegado como string en una sola línea.
import admin from 'firebase-admin';

if (!admin.apps.length) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error('Falta la variable de entorno FIREBASE_SERVICE_ACCOUNT.');
  }
  const serviceAccount = JSON.parse(raw);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

export const db = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;

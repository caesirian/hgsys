export const firebaseConfig = globalThis.COOPDIGITAL_FIREBASE_CONFIG || {
  apiKey: 'CONFIGURE_COOPDIGITAL_FIREBASE_API_KEY',
  authDomain: 'CONFIGURE_COOPDIGITAL_FIREBASE_AUTH_DOMAIN',
  projectId: 'CONFIGURE_COOPDIGITAL_FIREBASE_PROJECT_ID',
  storageBucket: 'CONFIGURE_COOPDIGITAL_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'CONFIGURE_COOPDIGITAL_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'CONFIGURE_COOPDIGITAL_FIREBASE_APP_ID'
};

export function isFirebaseConfigured() {
  return !Object.values(firebaseConfig).some((value) => String(value).startsWith('CONFIGURE_'));
}

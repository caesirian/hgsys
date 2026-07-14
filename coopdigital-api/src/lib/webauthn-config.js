// Configuración de WebAuthn. En Render agregar variable de entorno:
//   WEBAUTHN_ORIGIN = https://coopdigital-dev.firebaseapp.com  (o el dominio real)
// Si no está definida, usa el dominio de Firebase del proyecto.
export const rpName   = 'CoopDigital';
export const rpID     = process.env.WEBAUTHN_RPID     || 'coopdigital-dev.firebaseapp.com';
export const origin   = process.env.WEBAUTHN_ORIGIN   || 'https://coopdigital-dev.firebaseapp.com';

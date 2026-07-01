// Config del Relying Party para WebAuthn. El panel de CoopDigital se sirve
// como parte del sitio estático de HG Soluciones Web (GitHub Pages), en
// hgsolucionesweb.com.ar/Coopdigital/ — el rpID es el dominio raíz (sin
// path ni subdominio), como exige la spec de WebAuthn.
export const rpName = 'CoopDigital';
export const rpID = 'hgsolucionesweb.com.ar';
export const origin = `https://${rpID}`;

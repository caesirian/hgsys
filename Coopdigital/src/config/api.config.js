// Backend propio (coopdigital-api en Render) usado por el panel para el
// login biométrico. No confundir con la API pública /v1 que consumen
// terceros: el panel le pega a /auth/webauthn/* de este mismo servicio.
export const API_BASE = 'https://coopdigital.onrender.com';

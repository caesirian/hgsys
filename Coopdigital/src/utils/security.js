export function escapeText(value){return String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').trim();}
export function normalizeEmail(value){return escapeText(value).toLowerCase();}

// Escapa caracteres especiales de HTML para que cualquier valor pueda
// insertarse de forma segura dentro de innerHTML (texto, atributos o
// contenido de textarea), sin permitir inyección de markup ni de scripts.
export function escapeHtml(value){
  return String(value??'').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));
}

// Solo permite URLs http(s), bloqueando esquemas peligrosos como
// javascript:, data: o vbscript: que podrían ejecutarse al hacer click
// en un enlace generado a partir de un campo de texto libre.
export function isSafeUrl(value){
  try {
    const url = new URL(String(value ?? ''));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

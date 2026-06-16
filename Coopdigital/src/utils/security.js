export function escapeText(value){return String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').trim();}
export function normalizeEmail(value){return escapeText(value).toLowerCase();}

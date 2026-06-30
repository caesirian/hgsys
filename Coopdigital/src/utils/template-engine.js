// Motor simple de reemplazo de variables en plantillas: {{variable}}.
// No usa eval ni regex genérico de funciones; solo sustitución literal.
export function renderTemplate(contenido, datos) {
  return String(contenido ?? '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const val = datos[key];
    return val === undefined || val === null ? '' : String(val);
  });
}

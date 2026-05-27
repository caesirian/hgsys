// ══════════════════════════════════════════════════════════════════════════════
// LÍNEA SARMIENTO — Google Apps Script
// Publicar como: Implementar → Nueva implementación → Web App
//   · Ejecutar como: Yo
//   · Quién tiene acceso: Cualquier persona
// ══════════════════════════════════════════════════════════════════════════════

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// Hojas que se exponen
const HOJAS = [
  'Once-Moreno LV',
  'Once-Moreno SAB',
  'Once-Moreno DOM',
  'Merlo-Lobos',
  'Moreno-Mercedes',
  'Bragado LD',
  'TARIFAS',
  'ESTACIONES',
];

function doGet(e) {
  const hoja = e.parameter.hoja;
  const callback = e.parameter.callback; // soporte JSONP opcional

  let payload;

  if (hoja && HOJAS.includes(hoja)) {
    payload = getHoja(hoja);
  } else {
    // Sin parámetro → devuelve todas las hojas
    payload = {};
    HOJAS.forEach(h => {
      payload[h] = getHoja(h);
    });
  }

  const json = JSON.stringify(payload);
  const output = callback
    ? ContentService.createTextOutput(`${callback}(${json})`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT)
    : ContentService.createTextOutput(json)
        .setMimeType(ContentService.MimeType.JSON);

  return output;
}

function getHoja(nombre) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const hoja = ss.getSheetByName(nombre);
  if (!hoja) return { error: `Hoja "${nombre}" no encontrada` };

  const data = hoja.getDataRange().getValues();
  // Filtrar filas completamente vacías
  const rows = data
    .map(row => row.map(cell => cell === null || cell === undefined ? '' : String(cell).trim()))
    .filter(row => row.some(cell => cell !== ''));

  return { nombre, rows };
}

// ══════════════════════════════════════════════════════════════════════════════
// LÍNEA SARMIENTO — Google Apps Script
// Publicar como: Implementar → Nueva implementación → Web App
//   · Ejecutar como: Yo
//   · Quién tiene acceso: Cualquier persona
// ══════════════════════════════════════════════════════════════════════════════

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// ── OneSignal ─────────────────────────────────────────────────────────────────
// Poné tu REST API Key acá (solo vive en el servidor, nunca en el browser)
const ONESIGNAL_APP_ID       = '114f6665-eede-42d0-90ad-4d6480f10c76';
const ONESIGNAL_REST_API_KEY = 'REEMPLAZÁ_ESTO_CON_TU_REST_API_KEY';
const ONESIGNAL_API          = 'https://onesignal.com/api/v1';

// Hojas que se exponen vía doGet
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

// ── GET: leer hojas de cálculo ────────────────────────────────────────────────
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

// ── POST: proxy para OneSignal (evita CORS del browser) ──────────────────────
function doPost(e) {
  const headers = { 'Access-Control-Allow-Origin': '*' };

  try {
    const body   = JSON.parse(e.postData.contents);
    const accion = body.accion;

    // ── Enviar notificación ──────────────────────────────────
    if (accion === 'enviar') {
      const { titulo, mensaje, url } = body;
      if (!titulo || !mensaje) {
        return jsonResponse({ ok: false, error: 'Faltan título o mensaje.' });
      }

      const res = UrlFetchApp.fetch(`${ONESIGNAL_API}/notifications`, {
        method:  'post',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
        },
        payload: JSON.stringify({
          app_id:            ONESIGNAL_APP_ID,
          included_segments: ['All'],
          headings:          { es: titulo,  en: titulo  },
          contents:          { es: mensaje, en: mensaje },
          url:               url || 'https://trensarmientoenlinea.com.ar',
          chrome_web_icon:   'https://trensarmientoenlinea.com.ar/logo.png',
          firefox_icon:      'https://trensarmientoenlinea.com.ar/logo.png',
        }),
        muteHttpExceptions: true
      });

      const data = JSON.parse(res.getContentText());
      if (res.getResponseCode() === 200 && data.id) {
        return jsonResponse({ ok: true, id: data.id, recipients: data.recipients });
      } else {
        return jsonResponse({ ok: false, error: data.errors || data });
      }
    }

    // ── Historial de notificaciones ──────────────────────────
    if (accion === 'historial') {
      const limit  = body.limit  || 20;
      const offset = body.offset || 0;

      const res = UrlFetchApp.fetch(
        `${ONESIGNAL_API}/notifications?app_id=${ONESIGNAL_APP_ID}&limit=${limit}&offset=${offset}&kind=1`,
        {
          method:  'get',
          headers: { 'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}` },
          muteHttpExceptions: true
        }
      );

      const data = JSON.parse(res.getContentText());
      if (res.getResponseCode() === 200) {
        return jsonResponse({ ok: true, notifications: data.notifications || [], total: data.total_count });
      } else {
        return jsonResponse({ ok: false, error: data.errors || data });
      }
    }

    return jsonResponse({ ok: false, error: `Acción desconocida: ${accion}` });

  } catch(err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
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

/**
 * export-inaes.js
 * Exporta la nómina de asociados en el formato Excel que requiere INAES
 * para el módulo "Nómina de Asociados" del sistema TAD (Trámites a Distancia).
 *
 * Formato basado en el Instructivo IF-2025-35836690-APN-CSDI#INAES:
 *   Col 1 — CUIT Entidad  (sin guiones)
 *   Col 2 — CUIT/CUIL asociado (sin guiones)
 *   Col 3 — Apellido
 *   Col 4 — Nombre
 *   Col 5 — Fecha de ingreso (DD-MM-AAAA)
 *   Col 6 — Fecha de egreso  (DD-MM-AAAA o vacío)
 *   Col 7 — Causa de egreso  (texto libre o vacío)
 *   Col 8 — Medida disciplinaria (SI/NO)
 *
 * La función genera un archivo .xlsx descargable directamente desde el
 * navegador usando la API nativa (no requiere librerías externas).
 * Sí usa SheetJS CDN si está disponible; de lo contrario cae a CSV.
 *
 * Uso:
 *   import { exportarNominaInaes } from './export-inaes.js';
 *   await exportarNominaInaes(asociados, cooperativa);
 */

// Normaliza fecha Firestore Timestamp o ISO string a "DD-MM-AAAA"
function fmtFecha(valor) {
  if (!valor) return '';
  let d;
  // Firestore Timestamp tiene .toDate()
  if (valor && typeof valor.toDate === 'function') {
    d = valor.toDate();
  } else if (valor?.seconds) {
    d = new Date(valor.seconds * 1000);
  } else {
    d = new Date(valor);
  }
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const aaaa = d.getFullYear();
  return `${dd}-${mm}-${aaaa}`;
}

// Limpia el CUIT sacando guiones y espacios
function limpiarCuit(cuit) {
  return String(cuit ?? '').replace(/[-\s]/g, '');
}

// Determina si el egreso fue disciplinario (suspendido -> SI, baja voluntaria -> NO)
function esDisciplinario(asociado) {
  // Si el estado es suspendido o la observación menciona suspensión/medida,
  // se marca como SI. En los demás casos (renuncia, fallecimiento) -> NO.
  if (asociado.estado === 'suspendido') return 'SI';
  const obs = String(asociado.observaciones ?? '').toLowerCase();
  if (obs.includes('disciplin') || obs.includes('sanc') || obs.includes('suspend')) return 'SI';
  return 'NO';
}

// Causa de egreso legible para INAES
function causaEgreso(asociado) {
  if (!asociado.fechaEgreso) return '';
  switch (asociado.estado) {
    case 'dadoDeBaja':  return asociado.observaciones || 'Baja voluntaria';
    case 'fallecido':   return 'Fallecimiento';
    case 'suspendido':  return asociado.observaciones || 'Suspensión';
    default:            return asociado.observaciones || '';
  }
}

/**
 * Construye las filas de datos para la nómina INAES.
 * @param {Array}  asociados   - Lista de asociados del servicio
 * @param {Object} cooperativa - Documento raíz de la cooperativa (necesita .cuit)
 * @returns {Array<Array>} Filas listas para exportar (sin encabezado)
 */
function buildFilas(asociados, cooperativa) {
  const cuitEntidad = limpiarCuit(cooperativa?.cuit ?? '');

  // INAES pide TODOS los asociados (activos, bajas, fallecidos), no solo los activos.
  // Se ordenan por número de asociado.
  const ordenados = [...asociados].sort((a, b) => {
    const na = parseInt(a.numeroAsociado) || 0;
    const nb = parseInt(b.numeroAsociado) || 0;
    return na - nb;
  });

  return ordenados.map(a => [
    cuitEntidad,                          // Col 1: CUIT Entidad
    limpiarCuit(a.cuit),                  // Col 2: CUIT/CUIL asociado
    (a.apellido ?? '').toUpperCase(),     // Col 3: Apellido
    (a.nombre ?? '').toUpperCase(),       // Col 4: Nombre
    fmtFecha(a.fechaIngreso),             // Col 5: Fecha ingreso
    fmtFecha(a.fechaEgreso),              // Col 6: Fecha egreso
    causaEgreso(a),                       // Col 7: Causa egreso
    a.fechaEgreso ? esDisciplinario(a) : 'NO', // Col 8: Medida disciplinaria
  ]);
}

// Encabezado oficial según instructivo INAES
const ENCABEZADO = [
  'CUIT Entidad',
  'CUIT / CUIL',
  'Apellido',
  'Nombre',
  'Fecha Ingreso',
  'Fecha Egreso',
  'Causa egreso',
  'Medida disciplinaria',
];

/**
 * Genera y descarga el archivo de nómina INAES.
 * Intenta xlsx (SheetJS) si está disponible; si no, descarga CSV.
 */
export async function exportarNominaInaes(asociados, cooperativa) {
  if (!asociados?.length) {
    throw new Error('No hay asociados para exportar.');
  }

  const filas = buildFilas(asociados, cooperativa);
  const nombre = `nomina-inaes-${new Date().toISOString().slice(0, 10)}`;

  // Intentar con SheetJS (cargado dinámicamente si no está disponible)
  const XLSX = await cargarSheetJS();

  if (XLSX) {
    const datos = [ENCABEZADO, ...filas];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(datos);

    // Ancho de columnas orientativo
    ws['!cols'] = [
      { wch: 13 }, // CUIT Entidad
      { wch: 13 }, // CUIT asociado
      { wch: 22 }, // Apellido
      { wch: 20 }, // Nombre
      { wch: 14 }, // Fecha ingreso
      { wch: 14 }, // Fecha egreso
      { wch: 35 }, // Causa egreso
      { wch: 20 }, // Medida disciplinaria
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Nómina INAES');
    XLSX.writeFile(wb, `${nombre}.xlsx`);
    return { formato: 'xlsx', cantidad: filas.length };
  }

  // Fallback: CSV UTF-8 con BOM (Excel lo abre correctamente)
  const csv = [ENCABEZADO, ...filas]
    .map(fila => fila.map(celda => `"${String(celda ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombre}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  return { formato: 'csv', cantidad: filas.length };
}

// Carga SheetJS desde CDN de forma lazy (solo cuando se necesita)
async function cargarSheetJS() {
  if (typeof window.XLSX !== 'undefined') return window.XLSX;
  try {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return window.XLSX;
  } catch {
    return null; // Caerá al fallback CSV
  }
}

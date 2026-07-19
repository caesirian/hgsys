import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getFirestore, collection, doc, addDoc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyB1T67NPR_qNcAyFp8_DT_QWCst7OBIxTc",
  authDomain:        "cultivapp-c9672.firebaseapp.com",
  projectId:         "cultivapp-c9672",
  storageBucket:     "cultivapp-c9672.firebasestorage.app",
  messagingSenderId: "964166014307",
  appId:             "1:964166014307:web:84ef7664c025f3d1c86f56"
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// Fotos de mediciones: se suben a Cloudinary (unsigned upload preset), no a
// Firebase Storage — el proyecto está en el plan gratis Spark y Storage
// requiere plan Blaze. El preset "cultivapp_images" no es secreto, está
// pensado para vivir en el cliente.
const CLOUDINARY_CLOUD  = "dc4jzoeku";
const CLOUDINARY_PRESET = "cultivapp_images";
async function subirFotoCloudinary(archivo) {
  const fd = new FormData();
  fd.append("file", archivo);
  fd.append("upload_preset", CLOUDINARY_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method:"POST", body:fd });
  if (!res.ok) throw new Error("Cloudinary respondió "+res.status);
  const data = await res.json();
  return data.secure_url;
}

// ════════════════════════════════════════════════════════════════════════════
// ESTRUCTURA FIRESTORE
// lugares/{lugarId}                  → espacio físico (Carpa, Estructura 3x1)
// lugares/{lugarId}/areas/{areaId}   → subdivisión (Sub1, Sub2 o única)
// plantas/{plantaId}                 → planta individual (ref a lugar+area)
// plantas/{plantaId}/mediciones/
// plantas/{plantaId}/eventos/
// plantas/{plantaId}/nutricion/
// plantas/{plantaId}/inase/
// ════════════════════════════════════════════════════════════════════════════

// ─── CONSTANTES ─────────────────────────────────────────────────────────────
const LUCES_LISTA = [
  "Insativa 200w",
  "Santa Planta 250w",
  "Galponera 100w Fría",
  "Mars Orbiter"
];

// Fallback local por si el proxy no responde al arrancar (ej. Render recién despertando).
// La fuente de verdad real es GET /tuya/devices del proxy — ver cargarCatalogoDispositivos().
let DISPOSITIVOS_TUYA = {
  sensor_carpa:   { id: "ebefb9fc12b7940a71l8gp", tipo: "sensor",  nombre: "Sensor Carpa",   lugar: "Carpa" },
  luces_carpa:    { id: "ebb60fa54c54559c63ysur",  tipo: "switch",  nombre: "Luces Carpa",    lugar: "Carpa" },
  turbinas_carpa: { id: "3522204898f4abba2357",    tipo: "switch",  nombre: "Turbinas Carpa", lugar: "Carpa" },
  sensor_3x1:     { id: "eb8fc54c62a0049352pgax",  tipo: "sensor",  nombre: "Sensor 3x1",     lugar: "Estructura 3x1" },
  luces_3x1:      { id: "80210308a4cf12ac315b",    tipo: "switch",  nombre: "Luces 3x1",      lugar: "Estructura 3x1" },
};

const PROXY_URL = "https://cultivapp-tuya-proxy.onrender.com/tuya";

// Trae el catálogo real de dispositivos desde el proxy (fuente única de verdad).
// Si falla, se sigue usando el fallback hardcodeado de arriba sin romper nada.
async function cargarCatalogoDispositivos() {
  try {
    const proxyBase = (localStorage.getItem("tuya_proxy") || PROXY_URL).replace(/\/tuya$/, "");
    const resp = await fetch(`${proxyBase}/tuya/devices`, { signal: AbortSignal.timeout(12000) });
    if (!resp.ok) throw new Error("HTTP "+resp.status);
    const data = await resp.json();
    if (data.ok && data.devices && Object.keys(data.devices).length) {
      DISPOSITIVOS_TUYA = data.devices;
    }
  } catch (err) {
    console.warn("No se pudo cargar el catálogo de dispositivos del proxy, uso el de respaldo:", err.message);
  }
}

// ─── ESTADO GLOBAL ───────────────────────────────────────────────────────────
let lugarActivo  = null;
let areaActiva   = null;
let plantaActiva = null;
let panelPlantaActiva = null; // qué planta tiene abierto el panel lateral (Dashboard)
let plantaEditando = null; // id de la planta que se está editando, o null si es "Nueva planta"
let tuyaTimer    = null;

// ─── HELPERS ────────────────────────────────────────────────────────────────
// Getter/setter de conveniencia: val("id") lee, val("id", valor) escribe.
const val  = (id, set) => {
  const el = document.getElementById(id);
  if (!el) return "";
  if (set !== undefined) { el.value = set; return set; }
  return el.value?.trim() || "";
};
const fmt  = ts => { if (!ts) return "—"; const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString("es-AR"); };
const dias = ts => { if (!ts) return "—"; const d = ts.toDate ? ts.toDate() : new Date(ts); return Math.floor((Date.now()-d.getTime())/86400000); };
// Escapa un string para insertarlo de forma segura como VALOR de atributo HTML
// (comillas, & y <> rompían botones onclick cuando un nombre de planta/lugar
// traía un apóstrofe u otro caracter especial — causa más probable del bug
// "Ver detalle no funciona").
const escAttr = s => String(s??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

function show(id, opts) {
  document.querySelectorAll(".vista").forEach(v => v.classList.remove("activa"));
  document.getElementById(id)?.classList.add("activa");
  document.querySelectorAll(".nav-btn").forEach(b => { b.classList.remove("activo"); b.removeAttribute("aria-current"); });
  document.querySelectorAll(`[data-vista="${id}"]`).forEach(b => { b.classList.add("activo"); b.setAttribute("aria-current","page"); });
  // Frenar los auto-refrescos de las vistas que no están activas, para no pegarle
  // al proxy de fondo mientras el usuario está mirando otra pestaña.
  if (id !== "vista-lugares" && typeof climaTimer !== "undefined" && climaTimer) { clearInterval(climaTimer); climaTimer = null; }
  if (id !== "vista-dashboard" && typeof dashboardTimer !== "undefined" && dashboardTimer) { clearInterval(dashboardTimer); dashboardTimer = null; }
  // Empuja al historial del navegador para que el botón atrás (celular o
  // navegador) navegue adentro de la app en vez de salir directo de la página.
  if (!(opts && opts.sinHistorial)) history.pushState({ vista:id }, "", "#"+id);
}
window.addEventListener("popstate", (e) => {
  const id = (e.state && e.state.vista) || "vista-dashboard";
  show(id, { sinHistorial:true });
  if (id === "vista-dashboard") cargarDashboard();
  else if (id === "vista-lugares") cargarLugares();
  else if (id === "vista-plantas") cargarTablaPlantas();
});
function toast(msg, tipo="ok") {
  const t = document.createElement("div");
  t.className = `toast toast-${tipo}`; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 3200);
}
function abrirModal(id)  { document.getElementById(id).classList.add("open"); }
function cerrarModal(id) { document.getElementById(id).classList.remove("open"); }

// ════════════════════════════════════════════════════════════════════════════
// LUGARES
// ════════════════════════════════════════════════════════════════════════════
const TEMP_OPTIMA_MIN = 16, TEMP_OPTIMA_MAX = 28;
let lugaresClimaActivos = {}; // { lugarId: { sensorKey, luzKey, etapa } }
let climaTimer = null;
let chartsPorLugar = {};      // { lugarId: { temp: Chart, hum: Chart } }
let chartsDiaPorLugar = {};   // { lugarId: { temp: Chart, hum: Chart } } (gráfico del día seleccionado)
let chartsHLPorLugar = {};    // { lugarId: { temp: Chart, hum: Chart } } (histórico largo, rollup propio)
let chartsTimelinePorLugar = {}; // { lugarId: Chart } (EC/PPFD + marcas de riego/fertilización)

// Fecha en formato YYYY-MM-DD según el huso de Argentina (UTC-3), sin depender del huso del navegador
function fechaArgentinaISO(timestampMs) {
  const ajustado = new Date(timestampMs - 3 * 60 * 60 * 1000); // corre el reloj a UTC-3
  return ajustado.toISOString().slice(0, 10);
}

// Tabla de VPD óptimo por etapa de cultivo (cannabis), en base a consenso de guías
// de cultivo indoor 2026 (Blimburn, PlanaCan, Humboldt Seed Co, Smartfog, Emerald Harvest).
const ETAPAS_VPD = {
  plantula:           { nombre: "Plántula / Clon",              vpdMin: 0.4, vpdMax: 0.8, humedad: [70, 85] },
  vegetativo:         { nombre: "Vegetativo",                   vpdMin: 0.8, vpdMax: 1.2, humedad: [55, 70] },
  floracion_temprana: { nombre: "Floración temprana",           vpdMin: 1.0, vpdMax: 1.2, humedad: [50, 60] },
  floracion_tardia:   { nombre: "Floración tardía / Maduración",vpdMin: 1.2, vpdMax: 1.6, humedad: [40, 55] },
};
// Horas de luz esperadas según etapa. 12/12 en floración es crítico: un solo
// desvío puede inducir hermafroditismo y arruinar el ciclo.
const FOTOPERIODO_ESPERADO = {
  plantula: 18, vegetativo: 18, floracion_temprana: 12, floracion_tardia: 12,
};
// Mapeo desde el campo "fase" de las plantas a una etapa de VPD por defecto
const FASE_A_ETAPA = { germinacion: "plantula", vegetativa: "vegetativo", floracion: "floracion_temprana", cosecha: "vegetativo" };

// Variación mínima esperable en 24h antes de sospechar que el sensor quedó
// "trabado" (mismo valor repetido) o se desconectó del ambiente real: un
// espacio de cultivo real casi siempre tiene algo de deriva térmica/higrométrica
// a lo largo del día (luces, ciclo día/noche, riego, apertura de puerta, etc).
const UMBRAL_TRABADO_TEMP = 0.3; // °C de variación mínima en 24h
const UMBRAL_TRABADO_HUM  = 1.5; // % HR de variación mínima en 24h

// Junta las señales de anomalía disponibles para un lugar: sensor trabado
// (poca variación en 24h) y valores actuales fuera del rango objetivo de la
// etapa seleccionada. cfg viene de lugaresClimaActivos[lugarId].
function detectarAnomaliasLugar(cfg) {
  const anomalias = [];
  if (!cfg) return anomalias;
  const { actual, hist24, etapa } = cfg;

  if (hist24?.t && (hist24.t.max - hist24.t.min) < UMBRAL_TRABADO_TEMP) {
    anomalias.push(`🌡️ Temperatura casi sin variación en 24h (${hist24.t.min.toFixed(1)}–${hist24.t.max.toFixed(1)}°C) — revisá si el sensor sigue midiendo el ambiente real.`);
  }
  if (hist24?.h && (hist24.h.max - hist24.h.min) < UMBRAL_TRABADO_HUM) {
    anomalias.push(`💧 Humedad casi sin variación en 24h (${hist24.h.min.toFixed(0)}–${hist24.h.max.toFixed(0)}%) — revisá si el sensor sigue midiendo el ambiente real.`);
  }
  if (actual?.temp != null && (actual.temp < TEMP_OPTIMA_MIN || actual.temp > TEMP_OPTIMA_MAX)) {
    anomalias.push(`🌡️ Temperatura actual (${actual.temp.toFixed(1)}°C) fuera del rango general ${TEMP_OPTIMA_MIN}–${TEMP_OPTIMA_MAX}°C.`);
  }
  const e = ETAPAS_VPD[etapa];
  if (e && actual?.hum != null) {
    const [hMin, hMax] = e.humedad;
    if (actual.hum < hMin || actual.hum > hMax) {
      anomalias.push(`💧 Humedad actual (${actual.hum.toFixed(0)}%) fuera del rango objetivo ${hMin}–${hMax}% para ${e.nombre.toLowerCase()}.`);
    }
  }
  return anomalias;
}

// Recalcula y pinta el bloque de anomalías de un lugar con lo último que se
// sepa de él (se llama tanto desde el refresco liviano de 1 min como desde
// la carga de histórico 24h, cada uno aporta una pieza distinta del cuadro).
function renderAnomaliasLugar(lugarId) {
  const el = document.getElementById("anomalias-" + lugarId);
  if (!el) return;
  const anomalias = detectarAnomaliasLugar(lugaresClimaActivos[lugarId]);
  if (!anomalias.length) { el.innerHTML = ""; el.style.display = "none"; return; }
  el.style.display = "";
  el.innerHTML = `<div class="anomalias-titulo">⚠️ Posibles anomalías</div>` +
    anomalias.map(a => `<div class="anomalia-item">${a}</div>`).join("");
}

function calcularVPD(tempC, rh) {
  if (tempC == null || rh == null) return null;
  const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3)); // presión de vapor de saturación (kPa)
  return +(svp * (1 - rh / 100)).toFixed(2);
}

// Sugerencia priorizando SIEMPRE bajar humedad antes que subirla (riesgo de hongos).
//
// Criterio de temperatura (2026-07): la variable de optimización prioritaria es la
// temperatura, y el objetivo agronómico por defecto es un ambiente cálido (salvo que
// la caracterización de la genética indique lo contrario, hoy no modelado). Por eso
// esta función NUNCA sugiere bajar la temperatura si ya está cerca del piso del rango
// general (TEMP_OPTIMA_MIN), ni subirla si ya está cerca del techo (TEMP_OPTIMA_MAX):
// en esos casos, el ajuste correcto para corregir el VPD pasa por la humedad.
const TEMP_MARGEN_SUGERENCIA = 2; // °C de margen antes del piso/techo para dejar de sugerir mover la temp

function sugerenciaVPD(vpd, etapaKey, rhActual, tempActual) {
  const e = ETAPAS_VPD[etapaKey];
  if (vpd == null || !e) return null;
  const [hMin, hMax] = e.humedad;
  const humedadBaja = rhActual != null && rhActual < hMin;
  const humedadAlta  = rhActual != null && rhActual > hMax;
  const tempYaBaja = tempActual != null && tempActual <= TEMP_OPTIMA_MIN + TEMP_MARGEN_SUGERENCIA;
  const tempYaAlta = tempActual != null && tempActual >= TEMP_OPTIMA_MAX - TEMP_MARGEN_SUGERENCIA;

  if (vpd < e.vpdMin) {
    // VPD bajo: aire "encharcado" respecto a la temperatura. Si la humedad YA está
    // por encima del objetivo, ahí está la causa -> bajarla es lo correcto (menos hongos).
    // Si la humedad está normal o baja, el problema es más bien la temperatura -> subirla,
    // salvo que ya esté cerca del techo cálido: ahí se pivotea a bajar humedad.
    if (humedadAlta) {
      return { estado: "bajo", texto: `VPD bajo (${vpd} kPa, objetivo ${e.vpdMin}–${e.vpdMax}). La humedad (${rhActual}%) está por encima del rango ${hMin}–${hMax}%: bajala para no favorecer hongos.` };
    }
    if (tempYaAlta) {
      return { estado: "bajo", texto: `VPD bajo (${vpd} kPa, objetivo ${e.vpdMin}–${e.vpdMax}). La temperatura (${tempActual}°C) ya está cerca del techo recomendado, no la subas más: si podés, bajá un poco la humedad (ventilación/extracción) para corregir el VPD.` };
    }
    return { estado: "bajo", texto: `VPD bajo (${vpd} kPa, objetivo ${e.vpdMin}–${e.vpdMax}). Subí un poco la temperatura (el objetivo por defecto es un ambiente cálido).` };
  }

  if (vpd > e.vpdMax) {
    // VPD alto: aire "sediento". Si la humedad YA está por debajo del objetivo,
    // ahí está la causa real -> subirla (no alcanza con bajar temperatura).
    // Si la humedad está en rango o alta, mejor bajar temperatura para no mojar de
    // más — salvo que la temperatura ya esté cerca del piso: ahí NO se sugiere
    // bajarla, se pivotea 100% a subir humedad.
    if (humedadBaja) {
      if (tempYaBaja) {
        return { estado: "alto", texto: `VPD alto (${vpd} kPa, objetivo ${e.vpdMin}–${e.vpdMax}). La temperatura (${tempActual}°C) ya está en el piso recomendado, no la bajes más: subí la humedad (${rhActual}% → objetivo ${hMin}–${hMax}%) para corregir el VPD.` };
      }
      return { estado: "alto", texto: `VPD alto (${vpd} kPa, objetivo ${e.vpdMin}–${e.vpdMax}). La humedad (${rhActual}%) está por debajo del rango ${hMin}–${hMax}% para esta etapa: subila (y/o bajá la temperatura).` };
    }
    if (tempYaBaja) {
      return { estado: "alto", texto: `VPD alto (${vpd} kPa, objetivo ${e.vpdMin}–${e.vpdMax}). La temperatura (${tempActual}°C) ya está en el piso recomendado: en vez de bajarla más, subí la humedad para corregir el VPD.` };
    }
    return { estado: "alto", texto: `VPD alto (${vpd} kPa, objetivo ${e.vpdMin}–${e.vpdMax}). Bajá la temperatura; evitá subir más la humedad (ya está en ${hMin}–${hMax}% o por encima) para no favorecer hongos.` };
  }

  return { estado: "ok", texto: `VPD en rango óptimo (${vpd} kPa) para ${e.nombre.toLowerCase()}.` };
}

// Detecta la etapa más frecuente entre las plantas activas de un lugar
async function detectarEtapaLugar(lugarId) {
  try {
    const snap = await getDocs(query(collection(db, "plantas"), where("lugarId", "==", lugarId)));
    const conteo = {};
    snap.forEach(p => {
      const etapa = FASE_A_ETAPA[p.data().fase] || "vegetativo";
      conteo[etapa] = (conteo[etapa] || 0) + 1;
    });
    const entries = Object.entries(conteo).sort((a,b)=>b[1]-a[1]);
    return entries[0]?.[0] || "vegetativo";
  } catch { return "vegetativo"; }
}

// Prioridad de orden en "Lugares": encendida primero, luego apagada, sin luz asociada
// en medio, y fuera de línea siempre al final (sin importar lo demás).
// Último estado conocido de cada lugar (se actualiza en cada refresco de 1 min),
// usado para reordenar sin tener que re-consultar todo de nuevo.
let estadoLuzActivos = {}; // { lugarId: {online, encendido} }

const FASE_LABEL = { germinacion: "Germinación", vegetativa: "Vegetativo", floracion: "Floración", cosecha: "Cosecha" };

function fechaComoDate(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  const f = new Date(v);
  return isNaN(f.getTime()) ? null : f;
}

function diasDesde(fecha) {
  const f = fechaComoDate(fecha);
  if (!f) return null;
  return Math.max(0, Math.floor((Date.now() - f.getTime()) / 86400000));
}

// Última semana de nutrición cargada para una planta (fecha de creación del registro)
async function obtenerUltimaFertilizacion(plantaId) {
  let fechas = [];
  try {
    const snap = await getDocs(query(collection(db,"plantas",plantaId,"nutricion"), orderBy("creadoEn","desc"), limit(1)));
    if (!snap.empty) fechas.push(fechaComoDate(snap.docs[0].data().creadoEn));
  } catch {}
  try {
    // Fertilizaciones cargadas desde "💧 Registrar riego/fertilización" a nivel
    // de Lugar quedan como eventos con tipo:"fertilizacion", no en "nutricion".
    const snap2 = await getDocs(query(collection(db,"plantas",plantaId,"eventos"), where("tipo","==","fertilizacion")));
    snap2.forEach(d => { const f = d.data().fecha; if (f) fechas.push(f.toDate ? f.toDate() : new Date(f)); });
  } catch {}
  fechas = fechas.filter(Boolean);
  if (!fechas.length) return null;
  return new Date(Math.max(...fechas.map(f=>f.getTime())));
}

// Mismo criterio que última fertilización, pero para eventos tipo "riego".
// OJO: usa la FECHA del evento (que puede haberse cargado con fecha pasada,
// ej. "regué ayer"), no la fecha en que se guardó el registro — así el
// resumen refleja cuándo pasó de verdad, no cuándo lo cargaste en la app.
async function obtenerUltimoRiego(plantaId) {
  try {
    const snap = await getDocs(query(collection(db,"plantas",plantaId,"eventos"), where("tipo","==","riego")));
    let fechas = [];
    snap.forEach(d => { const f = d.data().fecha; if (f) fechas.push(f.toDate ? f.toDate() : new Date(f)); });
    if (!fechas.length) return null;
    return new Date(Math.max(...fechas.map(f=>f.getTime())));
  } catch { return null; }
}

// Trae todas las plantas de un lugar con su día de ciclo y última fertilización,
// para mostrar en Lugares y Dashboard (genética, etapa real, cuidado reciente).
async function obtenerPlantasResumenLugar(lugarId) {
  try {
    const snap = await getDocs(query(collection(db,"plantas"), where("lugarId","==",lugarId)));
    return await Promise.all(snap.docs.map(async (pd) => {
      const p = pd.data();
      const ultimaFert = await obtenerUltimaFertilizacion(pd.id);
      const ultimoRiego = await obtenerUltimoRiego(pd.id);
      return {
        id: pd.id, nombre: p.nombre, genetica: p.genetica, tipoOrigen: p.tipoOrigen,
        fase: p.fase, dia: diasDesde(p.fechaInicio),
        diasFert: ultimaFert ? diasDesde(ultimaFert) : null,
        diasRiego: ultimoRiego ? diasDesde(ultimoRiego) : null,
      };
    }));
  } catch (err) {
    console.warn("No se pudo traer plantas del lugar:", err.message);
    return [];
  }
}

function htmlResumenPlantas(plantas) {
  if (!plantas.length) return `<div class="plantas-vacio">Sin plantas registradas en este lugar</div>`;

  const conteo = {};
  plantas.forEach(p => {
    const g = p.genetica || "Sin genética";
    conteo[g] = (conteo[g] || 0) + 1;
  });
  const resumenConteo = Object.entries(conteo)
    .sort((a,b) => b[1]-a[1])
    .map(([g,n]) => `<span class="planta-conteo-item">${n}× ${g}</span>`).join("");
  const encabezado = `<div class="planta-conteo">🌿 ${plantas.length} planta${plantas.length>1?"s":""} · ${resumenConteo}</div>`;

  return encabezado + plantas.map(p => `
    <div class="planta-mini">
      <div class="planta-mini-header">
        <span class="planta-mini-nombre">${p.nombre}</span>
        <span class="planta-mini-genetica">${p.genetica||"—"}</span>
      </div>
      <div class="planta-mini-meta">
        <span>📅 Día ${p.dia ?? "—"} · ${FASE_LABEL[p.fase]||p.fase||"—"}</span>
        ${p.tipoOrigen ? `<span>🌱 ${p.tipoOrigen}</span>` : ""}
      </div>
      <div class="planta-mini-fert">💧 Últ. riego: ${p.diasRiego==null ? "sin registro" : (p.diasRiego===0 ? "hoy" : `hace ${p.diasRiego} día${p.diasRiego>1?"s":""}`)} · 🌿 Últ. fert: ${p.diasFert==null ? "sin registro" : (p.diasFert===0 ? "hoy" : `hace ${p.diasFert} día${p.diasFert>1?"s":""}`)}</div>
    </div>`).join("");
}

// Ícono variable según la fase de la planta, para que el Dashboard muestre
// de un vistazo en qué etapa está cada una (no solo cuántas hay).
function iconoFase(fase) {
  const c = {
    germinacion: { hoja:"#9fd89f", tallo:"#6fae72", escala:.55, extra:"" },
    vegetativa:  { hoja:"#3e9142", tallo:"#2e6b32", escala:.95, extra:"" },
    floracion:   { hoja:"#2e6b32", tallo:"#245227", escala:1,
                   extra:'<circle cx="12" cy="1.5" r="1.7" fill="#e8a33d"/>' },
    cosecha:     { hoja:"#8a9a5b", tallo:"#6b6142", escala:.85, extra:"" },
  }[fase] || { hoja:"#3e9142", tallo:"#2e6b32", escala:.95, extra:"" };
  // Hoja de cannabis: un folíolo central + 2 pares laterales, más ancha y
  // puntiaguda (silueta reconocible), sobre maceta fija. Todo en SVG, sin
  // depender de ninguna fuente/emoji del sistema.
  const hoja = (largo, ancho) =>
    `M0,0 C-${ancho},-${(largo*0.32).toFixed(1)} -${(ancho*0.9).toFixed(1)},-${(largo*0.78).toFixed(1)} 0,-${largo} `+
    `C${(ancho*0.9).toFixed(1)},-${(largo*0.78).toFixed(1)} ${ancho},-${(largo*0.32).toFixed(1)} 0,0 Z`;
  return `<svg viewBox="0 0 24 30" width="48" height="60" class="dp-icono-svg">
    <path d="M6,22 L18,22 L16,29 L8,29 Z" fill="#8d5a2b"/>
    <rect x="5.3" y="20.3" width="13.4" height="2.2" rx="1.1" fill="#a06b35"/>
    <g transform="translate(12,20.3) scale(${c.escala})">
      <line x1="0" y1="0" x2="0" y2="-6" stroke="${c.tallo}" stroke-width="1.3"/>
      <g transform="translate(0,-6)">
        <path d="${hoja(13,3.4)}" fill="${c.hoja}"/>
        <path d="${hoja(11,3)}" transform="rotate(-32)" fill="${c.hoja}"/>
        <path d="${hoja(11,3)}" transform="rotate(32)" fill="${c.hoja}"/>
        <path d="${hoja(8,2.4)}" transform="rotate(-62)" fill="${c.hoja}"/>
        <path d="${hoja(8,2.4)}" transform="rotate(62)" fill="${c.hoja}"/>
      </g>
    </g>
    ${c.extra}
  </svg>`;
}

// Zona del piso (en % del alto del contenedor) donde van las plantas, según
// el tipo de estructura — cada una tiene proporciones reales distintas.
const ZONA_PISO = {
  carpa:          { top: 73, bottom: 4 },
  estructura3x1:  { top: 75, bottom: 10 },
};

async function cargarPlantasResumenCard(lugarId, contenedorId, iconosId) {
  const el = document.getElementById(contenedorId);
  if (!el) return;
  const plantas = await obtenerPlantasResumenLugar(lugarId);
  el.innerHTML = htmlResumenPlantas(plantas);
  const elIconos = iconosId ? document.getElementById(iconosId) : null;
  if (elIconos) {
    elIconos.innerHTML = "";
    const tipo = elIconos.dataset.tipo;
    const zona = ZONA_PISO[tipo] || ZONA_PISO.carpa;
    elIconos.style.top = zona.top + "%";
    elIconos.style.bottom = zona.bottom + "%";

    // Distribución tipo grilla (no en una sola fila): filas de "atrás" más
    // chicas/juntas al centro, filas de "adelante" más grandes/separadas.
    // En la Carpa, además, los esquejes van sobre la mesa (zona angosta y
    // más arriba dentro del piso) en vez de mezclados con el resto.
    function distribuir(lista, topMin, topMax, escalaBase, anchoBase, zBase) {
      const n = lista.length;
      if (!n) return;
      const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
      const rows = Math.max(1, Math.ceil(n / cols));
      lista.forEach((p, i) => {
        const fila = Math.floor(i / cols);
        const col  = i % cols;
        const colsEnFila = Math.min(cols, n - fila*cols);
        const profundidad = rows <= 1 ? 1 : fila / (rows - 1); // 0=atrás, 1=adelante
        const topPct    = topMin + profundidad * (topMax - topMin);
        const escala    = escalaBase + profundidad * 0.3;
        const anchoFila = anchoBase * (0.6 + profundidad * 0.4);
        const colT      = colsEnFila <= 1 ? 0.5 : col / (colsEnFila - 1);
        const leftPct   = 50 + (colT - 0.5) * anchoFila;

        const wrap = document.createElement("div");
        wrap.className = "dash-planta-wrap";
        wrap.style.left = leftPct + "%";
        wrap.style.top = topPct + "%";
        wrap.style.zIndex = zBase + fila;
        wrap.style.transform = `translate(-50%,-50%) scale(${escala.toFixed(2)})`;
        wrap.title = `${p.nombre} · ${FASE_LABEL[p.fase]||p.fase||'—'} · click para abrir`;
        wrap.innerHTML = `<span class="dash-planta-icono">${iconoFase(p.fase)}</span><span class="dash-planta-nombre">${p.genetica||p.nombre||""}</span>`;
        wrap.addEventListener("click", (e) => { e.stopPropagation(); window.abrirPanelPlanta(p.id); });
        elIconos.appendChild(wrap);
      });
    }

    if (tipo === "carpa") {
      const enMesa = plantas.filter(p => p.tipoOrigen === "esqueje");
      const enPiso = plantas.filter(p => p.tipoOrigen !== "esqueje");
      distribuir(enMesa, 16, 28, 0.46, 32, 20); // sobre la mesa: más arriba, más chicas, más al centro
      distribuir(enPiso, 46, 84, 0.58, 56, 10);  // resto: en el piso, con margen a los bordes
    } else {
      distribuir(plantas, 12, 82, 0.62, 62, 10);
    }
  }
}

function prioridadLuz(estado) {
  if (!estado) return 1;
  if (!estado.online) return 3;
  return estado.encendido ? 0 : 2;
}

// Trae el estado de TODOS los dispositivos de una sola vez (para poder ordenar
// las cards antes de dibujarlas, sin esperar N llamadas individuales).
async function obtenerEstadoTodos() {
  try {
    const proxyBase = (localStorage.getItem("tuya_proxy") || PROXY_URL).replace(/\/tuya$/, "");
    const resp = await fetch(`${proxyBase}/tuya/all`, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) throw new Error("HTTP "+resp.status);
    const data = await resp.json();
    const estados = {};
    Object.entries(data.dispositivos || {}).forEach(([alias, info]) => {
      estados[alias] = { online: !!info.online, encendido: !!(info.sensores && info.sensores.encendido) };
    });
    return estados;
  } catch (err) {
    console.warn("No se pudo traer /tuya/all para ordenar por prioridad:", err.message);
    return {};
  }
}

async function cargarLugares() {
  const lista = document.getElementById("lista-lugares");
  lista.innerHTML = '<p class="cargando">Cargando...</p>';
  let snap, estadoTodos;
  try {
    [snap, estadoTodos] = await Promise.all([
      getDocs(query(collection(db,"lugares"), orderBy("creadoEn","desc"))),
      obtenerEstadoTodos(),
    ]);
  } catch (err) {
    console.error("Error cargando lugares:", err);
    lista.innerHTML = `<p class="empty">⚠️ No se pudieron cargar los lugares (${err.message}). Probá recargar la página.</p>`;
    return;
  }
  lista.innerHTML = "";
  lugaresClimaActivos = {};
  if (snap.empty) { lista.innerHTML = '<p class="empty">No hay lugares. Creá uno nuevo.</p>'; return; }

  // Ordenar por prioridad de luces (encendida > apagada > sin luz > fuera de línea)
  const docsOrdenados = [...snap.docs].sort((a, b) => {
    const luzA = (a.data().switchLuces||[])[0];
    const luzB = (b.data().switchLuces||[])[0];
    return prioridadLuz(estadoTodos[luzA]) - prioridadLuz(estadoTodos[luzB]);
  });

  for (const d of docsOrdenados) {
    const l = d.data();
    const card = document.createElement("div");
    card.className = "lugar-card";
    card.dataset.lugarId = d.id;
    const sensores     = (l.sensoresTuya||[]).map(s=>DISPOSITIVOS_TUYA[s]?.nombre||s).join(", ") || "Sin sensor";
    const sensorClima  = (l.sensoresTuya||[]).find(s => DISPOSITIVOS_TUYA[s]?.tipo === "sensor");
    const luzKey       = (l.switchLuces||[])[0];
    const etapaGuardada = localStorage.getItem("etapa_"+d.id);
    const etapaInicial  = etapaGuardada || await detectarEtapaLugar(d.id);
    const graficosColapsados = localStorage.getItem("graficosColapsados_"+d.id) === "1";

    const opcionesEtapa = Object.entries(ETAPAS_VPD)
      .map(([k,v]) => `<option value="${k}" ${k===etapaInicial?"selected":""}>${v.nombre}</option>`).join("");

    card.innerHTML = `
      <div class="lugar-header">
        <span class="lugar-nombre">${l.nombre}</span>
        <span class="lugar-dim">${l.dimensiones||""}</span>
      </div>

      ${sensorClima ? `
      <div class="eco-section eco-ambiente">
        <div class="eco-title">🌡️ Ambiente</div>
        <div class="lugar-clima" id="clima-${d.id}"><span class="clima-cargando">🌡️ Consultando sensor...</span></div>
        <div class="anomalias-box" id="anomalias-${d.id}" style="display:none"></div>
        <div class="vpd-box">
          <div class="vpd-header">
            <span>🌬️ VPD</span>
            <select class="vpd-etapa" id="etapa-${d.id}" onchange="cambiarEtapaLugar('${d.id}')">${opcionesEtapa}</select>
          </div>
          <div id="vpd-valor-${d.id}" class="vpd-valor">Calculando...</div>
        </div>
      </div>` : ""}

      ${luzKey ? `
      <div class="eco-section eco-foto">
        <div class="eco-title">☀️ Fotoperíodo</div>
        <div class="luz-estado" id="luz-${d.id}"><span class="clima-cargando">💡 Consultando luces...</span></div>
        <div class="foto-box" id="foto-${d.id}"><span class="clima-cargando">🕐 Calculando fotoperíodo...</span></div>
      </div>` : ""}

      <div class="eco-section eco-genetica">
        <div class="eco-title">🌱 Genética / Plantas</div>
        <div class="plantas-resumen" id="plantas-${d.id}"><span class="clima-cargando">🌱 Consultando plantas...</span></div>
        <button class="btn-sm btn-primary btn-riego-lugar" style="margin-top:8px;width:100%">💧 Registrar riego / fertilización</button>
      </div>

      <div class="eco-section eco-tecnologia">
        <div class="eco-title">🔧 Tecnología</div>
        <div class="lugar-meta">
          <span>📡 ${sensores}</span>
          <span>💡 ${(l.luces||[]).map(lu=>`${lu.cantidad}× ${lu.tipo}`).join(", ")||"Sin luces"}</span>
        </div>
        ${l.intractor||l.extractor ? `<div class="lugar-meta"><span>${l.intractor?"✅ Intractor":""}${l.extractor?" ✅ Extractor":""}</span></div>`:""}
        <div class="altura-luces-box">
          <label>🔆 Distancia de las luces a las plantas: <span id="altura-luces-val-${d.id}">${l.alturaLuces??70}</span>cm</label>
          <input type="range" min="40" max="140" value="${l.alturaLuces??70}" class="altura-luces-slider"
                 oninput="document.getElementById('altura-luces-val-${d.id}').textContent=this.value"
                 onchange="guardarAlturaLuces('${d.id}', this.value)">
        </div>
      </div>

      ${sensorClima ? `
      <div class="clima-titulo graficos-header">
        <span>📈 Histórico y gráficos</span>
        <button class="btn-minimizar" onclick="toggleGraficosLugar('${d.id}')" id="btn-graf-${d.id}">${graficosColapsados?'▸ Mostrar':'▾ Minimizar'}</button>
      </div>
      <div class="graficos-hint">🖱️ Rueda: zoom · arrastrar: mover · doble click: volver a la vista completa</div>
      <div class="graficos-contenedor ${graficosColapsados?'colapsado':''}" id="graficos-${d.id}">
        <div class="clima-charts">
          <div class="chart-box"><canvas id="chart-temp-${d.id}"></canvas><div class="chart-empty" id="chart-temp-empty-${d.id}"></div></div>
          <div class="chart-box"><canvas id="chart-hum-${d.id}"></canvas><div class="chart-empty" id="chart-hum-empty-${d.id}"></div></div>
        </div>
        <div class="clima-titulo dia-titulo">
          <span>📅 Ver un día puntual (datos minuto a minuto)</span>
          <input type="date" id="fecha-dia-${d.id}" class="input-fecha-dia" onchange="cargarGraficoDia('${d.id}','${sensorClima}')">
        </div>
        <div class="clima-charts">
          <div class="chart-box"><canvas id="chart-dia-temp-${d.id}"></canvas><div class="chart-empty" id="chart-dia-temp-empty-${d.id}"></div></div>
          <div class="chart-box"><canvas id="chart-dia-hum-${d.id}"></canvas><div class="chart-empty" id="chart-dia-hum-empty-${d.id}"></div></div>
        </div>
        <div class="clima-titulo dia-titulo">
          <span>📊 Histórico largo (base propia, sin límite de 7 días)</span>
        </div>
        <div class="historico-largo-controles">
          <select id="hl-nivel-${d.id}" class="input-fecha-dia" onchange="cargarHistoricoLargoLugar('${d.id}','${sensorClima}')">
            <option value="hora">Por hora (últimas 2 semanas)</option>
            <option value="dia">Por día (histórico completo)</option>
          </select>
          <input type="date" id="hl-desde-${d.id}" class="input-fecha-dia" onchange="cargarHistoricoLargoLugar('${d.id}','${sensorClima}')">
          <input type="date" id="hl-hasta-${d.id}" class="input-fecha-dia" onchange="cargarHistoricoLargoLugar('${d.id}','${sensorClima}')">
        </div>
        <div class="clima-charts">
          <div class="chart-box"><canvas id="chart-hl-temp-${d.id}"></canvas><div class="chart-empty" id="chart-hl-temp-empty-${d.id}"></div></div>
          <div class="chart-box"><canvas id="chart-hl-hum-${d.id}"></canvas><div class="chart-empty" id="chart-hl-hum-empty-${d.id}"></div></div>
        </div>
        <div class="clima-titulo dia-titulo">
          <span>🧪 EC / PPFD + fechas de riego y fertilización (todas las plantas del lugar)</span>
        </div>
        <div class="chart-box chart-box-timeline"><canvas id="chart-timeline-${d.id}"></canvas><div class="chart-empty" id="chart-timeline-empty-${d.id}"></div></div>
      </div>` : ""}
      <div class="cult-actions">
        <button class="btn-sm btn-primary" onclick="verLugar('${d.id}')">Ver áreas y plantas</button>
        <button class="btn-sm btn-danger"  onclick="eliminarLugar('${d.id}','${l.nombre}')">Eliminar</button>
      </div>`;
    lista.appendChild(card);
    card.querySelector(".btn-riego-lugar").addEventListener("click", () => window.abrirModalRiegoLugar(d.id, l.nombre));
    cargarPlantasResumenCard(d.id, "plantas-"+d.id);

    lugaresClimaActivos[d.id] = { sensorKey: sensorClima, luzKey, etapa: etapaInicial };
    if (sensorClima) {
      refrescarActualLugar(d.id, sensorClima);
      if (!graficosColapsados) cargarHistoricoLugar(d.id, sensorClima);
      const fechaInput = document.getElementById("fecha-dia-"+d.id);
      if (fechaInput) {
        const hoy = fechaArgentinaISO(Date.now());
        const hace7 = fechaArgentinaISO(Date.now() - 7*24*60*60*1000);
        fechaInput.value = hoy; fechaInput.max = hoy; fechaInput.min = hace7;
        if (!graficosColapsados) cargarGraficoDia(d.id, sensorClima);
      }
      const hlDesde = document.getElementById("hl-desde-"+d.id);
      const hlHasta = document.getElementById("hl-hasta-"+d.id);
      if (hlDesde && hlHasta) {
        const hoy = fechaArgentinaISO(Date.now());
        const hace30 = fechaArgentinaISO(Date.now() - 30*24*60*60*1000);
        hlDesde.value = hace30; hlHasta.value = hoy; hlHasta.max = hoy;
        if (!graficosColapsados) cargarHistoricoLargoLugar(d.id, sensorClima);
      }
      if (!graficosColapsados) cargarTimelineLugar(d.id);
    }
    if (luzKey) { refrescarLuzLugar(d.id, luzKey); cargarFotoperiodoLugar(d.id, luzKey); }
  }
  iniciarAutoRefreshClima();
}

// Minimizar/mostrar los gráficos de un lugar. Si estaban colapsados y nunca se
// cargaron los datos, los trae recién ahora (evita gastar llamadas de más si
// el usuario nunca llega a abrirlos).
window.toggleGraficosLugar = function(lugarId) {
  const cont = document.getElementById("graficos-"+lugarId);
  const btn  = document.getElementById("btn-graf-"+lugarId);
  if (!cont) return;
  const colapsado = cont.classList.toggle("colapsado");
  localStorage.setItem("graficosColapsados_"+lugarId, colapsado ? "1" : "0");
  if (btn) btn.textContent = colapsado ? "▸ Mostrar" : "▾ Minimizar";
  if (!colapsado) {
    if (!chartsPorLugar[lugarId] && lugaresClimaActivos[lugarId]?.sensorKey) {
      cargarHistoricoLugar(lugarId, lugaresClimaActivos[lugarId].sensorKey);
      cargarGraficoDia(lugarId, lugaresClimaActivos[lugarId].sensorKey);
      cargarHistoricoLargoLugar(lugarId, lugaresClimaActivos[lugarId].sensorKey);
      cargarTimelineLugar(lugarId);
    } else {
      // Ya estaban creados: solo hace falta recalcular tamaño (estaban con display:none)
      chartsPorLugar[lugarId]?.temp?.resize();
      chartsPorLugar[lugarId]?.hum?.resize();
      chartsDiaPorLugar[lugarId]?.temp?.resize();
      chartsDiaPorLugar[lugarId]?.hum?.resize();
      chartsHLPorLugar[lugarId]?.temp?.resize();
      chartsHLPorLugar[lugarId]?.hum?.resize();
      chartsTimelinePorLugar[lugarId]?.resize();
    }
  }
};

// Redibuja el panel de luces de la ilustración del Dashboard en vivo mientras
// se arrastra el slider (sin red, sin esperar a Firestore). El guardado real
// pasa por guardarAlturaLuces en el onchange (al soltar). Soporta Carpa y
// Estructura 3x1.
window.actualizarAlturaLucesDashboard = (lugarId, valor) => {
  const v = parseInt(valor);
  const span = document.getElementById("altura-luces-dash-val-"+lugarId);
  if (span) span.textContent = v;
  const cfg = dashboardActivos[lugarId];
  if (!cfg) return;
  cfg.alturaLuces = v;
  const ilusEl = document.getElementById("dash-ilus-"+lugarId);
  const svgEl = ilusEl && ilusEl.querySelector("svg");
  if (!svgEl) return;
  const encendido = !!(estadoLuzActivos[lugarId] && estadoLuzActivos[lugarId].encendido);
  svgEl.outerHTML = cfg.tipo === "estructura3x1"
    ? svgEstructura3x1(encendido, v, lugarId)
    : svgCarpa(encendido, v, lugarId);
};

// Guarda la altura del panel de luces (0-100) para este lugar y refresca
// tanto el estado en memoria (dashboardActivos) como el dibujo si el
// Dashboard está visible en ese momento.
window.guardarAlturaLuces = async (lugarId, valor) => {
  const v = parseInt(valor);
  try {
    await updateDoc(doc(db,"lugares",lugarId), { alturaLuces: v });
    if (dashboardActivos[lugarId]) {
      dashboardActivos[lugarId].alturaLuces = v;
      const cfg = dashboardActivos[lugarId];
      refrescarDashboardCard(lugarId, cfg.sensorKey, cfg.luzKey, cfg.tipo, v);
    }
    toast("Altura de luces guardada ✓");
  } catch (err) {
    toast("No se pudo guardar: "+err.message, "err");
  }
};

window.cambiarEtapaLugar = function(lugarId) {
  const sel = document.getElementById("etapa-"+lugarId);
  if (!sel || !lugaresClimaActivos[lugarId]) return;
  lugaresClimaActivos[lugarId].etapa = sel.value;
  localStorage.setItem("etapa_"+lugarId, sel.value);
  if (lugaresClimaActivos[lugarId].sensorKey) refrescarActualLugar(lugarId, lugaresClimaActivos[lugarId].sensorKey);
  pintarFotoperiodo(lugarId);
};

// Trae las horas reales de luz de AYER (día completo, evita falsas alarmas a
// mitad del día de hoy) y las compara contra lo esperado según la etapa.
let fotoperiodoActivos = {}; // { lugarId: { horasEncendido, horasVentana, fecha, diaCompleto } }

async function cargarFotoperiodoLugar(lugarId, luzKey) {
  const el = document.getElementById("foto-"+lugarId);
  if (!el) return;
  try {
    const proxyBase = (localStorage.getItem("tuya_proxy") || PROXY_URL).replace(/\/tuya$/, "");
    const resp = await fetch(`${proxyBase}/tuya/fotoperiodo?device=${luzKey}`, { signal: AbortSignal.timeout(25000) });
    if (!resp.ok) throw new Error("HTTP "+resp.status);
    const data = await resp.json();
    fotoperiodoActivos[lugarId] = data;
    pintarFotoperiodo(lugarId);
  } catch (err) {
    el.innerHTML = `<span class="clima-error">Sin datos de fotoperíodo (${err.message})</span>`;
  }
}

function pintarFotoperiodo(lugarId) {
  const el   = document.getElementById("foto-"+lugarId);
  const data = fotoperiodoActivos[lugarId];
  if (!el || !data) return;
  const etapa    = lugaresClimaActivos[lugarId]?.etapa || "vegetativo";
  const objetivo = FOTOPERIODO_ESPERADO[etapa];

  // Línea principal: en curso, tipo "lleva 8.9h de luz de las 18h de hoy"
  const s = data.sesionActual || {};
  let lineaActual;
  if (!s.online) {
    lineaActual = `<span class="foto-aviso">📴 Luz fuera de línea</span>`;
  } else if (s.encendido) {
    lineaActual = `🕐 Lleva <b>${s.horasSesion}h</b> de luz encendida de las <b>${objetivo}h</b> de hoy`;
  } else {
    lineaActual = `🕐 Luz apagada ahora (objetivo del día: ${objetivo}h)`;
  }

  // Línea secundaria: chequeo estricto del día completo de ayer (para detectar
  // desvíos reales de la automatización, no solo el progreso de hoy)
  const diff    = Math.abs(data.horasEncendido - objetivo);
  const critico = etapa.startsWith("floracion");
  const okRango = diff <= (critico ? 0.3 : 1);
  const clase   = okRango ? "foto-ok" : (critico ? "foto-alerta" : "foto-aviso");
  const icono   = okRango ? "✅" : "⚠️";

  el.innerHTML = `
    <div>${lineaActual}</div>
    <div class="${clase}" style="font-size:.68rem">${icono} Ayer (${data.fecha}): ${data.horasEncendido}h total${!okRango ? ` — desvío de ${diff.toFixed(1)}h vs objetivo` : " (dentro de lo esperado)"}</div>
    ${critico && !okRango ? `<div class="foto-critico">⚠️ En floración esto puede inducir hermafroditismo — revisá el temporizador/automatización ya.</div>` : ""}`;
}

// Refresco automático liviano (solo valores actuales, no historial) cada 1 minuto
function iniciarAutoRefreshClima() {
  if (climaTimer) clearInterval(climaTimer);
  climaTimer = setInterval(async () => {
    const tareas = Object.entries(lugaresClimaActivos).map(([lugarId, cfg]) => Promise.all([
      cfg.sensorKey ? refrescarActualLugar(lugarId, cfg.sensorKey) : null,
      cfg.luzKey    ? refrescarLuzLugar(lugarId, cfg.luzKey)       : null,
    ]));
    await Promise.all(tareas);
    reordenarListaLugares();
  }, 60 * 1000);
}

// Reordena las cards ya existentes en el DOM (sin recrearlas, para no perder
// gráficos ya dibujados ni el estado de "minimizado") según prioridad de luces.
function reordenarListaLugares() {
  const lista = document.getElementById("lista-lugares");
  if (!lista) return;
  const tarjetas = Array.from(lista.querySelectorAll(":scope > .lugar-card"));
  tarjetas.sort((a, b) => prioridadLuz(estadoLuzActivos[a.dataset.lugarId]) - prioridadLuz(estadoLuzActivos[b.dataset.lugarId]));
  tarjetas.forEach(t => lista.appendChild(t));
}

function claseTemp(temp) {
  if (temp == null) return "";
  return (temp < TEMP_OPTIMA_MIN || temp > TEMP_OPTIMA_MAX) ? "temp-fuera" : "temp-ok";
}

// Temp/humedad actuales + VPD — llamada liviana (/tuya?device=), se repite cada 1 min
async function refrescarActualLugar(lugarId, sensorKey) {
  const el = document.getElementById("clima-"+lugarId);
  if (!el) return;
  try {
    const proxyBase = (localStorage.getItem("tuya_proxy") || PROXY_URL).replace(/\/tuya$/, "");
    const resp = await fetch(`${proxyBase}/tuya?device=${sensorKey}`, { signal: AbortSignal.timeout(12000) });
    if (!resp.ok) throw new Error("HTTP "+resp.status);
    const data = await resp.json();
    const s    = data.sensores || {};
    const temp = s.tempAmb ?? null, hum = s.humedad ?? null;
    const statsPrevios = el.querySelector(".clima-stats")?.outerHTML || "";
    el.innerHTML = `
      <div class="clima-actual">
        <span class="${claseTemp(temp)}">🌡️ ${temp!=null?temp.toFixed(1):"—"}°C</span>
        <span>💧 ${hum!=null?hum.toFixed(0):"—"}%</span>
        <span class="clima-hora">${new Date().toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}</span>
      </div>${statsPrevios}`;

    // VPD + sugerencia
    const etapa = lugaresClimaActivos[lugarId]?.etapa || "vegetativo";
    const vpd = calcularVPD(temp, hum);
    const vEl = document.getElementById("vpd-valor-"+lugarId);
    if (vEl) {
      const sug = sugerenciaVPD(vpd, etapa, hum, temp);
      vEl.innerHTML = vpd==null ? "Sin datos" : `
        <div class="vpd-num vpd-${sug?.estado||''}">${vpd} kPa</div>
        <div class="vpd-sugerencia">${sug?.texto||""}</div>`;
    }

    if (lugaresClimaActivos[lugarId]) lugaresClimaActivos[lugarId].actual = { temp, hum };
    renderAnomaliasLugar(lugarId);
  } catch (err) {
    el.innerHTML = `<span class="clima-error">Sin datos del sensor</span>`;
  }
}

// Estado de luces encendido/apagado — llamada liviana, cada 1 min
async function refrescarLuzLugar(lugarId, luzKey) {
  const el = document.getElementById("luz-"+lugarId);
  try {
    const proxyBase = (localStorage.getItem("tuya_proxy") || PROXY_URL).replace(/\/tuya$/, "");
    const resp = await fetch(`${proxyBase}/tuya?device=${luzKey}`, { signal: AbortSignal.timeout(12000) });
    if (!resp.ok) throw new Error("HTTP "+resp.status);
    const data = await resp.json();
    estadoLuzActivos[lugarId] = { online: !!data.online, encendido: !!(data.sensores && data.sensores.encendido) };
    if (el) el.innerHTML = htmlEstadoLuz(data);
  } catch (err) {
    if (el) el.innerHTML = `<span class="clima-error">Sin datos de luces</span>`;
  }
}

// Tres estados posibles: encendida, apagada, o fuera de línea (el dispositivo no responde
// a Tuya hace rato — en ese caso el último valor de "switch" conocido no es confiable).
function htmlEstadoLuz(data) {
  if (!data.online) return `<span class="luz-offline">📴 Luces fuera de línea</span>`;
  const encendido = !!(data.sensores && data.sensores.encendido);
  return `<span class="${encendido?'luz-on':'luz-off'}">${encendido?'💡 Luces encendidas':'🌑 Luces apagadas'}</span>`;
}

// Estadística 24h + gráficos 7 días — llamada más pesada (report-logs), se carga una sola vez al entrar
async function cargarHistoricoLugar(lugarId, sensorKey) {
  const el = document.getElementById("clima-"+lugarId);
  try {
    const proxyBase = (localStorage.getItem("tuya_proxy") || PROXY_URL).replace(/\/tuya$/, "");
    const resp = await fetch(`${proxyBase}/tuya/history/resumen?device=${sensorKey}`, { signal: AbortSignal.timeout(25000) });
    if (!resp.ok) throw new Error("HTTP "+resp.status);
    const data = await resp.json();
    const h24  = (data.historico && data.historico["24h"]) || {};
    const h7d  = (data.historico && data.historico["7d"])  || {};
    const t    = h24.tempAmb, h = h24.humedad;
    if (el && (t || h)) {
      const statsHTML = `<div class="clima-stats">
        ${t ? `<span class="clima-rango">24h temp ${t.min.toFixed(1)}–${t.max.toFixed(1)}°C · prom ${t.avg}</span>` : ""}
        ${h ? `<span class="clima-rango">24h hum ${h.min.toFixed(0)}–${h.max.toFixed(0)}% · prom ${h.avg}</span>` : ""}
      </div>`;
      const existente = el.querySelector(".clima-stats");
      if (existente) existente.outerHTML = statsHTML; else el.insertAdjacentHTML("beforeend", statsHTML);
    }
    if (lugaresClimaActivos[lugarId]) lugaresClimaActivos[lugarId].hist24 = { t, h };
    renderAnomaliasLugar(lugarId);
    dibujarGraficos(lugarId, h7d.tempAmb?.serie || [], h7d.humedad?.serie || []);
    if (data.truncado && data.truncado["7d"]) {
      const chartsCont = document.getElementById("chart-temp-"+lugarId)?.closest(".clima-charts");
      if (chartsCont && !chartsCont.parentElement.querySelector(".aviso-truncado")) {
        chartsCont.insertAdjacentHTML("afterend", `<div class="aviso-truncado">⚠️ El sensor reportó tan seguido que puede haber más lecturas de las mostradas en los 7 días.</div>`);
      }
    }
  } catch (err) {
    console.error("Error histórico", lugarId, err.message);
    mostrarErrorGrafico(lugarId, err.message);
  }
}

function mostrarErrorGrafico(lugarId, msg) {
  ["temp","hum"].forEach(tipo => {
    const box = document.getElementById(`chart-${tipo}-empty-${lugarId}`);
    if (box) box.innerHTML = `⚠️ No se pudo cargar el histórico (${msg})`;
  });
}

function chartOptionsBase(unidad, banda) {
  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      annotation: { annotations: {} },
      // Rueda del mouse = zoom en X (ver minuto a minuto), arrastrar = mover
      // la ventana visible, doble click = volver a la vista completa.
      zoom: {
        limits: { x: { min: "original", max: "original", minRange: 5 } },
        pan:  { enabled: true, mode: "x" },
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
      },
    },
    scales: {
      x: {
        type: "time",
        time: {
          tooltipFormat: "dd/MM/yyyy HH:mm",
          displayFormats: { minute: "HH:mm", hour: "HH:mm", day: "dd/MM", week: "dd/MM", month: "MM/yyyy" },
        },
        ticks: { color: "#8a9a8f", maxTicksLimit: 8, font: { size: 10 }, autoSkip: true },
        grid: { display: false },
      },
      y: { ticks: { color: "#8a9a8f", font: { size: 10 }, callback: v => v + unidad }, grid: { color: "rgba(255,255,255,.05)" } },
    },
  };
  if (banda) {
    opts.plugins.annotation.annotations.banda = {
      type: "box", yMin: banda.min, yMax: banda.max,
      backgroundColor: "rgba(61,220,151,.10)", borderColor: "rgba(61,220,151,.35)", borderWidth: 1,
      label: { display: true, content: banda.label, position: "start", color: "#3ddc97", font: { size: 9 }, backgroundColor: "rgba(0,0,0,0)" },
    };
  }
  return opts;
}

// Doble click sobre un gráfico = volver a ver el rango completo (el plugin de
// zoom no trae esto de fábrica, hay que engancharlo a mano por canvas).
function habilitarResetZoom(chart, canvas) {
  if (!chart || !canvas) return;
  canvas.ondblclick = () => chart.resetZoom();
}

function dibujarGraficos(lugarId, serieTemp, serieHum) {
  const ctxTemp   = document.getElementById("chart-temp-"+lugarId);
  const ctxHum    = document.getElementById("chart-hum-"+lugarId);
  const emptyTemp = document.getElementById("chart-temp-empty-"+lugarId);
  const emptyHum  = document.getElementById("chart-hum-empty-"+lugarId);
  if (!ctxTemp || !ctxHum) return;
  if (typeof Chart === "undefined") { if(emptyTemp) emptyTemp.textContent = "⚠️ No se pudo cargar Chart.js"; return; }

  if (emptyTemp) emptyTemp.innerHTML = serieTemp.length ? "" : "Sin lecturas históricas todavía (puede tardar unas horas en acumular datos)";
  if (emptyHum)  emptyHum.innerHTML  = serieHum.length  ? "" : "Sin lecturas históricas todavía (puede tardar unas horas en acumular datos)";

  const etapa = lugaresClimaActivos[lugarId]?.etapa || "vegetativo";
  const bandaHum = ETAPAS_VPD[etapa]?.humedad;

  if (chartsPorLugar[lugarId]?.temp) chartsPorLugar[lugarId].temp.destroy();
  if (chartsPorLugar[lugarId]?.hum)  chartsPorLugar[lugarId].hum.destroy();

  chartsPorLugar[lugarId] = {
    temp: serieTemp.length ? new Chart(ctxTemp, {
      type: "line",
      data: { datasets: [{ label:"Temp °C", data: serieTemp.map(p=>({x:p.t,y:p.v})), borderColor:"#ff8a3d", backgroundColor:"rgba(255,138,61,.15)", tension:.3, pointRadius:0, borderWidth:2, fill:true }] },
      options: chartOptionsBase("°C", { min: TEMP_OPTIMA_MIN, max: TEMP_OPTIMA_MAX, label: `Óptimo ${TEMP_OPTIMA_MIN}-${TEMP_OPTIMA_MAX}°C` }),
    }) : null,
    hum: serieHum.length ? new Chart(ctxHum, {
      type: "line",
      data: { datasets: [{ label:"Humedad %", data: serieHum.map(p=>({x:p.t,y:p.v})), borderColor:"#3ddc97", backgroundColor:"rgba(61,220,151,.15)", tension:.3, pointRadius:0, borderWidth:2, fill:true }] },
      options: chartOptionsBase("%", bandaHum ? { min: bandaHum[0], max: bandaHum[1], label: `Óptimo ${bandaHum[0]}-${bandaHum[1]}%` } : null),
    }) : null,
  };
  habilitarResetZoom(chartsPorLugar[lugarId].temp, ctxTemp);
  habilitarResetZoom(chartsPorLugar[lugarId].hum, ctxHum);
}

// Trae y dibuja el histórico de un día puntual (según la fecha elegida en el selector)
async function cargarGraficoDia(lugarId, sensorKey) {
  const fechaInput = document.getElementById("fecha-dia-"+lugarId);
  const fecha = fechaInput?.value;
  if (!fecha) return;
  const emptyTemp = document.getElementById("chart-dia-temp-empty-"+lugarId);
  const emptyHum  = document.getElementById("chart-dia-hum-empty-"+lugarId);
  if (emptyTemp) emptyTemp.innerHTML = "Cargando...";
  if (emptyHum)  emptyHum.innerHTML  = "Cargando...";
  try {
    const proxyBase = (localStorage.getItem("tuya_proxy") || PROXY_URL).replace(/\/tuya$/, "");
    const resp = await fetch(`${proxyBase}/tuya/history?device=${sensorKey}&fecha=${fecha}`, { signal: AbortSignal.timeout(25000) });
    if (!resp.ok) throw new Error("HTTP "+resp.status);
    const data = await resp.json();
    const est = data.estadisticas || {};
    dibujarGraficosDia(lugarId, est.tempAmb?.serie || [], est.humedad?.serie || []);
  } catch (err) {
    console.error("Error gráfico día", lugarId, err.message);
    if (emptyTemp) emptyTemp.innerHTML = `⚠️ No se pudo cargar (${err.message})`;
    if (emptyHum)  emptyHum.innerHTML  = `⚠️ No se pudo cargar (${err.message})`;
  }
}

function dibujarGraficosDia(lugarId, serieTemp, serieHum) {
  const ctxTemp   = document.getElementById("chart-dia-temp-"+lugarId);
  const ctxHum    = document.getElementById("chart-dia-hum-"+lugarId);
  const emptyTemp = document.getElementById("chart-dia-temp-empty-"+lugarId);
  const emptyHum  = document.getElementById("chart-dia-hum-empty-"+lugarId);
  if (!ctxTemp || !ctxHum) return;
  if (typeof Chart === "undefined") { if(emptyTemp) emptyTemp.textContent = "⚠️ No se pudo cargar Chart.js"; return; }

  if (emptyTemp) emptyTemp.innerHTML = serieTemp.length ? "" : "Sin lecturas ese día";
  if (emptyHum)  emptyHum.innerHTML  = serieHum.length  ? "" : "Sin lecturas ese día";

  const etapa    = lugaresClimaActivos[lugarId]?.etapa || "vegetativo";
  const bandaHum = ETAPAS_VPD[etapa]?.humedad;

  if (chartsDiaPorLugar[lugarId]?.temp) chartsDiaPorLugar[lugarId].temp.destroy();
  if (chartsDiaPorLugar[lugarId]?.hum)  chartsDiaPorLugar[lugarId].hum.destroy();

  chartsDiaPorLugar[lugarId] = {
    temp: serieTemp.length ? new Chart(ctxTemp, {
      type: "line",
      data: { datasets: [{ label:"Temp °C", data: serieTemp.map(p=>({x:p.t,y:p.v})), borderColor:"#ff8a3d", backgroundColor:"rgba(255,138,61,.15)", tension:.3, pointRadius:0, borderWidth:2, fill:true }] },
      options: chartOptionsBase("°C", { min: TEMP_OPTIMA_MIN, max: TEMP_OPTIMA_MAX, label: `Óptimo ${TEMP_OPTIMA_MIN}-${TEMP_OPTIMA_MAX}°C` }),
    }) : null,
    hum: serieHum.length ? new Chart(ctxHum, {
      type: "line",
      data: { datasets: [{ label:"Humedad %", data: serieHum.map(p=>({x:p.t,y:p.v})), borderColor:"#3ddc97", backgroundColor:"rgba(61,220,151,.15)", tension:.3, pointRadius:0, borderWidth:2, fill:true }] },
      options: chartOptionsBase("%", bandaHum ? { min: bandaHum[0], max: bandaHum[1], label: `Óptimo ${bandaHum[0]}-${bandaHum[1]}%` } : null),
    }) : null,
  };
  habilitarResetZoom(chartsDiaPorLugar[lugarId].temp, ctxTemp);
  habilitarResetZoom(chartsDiaPorLugar[lugarId].hum, ctxHum);
}

// Histórico largo: lee de NUESTRA base propia (lecturasSensores en Firestore),
// no de Tuya, así que no tiene el límite de 7 días. Por hora (últimas 2 semanas,
// que es lo que se retiene en crudo) o por día (todo el historial acumulado).
async function cargarHistoricoLargoLugar(lugarId, sensorKey) {
  const nivelSel = document.getElementById("hl-nivel-"+lugarId)?.value || "hora";
  const desdeSel = document.getElementById("hl-desde-"+lugarId)?.value;
  const hastaSel = document.getElementById("hl-hasta-"+lugarId)?.value;
  const emptyTemp = document.getElementById("chart-hl-temp-empty-"+lugarId);
  const emptyHum  = document.getElementById("chart-hl-hum-empty-"+lugarId);
  if (emptyTemp) emptyTemp.innerHTML = "Cargando...";
  if (emptyHum)  emptyHum.innerHTML  = "Cargando...";

  try {
    const proxyBase = (localStorage.getItem("tuya_proxy") || PROXY_URL).replace(/\/tuya$/, "");
    // La clave de bucket es "YYYY-MM-DD" (día) o "YYYY-MM-DDTHH" (hora); con la
    // fecha del <input type=date> alcanza como prefijo para acotar el rango.
    const desde = nivelSel === "dia" ? desdeSel : `${desdeSel}T00`;
    const hasta = nivelSel === "dia" ? hastaSel : `${hastaSel}T23`;
    const resp = await fetch(`${proxyBase}/tuya/rollup?device=${sensorKey}&nivel=${nivelSel}&desde=${desde}&hasta=${hasta}`, { signal: AbortSignal.timeout(20000) });
    if (!resp.ok) throw new Error("HTTP "+resp.status);
    const data = await resp.json();
    const puntos = data.puntos || [];
    const serieTemp = puntos.filter(p => p.metrics?.tempAmb).map(p => ({ clave: p.clave, v: +(p.metrics.tempAmb.sum / p.metrics.tempAmb.count).toFixed(1) }));
    const serieHum  = puntos.filter(p => p.metrics?.humedad).map(p => ({ clave: p.clave, v: +(p.metrics.humedad.sum / p.metrics.humedad.count).toFixed(1) }));
    dibujarGraficosHL(lugarId, serieTemp, serieHum, nivelSel);
  } catch (err) {
    console.error("Error histórico largo", lugarId, err.message);
    if (emptyTemp) emptyTemp.innerHTML = `⚠️ No se pudo cargar (${err.message})`;
    if (emptyHum)  emptyHum.innerHTML  = `⚠️ No se pudo cargar (${err.message})`;
  }
}

function dibujarGraficosHL(lugarId, serieTemp, serieHum, nivel) {
  const ctxTemp   = document.getElementById("chart-hl-temp-"+lugarId);
  const ctxHum    = document.getElementById("chart-hl-hum-"+lugarId);
  const emptyTemp = document.getElementById("chart-hl-temp-empty-"+lugarId);
  const emptyHum  = document.getElementById("chart-hl-hum-empty-"+lugarId);
  if (!ctxTemp || !ctxHum) return;
  if (typeof Chart === "undefined") { if(emptyTemp) emptyTemp.textContent = "⚠️ No se pudo cargar Chart.js"; return; }

  const claveATs = clave => nivel === "dia" ? new Date(clave+"T12:00:00").getTime() : new Date(clave+":00:00").getTime();

  if (emptyTemp) emptyTemp.innerHTML = serieTemp.length ? "" : "Sin datos propios en ese rango todavía";
  if (emptyHum)  emptyHum.innerHTML  = serieHum.length  ? "" : "Sin datos propios en ese rango todavía";

  const etapa    = lugaresClimaActivos[lugarId]?.etapa || "vegetativo";
  const bandaHum = ETAPAS_VPD[etapa]?.humedad;

  if (chartsHLPorLugar[lugarId]?.temp) chartsHLPorLugar[lugarId].temp.destroy();
  if (chartsHLPorLugar[lugarId]?.hum)  chartsHLPorLugar[lugarId].hum.destroy();

  chartsHLPorLugar[lugarId] = {
    temp: serieTemp.length ? new Chart(ctxTemp, {
      type: "line",
      data: { datasets: [{ label:"Temp °C (prom.)", data: serieTemp.map(p=>({x:claveATs(p.clave),y:p.v})), borderColor:"#ff8a3d", backgroundColor:"rgba(255,138,61,.15)", tension:.3, pointRadius:0, borderWidth:2, fill:true }] },
      options: chartOptionsBase("°C", { min: TEMP_OPTIMA_MIN, max: TEMP_OPTIMA_MAX, label: `Óptimo ${TEMP_OPTIMA_MIN}-${TEMP_OPTIMA_MAX}°C` }),
    }) : null,
    hum: serieHum.length ? new Chart(ctxHum, {
      type: "line",
      data: { datasets: [{ label:"Humedad % (prom.)", data: serieHum.map(p=>({x:claveATs(p.clave),y:p.v})), borderColor:"#3ddc97", backgroundColor:"rgba(61,220,151,.15)", tension:.3, pointRadius:0, borderWidth:2, fill:true }] },
      options: chartOptionsBase("%", bandaHum ? { min: bandaHum[0], max: bandaHum[1], label: `Óptimo ${bandaHum[0]}-${bandaHum[1]}%` } : null),
    }) : null,
  };
  habilitarResetZoom(chartsHLPorLugar[lugarId].temp, ctxTemp);
  habilitarResetZoom(chartsHLPorLugar[lugarId].hum, ctxHum);
}

// Línea de tiempo por Lugar: junta EC/PPFD y fechas de riego/fertilización de
// TODAS las plantas del lugar (no solo una), para tener el panorama completo
// del espacio de cultivo en un solo gráfico.
async function cargarTimelineLugar(lugarId) {
  const ctx = document.getElementById("chart-timeline-"+lugarId);
  const empty = document.getElementById("chart-timeline-empty-"+lugarId);
  if (!ctx) return;
  if (typeof Chart === "undefined") { if(empty) empty.textContent = "⚠️ No se pudo cargar Chart.js"; return; }

  let puntosEc = [], puntosPpfd = [], marcasRiego = [];
  try {
    const plantasSnap = await getDocs(query(collection(db,"plantas"), where("lugarId","==",lugarId)));
    for (const pd of plantasSnap.docs) {
      const evSnap = await getDocs(collection(db,"plantas",pd.id,"eventos"));
      evSnap.forEach(ed => {
        const e = ed.data();
        const t = e.fecha?.toDate ? e.fecha.toDate().getTime() : (e.fecha ? new Date(e.fecha).getTime() : null);
        if (!t) return;
        if (e.ec != null)   puntosEc.push({ x: t, y: e.ec });
        if (e.ppfd != null) puntosPpfd.push({ x: t, y: e.ppfd });
        if (e.tipo === "riego" || e.tipo === "fertilizacion") {
          marcasRiego.push({ t, tipo: e.tipo, titulo: e.titulo||"", planta: pd.data().nombre||"" });
        }
      });
    }
  } catch (err) {
    if (empty) empty.textContent = "⚠️ No se pudo cargar (" + err.message + ")";
    return;
  }
  puntosEc.sort((a,b)=>a.x-b.x); puntosPpfd.sort((a,b)=>a.x-b.x);

  if (!puntosEc.length && !puntosPpfd.length && !marcasRiego.length) {
    if (empty) empty.textContent = "Todavía no hay EC/PPFD ni riegos/fertilizaciones cargados para este lugar.";
    if (chartsTimelinePorLugar[lugarId]) { chartsTimelinePorLugar[lugarId].destroy(); chartsTimelinePorLugar[lugarId]=null; }
    return;
  }
  if (empty) empty.textContent = "";

  // Una línea vertical de color por cada riego/fertilización, con su propia etiqueta.
  const anotaciones = {};
  marcasRiego.forEach((m, i) => {
    anotaciones["riego"+i] = {
      type: "line", xMin: m.t, xMax: m.t,
      borderColor: m.tipo==="fertilizacion" ? "#3ddc97" : "#4aa8ff",
      borderWidth: 1.5, borderDash: [4,3],
      label: { display: false },
    };
  });

  if (chartsTimelinePorLugar[lugarId]) chartsTimelinePorLugar[lugarId].destroy();
  chartsTimelinePorLugar[lugarId] = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        puntosEc.length   ? { label:"EC",   data:puntosEc,   borderColor:"#f4c542", backgroundColor:"#f4c542", showLine:false, pointRadius:4, yAxisID:"yEc" } : null,
        puntosPpfd.length ? { label:"PPFD", data:puntosPpfd, borderColor:"#ff8a3d", backgroundColor:"#ff8a3d", showLine:false, pointRadius:4, yAxisID:"yPpfd" } : null,
      ].filter(Boolean),
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: {
        legend: { display: true, labels: { color:"#8a9a8f", boxWidth:10, font:{size:10} } },
        annotation: { annotations: anotaciones },
        zoom: { limits:{x:{min:"original",max:"original"}}, pan:{enabled:true,mode:"x"}, zoom:{wheel:{enabled:true},pinch:{enabled:true},mode:"x"} },
        tooltip: {
          callbacks: {
            afterBody: (items) => {
              // Si hay un riego/fertilización cerca del punto, lo menciona en el tooltip
              const t = items[0]?.parsed?.x;
              if (t == null) return "";
              const cerca = marcasRiego.find(m => Math.abs(m.t - t) < 3*3600*1000);
              return cerca ? `${cerca.tipo==="fertilizacion"?"🌿":"💧"} ${cerca.planta}: ${cerca.titulo}` : "";
            },
          },
        },
      },
      scales: {
        x: { type:"time", time:{ tooltipFormat:"dd/MM/yyyy HH:mm", displayFormats:{minute:"HH:mm",hour:"HH:mm",day:"dd/MM",week:"dd/MM",month:"MM/yyyy"} }, ticks:{color:"#8a9a8f",maxTicksLimit:8,font:{size:10}}, grid:{display:false} },
        yEc:   { position:"left",  ticks:{color:"#f4c542",font:{size:10}}, grid:{color:"rgba(255,255,255,.05)"}, title:{display:true,text:"EC",color:"#f4c542",font:{size:10}} },
        yPpfd: { position:"right", ticks:{color:"#ff8a3d",font:{size:10}}, grid:{display:false}, title:{display:true,text:"PPFD",color:"#ff8a3d",font:{size:10}} },
      },
    },
  });
  habilitarResetZoom(chartsTimelinePorLugar[lugarId], ctx);
}

let dashboardActivos = {}; // { lugarId: { sensorKey, luzKey, tipo } }
let dashboardTimer   = null;

// Detecta si el lugar es la Carpa (1×1×2) o la Estructura 3×1, usando el sensor
// asociado como fuente de verdad y el texto de nombre/dimensiones como respaldo.
function detectarTipoEstructura(l) {
  const sensorKey = (l.sensoresTuya||[])[0];
  const lugarDispositivo = sensorKey && DISPOSITIVOS_TUYA[sensorKey]?.lugar;
  if (lugarDispositivo === "Estructura 3x1") return "estructura3x1";
  if (lugarDispositivo === "Carpa") return "carpa";
  const texto = ((l.dimensiones||"") + " " + (l.nombre||"")).toLowerCase();
  if (texto.includes("3x1") || texto.includes("3×1") || texto.includes("estructura")) return "estructura3x1";
  return "carpa";
}

// Carpa real: 100x100cm de base x 200cm de alto → el marco frontal (lo que
// se ve mirando de frente) debe ser alto y angosto (ratio ancho:alto=1:2).
// La pared del fondo va ANIDADA adentro de ese marco (más chica, centrada),
// no apilada arriba — así la fuga converge hacia el centro y el alto real
// (200cm) queda siempre vertical, sin mezclarse con la profundidad (100cm).
function svgCarpa(encendida, alturaLuces, lugarId) {
  const d = alturaLuces==null ? 70 : alturaLuces; // distancia real en cm de las luces a las plantas
  // Referencia "0cm" = tabla de esquejes (y=185, real ≈41cm de altura). Escala:
  // 220px de marco frontal representan 200cm de alto real → 1.1px/cm.
  const yLuz = 185 - d * 1.1; // más cm → más arriba (lejos) · menos cm → más abajo (cerca)
  const gw = "bgW"+lugarId, gy = "bgY"+lugarId; // ids de gradiente únicos por lugar
  return `
  <svg viewBox="0 0 120 240" class="ilustracion ${encendida?'glow-on':'glow-off'}">
    <defs>
      <linearGradient id="${gw}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity=".32"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="${gy}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fff6c9" stop-opacity=".4"/>
        <stop offset="100%" stop-color="#fff6c9" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <!-- Marco frontal 10,10–110,230 · pared del fondo (anidada) 35,65–85,175 -->
    <polygon points="10,10 110,10 85,65 35,65" class="carpa-techo"/>
    <polygon points="10,10 10,230 35,175 35,65" class="carpa-pared"/>
    <polygon points="110,10 110,230 85,175 85,65" class="carpa-pared"/>
    <polygon points="10,230 110,230 85,175 35,175" class="carpa-piso"/>
    <polygon points="35,65 85,65 85,175 35,175" class="carpa-fondo"/>
    <rect x="10" y="10" width="100" height="220" fill="none" class="carpa-marco"/>
    <ellipse cx="60" cy="130" rx="42" ry="95" class="glow-interior"/>
    <!-- Mesa 80x80cm, patas de 40cm — apoyo de esquejes -->
    <g class="mesa">
      <line x1="38" y1="185" x2="38" y2="212" class="mesa-pata"/>
      <line x1="82" y1="185" x2="82" y2="212" class="mesa-pata"/>
      <line x1="30" y1="196" x2="30" y2="223" class="mesa-pata"/>
      <line x1="90" y1="196" x2="90" y2="223" class="mesa-pata"/>
      <polygon points="38,185 82,185 90,196 30,196" class="mesa-tabla"/>
    </g>
    <!-- Haces de luz (cono), sobre la mesa/piso -->
    <g class="haces-luz">
      <polygon points="34,${(yLuz+3).toFixed(1)} 42,${(yLuz+3).toFixed(1)} 55,225 21,225" fill="url(#${gw})" class="beam"/>
      <polygon points="49,${(yLuz+1).toFixed(1)} 71,${(yLuz+1).toFixed(1)} 93,227 27,227" fill="url(#${gy})" class="beam"/>
      <polygon points="78,${(yLuz+3).toFixed(1)} 86,${(yLuz+3).toFixed(1)} 99,225 65,225" fill="url(#${gw})" class="beam"/>
    </g>
    <g class="panel-led">
      <!-- Galponera izquierda -->
      <line x1="38" y1="18" x2="38" y2="${(yLuz-2).toFixed(1)}" class="cable-luz"/>
      <ellipse cx="38" cy="${yLuz.toFixed(1)}" rx="4.5" ry="6" class="galponera"/>
      <!-- Panel central Insativa 200w -->
      <line x1="60" y1="16" x2="60" y2="${(yLuz-4).toFixed(1)}" class="cable-luz"/>
      <rect x="46" y="${(yLuz-4).toFixed(1)}" width="28" height="7" rx="2" class="barra-luz"/>
      <!-- Galponera derecha -->
      <line x1="82" y1="18" x2="82" y2="${(yLuz-2).toFixed(1)}" class="cable-luz"/>
      <ellipse cx="82" cy="${yLuz.toFixed(1)}" rx="4.5" ry="6" class="galponera"/>
    </g>
  </svg>`;
}

// Estructura real: 300cm ancho x 200cm alto x 100cm de profundidad. Mismo
// criterio que la Carpa: marco frontal ancho×alto real, fondo (profundidad)
// anidado adentro, fuga radiando hacia el centro.
function svgEstructura3x1(encendida, alturaLuces, lugarId) {
  const d = alturaLuces==null ? 70 : alturaLuces; // distancia real en cm de las luces a las plantas
  // Referencia "0cm" = piso del fondo (y=150). Escala: 170px de marco frontal
  // representan 200cm de alto real → 0.85px/cm.
  const yLuz = 150 - d * 0.85;
  const gw = "egW"+lugarId, gy = "egY"+lugarId;
  return `
  <svg viewBox="0 0 300 200" class="ilustracion ${encendida?'glow-on':'glow-off'}">
    <defs>
      <linearGradient id="${gw}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity=".26"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="${gy}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fff6c9" stop-opacity=".38"/>
        <stop offset="100%" stop-color="#fff6c9" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <!-- Patas -->
    <rect x="28" y="180" width="7" height="16" class="estante-pata"/>
    <rect x="265" y="180" width="7" height="16" class="estante-pata"/>
    <!-- Marco frontal 10,10–290,180 · pared del fondo (anidada) 59,40–241,150 -->
    <polygon points="10,10 290,10 241,40 59,40" class="carpa-techo"/>
    <polygon points="10,10 10,180 59,150 59,40" class="carpa-pared"/>
    <polygon points="290,10 290,180 241,150 241,40" class="carpa-pared"/>
    <polygon points="10,180 290,180 241,150 59,150" class="carpa-piso"/>
    <polygon points="59,40 241,40 241,150 59,150" class="carpa-fondo"/>
    <!-- 2 divisiones = 3 compartimentos -->
    <line x1="103" y1="10" x2="120" y2="40" class="carpa-marco"/>
    <line x1="103" y1="180" x2="120" y2="150" class="carpa-marco"/>
    <line x1="197" y1="10" x2="180" y2="40" class="carpa-marco"/>
    <line x1="197" y1="180" x2="180" y2="150" class="carpa-marco"/>
    <rect x="10" y="10" width="280" height="170" fill="none" class="carpa-marco"/>
    <ellipse cx="150" cy="95" rx="132" ry="80" class="glow-interior"/>
    <!-- Haces de luz (cono), uno por compartimento -->
    <g class="haces-luz">
      <polygon points="47,${(yLuz+6).toFixed(1)} 67,${(yLuz+6).toFixed(1)} 85,145 29,145" fill="url(#${gy})" class="beam"/>
      <polygon points="128,${(yLuz+2).toFixed(1)} 172,${(yLuz+2).toFixed(1)} 195,148 105,148" fill="url(#${gw})" class="beam"/>
      <polygon points="140,${(yLuz+6).toFixed(1)} 160,${(yLuz+6).toFixed(1)} 178,145 122,145" fill="url(#${gy})" class="beam"/>
      <polygon points="233,${(yLuz+6).toFixed(1)} 253,${(yLuz+6).toFixed(1)} 271,145 215,145" fill="url(#${gy})" class="beam"/>
    </g>
    <g class="panel-led">
      <!-- Insativa izquierda -->
      <line x1="57" y1="16" x2="57" y2="${yLuz.toFixed(1)}" class="cable-luz"/>
      <rect x="42" y="${yLuz.toFixed(1)}" width="30" height="6" rx="2" class="barra-luz"/>
      <!-- Insativa centro + 4 galponeras alrededor -->
      <line x1="150" y1="16" x2="150" y2="${yLuz.toFixed(1)}" class="cable-luz"/>
      <rect x="135" y="${yLuz.toFixed(1)}" width="30" height="6" rx="2" class="barra-luz"/>
      <ellipse cx="120" cy="${(yLuz-5).toFixed(1)}" rx="4" ry="5" class="galponera"/>
      <ellipse cx="180" cy="${(yLuz-5).toFixed(1)}" rx="4" ry="5" class="galponera"/>
      <ellipse cx="120" cy="${(yLuz+12).toFixed(1)}" rx="4" ry="5" class="galponera"/>
      <ellipse cx="180" cy="${(yLuz+12).toFixed(1)}" rx="4" ry="5" class="galponera"/>
      <!-- Insativa derecha -->
      <line x1="243" y1="16" x2="243" y2="${yLuz.toFixed(1)}" class="cable-luz"/>
      <rect x="228" y="${yLuz.toFixed(1)}" width="30" height="6" rx="2" class="barra-luz"/>
    </g>
  </svg>`;
}

// Clima exterior real (Villa Luzuriaga, La Matanza, Bs.As.) vía Open-Meteo,
// sin API key. Se muestra como termómetro afuera de cada ilustración del
// Dashboard, para comparar de un vistazo el ambiente interior vs. exterior.
// Cache de 20 min: el clima no cambia tan rápido y evita pegarle a la API
// en cada refresco del dashboard.
let climaExteriorCache = null; // { temp, hum, ts }
async function obtenerClimaExterior() {
  if (climaExteriorCache && (Date.now() - climaExteriorCache.ts) < 20*60*1000) return climaExteriorCache;
  try {
    const resp = await fetch("https://api.open-meteo.com/v1/forecast?latitude=-34.69&longitude=-58.62&current=temperature_2m,relative_humidity_2m&timezone=America%2FArgentina%2FBuenos_Aires", { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) throw new Error("HTTP "+resp.status);
    const data = await resp.json();
    climaExteriorCache = { temp: data.current?.temperature_2m, hum: data.current?.relative_humidity_2m, ts: Date.now() };
  } catch (err) {
    console.warn("No se pudo traer el clima exterior:", err.message);
  }
  return climaExteriorCache;
}
async function pintarClimaExteriorDashboard() {
  const clima = await obtenerClimaExterior();
  document.querySelectorAll('[id^="dash-clima-ext-val-"]').forEach(el => {
    el.textContent = clima && clima.temp!=null ? `${clima.temp.toFixed(0)}°C · 💧${clima.hum!=null?clima.hum.toFixed(0):'—'}%` : "—";
    el.parentElement.title = "Clima exterior (Villa Luzuriaga)";
  });
}

async function cargarDashboard() {
  const grid = document.getElementById("dashboard-grid");
  grid.innerHTML = '<p class="cargando">Cargando...</p>';
  let snap, estadoTodos;
  try {
    [snap, estadoTodos] = await Promise.all([
      getDocs(query(collection(db,"lugares"), orderBy("creadoEn","desc"))),
      obtenerEstadoTodos(),
    ]);
  } catch (err) {
    console.error("Error cargando dashboard:", err);
    grid.innerHTML = `<p class="empty">⚠️ No se pudo cargar el dashboard (${err.message}). Probá recargar la página.</p>`;
    return;
  }
  grid.innerHTML = "";
  dashboardActivos = {};
  if (snap.empty) { grid.innerHTML = '<p class="empty">No hay lugares creados todavía.</p>'; return; }

  const docsOrdenados = [...snap.docs].sort((a, b) => {
    const luzA = (a.data().switchLuces||[])[0];
    const luzB = (b.data().switchLuces||[])[0];
    return prioridadLuz(estadoTodos[luzA]) - prioridadLuz(estadoTodos[luzB]);
  });

  docsOrdenados.forEach(d => {
    const l = d.data();
    const sensorKey = (l.sensoresTuya||[]).find(s => DISPOSITIVOS_TUYA[s]?.tipo === "sensor");
    const luzKey    = (l.switchLuces||[])[0];
    const tipo      = detectarTipoEstructura(l);
    const svgInicial = tipo === "estructura3x1" ? svgEstructura3x1(false, l.alturaLuces, d.id) : svgCarpa(false, l.alturaLuces, d.id);

    const card = document.createElement("div");
    card.className = "dash-card";
    card.dataset.lugarId = d.id;
    card.innerHTML = `
      <div class="dash-header">
        <span class="dash-nombre">${l.nombre}</span>
        <span class="dash-dim">${l.dimensiones||""}</span>
      </div>
      <div class="dash-body">
        <div class="dash-ilustracion" id="dash-ilus-${d.id}">${svgInicial}<div class="dash-plantas-iconos" id="dash-iconos-${d.id}" data-tipo="${tipo}"></div><div class="dash-clima-ext" id="dash-clima-ext-${d.id}">🌡️<span id="dash-clima-ext-val-${d.id}">…</span></div></div>
        <div class="dash-datos">
          <div class="dash-dato"><div class="valor" id="dash-temp-${d.id}">—</div><div class="label">🌡️ Temp</div></div>
          <div class="dash-dato"><div class="valor" id="dash-hum-${d.id}">—</div><div class="label">💧 Humedad</div></div>
          <div class="dash-dato" id="dash-luz-${d.id}"><div class="label">${luzKey?'Consultando luces...':'Sin luces asociadas'}</div></div>
        </div>
      </div>
      <div class="altura-luces-box dash-altura-luces">
        <label>🔆 Distancia de las luces a las plantas: <span id="altura-luces-dash-val-${d.id}">${l.alturaLuces??70}</span>cm</label>
        <input type="range" min="40" max="140" value="${l.alturaLuces??70}" class="altura-luces-slider"
               oninput="actualizarAlturaLucesDashboard('${d.id}', this.value)"
               onchange="guardarAlturaLuces('${d.id}', this.value)">
      </div>
      <button class="btn-toggle-historial">📋 Ver historial de plantas y fertilización ▾</button>
      <div class="plantas-resumen colapsado" id="dash-plantas-${d.id}"><span class="clima-cargando">🌱 Consultando plantas...</span></div>`;
    grid.appendChild(card);
    card.querySelector(".btn-toggle-historial").addEventListener("click", (e) => {
      const cont = document.getElementById("dash-plantas-"+d.id);
      const oculto = cont.classList.toggle("colapsado");
      e.target.textContent = oculto ? "📋 Ver historial de plantas y fertilización ▾" : "📋 Ocultar historial ▴";
    });
    cargarPlantasResumenCard(d.id, "dash-plantas-"+d.id, "dash-iconos-"+d.id);

    dashboardActivos[d.id] = { sensorKey, luzKey, tipo, alturaLuces: l.alturaLuces };
    refrescarDashboardCard(d.id, sensorKey, luzKey, tipo, l.alturaLuces);
  });
  iniciarAutoRefreshDashboard();
  pintarClimaExteriorDashboard();
}

function iniciarAutoRefreshDashboard() {
  if (dashboardTimer) clearInterval(dashboardTimer);
  dashboardTimer = setInterval(async () => {
    const tareas = Object.entries(dashboardActivos).map(([id, cfg]) => refrescarDashboardCard(id, cfg.sensorKey, cfg.luzKey, cfg.tipo, cfg.alturaLuces));
    await Promise.all(tareas);
    pintarClimaExteriorDashboard();
    reordenarDashboard();
  }, 60 * 1000);
}

function reordenarDashboard() {
  const grid = document.getElementById("dashboard-grid");
  if (!grid) return;
  const tarjetas = Array.from(grid.querySelectorAll(":scope > .dash-card"));
  tarjetas.sort((a, b) => prioridadLuz(estadoLuzActivos[a.dataset.lugarId]) - prioridadLuz(estadoLuzActivos[b.dataset.lugarId]));
  tarjetas.forEach(t => grid.appendChild(t));
}

async function refrescarDashboardCard(lugarId, sensorKey, luzKey, tipo, alturaLuces) {
  const proxyBase = (localStorage.getItem("tuya_proxy") || PROXY_URL).replace(/\/tuya$/, "");

  if (sensorKey) {
    try {
      const resp = await fetch(`${proxyBase}/tuya?device=${sensorKey}`, { signal: AbortSignal.timeout(12000) });
      if (!resp.ok) throw new Error("HTTP "+resp.status);
      const data = await resp.json();
      const s = data.sensores || {};
      const tEl = document.getElementById("dash-temp-"+lugarId);
      const hEl = document.getElementById("dash-hum-"+lugarId);
      if (tEl) { tEl.textContent = s.tempAmb!=null ? s.tempAmb.toFixed(1)+"°C" : "—"; tEl.className = "valor "+claseTemp(s.tempAmb); }
      if (hEl) hEl.textContent = s.humedad!=null ? s.humedad.toFixed(0)+"%" : "—";
    } catch (err) {
      const tEl = document.getElementById("dash-temp-"+lugarId);
      if (tEl) tEl.textContent = "—";
    }
  }

  if (luzKey) {
    try {
      const resp = await fetch(`${proxyBase}/tuya?device=${luzKey}`, { signal: AbortSignal.timeout(12000) });
      if (!resp.ok) throw new Error("HTTP "+resp.status);
      const data = await resp.json();
      const encendido = data.online && !!(data.sensores && data.sensores.encendido);
      estadoLuzActivos[lugarId] = { online: !!data.online, encendido: !!(data.sensores && data.sensores.encendido) };
      const ilusEl = document.getElementById("dash-ilus-"+lugarId);
      if (ilusEl) {
        const svgEl = ilusEl.querySelector("svg");
        const nuevoSvg = tipo === "estructura3x1" ? svgEstructura3x1(encendido, alturaLuces, lugarId) : svgCarpa(encendido, alturaLuces, lugarId);
        if (svgEl) svgEl.outerHTML = nuevoSvg; else ilusEl.insertAdjacentHTML("afterbegin", nuevoSvg);
      }
      const luzEl = document.getElementById("dash-luz-"+lugarId);
      if (luzEl) luzEl.innerHTML = `<div class="label ${data.online ? (encendido?'luz-on':'luz-off') : 'luz-offline'}">${!data.online ? '📴 Fuera de línea' : (encendido?'💡 Encendida':'🌑 Apagada')}</div>`;
    } catch (err) {
      const luzEl = document.getElementById("dash-luz-"+lugarId);
      if (luzEl) luzEl.innerHTML = `<div class="label">Sin datos de luces</div>`;
    }
  }
}


window.verLugar = async (id) => {
  lugarActivo = id;
  show("vista-lugar");
  const snap = await getDoc(doc(db,"lugares",id));
  const l = snap.data();
  const nombreEl = document.getElementById("det-lugar-nombre");
  const dimEl    = document.getElementById("det-lugar-dim");
  if (nombreEl) nombreEl.textContent = l.nombre;
  if (dimEl)    dimEl.textContent    = l.dimensiones||"";
  cargarAreas(id);
  cargarPlantasLugar(id);
};

window.eliminarLugar = async (id, nombre) => {
  if (!confirm(`¿Eliminar "${nombre}"?`)) return;
  await deleteDoc(doc(db,"lugares",id));
  cargarLugares(); toast("Lugar eliminado");
};

// Todos los "form-X" del sitio son <div>, no <form> reales, así que .reset() nunca
// fue válido en ninguno. Esta función limpia a mano cualquiera de ellos.
function resetCamposDiv(containerId) {
  const cont = document.getElementById(containerId);
  if (!cont) return;
  cont.querySelectorAll("input[type='text'], input[type='number'], input[type='date'], input[type='month'], input[type='file'], input:not([type]), textarea")
    .forEach(el => el.value = "");
  cont.querySelectorAll("input[type='checkbox'], input[type='radio']").forEach(el => el.checked = false);
  cont.querySelectorAll("select").forEach(el => el.selectedIndex = 0);
}
function resetFormLugar() { resetCamposDiv("form-lugar"); }

window.guardarLugar = async () => {
  try {
    const luces = [];
    document.querySelectorAll(".luz-row").forEach(row => {
      const tipoEl = row.querySelector(".luz-tipo");
      const cantEl = row.querySelector(".luz-cant");
      if (tipoEl && tipoEl.value) luces.push({ tipo: tipoEl.value, cantidad: parseInt(cantEl?.value)||1 });
    });
    const sensores        = Array.from(document.querySelectorAll(".chk-sensor:checked")).map(c=>c.value);
    const switchesLuces   = Array.from(document.querySelectorAll(".chk-switch-luz:checked")).map(c=>c.value);
    const switchesTurbinas= Array.from(document.querySelectorAll(".chk-switch-turb:checked")).map(c=>c.value);
    const intractorEl     = document.getElementById("l-intractor");
    const extractorEl     = document.getElementById("l-extractor");

    const d = {
      nombre:        val("l-nombre"),
      dimensiones:   val("l-dim"),
      luces,
      sensoresTuya:  sensores,
      switchLuces:   switchesLuces,
      switchTurbinas:switchesTurbinas,
      intractor:     intractorEl ? intractorEl.checked : false,
      extractor:     extractorEl ? extractorEl.checked : false,
      notas:         val("l-notas"),
      creadoEn:      serverTimestamp(),
    };
    if (!d.nombre) { toast("Ingresá un nombre","err"); return; }
    await addDoc(collection(db,"lugares"), d);
    cerrarModal("modal-lugar");
    resetFormLugar();
    document.getElementById("luces-rows").innerHTML = luzRowHTML();
    cargarLugares();
    toast("Lugar guardado ✓");
  } catch(err) {
    console.error("guardarLugar error:", err);
    toast("Error: " + err.message, "err");
  }
};

function luzRowHTML() {
  return `<div class="luz-row">
    <select class="luz-tipo" style="flex:1;background:#0d1a0f;border:1px solid var(--border);color:var(--text);padding:8px;border-radius:6px;font-size:.85rem">
      <option value="">— Seleccionar luz —</option>
      ${LUCES_LISTA.map(l=>`<option value="${l}">${l}</option>`).join("")}
    </select>
    <input class="luz-cant" type="number" min="1" value="1" style="width:60px;background:#0d1a0f;border:1px solid var(--border);color:var(--text);padding:8px;border-radius:6px;font-size:.85rem">
    <button type="button" class="btn-icon" onclick="this.parentElement.remove()">🗑</button>
  </div>`;
}
window.agregarLuzRow = () => {
  document.getElementById("luces-rows").insertAdjacentHTML("beforeend", luzRowHTML());
};

// ════════════════════════════════════════════════════════════════════════════
// ÁREAS
// ════════════════════════════════════════════════════════════════════════════
async function cargarAreas(lugarId) {
  const lista = document.getElementById("lista-areas");
  lista.innerHTML = '<p class="cargando">Cargando...</p>';
  const snap = await getDocs(collection(db,"lugares",lugarId,"areas"));
  lista.innerHTML = "";
  if (snap.empty) { lista.innerHTML = '<p class="empty">Sin áreas. Creá una.</p>'; return; }
  snap.forEach(d => {
    const a = d.data();
    const div = document.createElement("div");
    div.className = "area-card" + (areaActiva===d.id?" activa":"");
    div.innerHTML = `
      <div class="area-header">
        <span class="area-nombre">${a.nombre}</span>
        <span class="area-dim">${a.dimensiones||""}</span>
      </div>
      <div class="lugar-meta"><span>💡 ${(a.luces||[]).map(l=>`${l.cantidad}× ${l.tipo}`).join(", ")||"Sin luces"}</span></div>
      <div class="cult-actions">
        <button class="btn-sm btn-primary" onclick="seleccionarArea('${lugarId}','${d.id}')">Seleccionar</button>
        <button class="btn-sm btn-danger"  onclick="eliminarArea('${lugarId}','${d.id}','${a.nombre}')">Eliminar</button>
      </div>`;
    lista.appendChild(div);
  });
}

window.seleccionarArea = (lugarId, areaId) => {
  lugarActivo = lugarId; areaActiva = areaId;
  document.querySelectorAll(".area-card").forEach(c=>c.classList.remove("activa"));
  event.target.closest(".area-card").classList.add("activa");
  toast("Área seleccionada — ahora podés agregar plantas");
};

window.eliminarArea = async (lugarId, areaId, nombre) => {
  if (!confirm(`¿Eliminar área "${nombre}"?`)) return;
  await deleteDoc(doc(db,"lugares",lugarId,"areas",areaId));
  cargarAreas(lugarId); toast("Área eliminada");
};

window.guardarArea = async () => {
  if (!lugarActivo) { toast("Seleccioná un lugar primero","err"); return; }
  const luces = [];
  document.querySelectorAll(".luz-row-area").forEach(row => {
    const tipo = row.querySelector(".luz-tipo-area").value;
    const cant = parseInt(row.querySelector(".luz-cant-area").value)||1;
    if (tipo) luces.push({ tipo, cantidad: cant });
  });
  const d = {
    nombre:      val("a-nombre"),
    dimensiones: val("a-dim"),
    luces,
    notas:       val("a-notas"),
    creadoEn:    serverTimestamp(),
  };
  if (!d.nombre) { toast("Ingresá un nombre","err"); return; }
  await addDoc(collection(db,"lugares",lugarActivo,"areas"), d);
  cerrarModal("modal-area");
  resetCamposDiv("form-area");
  document.getElementById("luces-rows-area").innerHTML = luzRowAreaHTML();
  cargarAreas(lugarActivo);
  toast("Área guardada ✓");
};

function luzRowAreaHTML() {
  return `<div class="luz-row-area" style="display:flex;gap:8px;margin-bottom:8px;align-items:center">
    <select class="luz-tipo-area" style="flex:1;background:#0d1a0f;border:1px solid var(--border);color:var(--text);padding:8px;border-radius:6px;font-size:.85rem">
      <option value="">— Seleccionar luz —</option>
      ${LUCES_LISTA.map(l=>`<option value="${l}">${l}</option>`).join("")}
    </select>
    <input class="luz-cant-area" type="number" min="1" value="1" style="width:60px;background:#0d1a0f;border:1px solid var(--border);color:var(--text);padding:8px;border-radius:6px;font-size:.85rem">
    <button type="button" class="btn-icon" onclick="this.parentElement.remove()">🗑</button>
  </div>`;
}
window.agregarLuzRowArea = () => {
  document.getElementById("luces-rows-area").insertAdjacentHTML("beforeend", luzRowAreaHTML());
};

// ════════════════════════════════════════════════════════════════════════════
// PLANTAS
// ════════════════════════════════════════════════════════════════════════════
// Tabla global de plantas (todos los lugares juntos). Cada fila se puede
// desplegar tocándola: muestra más datos + botones para cargar medición,
// riego/fertilización o evento sin tener que entrar al detalle completo.
async function cargarTablaPlantas() {
  const tbody = document.getElementById("tabla-plantas-body");
  tbody.innerHTML = '<tr><td colspan="3" class="cargando">Cargando...</td></tr>';
  let lugaresSnap, plantasSnap;
  try {
    [lugaresSnap, plantasSnap] = await Promise.all([
      getDocs(collection(db,"lugares")),
      getDocs(query(collection(db,"plantas"), orderBy("creadoEn","desc"))),
    ]);
  } catch (err) {
    console.error("Error cargando tabla de plantas:", err);
    tbody.innerHTML = `<tr><td colspan="3" class="empty">⚠️ No se pudo cargar (${err.message})</td></tr>`;
    return;
  }
  const nombreLugar = {};
  lugaresSnap.forEach(d => nombreLugar[d.id] = d.data().nombre || "Lugar sin nombre");

  tbody.innerHTML = "";
  if (plantasSnap.empty) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty">Todavía no hay plantas registradas.</td></tr>';
    return;
  }
  plantasSnap.forEach(d => {
    const p = d.data(), id = d.id;
    const fila = document.createElement("tr");
    fila.className = "fila-planta clickeable";
    fila.innerHTML = `
      <td>${escAttr(p.genetica||"—")}<br><small class="fila-planta-nombre">${escAttr(p.nombre||"")}</small></td>
      <td>${escAttr(nombreLugar[p.lugarId]||"—")}</td>
      <td><span class="cult-fase fase-${p.fase}">${FASE_LABEL[p.fase]||p.fase||"—"}</span></td>`;

    const expand = document.createElement("tr");
    expand.className = "fila-planta-expand";
    expand.style.display = "none";
    const td = document.createElement("td");
    td.colSpan = 3;
    td.innerHTML = `
      <div class="fp-detalle">
        <span>📅 Día ${dias(p.fechaInicio)}</span>
        <span>🪴 ${p.tipoOrigen==="semilla"?"Semilla":"Esqueje"}</span>
        ${p.alturaPlantin ? `<span>📏 ${p.alturaPlantin} cm</span>` : ""}
        ${p.substrato ? `<span>🌱 ${escAttr(p.substrato)}</span>` : ""}
      </div>
      <div class="fp-acciones">
        <button class="btn-sm btn-primary fp-medicion">🌡️ Medición</button>
        <button class="btn-sm btn-primary fp-riego">💧 Riego / Fert.</button>
        <button class="btn-sm btn-ghost fp-evento">📅 Evento</button>
        <button class="btn-sm btn-ghost fp-ficha">Ver ficha completa →</button>
      </div>`;
    expand.appendChild(td);

    fila.addEventListener("click", () => {
      const abierta = expand.style.display !== "none";
      document.querySelectorAll(".fila-planta-expand").forEach(f => f.style.display = "none");
      document.querySelectorAll(".fila-planta.activa").forEach(f => f.classList.remove("activa"));
      if (!abierta) { expand.style.display = ""; fila.classList.add("activa"); }
    });
    td.querySelector(".fp-medicion").addEventListener("click", (e) => { e.stopPropagation(); plantaActiva = id; window.abrirModalMedicion(); });
    td.querySelector(".fp-riego").addEventListener("click", (e) => { e.stopPropagation(); window.abrirModalRiegoLugar(p.lugarId, nombreLugar[p.lugarId]||"", id); });
    td.querySelector(".fp-evento").addEventListener("click", (e) => { e.stopPropagation(); plantaActiva = id; window.abrirModalEvento(); });
    td.querySelector(".fp-ficha").addEventListener("click", (e) => { e.stopPropagation(); window.verPlanta(id); });

    tbody.appendChild(fila);
    tbody.appendChild(expand);
  });
}
window.cargarTablaPlantas = cargarTablaPlantas;

async function cargarPlantasLugar(lugarId) {
  const lista = document.getElementById("lista-plantas-lugar");
  lista.innerHTML = '<p class="cargando">Cargando...</p>';
  const snap = await getDocs(query(collection(db,"plantas"), orderBy("creadoEn","desc")));
  lista.innerHTML = "";
  let count = 0;
  snap.forEach(d => {
    const p = d.data();
    if (p.lugarId !== lugarId) return;
    count++;
    const card = document.createElement("div");
    card.className = "planta-card clickeable" + (plantaActiva===d.id?" activa":"");
    card.innerHTML = `
      <div class="cult-header">
        <span class="cult-nombre">${p.nombre}</span>
        <span class="cult-fase fase-${p.fase}">${p.fase}</span>
      </div>
      <div class="cult-meta">
        <span>🧬 ${p.genetica}</span>
        <span>📅 Día ${dias(p.fechaInicio)}</span>
        ${p.alturaPlantin ? `<span>📏 ${p.alturaPlantin} cm</span>` : ""}
      </div>
      <div class="cult-meta">
        <span>🪴 ${p.tipoOrigen==="semilla"?"Semilla":"Esqueje"}</span>
        <span>🌱 ${p.substrato}</span>
        <span>📦 ${p.tamMaceta}L</span>
      </div>
      ${p.areaId ? `<div class="cult-meta"><span>📍 ${p.areaNombre||"Área asignada"}</span></div>`:""}
      <div class="cult-actions">
        <button class="btn-sm btn-ghost btn-editar">✏️ Editar</button>
        <button class="btn-sm btn-danger btn-eliminar">Eliminar</button>
      </div>`;
    // Closures directas (nada de ids embebidos en texto/onclick): elimina de
    // raíz la clase de bug donde un caracter especial en un nombre rompía el
    // atributo HTML y el botón dejaba de responder.
    card.querySelector(".btn-editar").addEventListener("click", (e) => { e.stopPropagation(); window.editarPlanta(d.id); });
    card.querySelector(".btn-eliminar").addEventListener("click", (e) => { e.stopPropagation(); window.eliminarPlanta(d.id, p.nombre||""); });
    card.addEventListener("click", () => window.verPlanta(d.id));
    lista.appendChild(card);
  });
  if (!count) lista.innerHTML = '<p class="empty">Sin plantas en este lugar.</p>';
}

window.abrirModalPlantaNueva = () => {
  plantaEditando = null;
  resetCamposDiv("form-planta");
  const t = document.getElementById("modal-planta-titulo");
  if (t) t.textContent = "🌱 Nueva planta";
  abrirModal("modal-planta");
};

window.editarPlanta = async (id) => {
  const snap = await getDoc(doc(db,"plantas",id));
  if (!snap.exists()) { toast("La planta ya no existe","err"); return; }
  const p = snap.data();
  plantaEditando = id;
  val("p-nombre",    p.nombre||"");
  val("p-genetica",  p.genetica||"");
  val("p-origen",    p.tipoOrigen||"semilla");
  val("p-fecha",     p.fechaInicio ? (p.fechaInicio.toDate?p.fechaInicio.toDate():new Date(p.fechaInicio)).toISOString().slice(0,10) : "");
  val("p-fase",      p.fase||"");
  val("p-altura",    p.alturaPlantin||"");
  val("p-substrato", p.substrato||"");
  val("p-maceta",    p.tamMaceta||"");
  val("p-riego",     p.sistemaRiego||"");
  val("p-notas",     p.notas||"");
  const t = document.getElementById("modal-planta-titulo");
  if (t) t.textContent = "✏️ Editar planta";
  abrirModal("modal-planta");
};
window.editarPlantaActiva = () => window.editarPlanta(plantaActiva);

// Setter null-safe: si el elemento no está en el DOM (ej. caché vieja del
// navegador sirviendo un HTML desactualizado respecto al JS), avisa por
// consola en vez de tirar abajo toda la función a mitad de camino.
function setTxt(id, valor) {
  const el = document.getElementById(id);
  if (el) el.textContent = valor;
  else console.warn(`setTxt: no encontré #${id} en el DOM (¿caché vieja? probá Ctrl+Shift+R)`);
}

// Panel lateral rápido: se abre al tocar una planta en el Dashboard, sin
// navegar a la ficha completa. Muestra edad/fase + carrusel de fotos, que se
// van sumando cada vez que se carga una medición con foto adjunta.
window.abrirPanelPlanta = async (id) => {
  panelPlantaActiva = id;
  plantaActiva = id; // así "Cargar medición" ya sabe sobre qué planta escribir
  const overlay = document.getElementById("panel-planta-overlay");
  overlay.classList.add("abierto");
  document.getElementById("panel-planta-info").innerHTML = '<p class="cargando">Cargando...</p>';
  const btnFicha = document.getElementById("panel-planta-ficha-btn");
  if (btnFicha) btnFicha.onclick = () => { cerrarPanelPlanta(); window.verPlanta(id); };
  try {
    const snap = await getDoc(doc(db,"plantas",id));
    if (!snap.exists()) { cerrarPanelPlanta(); toast("Esa planta ya no existe","err"); return; }
    const p = snap.data();
    document.getElementById("panel-planta-info").innerHTML = `
      <h3>${escAttr(p.genetica||p.nombre||"Planta")}</h3>
      <p class="panel-planta-sub">${escAttr(p.nombre||"")}</p>
      <div class="panel-planta-chips">
        <span class="cult-fase fase-${p.fase}">${FASE_LABEL[p.fase]||p.fase||"—"}</span>
        <span class="chip-dato">📅 Día ${dias(p.fechaInicio)}</span>
        <span class="chip-dato">🪴 ${p.tipoOrigen==="semilla"?"Semilla":"Esqueje"}</span>
      </div>`;
  } catch (err) {
    console.error("Error abriendo panel de planta:", err);
    document.getElementById("panel-planta-info").innerHTML = `<p class="empty">⚠️ No se pudo cargar (${err.message})</p>`;
  }
  actualizarFotosPanel();
};

async function actualizarFotosPanel() {
  if (!panelPlantaActiva) return;
  const cont = document.getElementById("panel-planta-fotos");
  cont.innerHTML = '<div class="panel-planta-foto-vacia">Cargando fotos...</div>';
  try {
    const snap = await getDocs(query(collection(db,"plantas",panelPlantaActiva,"mediciones"),orderBy("fecha","desc")));
    const fotos = [];
    snap.forEach(d => { const f = d.data().fotoUrl; if (f) fotos.push(f); });
    cont.innerHTML = fotos.length
      ? fotos.map(url => `<img src="${url}" loading="lazy" alt="Foto de la planta">`).join("")
      : '<div class="panel-planta-foto-vacia">📷 Sin fotos todavía<br><small>Se suben desde "Cargar medición"</small></div>';
  } catch (err) {
    console.error("Error cargando fotos del panel:", err);
    cont.innerHTML = '<div class="panel-planta-foto-vacia">⚠️ No se pudieron cargar las fotos</div>';
  }
}
window.actualizarFotosPanel = actualizarFotosPanel;

window.cerrarPanelPlanta = () => {
  document.getElementById("panel-planta-overlay").classList.remove("abierto");
  panelPlantaActiva = null;
};

window.verPlanta = async (id) => {
  try {
    const snap = await getDoc(doc(db,"plantas",id));
    if (!snap.exists()) { toast("Esa planta ya no existe (¿se borró?)","err"); return; }
    plantaActiva = id;
    const p = snap.data();
    setTxt("det-nombre",    p.nombre||"—");
    setTxt("det-genetica",  p.genetica||"—");
    setTxt("det-fase",      p.fase||"—");
    setTxt("det-origen",    p.tipoOrigen==="semilla"?"Semilla":"Esqueje");
    setTxt("det-inicio",    fmt(p.fechaInicio));
    setTxt("det-dia",       `Día ${dias(p.fechaInicio)}`);
    setTxt("det-substrato", p.substrato||"—");
    setTxt("det-maceta",    (p.tamMaceta||"—")+"L");
    setTxt("det-riego",     p.sistemaRiego||"—");
    setTxt("det-altura",    p.alturaPlantin ? p.alturaPlantin+" cm" : "—");
    setTxt("det-notas",     p.notas||"Sin notas");
    show("vista-planta");
    await cargarSelectorPlanta(p.lugarId, id);
    cargarMediciones(); cargarEventos(); cargarNutricion();
  } catch (err) {
    console.error("verPlanta:", err);
    toast("No se pudo abrir el detalle: "+err.message, "err");
  }
};

// Selector manual, siempre visible arriba del detalle: permite elegir a qué
// planta del mismo lugar se le va a cargar una medición/evento sin depender
// de volver a la lista y clickear la card correcta.
async function cargarSelectorPlanta(lugarId, idActual) {
  const sel = document.getElementById("selector-planta-activa");
  if (!sel || !lugarId) return;
  const snap = await getDocs(query(collection(db,"plantas"), orderBy("creadoEn","desc")));
  const opts = [];
  snap.forEach(d => { if (d.data().lugarId===lugarId) opts.push(`<option value="${d.id}" ${d.id===idActual?"selected":""}>${escAttr(d.data().nombre)}</option>`); });
  sel.innerHTML = opts.join("");
}
window.cambiarPlantaSeleccionada = () => {
  const sel = document.getElementById("selector-planta-activa");
  if (sel && sel.value) window.verPlanta(sel.value);
};

window.eliminarPlanta = async (id, nombre) => {
  if (!confirm(`¿Eliminar "${nombre}"?`)) return;
  await deleteDoc(doc(db,"plantas",id));
  if (plantaActiva===id) { plantaActiva=null; }
  if (lugarActivo) cargarPlantasLugar(lugarActivo);
  toast("Planta eliminada");
};

window.guardarPlanta = async () => {
  // Obtener nombre del área si hay una seleccionada
  let areaNombre = "";
  if (lugarActivo && areaActiva) {
    const aSnap = await getDoc(doc(db,"lugares",lugarActivo,"areas",areaActiva));
    if (aSnap.exists()) areaNombre = aSnap.data().nombre;
  }
  const d = {
    nombre:       val("p-nombre"),
    genetica:     val("p-genetica"),
    tipoOrigen:   val("p-origen"),
    fechaInicio:  new Date(val("p-fecha")+"T00:00:00"),
    fase:         val("p-fase"),
    substrato:    val("p-substrato"),
    tamMaceta:    val("p-maceta"),
    sistemaRiego: val("p-riego"),
    alturaPlantin:val("p-altura"),
    notas:        val("p-notas"),
  };
  if (!d.nombre||!d.genetica) { toast("Completá nombre y genética","err"); return; }

  if (plantaEditando) {
    await updateDoc(doc(db,"plantas",plantaEditando), d);
    toast("Planta actualizada ✓");
  } else {
    if (!lugarActivo) { toast("Seleccioná un lugar primero","err"); return; }
    d.lugarId  = lugarActivo;
    d.areaId   = areaActiva||"";
    d.areaNombre = areaNombre;
    d.creadoEn = serverTimestamp();
    await addDoc(collection(db,"plantas"), d);
    toast("Planta registrada ✓");
  }
  plantaEditando = null;
  cerrarModal("modal-planta");
  resetCamposDiv("form-planta");
  if (lugarActivo) cargarPlantasLugar(lugarActivo);
  if (plantaActiva) verPlanta(plantaActiva); // refresca el detalle si estabas viéndolo
};

// ════════════════════════════════════════════════════════════════════════════
// MEDICIONES
// ════════════════════════════════════════════════════════════════════════════
// Fecha/hora local en formato para <input type=date>/<input type=time>,
// respetando el huso horario del navegador (no UTC) — así "ahora" es
// realmente ahora en Buenos Aires y no se corre un día/horas.
function fechaHoraLocalInputs() {
  const n = new Date();
  const pad = x => String(x).padStart(2,"0");
  return {
    fecha: `${n.getFullYear()}-${pad(n.getMonth()+1)}-${pad(n.getDate())}`,
    hora:  `${pad(n.getHours())}:${pad(n.getMinutes())}`,
  };
}
window.abrirModalMedicion = async () => {
  resetCamposDiv("form-medicion");
  const { fecha, hora } = fechaHoraLocalInputs();
  val("m-fecha", fecha); val("m-hora", hora);
  abrirModal("modal-medicion");
  // Autocompletar con la lectura actual del sensor del lugar de esta planta
  // (antes había que ir a Sensores y usar "Importar" a mano).
  if (plantaActiva) {
    try {
      const pSnap = await getDoc(doc(db,"plantas",plantaActiva));
      if (pSnap.exists()) {
        const lSnap = await getDoc(doc(db,"lugares",pSnap.data().lugarId));
        const sensorKey = (lSnap.data()?.sensoresTuya||[]).find(s => DISPOSITIVOS_TUYA[s]?.tipo === "sensor");
        if (sensorKey) {
          const data = await consultarDispositivo(sensorKey);
          const s = data.sensores || {};
          if (s.tempAmb != null) val("m-tempamb", s.tempAmb);
          if (s.humedad != null) val("m-humedad", s.humedad);
        }
      }
    } catch (err) { console.warn("No se pudo autocompletar desde el sensor:", err.message); }
  }
};
window.abrirModalEvento = () => {
  resetCamposDiv("form-evento");
  const { fecha, hora } = fechaHoraLocalInputs();
  val("ev-fecha", fecha); val("ev-hora", hora);
  abrirModal("modal-evento");
};

async function cargarMediciones() {
  if (!plantaActiva) return;
  const lista = document.getElementById("lista-mediciones");
  lista.innerHTML = '<p class="cargando">Cargando...</p>';
  const snap = await getDocs(query(collection(db,"plantas",plantaActiva,"mediciones"),orderBy("fecha","desc")));
  lista.innerHTML = "";
  if (snap.empty) { lista.innerHTML = '<p class="empty">Sin mediciones.</p>'; return; }
  snap.forEach(d => {
    const m = d.data();
    const row = document.createElement("div");
    row.className = "med-row";
    row.innerHTML = `
      <span class="med-fecha">${fmt(m.fecha)}</span>
      <span class="med-val">🌡️ ${m.tempAmb??'—'}<small>°C</small></span>
      <span class="med-val">💧 ${m.humedad??'—'}<small>%</small></span>
      <span class="med-val">⚗️ pH ${m.ph??'—'}</span>
      <span class="med-val">🔋 ${m.ec??'—'}<small>EC</small></span>
      <span class="med-val">☀️ ${m.luz??'—'}<small>lux</small></span>
      <span class="med-val">🔆 ${m.ppfd??'—'}<small>PPFD</small></span>
      <span class="med-val">📏 ${m.distanciaLuz??'—'}<small>cm luz</small></span>
      <span class="med-val">🪴 ${m.tempMaceta??'—'}<small>°C</small></span>
      <span class="med-val">💨 ${m.co2??'—'}<small>ppm</small></span>
      <button class="btn-icon" onclick="eliminarMedicion('${d.id}')">🗑</button>`;
    lista.appendChild(row);
  });
}
window.guardarMedicion = async () => {
  if (!plantaActiva) { toast("Seleccioná una planta primero","err"); return; }
  const btnGuardar = document.querySelector('#modal-medicion .btn-primary');
  const archivo = document.getElementById("m-foto")?.files?.[0] || null;
  if (btnGuardar) { btnGuardar.disabled = true; btnGuardar.textContent = archivo ? "Subiendo foto..." : "Guardando..."; }
  try {
    const d = {
      fecha:      new Date(val("m-fecha")+"T"+(val("m-hora")||"12:00")+":00"),
      tempAmb:    parseFloat(val("m-tempamb"))||null,
      tempMaceta: parseFloat(val("m-tempmac"))||null,
      humedad:    parseFloat(val("m-humedad"))||null,
      ph:         parseFloat(val("m-ph"))||null,
      ec:         parseFloat(val("m-ec"))||null,
      tdsAgua:    parseFloat(val("m-tds"))||null,
      luz:        parseFloat(val("m-luz"))||null,
      ppfd:       parseFloat(val("m-ppfd"))||null,
      distanciaLuz: parseFloat(val("m-distancia"))||null,
      co2:        parseFloat(val("m-co2"))||null,
      vpd:        parseFloat(val("m-vpd"))||null,
      notas:      val("m-notas"),
      creadoEn:   serverTimestamp(),
    };
    if (archivo) {
      d.fotoUrl = await subirFotoCloudinary(archivo);
    }
    await addDoc(collection(db,"plantas",plantaActiva,"mediciones"),d);
    cerrarModal("modal-medicion");
    resetCamposDiv("form-medicion");
    cargarMediciones(); toast("Medición guardada ✓");
    // Si el panel lateral de esta misma planta está abierto, refresca el carrusel.
    if (typeof actualizarFotosPanel === "function" && panelPlantaActiva === plantaActiva) actualizarFotosPanel();
  } catch (err) {
    console.error("Error guardando medición:", err);
    toast("No se pudo guardar la medición: "+err.message, "err");
  } finally {
    if (btnGuardar) { btnGuardar.disabled = false; btnGuardar.textContent = "Guardar medición"; }
  }
};
window.eliminarMedicion = async (id) => {
  if (!confirm("¿Eliminar medición?")) return;
  await deleteDoc(doc(db,"plantas",plantaActiva,"mediciones",id));
  cargarMediciones(); toast("Eliminada");
};

// ════════════════════════════════════════════════════════════════════════════
// RIEGO/FERTILIZACIÓN A NIVEL DE LUGAR (elegís qué plantas lo recibieron)
// ════════════════════════════════════════════════════════════════════════════
let rlLugarId = null;

window.abrirModalRiegoLugar = async (lugarId, lugarNombre, soloPlantaId) => {
  rlLugarId = lugarId;
  const t = document.getElementById("rl-titulo");
  if (t) t.textContent = `💧 Registrar riego / fertilización — ${lugarNombre}`;
  resetCamposDiv("form-riego-lugar");
  const { fecha, hora } = fechaHoraLocalInputs();
  val("rl-fecha", fecha); val("rl-hora", hora);

  const cont = document.getElementById("rl-plantas");
  cont.innerHTML = '<span class="cargando">Cargando plantas...</span>';
  try {
    const snap = await getDocs(query(collection(db,"plantas"), where("lugarId","==",lugarId)));
    const filas = [];
    snap.forEach(d => {
      const marcada = soloPlantaId ? d.id===soloPlantaId : true;
      filas.push(`<label class="chk-pill"><input type="checkbox" value="${d.id}" ${marcada?"checked":""}> ${escAttr(d.data().nombre)}</label>`);
    });
    cont.innerHTML = filas.length
      ? `<div class="chk-pill-label">${soloPlantaId ? "Tildá también otras plantas de este lugar si corresponde:" : "Todas tildadas por defecto, destildá las que no correspondan:"}</div>${filas.join("")}`
      : '<span class="empty">Este lugar todavía no tiene plantas registradas.</span>';
  } catch (err) {
    cont.innerHTML = `<span class="empty">⚠️ No se pudieron cargar las plantas (${err.message})</span>`;
  }
  abrirModal("modal-riego-lugar");
};

window.guardarRiegoLugar = async () => {
  const idsPlantas = Array.from(document.querySelectorAll("#rl-plantas input:checked")).map(el=>el.value);
  if (!idsPlantas.length) { toast("Marcá al menos una planta","err"); return; }
  const horaVal = val("rl-hora") || "12:00";
  const fechaHora = new Date(val("rl-fecha")+"T"+horaVal+":00");
  if (isNaN(fechaHora.getTime())) { toast("Revisá la fecha","err"); return; }

  const tipo = val("rl-tipo");
  const detalle = val("rl-detalle");
  const ec = parseFloat(val("rl-ec")) || null;
  const ppfd = parseFloat(val("rl-ppfd")) || null;
  const iconoTipo = { riego:"💧 Riego", fertilizacion:"🌿 Fertilización", tratamiento:"🛡️ Tratamiento", otro:"📝 Nota" }[tipo] || tipo;

  let creados = 0;
  for (const pid of idsPlantas) {
    await addDoc(collection(db,"plantas",pid,"eventos"), {
      titulo: detalle ? `${iconoTipo}: ${detalle.slice(0,60)}` : iconoTipo,
      tipo, fecha: fechaHora,
      hora: `${String(fechaHora.getHours()).padStart(2,"0")}:${String(fechaHora.getMinutes()).padStart(2,"0")}`,
      descripcion: detalle,
      ec, ppfd,
      realizado: fechaHora.getTime() <= Date.now(),
      creadoEn: serverTimestamp(),
    });
    creados++;
  }
  cerrarModal("modal-riego-lugar");
  toast(`Registrado en ${creados} planta${creados>1?"s":""} ✓`);
  if (plantaActiva && idsPlantas.includes(plantaActiva)) cargarEventos();
};

// ════════════════════════════════════════════════════════════════════════════
// EVENTOS
// ════════════════════════════════════════════════════════════════════════════
async function cargarEventos() {
  if (!plantaActiva) return;
  const lista = document.getElementById("lista-eventos");
  lista.innerHTML = '<p class="cargando">Cargando...</p>';
  const snap = await getDocs(query(collection(db,"plantas",plantaActiva,"eventos"),orderBy("fecha","desc")));
  lista.innerHTML = "";
  if (snap.empty) { lista.innerHTML = '<p class="empty">Sin eventos.</p>'; return; }
  snap.forEach(d => {
    const e = d.data();
    const row = document.createElement("div");
    row.className = `evento-row tipo-${e.tipo}`;
    const iconos = {riego:"💧",fertilizacion:"⚗️",poda:"✂️",transplante:"🪴",cambio_fase:"🌿",cosecha:"🌾",inspeccion:"🔍",tratamiento:"💊",otro:"📌"};
    row.innerHTML = `
      <span class="ev-icon">${iconos[e.tipo]||"📌"}</span>
      <div class="ev-body">
        <strong>${e.titulo}</strong>
        <small>${fmt(e.fecha)} ${e.hora||""}</small>
        ${e.descripcion?`<p>${e.descripcion}</p>`:""}
        ${(e.ec!=null||e.ppfd!=null)?`<p class="ev-medidas">${e.ec!=null?`🧪 EC ${e.ec}`:""} ${e.ppfd!=null?`🔆 PPFD ${e.ppfd}`:""}</p>`:""}
      </div>
      <div class="ev-acciones">
        <span>${e.realizado?"✅":"⏳"}</span>
        <button class="btn-icon" onclick="toggleEvento('${d.id}',${!e.realizado})">${e.realizado?"↩":"✓"}</button>
        <button class="btn-icon" onclick="eliminarEvento('${d.id}')">🗑</button>
      </div>`;
    lista.appendChild(row);
  });
}
window.guardarEvento = async () => {
  if (!plantaActiva) { toast("Seleccioná una planta","err"); return; }
  const horaVal = val("ev-hora") || "12:00";
  const fechaHora = new Date(val("ev-fecha")+"T"+horaVal+":00");
  const d = {
    titulo:      val("ev-titulo"),
    tipo:        val("ev-tipo"),
    fecha:       fechaHora,
    hora:        horaVal,
    descripcion: val("ev-desc"),
    // Si la fecha/hora cargada ya pasó, se registra directamente como
    // realizado (es una bitácora de algo que ya sucedió, no una tarea a
    // futuro); si es una fecha futura queda pendiente como agenda.
    realizado:   fechaHora.getTime() <= Date.now(),
    creadoEn:    serverTimestamp(),
  };
  if (!d.titulo) { toast("Ingresá un título","err"); return; }
  await addDoc(collection(db,"plantas",plantaActiva,"eventos"),d);
  cerrarModal("modal-evento");
  resetCamposDiv("form-evento");
  cargarEventos(); toast("Evento guardado ✓");
};
window.toggleEvento = async (id, estado) => {
  await updateDoc(doc(db,"plantas",plantaActiva,"eventos",id),{realizado:estado});
  cargarEventos();
};
window.eliminarEvento = async (id) => {
  if (!confirm("¿Eliminar evento?")) return;
  await deleteDoc(doc(db,"plantas",plantaActiva,"eventos",id));
  cargarEventos(); toast("Eliminado");
};

// ════════════════════════════════════════════════════════════════════════════
// NUTRICIÓN
// ════════════════════════════════════════════════════════════════════════════
async function cargarNutricion() {
  if (!plantaActiva) return;
  const lista = document.getElementById("lista-nutricion");
  lista.innerHTML = '<p class="cargando">Cargando...</p>';
  const snap = await getDocs(query(collection(db,"plantas",plantaActiva,"nutricion"),orderBy("semana","asc")));
  lista.innerHTML = "";
  if (snap.empty) { lista.innerHTML = '<p class="empty">Sin plan nutricional.</p>'; return; }
  snap.forEach(d => {
    const n = d.data();
    const row = document.createElement("div");
    row.className = "nutr-row";
    row.innerHTML = `
      <div class="nutr-sem">Sem ${n.semana}</div>
      <div class="nutr-body">
        <strong>${n.fase||""}</strong>
        <div class="nutr-productos">
          ${(n.productos||[]).map(p=>`<span class="nutr-tag">${p.nombre}: <b>${p.dosis}</b> ${p.unidad}</span>`).join("")}
        </div>
        ${n.notas?`<small>${n.notas}</small>`:""}
      </div>
      <button class="btn-icon" onclick="eliminarNutricion('${d.id}')">🗑</button>`;
    lista.appendChild(row);
  });
}
window.guardarNutricion = async () => {
  if (!plantaActiva) { toast("Seleccioná una planta","err"); return; }
  let productos = [];
  try {
    productos = val("nutr-productos").split("\n").filter(l=>l.trim()).map(l => {
      const p = l.split(","); return { nombre:p[0]?.trim(), dosis:p[1]?.trim(), unidad:p[2]?.trim()||"ml/L" };
    });
  } catch(e){}
  const d = {
    semana:     parseInt(val("nutr-semana"))||1,
    fase:       val("nutr-fase"),
    productos,
    phAgua:     parseFloat(val("nutr-ph"))||null,
    ecObjetivo: parseFloat(val("nutr-ec"))||null,
    notas:      val("nutr-notas"),
    creadoEn:   serverTimestamp(),
  };
  await addDoc(collection(db,"plantas",plantaActiva,"nutricion"),d);
  cerrarModal("modal-nutricion");
  resetCamposDiv("form-nutricion");
  cargarNutricion(); toast("Semana nutricional guardada ✓");
};
window.eliminarNutricion = async (id) => {
  if (!confirm("¿Eliminar?")) return;
  await deleteDoc(doc(db,"plantas",plantaActiva,"nutricion",id));
  cargarNutricion();
};

// ════════════════════════════════════════════════════════════════════════════
// INASE
// ════════════════════════════════════════════════════════════════════════════
async function cargarInase() {
  if (!plantaActiva) return;
  const lista = document.getElementById("lista-inase");
  lista.innerHTML = '<p class="cargando">Cargando...</p>';
  const snap = await getDocs(query(collection(db,"plantas",plantaActiva,"inase"),orderBy("creadoEn","desc")));
  lista.innerHTML = "";
  if (snap.empty) { lista.innerHTML = '<p class="empty">Sin registros INASE.</p>'; return; }
  snap.forEach(d => {
    const r = d.data();
    const row = document.createElement("div");
    row.className = "inase-row";
    row.innerHTML = `
      <div class="inase-header">
        <span class="inase-tipo">${r.tipoRegistro}</span>
        <span class="inase-fecha">${fmt(r.fecha)}</span>
      </div>
      <div class="inase-body">
        <div><b>N° INASE:</b> ${r.nroRegistro||"—"}</div>
        <div><b>Variedad:</b> ${r.variedad||"—"}</div>
        <div><b>Categoría:</b> ${r.categoria||"—"}</div>
        <div><b>Proveedor:</b> ${r.proveedor||"—"}</div>
        <div><b>N° lote:</b> ${r.nroLote||"—"}</div>
        <div><b>Cantidad:</b> ${r.cantidad||"—"} ${r.unidadCantidad||""}</div>
        <div><b>Superficie:</b> ${r.superficie||"—"} m²</div>
        <div><b>Destino:</b> ${r.destino||"—"}</div>
      </div>
      <button class="btn-icon" onclick="eliminarInase('${d.id}')">🗑</button>`;
    lista.appendChild(row);
  });
}
window.guardarInase = async () => {
  if (!plantaActiva) { toast("Seleccioná una planta","err"); return; }
  const d = {
    tipoRegistro:   val("in-tipo"),
    fecha:          new Date(val("in-fecha")+"T00:00:00"),
    nroRegistro:    val("in-nro"),
    variedad:       val("in-variedad"),
    categoria:      val("in-categoria"),
    proveedor:      val("in-proveedor"),
    nroLote:        val("in-lote"),
    cantidad:       val("in-cantidad"),
    unidadCantidad: val("in-unidad"),
    superficie:     val("in-superficie"),
    destino:        val("in-destino"),
    responsable:    val("in-responsable"),
    observaciones:  val("in-obs"),
    creadoEn:       serverTimestamp(),
  };
  if (!d.tipoRegistro) { toast("Seleccioná tipo","err"); return; }
  await addDoc(collection(db,"plantas",plantaActiva,"inase"),d);
  cerrarModal("modal-inase");
  resetCamposDiv("form-inase");
  cargarInase(); toast("Registro INASE guardado ✓");
};
window.eliminarInase = async (id) => {
  if (!confirm("¿Eliminar?")) return;
  await deleteDoc(doc(db,"plantas",plantaActiva,"inase",id));
  cargarInase();
};

// ════════════════════════════════════════════════════════════════════════════
// TUYA – sensores y switches
// ════════════════════════════════════════════════════════════════════════════
const TEMP_CODES = new Set(["va_temperature","temp_current","temperature","temp_indoor"]);
const CODIGO_MAP = {
  va_temperature:"tempAmb", temp_current:"tempAmb", temperature:"tempAmb", temp_indoor:"tempAmb",
  va_humidity:"humedad", humidity_value:"humedad", humidity:"humedad", hum_indoor:"humedad",
  co2_value:"co2", co2:"co2",
  battery_percentage:"bateria",
};

async function consultarDispositivo(deviceId) {
  const proxy = localStorage.getItem("tuya_proxy") || PROXY_URL;
  const resp  = await fetch(`${proxy}?device=${deviceId}`, { signal: AbortSignal.timeout(12000) });
  if (!resp.ok) throw new Error("HTTP "+resp.status);
  return await resp.json();
}

window.actualizarSensores = async () => {
  document.getElementById("tuya-estado").textContent = "Actualizando...";
  let errores = 0;

  for (const [key, dev] of Object.entries(DISPOSITIVOS_TUYA)) {
    if (dev.tipo === "switch") {
      const el = document.getElementById("switch-estado-"+key);
      if (!el) continue;
      try {
        const data = await consultarDispositivo(dev.id);
        el.innerHTML = htmlEstadoLuz(data);
      } catch (err) {
        el.innerHTML = `<span class="clima-error">Error: ${err.message}</span>`;
        errores++;
      }
      continue;
    }
    if (dev.tipo !== "sensor") continue;
    const card = document.getElementById("sensor-"+key);
    if (!card) continue;
    try {
      const data = await consultarDispositivo(dev.id);
      const s    = data.sensores || {};
      const temp = s.tempAmb ?? null;
      const hum  = s.humedad ?? null;
      const tEl = card.querySelector(".s-temp"), hEl = card.querySelector(".s-hum");
      if (tEl) tEl.textContent = temp !== null ? temp.toFixed(1) : "—";
      if (hEl) hEl.textContent = hum  !== null ? hum.toFixed(0)  : "—";
      const onlineEl = card.querySelector(".s-online");
      if (onlineEl) onlineEl.innerHTML = data.online ? `<span class="luz-on">🟢 En línea</span>` : `<span class="luz-offline">📴 Fuera de línea</span>`;
      if (temp !== null && hum !== null) {
        const svp = 0.6108 * Math.exp((17.27*temp)/(temp+237.3));
        const vpd = (svp*(1-hum/100)).toFixed(2);
        const vpdValEl = card.querySelector(".s-vpd");
        if (vpdValEl) vpdValEl.textContent = vpd;
        const vpdEl = card.querySelector(".s-vpd-tag");
        if (vpdEl) {
          if (vpd<0.4)      { vpdEl.textContent="Muy bajo 🔵"; vpdEl.className="vpd-tag vpd-bajo"; }
          else if (vpd<0.8) { vpdEl.textContent="Óptimo 🟢";   vpdEl.className="vpd-tag vpd-ok";  }
          else if (vpd<1.2) { vpdEl.textContent="Bueno 🟡";    vpdEl.className="vpd-tag vpd-bien";}
          else if (vpd<1.6) { vpdEl.textContent="Alto 🟠";     vpdEl.className="vpd-tag vpd-alto";}
          else              { vpdEl.textContent="Crítico 🔴";   vpdEl.className="vpd-tag vpd-crit";}
        }
      }
      // Alertas
      const alertas = [];
      if (temp!==null&&temp>28) alertas.push("🌡️ Temp alta");
      if (temp!==null&&temp<16) alertas.push("🌡️ Temp baja");
      if (hum!==null&&hum>70)   alertas.push("💧 Humedad alta");
      if (hum!==null&&hum<40)   alertas.push("💧 Humedad baja");
      const alertasEl = card.querySelector(".s-alertas");
      if (alertasEl) alertasEl.innerHTML = alertas.length
        ? alertas.map(a=>`<span class="alerta-tag">${a}</span>`).join("")
        : '<span class="alerta-ok">✅ Rango OK</span>';
      const tsEl = card.querySelector(".s-ts");
      if (tsEl) tsEl.textContent = new Date().toLocaleTimeString("es-AR");
    } catch(err) {
      const tEl = card.querySelector(".s-temp"), hEl = card.querySelector(".s-hum"), tsEl = card.querySelector(".s-ts");
      if (tEl) tEl.textContent = "—";
      if (hEl) hEl.textContent = "—";
      if (tsEl) tsEl.textContent = "Error: "+err.message;
      errores++;
    }
  }
  document.getElementById("tuya-estado").textContent = errores ? `${errores} sensor(es) con error` : `Actualizado ${new Date().toLocaleTimeString("es-AR")}`;
};

window.iniciarAutoRefresh = () => {
  const mins = parseInt(document.getElementById("tuya-refresh").value)||5;
  if (tuyaTimer) clearInterval(tuyaTimer);
  tuyaTimer = setInterval(actualizarSensores, mins*60*1000);
  actualizarSensores();
  toast(`Auto cada ${mins} min ✓`);
};
window.detenerAutoRefresh = () => {
  if (tuyaTimer) { clearInterval(tuyaTimer); tuyaTimer=null; }
  toast("Auto-refresh detenido");
};

window.importarDesde = (key) => {
  const card = document.getElementById("sensor-"+key);
  if (!card) return;
  const temp = card.querySelector(".s-temp").textContent;
  const hum  = card.querySelector(".s-hum").textContent;
  if (temp==="—"&&hum==="—") { toast("Sin datos del sensor","err"); return; }
  if (!plantaActiva) { toast("Seleccioná una planta primero","err"); return; }
  if (temp!=="—") document.getElementById("m-tempamb").value = temp;
  if (hum !=="—") document.getElementById("m-humedad").value = hum;
  document.getElementById("m-fecha").value = new Date().toISOString().split("T")[0];
  document.getElementById("m-hora").value  = new Date().toTimeString().slice(0,5);
  abrirModal("modal-medicion");
  toast("Datos importados a medición");
};

// ─── INIT ─────────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  show("vista-dashboard");
  cargarCatalogoDispositivos().finally(() => cargarDashboard());
  localStorage.setItem("tuya_proxy", PROXY_URL);

  const hoy = new Date().toISOString().split("T")[0];
  ["p-fecha","m-fecha","ev-fecha","in-fecha"].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = hoy;
  });
  document.getElementById("m-hora").value = new Date().toTimeString().slice(0,5);

  // Tabs planta
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("activo"));
      document.querySelectorAll(".tab-panel").forEach(p=>p.classList.remove("activo"));
      btn.classList.add("activo");
      document.getElementById("tab-"+tab).classList.add("activo");
      if (tab==="inase") cargarInase();
    });
  });

  // Iniciar sensores al cargar vista Tuya
  document.querySelectorAll('[data-vista="vista-tuya"]')?.forEach(b => {
    b.addEventListener("click", () => setTimeout(actualizarSensores, 300));
  });
});

window.show = show;
window.abrirModal = abrirModal;
window.cerrarModal = cerrarModal;
window.cargarGraficoDia = cargarGraficoDia;
window.cargarHistoricoLargoLugar = cargarHistoricoLargoLugar;
window.cargarLugares = cargarLugares;
window.cargarDashboard = cargarDashboard;

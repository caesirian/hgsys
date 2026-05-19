// ============================================================
// IMPORTACIÓN TREN SARMIENTO → FIRESTORE
// Cronograma oficial vigente desde 09/03/2026
// Fuente: SOFSE / Trenes Argentinos
// ============================================================

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  writeBatch,
} from "firebase/firestore";

// ── Configuración de Firebase ─────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyAZ83BcBLEvVJ1G7hFvI_cqhLSKJpRsH7c",
  authDomain:        "tren-sarmiento-en-linea.firebaseapp.com",
  databaseURL:       "https://tren-sarmiento-en-linea-default-rtdb.firebaseio.com",
  projectId:         "tren-sarmiento-en-linea",
  storageBucket:     "tren-sarmiento-en-linea.firebasestorage.app",
  messagingSenderId: "712333767897",
  appId:             "1:712333767897:web:c9557e3f2299c9806dfac8",
  measurementId:     "G-BTW3JDC9DD",
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ============================================================
// BASE DE DATOS — TREN SARMIENTO
// ============================================================

const LINEAS = {
  sarmiento: {
    id: "sarmiento",
    nombre: "Línea Sarmiento",
    operadora: "SOFSE / Trenes Argentinos",
    cronograma_vigente_desde: "2026-03-09",
    estado: "operativo_con_modificaciones",
    ramales: ["once_moreno", "merlo_lobos", "moreno_mercedes", "once_bragado"],
  },
};

const ESTACIONES = {
  once:               { id:"once",               nombre:"Once",                  orden:0,  km:0,    seccion:1, lat:-34.6083, lng:-58.4097 },
  caballito:          { id:"caballito",           nombre:"Caballito",             orden:1,  km:3.4,  seccion:1, lat:-34.6186, lng:-58.4367 },
  flores:             { id:"flores",              nombre:"Flores",                orden:2,  km:5.1,  seccion:1, lat:-34.6286, lng:-58.4572 },
  floresta:           { id:"floresta",            nombre:"Floresta",              orden:3,  km:6.8,  seccion:1, lat:-34.6331, lng:-58.4744 },
  villa_luro:         { id:"villa_luro",          nombre:"Villa Luro",            orden:4,  km:8.2,  seccion:1, lat:-34.6375, lng:-58.4900 },
  liniers:            { id:"liniers",             nombre:"Liniers",               orden:5,  km:10.5, seccion:1, lat:-34.6406, lng:-58.5122 },
  ciudadela:          { id:"ciudadela",           nombre:"Ciudadela",             orden:6,  km:12.7, seccion:2, lat:-34.6381, lng:-58.5311 },
  ramos_mejia:        { id:"ramos_mejia",         nombre:"Ramos Mejía",           orden:7,  km:14.9, seccion:2, lat:-34.6408, lng:-58.5558 },
  haedo:              { id:"haedo",               nombre:"Haedo",                 orden:8,  km:17.2, seccion:2, lat:-34.6439, lng:-58.5819 },
  moron:              { id:"moron",               nombre:"Morón",                 orden:9,  km:19.8, seccion:2, lat:-34.6503, lng:-58.6194 },
  castelar:           { id:"castelar",            nombre:"Castelar",              orden:10, km:23.1, seccion:3, lat:-34.6561, lng:-58.6597 },
  ituzaingo:          { id:"ituzaingo",           nombre:"Ituzaingó",             orden:11, km:26.4, seccion:3, lat:-34.6581, lng:-58.6703 },
  san_antonio_padua:  { id:"san_antonio_padua",   nombre:"San Antonio de Padua",  orden:12, km:29.8, seccion:3, lat:-34.6697, lng:-58.6972 },
  merlo:              { id:"merlo",               nombre:"Merlo",                 orden:13, km:32.5, seccion:3, lat:-34.6733, lng:-58.7264 },
  paso_del_rey:       { id:"paso_del_rey",        nombre:"Paso del Rey",          orden:14, km:34.9, seccion:3, lat:-34.6761, lng:-58.7500 },
  moreno:             { id:"moreno",              nombre:"Moreno",                orden:15, km:37.3, seccion:3, lat:-34.6481, lng:-58.7897 },
};

const TARIFAS = {
  seccion_1: { id:"seccion_1", descripcion:"Hasta ~12 km (Once–Ciudadela)",      sube_normal:280, sube_social:126,   efectivo:900, vigente_desde:"2026-03-16" },
  seccion_2: { id:"seccion_2", descripcion:"~12–24 km (Ramos Mejía–Morón)",      sube_normal:360, sube_social:162,   efectivo:900, vigente_desde:"2026-03-16" },
  seccion_3: { id:"seccion_3", descripcion:"Más de 24 km (Castelar–Moreno)",     sube_normal:450, sube_social:202.5, efectivo:900, vigente_desde:"2026-03-16" },
};

const METADATA = {
  tren_sarmiento: {
    ultima_actualizacion:          "2026-03-09",
    fuente:                        "Trenes Argentinos / SOFSE - Ministerio de Transporte de la Nación",
    url_oficial:                   "https://www.argentina.gob.ar/transporte/trenes-argentinos/horarios-tarifas-y-recorridos/areametropolitana/lineasarmiento",
    total_estaciones_ramal_electrico: 16,
    frecuencia_pico_minutos:       9,
    frecuencia_valle_minutos:      27,
    duracion_viaje_once_moreno_minutos: 65,
    pasajeros_diarios:             290000,
    servicio_nocturno:             true,
    nota_moron:                    "Andén provisorio en Morón hacia Once. Acceso por Sarmiento y Azcuénaga.",
    nota_servicios_locales:        "Trenes numerados 9xxx son servicios locales que parten desde estaciones intermedias (Flores, Liniers) y llegan hasta Moreno.",
  },
};

// ── Servicios (trenes) ────────────────────────────────────────
// Campos:
//   id      → clave del documento Firestore
//   numero  → número de tren oficial
//   tipo    → "normal" | "local" (local = arranca en estación intermedia)
//   dias    → "lunes_viernes" | "sabados" | "domingos_feriados"
//   sentido → "once_moreno" | "moreno_once"
//   horarios → objeto { estacion_id: "HH:MM" | null }
//              null = el tren no para en esa estación

const SERVICIOS = {
  // ══════════════════════════════════════════════
  // LUNES A VIERNES — ONCE → MORENO
  // ══════════════════════════════════════════════

  // Servicios locales (arrancan en Castelar, madrugada)
  LV_3201: { id:"LV_3201", numero:3201, tipo:"local",  dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:null, caballito:null, flores:null, floresta:null, villa_luro:null, liniers:null, ciudadela:null, ramos_mejia:null, haedo:null, moron:null, castelar:"03:07", ituzaingo:"03:12", san_antonio_padua:"03:16", merlo:"03:21", paso_del_rey:"03:26", moreno:"03:32" }},
  LV_3203: { id:"LV_3203", numero:3203, tipo:"local",  dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:null, caballito:null, flores:null, floresta:null, villa_luro:null, liniers:null, ciudadela:null, ramos_mejia:null, haedo:null, moron:null, castelar:"03:38", ituzaingo:"03:43", san_antonio_padua:"03:47", merlo:"03:52", paso_del_rey:"03:57", moreno:"04:03" }},
  LV_3205: { id:"LV_3205", numero:3205, tipo:"local",  dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:null, caballito:null, flores:null, floresta:null, villa_luro:null, liniers:null, ciudadela:null, ramos_mejia:null, haedo:null, moron:null, castelar:"04:12", ituzaingo:"04:17", san_antonio_padua:"04:21", merlo:"04:26", paso_del_rey:"04:31", moreno:"04:37" }},

  // Servicios normales (recorren todo el ramal)
  LV_3207: { id:"LV_3207", numero:3207, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"04:05", caballito:"04:14", flores:"04:19", floresta:"04:22", villa_luro:"04:26", liniers:"04:32", ciudadela:"04:36", ramos_mejia:"04:40", haedo:"04:46", moron:"04:52", castelar:"04:58", ituzaingo:"05:03", san_antonio_padua:"05:07", merlo:"05:12", paso_del_rey:"05:17", moreno:"05:23" }},
  LV_3209: { id:"LV_3209", numero:3209, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"04:35", caballito:"04:44", flores:"04:49", floresta:"04:52", villa_luro:"04:56", liniers:"05:02", ciudadela:"05:06", ramos_mejia:"05:10", haedo:"05:16", moron:"05:22", castelar:"05:28", ituzaingo:"05:33", san_antonio_padua:"05:37", merlo:"05:42", paso_del_rey:"05:47", moreno:"05:53" }},
  LV_3211: { id:"LV_3211", numero:3211, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"04:51", caballito:"05:00", flores:"05:05", floresta:"05:08", villa_luro:"05:12", liniers:"05:18", ciudadela:"05:22", ramos_mejia:"05:26", haedo:"05:32", moron:"05:38", castelar:"05:44", ituzaingo:"05:49", san_antonio_padua:"05:53", merlo:"05:58", paso_del_rey:"06:03", moreno:"06:09" }},
  LV_3213: { id:"LV_3213", numero:3213, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"05:10", caballito:"05:19", flores:"05:24", floresta:"05:27", villa_luro:"05:31", liniers:"05:37", ciudadela:"05:41", ramos_mejia:"05:45", haedo:"05:51", moron:"05:57", castelar:"06:03", ituzaingo:"06:08", san_antonio_padua:"06:12", merlo:"06:17", paso_del_rey:"06:22", moreno:"06:28" }},
  LV_3215: { id:"LV_3215", numero:3215, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"05:22", caballito:"05:31", flores:"05:36", floresta:"05:39", villa_luro:"05:43", liniers:"05:49", ciudadela:"05:53", ramos_mejia:"05:57", haedo:"06:03", moron:"06:09", castelar:"06:15", ituzaingo:"06:20", san_antonio_padua:"06:24", merlo:"06:29", paso_del_rey:"06:34", moreno:"06:40" }},
  LV_3217: { id:"LV_3217", numero:3217, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"05:37", caballito:"05:46", flores:"05:51", floresta:"05:54", villa_luro:"05:58", liniers:"06:04", ciudadela:"06:08", ramos_mejia:"06:12", haedo:"06:18", moron:"06:24", castelar:"06:30", ituzaingo:"06:35", san_antonio_padua:"06:39", merlo:"06:44", paso_del_rey:"06:49", moreno:"06:55" }},
  LV_3219: { id:"LV_3219", numero:3219, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"06:00", caballito:"06:09", flores:"06:14", floresta:"06:17", villa_luro:"06:21", liniers:"06:27", ciudadela:"06:31", ramos_mejia:"06:35", haedo:"06:41", moron:"06:47", castelar:"06:53", ituzaingo:"06:58", san_antonio_padua:"07:02", merlo:"07:07", paso_del_rey:"07:12", moreno:"07:18" }},
  LV_3221: { id:"LV_3221", numero:3221, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"06:12", caballito:"06:21", flores:"06:26", floresta:"06:29", villa_luro:"06:33", liniers:"06:39", ciudadela:"06:43", ramos_mejia:"06:47", haedo:"06:53", moron:"06:59", castelar:"07:05", ituzaingo:"07:10", san_antonio_padua:"07:14", merlo:"07:19", paso_del_rey:"07:24", moreno:"07:30" }},
  LV_3223: { id:"LV_3223", numero:3223, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"06:23", caballito:"06:32", flores:"06:37", floresta:"06:40", villa_luro:"06:44", liniers:"06:50", ciudadela:"06:54", ramos_mejia:"06:58", haedo:"07:04", moron:"07:10", castelar:"07:16", ituzaingo:"07:21", san_antonio_padua:"07:25", merlo:"07:30", paso_del_rey:"07:35", moreno:"07:41" }},
  LV_3225: { id:"LV_3225", numero:3225, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"06:34", caballito:"06:43", flores:"06:48", floresta:"06:51", villa_luro:"06:55", liniers:"07:01", ciudadela:"07:05", ramos_mejia:"07:09", haedo:"07:15", moron:"07:21", castelar:"07:27", ituzaingo:"07:32", san_antonio_padua:"07:36", merlo:"07:41", paso_del_rey:"07:46", moreno:"07:52" }},
  LV_3227: { id:"LV_3227", numero:3227, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"06:45", caballito:"06:54", flores:"06:59", floresta:"07:02", villa_luro:"07:06", liniers:"07:12", ciudadela:"07:16", ramos_mejia:"07:20", haedo:"07:26", moron:"07:32", castelar:"07:38", ituzaingo:"07:43", san_antonio_padua:"07:47", merlo:"07:52", paso_del_rey:"07:57", moreno:"08:03" }},
  LV_3229: { id:"LV_3229", numero:3229, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"06:58", caballito:"07:07", flores:"07:12", floresta:"07:15", villa_luro:"07:19", liniers:"07:25", ciudadela:"07:29", ramos_mejia:"07:33", haedo:"07:39", moron:"07:45", castelar:"07:51", ituzaingo:"07:56", san_antonio_padua:"08:00", merlo:"08:05", paso_del_rey:"08:10", moreno:"08:16" }},
  LV_3231: { id:"LV_3231", numero:3231, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"07:09", caballito:"07:18", flores:"07:23", floresta:"07:26", villa_luro:"07:30", liniers:"07:36", ciudadela:"07:40", ramos_mejia:"07:44", haedo:"07:50", moron:"07:56", castelar:"08:02", ituzaingo:"08:07", san_antonio_padua:"08:11", merlo:"08:16", paso_del_rey:"08:21", moreno:"08:27" }},
  LV_3233: { id:"LV_3233", numero:3233, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"07:20", caballito:"07:29", flores:"07:34", floresta:"07:37", villa_luro:"07:41", liniers:"07:47", ciudadela:"07:51", ramos_mejia:"07:55", haedo:"08:01", moron:"08:07", castelar:"08:13", ituzaingo:"08:18", san_antonio_padua:"08:22", merlo:"08:27", paso_del_rey:"08:32", moreno:"08:38" }},
  LV_3235: { id:"LV_3235", numero:3235, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"07:31", caballito:"07:40", flores:"07:45", floresta:"07:48", villa_luro:"07:52", liniers:"07:58", ciudadela:"08:02", ramos_mejia:"08:06", haedo:"08:12", moron:"08:18", castelar:"08:24", ituzaingo:"08:29", san_antonio_padua:"08:33", merlo:"08:38", paso_del_rey:"08:43", moreno:"08:49" }},
  LV_3237: { id:"LV_3237", numero:3237, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"07:44", caballito:"07:53", flores:"07:58", floresta:"08:01", villa_luro:"08:05", liniers:"08:11", ciudadela:"08:15", ramos_mejia:"08:19", haedo:"08:25", moron:"08:31", castelar:"08:37", ituzaingo:"08:42", san_antonio_padua:"08:46", merlo:"08:51", paso_del_rey:"08:56", moreno:"09:02" }},
  LV_3239: { id:"LV_3239", numero:3239, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"07:55", caballito:"08:04", flores:"08:09", floresta:"08:12", villa_luro:"08:16", liniers:"08:22", ciudadela:"08:26", ramos_mejia:"08:30", haedo:"08:36", moron:"08:42", castelar:"08:48", ituzaingo:"08:53", san_antonio_padua:"08:57", merlo:"09:02", paso_del_rey:"09:07", moreno:"09:13" }},
  LV_3241: { id:"LV_3241", numero:3241, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"08:07", caballito:"08:16", flores:"08:21", floresta:"08:24", villa_luro:"08:28", liniers:"08:34", ciudadela:"08:38", ramos_mejia:"08:42", haedo:"08:48", moron:"08:54", castelar:"09:00", ituzaingo:"09:05", san_antonio_padua:"09:09", merlo:"09:14", paso_del_rey:"09:19", moreno:"09:25" }},
  LV_3313: { id:"LV_3313", numero:3313, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"15:04", caballito:"15:13", flores:"15:18", floresta:"15:21", villa_luro:"15:25", liniers:"15:31", ciudadela:"15:35", ramos_mejia:"15:39", haedo:"15:45", moron:"15:51", castelar:"15:57", ituzaingo:"16:02", san_antonio_padua:"16:06", merlo:"16:11", paso_del_rey:"16:16", moreno:"16:22" }},
  LV_3317: { id:"LV_3317", numero:3317, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"15:17", caballito:"15:26", flores:"15:31", floresta:"15:34", villa_luro:"15:38", liniers:"15:44", ciudadela:"15:48", ramos_mejia:"15:52", haedo:"15:58", moron:"16:04", castelar:"16:10", ituzaingo:"16:15", san_antonio_padua:"16:19", merlo:"16:24", paso_del_rey:"16:29", moreno:"16:35" }},
  LV_3319: { id:"LV_3319", numero:3319, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"15:28", caballito:"15:37", flores:"15:42", floresta:"15:45", villa_luro:"15:49", liniers:"15:55", ciudadela:"15:59", ramos_mejia:"16:03", haedo:"16:09", moron:"16:15", castelar:"16:21", ituzaingo:"16:26", san_antonio_padua:"16:30", merlo:"16:35", paso_del_rey:"16:40", moreno:"16:46" }},
  LV_3375: { id:"LV_3375", numero:3375, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"19:53", caballito:"20:02", flores:"20:07", floresta:"20:10", villa_luro:"20:14", liniers:"20:20", ciudadela:"20:24", ramos_mejia:"20:28", haedo:"20:34", moron:"20:40", castelar:"20:46", ituzaingo:"20:51", san_antonio_padua:"20:55", merlo:"21:00", paso_del_rey:"21:05", moreno:"21:11" }},
  LV_3377: { id:"LV_3377", numero:3377, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"20:04", caballito:"20:13", flores:"20:18", floresta:"20:21", villa_luro:"20:25", liniers:"20:31", ciudadela:"20:35", ramos_mejia:"20:39", haedo:"20:45", moron:"20:51", castelar:"20:57", ituzaingo:"21:02", san_antonio_padua:"21:06", merlo:"21:11", paso_del_rey:"21:16", moreno:"21:22" }},
  LV_3401: { id:"LV_3401", numero:3401, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"22:29", caballito:"22:38", flores:"22:43", floresta:"22:46", villa_luro:"22:50", liniers:"22:56", ciudadela:"23:00", ramos_mejia:"23:04", haedo:"23:10", moron:"23:16", castelar:"23:22", ituzaingo:"23:27", san_antonio_padua:"23:31", merlo:"23:36", paso_del_rey:"23:41", moreno:"23:47" }},
  LV_3403: { id:"LV_3403", numero:3403, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"22:47", caballito:"22:56", flores:"23:01", floresta:"23:04", villa_luro:"23:08", liniers:"23:14", ciudadela:"23:18", ramos_mejia:"23:22", haedo:"23:28", moron:"23:34", castelar:"23:40", ituzaingo:"23:45", san_antonio_padua:"23:49", merlo:"23:54", paso_del_rey:"23:59", moreno:"00:05" }},
  LV_3405: { id:"LV_3405", numero:3405, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"23:02", caballito:"23:11", flores:"23:16", floresta:"23:19", villa_luro:"23:23", liniers:"23:29", ciudadela:"23:33", ramos_mejia:"23:37", haedo:"23:43", moron:"23:49", castelar:"23:55", ituzaingo:"00:00", san_antonio_padua:"00:04", merlo:"00:09", paso_del_rey:"00:14", moreno:"00:20" }},
  LV_3407: { id:"LV_3407", numero:3407, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"23:25", caballito:"23:34", flores:"23:39", floresta:"23:42", villa_luro:"23:46", liniers:"23:52", ciudadela:"23:56", ramos_mejia:"00:00", haedo:"00:06", moron:"00:12", castelar:"00:18", ituzaingo:"00:23", san_antonio_padua:"00:27", merlo:"00:32", paso_del_rey:"00:37", moreno:"00:43" }},
  LV_3409: { id:"LV_3409", numero:3409, tipo:"normal", dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:"23:55", caballito:"00:04", flores:"00:09", floresta:"00:12", villa_luro:"00:16", liniers:"00:22", ciudadela:"00:26", ramos_mejia:"00:30", haedo:"00:36", moron:"00:42", castelar:"00:48", ituzaingo:"00:53", san_antonio_padua:"00:57", merlo:"01:02", paso_del_rey:"01:07", moreno:"01:13" }},

  // Servicios locales hora pico tarde (arrancan en Flores o Liniers)
  LV_9775: { id:"LV_9775", numero:9775, tipo:"local",  dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:null, caballito:null, flores:"15:25", floresta:"15:28", villa_luro:"15:32", liniers:"15:38", ciudadela:"15:42", ramos_mejia:"15:46", haedo:"15:52", moron:"15:58", castelar:"16:04", ituzaingo:"16:09", san_antonio_padua:"16:13", merlo:"16:18", paso_del_rey:"16:23", moreno:"16:29" }},
  LV_9777: { id:"LV_9777", numero:9777, tipo:"local",  dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:null, caballito:null, flores:"16:11", floresta:"16:14", villa_luro:"16:18", liniers:"16:24", ciudadela:"16:28", ramos_mejia:"16:32", haedo:"16:38", moron:"16:44", castelar:"16:50", ituzaingo:"16:55", san_antonio_padua:"16:59", merlo:"17:04", paso_del_rey:"17:09", moreno:"17:15" }},
  LV_9779: { id:"LV_9779", numero:9779, tipo:"local",  dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:null, caballito:null, flores:"16:57", floresta:"17:00", villa_luro:"17:04", liniers:"17:10", ciudadela:"17:14", ramos_mejia:"17:18", haedo:"17:24", moron:"17:30", castelar:"17:36", ituzaingo:"17:41", san_antonio_padua:"17:45", merlo:"17:50", paso_del_rey:"17:55", moreno:"18:01" }},
  LV_9781: { id:"LV_9781", numero:9781, tipo:"local",  dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:null, caballito:null, flores:null, floresta:null, villa_luro:null, liniers:"17:56", ciudadela:"18:00", ramos_mejia:"18:04", haedo:"18:10", moron:"18:16", castelar:"18:22", ituzaingo:"18:27", san_antonio_padua:"18:31", merlo:"18:36", paso_del_rey:"18:41", moreno:"18:47" }},
  LV_9785: { id:"LV_9785", numero:9785, tipo:"local",  dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:null, caballito:null, flores:null, floresta:null, villa_luro:null, liniers:"18:41", ciudadela:"18:45", ramos_mejia:"18:49", haedo:"18:55", moron:"19:01", castelar:"19:07", ituzaingo:"19:12", san_antonio_padua:"19:16", merlo:"19:21", paso_del_rey:"19:26", moreno:"19:32" }},
  LV_9793: { id:"LV_9793", numero:9793, tipo:"local",  dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:null, caballito:null, flores:null, floresta:null, villa_luro:null, liniers:"19:28", ciudadela:"19:32", ramos_mejia:"19:36", haedo:"19:42", moron:"19:48", castelar:"19:54", ituzaingo:"19:59", san_antonio_padua:"20:03", merlo:"20:08", paso_del_rey:"20:13", moreno:"20:19" }},
  LV_9799: { id:"LV_9799", numero:9799, tipo:"local",  dias:"lunes_viernes", sentido:"once_moreno", horarios:{ once:null, caballito:null, flores:null, floresta:null, villa_luro:null, liniers:"20:14", ciudadela:"20:18", ramos_mejia:"20:22", haedo:"20:28", moron:"20:34", castelar:"20:40", ituzaingo:"20:45", san_antonio_padua:"20:49", merlo:"20:54", paso_del_rey:"20:59", moreno:"21:05" }},

  // ══════════════════════════════════════════════
  // LUNES A VIERNES — MORENO → ONCE
  // ══════════════════════════════════════════════
  LV_3200: { id:"LV_3200", numero:3200, tipo:"local",  dias:"lunes_viernes", sentido:"moreno_once", horarios:{ moreno:null, paso_del_rey:null, merlo:null, san_antonio_padua:null, ituzaingo:null, castelar:"02:55", moron:"03:02", haedo:"03:07", ramos_mejia:"03:13", ciudadela:"03:17", liniers:"03:21", villa_luro:"03:27", floresta:"03:31", flores:"03:34", caballito:"03:39", once:"03:50" }},
  LV_3202: { id:"LV_3202", numero:3202, tipo:"normal", dias:"lunes_viernes", sentido:"moreno_once", horarios:{ moreno:"03:00", paso_del_rey:"03:05", merlo:"03:11", san_antonio_padua:"03:15", ituzaingo:"03:20", castelar:"03:26", moron:"03:32", haedo:"03:37", ramos_mejia:"03:43", ciudadela:"03:47", liniers:"03:51", villa_luro:"03:57", floresta:"04:01", flores:"04:04", caballito:"04:09", once:"04:20" }},
  LV_3222: { id:"LV_3222", numero:3222, tipo:"local",  dias:"lunes_viernes", sentido:"moreno_once", horarios:{ moreno:null, paso_del_rey:null, merlo:null, san_antonio_padua:null, ituzaingo:null, castelar:null, moron:null, haedo:null, ramos_mejia:null, ciudadela:null, liniers:null, villa_luro:null, floresta:"05:28", flores:"05:32", caballito:"05:37", once:"05:43" }},
  LV_3232: { id:"LV_3232", numero:3232, tipo:"local",  dias:"lunes_viernes", sentido:"moreno_once", horarios:{ moreno:null, paso_del_rey:null, merlo:null, san_antonio_padua:null, ituzaingo:null, castelar:null, moron:null, haedo:null, ramos_mejia:null, ciudadela:null, liniers:"06:13", villa_luro:"06:17", floresta:"06:22", flores:"06:28", caballito:"06:34", once:"06:39" }},
  LV_3242: { id:"LV_3242", numero:3242, tipo:"local",  dias:"lunes_viernes", sentido:"moreno_once", horarios:{ moreno:null, paso_del_rey:null, merlo:null, san_antonio_padua:null, ituzaingo:null, castelar:null, moron:null, haedo:null, ramos_mejia:null, ciudadela:null, liniers:"07:01", villa_luro:"07:05", floresta:"07:10", flores:"07:16", caballito:"07:22", once:"07:27" }},
  LV_3250: { id:"LV_3250", numero:3250, tipo:"local",  dias:"lunes_viernes", sentido:"moreno_once", horarios:{ moreno:null, paso_del_rey:null, merlo:null, san_antonio_padua:null, ituzaingo:null, castelar:null, moron:null, haedo:null, ramos_mejia:null, ciudadela:null, liniers:"07:50", villa_luro:"07:56", floresta:"08:01", flores:"08:07", caballito:"08:11", once:"08:15" }},
  LV_3260: { id:"LV_3260", numero:3260, tipo:"local",  dias:"lunes_viernes", sentido:"moreno_once", horarios:{ moreno:null, paso_del_rey:null, merlo:null, san_antonio_padua:null, ituzaingo:null, castelar:null, moron:null, haedo:null, ramos_mejia:null, ciudadela:null, liniers:"08:36", villa_luro:"08:42", floresta:"08:47", flores:"08:53", caballito:"08:57", once:"09:01" }},
  LV_3270: { id:"LV_3270", numero:3270, tipo:"local",  dias:"lunes_viernes", sentido:"moreno_once", horarios:{ moreno:null, paso_del_rey:null, merlo:null, san_antonio_padua:null, ituzaingo:null, castelar:null, moron:null, haedo:null, ramos_mejia:null, ciudadela:null, liniers:"09:22", villa_luro:"09:28", floresta:"09:33", flores:"09:39", caballito:"09:43", once:"09:47" }},
  LV_3404: { id:"LV_3404", numero:3404, tipo:"normal", dias:"lunes_viernes", sentido:"moreno_once", horarios:{ moreno:"22:20", paso_del_rey:"22:25", merlo:"22:31", san_antonio_padua:"22:35", ituzaingo:"22:40", castelar:"22:46", moron:"22:52", haedo:"22:57", ramos_mejia:"23:03", ciudadela:"23:07", liniers:"23:11", villa_luro:"23:17", floresta:"23:21", flores:"23:24", caballito:"23:29", once:"23:40" }},

  // ══════════════════════════════════════════════
  // SÁBADOS — ONCE → MORENO
  // ══════════════════════════════════════════════
  SA_3501: { id:"SA_3501", numero:3501, tipo:"local",  dias:"sabados", sentido:"once_moreno", horarios:{ once:null, caballito:null, flores:null, floresta:null, villa_luro:null, liniers:null, ciudadela:null, ramos_mejia:null, haedo:null, moron:null, castelar:"03:07", ituzaingo:"03:12", san_antonio_padua:"03:16", merlo:"03:21", paso_del_rey:"03:26", moreno:"03:32" }},
  SA_3503: { id:"SA_3503", numero:3503, tipo:"local",  dias:"sabados", sentido:"once_moreno", horarios:{ once:null, caballito:null, flores:null, floresta:null, villa_luro:null, liniers:null, ciudadela:null, ramos_mejia:null, haedo:null, moron:null, castelar:"03:38", ituzaingo:"03:43", san_antonio_padua:"03:47", merlo:"03:52", paso_del_rey:"03:57", moreno:"04:03" }},
  SA_3505: { id:"SA_3505", numero:3505, tipo:"local",  dias:"sabados", sentido:"once_moreno", horarios:{ once:null, caballito:null, flores:null, floresta:null, villa_luro:null, liniers:null, ciudadela:null, ramos_mejia:null, haedo:null, moron:null, castelar:"04:12", ituzaingo:"04:17", san_antonio_padua:"04:21", merlo:"04:26", paso_del_rey:"04:31", moreno:"04:37" }},
  SA_3507: { id:"SA_3507", numero:3507, tipo:"normal", dias:"sabados", sentido:"once_moreno", horarios:{ once:"04:05", caballito:"04:14", flores:"04:19", floresta:"04:22", villa_luro:"04:26", liniers:"04:32", ciudadela:"04:36", ramos_mejia:"04:40", haedo:"04:46", moron:"04:52", castelar:"04:58", ituzaingo:"05:03", san_antonio_padua:"05:07", merlo:"05:12", paso_del_rey:"05:17", moreno:"05:23" }},
  SA_3509: { id:"SA_3509", numero:3509, tipo:"normal", dias:"sabados", sentido:"once_moreno", horarios:{ once:"04:35", caballito:"04:44", flores:"04:49", floresta:"04:52", villa_luro:"04:56", liniers:"05:02", ciudadela:"05:06", ramos_mejia:"05:10", haedo:"05:16", moron:"05:22", castelar:"05:28", ituzaingo:"05:33", san_antonio_padua:"05:37", merlo:"05:42", paso_del_rey:"05:47", moreno:"05:53" }},
  SA_3511: { id:"SA_3511", numero:3511, tipo:"normal", dias:"sabados", sentido:"once_moreno", horarios:{ once:"04:51", caballito:"05:00", flores:"05:05", floresta:"05:08", villa_luro:"05:12", liniers:"05:18", ciudadela:"05:22", ramos_mejia:"05:26", haedo:"05:32", moron:"05:38", castelar:"05:44", ituzaingo:"05:49", san_antonio_padua:"05:53", merlo:"05:58", paso_del_rey:"06:03", moreno:"06:09" }},
  SA_3519: { id:"SA_3519", numero:3519, tipo:"normal", dias:"sabados", sentido:"once_moreno", horarios:{ once:"05:48", caballito:"05:57", flores:"06:02", floresta:"06:05", villa_luro:"06:09", liniers:"06:15", ciudadela:"06:19", ramos_mejia:"06:23", haedo:"06:29", moron:"06:35", castelar:"06:41", ituzaingo:"06:46", san_antonio_padua:"06:50", merlo:"06:55", paso_del_rey:"07:00", moreno:"07:06" }},
  SA_3691: { id:"SA_3691", numero:3691, tipo:"normal", dias:"sabados", sentido:"once_moreno", horarios:{ once:"22:31", caballito:"22:40", flores:"22:45", floresta:"22:48", villa_luro:"22:52", liniers:"22:58", ciudadela:"23:02", ramos_mejia:"23:06", haedo:"23:12", moron:"23:18", castelar:"23:24", ituzaingo:"23:29", san_antonio_padua:"23:33", merlo:"23:38", paso_del_rey:"23:43", moreno:"23:49" }},

  // SÁBADOS — MORENO → ONCE
  SA_3500: { id:"SA_3500", numero:3500, tipo:"local",  dias:"sabados", sentido:"moreno_once", horarios:{ moreno:null, paso_del_rey:null, merlo:null, san_antonio_padua:null, ituzaingo:null, castelar:"02:55", moron:"03:02", haedo:"03:07", ramos_mejia:"03:13", ciudadela:"03:17", liniers:"03:21", villa_luro:"03:27", floresta:"03:31", flores:"03:34", caballito:"03:39", once:"03:50" }},
  SA_3502: { id:"SA_3502", numero:3502, tipo:"normal", dias:"sabados", sentido:"moreno_once", horarios:{ moreno:"03:00", paso_del_rey:"03:05", merlo:"03:11", san_antonio_padua:"03:15", ituzaingo:"03:20", castelar:"03:26", moron:"03:32", haedo:"03:37", ramos_mejia:"03:43", ciudadela:"03:47", liniers:"03:51", villa_luro:"03:57", floresta:"04:01", flores:"04:04", caballito:"04:09", once:"04:20" }},
  SA_3692: { id:"SA_3692", numero:3692, tipo:"normal", dias:"sabados", sentido:"moreno_once", horarios:{ moreno:"22:20", paso_del_rey:"22:25", merlo:"22:31", san_antonio_padua:"22:35", ituzaingo:"22:40", castelar:"22:46", moron:"22:52", haedo:"22:57", ramos_mejia:"23:03", ciudadela:"23:07", liniers:"23:11", villa_luro:"23:17", floresta:"23:21", flores:"23:24", caballito:"23:29", once:"23:40" }},

  // ══════════════════════════════════════════════
  // DOMINGOS Y FERIADOS — ONCE → MORENO
  // ══════════════════════════════════════════════
  DF_3801: { id:"DF_3801", numero:3801, tipo:"local",  dias:"domingos_feriados", sentido:"once_moreno", horarios:{ once:null, caballito:null, flores:null, floresta:null, villa_luro:null, liniers:null, ciudadela:null, ramos_mejia:null, haedo:null, moron:null, castelar:"04:22", ituzaingo:"04:27", san_antonio_padua:"04:31", merlo:"04:36", paso_del_rey:"04:41", moreno:"04:47" }},
  DF_3803: { id:"DF_3803", numero:3803, tipo:"local",  dias:"domingos_feriados", sentido:"once_moreno", horarios:{ once:null, caballito:null, flores:null, floresta:null, villa_luro:null, liniers:null, ciudadela:null, ramos_mejia:null, haedo:null, moron:null, castelar:"05:12", ituzaingo:"05:17", san_antonio_padua:"05:21", merlo:"05:26", paso_del_rey:"05:31", moreno:"05:37" }},
  DF_3805: { id:"DF_3805", numero:3805, tipo:"local",  dias:"domingos_feriados", sentido:"once_moreno", horarios:{ once:null, caballito:null, flores:null, floresta:null, villa_luro:null, liniers:null, ciudadela:null, ramos_mejia:null, haedo:null, moron:null, castelar:"05:37", ituzaingo:"05:42", san_antonio_padua:"05:46", merlo:"05:51", paso_del_rey:"05:56", moreno:"06:02" }},
  DF_3807: { id:"DF_3807", numero:3807, tipo:"normal", dias:"domingos_feriados", sentido:"once_moreno", horarios:{ once:"05:04", caballito:"05:13", flores:"05:18", floresta:"05:21", villa_luro:"05:25", liniers:"05:31", ciudadela:"05:35", ramos_mejia:"05:39", haedo:"05:45", moron:"05:51", castelar:"05:57", ituzaingo:"06:02", san_antonio_padua:"06:06", merlo:"06:11", paso_del_rey:"06:16", moreno:"06:22" }},
  DF_3809: { id:"DF_3809", numero:3809, tipo:"normal", dias:"domingos_feriados", sentido:"once_moreno", horarios:{ once:"05:40", caballito:"05:49", flores:"05:54", floresta:"05:57", villa_luro:"06:01", liniers:"06:07", ciudadela:"06:11", ramos_mejia:"06:15", haedo:"06:21", moron:"06:27", castelar:"06:33", ituzaingo:"06:38", san_antonio_padua:"06:42", merlo:"06:47", paso_del_rey:"06:52", moreno:"06:58" }},
  DF_3811: { id:"DF_3811", numero:3811, tipo:"normal", dias:"domingos_feriados", sentido:"once_moreno", horarios:{ once:"06:06", caballito:"06:15", flores:"06:20", floresta:"06:23", villa_luro:"06:27", liniers:"06:33", ciudadela:"06:37", ramos_mejia:"06:41", haedo:"06:47", moron:"06:53", castelar:"06:59", ituzaingo:"07:04", san_antonio_padua:"07:08", merlo:"07:13", paso_del_rey:"07:18", moreno:"07:24" }},
  DF_3813: { id:"DF_3813", numero:3813, tipo:"normal", dias:"domingos_feriados", sentido:"once_moreno", horarios:{ once:"06:32", caballito:"06:41", flores:"06:46", floresta:"06:49", villa_luro:"06:53", liniers:"06:59", ciudadela:"07:03", ramos_mejia:"07:07", haedo:"07:13", moron:"07:19", castelar:"07:25", ituzaingo:"07:30", san_antonio_padua:"07:34", merlo:"07:39", paso_del_rey:"07:44", moreno:"07:50" }},
  DF_3815: { id:"DF_3815", numero:3815, tipo:"normal", dias:"domingos_feriados", sentido:"once_moreno", horarios:{ once:"06:57", caballito:"07:06", flores:"07:11", floresta:"07:14", villa_luro:"07:18", liniers:"07:24", ciudadela:"07:28", ramos_mejia:"07:32", haedo:"07:38", moron:"07:44", castelar:"07:50", ituzaingo:"07:55", san_antonio_padua:"07:59", merlo:"08:04", paso_del_rey:"08:09", moreno:"08:15" }},
  DF_3817: { id:"DF_3817", numero:3817, tipo:"normal", dias:"domingos_feriados", sentido:"once_moreno", horarios:{ once:"07:22", caballito:"07:31", flores:"07:36", floresta:"07:39", villa_luro:"07:43", liniers:"07:49", ciudadela:"07:53", ramos_mejia:"07:57", haedo:"08:03", moron:"08:09", castelar:"08:15", ituzaingo:"08:20", san_antonio_padua:"08:24", merlo:"08:29", paso_del_rey:"08:34", moreno:"08:40" }},
  DF_3819: { id:"DF_3819", numero:3819, tipo:"normal", dias:"domingos_feriados", sentido:"once_moreno", horarios:{ once:"07:46", caballito:"07:55", flores:"08:00", floresta:"08:03", villa_luro:"08:07", liniers:"08:13", ciudadela:"08:17", ramos_mejia:"08:21", haedo:"08:27", moron:"08:33", castelar:"08:39", ituzaingo:"08:44", san_antonio_padua:"08:48", merlo:"08:53", paso_del_rey:"08:58", moreno:"09:04" }},
  DF_3821: { id:"DF_3821", numero:3821, tipo:"normal", dias:"domingos_feriados", sentido:"once_moreno", horarios:{ once:"08:04", caballito:"08:13", flores:"08:18", floresta:"08:21", villa_luro:"08:25", liniers:"08:31", ciudadela:"08:35", ramos_mejia:"08:39", haedo:"08:45", moron:"08:51", castelar:"08:57", ituzaingo:"09:02", san_antonio_padua:"09:06", merlo:"09:11", paso_del_rey:"09:16", moreno:"09:22" }},
  DF_3823: { id:"DF_3823", numero:3823, tipo:"normal", dias:"domingos_feriados", sentido:"once_moreno", horarios:{ once:"08:22", caballito:"08:31", flores:"08:36", floresta:"08:39", villa_luro:"08:43", liniers:"08:49", ciudadela:"08:53", ramos_mejia:"08:57", haedo:"09:03", moron:"09:09", castelar:"09:15", ituzaingo:"09:20", san_antonio_padua:"09:24", merlo:"09:29", paso_del_rey:"09:34", moreno:"09:40" }},
  DF_3879: { id:"DF_3879", numero:3879, tipo:"normal", dias:"domingos_feriados", sentido:"once_moreno", horarios:{ once:"16:55", caballito:"17:04", flores:"17:09", floresta:"17:12", villa_luro:"17:16", liniers:"17:22", ciudadela:"17:26", ramos_mejia:"17:30", haedo:"17:36", moron:"17:42", castelar:"17:48", ituzaingo:"17:53", san_antonio_padua:"17:57", merlo:"18:02", paso_del_rey:"18:07", moreno:"18:13" }},
};

// ============================================================
// FUNCIONES DE IMPORTACIÓN
// ============================================================

async function importarColeccion(coleccion, datos, label) {
  const entries = Object.entries(datos);
  const BATCH_SIZE = 500;
  let total = 0;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch  = writeBatch(db);
    const chunk  = entries.slice(i, i + BATCH_SIZE);

    for (const [id, data] of chunk) {
      const ref = doc(db, coleccion, id);
      batch.set(ref, data);
    }

    await batch.commit();
    total += chunk.length;
    console.log(`  ✅ ${label}: ${total}/${entries.length} documentos`);
  }
}

async function main() {
  console.log("🚆 ══════════════════════════════════════════");
  console.log("   IMPORTACIÓN TREN SARMIENTO → FIRESTORE   ");
  console.log("   Cronograma vigente desde 09/03/2026       ");
  console.log("══════════════════════════════════════════════\n");

  try {
    console.log("📍 Importando estaciones...");
    await importarColeccion("estaciones", ESTACIONES, "Estaciones");

    console.log("🚆 Importando líneas...");
    await importarColeccion("lineas", LINEAS, "Líneas");

    console.log("💳 Importando tarifas...");
    await importarColeccion("tarifas", TARIFAS, "Tarifas");

    console.log("📋 Importando metadata...");
    await importarColeccion("metadata", METADATA, "Metadata");

    console.log("🕐 Importando servicios (trenes)...");
    await importarColeccion("servicios", SERVICIOS, "Servicios");

    const stats = {
      total:    Object.keys(SERVICIOS).length,
      normales: Object.values(SERVICIOS).filter(s => s.tipo === "normal").length,
      locales:  Object.values(SERVICIOS).filter(s => s.tipo === "local").length,
      lv:       Object.values(SERVICIOS).filter(s => s.dias === "lunes_viernes").length,
      sa:       Object.values(SERVICIOS).filter(s => s.dias === "sabados").length,
      df:       Object.values(SERVICIOS).filter(s => s.dias === "domingos_feriados").length,
    };

    console.log("\n🎉 ══════════════════════════════════════════");
    console.log("   IMPORTACIÓN COMPLETA");
    console.log(`   Servicios totales : ${stats.total}`);
    console.log(`   Normales (3xxx)   : ${stats.normales}`);
    console.log(`   Locales  (9xxx)   : ${stats.locales}`);
    console.log(`   Lunes–Viernes     : ${stats.lv}`);
    console.log(`   Sábados           : ${stats.sa}`);
    console.log(`   Domingos/Feriados : ${stats.df}`);
    console.log("══════════════════════════════════════════════");

  } catch (err) {
    console.error("❌ Error durante la importación:", err.message);
    process.exit(1);
  }
}

main();

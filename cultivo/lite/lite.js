// CultivApp Lite — versión reducida y autónoma de CultivApp.
// Dos cosas, hechas fácil: (1) reasignar la ubicación de las plantas, (2) cambiar las luces.
// Misma base Firestore que la app completa (lugares / plantas), sin imports cruzados.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getFirestore, collection, doc, getDocs, updateDoc, writeBatch, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyB1T67NPR_qNcAyFp8_DT_QWCst7OBIxTc",
  authDomain:        "cultivapp-c9672.firebaseapp.com",
  projectId:         "cultivapp-c9672",
  storageBucket:     "cultivapp-c9672.firebasestorage.app",
  messagingSenderId: "964166014307",
  appId:             "1:964166014307:web:84ef7664c025f3d1c86f56"
};
const db = getFirestore(initializeApp(firebaseConfig));

const PROXY_URL   = "https://cultivapp-tuya-proxy.onrender.com";
const LUCES_BASE  = ["Insativa 200w", "Santa Planta 250w", "Galponera 100w Fría", "Mars Orbiter"];
const ALTURA_MIN  = 40, ALTURA_MAX = 140, ALTURA_DEF = 70;

// ─── Estado ──────────────────────────────────────────────────────────────────
let lugares = [];   // [{id, nombre, luces[], alturaLuces, switchLuces[], areas:[{id,nombre,luces[]}]}]
let plantas = [];   // [{id, nombre, genetica, fase, lugarId, areaId, areaNombre, fechaInicio}]
let modoSel = false;
let seleccion = new Set();
let accionSheet = null; // función async que se ejecuta con "Guardar"

// ─── Helpers ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const lugarPor = id => lugares.find(l => l.id === id);

function toast(msg, err = false) {
  const t = $("toast");
  t.textContent = msg;
  t.className = "toast on" + (err ? " err" : "");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("on"), 2600);
}

function iconoFase(fase) {
  const f = String(fase || "").toLowerCase();
  if (f.startsWith("germ")) return "🌱";
  if (f.startsWith("veg"))  return "🌿";
  if (f.startsWith("flo"))  return "🌸";
  if (f.startsWith("cos"))  return "✂️";
  return "🪴";
}
const esCosechada = p => String(p.fase || "").toLowerCase().startsWith("cos");

function diasDeCiclo(p) {
  const f = p.fechaInicio?.toDate ? p.fechaInicio.toDate() : (p.fechaInicio ? new Date(p.fechaInicio) : null);
  if (!f || isNaN(f)) return null;
  return Math.max(0, Math.floor((Date.now() - f.getTime()) / 86400000));
}

const textoLuces = luces => (luces || []).length
  ? luces.map(l => `${esc(l.cantidad)}× ${esc(l.tipo)}`).join(", ")
  : "Sin luces cargadas";

// ─── Carga ───────────────────────────────────────────────────────────────────
async function cargar() {
  $("vista-plantas").innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
  try {
    const [lSnap, pSnap] = await Promise.all([getDocs(collection(db, "lugares")), getDocs(collection(db, "plantas"))]);
    lugares = await Promise.all(lSnap.docs.map(async d => {
      const aSnap = await getDocs(collection(db, "lugares", d.id, "areas"));
      return { ...d.data(), id: d.id, areas: aSnap.docs.map(a => ({ ...a.data(), id: a.id })) };
    }));
    lugares.sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"));
    plantas = pSnap.docs.map(d => ({ ...d.data(), id: d.id }));
    renderTodo();
    cargarEstadoLuces();
  } catch (err) {
    console.error(err);
    $("vista-plantas").innerHTML = `<p class="vacio">No se pudo cargar.<br>${esc(err.message)}<br><br><button class="btn" id="reintentar" type="button">Reintentar</button></p>`;
    $("reintentar")?.addEventListener("click", cargar);
  }
}

function renderTodo() { renderPlantas(); renderLuces(); renderSeleccion(); actualizarSugerenciasLuces(); }

// ─── Vista PLANTAS ───────────────────────────────────────────────────────────
function filaPlanta(p) {
  const dias = diasDeCiclo(p);
  const sub = [p.genetica, dias != null ? `día ${dias}` : null].filter(Boolean).map(esc).join(" · ");
  const elegida = seleccion.has(p.id);
  return `<button type="button" class="fila${elegida ? " elegida" : ""}${esCosechada(p) ? " cosechada" : ""}" data-planta="${esc(p.id)}">
    <span class="check" aria-hidden="true">${elegida ? "✓" : ""}</span>
    <span class="ico" aria-hidden="true">${iconoFase(p.fase)}</span>
    <span class="txt"><div class="nom">${esc(p.nombre || "Sin nombre")}</div><div class="sub">${sub || "&nbsp;"}</div></span>
    <span class="mover">Mover ›</span>
  </button>`;
}

function renderPlantas() {
  const cont = $("vista-plantas");
  cont.classList.toggle("modo-sel", modoSel);
  if (!plantas.length) { cont.innerHTML = '<p class="vacio">Todavía no hay plantas cargadas.</p>'; return; }

  const idsLugar = new Set(lugares.map(l => l.id));
  let html = "";

  for (const l of lugares) {
    const delLugar = plantas.filter(p => p.lugarId === l.id);
    if (!delLugar.length && !l.areas.length) continue;
    const idsArea = new Set(l.areas.map(a => a.id));
    html += `<div class="grupo"><div class="grupo-head"><span>🏕️ ${esc(l.nombre || "Lugar")} <small>${delLugar.length} ${delLugar.length === 1 ? "planta" : "plantas"}</small></span>
      <button type="button" class="sel-grupo" data-selgrupo="${esc(l.id)}|*">Todas</button></div>`;
    if (l.areas.length) {
      for (const a of l.areas) {
        const pa = delLugar.filter(p => p.areaId === a.id);
        html += `<div class="subgrupo"><span>${esc(a.nombre || "Área")} · ${pa.length}</span><button type="button" class="sel-grupo" data-selgrupo="${esc(l.id)}|${esc(a.id)}">Todas</button></div>`;
        html += pa.map(filaPlanta).join("") || '<p style="margin:0 4px 8px;color:var(--muted);font-size:.8rem">Sin plantas</p>';
      }
      const sinArea = delLugar.filter(p => !p.areaId || !idsArea.has(p.areaId));
      if (sinArea.length) {
        html += `<div class="subgrupo"><span>Sin área · ${sinArea.length}</span></div>` + sinArea.map(filaPlanta).join("");
      }
    } else {
      html += delLugar.map(filaPlanta).join("");
    }
    html += "</div>";
  }

  const huerfanas = plantas.filter(p => !idsLugar.has(p.lugarId));
  if (huerfanas.length) {
    html += `<div class="grupo"><div class="grupo-head"><span>❓ Sin ubicación <small>${huerfanas.length}</small></span></div>${huerfanas.map(filaPlanta).join("")}</div>`;
  }
  cont.innerHTML = html;
}

// Selección múltiple
function renderSeleccion() {
  $("btn-seleccionar").setAttribute("aria-pressed", String(modoSel));
  $("btn-seleccionar").textContent = modoSel ? "Cancelar" : "Seleccionar";
  const n = seleccion.size;
  $("barra-seleccion").hidden = !(modoSel && n > 0 && $("vista-plantas").classList.contains("activa"));
  $("sel-count").textContent = `${n} ${n === 1 ? "seleccionada" : "seleccionadas"}`;
}
function setModoSel(v) { modoSel = v; if (!v) seleccion.clear(); renderPlantas(); renderSeleccion(); }

function toggleGrupo(lugarId, areaId) {
  const ids = plantas
    .filter(p => p.lugarId === lugarId && (areaId === "*" || p.areaId === areaId))
    .map(p => p.id);
  const todas = ids.length && ids.every(id => seleccion.has(id));
  ids.forEach(id => todas ? seleccion.delete(id) : seleccion.add(id));
  renderPlantas(); renderSeleccion();
}

// ─── Hoja inferior ───────────────────────────────────────────────────────────
function abrirSheet({ titulo, cuerpo, okTexto = "Guardar", onOk, onMostrar }) {
  $("sheet-titulo").textContent = titulo;
  $("sheet-cuerpo").innerHTML = cuerpo;
  $("sheet-ok").textContent = okTexto;
  $("sheet-ok").disabled = false;
  accionSheet = onOk;
  $("overlay").hidden = false;
  document.body.style.overflow = "hidden";
  onMostrar?.();
}
function cerrarSheet() { $("overlay").hidden = true; accionSheet = null; document.body.style.overflow = ""; }

// ─── Mover plantas ───────────────────────────────────────────────────────────
function abrirMover(ids) {
  const sel = plantas.filter(p => ids.includes(p.id));
  if (!sel.length) return;
  if (!lugares.length) { toast("No hay lugares cargados", true); return; }

  // Preselecciona el lugar/área actual si todas comparten uno
  const mismoLugar = sel.every(p => p.lugarId === sel[0].lugarId) ? sel[0].lugarId : null;
  const mismaArea  = mismoLugar && sel.every(p => (p.areaId || "") === (sel[0].areaId || "")) ? (sel[0].areaId || "") : "";
  const lugarIni   = lugarPor(mismoLugar) ? mismoLugar : lugares[0].id;

  const nombres = sel.length <= 4 ? sel.map(p => p.nombre || "Sin nombre").join(", ") : `${sel.length} plantas`;
  const cuerpo = `
    <p class="lead">${esc(nombres)}</p>
    <div class="campo-form"><label for="mv-lugar">Lugar</label>
      <select id="mv-lugar">${lugares.map(l => `<option value="${esc(l.id)}"${l.id === lugarIni ? " selected" : ""}>${esc(l.nombre || "Lugar")}</option>`).join("")}</select></div>
    <div class="campo-form" id="mv-area-wrap"><label for="mv-area">Área</label><select id="mv-area"></select></div>`;

  const llenarAreas = (areaSel = "") => {
    const l = lugarPor($("mv-lugar").value);
    const wrap = $("mv-area-wrap");
    wrap.hidden = !l?.areas.length;
    $("mv-area").innerHTML = `<option value="">Sin área</option>` +
      (l?.areas || []).map(a => `<option value="${esc(a.id)}"${a.id === areaSel ? " selected" : ""}>${esc(a.nombre || "Área")}</option>`).join("");
  };

  abrirSheet({
    titulo: sel.length === 1 ? "Mover planta" : "Mover plantas",
    okTexto: "Mover",
    cuerpo,
    onMostrar: () => { llenarAreas(mismaArea); $("mv-lugar").addEventListener("change", () => llenarAreas()); },
    onOk: async () => {
      const lugarId = $("mv-lugar").value;
      const areaId  = $("mv-area-wrap").hidden ? "" : $("mv-area").value;
      await moverPlantas(sel, lugarId, areaId);
    },
  });
}

function etiquetaUbicacion(lugarId, areaId, areaNombre) {
  const l = lugarPor(lugarId);
  const a = l?.areas.find(x => x.id === areaId);
  const an = a?.nombre || areaNombre || "";
  return (l?.nombre || "Sin ubicación") + (an ? " · " + an : "");
}

async function moverPlantas(sel, lugarId, areaId) {
  const lugar = lugarPor(lugarId);
  const area  = lugar?.areas.find(a => a.id === areaId);
  if (!lugar) { toast("Lugar inválido", true); return; }
  const aMover = sel.filter(p => p.lugarId !== lugarId || (p.areaId || "") !== (areaId || ""));
  if (!aMover.length) { toast("Ya están en esa ubicación"); cerrarSheet(); return; }

  const destino = etiquetaUbicacion(lugarId, areaId);
  const ahora = new Date();
  const hora = `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;

  // Lotes de hasta 200 plantas (2 escrituras por planta, tope de Firestore: 500 por lote)
  for (let i = 0; i < aMover.length; i += 200) {
    const batch = writeBatch(db);
    for (const p of aMover.slice(i, i + 200)) {
      batch.update(doc(db, "plantas", p.id), {
        lugarId, areaId: areaId || "", areaNombre: area?.nombre || "",
        ubicacionActualizadaEn: serverTimestamp(),
      });
      // Queda registrado en la bitácora de la planta (tipo "otro", como las notas de la app completa)
      batch.set(doc(collection(db, "plantas", p.id, "eventos")), {
        titulo: `📍 Movida a ${destino}`, tipo: "otro", fecha: ahora, hora,
        descripcion: `Desde: ${etiquetaUbicacion(p.lugarId, p.areaId, p.areaNombre)}`,
        realizado: true, origen: "lite", creadoEn: serverTimestamp(),
      });
    }
    await batch.commit();
  }

  // Actualización local (sin recargar todo)
  const ids = new Set(aMover.map(p => p.id));
  plantas.forEach(p => { if (ids.has(p.id)) { p.lugarId = lugarId; p.areaId = areaId || ""; p.areaNombre = area?.nombre || ""; } });
  seleccion.clear(); modoSel = false;
  cerrarSheet(); renderTodo();
  toast(`${aMover.length === 1 ? "Planta movida" : aMover.length + " plantas movidas"} a ${destino} ✓`);
}

// ─── Vista LUCES ─────────────────────────────────────────────────────────────
const estadoLuz = {}; // lugarId -> {online, encendido}

function renderLuces() {
  const cont = $("vista-luces");
  if (!lugares.length) { cont.innerHTML = '<p class="vacio">No hay lugares cargados.</p>'; return; }
  cont.innerHTML = lugares.map(l => {
    const est = estadoLuz[l.id];
    const badge = !est ? "" : !est.online
      ? '<span class="badge off">📴 Sin conexión</span>'
      : est.encendido ? '<span class="badge on">💡 Encendidas</span>' : '<span class="badge">🌑 Apagadas</span>';
    const areas = l.areas.map(a => `
      <div class="area-fila"><div class="txt"><div class="nom">${esc(a.nombre || "Área")}</div><div class="sub">${textoLuces(a.luces)}</div></div>
        <button type="button" class="btn btn-sm" data-luces="${esc(l.id)}|${esc(a.id)}">Cambiar</button></div>`).join("");
    return `<div class="card"><h3><span>🏕️ ${esc(l.nombre || "Lugar")}</span>${badge}</h3>
      <div class="dato">💡 <b>${textoLuces(l.luces)}</b></div>
      <div class="dato">🔆 A <b>${esc(l.alturaLuces ?? ALTURA_DEF)} cm</b> de las plantas</div>
      <div style="margin-top:12px"><button type="button" class="btn btn-primary" data-luces="${esc(l.id)}|">Cambiar luces</button></div>
      ${areas}</div>`;
  }).join("");
}

function actualizarSugerenciasLuces() {
  const set = new Set(LUCES_BASE);
  lugares.forEach(l => { (l.luces || []).forEach(x => x.tipo && set.add(x.tipo)); l.areas.forEach(a => (a.luces || []).forEach(x => x.tipo && set.add(x.tipo))); });
  $("lista-luces").innerHTML = [...set].map(t => `<option value="${esc(t)}"></option>`).join("");
}

function filaLuzHTML(l = { tipo: "", cantidad: 1 }) {
  return `<div class="luz-row">
    <input class="luz-tipo" type="text" list="lista-luces" placeholder="Tipo de luz" value="${esc(l.tipo)}" maxlength="60" autocomplete="off" aria-label="Tipo de luz">
    <input class="luz-cant" type="number" min="1" max="99" inputmode="numeric" value="${esc(l.cantidad || 1)}" aria-label="Cantidad">
    <button type="button" class="quitar" aria-label="Quitar esta luz">🗑</button></div>`;
}

function abrirLuces(lugarId, areaId) {
  const l = lugarPor(lugarId);
  if (!l) return;
  const a = areaId ? l.areas.find(x => x.id === areaId) : null;
  const luces = (a ? a.luces : l.luces) || [];
  const conAltura = !a;
  const altura = Number(l.alturaLuces ?? ALTURA_DEF);

  const cuerpo = `
    <p class="lead">${esc(l.nombre || "Lugar")}${a ? " · " + esc(a.nombre || "Área") : ""}</p>
    <div class="campo-form"><label>Luces instaladas</label>
      <div id="luces-filas">${(luces.length ? luces : [undefined]).map(filaLuzHTML).join("")}</div>
      <button type="button" class="btn btn-sm" id="luz-agregar">＋ Agregar otra luz</button></div>
    ${conAltura ? `<div class="campo-form"><label for="luz-altura">Distancia a las plantas: <span id="luz-altura-val">${altura}</span> cm</label>
      <input id="luz-altura" type="range" min="${ALTURA_MIN}" max="${ALTURA_MAX}" step="1" value="${Math.min(ALTURA_MAX, Math.max(ALTURA_MIN, altura))}"></div>` : ""}`;

  abrirSheet({
    titulo: "Cambiar luces", cuerpo,
    onMostrar: () => {
      $("luz-agregar").addEventListener("click", () => $("luces-filas").insertAdjacentHTML("beforeend", filaLuzHTML()));
      $("luces-filas").addEventListener("click", e => { if (e.target.closest(".quitar")) e.target.closest(".luz-row").remove(); });
      $("luz-altura")?.addEventListener("input", e => { $("luz-altura-val").textContent = e.target.value; });
    },
    onOk: async () => {
      const nuevas = [...document.querySelectorAll("#luces-filas .luz-row")].map(r => ({
        tipo: r.querySelector(".luz-tipo").value.trim().slice(0, 60),
        cantidad: Math.min(99, Math.max(1, parseInt(r.querySelector(".luz-cant").value, 10) || 1)),
      })).filter(x => x.tipo);

      const cambios = { luces: nuevas, lucesActualizadasEn: serverTimestamp() };
      if (conAltura) cambios.alturaLuces = Number($("luz-altura").value);
      const ref = a ? doc(db, "lugares", lugarId, "areas", areaId) : doc(db, "lugares", lugarId);
      await updateDoc(ref, cambios);

      if (a) a.luces = nuevas; else { l.luces = nuevas; l.alturaLuces = cambios.alturaLuces; }
      cerrarSheet(); renderLuces(); actualizarSugerenciasLuces();
      toast("Luces actualizadas ✓");
    },
  });
}

// Estado encendido/apagado (solo lectura, mejor esfuerzo: el proxy en Render puede estar dormido)
async function cargarEstadoLuces() {
  const base = (localStorage.getItem("tuya_proxy") || PROXY_URL + "/tuya").replace(/\/tuya$/, "");
  await Promise.all(lugares.filter(l => (l.switchLuces || [])[0]).map(async l => {
    try {
      const r = await fetch(`${base}/tuya?device=${encodeURIComponent(l.switchLuces[0])}`, { signal: AbortSignal.timeout(12000) });
      if (!r.ok) return;
      const d = await r.json();
      estadoLuz[l.id] = { online: !!d.online, encendido: !!(d.sensores && d.sensores.encendido) };
      renderLuces();
    } catch { /* sin estado: no se muestra badge */ }
  }));
}

// ─── Eventos ─────────────────────────────────────────────────────────────────
function irAVista(id) {
  document.querySelectorAll(".vista").forEach(v => v.classList.toggle("activa", v.id === id));
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("activa", t.dataset.vista === id));
  $("btn-seleccionar").hidden = id !== "vista-plantas";
  if (id !== "vista-plantas" && modoSel) setModoSel(false);
  renderSeleccion();
  history.replaceState(null, "", id === "vista-luces" ? "#luces" : "#plantas");
  window.scrollTo(0, 0);
}

document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => irAVista(t.dataset.vista)));
$("btn-seleccionar").addEventListener("click", () => setModoSel(!modoSel));
$("btn-mover-sel").addEventListener("click", () => abrirMover([...seleccion]));
$("sheet-cancelar").addEventListener("click", cerrarSheet);
$("overlay").addEventListener("click", e => { if (e.target === $("overlay")) cerrarSheet(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("overlay").hidden) cerrarSheet(); });

$("sheet-ok").addEventListener("click", async () => {
  if (!accionSheet) return;
  const btn = $("sheet-ok");
  btn.disabled = true;
  try { await accionSheet(); }
  catch (err) { console.error(err); toast("Error: " + err.message, true); btn.disabled = false; }
});

$("vista-plantas").addEventListener("click", e => {
  const g = e.target.closest("[data-selgrupo]");
  if (g) { const [lid, aid] = g.dataset.selgrupo.split("|"); toggleGrupo(lid, aid); return; }
  const fila = e.target.closest("[data-planta]");
  if (!fila) return;
  const id = fila.dataset.planta;
  if (modoSel) { seleccion.has(id) ? seleccion.delete(id) : seleccion.add(id); renderPlantas(); renderSeleccion(); }
  else abrirMover([id]);
});

$("vista-luces").addEventListener("click", e => {
  const b = e.target.closest("[data-luces]");
  if (b) { const [lid, aid] = b.dataset.luces.split("|"); abrirLuces(lid, aid); }
});

// Modo campo (claro) persistido
const aplicarCampo = v => document.documentElement.classList.toggle("campo", v);
try { aplicarCampo(localStorage.getItem("lite_campo") === "1"); } catch {}
$("btn-campo").addEventListener("click", () => {
  const v = !document.documentElement.classList.contains("campo");
  aplicarCampo(v);
  try { localStorage.setItem("lite_campo", v ? "1" : "0"); } catch {}
});

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

irAVista(location.hash === "#luces" ? "vista-luces" : "vista-plantas");
cargar();

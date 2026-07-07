// Rutas de administración interna: alta de cooperativas y usuarios.
// Protegidas por adminAuth (x-admin-secret header).
// Replica la lógica de scripts/onboarding-cooperativa.js pero como API REST,
// para ser consumida desde la planilla web de admin.
import { Router } from 'express';
import { db } from '../lib/firebase-admin.js';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'node:crypto';

export const router = Router();

const roles = ['admin', 'consejero', 'sindico', 'operador', 'consulta'];

function escapeText(v) {
  return String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
}
function normalizeEmail(v) {
  return escapeText(v).toLowerCase();
}
function generarPassword() {
  return randomBytes(12).toString('base64url');
}

// ─── POST /admin/cooperativa ─────────────────────────────────────────────────
// Crea una cooperativa nueva con su primer usuario admin.
// Body: { nombre, matricula, cuit, email, domicilio?, localidad?, provincia? }
router.post('/cooperativa', async (req, res) => {
  const { nombre, matricula, cuit, email,
          domicilio = '', localidad = '', provincia = '' } = req.body ?? {};

  const n = escapeText(nombre);
  const m = escapeText(matricula);
  const c = escapeText(cuit);
  const e = normalizeEmail(email);

  if (!n) return res.status(400).json({ error: 'El nombre es obligatorio.' });
  if (!m) return res.status(400).json({ error: 'La matrícula es obligatoria.' });
  if (!/^\d{2}-\d{8}-\d{1}$/.test(c))
    return res.status(400).json({ error: 'CUIT inválido. Formato esperado: NN-NNNNNNNN-N' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    return res.status(400).json({ error: 'Email inválido.' });

  // Evitar duplicados por matrícula
  const dup = await db.collection('cooperativas').where('matricula', '==', m).limit(1).get();
  if (!dup.empty)
    return res.status(409).json({ error: `Ya existe una cooperativa con matrícula ${m}.` });

  const auth = getAuth();
  const password = generarPassword();
  let uid;

  try {
    const user = await auth.createUser({ email: e, password, emailVerified: false });
    uid = user.uid;
  } catch (err) {
    if (err.code === 'auth/email-already-exists')
      return res.status(409).json({ error: `Ya existe un usuario con el email ${e}.` });
    throw err;
  }

  try {
    const ahora = FieldValue.serverTimestamp();
    const coopRef = db.collection('cooperativas').doc();
    const cooperativaId = coopRef.id;

    await coopRef.set({
      nombre: n, matricula: m, cuit: c, email: e,
      domicilio: escapeText(domicilio),
      localidad: escapeText(localidad),
      provincia: escapeText(provincia),
      telefono: '', sitioWeb: '', logoUrl: '', colorPrincipal: '',
      plan: 'free', activa: true, federacionId: null,
      fechaAlta: ahora, creadoPor: 'admin-panel',
      fechaCreacion: ahora, modificadoPor: 'admin-panel', fechaModificacion: ahora
    });

    await coopRef.collection('usuarios').doc(uid).set({
      uid, nombre: '', apellido: '', email: e, telefono: '',
      rol: 'admin', activo: true, ultimoAcceso: null,
      fechaInvitacion: ahora, fechaAlta: ahora,
      creadoPor: 'admin-panel', fechaCreacion: ahora,
      modificadoPor: 'admin-panel', fechaModificacion: ahora
    });

    await db.collection('usuariosIndex').doc(uid).set({ cooperativaId });

    res.status(201).json({ cooperativaId, uid, email: e, passwordTemporal: password });
  } catch (err) {
    // Auth ya creado: avisar sin borrar automáticamente
    res.status(500).json({
      error: `Usuario Auth creado (uid: ${uid}) pero falló Firestore: ${err.message}. Revisá manualmente.`
    });
  }
});

// ─── GET /admin/cooperativas ─────────────────────────────────────────────────
// Lista todas las cooperativas (id, nombre, matrícula, plan, activa).
router.get('/cooperativas', async (req, res) => {
  const snap = await db.collection('cooperativas').orderBy('nombre').get();
  const data = snap.docs.map(d => {
    const x = d.data();
    return { id: d.id, nombre: x.nombre, matricula: x.matricula, plan: x.plan, activa: x.activa };
  });
  res.json({ data });
});

// ─── POST /admin/usuario ─────────────────────────────────────────────────────
// Agrega un usuario a una cooperativa existente.
// Body: { cooperativaId, email, nombre, apellido, rol }
router.post('/usuario', async (req, res) => {
  const { cooperativaId, email, nombre, apellido, rol } = req.body ?? {};

  const cid = escapeText(cooperativaId);
  const e   = normalizeEmail(email);
  const n   = escapeText(nombre);
  const ap  = escapeText(apellido);
  const r   = escapeText(rol);

  if (!cid) return res.status(400).json({ error: 'cooperativaId es obligatorio.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    return res.status(400).json({ error: 'Email inválido.' });
  if (!n)   return res.status(400).json({ error: 'El nombre es obligatorio.' });
  if (!ap)  return res.status(400).json({ error: 'El apellido es obligatorio.' });
  if (!roles.includes(r))
    return res.status(400).json({ error: `Rol inválido. Opciones: ${roles.join(', ')}.` });

  // Verificar que la cooperativa existe
  const coopDoc = await db.collection('cooperativas').doc(cid).get();
  if (!coopDoc.exists)
    return res.status(404).json({ error: `No existe cooperativa con id ${cid}.` });

  const auth = getAuth();
  const password = generarPassword();
  let uid;

  try {
    const user = await auth.createUser({ email: e, password, emailVerified: false });
    uid = user.uid;
  } catch (err) {
    if (err.code === 'auth/email-already-exists')
      return res.status(409).json({ error: `Ya existe un usuario con el email ${e}.` });
    throw err;
  }

  try {
    const ahora = FieldValue.serverTimestamp();

    await db.collection('cooperativas').doc(cid)
      .collection('usuarios').doc(uid).set({
        uid, nombre: n, apellido: ap, email: e, telefono: '',
        rol: r, activo: true, ultimoAcceso: null,
        fechaInvitacion: ahora, fechaAlta: ahora,
        creadoPor: 'admin-panel', fechaCreacion: ahora,
        modificadoPor: 'admin-panel', fechaModificacion: ahora
      });

    await db.collection('usuariosIndex').doc(uid).set({ cooperativaId: cid });

    res.status(201).json({ uid, email: e, nombre: n, apellido: ap, rol: r, passwordTemporal: password });
  } catch (err) {
    res.status(500).json({
      error: `Usuario Auth creado (uid: ${uid}) pero falló Firestore: ${err.message}. Revisá manualmente.`
    });
  }
});

// ─── GET /admin/usuarios/:cooperativaId ──────────────────────────────────────
// Lista usuarios de una cooperativa.
router.get('/usuarios/:cooperativaId', async (req, res) => {
  const cid = escapeText(req.params.cooperativaId);
  const snap = await db.collection('cooperativas').doc(cid).collection('usuarios').get();
  const data = snap.docs.map(d => {
    const x = d.data();
    return { uid: d.id, nombre: x.nombre, apellido: x.apellido, email: x.email, rol: x.rol, activo: x.activo };
  });
  res.json({ data });
});

// ─── PATCH /admin/usuario/:cooperativaId/:uid ─────────────────────────────────
// Modifica rol o estado activo de un usuario existente.
router.patch('/usuario/:cooperativaId/:uid', async (req, res) => {
  const cid = escapeText(req.params.cooperativaId);
  const uid = escapeText(req.params.uid);
  const { rol, activo } = req.body ?? {};

  const update = {};
  if (rol !== undefined) {
    if (!roles.includes(rol))
      return res.status(400).json({ error: `Rol inválido. Opciones: ${roles.join(', ')}.` });
    update.rol = rol;
  }
  if (activo !== undefined) update.activo = activo === true || activo === 'true';
  if (!Object.keys(update).length)
    return res.status(400).json({ error: 'Nada para actualizar. Mandá rol y/o activo.' });

  update.modificadoPor = 'admin-panel';
  update.fechaModificacion = FieldValue.serverTimestamp();

  await db.collection('cooperativas').doc(cid).collection('usuarios').doc(uid).update(update);
  res.json({ ok: true, uid, ...update });
});

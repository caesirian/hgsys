import { Router } from 'express';
import { db } from '../lib/firebase-admin.js';

export const router = Router();

// Todas las rutas acá ya pasaron por apiKeyAuth (montado en index.js), así
// que req.cooperativaId está garantizado.

function coopCollection(req, name) {
  return db.collection('cooperativas').doc(req.cooperativaId).collection(name);
}

// GET /v1/asociados — lista asociados activos (datos mínimos, sin
// observaciones internas ni domicilio completo).
router.get('/asociados', async (req, res) => {
  try {
    const snap = await coopCollection(req, 'asociados')
      .where('estado', '==', 'activo')
      .get();
    const data = snap.docs.map(d => {
      const a = d.data();
      return {
        id: d.id,
        numeroAsociado: a.numeroAsociado,
        nombre: a.nombre,
        apellido: a.apellido,
        estado: a.estado,
        fechaIngreso: a.fechaIngreso
      };
    });
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar asociados.' });
  }
});

// GET /v1/vencimientos?estado=vencido — lista vencimientos, filtrable por estado.
router.get('/vencimientos', async (req, res) => {
  try {
    let query = coopCollection(req, 'vencimientos');
    if (req.query.estado) {
      query = query.where('estado', '==', req.query.estado);
    }
    const snap = await query.get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar vencimientos.' });
  }
});

// GET /v1/documentos-publicos — solo documentos marcados como visible:true.
router.get('/documentos-publicos', async (req, res) => {
  try {
    const snap = await coopCollection(req, 'documentos')
      .where('visible', '==', true)
      .get();
    const data = snap.docs.map(d => {
      const doc = d.data();
      return {
        id: d.id,
        nombre: doc.nombre,
        categoria: doc.categoria,
        descripcion: doc.descripcion,
        url: doc.url,
        fechaCarga: doc.fechaCarga
      };
    });
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar documentos.' });
  }
});

// GET /v1/cooperativa — datos institucionales básicos (sin CUIT completo).
router.get('/cooperativa', async (req, res) => {
  try {
    const doc = await db.collection('cooperativas').doc(req.cooperativaId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Cooperativa no encontrada.' });
    const c = doc.data();
    res.json({
      data: {
        nombre: c.nombre,
        matricula: c.matricula,
        domicilio: c.domicilio,
        localidad: c.localidad,
        provincia: c.provincia,
        telefono: c.telefono,
        email: c.email,
        sitioWeb: c.sitioWeb
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar datos institucionales.' });
  }
});

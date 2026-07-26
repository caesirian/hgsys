// Proxy hacia el padrón público de ARCA (ex-AFIP).
// Ruta: GET /padron/:cuit
//
// No requiere API key — es una consulta pública que el panel usa
// internamente al cargar un asociado. El backend actúa como proxy
// para evitar problemas de CORS desde el cliente browser.
//
// Endpoint oficial de ARCA sin autenticación:
//   https://soa.afip.gob.ar/sr-padron/v2/persona/{cuit}
// Devuelve datos del contribuyente si existe en el padrón.

import { Router } from 'express';

export const router = Router();

const ARCA_URL = 'https://soa.afip.gob.ar/sr-padron/v2/persona';

// Valida dígito verificador CUIT/CUIL — algoritmo oficial
function validarDigito(cuit) {
  if (!/^\d{11}$/.test(cuit)) return false;
  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = mult.reduce((acc, m, i) => acc + m * parseInt(cuit[i]), 0);
  const resto = suma % 11;
  const dv = resto === 0 ? 0 : resto === 1 ? 9 : 11 - resto;
  return dv === parseInt(cuit[10]);
}

router.get('/:cuit', async (req, res) => {
  const cuit = String(req.params.cuit).replace(/[-\s]/g, '');

  if (!/^\d{11}$/.test(cuit)) {
    return res.status(400).json({ error: 'CUIT inválido. Debe tener 11 dígitos.' });
  }
  if (!validarDigito(cuit)) {
    return res.status(400).json({ error: 'CUIT inválido (dígito verificador incorrecto).' });
  }

  try {
    const resp = await fetch(`${ARCA_URL}/${cuit}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });

    if (resp.status === 404) {
      return res.status(404).json({ error: 'CUIT no encontrado en el padrón de ARCA.' });
    }
    if (!resp.ok) {
      return res.status(502).json({ error: `ARCA respondió con error ${resp.status}.` });
    }

    const data = await resp.json();

    // Normalizar la respuesta — ARCA devuelve estructura anidada
    // { data: { idPersona, tipoPersona, datosGenerales: { nombre, apellido, razonSocial, ... } } }
    const persona = data?.data ?? data;
    const datos = persona?.datosGenerales ?? persona;

    res.json({
      cuit,
      razonSocial:       datos?.razonSocial       ?? null,
      nombre:            datos?.nombre             ?? null,
      apellido:          datos?.apellido           ?? null,
      tipoContribuyente: datos?.tipoPersona        ?? persona?.tipoPersona ?? null,
      estado:            datos?.estadoClave        ?? null,
      domicilioFiscal:   datos?.domicilioFiscal?.direccion ?? null,
    });

  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return res.status(504).json({ error: 'ARCA no respondió a tiempo. Intentá de nuevo.' });
    }
    console.error('Error consultando ARCA:', err.message);
    res.status(502).json({ error: 'No se pudo consultar el padrón de ARCA.' });
  }
});

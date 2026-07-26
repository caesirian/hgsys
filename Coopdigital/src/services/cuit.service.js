/**
 * cuit.service.js
 * Consulta datos de un contribuyente argentino a partir de su CUIT/CUIL
 * usando el endpoint proxy de CoopDigital API (coopdigital-api en Render),
 * que a su vez consulta el padrón oficial de ARCA sin requerir certificado.
 *
 * Endpoint propio: GET /padron/:cuit
 * Devuelve: { cuit, razonSocial, nombre, apellido, tipoContribuyente, estado }
 *
 * Política de uso:
 *   - Solo se consulta al salir del campo (blur), nunca al tipear.
 *   - Resultado se cachea en memoria por sesión para no repetir la misma consulta.
 *   - Si el servicio falla, se silencia — no bloquea el formulario.
 */

// URL del backend propio. Se puede sobreescribir con una variable de entorno
// si el dominio de Render cambia.
const API_BASE = 'https://coopdigital-api.onrender.com';

const _cache = new Map();

/**
 * Limpia y normaliza un CUIT: saca guiones, espacios y valida longitud.
 */
export function normalizarCuit(raw) {
  const limpio = String(raw ?? '').replace(/[-\s]/g, '');
  if (!/^\d{11}$/.test(limpio)) return null;
  return limpio;
}

/**
 * Valida el dígito verificador del CUIT/CUIL según algoritmo oficial.
 */
export function validarDigitoCuit(cuit) {
  if (!cuit || cuit.length !== 11) return false;
  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = mult.reduce((acc, m, i) => acc + m * parseInt(cuit[i]), 0);
  const resto = suma % 11;
  const dv = resto === 0 ? 0 : resto === 1 ? 9 : 11 - resto;
  return dv === parseInt(cuit[10]);
}

/**
 * Consulta el padrón de ARCA vía el proxy propio de CoopDigital API.
 */
export async function consultarCuit(cuitRaw) {
  const cuit = normalizarCuit(cuitRaw);
  if (!cuit) return _vacio();
  if (!validarDigitoCuit(cuit)) return _vacio();
  if (_cache.has(cuit)) return _cache.get(cuit);

  try {
    const res = await fetch(`${API_BASE}/padron/${cuit}`, {
      signal: AbortSignal.timeout(10000)
    });

    // 400 = CUIT inválido (ya lo validamos antes, no debería pasar)
    // 404 = no está en el padrón
    // 502/504 = ARCA no disponible
    if (!res.ok) return _vacio();

    const data = await res.json();

    const resultado = {
      razonSocial:       data.razonSocial       ?? null,
      nombre:            data.nombre             ?? null,
      apellido:          data.apellido           ?? null,
      tipoContribuyente: data.tipoContribuyente  ?? null,
      estado:            data.estado             ?? null,
    };

    _cache.set(cuit, resultado);
    return resultado;

  } catch {
    return _vacio();
  }
}

function _vacio() {
  return { razonSocial: null, nombre: null, apellido: null, tipoContribuyente: null, estado: null };
}

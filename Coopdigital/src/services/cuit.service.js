/**
 * cuit.service.js
 * Consulta datos de un contribuyente argentino a partir de su CUIT/CUIL
 * usando el endpoint público de AfipSDK (afipsdk.com).
 *
 * Por qué AfipSDK y no ARCA directo:
 *   Los Web Services oficiales de ARCA requieren certificado digital propio,
 *   CUIT habilitado y gestión de tokens WSAA — inviable para un cliente web
 *   sin backend. AfipSDK expone una REST pública que actúa como proxy del
 *   padrón oficial, devolviendo JSON limpio sin necesidad de credenciales.
 *
 * Qué devuelve:
 *   { razonSocial, nombre, apellido, tipoContribuyente, estado }
 *   Todos los campos pueden ser null si el CUIT no existe o el servicio falla.
 *
 * Política de uso:
 *   - Solo se consulta al salir del campo (blur), nunca al tipear.
 *   - Resultado se cachea en memoria por sesión para no repetir la misma consulta.
 *   - Si el servicio falla o devuelve error, se silencia — no bloquea el formulario.
 */

const ENDPOINT = 'https://afipsdk.com/api/v1/padron/persona';

// Cache en memoria: cuit (string sin guiones) → datos
const _cache = new Map();

/**
 * Limpia y normaliza un CUIT: saca guiones, espacios y valida longitud.
 * @param {string} raw
 * @returns {string|null} CUIT normalizado (11 dígitos) o null si inválido
 */
export function normalizarCuit(raw) {
  const limpio = String(raw ?? '').replace(/[-\s]/g, '');
  if (!/^\d{11}$/.test(limpio)) return null;
  return limpio;
}

/**
 * Valida el dígito verificador del CUIT/CUIL según algoritmo oficial.
 * @param {string} cuit - 11 dígitos sin guiones
 * @returns {boolean}
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
 * Consulta el padrón de ARCA vía AfipSDK.
 * @param {string} cuitRaw - CUIT con o sin guiones
 * @returns {Promise<{razonSocial:string|null, nombre:string|null, apellido:string|null, tipoContribuyente:string|null, estado:string|null}>}
 */
export async function consultarCuit(cuitRaw) {
  const cuit = normalizarCuit(cuitRaw);

  // CUIT inválido estructuralmente → no consultar
  if (!cuit) return _vacio();

  // Validar dígito verificador antes de ir a la red
  if (!validarDigitoCuit(cuit)) return _vacio();

  // Cache hit
  if (_cache.has(cuit)) return _cache.get(cuit);

  try {
    const res = await fetch(`${ENDPOINT}/${cuit}`, {
      signal: AbortSignal.timeout(6000), // timeout 6 seg
    });

    if (!res.ok) return _vacio();

    const data = await res.json();

    // AfipSDK devuelve distintas estructuras para persona física vs jurídica.
    // Persona física:  { nombre, apellido, tipoClave, estadoClave, ... }
    // Persona jurídica: { razonSocial, tipoClave, estadoClave, ... }
    const resultado = {
      razonSocial:       data.razonSocial ?? null,
      nombre:            data.nombre      ?? null,
      apellido:          data.apellido    ?? null,
      tipoContribuyente: data.tipoClave   ?? null,
      estado:            data.estadoClave ?? null,
    };

    _cache.set(cuit, resultado);
    return resultado;

  } catch {
    // Timeout, red caída, CORS, etc. — silencioso, no bloqueamos el form.
    return _vacio();
  }
}

function _vacio() {
  return { razonSocial: null, nombre: null, apellido: null, tipoContribuyente: null, estado: null };
}

import { consultarCuit, normalizarCuit, validarDigitoCuit } from '../../../services/cuit.service.js';

export const asociadoFields = [
  ['numeroAsociado', 'Número'],
  ['apellido',       'Apellido'],
  ['nombre',         'Nombre'],
  ['dni',            'DNI'],
  // Campo CUIT con consulta automática al padrón de ARCA al salir del campo.
  // Autocompletará Apellido y Nombre si están vacíos.
  {
    name:  'cuit',
    label: 'CUIT',
    type:  'text',
    hint:  true, // activa el span de hint en modal.js
    onBlur: async (valor, setField, setHint) => {
      const cuit = normalizarCuit(valor);

      // Validación estructural (longitud + dígito verificador)
      if (!cuit) {
        setHint('cuit', 'Formato inválido. Usá NN-NNNNNNNN-N.', 'error-text');
        return;
      }
      if (!validarDigitoCuit(cuit)) {
        setHint('cuit', 'CUIT inválido (dígito verificador incorrecto).', 'error-text');
        return;
      }

      // Consulta al padrón
      const datos = await consultarCuit(cuit);

      if (!datos.nombre && !datos.apellido && !datos.razonSocial) {
        setHint('cuit', 'CUIT no encontrado en el padrón de ARCA.', 'warn-text');
        return;
      }

      // Autocompletar campos vacíos
      if (datos.apellido) setField('apellido', datos.apellido);
      if (datos.nombre)   setField('nombre',   datos.nombre);

      // Para personas jurídicas, poner la razón social en apellido si está vacío
      if (!datos.apellido && datos.razonSocial) {
        setField('apellido', datos.razonSocial);
      }

      // Hint informativo con lo que se encontró
      const nombreMostrar = datos.razonSocial
        ? datos.razonSocial
        : [datos.apellido, datos.nombre].filter(Boolean).join(', ');

      const estadoInfo = datos.estado ? ` · ${datos.estado}` : '';
      setHint('cuit', `✓ ARCA: ${nombreMostrar}${estadoInfo}`, 'ok-text');
    },
  },
  ['fechaNacimiento', 'Nacimiento',     'date'],
  ['telefono',        'Teléfono'],
  ['email',           'Email',          'email'],
  ['domicilio',       'Domicilio'],
  ['localidad',       'Localidad'],
  ['provincia',       'Provincia'],
  ['codigoPostal',    'Código postal'],
  ['fechaIngreso',    'Ingreso',        'date'],
  ['fechaEgreso',     'Egreso',         'date'],
  ['estado',          'Estado',         'select', ['activo', 'suspendido', 'dadoDeBaja', 'fallecido']],
  ['observaciones',   'Observaciones',  'textarea'],
].map(f => {
  // Si ya es un objeto (el campo CUIT con onBlur), lo dejamos tal cual.
  // Los arrays los convertimos al formato de objeto que espera modal.js.
  if (Array.isArray(f)) {
    const [name, label, type, options] = f;
    return { name, label, type, options, full: name === 'observaciones' };
  }
  return { ...f, full: f.name === 'observaciones' };
});

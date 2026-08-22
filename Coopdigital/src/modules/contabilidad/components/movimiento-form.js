import { categoriasIngreso, categoriasEgreso } from '../../../config/contabilidad.config.js';

const opcionesIngreso = categoriasIngreso.map(c => ({ value: c, label: c }));
const opcionesEgreso  = categoriasEgreso.map(c => ({ value: c, label: c }));
const todasLasOpciones = [
  ...opcionesIngreso.map(o => ({ ...o, label: `${o.label} (ingreso)` })),
  ...opcionesEgreso.map(o => ({ ...o, label: `${o.label} (egreso)` })),
];

export const movimientoFields = [
  {
    name: 'tipo',
    label: 'Tipo',
    type: 'select',
    options: ['ingreso', 'egreso'],
    onChange: (valor, setOptions) => {
      if (valor === 'ingreso')      setOptions('categoria', opcionesIngreso);
      else if (valor === 'egreso')  setOptions('categoria', opcionesEgreso);
      else                          setOptions('categoria', todasLasOpciones);
    }
  },
  {
    name: 'categoria',
    label: 'Categoría',
    type: 'select',
    options: todasLasOpciones,
  },
  { name: 'monto',       label: 'Monto',                              type: 'number'   },
  { name: 'fecha',       label: 'Fecha',                              type: 'date'     },
  { name: 'medioPago',   label: 'Medio de pago'                                        },
  { name: 'comprobante', label: 'N° de comprobante / factura'                          },
  {
    name:      'archivo',
    label:     'Comprobante adjunto (PDF, JPG, PNG — máx. 10 MB)',
    type:      'file',
    accept:    '.pdf,.jpg,.jpeg,.png',
    urlField:  'comprobanteUrl',
    pathField: 'comprobanteStoragePath',
    full:      true,
  },
  { name: 'descripcion', label: 'Descripción', type: 'textarea', full: true },
];

import { movimientoService } from '../services/movimiento.service.js';
import { movimientoFields } from '../components/movimiento-form.js';
import { crudView, bindCrud } from '../../../utils/render-crud.js';
import { fmt } from '../../../utils/date.js';

const money = n => Number(n ?? 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

const columns = [
  { key: 'fecha',       label: 'Fecha',     render: r => fmt(r.fecha) },
  { key: 'tipo',        label: 'Tipo',       render: r => `<span class="badge ${r.tipo === 'ingreso' ? 'ok' : 'bad'}">${r.tipo}</span>` },
  { key: 'categoria',   label: 'Categoría' },
  { key: 'monto',       label: 'Monto',     render: r => money(r.monto) },
  { key: 'medioPago',   label: 'Medio de pago' },
  { key: 'descripcion', label: 'Descripción' }
];

export function contabilidadView() {
  return crudView({
    title: 'Contabilidad',
    subtitle: 'Registro simplificado de ingresos y egresos por categoría INAES.',
    newLabel: 'Nuevo movimiento'
  });
}

export function bindContabilidad() {
  return bindCrud({ service: movimientoService, fields: movimientoFields, columns });
}

import { padronElectoralService } from '../services/padron-electoral.service.js';
import { padronElectoralFields } from '../components/padron-electoral-form.js';
import { crudView, bindCrud } from '../../../utils/render-crud.js';
import { escapeHtml } from '../../../utils/security.js';

const badge = e => {
  const cls = e === 'habilitado' ? 'ok' : e === 'observado' ? 'warn' : 'bad';
  return `<span class="badge ${cls}">${escapeHtml(e)}</span>`;
};

const columns = [
  { key: 'numeroAsociado',   label: 'N° Asoc.' },
  { key: 'apellidoNombre',   label: 'Apellido y Nombre' },
  { key: 'dni',              label: 'DNI' },
  { key: 'estado',           label: 'Estado', render: r => badge(r.estado) },
  { key: 'motivo',           label: 'Motivo' }
];

export function padronElectoralView() {
  return crudView({ title: 'Padrón Electoral', subtitle: 'Habilitación de asociados para votar en asambleas.', newLabel: 'Nuevo registro' });
}
export function bindPadronElectoral() {
  return bindCrud({ service: padronElectoralService, fields: padronElectoralFields, columns });
}

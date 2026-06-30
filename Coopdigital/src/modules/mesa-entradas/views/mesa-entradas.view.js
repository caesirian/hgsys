import { mesaEntradasService } from '../services/mesa-entradas.service.js';
import { registroFields } from '../components/registro-form.js';
import { crudView, bindCrud } from '../../../utils/render-crud.js';
import { escapeHtml } from '../../../utils/security.js';

const badgeTipo = t => `<span class="badge ${t === 'entrada' ? 'ok' : 'warn'}">${escapeHtml(t)}</span>`;
const badgeEstado = e => {
  const cls = e === 'resuelto' ? 'ok' : e === 'archivado' ? 'muted' : e === 'en proceso' ? 'warn' : 'bad';
  return `<span class="badge ${cls}">${escapeHtml(e)}</span>`;
};

const columns = [
  { key: 'tipo',                   label: 'Tipo', render: r => badgeTipo(r.tipo) },
  { key: 'numero',                 label: 'N°' },
  { key: 'fecha',                  label: 'Fecha' },
  { key: 'categoria',              label: 'Categoría' },
  { key: 'remitenteDestinatario',  label: 'Remitente / Destinatario' },
  { key: 'asunto',                 label: 'Asunto' },
  { key: 'estado',                 label: 'Estado', render: r => badgeEstado(r.estado) }
];

export function mesaEntradasView() {
  return crudView({ title: 'Mesa de Entradas / Salidas', subtitle: 'Registro de correspondencia, notas y expedientes.', newLabel: 'Nuevo registro' });
}
export function bindMesaEntradas() {
  return bindCrud({ service: mesaEntradasService, fields: registroFields, columns });
}

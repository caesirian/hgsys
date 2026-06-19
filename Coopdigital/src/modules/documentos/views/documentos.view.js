import { documentoService } from '../services/documento.service.js';
import { documentoFields } from '../components/documento-form.js';
import { crudView, bindCrud } from '../../../utils/render-crud.js';

const columns = [
  { key: 'nombre',     label: 'Nombre' },
  { key: 'categoria',  label: 'Categoría', render: r => `<span class="badge">${r.categoria}</span>` },
  { key: 'descripcion',label: 'Descripción' },
  { key: 'fechaCarga', label: 'Carga' },
  { key: 'visible',    label: 'Visible', render: r => r.visible === true || r.visible === 'true'
      ? '<span class="badge ok">sí</span>'
      : '<span class="badge bad">no</span>' },
  { key: 'url', label: 'Link', render: r => r.url
      ? `<a href="${r.url}" target="_blank" rel="noreferrer">Abrir</a>`
      : '—' }
];

export function documentosView() {
  return crudView({ title: 'Documentos', subtitle: 'Gestión documental institucional.', newLabel: 'Nuevo documento' });
}
export function bindDocumentos() {
  return bindCrud({ service: documentoService, fields: documentoFields, columns });
}

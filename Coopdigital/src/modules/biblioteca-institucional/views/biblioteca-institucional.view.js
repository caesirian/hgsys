import { bibliotecaInstitucionalService } from '../services/biblioteca-institucional.service.js';
import { bibliotecaInstitucionalFields } from '../components/biblioteca-institucional-form.js';
import { crudView, bindCrud } from '../../../utils/render-crud.js';
import { escapeHtml } from '../../../utils/security.js';

const columns = [
  { key: 'titulo',      label: 'Título' },
  { key: 'categoria',   label: 'Categoría' },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'fechaCarga',  label: 'Fecha carga' },
  { key: 'visible',     label: 'Visible', render: r => r.visible ? '<span class="badge ok">Sí</span>' : '<span class="badge muted">No</span>' },
  { key: 'url',         label: 'Archivo', render: r => r.url ? `<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener">Ver</a>` : '' }
];

export function bibliotecaInstitucionalView() {
  return crudView({ title: 'Biblioteca Institucional', subtitle: 'Estatuto, reglamentos, manuales y documentos históricos.', newLabel: 'Nuevo documento' });
}
export function bindBibliotecaInstitucional() {
  return bindCrud({ service: bibliotecaInstitucionalService, fields: bibliotecaInstitucionalFields, columns });
}

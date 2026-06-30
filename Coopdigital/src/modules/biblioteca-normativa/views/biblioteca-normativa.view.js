import { bibliotecaNormativaService } from '../services/biblioteca-normativa.service.js';
import { bibliotecaNormativaFields } from '../components/biblioteca-normativa-form.js';
import { crudView, bindCrud } from '../../../utils/render-crud.js';
import { escapeHtml } from '../../../utils/security.js';

const columns = [
  { key: 'titulo',      label: 'Título' },
  { key: 'categoria',   label: 'Categoría' },
  { key: 'numeroNorma', label: 'N° de norma' },
  { key: 'fechaCarga',  label: 'Fecha carga' },
  { key: 'visible',     label: 'Visible', render: r => r.visible ? '<span class="badge ok">Sí</span>' : '<span class="badge muted">No</span>' },
  { key: 'url',         label: 'Archivo', render: r => r.url ? `<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener">Ver</a>` : '' }
];

export function bibliotecaNormativaView() {
  return crudView({ title: 'Biblioteca Normativa', subtitle: 'Leyes, resoluciones INAES y normativa aplicable.', newLabel: 'Nueva norma' });
}
export function bindBibliotecaNormativa() {
  return bindCrud({ service: bibliotecaNormativaService, fields: bibliotecaNormativaFields, columns });
}

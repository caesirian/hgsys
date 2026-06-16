import { documentoService } from '../services/documento.service.js';
import { documentoFields } from '../components/documento-form.js';
import { crudView, bindCrud } from '../../../utils/render-crud.js';
import { storageService } from '../../../services/storage.service.js';
import { asText } from '../../../utils/formatters.js';

export async function documentosView(user) {
  const categoria = new URLSearchParams(location.hash.split('?')[1] || '').get('categoria') || '';
  const rows = (await documentoService.list(user)).filter((item) => !categoria || item.categoria === categoria);
  const filters = `<form class="toolbar" data-search><select name="categoria"><option value="">Todas las categorías</option>${['INAES', 'ARCA', 'AFIP', 'Municipal', 'Legal', 'Contable', 'Contratos', 'Convenios', 'Actas'].map((item) => `<option value="${item}" ${categoria === item ? 'selected' : ''}>${item}</option>`).join('')}</select><button class="btn ghost">Filtrar</button></form>`;
  return { html: crudView({ title: 'Documentos', subtitle: 'Subida, descarga, eliminación y categorías con Firebase Storage.', rows, newLabel: 'Subir documento', filters, columns: [{ key: 'nombre', label: 'Nombre', render: (row) => asText(row.nombre) }, { key: 'categoria', label: 'Categoría', render: (row) => `<span class="badge">${asText(row.categoria)}</span>` }, { key: 'descripcion', label: 'Descripción', render: (row) => asText(row.descripcion) }, { key: 'url', label: 'Descarga', render: (row) => `<a href="${asText(row.url)}" target="_blank" rel="noreferrer">Descargar</a>` }, { key: 'visible', label: 'Visible', render: (row) => row.visible ? '<span class="badge ok">sí</span>' : '<span class="badge bad">no</span>' }] }), bind: (rerender) => { bindCrud({ user, service: documentoService, fields: documentoFields, rows, rerender, beforeSave: async (data, row) => { if (data.archivo) Object.assign(data, await storageService.uploadFile(user, 'documentos', data.archivo)); else if (row) Object.assign(data, { storagePath: row.storagePath, url: row.url }); delete data.archivo; return data; } }); document.querySelector('[data-search]').onsubmit = (event) => { event.preventDefault(); location.hash = `/documentos?categoria=${encodeURIComponent(new FormData(event.currentTarget).get('categoria'))}`; }; } };
}

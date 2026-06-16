import { usuarioService } from '../services/usuario.service.js';
import { usuarioFields } from '../components/usuario-form.js';
import { crudView, bindCrud } from '../../../utils/render-crud.js';
import { asText } from '../../../utils/formatters.js';

export async function usuariosView(user) {
  const q = new URLSearchParams(location.hash.split('?')[1] || '').get('q') || '';
  const rows = (await usuarioService.list(user)).filter((item) => `${item.nombre} ${item.apellido} ${item.email} ${item.rol}`.toLowerCase().includes(q.toLowerCase()));
  return { html: crudView({ title: 'Usuarios', subtitle: 'Listado, búsqueda, alta, edición, eliminación, validaciones y permisos.', rows, fields: usuarioFields, newLabel: 'Nuevo usuario', filters: `<form class="toolbar" data-search><input name="q" value="${asText(q)}" placeholder="Buscar usuario"><button class="btn ghost">Buscar</button></form>`, columns: [{ key: 'nombre', label: 'Nombre', render: (row) => `${asText(row.nombre)} ${asText(row.apellido)}` }, { key: 'email', label: 'Email', render: (row) => asText(row.email) }, { key: 'rol', label: 'Rol', render: (row) => `<span class="badge">${asText(row.rol)}</span>` }, { key: 'activo', label: 'Activo', render: (row) => row.activo ? '<span class="badge ok">activo</span>' : '<span class="badge bad">inactivo</span>' }] }), bind: (rerender) => { bindCrud({ user, service: usuarioService, fields: usuarioFields, rows, rerender }); document.querySelector('[data-search]').onsubmit = (event) => { event.preventDefault(); location.hash = `/usuarios?q=${encodeURIComponent(new FormData(event.currentTarget).get('q'))}`; }; } };
}

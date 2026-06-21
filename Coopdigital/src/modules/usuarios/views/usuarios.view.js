import { usuarioService } from '../services/usuario.service.js';
import { usuarioFields } from '../components/usuario-form.js';
import { crudView, bindCrud } from '../../../utils/render-crud.js';
import { escapeHtml } from '../../../utils/security.js';

const columns = [
  { key: 'nombre',   label: 'Nombre',  render: r => `${escapeHtml(r.nombre)} ${escapeHtml(r.apellido)}` },
  { key: 'email',    label: 'Email' },
  { key: 'rol',      label: 'Rol',    render: r => `<span class="badge">${escapeHtml(r.rol)}</span>` },
  { key: 'activo',   label: 'Activo', render: r => r.activo === true || r.activo === 'true'
      ? '<span class="badge ok">activo</span>'
      : '<span class="badge bad">inactivo</span>' },
  { key: 'fechaAlta', label: 'Alta' }
];

export function usuariosView() {
  return crudView({ title: 'Usuarios', subtitle: 'Alta, baja y modificación de usuarios con roles oficiales.', newLabel: 'Nuevo usuario' });
}
export function bindUsuarios() {
  return bindCrud({ service: usuarioService, fields: usuarioFields, columns });
}

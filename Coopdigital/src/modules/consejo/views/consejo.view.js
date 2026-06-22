import { consejoService } from '../services/consejo.service.js';
import { consejoFields } from '../components/consejo-form.js';
import { asociadoService } from '../../asociados/services/asociado.service.js';
import { crudView, bindCrud } from '../../../utils/render-crud.js';
import { fmt } from '../../../utils/date.js';
import { escapeHtml } from '../../../utils/security.js';

export function consejoView() {
  return crudView({
    title: 'Consejo de Administración',
    subtitle: 'Composición de cargos, mandatos y vigencia.',
    newLabel: 'Nuevo cargo'
  });
}

export async function bindConsejo() {
  // El render de la tabla es síncrono, así que el mapa id->nombre de
  // asociados se resuelve una vez acá antes de construir las columnas.
  const asociados = await asociadoService.list().catch(() => []);
  const nombres = Object.fromEntries(asociados.map(a => [a.id, `${a.apellido}, ${a.nombre}`]));

  const columns = [
    { key: 'asociadoId', label: 'Asociado', render: r => escapeHtml(nombres[r.asociadoId] ?? '(asociado no encontrado)') },
    { key: 'cargo',      label: 'Cargo',    render: r => `<span class="badge">${escapeHtml(r.cargo)}</span>` },
    { key: 'inicioMandato', label: 'Inicio', render: r => fmt(r.inicioMandato) },
    { key: 'finMandato',    label: 'Fin',    render: r => r.finMandato ? fmt(r.finMandato) : '—' },
    { key: 'vigente', label: 'Vigente', render: r => r.vigente === true || r.vigente === 'true'
        ? '<span class="badge ok">vigente</span>'
        : '<span class="badge bad">finalizado</span>' }
  ];

  return bindCrud({ service: consejoService, fields: consejoFields, columns });
}

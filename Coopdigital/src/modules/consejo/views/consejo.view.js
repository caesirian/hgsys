import { consejoService } from '../services/consejo.service.js';
import { consejoFields } from '../components/consejo-form.js';
import { asociadoService } from '../../asociados/services/asociado.service.js';
import { crudView, bindCrud } from '../../../utils/render-crud.js';
import { escapeHtml } from '../../../utils/security.js';

const cargoLabels = {
  presidente: 'Presidente',
  secretario: 'Secretario',
  tesorero: 'Tesorero',
  vocalTitular: 'Vocal titular',
  vocalSuplente: 'Vocal suplente'
};

export function consejoView() {
  return crudView({ title: 'Consejo de Administración', subtitle: 'Cargos vigentes e históricos del consejo.', newLabel: 'Nuevo cargo' });
}

export async function bindConsejo() {
  // Se resuelve una vez por carga de vista: alcanza para mostrar nombres
  // en la tabla. Los selects del modal usan su propia consulta fresca
  // (ver consejoFields), por si hubo altas/bajas de asociados mientras
  // la vista estaba abierta.
  const asociados = await asociadoService.list();
  const nombrePorId = Object.fromEntries(asociados.map(a => [a.id, `${a.apellido}, ${a.nombre}`]));

  const columns = [
    { key: 'asociadoId', label: 'Asociado', render: r => escapeHtml(nombrePorId[r.asociadoId] ?? r.asociadoId) },
    { key: 'cargo', label: 'Cargo', render: r => escapeHtml(cargoLabels[r.cargo] ?? r.cargo) },
    { key: 'inicioMandato', label: 'Inicio mandato' },
    { key: 'finMandato', label: 'Fin mandato' },
    { key: 'vigente', label: 'Vigente', render: r => `<span class="badge ${r.vigente ? 'ok' : 'bad'}">${r.vigente ? 'Sí' : 'No'}</span>` }
  ];

  return bindCrud({ service: consejoService, fields: consejoFields, columns });
}

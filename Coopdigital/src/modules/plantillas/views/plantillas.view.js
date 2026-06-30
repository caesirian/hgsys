import { plantillasService } from '../services/plantillas.service.js';
import { plantillaFields } from '../components/plantilla-form.js';
import { crudView, bindCrud } from '../../../utils/render-crud.js';

const columns = [
  { key: 'nombre',      label: 'Nombre' },
  { key: 'tipo',        label: 'Tipo' },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'activa',      label: 'Activa', render: r => r.activa ? '<span class="badge ok">Sí</span>' : '<span class="badge muted">No</span>' }
];

export function plantillasView() {
  return crudView({ title: 'Plantillas', subtitle: 'Textos modelo reutilizables para notas, actas y comunicaciones.', newLabel: 'Nueva plantilla' });
}
export function bindPlantillas() {
  return bindCrud({ service: plantillasService, fields: plantillaFields, columns });
}

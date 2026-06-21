import { asociadoService } from '../../asociados/services/asociado.service.js';

const cargoOptions = [
  { value: 'presidente', label: 'Presidente' },
  { value: 'secretario', label: 'Secretario' },
  { value: 'tesorero', label: 'Tesorero' },
  { value: 'vocalTitular', label: 'Vocal titular' },
  { value: 'vocalSuplente', label: 'Vocal suplente' }
];

// Se recalcula en cada apertura del modal para reflejar altas/bajas de
// asociados sin necesidad de recargar la página.
export async function consejoFields() {
  const asociados = await asociadoService.list();
  const asociadoOptions = asociados
    .filter(a => a.estado === 'activo')
    .map(a => ({ value: a.id, label: `${a.numeroAsociado} — ${a.apellido}, ${a.nombre}` }));

  return [
    { name: 'asociadoId', label: 'Asociado', type: 'select', options: asociadoOptions, full: true },
    { name: 'cargo', label: 'Cargo', type: 'select', options: cargoOptions },
    { name: 'inicioMandato', label: 'Inicio de mandato', type: 'date' },
    { name: 'finMandato', label: 'Fin de mandato', type: 'date' },
    { name: 'vigente', label: 'Vigente', type: 'select', options: ['true', 'false'] }
  ];
}

import { consejoService } from '../../consejo/services/consejo.service.js';
import { asociadoService } from '../../asociados/services/asociado.service.js';

const categorias = ['Mantenimiento', 'Insumos', 'Combustible', 'Viáticos', 'Servicios', 'Otros'];

// Función async: se resuelve al abrir el modal, para que el select de
// consejeros siempre refleje el Consejo de Administración vigente (mismo
// criterio que consejoFields en el módulo Consejo).
export async function gastoARendirFields() {
  const [cargos, asociados] = await Promise.all([
    consejoService.list(),
    asociadoService.list().catch(() => [])
  ]);
  const nombres = Object.fromEntries(asociados.map(a => [a.id, `${a.apellido}, ${a.nombre}`]));
  const consejeroOptions = cargos
    .filter(c => c.vigente === true || c.vigente === 'true')
    .map(c => ({ value: c.asociadoId, label: `${nombres[c.asociadoId] ?? c.asociadoId} — ${c.cargo}` }));

  return [
    ['concepto', 'Concepto', 'text'],
    ['categoria', 'Categoría', 'select', categorias],
    ['monto', 'Monto', 'number'],
    ['fecha', 'Fecha', 'date'],
    ['consejeroId', 'Consejero que rinde el gasto', 'select', consejeroOptions],
    ['comprobanteUrl', 'Comprobante', 'file'],
    ['observaciones', 'Observaciones', 'textarea']
  ].map(([name, label, type, options]) => ({
    name, label, type, options, full: name === 'observaciones',
    accept: name === 'comprobanteUrl' ? '.pdf,.jpg,.jpeg,.png' : undefined,
    urlField: name === 'comprobanteUrl' ? 'comprobanteUrl' : undefined
  }));
}

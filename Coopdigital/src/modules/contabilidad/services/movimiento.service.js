import { makeCrudService } from '../../../services/crud.service.js';
import { validateMovimientoContable } from '../validators/movimiento-contable.validator.js';

export const movimientoService = makeCrudService('contabilidad', 'movimientosContables', validateMovimientoContable);

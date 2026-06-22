import { makeCrudService } from '../../../services/crud.service.js';
import { validateActa } from '../validators/acta.validator.js';

export const actaService = makeCrudService('actas', 'actas', validateActa);

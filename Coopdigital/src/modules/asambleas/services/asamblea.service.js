import { makeCrudService } from '../../../services/crud.service.js';
import { validateAsamblea } from '../validators/asamblea.validator.js';

export const asambleaService = makeCrudService('asambleas', 'asambleas', validateAsamblea);

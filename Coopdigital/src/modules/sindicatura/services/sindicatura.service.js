import { makeCrudService } from '../../../services/crud.service.js';
import { validateSindicatura } from '../validators/sindicatura.validator.js';

export const sindicaturaService = makeCrudService('sindicatura', 'sindicatura', validateSindicatura);

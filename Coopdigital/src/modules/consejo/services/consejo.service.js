import { makeCrudService } from '../../../services/crud.service.js';
import { validateConsejo } from '../validators/consejo.validator.js';

export const consejoService = makeCrudService('consejo', 'consejoAdministracion', validateConsejo);

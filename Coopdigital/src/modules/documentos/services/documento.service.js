import { makeCrudService } from '../../../services/crud.service.js';
import { validateDocumento } from '../../../validators/documento.validator.js';
import { storageService } from '../../../services/storage.service.js';

const crud = makeCrudService('documentos', 'documentos', validateDocumento, { create: 'carga_documento', delete: 'eliminacion_documento' });
export const documentoService = {
  ...crud,
  async remove(user, id) {
    const doc = (await crud.list(user)).find((item) => item.id === id);
    await crud.remove(user, id);
    if (doc?.storagePath) await storageService.deleteFile(doc.storagePath);
  }
};

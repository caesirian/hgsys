import { makeCrudService } from '../../../services/crud.service.js';
import { firestoreDb } from '../../../services/firestore-db.service.js';
import { hasPermission } from '../../../config/permissions.config.js';
import { authStore } from '../../../stores/auth.store.js';
import { validateGastoARendir, validateFirmaGasto } from '../../../validators/gasto-a-rendir.validator.js';

const COL = 'gastosARendir';

export const gastoARendirService = {
  ...makeCrudService('gastosARendir', COL, validateGastoARendir),

  // La firma en papel vive en gastosARendir/{gastoId}/firmas y nunca se
  // edita ni se elimina desde el frontend (mismo criterio que
  // certificados/firmas). Al registrarla, además se marca el gasto como
  // 'firmado' para que quede visible en el listado principal sin tener
  // que abrir cada gasto a consultar la subcolección.
  async listarFirmas(gastoId) {
    if (!hasPermission(authStore.get(), 'gastosARendirFirmas', 'read')) {
      throw new Error('Permiso insuficiente');
    }
    return firestoreDb.listSub(COL, gastoId, 'firmas');
  },

  async registrarFirma(gastoId, data) {
    if (!hasPermission(authStore.get(), 'gastosARendirFirmas', 'create')) {
      throw new Error('Permiso insuficiente');
    }
    const payload = validateFirmaGasto(data);
    const firmadoPor = authStore.get()?.uid ?? 'sistema';
    const firma = await firestoreDb.createSub(COL, gastoId, 'firmas', {
      ...payload,
      firmadoPor,
      fecha: new Date().toISOString()
    });
    await firestoreDb.update(COL, gastoId, { estado: 'firmado' });
    return firma;
  }
};

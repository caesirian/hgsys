import {
  CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET,
  CLOUDINARY_MAX_BYTES, CLOUDINARY_ALLOWED_TYPES
} from '../config/cloudinary.config.js';
import { authStore } from '../stores/auth.store.js';

export const cloudinaryService = {
  // Sube un archivo a Cloudinary usando el preset sin firmar dedicado a
  // CoopDigital, organizándolo por cooperativa en el panel (asset_folder).
  // Devuelve { url, storagePath } listos para guardar en Firestore.
  async upload(file, onProgress) {
    if (!file) throw new Error('No se seleccionó ningún archivo.');
    if (file.size > CLOUDINARY_MAX_BYTES) {
      throw new Error(`El archivo supera el tamaño máximo permitido (${CLOUDINARY_MAX_BYTES / 1024 / 1024} MB).`);
    }
    if (!CLOUDINARY_ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Tipo de archivo no permitido. Solo PDF, JPG, PNG, DOC o DOCX.');
    }

    const cooperativaId = authStore.get()?.cooperativaId ?? 'sin-cooperativa';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('asset_folder', `coopdigital/${cooperativaId}/documentos`);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
      { method: 'POST', body: formData }
    );

    if (!response.ok) {
      const detalle = await response.json().catch(() => null);
      throw new Error(detalle?.error?.message || 'No se pudo subir el archivo. Probá de nuevo.');
    }

    const data = await response.json();
    return { url: data.secure_url, storagePath: data.public_id };
  }
};

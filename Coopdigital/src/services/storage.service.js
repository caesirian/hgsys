import { deleteObject, getDownloadURL, ref, uploadBytes } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';
import { storage } from '../firebase/storage.js';

export const storageService = {
  async uploadFile(user, folder, file) {
    const storagePath = `cooperativas/${user.cooperativaId}/${folder}/${crypto.randomUUID()}-${file.name}`;
    const fileRef = ref(storage(), storagePath);
    await uploadBytes(fileRef, file);
    return { storagePath, url: await getDownloadURL(fileRef) };
  },
  deleteFile(storagePath) {
    return deleteObject(ref(storage(), storagePath));
  }
};

import { firestoreDb } from './firestore-db.service.js';

export const cooperativaService = {
  getCurrent() {
    return firestoreDb.getCooperativa();
  }
};

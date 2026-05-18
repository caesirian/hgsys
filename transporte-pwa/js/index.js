import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { addDoc, collection, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { auth, db } from './firebase.js';

const form = document.getElementById('evento-form');
const gpsBtn = document.getElementById('gps-btn');
const logoutBtn = document.getElementById('logout');
const feedback = document.getElementById('form-feedback');
let lastSentAt = 0;

onAuthStateChanged(auth, (user) => {
  if (!user) window.location.href = './login.html';
});

logoutBtn.addEventListener('click', async () => signOut(auth));

gpsBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    feedback.textContent = 'Geolocalización no soportada.';
    return;
  }
  navigator.geolocation.getCurrentPosition((position) => {
    document.getElementById('latitud').value = position.coords.latitude.toFixed(6);
    document.getElementById('longitud').value = position.coords.longitude.toFixed(6);
    feedback.textContent = 'Ubicación capturada.';
  }, () => {
    feedback.textContent = 'No se pudo obtener la ubicación.';
  });
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const now = Date.now();
  if (now - lastSentAt < 30000) {
    feedback.textContent = 'Esperá 30 segundos antes de enviar otro reporte.';
    return;
  }

  const payload = {
    tipoEvento: form.tipoEvento.value.trim(),
    latitud: Number(form.latitud.value),
    longitud: Number(form.longitud.value),
    timestamp: serverTimestamp(),
    createdAtMs: now,
    userId: auth.currentUser?.uid ?? null
  };

  // Flujo: captura GPS -> normalización de datos -> persistencia en NoSQL (Firestore colección eventos).
  await addDoc(collection(db, 'eventos'), payload);
  lastSentAt = now;
  feedback.textContent = 'Reporte guardado correctamente.';
  form.reset();
});

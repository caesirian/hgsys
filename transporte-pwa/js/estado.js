import { collection, limit, onSnapshot, orderBy, query } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db } from './firebase.js';

const badge = document.getElementById('estado-badge');
const detalle = document.getElementById('estado-detalle');

const q = query(collection(db, 'eventos'), orderBy('timestamp', 'desc'), limit(20));
onSnapshot(q, (snapshot) => {
  const eventos = snapshot.docs.map((doc) => doc.data());
  if (!eventos.length) {
    badge.className = 'badge badge-neutral';
    badge.textContent = 'Sin datos';
    detalle.textContent = 'Aún no hay reportes.';
    return;
  }

  const retrasos = eventos.filter((e) => e.tipoEvento === 'retraso_importante').length;
  const porcentaje = Math.round((retrasos / eventos.length) * 100);

  if (porcentaje >= 70) {
    badge.className = 'badge badge-danger';
    badge.textContent = 'CRÍTICO';
  } else {
    badge.className = 'badge badge-ok';
    badge.textContent = 'ESTABLE';
  }
  detalle.textContent = `${porcentaje}% de los últimos ${eventos.length} reportes indican retraso importante.`;
});

import { signInWithPopup, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { auth, googleProvider } from './firebase.js';

const button = document.getElementById('google-login');
const feedback = document.getElementById('auth-feedback');

onAuthStateChanged(auth, (user) => {
  if (user) window.location.href = './index.html';
});

button.addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, googleProvider);
    window.location.href = './index.html';
  } catch (error) {
    feedback.textContent = 'No se pudo iniciar sesión.';
  }
});

// Toast — notificaciones visuales de feedback no intrusivas.
// Uso: toast.ok('Guardado'), toast.err('Error al guardar'), toast.info('...')
// Se apilan desde abajo-derecha y se auto-destruyen en 3 segundos.

function mount() {
  let container = document.querySelector('#toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

function show(msg, type) {
  const container = mount();
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);

  // Trigger de transición en el siguiente frame
  requestAnimationFrame(() => el.classList.add('toast-visible'));

  // Auto-cierre
  const remove = () => {
    el.classList.remove('toast-visible');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
  };
  const timer = setTimeout(remove, 3000);
  el.addEventListener('click', () => { clearTimeout(timer); remove(); });
}

export const toast = {
  ok:   msg => show(msg, 'ok'),
  err:  msg => show(msg, 'err'),
  info: msg => show(msg, 'info')
};

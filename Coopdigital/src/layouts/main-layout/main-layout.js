const nav = [
  { section: 'Principal' },
  { href: '/dashboard',       ico: '⌘',  label: 'Dashboard' },
  { section: 'Institución' },
  { href: '/usuarios',        ico: '👥', label: 'Usuarios' },
  { href: '/asociados',       ico: '🤝', label: 'Asociados' },
  { href: '/libro-asociados', ico: '📘', label: 'Libro de Asociados' },
  { href: '/certificados',    ico: '🏅', label: 'Certificados' },
  { section: 'Gestión' },
  { href: '/mesa-entradas',   ico: '📥', label: 'Mesa de Entradas/Salidas' },
  { href: '/tramites',        ico: '🗒️', label: 'Trámites' },
  { href: '/comunicaciones',  ico: '📢', label: 'Comunicaciones' },
  { href: '/biblioteca-institucional', ico: '📚', label: 'Biblioteca Institucional' },
  { href: '/biblioteca-normativa',     ico: '⚖️', label: 'Biblioteca Normativa' },
  { href: '/plantillas',      ico: '🧩', label: 'Plantillas' },
  { section: 'Herramientas' },
  { href: '/generador-actas',          ico: '🪄', label: 'Generador de Actas' },
  { href: '/generador-convocatorias',  ico: '✉️', label: 'Generador de Convocatorias' },
  { href: '/firmas',          ico: '✍️', label: 'Firma Digital' },
  { section: 'Sistema' },
  { href: '/configuracion',   ico: '⚙️', label: 'Configuración' },
  { href: '/documentos',      ico: '📄', label: 'Documentos' },
  { href: '/vencimientos',    ico: '⏱',  label: 'Vencimientos' },
  { section: 'Contabilidad' },
  { href: '/contabilidad',        ico: '💰', label: 'Movimientos' },
  { href: '/reportes-contables',  ico: '📊', label: 'Estado de Recursos y Gastos' },
  { href: '/gastos-a-rendir',     ico: '🧾', label: 'Gastos a Rendir' },
  { section: 'Gobernanza' },
  { href: '/consejo',         ico: '🏛️', label: 'Consejo de Administración' },
  { href: '/sindicatura',     ico: '🔍', label: 'Sindicatura' },
  { href: '/asambleas',       ico: '🗳️', label: 'Asambleas' },
  { href: '/padron-electoral', ico: '🗂️', label: 'Padrón Electoral' },
  { href: '/actas',           ico: '📜', label: 'Actas' },
  { href: '/eventos',         ico: '🧾', label: 'Eventos / Auditoría' },
];

function initials(user) {
  return ((user.nombre?.[0] ?? '') + (user.apellido?.[0] ?? '')).toUpperCase();
}

function renderNav(path) {
  return nav.map(item => {
    if (item.section) {
      return `<div class="nav-section">${item.section}</div>`;
    }
    const active = path === item.href ? 'active' : '';
    return `<a href="#${item.href}" class="${active}">
      <span class="ico">${item.ico}</span>
      <span class="nav-label">${item.label}</span>
    </a>`;
  }).join('');
}

export function layout(user, path, content) {
  return `
  <div class="app">
    <aside class="sidebar" id="sidebar">
      <div class="brand">
        <span class="logo">CD</span>
        <div class="brand-text">
          <b>CoopDigital</b>
          <span>${user.rol}</span>
        </div>
      </div>
      <nav class="nav">${renderNav(path)}</nav>
    </aside>

    <section class="main">
      <header class="topbar">
        <div class="topbar-left">
          <button class="btn-icon mobile-menu" id="openSidebar" title="Menú">☰</button>
          <button class="btn-icon" id="collapseSidebar" title="Colapsar sidebar">⇤</button>
        </div>
        <div class="topbar-right">
          <div class="user-chip">
            <div class="user-avatar">${initials(user)}</div>
            <div class="user-info">
              <b>${user.nombre} ${user.apellido}</b>
              <span>${user.email}</span>
            </div>
          </div>
          <button class="btn ghost" id="logout">Salir</button>
        </div>
      </header>
      <main class="content">${content}</main>
    </section>
  </div>`;
}

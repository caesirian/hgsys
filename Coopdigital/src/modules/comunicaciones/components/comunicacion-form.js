export const comunicacionFields = [
  ['titulo', 'Título'],
  ['canal', 'Canal', 'select', ['Email', 'WhatsApp', 'Cartelera', 'Circular', 'Otro']],
  ['fecha', 'Fecha', 'date'],
  ['destinatarios', 'Destinatarios'],
  ['contenido', 'Contenido', 'textarea'],
  ['estado', 'Estado', 'select', ['borrador', 'enviada', 'archivada']]
].map(([name, label, type, options]) => ({ name, label, type, options, full: type === 'textarea' }));

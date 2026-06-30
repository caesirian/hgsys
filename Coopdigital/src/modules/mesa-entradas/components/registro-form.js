export const registroFields = [
  ['tipo', 'Tipo', 'select', ['entrada', 'salida']],
  ['numero', 'Número de registro'],
  ['fecha', 'Fecha', 'date'],
  ['categoria', 'Categoría', 'select', ['Nota', 'Expediente', 'Oficio', 'Solicitud', 'Reclamo', 'Otro']],
  ['remitenteDestinatario', 'Remitente / Destinatario'],
  ['asunto', 'Asunto', 'textarea'],
  ['estado', 'Estado', 'select', ['pendiente', 'en proceso', 'resuelto', 'archivado']],
  ['observaciones', 'Observaciones', 'textarea']
].map(([name, label, type, options]) => ({ name, label, type, options, full: type === 'textarea' }));

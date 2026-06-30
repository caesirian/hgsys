export const tramiteFields = [
  ['titulo', 'Título'],
  ['tipo', 'Tipo', 'select', ['INAES', 'ARCA/AFIP', 'Municipal', 'Bancario', 'Legal', 'Otro']],
  ['organismo', 'Organismo'],
  ['fechaInicio', 'Fecha de inicio', 'date'],
  ['fechaLimite', 'Fecha límite', 'date'],
  ['estado', 'Estado', 'select', ['iniciado', 'en proceso', 'observado', 'finalizado']],
  ['responsable', 'Responsable'],
  ['observaciones', 'Observaciones', 'textarea']
].map(([name, label, type, options]) => ({ name, label, type, options, full: name === 'observaciones' }));

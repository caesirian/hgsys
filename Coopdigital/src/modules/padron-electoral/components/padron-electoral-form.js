export const padronElectoralFields = [
  ['asociadoId', 'ID de asociado'],
  ['numeroAsociado', 'N° de asociado'],
  ['apellidoNombre', 'Apellido y nombre'],
  ['dni', 'DNI'],
  ['estado', 'Estado', 'select', ['habilitado', 'inhabilitado', 'observado']],
  ['motivo', 'Motivo (si no está habilitado)', 'textarea']
].map(([name, label, type, options]) => ({ name, label, type, options, full: name === 'motivo' }));

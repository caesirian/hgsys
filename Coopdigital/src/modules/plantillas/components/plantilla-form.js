export const plantillaFields = [
  ['nombre', 'Nombre'],
  ['tipo', 'Tipo', 'select', ['Nota', 'Acta', 'Certificado', 'Comunicación', 'Convocatoria', 'Otro']],
  ['descripcion', 'Descripción'],
  ['contenido', 'Contenido (usá {{nombre}}, {{fecha}}, {{cooperativa}} como variables)', 'textarea'],
  ['activa', 'Activa', 'select', ['true', 'false']]
].map(([name, label, type, options]) => ({ name, label, type, options, full: name === 'contenido' }));

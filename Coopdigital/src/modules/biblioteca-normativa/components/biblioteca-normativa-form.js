export const bibliotecaNormativaFields = [
  ['titulo', 'Título'],
  ['categoria', 'Categoría', 'select', ['Ley', 'Resolución INAES', 'Decreto', 'Disposición ARCA/AFIP', 'Normativa Municipal', 'Otro']],
  ['numeroNorma', 'Número de norma'],
  ['descripcion', 'Descripción', 'textarea'],
  ['archivo', 'Archivo (PDF, JPG, PNG, DOC, DOCX — máx. 10 MB)', 'file'],
  ['fechaCarga', 'Fecha carga', 'date'],
  ['visible', 'Visible', 'select', ['true', 'false']]
].map(([name, label, type, options]) => ({
  name, label, type, options,
  accept: name === 'archivo' ? '.pdf,.jpg,.jpeg,.png,.doc,.docx' : undefined,
  pathField: name === 'archivo' ? 'storagePath' : undefined,
  full: ['descripcion', 'archivo'].includes(name)
}));

export const bibliotecaInstitucionalFields = [
  ['titulo', 'Título'],
  ['categoria', 'Categoría', 'select', ['Estatuto', 'Reglamento', 'Manual', 'Historia institucional', 'Memoria y Balance', 'Otro']],
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

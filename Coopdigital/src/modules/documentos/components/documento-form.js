export const documentoFields = [
  { name: 'nombre', label: 'Nombre', required: true },
  { name: 'categoria', label: 'Categoría', type: 'select', options: ['INAES', 'ARCA', 'AFIP', 'Municipal', 'Legal', 'Contable', 'Contratos', 'Convenios', 'Actas'] },
  { name: 'descripcion', label: 'Descripción', type: 'textarea', full: true },
  { name: 'archivo', label: 'Archivo', type: 'file', full: true },
  { name: 'visible', label: 'Visible', type: 'select', options: ['true', 'false'] }
];

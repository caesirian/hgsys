export const actaFields = [
  ['numeroActa', 'N° de acta'],
  ['tipo', 'Tipo', 'select', ['Consejo', 'Asamblea Ordinaria', 'Asamblea Extraordinaria', 'Comisión Interna']],
  ['fecha', 'Fecha', 'date'],
  ['titulo', 'Título'],
  ['contenido', 'Contenido', 'textarea'],
  ['archivoPdfUrl', 'PDF del acta (opcional)', 'file'],
  ['firmada', 'Firmada', 'select', ['true', 'false']]
].map(([name, label, type, options]) => ({
  name, label, type, options,
  urlField: name === 'archivoPdfUrl' ? 'archivoPdfUrl' : undefined,
  accept: name === 'archivoPdfUrl' ? '.pdf' : undefined,
  full: ['contenido', 'archivoPdfUrl'].includes(name)
}));

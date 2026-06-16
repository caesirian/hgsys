export function table(columns, rows, actions) {
  const body = rows.length
    ? rows.map((row) => `<tr>${columns.map((column) => `<td>${column.render ? column.render(row) : row[column.key] ?? '-'}</td>`).join('')}<td class="actions">${actions(row)}</td></tr>`).join('')
    : `<tr><td colspan="${columns.length + 1}" class="muted">No hay registros para mostrar.</td></tr>`;
  return `<div class="table-wrap"><table><thead><tr>${columns.map((column) => `<th>${column.label}</th>`).join('')}<th>Acciones</th></tr></thead><tbody>${body}</tbody></table></div>`;
}

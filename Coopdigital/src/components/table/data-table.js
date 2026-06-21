import { escapeHtml } from '../../utils/security.js';

export function table(columns, rows, actions) {
  return `<div class="table-wrap"><table><thead><tr>${columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join('')}<th>Acciones</th></tr></thead><tbody>${rows.map(r => `<tr>${columns.map(c => `<td>${c.render ? c.render(r) : escapeHtml(r[c.key] ?? '-')}</td>`).join('')}<td class="actions">${actions(r)}</td></tr>`).join('')}</tbody></table></div>`;
}

import { asociadoService } from '../../asociados/services/asociado.service.js';
import { table } from '../../../components/table/data-table.js';
import { downloadCsv, printReport } from '../../../utils/export.js';
import { asText } from '../../../utils/formatters.js';
export async function libroAsociadosView(user) {
  const rows = (await asociadoService.list(user)).sort((a, b) => a.numeroAsociado.localeCompare(b.numeroAsociado));
  return { html: `<section><div class="toolbar"><div><h1>Libro de Asociados</h1><p class="muted">Generado automáticamente desde asociados. Exportación PDF y Excel CSV.</p></div><div><button class="btn ghost" data-export>Excel CSV</button><button class="btn primary" data-print>PDF</button></div></div>${table([{ key: 'numeroAsociado', label: 'N°' }, { key: 'apellido', label: 'Apellido', render: (row) => asText(row.apellido) }, { key: 'nombre', label: 'Nombre', render: (row) => asText(row.nombre) }, { key: 'dni', label: 'DNI' }, { key: 'cuit', label: 'CUIT' }, { key: 'fechaIngreso', label: 'Ingreso' }, { key: 'fechaEgreso', label: 'Egreso' }, { key: 'estado', label: 'Estado' }], rows, () => '<span class="muted">Automático</span>')}</section>`, bind: () => { document.querySelector('[data-export]').onclick = () => downloadCsv('libro-asociados.csv', rows); document.querySelector('[data-print]').onclick = printReport; } };
}

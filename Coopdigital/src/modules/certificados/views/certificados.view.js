import { certificadoService } from '../services/certificado.service.js';
import { asociadoService } from '../../asociados/services/asociado.service.js';
import { table } from '../../../components/table/data-table.js';
import { fmt } from '../../../utils/date.js';
import { escapeHtml } from '../../../utils/security.js';

const tipoLabel = { asociado: 'Asociado activo', cargo: 'Cargo', constancia: 'Constancia' };

export function certificadosView() {
  return `<section>
    <div class="toolbar">
      <div>
        <h1>Certificados emitidos</h1>
        <p class="muted">Historial de certificados generados desde el sistema.</p>
      </div>
    </div>
    <div id="certTable"><div class="loading">Cargando…</div></div>
  </section>`;
}

export async function bindCertificados() {
  const el = document.querySelector('#certTable');
  try {
    const [certs, asociados] = await Promise.all([
      certificadoService.list(),
      asociadoService.list().catch(() => [])
    ]);
    // Mapa id → nombre resuelto antes de armar las columnas (el render de
    // table() es síncrono, no puede hacer async por cada fila).
    const nombres = Object.fromEntries(
      asociados.map(a => [a.id, `${a.apellido}, ${a.nombre}`])
    );

    const columns = [
      { key: 'tipo', label: 'Tipo',
        render: r => `<span class="badge">${escapeHtml(tipoLabel[r.tipo] ?? r.tipo)}</span>` },
      { key: 'asociadoId', label: 'Asociado',
        render: r => escapeHtml(nombres[r.asociadoId] ?? r.asociadoId) },
      { key: 'fechaCreacion', label: 'Emitido',
        render: r => fmt(r.fechaCreacion?.toDate ? r.fechaCreacion.toDate() : r.fechaCreacion) },
      { key: 'emitidoPor', label: 'Emitido por' }
    ];

    el.innerHTML = certs.length
      ? table(columns, certs, () => '')
      : '<p class="muted empty">Todavía no se emitió ningún certificado.</p>';
  } catch (err) {
    el.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
  }
}

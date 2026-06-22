import { asociadoService } from '../services/asociado.service.js';
import { asociadoFields } from '../components/asociado-form.js';
import { crudView, bindCrud } from '../../../utils/render-crud.js';
import { certificadoService } from '../../certificados/services/certificado.service.js';
import { escapeHtml } from '../../../utils/security.js';
import { toast } from '../../../utils/toast.js';

const badge = e => `<span class="badge ${e === 'activo' ? 'ok' : e === 'suspendido' ? 'warn' : 'bad'}">${escapeHtml(e)}</span>`;

const columns = [
  { key: 'numeroAsociado', label: 'N°' },
  { key: 'apellido', label: 'Asociado', render: r => `${escapeHtml(r.apellido)}, ${escapeHtml(r.nombre)}` },
  { key: 'dni',      label: 'DNI' },
  { key: 'cuit',     label: 'CUIT' },
  { key: 'email',    label: 'Email' },
  { key: 'estado',   label: 'Estado', render: r => badge(r.estado) },
  { key: 'fechaIngreso', label: 'Ingreso' }
];

// Dropdown con los tres tipos de certificado por cada fila de asociado.
const extraActions = {
  render: (r) => `
    <div class="cert-menu">
      <button class="btn ghost cert-toggle">Certificado ▾</button>
      <div class="cert-dropdown" hidden>
        <button data-cert="${r.id}" data-tipo="asociado">Asociado activo</button>
        <button data-cert="${r.id}" data-tipo="cargo">Cargo</button>
        <button data-cert="${r.id}" data-tipo="constancia">Constancia</button>
      </div>
    </div>`,

  bind: (allRows) => {
    // Toggle del dropdown
    document.querySelectorAll('.cert-toggle').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const dd = btn.nextElementSibling;
        const wasHidden = dd.hidden;
        document.querySelectorAll('.cert-dropdown').forEach(d => { d.hidden = true; });
        dd.hidden = !wasHidden;
      };
    });

    // Emisión del certificado
    document.querySelectorAll('[data-cert]').forEach(btn => {
      btn.onclick = async () => {
        btn.closest('.cert-dropdown').hidden = true;
        const row = allRows.find(r => r.id === btn.dataset.cert);
        try {
          await certificadoService.emitir(btn.dataset.tipo, row);
          toast.ok('Certificado generado. Usá Imprimir / Guardar PDF en la ventana.');
        } catch (err) {
          toast.err(err.message);
        }
      };
    });

    // Cerrar dropdowns al hacer click fuera
    document.addEventListener('click', () => {
      document.querySelectorAll('.cert-dropdown').forEach(d => { d.hidden = true; });
    });
  }
};

export function asociadosView() {
  return crudView({ title: 'Asociados', subtitle: 'CRUD completo de asociados.', newLabel: 'Nuevo asociado' });
}

export function bindAsociados() {
  return bindCrud({ service: asociadoService, fields: asociadoFields, columns, extraActions });
}

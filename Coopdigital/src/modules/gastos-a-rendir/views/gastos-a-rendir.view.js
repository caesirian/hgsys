import { gastoARendirService } from '../services/gasto-a-rendir.service.js';
import { gastoARendirFields } from '../components/gasto-a-rendir-form.js';
import { consejoService } from '../../consejo/services/consejo.service.js';
import { asociadoService } from '../../asociados/services/asociado.service.js';
import { crudView, bindCrud } from '../../../utils/render-crud.js';
import { openModal } from '../../../components/modal/modal.js';
import { hasPermission } from '../../../config/permissions.config.js';
import { authStore } from '../../../stores/auth.store.js';
import { fmt } from '../../../utils/date.js';
import { escapeHtml } from '../../../utils/security.js';
import { toast } from '../../../utils/toast.js';

const money = n => Number(n ?? 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

export function gastosARendirView() {
  return crudView({
    title: 'Gastos a Rendir',
    subtitle: 'Gastos rendidos por miembros del Consejo, con registro de firma en papel al saldarse.',
    newLabel: 'Nuevo gasto'
  });
}

export async function bindGastosARendir() {
  const [cargos, asociados] = await Promise.all([
    consejoService.list().catch(() => []),
    asociadoService.list().catch(() => [])
  ]);
  const nombres = Object.fromEntries(asociados.map(a => [a.id, `${a.apellido}, ${a.nombre}`]));
  const consejeroOptions = cargos
    .filter(c => c.vigente === true || c.vigente === 'true')
    .map(c => ({ value: c.asociadoId, label: nombres[c.asociadoId] ?? c.asociadoId }));

  const puedeFirmar = hasPermission(authStore.get(), 'gastosARendirFirmas', 'create');

  const columns = [
    { key: 'fecha',       label: 'Fecha',     render: r => fmt(r.fecha) },
    { key: 'concepto',    label: 'Concepto' },
    { key: 'categoria',   label: 'Categoría' },
    { key: 'monto',       label: 'Monto',     render: r => money(r.monto) },
    { key: 'consejeroId', label: 'Consejero', render: r => escapeHtml(nombres[r.consejeroId] ?? r.consejeroId) },
    { key: 'estado',      label: 'Estado',    render: r => `<span class="badge ${r.estado === 'firmado' ? 'ok' : 'bad'}">${escapeHtml(r.estado)}</span>` }
  ];

  const extraActions = {
    render: r => {
      if (r.estado === 'firmado' || !puedeFirmar) return '';
      return `<button class="btn ghost" data-firmar="${r.id}">Registrar firma</button>`;
    },
    bind: rows => {
      document.querySelectorAll('[data-firmar]').forEach(b => {
        b.onclick = () => {
          const gasto = rows.find(r => r.id === b.dataset.firmar);
          openModal(
            `Registrar firma — ${gasto.concepto}`,
            [{ name: 'consejeroId', label: 'Consejero que firma en papel', type: 'select', options: consejeroOptions }],
            { consejeroId: gasto.consejeroId },
            async data => {
              try {
                await gastoARendirService.registrarFirma(gasto.id, data);
                toast.ok('Firma registrada. El gasto quedó marcado como firmado.');
                await bindGastosARendir();
              } catch (err) {
                toast.err(err.message);
              }
            }
          );
        };
      });
    }
  };

  return bindCrud({ service: gastoARendirService, fields: gastoARendirFields, columns, extraActions });
}

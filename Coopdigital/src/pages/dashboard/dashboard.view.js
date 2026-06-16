import { cooperativaService } from '../../services/cooperativa.service.js';
import { usuarioService } from '../../modules/usuarios/services/usuario.service.js';
import { asociadoService } from '../../modules/asociados/services/asociado.service.js';
import { documentoService } from '../../modules/documentos/services/documento.service.js';
import { vencimientoService } from '../../modules/vencimientos/services/vencimiento.service.js';
import { eventoService } from '../../modules/eventos/services/evento.service.js';
import { fmt, daysUntil } from '../../utils/date.js';
import { asText } from '../../utils/formatters.js';

export async function dashboardView(user) {
  const [cooperativa, asociados, usuarios, documentos, vencimientos, eventos] = await Promise.all([
    cooperativaService.getCurrent(user), asociadoService.list(user), usuarioService.list(user), documentoService.list(user), vencimientoService.list(user), eventoService.list(user)
  ]);
  const proximos = vencimientos.filter((item) => item.estado !== 'cumplido').slice(0, 6);
  return `<section><h1>${asText(cooperativa.nombre)}</h1><p class="muted">Matrícula ${asText(cooperativa.matricula)} · CUIT ${asText(cooperativa.cuit)} · Plan ${asText(cooperativa.plan)}</p><div class="grid kpis"><div class="card"><span class="muted">Total de asociados</span><div class="num">${asociados.length}</div></div><div class="card"><span class="muted">Usuarios activos</span><div class="num">${usuarios.filter((item) => item.activo).length}</div></div><div class="card"><span class="muted">Próximos vencimientos</span><div class="num">${proximos.length}</div></div><div class="card"><span class="muted">Últimos documentos</span><div class="num">${documentos.length}</div></div></div><div class="dashboard-grid"><div class="card"><h3>Próximos vencimientos</h3>${proximos.map((item) => `<p><b>${asText(item.descripcion)}</b><br><span class="muted">${asText(item.organismoId)} · ${fmt(item.fechaVencimiento)} · ${daysUntil(item.fechaVencimiento)} días</span></p>`).join('')}</div><div class="card"><h3>Últimos documentos</h3>${documentos.slice(0, 6).map((item) => `<p><b>${asText(item.nombre)}</b><br><a href="${asText(item.url)}" target="_blank" rel="noreferrer">Descargar</a> · <span class="muted">${asText(item.categoria)}</span></p>`).join('')}</div><div class="card"><h3>Actividad reciente</h3>${eventos.slice(0, 8).map((item) => `<p><b>${asText(item.tipo)}</b><br><span class="muted">${fmt(item.fecha)} · ${asText(item.descripcion)}</span></p>`).join('')}</div></div></section>`;
}

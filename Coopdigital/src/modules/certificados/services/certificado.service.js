import { firestoreDb } from '../../../services/firestore-db.service.js';
import { authStore } from '../../../stores/auth.store.js';
import { cooperativaService } from '../../../services/cooperativa.service.js';
import { escapeHtml } from '../../../utils/security.js';
import { fmt } from '../../../utils/date.js';

const tipos = ['asociado', 'cargo', 'constancia'];

// Genera el HTML del certificado según el tipo solicitado.
// Se abre en una ventana nueva y se imprime directamente desde el navegador
// (sin dependencias externas, sin backend). El CSS de impresión oculta
// todo el resto del documento y solo imprime el certificado.
function htmlCertificado(tipo, asociado, cargo, cooperativa) {
  const hoy = fmt(new Date().toISOString());
  const nombreAsociado = `${escapeHtml(asociado.nombre)} ${escapeHtml(asociado.apellido)}`;
  const nombreCoop = escapeHtml(cooperativa?.nombre ?? 'Cooperativa');
  const matricula = escapeHtml(cooperativa?.matricula ?? '');

  let cuerpo = '';

  if (tipo === 'asociado') {
    cuerpo = `
      <p>La <strong>${nombreCoop}</strong> (Matrícula INAES N° ${matricula}), certifica que:</p>
      <div class="destacado">
        <div class="nombre">${nombreAsociado}</div>
        <div class="datos">DNI ${escapeHtml(asociado.dni)} · N° de asociado ${escapeHtml(String(asociado.numeroAsociado ?? ''))}</div>
      </div>
      <p>es asociado/a activo/a de esta cooperativa desde el <strong>${fmt(asociado.fechaIngreso)}</strong>, encontrándose en pleno goce de sus derechos sociales a la fecha.</p>`;
  } else if (tipo === 'cargo') {
    cuerpo = `
      <p>La <strong>${nombreCoop}</strong> (Matrícula INAES N° ${matricula}), certifica que:</p>
      <div class="destacado">
        <div class="nombre">${nombreAsociado}</div>
        <div class="datos">DNI ${escapeHtml(asociado.dni)} · N° de asociado ${escapeHtml(String(asociado.numeroAsociado ?? ''))}</div>
      </div>
      <p>desempeña el cargo de <strong>${escapeHtml(cargo ?? 'miembro del Consejo de Administración')}</strong> en esta cooperativa, con mandato vigente a la fecha del presente certificado.</p>`;
  } else {
    cuerpo = `
      <p>La <strong>${nombreCoop}</strong> (Matrícula INAES N° ${matricula}), certifica que:</p>
      <div class="destacado">
        <div class="nombre">${nombreAsociado}</div>
        <div class="datos">DNI ${escapeHtml(asociado.dni)} · N° de asociado ${escapeHtml(String(asociado.numeroAsociado ?? ''))}</div>
      </div>
      <p>figura en el Registro de Asociados de esta institución, con estado <strong>${escapeHtml(asociado.estado ?? 'activo')}</strong> a la fecha del presente documento.</p>`;
  }

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Certificado — ${nombreCoop}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Inter,sans-serif;color:#172033;background:#fff;padding:0}
  .certificado{width:210mm;min-height:148mm;margin:auto;padding:20mm 22mm;border:2px solid #172033;position:relative}
  .encabezado{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #172033;padding-bottom:14px;margin-bottom:22px}
  .logo-bloque{font-size:11px;color:#667085}
  .logo-bloque strong{display:block;font-size:18px;font-weight:900;color:#172033}
  .tipo-doc{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#635bff;text-align:right}
  p{font-size:13px;line-height:1.7;margin-bottom:14px}
  .destacado{background:#f6f7fb;border-radius:12px;padding:16px 20px;margin:18px 0;text-align:center}
  .destacado .nombre{font-size:20px;font-weight:900;margin-bottom:4px}
  .destacado .datos{font-size:12px;color:#667085}
  .pie{margin-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
  .firma-bloque{text-align:center}
  .linea-firma{border-top:1px solid #172033;margin-bottom:6px}
  .firma-bloque small{font-size:11px;color:#667085}
  .numero{font-size:10px;color:#aaa;text-align:right;margin-top:18px}
  @media print{
    @page{size:A5 landscape;margin:0}
    body{padding:0}
    .certificado{border:none;width:100%;min-height:100vh}
    .no-print{display:none!important}
  }
  .controles{text-align:center;padding:20px;display:flex;gap:12px;justify-content:center}
  .btn-print{background:#635bff;color:#fff;border:0;border-radius:10px;padding:10px 22px;font-size:14px;font-weight:800;cursor:pointer}
  .btn-close{background:#e5e7eb;color:#374151;border:0;border-radius:10px;padding:10px 22px;font-size:14px;font-weight:700;cursor:pointer}
</style>
</head>
<body>
<div class="controles no-print">
  <button class="btn-print" onclick="window.print()">Imprimir / Guardar PDF</button>
  <button class="btn-close" onclick="window.close()">Cerrar</button>
</div>
<div class="certificado">
  <div class="encabezado">
    <div class="logo-bloque">
      <strong>${nombreCoop}</strong>
      Matrícula INAES N° ${matricula}
    </div>
    <div class="tipo-doc">
      Certificado de ${tipo}<br>
      <span style="font-weight:400;color:#aaa">Emitido el ${hoy}</span>
    </div>
  </div>
  ${cuerpo}
  <p>Se extiende el presente a solicitud del/la interesado/a para ser presentado ante quien corresponda.</p>
  <div class="pie">
    <div class="firma-bloque">
      <div class="linea-firma"></div>
      <small>Presidente del Consejo de Administración</small>
    </div>
    <div class="firma-bloque">
      <div class="linea-firma"></div>
      <small>Secretario/a del Consejo de Administración</small>
    </div>
  </div>
  <div class="numero">CoopDigital · Documento generado digitalmente</div>
</div>
</body>
</html>`;
}

export const certificadoService = {
  tipos,

  // Genera el certificado en una ventana nueva, lo registra en Firestore
  // y devuelve el id del documento creado.
  async emitir(tipo, asociado, cargo = null) {
    if (!tipos.includes(tipo)) throw new Error('Tipo de certificado no válido.');

    const cooperativa = await cooperativaService.getCurrent().catch(() => null);
    const html = htmlCertificado(tipo, asociado, cargo, cooperativa);

    // Abrir en nueva ventana (requiere que el navegador no bloquee popups)
    const win = window.open('', '_blank');
    if (!win) throw new Error('El navegador bloqueó la ventana emergente. Permitila para generar el certificado.');
    win.document.write(html);
    win.document.close();

    // Registrar en Firestore para trazabilidad
    const registro = await firestoreDb.create('certificados', {
      tipo,
      asociadoId: asociado.id,
      emitidoPor: authStore.get()?.uid ?? 'sistema'
    });

    return registro.id;
  },

  async list() {
    return firestoreDb.list('certificados');
  }
};

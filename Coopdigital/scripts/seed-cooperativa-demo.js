#!/usr/bin/env node
/**
 * seed-cooperativa-demo.js
 * Poblar CoopDigital con datos de prueba para "Cooperativa Demo Ltda."
 *
 * Qué crea:
 *   - cooperativas/{id}           (datos institucionales)
 *   - cooperativas/{id}/usuarios  (5 usuarios, 1 por rol)
 *   - usuariosIndex/{uid}         (índice global, 1 por usuario)
 *   - cooperativas/{id}/asociados (20 asociados, mix de estados)
 *   - cooperativas/{id}/consejoAdministracion (5 cargos)
 *   - cooperativas/{id}/sindicatura (2 síndicos)
 *   - cooperativas/{id}/asambleas  (3 asambleas)
 *   - cooperativas/{id}/actas      (4 actas)
 *   - cooperativas/{id}/documentos (8 documentos)
 *   - cooperativas/{id}/vencimientos (6 vencimientos)
 *   - cooperativas/{id}/movimientos  (18 movimientos contables)
 *   - cooperativas/{id}/eventos      (10 eventos de auditoría)
 *
 * Uso:
 *   node seed-cooperativa-demo.js --credentials <ruta-service-account.json>
 *
 * Requiere Firebase Admin SDK:
 *   npm install firebase-admin
 *
 * Para limpiar y re-seedear, agregá --reset (borra todos los documentos
 * de la cooperativa antes de insertar).
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      out[key] = argv[i + 1] ?? true;
      if (argv[i + 1] && !argv[i + 1].startsWith('--')) i++;
    }
  }
  return out;
}

// Convierte string "YYYY-MM-DD" a Firestore Timestamp
function ts(dateStr) {
  return Timestamp.fromDate(new Date(dateStr + 'T12:00:00-03:00'));
}

const SISTEMA = 'script-seed-demo';

function auditCreate(fecha) {
  const t = fecha ? ts(fecha) : FieldValue.serverTimestamp();
  return {
    creadoPor: SISTEMA,
    fechaCreacion: t,
    modificadoPor: SISTEMA,
    fechaModificacion: t,
    cooperativaId: '' // se sobreescribe después
  };
}

function log(msg) { console.log(msg); }
function ok(msg)  { console.log('  ✅ ' + msg); }
function warn(msg){ console.log('  ⚠️  ' + msg); }

// ─────────────────────────────────────────────────────────────────────────────
// DATOS: Cooperativa
// ─────────────────────────────────────────────────────────────────────────────

const COOPERATIVA = {
  nombre:          'Cooperativa de Trabajo Demo Ltda.',
  matricula:       '99999',
  cuit:            '30-99999999-9',
  email:           'administracion@coopdemo.coop',
  telefono:        '011-4523-8870',
  domicilio:       'Av. Corrientes 3456, Piso 2',
  localidad:       'Buenos Aires',
  provincia:       'Buenos Aires',
  codigoPostal:    'C1193',
  sitioWeb:        'https://www.coopdemo.coop',
  logoUrl:         '',
  colorPrincipal:  '#17b978',
  plan:            'free',
  activa:          true,
  federacionId:    null,
  fechaAlta:       ts('2019-03-15'),
  creadoPor:       SISTEMA,
  fechaCreacion:   ts('2019-03-15'),
  modificadoPor:   SISTEMA,
  fechaModificacion: ts('2024-08-10'),
};

// ─────────────────────────────────────────────────────────────────────────────
// DATOS: Usuarios (1 por rol)
// ─────────────────────────────────────────────────────────────────────────────

const PASSWORD_DEMO = 'Demo2025!';

const USUARIOS_DEF = [
  { email: 'admin@coopdemo.coop',      nombre: 'Graciela',  apellido: 'Ferreyra',   rol: 'admin',     fechaAlta: '2019-03-15' },
  { email: 'consejo@coopdemo.coop',    nombre: 'Marcelo',   apellido: 'Quinteros',  rol: 'consejero', fechaAlta: '2019-03-20' },
  { email: 'sindico@coopdemo.coop',    nombre: 'Nora',      apellido: 'Villegas',   rol: 'sindico',   fechaAlta: '2020-04-01' },
  { email: 'operador@coopdemo.coop',   nombre: 'Sebastián', apellido: 'Ibáñez',     rol: 'operador',  fechaAlta: '2021-06-15' },
  { email: 'consulta@coopdemo.coop',   nombre: 'Luciana',   apellido: 'Montoya',    rol: 'consulta',  fechaAlta: '2023-02-28' },
];

// ─────────────────────────────────────────────────────────────────────────────
// DATOS: Asociados (20, mix de estados y periodos)
// ─────────────────────────────────────────────────────────────────────────────

const ASOCIADOS_DEF = [
  // Consejo y Sindicatura (primeros 7, activos)
  { num:'001', apellido:'Ferreyra',   nombre:'Graciela',  dni:'22456789', cuit:'27-22456789-3', nac:'1975-08-12', tel:'11-5523-4410', email:'g.ferreyra@coopdemo.coop',   dom:'Av. Corrientes 3456', loc:'CABA',          prov:'Buenos Aires', cp:'C1193', ing:'2019-03-15', estado:'activo'    },
  { num:'002', apellido:'Quinteros',  nombre:'Marcelo',   dni:'18234567', cuit:'20-18234567-1', nac:'1969-11-03', tel:'11-4432-9900', email:'m.quinteros@coopdemo.coop',  dom:'Larrea 1120 1°A',    loc:'CABA',          prov:'Buenos Aires', cp:'C1117', ing:'2019-03-15', estado:'activo'    },
  { num:'003', apellido:'Villegas',   nombre:'Nora',      dni:'25678901', cuit:'27-25678901-0', nac:'1978-02-20', tel:'11-6601-2233', email:'n.villegas@coopdemo.coop',   dom:'Medrano 890 3°B',    loc:'CABA',          prov:'Buenos Aires', cp:'C1179', ing:'2019-03-15', estado:'activo'    },
  { num:'004', apellido:'Romero',     nombre:'Diego',     dni:'30123456', cuit:'20-30123456-5', nac:'1985-06-30', tel:'11-5544-7788', email:'d.romero@coopdemo.coop',     dom:'Yapeyú 456',         loc:'CABA',          prov:'Buenos Aires', cp:'C1208', ing:'2019-04-01', estado:'activo'    },
  { num:'005', apellido:'Suárez',     nombre:'Carolina',  dni:'28901234', cuit:'27-28901234-8', nac:'1982-09-14', tel:'11-4456-3322', email:'c.suarez@coopdemo.coop',     dom:'Thames 777 2°C',     loc:'CABA',          prov:'Buenos Aires', cp:'C1414', ing:'2019-04-01', estado:'activo'    },
  { num:'006', apellido:'Acosta',     nombre:'Hugo',      dni:'20112233', cuit:'20-20112233-4', nac:'1965-03-22', tel:'11-4398-1100', email:'h.acosta@coopdemo.coop',     dom:'Av. San Juan 1345',  loc:'CABA',          prov:'Buenos Aires', cp:'C1147', ing:'2019-04-15', estado:'activo'    },
  { num:'007', apellido:'Méndez',     nombre:'Patricia',  dni:'24556677', cuit:'27-24556677-2', nac:'1977-12-08', tel:'11-5567-4421', email:'p.mendez@coopdemo.coop',     dom:'Cabrera 2310 4°D',   loc:'CABA',          prov:'Buenos Aires', cp:'C1426', ing:'2019-05-01', estado:'activo'    },
  // Asociados activos generales
  { num:'008', apellido:'García',     nombre:'Leonardo',  dni:'32445566', cuit:'20-32445566-7', nac:'1990-07-19', tel:'11-4412-5544', email:'l.garcia@coopdemo.coop',     dom:'Av. Forest 890',     loc:'CABA',          prov:'Buenos Aires', cp:'C1427', ing:'2019-06-01', estado:'activo'    },
  { num:'009', apellido:'López',      nombre:'Valeria',   dni:'31122334', cuit:'27-31122334-9', nac:'1989-04-05', tel:'11-5589-6600', email:'v.lopez@coopdemo.coop',      dom:'Coronel Díaz 3120',  loc:'CABA',          prov:'Buenos Aires', cp:'C1425', ing:'2020-01-15', estado:'activo'    },
  { num:'010', apellido:'Torres',     nombre:'Alejandro', dni:'27889900', cuit:'20-27889900-6', nac:'1980-11-29', tel:'11-4421-8877', email:'a.torres@coopdemo.coop',     dom:'Av. Rivadavia 5678', loc:'CABA',          prov:'Buenos Aires', cp:'C1406', ing:'2020-03-01', estado:'activo'    },
  { num:'011', apellido:'Ríos',       nombre:'Mariela',   dni:'29334455', cuit:'27-29334455-1', nac:'1983-08-17', tel:'11-6677-3300', email:'m.rios@coopdemo.coop',       dom:'Pringles 1240 1°A',  loc:'CABA',          prov:'Buenos Aires', cp:'C1183', ing:'2020-06-01', estado:'activo'    },
  { num:'012', apellido:'Herrera',    nombre:'Roberto',   dni:'23667788', cuit:'20-23667788-0', nac:'1974-01-25', tel:'11-4455-9988', email:'r.herrera@coopdemo.coop',    dom:'J.M. Moreno 320',    loc:'CABA',          prov:'Buenos Aires', cp:'C1424', ing:'2021-02-15', estado:'activo'    },
  { num:'013', apellido:'Jiménez',    nombre:'Claudia',   dni:'33445566', cuit:'27-33445566-3', nac:'1991-10-02', tel:'11-5512-7744', email:'c.jimenez@coopdemo.coop',    dom:'Murillo 1890 3°B',   loc:'CABA',          prov:'Buenos Aires', cp:'C1414', ing:'2021-08-01', estado:'activo'    },
  { num:'014', apellido:'Benítez',    nombre:'Fabián',    dni:'26778899', cuit:'20-26778899-8', nac:'1979-05-11', tel:'11-4398-2211', email:'f.benitez@coopdemo.coop',    dom:'Av. Triunvirato 4560',loc:'Villa Urquiza', prov:'Buenos Aires', cp:'C1431', ing:'2022-03-01', estado:'activo'    },
  { num:'015', apellido:'Castillo',   nombre:'Andrea',    dni:'35667788', cuit:'27-35667788-5', nac:'1994-02-28', tel:'11-6634-1100', email:'a.castillo@coopdemo.coop',   dom:'Maure 2340',         loc:'Belgrano',      prov:'Buenos Aires', cp:'C1426', ing:'2022-09-15', estado:'activo'    },
  { num:'016', apellido:'Morales',    nombre:'Gustavo',   dni:'21334455', cuit:'20-21334455-6', nac:'1972-07-04', tel:'11-4421-0099', email:'g.morales@coopdemo.coop',    dom:'Serrano 980 2°C',    loc:'CABA',          prov:'Buenos Aires', cp:'C1414', ing:'2023-01-15', estado:'activo'    },
  { num:'017', apellido:'Navarro',    nombre:'Silvina',   dni:'34112233', cuit:'27-34112233-7', nac:'1992-12-19', tel:'11-5578-4455', email:'s.navarro@coopdemo.coop',    dom:'Billinghurst 1560',  loc:'CABA',          prov:'Buenos Aires', cp:'C1174', ing:'2023-06-01', estado:'activo'    },
  // Suspendido
  { num:'018', apellido:'Gutiérrez',  nombre:'Horacio',   dni:'19889900', cuit:'20-19889900-2', nac:'1963-09-08', tel:'11-4411-3322', email:'h.gutierrez@coopdemo.coop',  dom:'Av. del Libertador 2300',loc:'CABA',      prov:'Buenos Aires', cp:'C1425', ing:'2020-04-01', estado:'suspendido', obs:'Mora en cuotas sociales por 3 meses.' },
  // Dado de baja
  { num:'019', apellido:'Pereyra',    nombre:'Daniel',    dni:'22567890', cuit:'20-22567890-4', nac:'1975-04-16', tel:'11-4499-2211', email:'d.pereyra@gmail.com',         dom:'Warnes 2100',        loc:'CABA',          prov:'Buenos Aires', cp:'C1427', ing:'2019-06-01', egr:'2023-05-30', estado:'dadoDeBaja', obs:'Renuncia voluntaria. Cierre de actividad.' },
  // Fallecido
  { num:'020', apellido:'Vázquez',    nombre:'Ernesto',   dni:'15678901', cuit:'20-15678901-3', nac:'1948-11-02', tel:'',             email:'',                            dom:'Av. Gaona 3400',     loc:'CABA',          prov:'Buenos Aires', cp:'C1416', ing:'2019-03-15', egr:'2024-07-12', estado:'fallecido', obs:'Fallecimiento. Tramitada baja por sucesor legal.' },
];

// ─────────────────────────────────────────────────────────────────────────────
// DATOS: Actas
// ─────────────────────────────────────────────────────────────────────────────

const ACTAS_DEF = [
  {
    id: 'acta-001',
    numeroActa: '001/2024',
    tipo: 'Asamblea Ordinaria',
    fecha: '2024-04-20',
    titulo: 'Acta de Asamblea Ordinaria — Ejercicio 2023',
    contenido: `En la Ciudad Autónoma de Buenos Aires, a los veinte días del mes de abril de dos mil veinticuatro, se reúne en Asamblea Ordinaria la Cooperativa de Trabajo Demo Ltda., en el domicilio social sito en Av. Corrientes 3456, Piso 2, con quórum suficiente de asociados.\n\nSe aprueba por unanimidad el Orden del Día:\n\n1. Consideración de la Memoria, Balance General e Inventario correspondientes al ejercicio cerrado el 31 de diciembre de 2023.\n2. Elección de autoridades para el período 2024-2026.\n3. Fijación de cuotas sociales.\n\nBajo el punto 1, el Tesorero informa el resultado neto del ejercicio: superávit de $1.847.200. La Sindicatura emite informe favorable sin observaciones.\n\nBajo el punto 2, se elige por aclamación el nuevo Consejo de Administración.\n\nBajo el punto 3, se fija la cuota social ordinaria en $15.000 mensuales.\n\nSin más puntos que tratar, se cierra la asamblea siendo las 19:30 hs.`,
    archivoPdfUrl: '',
    firmada: true,
  },
  {
    id: 'acta-002',
    numeroActa: '002/2024',
    tipo: 'Consejo',
    fecha: '2024-06-15',
    titulo: 'Acta de Reunión de Consejo — Aprobación presupuesto tecnología',
    contenido: `Reunidos los miembros del Consejo de Administración el día 15 de junio de 2024, se trata el presupuesto para modernización de infraestructura tecnológica por un monto de $380.000, presentado por la gerencia.\n\nSe aprueba por unanimidad la contratación de servicio de hosting y licencias de software de gestión. Se instruye al Tesorero para la afectación presupuestaria correspondiente.`,
    archivoPdfUrl: '',
    firmada: true,
  },
  {
    id: 'acta-003',
    numeroActa: '003/2024',
    tipo: 'Consejo',
    fecha: '2024-09-10',
    titulo: 'Acta de Reunión de Consejo — Mora de asociado y suspensión',
    contenido: `Se trata la situación del asociado Horacio Gutiérrez (N° 018), con tres meses de mora en el pago de cuotas sociales, a pesar de las intimaciones realizadas. El Consejo resuelve, por mayoría, suspender al asociado en sus derechos sociales hasta regularización de la deuda, conforme al artículo 28 del Estatuto Social.`,
    archivoPdfUrl: '',
    firmada: true,
  },
  {
    id: 'acta-004',
    numeroActa: '001/2025',
    tipo: 'Asamblea Extraordinaria',
    fecha: '2025-02-28',
    titulo: 'Acta de Asamblea Extraordinaria — Reforma parcial del Estatuto',
    contenido: `Convocada en carácter extraordinario, la asamblea trata la reforma de los artículos 12 y 34 del Estatuto Social para adecuarlos a la Resolución INAES 6578/2024 sobre gobernanza cooperativa digital.\n\nSe aprueba la reforma con el voto afirmativo de 14 asociados sobre 15 presentes. Se instruye al Presidente a realizar la presentación ante INAES dentro de los 30 días hábiles.`,
    archivoPdfUrl: '',
    firmada: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DATOS: Asambleas
// ─────────────────────────────────────────────────────────────────────────────

const ASAMBLEAS_DEF = [
  {
    tipo: 'ordinaria',
    fechaConvocatoria: '2024-03-25',
    fechaAsamblea:     '2024-04-20',
    ordenDelDia: [
      'Consideración de Memoria, Balance e Inventario — Ejercicio 2023',
      'Elección de autoridades (Consejo de Administración y Sindicatura)',
      'Fijación de cuotas sociales para el ejercicio 2024',
    ],
    estado: 'cerrada',
    actaId: 'acta-001',
    observaciones: 'Quórum: 15 asociados sobre 17 activos a la fecha de corte.',
  },
  {
    tipo: 'extraordinaria',
    fechaConvocatoria: '2025-01-31',
    fechaAsamblea:     '2025-02-28',
    ordenDelDia: [
      'Reforma parcial del Estatuto Social — Artículos 12 y 34',
      'Adecuación a Resolución INAES 6578/2024',
    ],
    estado: 'cerrada',
    actaId: 'acta-004',
    observaciones: 'Convocatoria publicada en Boletín Oficial y notificada por correo certificado.',
  },
  {
    tipo: 'ordinaria',
    fechaConvocatoria: '2025-03-15',
    fechaAsamblea:     '2025-04-26',
    ordenDelDia: [
      'Consideración de Memoria, Balance e Inventario — Ejercicio 2024',
      'Distribución de excedentes',
      'Informe de sindicatura',
      'Propuestas de ampliación de servicios',
    ],
    estado: 'planificada',
    actaId: null,
    observaciones: '',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DATOS: Documentos
// ─────────────────────────────────────────────────────────────────────────────

const DOCUMENTOS_DEF = [
  { nombre: 'Estatuto Social Vigente',             categoria: 'Legal',     desc: 'Texto completo del Estatuto Social actualizado con reforma 2025.',   fecha: '2025-03-05', visible: true  },
  { nombre: 'Balance General 2023',                categoria: 'Contable',  desc: 'Balance General e Inventario cerrado al 31/12/2023, auditado.',     fecha: '2024-04-18', visible: true  },
  { nombre: 'Memoria Anual 2023',                  categoria: 'INAES',     desc: 'Memoria del ejercicio 2023 presentada ante INAES.',                 fecha: '2024-05-02', visible: true  },
  { nombre: 'Inscripción INAES — Matrícula 99999', categoria: 'INAES',     desc: 'Resolución de inscripción y otorgamiento de matrícula.',            fecha: '2019-04-01', visible: true  },
  { nombre: 'CUIT Cooperativa',                    categoria: 'AFIP',      desc: 'Constancia de CUIT vigente emitida por AFIP.',                      fecha: '2024-01-10', visible: true  },
  { nombre: 'Contrato de alquiler sede social',    categoria: 'Contratos', desc: 'Contrato de locación de la sede social, vence 31/12/2026.',         fecha: '2023-01-15', visible: true  },
  { nombre: 'Habilitación Municipal CABA',         categoria: 'Municipal', desc: 'Habilitación comercial otorgada por el GCBA.',                      fecha: '2022-08-20', visible: true  },
  { nombre: 'Convenio FECOOTRA 2024',              categoria: 'Convenios', desc: 'Convenio marco con la Federación de Cooperativas de Trabajo.',     fecha: '2024-02-14', visible: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// DATOS: Vencimientos
// ─────────────────────────────────────────────────────────────────────────────

const VENCIMIENTOS_DEF = [
  { desc: 'Presentación Memoria y Balance 2024 — INAES',     org: 'INAES', fecha: '2025-05-30', estado: 'pendiente', obs: 'Plazo estándar 120 días del cierre de ejercicio.' },
  { desc: 'Declaración Jurada Ganancias Personas Jurídicas', org: 'AFIP',  fecha: '2025-05-20', estado: 'pendiente', obs: 'Formulario 713. Coordinar con contadora Dra. Sosa.' },
  { desc: 'Renovación habilitación municipal',               org: 'GCBA',  fecha: '2025-08-20', estado: 'pendiente', obs: 'Iniciar trámite 60 días antes. Expediente N° 12340/2024.' },
  { desc: 'Vencimiento contrato de alquiler sede social',    org: 'Estudio Jurídico Del Valle', fecha: '2026-12-31', estado: 'pendiente', obs: 'Negociar renovación con 6 meses de anticipación.' },
  { desc: 'Presentación Memoria y Balance 2023 — INAES',     org: 'INAES', fecha: '2024-05-31', estado: 'cumplido',  obs: 'Presentado en fecha. Expediente INAES N° 4512/2024.' },
  { desc: 'Declaración Jurada IVA — Diciembre 2024',         org: 'AFIP',  fecha: '2025-01-20', estado: 'cumplido',  obs: 'Presentado sin deuda.' },
];

// ─────────────────────────────────────────────────────────────────────────────
// DATOS: Movimientos contables (18, mix de meses 2024 y ene/feb 2025)
// ─────────────────────────────────────────────────────────────────────────────

const MOVIMIENTOS_DEF = [
  // Ingresos
  { tipo:'ingreso', cat:'Cuotas sociales',        monto:270000, fecha:'2024-10-05', desc:'Cuotas sociales octubre 2024 — 18 asociados activos',   medio:'Transferencia' },
  { tipo:'ingreso', cat:'Cuotas sociales',        monto:270000, fecha:'2024-11-05', desc:'Cuotas sociales noviembre 2024 — 18 asociados activos',  medio:'Transferencia' },
  { tipo:'ingreso', cat:'Cuotas sociales',        monto:270000, fecha:'2024-12-05', desc:'Cuotas sociales diciembre 2024 — 18 asociados activos',  medio:'Transferencia' },
  { tipo:'ingreso', cat:'Cuotas sociales',        monto:285000, fecha:'2025-01-05', desc:'Cuotas sociales enero 2025 — valor actualizado',         medio:'Transferencia' },
  { tipo:'ingreso', cat:'Cuotas sociales',        monto:285000, fecha:'2025-02-05', desc:'Cuotas sociales febrero 2025 — 19 asociados activos',    medio:'Transferencia' },
  { tipo:'ingreso', cat:'Ingresos por servicios', monto:480000, fecha:'2024-10-15', desc:'Factura B N°00001-00089 — Servicios de diseño gráfico', medio:'Transferencia' },
  { tipo:'ingreso', cat:'Ingresos por servicios', monto:560000, fecha:'2024-11-22', desc:'Factura B N°00001-00090 — Desarrollo web Municipio Lomas',medio:'Transferencia'},
  { tipo:'ingreso', cat:'Ingresos por servicios', monto:320000, fecha:'2025-01-18', desc:'Factura B N°00001-00091 — Consultoría sistemas internos', medio:'Transferencia'},
  { tipo:'ingreso', cat:'Subsidios y aportes',    monto:200000, fecha:'2024-12-10', desc:'Subsidio INAES — Programa Cooperar 2024',                medio:'Transferencia' },
  { tipo:'ingreso', cat:'Otros ingresos',         monto: 45000, fecha:'2024-11-30', desc:'Venta de material de oficina en desuso',                 medio:'Efectivo'      },
  // Egresos
  { tipo:'egreso',  cat:'Gastos de personal',       monto:380000, fecha:'2024-10-31', desc:'Retiros de producción — octubre 2024',           medio:'Transferencia' },
  { tipo:'egreso',  cat:'Gastos de personal',       monto:380000, fecha:'2024-11-30', desc:'Retiros de producción — noviembre 2024',         medio:'Transferencia' },
  { tipo:'egreso',  cat:'Gastos de personal',       monto:410000, fecha:'2024-12-31', desc:'Retiros de producción — diciembre 2024 (aguinaldo proporcional)', medio:'Transferencia' },
  { tipo:'egreso',  cat:'Gastos de administración', monto: 78000, fecha:'2024-10-20', desc:'Honorarios Dra. Contadora Sosa — octubre',       medio:'Transferencia' },
  { tipo:'egreso',  cat:'Gastos de administración', monto: 78000, fecha:'2024-11-20', desc:'Honorarios Dra. Contadora Sosa — noviembre',     medio:'Transferencia' },
  { tipo:'egreso',  cat:'Gastos generales y servicios', monto:42500, fecha:'2024-10-10', desc:'Alquiler sede social — octubre',             medio:'Transferencia' },
  { tipo:'egreso',  cat:'Gastos generales y servicios', monto:42500, fecha:'2024-11-10', desc:'Alquiler sede social — noviembre',           medio:'Transferencia' },
  { tipo:'egreso',  cat:'Impuestos y tasas',        monto: 18000, fecha:'2024-12-20', desc:'AGIP Ingresos Brutos — 3° bimestre 2024',       medio:'Débito automático' },
];

// ─────────────────────────────────────────────────────────────────────────────
// DATOS: Eventos de auditoría
// ─────────────────────────────────────────────────────────────────────────────

const EVENTOS_DEF = [
  { tipo:'inicio_sesion',       desc:'Inicio de sesión — Graciela Ferreyra (admin)',           fecha:'2025-02-25' },
  { tipo:'alta_asociado',       desc:'Alta de asociado N°017 — Silvina Navarro',               fecha:'2023-06-01' },
  { tipo:'baja_asociado',       desc:'Baja de asociado N°019 — Daniel Pereyra (renuncia)',     fecha:'2023-05-30' },
  { tipo:'modificacion_asociado',desc:'Suspensión de asociado N°018 — Horacio Gutiérrez',     fecha:'2024-09-12' },
  { tipo:'carga_documento',     desc:'Carga de documento: Balance General 2023',               fecha:'2024-04-18' },
  { tipo:'creacion_acta',       desc:'Creación acta N°001/2024 — Asamblea Ordinaria',         fecha:'2024-04-21' },
  { tipo:'creacion_acta',       desc:'Creación acta N°001/2025 — Asamblea Extraordinaria',   fecha:'2025-03-01' },
  { tipo:'creacion_usuario',    desc:'Alta de usuario: Luciana Montoya (rol: consulta)',       fecha:'2023-02-28' },
  { tipo:'inicio_sesion',       desc:'Inicio de sesión — Marcelo Quinteros (consejero)',       fecha:'2025-02-24' },
  { tipo:'modificacion_acta',   desc:'Edición acta N°002/2024 — corrección de fecha',         fecha:'2024-06-16' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Funciones de escritura
// ─────────────────────────────────────────────────────────────────────────────

async function crearCooperativa(db, id) {
  await db.collection('cooperativas').doc(id).set(COOPERATIVA);
  ok(`Cooperativa creada: ${COOPERATIVA.nombre} (id: ${id})`);
}

async function crearUsuarios(auth, db, cooperativaId) {
  const ahora = FieldValue.serverTimestamp();
  const resultados = [];

  for (const u of USUARIOS_DEF) {
    let uid;
    // Intentar crear en Auth, ignorar si ya existe
    try {
      const rec = await auth.createUser({
        email: u.email,
        password: PASSWORD_DEMO,
        displayName: `${u.nombre} ${u.apellido}`,
        emailVerified: false,
      });
      uid = rec.uid;
      ok(`Auth creado: ${u.email} (uid: ${uid})`);
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        const rec = await auth.getUserByEmail(u.email);
        uid = rec.uid;
        warn(`Auth ya existe: ${u.email} (uid: ${uid})`);
      } else {
        throw err;
      }
    }

    const perfil = {
      uid,
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      telefono: '',
      rol: u.rol,
      activo: true,
      ultimoAcceso: null,
      fechaInvitacion: ts(u.fechaAlta),
      fechaAlta: ts(u.fechaAlta),
      creadoPor: SISTEMA,
      fechaCreacion: ts(u.fechaAlta),
      modificadoPor: SISTEMA,
      fechaModificacion: ts(u.fechaAlta),
    };

    await db.collection('cooperativas').doc(cooperativaId).collection('usuarios').doc(uid).set(perfil);
    await db.collection('usuariosIndex').doc(uid).set({ cooperativaId });

    resultados.push({ uid, ...u });
    ok(`Usuario + index: ${u.nombre} ${u.apellido} [${u.rol}]`);
  }
  return resultados;
}

async function crearAsociados(db, cooperativaId) {
  const colRef = db.collection('cooperativas').doc(cooperativaId).collection('asociados');
  const mapa = {}; // numeroAsociado -> docId

  for (const a of ASOCIADOS_DEF) {
    const data = {
      numeroAsociado: a.num,
      apellido:       a.apellido,
      nombre:         a.nombre,
      dni:            a.dni,
      cuit:           a.cuit,
      fechaNacimiento:ts(a.nac),
      telefono:       a.tel,
      email:          a.email,
      domicilio:      a.dom,
      localidad:      a.loc,
      provincia:      a.prov,
      codigoPostal:   a.cp,
      fechaIngreso:   ts(a.ing),
      fechaEgreso:    a.egr ? ts(a.egr) : null,
      estado:         a.estado,
      observaciones:  a.obs ?? '',
      creadoPor:      SISTEMA,
      fechaCreacion:  ts(a.ing),
      modificadoPor:  SISTEMA,
      fechaModificacion: a.egr ? ts(a.egr) : ts(a.ing),
      cooperativaId,
    };
    const ref = await colRef.add(data);
    mapa[a.num] = ref.id;
  }
  ok(`Asociados creados: ${ASOCIADOS_DEF.length}`);
  return mapa;
}

async function crearConsejo(db, cooperativaId, mapaAsociados) {
  // num de asociado -> docId
  const col = db.collection('cooperativas').doc(cooperativaId).collection('consejoAdministracion');

  const CONSEJO_DEF = [
    { asocNum:'001', cargo:'Presidente',    inicio:'2024-04-20', fin:'2026-04-20', vigente:true  },
    { asocNum:'002', cargo:'Vicepresidente',inicio:'2024-04-20', fin:'2026-04-20', vigente:true  },
    { asocNum:'004', cargo:'Secretario',    inicio:'2024-04-20', fin:'2026-04-20', vigente:true  },
    { asocNum:'005', cargo:'Tesorero',      inicio:'2024-04-20', fin:'2026-04-20', vigente:true  },
    { asocNum:'006', cargo:'Vocal Titular', inicio:'2024-04-20', fin:'2026-04-20', vigente:true  },
    { asocNum:'007', cargo:'Vocal Suplente',inicio:'2024-04-20', fin:'2026-04-20', vigente:true  },
    // Mandato anterior (histórico)
    { asocNum:'008', cargo:'Vocal Titular', inicio:'2022-04-15', fin:'2024-04-20', vigente:false },
  ];

  for (const c of CONSEJO_DEF) {
    await col.add({
      asociadoId:  mapaAsociados[c.asocNum],
      cargo:       c.cargo,
      inicioMandato: ts(c.inicio),
      finMandato:    ts(c.fin),
      vigente:     c.vigente,
      creadoPor:   SISTEMA,
      fechaCreacion: ts(c.inicio),
      modificadoPor: SISTEMA,
      fechaModificacion: ts(c.inicio),
      cooperativaId,
    });
  }
  ok(`Consejo de Administración: ${CONSEJO_DEF.length} cargos`);
}

async function crearSindicatura(db, cooperativaId, mapaAsociados) {
  const col = db.collection('cooperativas').doc(cooperativaId).collection('sindicatura');

  const SIND_DEF = [
    { asocNum:'003', tipo:'titular', inicio:'2024-04-20', fin:'2026-04-20', vigente:true  },
    { asocNum:'009', tipo:'suplente',inicio:'2024-04-20', fin:'2026-04-20', vigente:true  },
    // Síndico anterior
    { asocNum:'010', tipo:'titular', inicio:'2022-04-15', fin:'2024-04-20', vigente:false },
  ];

  for (const s of SIND_DEF) {
    await col.add({
      asociadoId:  mapaAsociados[s.asocNum],
      tipo:        s.tipo,
      inicioMandato: ts(s.inicio),
      finMandato:    ts(s.fin),
      vigente:     s.vigente,
      creadoPor:   SISTEMA,
      fechaCreacion: ts(s.inicio),
      modificadoPor: SISTEMA,
      fechaModificacion: ts(s.inicio),
      cooperativaId,
    });
  }
  ok(`Sindicatura: ${SIND_DEF.length} registros`);
}

async function crearActas(db, cooperativaId) {
  const col = db.collection('cooperativas').doc(cooperativaId).collection('actas');
  const mapa = {}; // id ficticio -> docId real

  for (const a of ACTAS_DEF) {
    const { id: idFicticio, ...data } = a;
    const ref = await col.add({
      ...data,
      fecha: ts(data.fecha),
      creadoPor: SISTEMA,
      fechaCreacion: ts(data.fecha),
      modificadoPor: SISTEMA,
      fechaModificacion: ts(data.fecha),
      cooperativaId,
    });
    mapa[idFicticio] = ref.id;
  }
  ok(`Actas: ${ACTAS_DEF.length}`);
  return mapa;
}

async function crearAsambleas(db, cooperativaId, mapaActas) {
  const col = db.collection('cooperativas').doc(cooperativaId).collection('asambleas');

  for (const a of ASAMBLEAS_DEF) {
    await col.add({
      tipo:             a.tipo,
      fechaConvocatoria:ts(a.fechaConvocatoria),
      fechaAsamblea:    ts(a.fechaAsamblea),
      ordenDelDia:      a.ordenDelDia,
      estado:           a.estado,
      actaId:           a.actaId ? (mapaActas[a.actaId] ?? null) : null,
      observaciones:    a.observaciones,
      creadoPor:        SISTEMA,
      fechaCreacion:    ts(a.fechaConvocatoria),
      modificadoPor:    SISTEMA,
      fechaModificacion:ts(a.fechaAsamblea),
      cooperativaId,
    });
  }
  ok(`Asambleas: ${ASAMBLEAS_DEF.length}`);
}

async function crearDocumentos(db, cooperativaId) {
  const col = db.collection('cooperativas').doc(cooperativaId).collection('documentos');

  for (const d of DOCUMENTOS_DEF) {
    await col.add({
      nombre:      d.nombre,
      categoria:   d.categoria,
      descripcion: d.desc,
      storagePath: `demo/${cooperativaId}/${d.nombre.toLowerCase().replace(/\s+/g,'-')}.pdf`,
      url:         `https://storage.googleapis.com/coopdigital-demo/${cooperativaId}/${d.nombre.toLowerCase().replace(/\s+/g,'-')}.pdf`,
      fechaCarga:  ts(d.fecha),
      visible:     d.visible,
      creadoPor:   SISTEMA,
      fechaCreacion: ts(d.fecha),
      modificadoPor: SISTEMA,
      fechaModificacion: ts(d.fecha),
      cooperativaId,
    });
  }
  ok(`Documentos: ${DOCUMENTOS_DEF.length}`);
}

async function crearVencimientos(db, cooperativaId) {
  const col = db.collection('cooperativas').doc(cooperativaId).collection('vencimientos');

  for (const v of VENCIMIENTOS_DEF) {
    await col.add({
      descripcion:     v.desc,
      organismoId:     v.org,
      fechaVencimiento:ts(v.fecha),
      estado:          v.estado,
      observaciones:   v.obs,
      creadoPor:       SISTEMA,
      fechaCreacion:   ts('2024-10-01'),
      modificadoPor:   SISTEMA,
      fechaModificacion: ts('2024-10-01'),
      cooperativaId,
    });
  }
  ok(`Vencimientos: ${VENCIMIENTOS_DEF.length}`);
}

async function crearMovimientos(db, cooperativaId) {
  const col = db.collection('cooperativas').doc(cooperativaId).collection('movimientos');

  for (const m of MOVIMIENTOS_DEF) {
    await col.add({
      tipo:        m.tipo,
      categoria:   m.cat,
      monto:       m.monto,
      fecha:       ts(m.fecha),
      descripcion: m.desc,
      medioPago:   m.medio,
      creadoPor:   SISTEMA,
      fechaCreacion: ts(m.fecha),
      modificadoPor: SISTEMA,
      fechaModificacion: ts(m.fecha),
      cooperativaId,
    });
  }
  ok(`Movimientos contables: ${MOVIMIENTOS_DEF.length}`);
}

async function crearEventos(db, cooperativaId) {
  const col = db.collection('cooperativas').doc(cooperativaId).collection('eventos');

  for (const e of EVENTOS_DEF) {
    await col.add({
      tipo:         e.tipo,
      descripcion:  e.desc,
      usuarioId:    SISTEMA,
      fecha:        ts(e.fecha),
      metadata:     {},
      cooperativaId,
    });
  }
  ok(`Eventos de auditoría: ${EVENTOS_DEF.length}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Reset opcional (borrar datos existentes de la cooperativa)
// ─────────────────────────────────────────────────────────────────────────────

async function resetCooperativa(db, cooperativaId) {
  const SUBCOLECCIONES = [
    'usuarios','asociados','consejoAdministracion','sindicatura',
    'asambleas','actas','documentos','vencimientos','movimientos','eventos'
  ];
  for (const sub of SUBCOLECCIONES) {
    const snap = await db.collection('cooperativas').doc(cooperativaId).collection(sub).get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    if (!snap.empty) await batch.commit();
    warn(`Reset: ${sub} (${snap.size} documentos borrados)`);
  }
  await db.collection('cooperativas').doc(cooperativaId).delete();
  warn('Documento cooperativa borrado.');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const credPath = args.credentials || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) {
    console.error('❌ Necesitás --credentials <ruta-al-service-account.json>');
    process.exitCode = 1;
    return;
  }

  const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
  const auth = getAuth();
  const db   = getFirestore();

  // ID de la cooperativa: fijo para demo (podés pasarlo con --id)
  const COOP_ID = args.id || 'cooperativa-demo';

  log(`\n🚀 Seed CoopDigital — Cooperativa Demo`);
  log(`   cooperativaId : ${COOP_ID}`);
  log(`   reset         : ${args.reset ? 'SÍ' : 'no'}\n`);

  if (args.reset) {
    log('⚠️  Borrando datos existentes...');
    await resetCooperativa(db, COOP_ID);
    log('');
  }

  log('📦 Creando datos...\n');

  await crearCooperativa(db, COOP_ID);
  const usuarios   = await crearUsuarios(auth, db, COOP_ID);
  const mapaAsoc   = await crearAsociados(db, COOP_ID);
  await crearConsejo(db, COOP_ID, mapaAsoc);
  await crearSindicatura(db, COOP_ID, mapaAsoc);
  const mapaActas  = await crearActas(db, COOP_ID);
  await crearAsambleas(db, COOP_ID, mapaActas);
  await crearDocumentos(db, COOP_ID);
  await crearVencimientos(db, COOP_ID);
  await crearMovimientos(db, COOP_ID);
  await crearEventos(db, COOP_ID);

  log('\n✅ Seed completo.\n');
  log('─────────────────────────────────────────────────');
  log('USUARIOS DE ACCESO (todos con password: Demo2025!)');
  log('─────────────────────────────────────────────────');
  for (const u of USUARIOS_DEF) {
    log(`  [${u.rol.padEnd(10)}]  ${u.email}`);
  }
  log('─────────────────────────────────────────────────\n');
}

main().catch(err => {
  console.error('\n❌ Error:', err.message, '\n');
  process.exitCode = 1;
});

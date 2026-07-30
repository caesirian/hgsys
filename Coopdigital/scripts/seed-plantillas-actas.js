#!/usr/bin/env node
/**
 * seed-plantillas-actas.js
 * Carga plantillas modelo de actas en una cooperativa de CoopDigital.
 *
 * Uso:
 *   node seed-plantillas-actas.js \
 *     --credentials ./serviceAccount.json \
 *     --cooperativaId <id-de-la-cooperativa>
 *
 * Si no sabés el cooperativaId, lo encontrás en Firestore Console
 * bajo la colección "cooperativas".
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

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

const args = parseArgs(process.argv.slice(2));
if (!args.credentials) { console.error('Falta --credentials'); process.exit(1); }
if (!args.cooperativaId) { console.error('Falta --cooperativaId'); process.exit(1); }

const app = initializeApp({ credential: cert(JSON.parse(readFileSync(args.credentials, 'utf8'))) });
const db = getFirestore(app);
const coopRef = db.collection('cooperativas').doc(args.cooperativaId);
const ahora = FieldValue.serverTimestamp();

const PLANTILLAS = [
  {
    nombre: 'Acta de Reunión de Consejo de Administración',
    tipo: 'Acta',
    activa: true,
    descripcion: 'Plantilla estándar para actas del Consejo de Administración.',
    contenido: `ACTA N° {{numeroActa}} — REUNIÓN DE {{tipoActa}}
{{cooperativa}}
Matrícula INAES N° {{matricula}} — CUIT {{cuit}}
{{domicilio}}

En la Ciudad Autónoma de Buenos Aires, a los {{fecha}}, siendo las _____ horas, se reúne el Consejo de Administración de {{cooperativa}}.

ORDEN DEL DÍA:

{{contenido}}

Sin más temas a tratar, se da por finalizada la reunión siendo las _____ horas, firmando los presentes al pie en señal de conformidad.

___________________________          ___________________________
PRESIDENTE                            SECRETARIO

___________________________          ___________________________
TESORERO                              VOCAL TITULAR

___________________________
SÍNDICO TITULAR`
  },
  {
    nombre: 'Acta de Asamblea Ordinaria',
    tipo: 'Acta',
    activa: true,
    descripcion: 'Plantilla para actas de Asamblea General Ordinaria (art. 47 Ley 20.337).',
    contenido: `ACTA N° {{numeroActa}} — {{tipoActa}}
{{cooperativa}}
Matrícula INAES N° {{matricula}} — CUIT {{cuit}}
{{domicilio}}

En la Ciudad Autónoma de Buenos Aires, a los {{fecha}}, siendo las _____ horas, se realiza la {{tipoActa}} de {{cooperativa}}, previa convocatoria efectuada conforme lo dispuesto por el artículo 47 de la Ley 20.337.

ASOCIADOS PRESENTES: _____ sobre un total de _____ asociados con derecho a voto.
Se verifica quórum suficiente para sesionar.

COMISIÓN DIRECTIVA DE LA ASAMBLEA:
Presidente de asamblea: _____________________________
Secretario de asamblea: _____________________________

ORDEN DEL DÍA:

{{contenido}}

Agotados los temas del orden del día, se da por finalizada la asamblea siendo las _____ horas, firmando los presentes al pie.

___________________________          ___________________________
PRESIDENTE DE ASAMBLEA                SECRETARIO DE ASAMBLEA

___________________________
SÍNDICO TITULAR`
  },
  {
    nombre: 'Acta de Asamblea Extraordinaria',
    tipo: 'Acta',
    activa: true,
    descripcion: 'Plantilla para actas de Asamblea General Extraordinaria.',
    contenido: `ACTA N° {{numeroActa}} — {{tipoActa}}
{{cooperativa}}
Matrícula INAES N° {{matricula}} — CUIT {{cuit}}
{{domicilio}}

En la Ciudad Autónoma de Buenos Aires, a los {{fecha}}, siendo las _____ horas, se realiza la {{tipoActa}} de {{cooperativa}}, convocada para tratar los siguientes puntos de carácter urgente.

ASOCIADOS PRESENTES: _____ sobre un total de _____ asociados con derecho a voto.
Se verifica quórum suficiente para sesionar.

COMISIÓN DIRECTIVA DE LA ASAMBLEA:
Presidente de asamblea: _____________________________
Secretario de asamblea: _____________________________

PUNTOS A TRATAR:

{{contenido}}

Sin más temas a tratar, se da por finalizada la asamblea siendo las _____ horas.

___________________________          ___________________________
PRESIDENTE DE ASAMBLEA                SECRETARIO DE ASAMBLEA

___________________________
SÍNDICO TITULAR`
  },
  {
    nombre: 'Acta de Comisión Interna',
    tipo: 'Acta',
    activa: true,
    descripcion: 'Plantilla para actas de reunión de comisión interna o comité.',
    contenido: `ACTA N° {{numeroActa}} — REUNIÓN DE COMISIÓN INTERNA
{{cooperativa}}
Matrícula INAES N° {{matricula}}

Fecha: {{fecha}}
Lugar: {{domicilio}}

PRESENTES:
_____________________________________________________________

TEMAS TRATADOS:

{{contenido}}

RESOLUCIONES ADOPTADAS:
_____________________________________________________________

Sin más temas, se firma la presente al pie siendo las _____ horas.

___________________________          ___________________________
COORDINADOR                           SECRETARIO DE ACTAS`
  }
];

async function main() {
  console.log(`Cargando ${PLANTILLAS.length} plantillas en cooperativa ${args.cooperativaId}...`);
  const col = coopRef.collection('plantillas');
  for (const p of PLANTILLAS) {
    const ref = await col.add({
      ...p,
      creadoPor: 'script-seed-plantillas',
      fechaCreacion: ahora,
      modificadoPor: 'script-seed-plantillas',
      fechaModificacion: ahora
    });
    console.log(`  OK: "${p.nombre}" → ${ref.id}`);
  }
  console.log('Listo.');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });

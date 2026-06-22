#!/usr/bin/env node
// Onboarding de una cooperativa nueva en CoopDigital.
//
// Por qué este script existe (y no se puede hacer desde la app web):
// usuariosIndex/{uid} es la pieza central del modelo multi-tenant sin
// Custom Claims (ver firestore.rules), y las reglas la bloquean por
// completo desde el cliente: `allow list, write: if false`. La única
// forma de crear esa entrada es con Admin SDK, que bypassa las reglas.
// Este script hace eso, y de paso crea todo lo demás que necesita un
// cliente nuevo para poder loguearse el día uno.
//
// Uso:
//   node onboarding-cooperativa.js --nombre "Coop Ejemplo" --matricula "12345" \
//     --cuit "30-12345678-9" --email "admin@coopejemplo.com.ar"
//
// Requiere GOOGLE_APPLICATION_CREDENTIALS apuntando al JSON de la
// service account (Firebase Console → Project Settings → Service
// Accounts → Generate new private key), o --credentials <path>.
//
// Qué crea, en este orden:
//   1. Usuario en Firebase Auth (password temporal random).
//   2. cooperativas/{id}
//   3. cooperativas/{id}/usuarios/{uid}   (rol: admin, activo: true)
//   4. usuariosIndex/{uid} -> { cooperativaId: id }
//
// Si algo falla después del paso 1, el usuario de Auth ya existe pero
// puede quedar sin cooperativa asociada. El script NUNCA borra el
// usuario de Auth automáticamente (podría borrar algo que el operador
// ya estaba usando si corrió el script dos veces por error); en su
// lugar, imprime instrucciones claras de qué faltó y cómo limpiarlo a
// mano si corresponde.

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

// ---------------------------------------------------------------------
// Validación de inputs (mismo criterio que los validators del frontend:
// fail fast, mensajes claros en español).
// ---------------------------------------------------------------------

function escapeText(value) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
}

function normalizeEmail(value) {
  return escapeText(value).toLowerCase();
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const value = argv[i + 1];
      out[key] = value;
      i++;
    }
  }
  return out;
}

function validarInputs({ nombre, matricula, cuit, email }) {
  const x = {
    nombre: escapeText(nombre),
    matricula: escapeText(matricula),
    cuit: escapeText(cuit),
    email: normalizeEmail(email)
  };
  if (!x.nombre) throw new Error('Falta --nombre (razón social de la cooperativa).');
  if (!x.matricula) throw new Error('Falta --matricula (matrícula INAES).');
  if (!/^\d{2}-\d{8}-\d{1}$/.test(x.cuit)) {
    throw new Error('El CUIT debe tener formato NN-NNNNNNNN-N (ej: 30-12345678-9). Recibido: ' + (cuit || '(vacío)'));
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email)) {
    throw new Error('El email del admin no es válido. Recibido: ' + (email || '(vacío)'));
  }
  return x;
}

// Password temporal: 16 bytes random en base64url, sin caracteres
// ambiguos para que se pueda copiar a mano sin errores de transcripción.
function generarPasswordTemporal() {
  return randomBytes(16).toString('base64url');
}

// ---------------------------------------------------------------------
// Inicialización de Admin SDK
// ---------------------------------------------------------------------

function inicializarAdmin(credentialsPath) {
  const path = credentialsPath || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!path) {
    throw new Error(
      'No se encontró credencial. Pasá --credentials <ruta-al-json> o seteá ' +
      'GOOGLE_APPLICATION_CREDENTIALS con la ruta al JSON de la service account ' +
      '(Firebase Console → Project Settings → Service Accounts → Generate new private key).'
    );
  }
  const serviceAccount = JSON.parse(readFileSync(path, 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
}

// ---------------------------------------------------------------------
// Lógica principal
// ---------------------------------------------------------------------

async function onboardingCooperativa({ nombre, matricula, cuit, email }) {
  const auth = getAuth();
  const db = getFirestore();

  // Paso 0: evitar duplicados por matrícula antes de crear nada.
  const existentes = await db.collection('cooperativas').where('matricula', '==', matricula).limit(1).get();
  if (!existentes.empty) {
    throw new Error(`Ya existe una cooperativa con matrícula ${matricula} (id: ${existentes.docs[0].id}). Abortado, no se creó nada.`);
  }

  const passwordTemporal = generarPasswordTemporal();
  let uid = null;

  // Paso 1: usuario en Firebase Auth.
  try {
    const userRecord = await auth.createUser({
      email,
      password: passwordTemporal,
      emailVerified: false
    });
    uid = userRecord.uid;
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      throw new Error(`Ya existe un usuario de Auth con el email ${email}. Si es intencional (re-onboarding), borrá ese usuario primero o usá otro email.`);
    }
    throw err;
  }

  // A partir de acá, si algo falla, el usuario de Auth YA EXISTE.
  // Lo dejamos así (no se borra automáticamente) y avisamos bien claro.
  try {
    const cooperativaRef = db.collection('cooperativas').doc();
    const cooperativaId = cooperativaRef.id;
    const ahora = FieldValue.serverTimestamp();

    // Paso 2: documento de la cooperativa.
    await cooperativaRef.set({
      nombre,
      matricula,
      cuit,
      email,
      telefono: '',
      domicilio: '',
      localidad: '',
      provincia: '',
      codigoPostal: '',
      sitioWeb: '',
      logoUrl: '',
      colorPrincipal: '',
      plan: 'free',
      activa: true,
      federacionId: null,
      fechaAlta: ahora,
      creadoPor: 'script-onboarding',
      fechaCreacion: ahora,
      modificadoPor: 'script-onboarding',
      fechaModificacion: ahora
    });

    // Paso 3: perfil del admin dentro de la cooperativa.
    await cooperativaRef.collection('usuarios').doc(uid).set({
      uid,
      nombre: '',
      apellido: '',
      email,
      telefono: '',
      rol: 'admin',
      activo: true,
      ultimoAcceso: null,
      fechaInvitacion: ahora,
      fechaAlta: ahora,
      creadoPor: 'script-onboarding',
      fechaCreacion: ahora,
      modificadoPor: 'script-onboarding',
      fechaModificacion: ahora
    });

    // Paso 4: el índice global. Esto es lo que las reglas bloquean
    // desde el cliente; acá lo escribimos vía Admin SDK.
    await db.collection('usuariosIndex').doc(uid).set({ cooperativaId });

    return { uid, cooperativaId, email, passwordTemporal };
  } catch (err) {
    throw new Error(
      `Se creó el usuario de Auth (uid: ${uid}, email: ${email}) pero falló un paso posterior: ${err.message}\n` +
      `Revisá manualmente qué quedó a medio crear en Firestore (cooperativas / usuariosIndex) ` +
      `antes de reintentar. Si vas a reintentar con el mismo email, primero borrá el usuario de Auth ` +
      `desde la consola de Firebase (uid: ${uid}).`
    );
  }
}

// ---------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputs = validarInputs(args);
  inicializarAdmin(args.credentials);

  console.log(`Creando cooperativa "${inputs.nombre}" (matrícula ${inputs.matricula})...`);
  const resultado = await onboardingCooperativa(inputs);

  console.log('\n✅ Onboarding completado.\n');
  console.log(`  cooperativaId : ${resultado.cooperativaId}`);
  console.log(`  uid admin     : ${resultado.uid}`);
  console.log(`  email admin   : ${resultado.email}`);
  console.log(`  password temp : ${resultado.passwordTemporal}`);
  console.log('\n⚠️  La password temporal solo se muestra ahora. Compartila por un canal');
  console.log('   seguro con el admin de la cooperativa y pedile que la cambie en su');
  console.log('   primer login. No queda guardada en ningún lado.\n');
}

main().catch(err => {
  console.error('\n❌ Error:', err.message, '\n');
  process.exitCode = 1;
});

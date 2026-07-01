import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from '@simplewebauthn/server';
import { db, admin } from '../lib/firebase-admin.js';
import { firebaseAuth } from '../middleware/firebase-auth.js';
import { rpName, rpID, origin } from '../lib/webauthn-config.js';

export const router = Router();

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function challengeExpirado(doc) {
  return Date.now() - new Date(doc.creadoEn).getTime() > CHALLENGE_TTL_MS;
}

// ---------------------------------------------------------------------
// Registro de una passkey en este dispositivo (requiere sesión activa:
// el usuario ya entró por email/contraseña y quiere sumar biometría).
// ---------------------------------------------------------------------

router.post('/register-options', firebaseAuth, async (req, res) => {
  try {
    const existentes = await db.collection('webauthnCredentials')
      .where('uid', '==', req.uid)
      .get();
    const excludeCredentials = existentes.docs.map(d => ({
      id: d.id,
      transports: d.data().transports || []
    }));

    const decoded = await admin.auth().getUser(req.uid);

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: decoded.email || req.uid,
      userID: new TextEncoder().encode(req.uid),
      userDisplayName: decoded.email || 'Usuario CoopDigital',
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform'
      }
    });

    await db.collection('webauthnChallenges').doc(req.uid).set({
      tipo: 'register',
      uid: req.uid,
      challenge: options.challenge,
      creadoEn: new Date().toISOString()
    });

    res.json(options);
  } catch (err) {
    console.error('Error generando opciones de registro WebAuthn:', err);
    res.status(500).json({ error: 'No se pudo iniciar el registro de la passkey.' });
  }
});

router.post('/register-verify', firebaseAuth, async (req, res) => {
  try {
    const { response, deviceName } = req.body;

    const challengeDoc = await db.collection('webauthnChallenges').doc(req.uid).get();
    if (!challengeDoc.exists || challengeDoc.data().tipo !== 'register' || challengeExpirado(challengeDoc.data())) {
      return res.status(400).json({ error: 'El registro expiró, iniciá de nuevo.' });
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeDoc.data().challenge,
      expectedOrigin: origin,
      expectedRPID: rpID
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'No se pudo verificar la passkey.' });
    }

    const { credential } = verification.registrationInfo;
    const usuariosIndexDoc = await db.collection('usuariosIndex').doc(req.uid).get();

    await db.collection('webauthnCredentials').doc(credential.id).set({
      uid: req.uid,
      cooperativaId: usuariosIndexDoc.exists ? usuariosIndexDoc.data().cooperativaId : null,
      publicKey: Buffer.from(credential.publicKey).toString('base64'),
      counter: credential.counter,
      deviceName: deviceName || 'Dispositivo sin nombre',
      transports: credential.transports || [],
      creadoEn: new Date().toISOString()
    });

    await db.collection('webauthnChallenges').doc(req.uid).delete();

    res.json({ verified: true });
  } catch (err) {
    console.error('Error verificando registro WebAuthn:', err);
    res.status(500).json({ error: 'No se pudo completar el registro de la passkey.' });
  }
});

// ---------------------------------------------------------------------
// Login passwordless con la passkey ya registrada. Sin auth previa (es
// justamente el mecanismo para entrar sin contraseña) — "discoverable
// credential": no se manda allowCredentials, el navegador ofrece
// cualquier passkey guardada para este rpID.
// ---------------------------------------------------------------------

router.post('/login-options', async (req, res) => {
  try {
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred'
    });

    const sessionId = randomUUID();
    await db.collection('webauthnChallenges').doc(sessionId).set({
      tipo: 'login',
      challenge: options.challenge,
      creadoEn: new Date().toISOString()
    });

    res.json({ sessionId, options });
  } catch (err) {
    console.error('Error generando opciones de login WebAuthn:', err);
    res.status(500).json({ error: 'No se pudo iniciar el login biométrico.' });
  }
});

router.post('/login-verify', async (req, res) => {
  try {
    const { sessionId, response } = req.body;
    if (!sessionId || !response) {
      return res.status(400).json({ error: 'Falta sessionId o response.' });
    }

    const challengeDoc = await db.collection('webauthnChallenges').doc(sessionId).get();
    if (!challengeDoc.exists || challengeDoc.data().tipo !== 'login' || challengeExpirado(challengeDoc.data())) {
      return res.status(400).json({ error: 'La sesión de login biométrico expiró, intentá de nuevo.' });
    }

    const credDoc = await db.collection('webauthnCredentials').doc(response.id).get();
    if (!credDoc.exists) {
      return res.status(401).json({ error: 'Esta passkey no está registrada.' });
    }
    const credData = credDoc.data();

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeDoc.data().challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credDoc.id,
        publicKey: new Uint8Array(Buffer.from(credData.publicKey, 'base64')),
        counter: credData.counter,
        transports: credData.transports || []
      }
    });

    if (!verification.verified) {
      return res.status(401).json({ error: 'No se pudo verificar la passkey.' });
    }

    await db.collection('webauthnCredentials').doc(credDoc.id).update({
      counter: verification.authenticationInfo.newCounter
    });
    await db.collection('webauthnChallenges').doc(sessionId).delete();

    const customToken = await admin.auth().createCustomToken(credData.uid);
    res.json({ customToken });
  } catch (err) {
    console.error('Error verificando login WebAuthn:', err);
    res.status(500).json({ error: 'No se pudo completar el login biométrico.' });
  }
});

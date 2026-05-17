/**
 * ReprocannEngine
 * Reglas de negocio REPROCANN para vigencia de certificados y consentimiento bilateral.
 */

const CERTIFICATE_VALIDITY_BY_PROFILE = Object.freeze({
  autocultivador: 3,
  ong: 1,
  tercero: 1,
});

const MEDICAL_SIGNATURE_ACCEPTED_TYPES = Object.freeze([
  "firma_digital_cualificada",
  "firma_digital_remota",
  "firma_digital_token",
]);

function sanitizeString(value) {
  return String(value ?? "")
    .replace(/[&<>"']/g, (char) => {
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return map[char] || char;
    })
    .trim();
}

function normalizeProfile(profile) {
  return sanitizeString(profile).toLowerCase();
}

function calculateExpiryDate(issueDate, profile) {
  const normalizedProfile = normalizeProfile(profile);
  const years = CERTIFICATE_VALIDITY_BY_PROFILE[normalizedProfile];

  if (!years) throw new Error("Perfil de certificado inválido.");

  const date = new Date(issueDate);
  if (Number.isNaN(date.getTime())) throw new Error("Fecha de emisión inválida.");

  const expiryDate = new Date(date);
  expiryDate.setFullYear(expiryDate.getFullYear() + years);
  return expiryDate;
}

function validateCertificate({ profile, issueDate, now = new Date() }) {
  const normalizedProfile = normalizeProfile(profile);
  const expiryDate = calculateExpiryDate(issueDate, normalizedProfile);
  const currentDate = new Date(now);

  if (Number.isNaN(currentDate.getTime())) throw new Error("Fecha de validación inválida.");

  return {
    profile: normalizedProfile,
    issueDate: new Date(issueDate),
    expiryDate,
    isValid: currentDate <= expiryDate,
    validityYears: CERTIFICATE_VALIDITY_BY_PROFILE[normalizedProfile],
  };
}

function validateBilateralConsent(consent) {
  const payload = consent || {};
  const patientAccepted = Boolean(payload.patientAccepted);
  const caregiverAccepted = Boolean(payload.caregiverAccepted);
  const informedText = sanitizeString(payload.informedText);
  const medicalDigitalSignature = sanitizeString(payload.medicalDigitalSignature);
  const medicalSignatureType = sanitizeString(payload.medicalSignatureType).toLowerCase();

  const errors = [];
  if (!patientAccepted || !caregiverAccepted) {
    errors.push("El consentimiento informado bilateral es obligatorio para ambas partes.");
  }
  if (!informedText) {
    errors.push("Debe incluirse el texto del consentimiento informado.");
  }
  if (!medicalDigitalSignature || !MEDICAL_SIGNATURE_ACCEPTED_TYPES.includes(medicalSignatureType)) {
    errors.push("La firma digital médica es obligatoria y debe cumplir normativa argentina.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedConsent: {
      patientAccepted,
      caregiverAccepted,
      informedText,
      medicalDigitalSignature,
      medicalSignatureType,
    },
  };
}

function validateRegistration(payload) {
  const safePayload = payload || {};
  const certificateValidation = validateCertificate({
    profile: safePayload.profile,
    issueDate: safePayload.issueDate,
    now: safePayload.now,
  });
  const consentValidation = validateBilateralConsent(safePayload.bilateralConsent);

  return {
    isValid: certificateValidation.isValid && consentValidation.isValid,
    certificateValidation,
    consentValidation,
  };
}

const ReprocannEngine = {
  CERTIFICATE_VALIDITY_BY_PROFILE,
  MEDICAL_SIGNATURE_ACCEPTED_TYPES,
  sanitizeString,
  calculateExpiryDate,
  validateCertificate,
  validateBilateralConsent,
  validateRegistration,
};

if (typeof module !== "undefined" && module.exports) module.exports = ReprocannEngine;
if (typeof window !== "undefined") window.ReprocannEngine = ReprocannEngine;

// POST /api/forms/referral: REINTENTA el correo de respaldo de una inscripción que Wellezy Hub ya confirmó (no registra inscripciones nuevas ni sustituye a Hub). NO es el PRP de pacientes. Ver server/utils/referral.ts.
export default defineEventHandler(event => handleReferral(event))

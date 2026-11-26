// Comprobación PREVIA al despliegue de las variables del CRM («Pide tu cita»). Sin ellas la valoración responde 503 y no registra a nadie.
// Uso: npm run check:deploy   (o con archivo: node --env-file=<archivo> scripts/check-crm-env.mjs). Solo lee el entorno: no hace ninguna petición.
// Nunca imprime valores, solo nombres de variables y el motivo.
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const CRM_PRODUCTION_URL = 'https://pdtclientsolutions.com/crm-public/api/clients/forms'
export const CRM_LINE_ID = '30'
// Con valor por defecto en nuxt.config.ts: se pueden omitir, pero si se definen deben ser los de Crediestética.
const OPTIONAL_FIXED = { NUXT_CRM_FORM_LINE_ID: CRM_LINE_ID, NUXT_CRM_FORM_CITY_ID: '3', NUXT_CRM_FORM_CLINIC_ID: '6', NUXT_CRM_FORM_ADVISOR_EMAIL: 'convenioscrediestetica@gmail.com' }

const ID_RE = /^[1-9]\d{0,9}$/

/** Lista de problemas (vacía = se puede desplegar). */
export function crmEnvProblems(env) {
  const value = name => (typeof env[name] === 'string' ? env[name].trim() : undefined)
  const problems = []
  const url = value('NUXT_CRM_FORM_URL')
  if (!url) problems.push('NUXT_CRM_FORM_URL: falta')
  else if (url !== CRM_PRODUCTION_URL) problems.push(`NUXT_CRM_FORM_URL: debe ser ${CRM_PRODUCTION_URL}`)
  for (const name of ['NUXT_CRM_FORM_USER_ID', 'NUXT_CRM_FORM_ADVISOR_ID']) {
    if (!value(name)) problems.push(`${name}: falta`)
    else if (!ID_RE.test(value(name))) problems.push(`${name}: debe ser un entero positivo`)
  }
  // Línea, ciudad, clínica y correo de la asesora.
  for (const [name, expected] of Object.entries(OPTIONAL_FIXED)) {
    const current = value(name)
    if (current !== undefined && current !== expected) problems.push(`${name}: omitirla o usar ${expected}`)
  }
  return problems
}

/** Escribe el resultado y devuelve true si la configuración está completa. */
export function reportCrmEnv(env) {
  const problems = crmEnvProblems(env)
  if (!problems.length) { console.log('[deploy-check] Configuración del CRM completa.'); return true }
  console.error(['[deploy-check] No se puede desplegar: configuración del CRM incompleta.', ...problems.map(p => `  - ${p}`)].join('\n'))
  return false
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url) && !reportCrmEnv(process.env)) process.exitCode = 1

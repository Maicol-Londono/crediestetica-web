// Comprobación PREVIA al despliegue de las variables del CRM («Pide tu cita»). Sin ellas la valoración responde 503 y no registra a nadie.
// Uso: npm run check:deploy   (o con archivo: node --env-file=<archivo> scripts/check-crm-env.mjs). Solo lee el entorno: no hace ninguna petición.
// Nunca imprime valores, solo nombres de variables y el motivo.
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const CRM_PRODUCTION_URL = 'https://pdtclientsolutions.com/crm-public/api/clients/forms'
export const CRM_LINE_ID = '30'

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
  // La línea tiene valor por defecto (30): puede omitirse, pero si se define debe ser la de Crediestética.
  const line = value('NUXT_CRM_FORM_LINE_ID')
  if (line !== undefined && line !== CRM_LINE_ID) problems.push(`NUXT_CRM_FORM_LINE_ID: omitirla o usar ${CRM_LINE_ID}`)
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

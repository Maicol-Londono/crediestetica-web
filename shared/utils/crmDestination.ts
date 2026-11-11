// Protección de los destinos de CRM (valoración y PRP). Módulo PURO (sin imports): lo usan el servidor Nitro, el navegador y las pruebas.
//
// Esta web se clonó de Planmed y hereda las URLs de SU CRM compartido. Hasta que se defina y verifique el CRM propio de Crediestética,
// ningún envío de VALORACIÓN puede salir hacia ese endpoint heredado ni hacia un destino ausente o inválido. No se inventa ninguna URL alternativa.
//
// PRP: el endpoint `forms-px-prp` del CRM es COMPARTIDO entre Planmed y Crediestética (confirmado por el negocio: la URL es la misma),
// por lo que ya no se considera heredado y no se bloquea. Sigue bloqueado si está ausente o es inválido.

/** Endpoints del CRM de Planmed heredados en el clon (host + ruta, en minúsculas y sin barra final). */
export const LEGACY_CRM_ENDPOINTS: readonly string[] = [
  'pdtclientsolutions.com/crm-public/api/clients/forms'
]

export type CrmDestinationProblem = 'not_configured' | 'invalid' | 'legacy'

export const MSG_CRM_UNAVAILABLE = 'Este servicio no está disponible temporalmente. Inténtalo de nuevo más tarde.'

/** `null` = destino utilizable. Cualquier otro valor = el envío debe bloquearse. */
export function crmDestinationProblem(input: unknown): CrmDestinationProblem | null {
  const raw = typeof input === 'string' ? input.trim() : ''
  if (!raw) return 'not_configured'
  let url: URL
  try { url = new URL(raw) } catch { return 'invalid' }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]' || url.hostname.endsWith('.localhost') || url.hostname.endsWith('.test')
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return 'invalid'
  if (url.username || url.password) return 'invalid'
  const key = `${url.hostname}${url.pathname.replace(/\/+$/, '')}`.toLowerCase()
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const legacy = LEGACY_CRM_ENDPOINTS.some(e => key === e || `${host}${url.pathname.replace(/\/+$/, '')}`.toLowerCase() === e)
  return legacy ? 'legacy' : null
}

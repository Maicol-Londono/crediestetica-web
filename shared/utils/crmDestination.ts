// Protección del destino de CRM que usa el navegador (PRP). Módulo PURO (sin imports): lo usan el servidor Nitro, el navegador y las pruebas.
//
// El CRM es compartido entre las marcas: ningún endpoint se bloquea por su dirección, solo se rechaza un destino ausente o inválido. No se inventa
// ninguna URL alternativa. La VALORACIÓN valida su propio destino en el servidor (server/utils/crmClient.ts).

export type CrmDestinationProblem = 'not_configured' | 'invalid'

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
  return null
}

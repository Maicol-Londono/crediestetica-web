import type { H3Event } from 'h3'
import { PRP_SLUG_RE } from '#shared/utils/prpEnrollment'

// Referidor de una inscripción al PRP. Solo servidor.
//  · El `external_code` NUNCA viene del navegador: el navegador solo indica el slug del micrositio (`prp_slug`) y aquí se resuelve contra Wellezy Hub
//    (GET /v1/web/prp/{slug}, que solo entrega referidores ACTIVOS del tenant de la configuración del servidor). El código sale de esa respuesta.
//  · Sin referidor válido no hay inscripción: no existe fallback a otro referidor, a un código por defecto, ni se deriva del slug o del nombre.
//  · Si Hub no responde, la inscripción se rechaza como reintentable (no se adivina ni se omite el referidor).

const MSG_NOT_FOUND = 'El enlace de tu referidor no es válido o ya no está activo.'
const MSG_UNAVAILABLE = 'No pudimos registrar tu inscripción en este momento. Inténtalo de nuevo en unos minutos.'
const MSG_REQUIRED = 'La inscripción debe hacerse desde la página de tu referidor.'

function reject(statusCode: number, message: string, data: Record<string, unknown>): never {
  throw createError({ statusCode, message, data: { message, ...data } })
}

/** Código de referidor tal como lo entrega Hub: una sola palabra de hasta 50 caracteres (mismo formato que valida Hub). */
const CODE_RE = /^\S{1,50}$/

/** Devuelve el `external_code` del referidor ACTIVO del micrositio `slug`, o lanza el error HTTP que corresponda (422 sin slug, 404 inexistente/inactivo, 503 Hub). */
export async function resolvePrpExternalCode(event: H3Event, slug: string): Promise<string> {
  if (!slug || slug.length > 255 || !PRP_SLUG_RE.test(slug)) reject(422, MSG_REQUIRED, { reason: 'referrer_required' })

  const res = await wellezyPublicGet<any>(event, `/v1/web/prp/${slug}`)

  if (res.status === 404) {
    // Un tenant mal configurado también responde 404: se deja rastro para no confundirlo con «referidor inexistente».
    if (String(res.data?.message ?? '').includes('Tenant')) console.error('[prp-enrollment] Hub no resolvió el tenant (revisa NUXT_WELLEZY_LINE_SLUG).')
    reject(404, MSG_NOT_FOUND, { reason: 'referrer_not_found' })
  }

  const code = res.data?.data?.external_code
  if (res.status !== 200 || typeof code !== 'string' || !CODE_RE.test(code)) {
    console.error(`[prp-enrollment] no se pudo resolver el referidor (Hub respondió ${res.status || 'sin conexión'})`)
    reject(503, MSG_UNAVAILABLE, { reason: 'hub_unavailable', retryable: true })
  }
  return code
}

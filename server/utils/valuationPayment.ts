import type { H3Event } from 'h3'
import { createHash, createHmac, randomBytes } from 'node:crypto'
import { normalizeValuationPay, validateValuationPay } from '#shared/utils/valuationPay'
import { formFail, isRateLimited } from './formMail'

// Pago en línea de la valoración (Wompi vía Wellezy Hub). Solo servidor: el navegador NUNCA habla con el Hub ni ve el secreto de la integración.
//  · /api/forms/valuation-payment/checkout: valida los datos básicos y le pide al Hub el checkout (el Hub registra al paciente, crea la valoración con el
//    precio de la línea —el navegador no puede fijar importe— y devuelve solo los datos públicos del widget de Wompi).
//  · /api/forms/valuation-payment/confirm: SOLO consulta el resultado del pago (el Hub verifica con Wompi usando la llave privada) para mostrarlo: pendiente, aprobado
//    o rechazado, y el nombre para el mensaje de éxito. NO envía correos ni registra al cliente en el CRM: tras la aprobación esas acciones las ejecuta el Hub por su
//    cuenta (webhook de Wompi + cola), aunque el paciente cierre el navegador. La redirección del navegador no aprueba nada.
// Autenticación con el Hub: firma HMAC por integración (NUXT_HUB_INTEGRATION_KEY_ID / NUXT_HUB_INTEGRATION_SECRET), ver docs del Hub (pagos §3).

const TAG = 'valuation-pay'
const CHECKOUT_FORM = 'valuation-pay-checkout'
const CONFIRM_FORM = 'valuation-pay-confirm'
const ATTEMPT_RE = /^[A-Za-z0-9-]{16,64}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TX_RE = /^[A-Za-z0-9._-]{1,100}$/

export const MSG_PAY_UNAVAILABLE = 'El pago en línea no está disponible en este momento. Escríbenos por WhatsApp y una asesora te ayudará.'
const MSG_PAY_VERIFY = 'No pudimos verificar tu pago en este momento. Si ya pagaste, no vuelvas a pagar: una asesora te contactará.'

interface HubConfig { base: string, keyId: string, secret: string }

function hubConfig(runtime: Record<string, any>): HubConfig | null {
  const base = String(runtime.wellezyApiBaseUrl || '').replace(/\/+$/, '')
  const keyId = String(runtime.hubIntegrationKeyId || '').trim()
  const secret = String(runtime.hubIntegrationSecret || '')
  return base && keyId && secret ? { base, keyId, secret } : null
}

interface HubResult<T = any> { status: number, data?: T }

/** POST firmado al Hub. `path` es relativo a `/integrations/v1`. La firma cubre método, ruta, hora, nonce y huella del cuerpo exacto que se envía. */
export async function hubSignedPost<T = any>(hub: HubConfig, path: string, body: Record<string, unknown>, idempotencyKey?: string): Promise<HubResult<T>> {
  const url = `${hub.base}/integrations/v1${path}`
  const content = JSON.stringify(body)
  const timestamp = String(Math.floor(Date.now() / 1000))
  const nonce = randomBytes(16).toString('hex')
  const canonical = ['POST', new URL(url).pathname, timestamp, nonce, createHash('sha256').update(content).digest('hex')].join('\n')
  const signature = createHmac('sha256', hub.secret).update(canonical).digest('hex')

  try {
    const res = await $fetch.raw<T>(url, {
      method: 'POST',
      body: content,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Hub-Key-Id': hub.keyId,
        'X-Hub-Timestamp': timestamp,
        'X-Hub-Nonce': nonce,
        'X-Hub-Signature': signature,
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {})
      },
      timeout: 20_000,
      retry: 0,
      ignoreResponseError: true
    })
    return { status: res.status, data: res._data as T }
  } catch {
    // Red caída, DNS o tiempo agotado. Sin detalles en logs (podrían incluir la URL interna).
    return { status: 0 }
  }
}

async function readJson(event: H3Event): Promise<Record<string, unknown>> {
  try {
    const body = await readBody(event)
    return body && typeof body === 'object' ? body as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function requireHub(event: H3Event) {
  const runtime = useRuntimeConfig(event) as Record<string, any>
  const hub = hubConfig(runtime)
  if (!hub) {
    console.error(`[${TAG}] integración con el Hub sin configurar (NUXT_WELLEZY_API_BASE_URL, NUXT_HUB_INTEGRATION_KEY_ID, NUXT_HUB_INTEGRATION_SECRET): el pago permanece bloqueado.`)
    formFail(503, MSG_PAY_UNAVAILABLE, { reason: 'not_configured' })
  }
  return { runtime, hub }
}

// ── 1. Checkout ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export async function handleValuationPayCheckout(event: H3Event) {
  assertSameOrigin(event)
  setHeader(event, 'Cache-Control', 'no-store')
  const { runtime, hub } = requireHub(event)

  if (isRateLimited(CHECKOUT_FORM, event, runtime, Date.now())) formFail(429, 'Recibimos demasiados intentos. Espera unos minutos e inténtalo de nuevo.', { reason: 'rate_limited' })

  const body = await readJson(event)
  const contact = normalizeValuationPay(body)
  const errors = validateValuationPay(contact)
  if (Object.keys(errors).length) formFail(422, 'Revisa los datos ingresados.', { reason: 'validation', errors })

  // Identifica este envío del formulario: repetirlo (doble clic, reintento de red) no crea otra valoración ni otro cobro.
  const attempt = typeof body.attempt === 'string' ? body.attempt : ''
  if (!ATTEMPT_RE.test(attempt)) formFail(400, 'No pudimos procesar el envío. Inténtalo de nuevo.', { reason: 'malformed' })

  const origin = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin
  // El WAF de Wompi responde 403 al checkout si `redirect-url` apunta a http://localhost o a una IP local, así que solo se envía con https (producción).
  // En local el widget igualmente informa el resultado por su callback; solo quedan sin retorno los métodos que redirigen (p. ej. PSE).
  const res = await hubSignedPost(hub, '/valoraciones/checkout', {
    patient: { name: contact.name, email: contact.email, phone: contact.phone, ...(contact.document ? { document: contact.document } : {}) },
    ...(origin.startsWith('https://') ? { return_url: `${origin}/financiacion` } : {})
  }, `vp-${attempt}`)

  if (res.status === 201 && res.data?.checkout?.public_key && res.data?.payment?.uuid) {
    const c = res.data.checkout
    // Un cambio de correo detectado queda como observación en el Hub y se comunica a Convenios DENTRO del correo de pago aprobado (lo envía el Hub). La web no envía nada.
    return {
      payment_uuid: String(res.data.payment.uuid),
      checkout: {
        public_key: String(c.public_key),
        reference: String(c.reference),
        amount_in_cents: Number(c.amount_in_cents),
        currency: String(c.currency),
        signature_integrity: String(c.signature_integrity),
        redirect_url: c.redirect_url ? String(c.redirect_url) : null
      }
    }
  }

  if (res.status === 401) console.error(`[${TAG}] el Hub rechazó la firma de la integración: revisar NUXT_HUB_INTEGRATION_KEY_ID / _SECRET.`)
  else if (res.status === 0) console.error(`[${TAG}] el Hub NO respondió al iniciar el checkout (status 0): ¿php artisan serve / MySQL caídos, URL o puerto erróneos? Ver docs/cambios-importantes/2026-11-23-pago-valoracion-no-disponible-diagnostico.md del Hub.`)
  else if (res.status >= 500 && res.status !== 503) console.error(`[${TAG}] error interno del Hub (${res.status}) al iniciar el checkout: revisar storage/logs/laravel.log del Hub (migración sin aplicar, BD).`)
  else if (res.status === 503) console.error(`[${TAG}] el Hub rechazó el checkout por configuración (503): revisar el warning «checkout de valoración no disponible» en laravel.log del Hub (línea, cuenta Wompi o tarifa).`)
  else console.error(`[${TAG}] el Hub respondió ${res.status} al iniciar el checkout.`)

  // El Hub ya devuelve mensajes seguros en español (p. ej. correo que no puede registrarse): se muestran tal cual.
  if (res.status === 422) formFail(422, typeof res.data?.message === 'string' && res.data.message ? res.data.message : 'Revisa los datos ingresados.', { reason: 'validation', errors: {} })
  if (res.status === 409 && res.data?.code === 'retry_window_active') formFail(409, 'Tu intento de pago anterior todavía puede reintentarse. Espera unos minutos antes de iniciar otro.', { reason: 'retry_window' })
  if (res.status === 409) formFail(409, 'Ya recibimos esta solicitud. Si ya pagaste, una asesora te contactará.', { reason: 'conflict' })
  formFail(503, MSG_PAY_UNAVAILABLE, { reason: 'unavailable' })
}

// ── 2. Confirmación (solo consulta) ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export async function handleValuationPayConfirm(event: H3Event) {
  assertSameOrigin(event)
  setHeader(event, 'Cache-Control', 'no-store')
  const { runtime, hub } = requireHub(event)

  if (isRateLimited(CONFIRM_FORM, event, runtime, Date.now())) formFail(429, 'Recibimos demasiados intentos. Espera unos minutos e inténtalo de nuevo.', { reason: 'rate_limited' })

  const body = await readJson(event)
  const paymentUuid = typeof body.payment_uuid === 'string' ? body.payment_uuid : ''
  const transactionId = typeof body.transaction_id === 'string' ? body.transaction_id : ''
  if (!UUID_RE.test(paymentUuid) || (transactionId && !TX_RE.test(transactionId))) formFail(400, 'No pudimos procesar la verificación.', { reason: 'malformed' })

  // Solo consulta: el Hub verifica con Wompi y, si el pago queda aprobado, él mismo envía el correo a Convenios y registra al cliente en el CRM (sin esta llamada).
  // Esta respuesta únicamente alimenta lo que se muestra al paciente (pendiente / aprobado / rechazado). Sin efectos secundarios: repetirla no envía nada.
  const res = await hubSignedPost(hub, `/payments/${paymentUuid.toLowerCase()}/refresh`, transactionId ? { transaction_id: transactionId } : {})
  const status = typeof res.data?.payment?.status === 'string' ? res.data.payment.status : ''

  if (res.status !== 200 || !status) {
    console.error(`[${TAG}] el Hub respondió ${res.status} al verificar el pago.`)
    formFail(res.status === 404 ? 404 : 502, MSG_PAY_VERIFY, { reason: 'verify_failed' })
  }
  if (status !== 'APPROVED') return { status }

  return { status, name: String(res.data?.patient?.name ?? '') }
}

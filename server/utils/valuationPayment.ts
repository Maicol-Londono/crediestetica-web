import type { H3Event } from 'h3'
import { createHash, createHmac, randomBytes } from 'node:crypto'
import { crmDestinationProblem } from '#shared/utils/crmDestination'
import { isValidDocument, normalizeDocument, normalizeValuationPay, validateValuationPay } from '#shared/utils/valuationPay'
import {
  VALUATION_PAY_RECIPIENTS, cleanLine, envName, fmtMoney, formFail, isRateLimited, notifyComplementary, renderFormEmail, resolveMailConfig,
  type MailSection, type NotifyResult
} from './formMail'
import { buildReceiptPdf } from './receiptPdf'
import { claimCrm, crmStoreDir, finishCrm } from './crmClientStore'

// Pago en línea de la valoración (Wompi vía Wellezy Hub). Solo servidor: el navegador NUNCA habla con el Hub ni ve el secreto de la integración.
//  · /api/forms/valuation-payment/checkout: valida los datos básicos y le pide al Hub el checkout (el Hub registra al paciente, crea la valoración con el
//    precio de la línea —el navegador no puede fijar importe— y devuelve solo los datos públicos del widget de Wompi).
//  · /api/forms/valuation-payment/confirm: al terminar el pago, el Hub consulta a Wompi con la llave privada. SOLO si queda APROBADO se envía el correo
//    con los datos del formulario y el comprobante en PDF, y se devuelve el nombre para el mensaje de éxito. La redirección del navegador no aprueba nada.
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
    patient: { name: contact.name, email: contact.email, phone: contact.phone },
    ...(origin.startsWith('https://') ? { return_url: `${origin}/financiacion` } : {})
  }, `vp-${attempt}`)

  if (res.status === 201 && res.data?.checkout?.public_key && res.data?.payment?.uuid) {
    const c = res.data.checkout
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
  else console.error(`[${TAG}] el Hub respondió ${res.status} al iniciar el checkout.`)

  // El Hub ya devuelve mensajes seguros en español (p. ej. correo que no puede registrarse): se muestran tal cual.
  if (res.status === 422) formFail(422, typeof res.data?.message === 'string' && res.data.message ? res.data.message : 'Revisa los datos ingresados.', { reason: 'validation', errors: {} })
  if (res.status === 409 && res.data?.code === 'retry_window_active') formFail(409, 'Tu intento de pago anterior todavía puede reintentarse. Espera unos minutos antes de iniciar otro.', { reason: 'retry_window' })
  if (res.status === 409) formFail(409, 'Ya recibimos esta solicitud. Si ya pagaste, una asesora te contactará.', { reason: 'conflict' })
  formFail(503, MSG_PAY_UNAVAILABLE, { reason: 'unavailable' })
}

// ── 2. Confirmación y correo ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface PaidValuation {
  patient: { name: string, email: string, phone: string, document?: string }
  receipt: { reference: string, transactionId: string, amountCents: number, currency: string, paidAt: string | null }
}

/** Correo (con el comprobante en PDF adjunto) que se envía a Crediestética cuando el pago de la valoración queda aprobado. */
export function buildPaidValuationEmail(input: PaidValuation & { brand: string, receivedAt: Date }) {
  const { patient, receipt, brand } = input
  const name = cleanLine(patient.name)
  const amount = fmtMoney(Math.round(receipt.amountCents / 100))
  const paidAt = receipt.paidAt ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(receipt.paidAt)) : 'No disponible'

  const sections: MailSection[] = [
    { title: 'Datos del paciente', rows: [
      { label: 'Nombre', value: name },
      { label: 'Cédula', value: patient.document || 'No informada' },
      { label: 'Celular', value: cleanLine(patient.phone) },
      { label: 'Correo electrónico', value: cleanLine(patient.email) }
    ] },
    { title: 'Pago de la valoración', rows: [
      { label: 'Concepto', value: 'Valoración (pago en la web)' },
      { label: 'Valor pagado', value: `${amount} ${receipt.currency}` },
      { label: 'Referencia', value: receipt.reference },
      { label: 'Transacción Wompi', value: receipt.transactionId },
      { label: 'Fecha del pago', value: paidAt }
    ] }
  ]
  const filename = `comprobante-valoracion-${receipt.reference.replace(/[^A-Za-z0-9_-]/g, '')}.pdf`
  const { text, html } = renderFormEmail({
    brand,
    title: 'Pago de valoración aprobado',
    receivedAt: input.receivedAt,
    sections,
    documents: [filename],
    footer: 'Pago verificado con Wompi a través de Wellezy Hub. Contacta al paciente para agendar su valoración.'
  })
  const pdf = buildReceiptPdf({
    brand,
    title: 'Comprobante de pago',
    intro: `Recibimos el pago de la valoración de ${name}. Este comprobante resume la transacción verificada.`,
    rows: [
      { label: 'Paciente', value: name },
      ...(patient.document ? [{ label: 'Cédula', value: patient.document }] : []),
      { label: 'Concepto', value: 'Valoración' },
      { label: 'Valor pagado', value: `${amount} ${receipt.currency}` },
      { label: 'Fecha del pago', value: paidAt },
      { label: 'Referencia', value: receipt.reference },
      { label: 'Transacción Wompi', value: receipt.transactionId }
    ],
    footer: 'Comprobante informativo generado automáticamente tras verificar el pago con Wompi. No es una factura.'
  })

  return {
    subject: `Pago de valoración aprobado — ${name}`,
    text,
    html,
    replyTo: cleanLine(patient.email),
    attachments: [{ filename, content: pdf, contentType: 'application/pdf' }]
  }
}

// ── 3. Alta del cliente en el CRM Médico ─────────────────────────────────────────────────────────────────────────────────────────────────
// POST JSON a la API del CRM (indicaciones del programador líder): name, phone y advisor_email son obligatorios, además de id_line. Solo se envían los datos del
// formulario: name, identificacion (cédula), phone, ad_headline = «formulario web» y advisor_email. Solo tras un pago APROBADO.
//  · Destino e id_line son configuración (NUXT_CRM_CLIENT_*), vacíos por defecto: sin ellos no sale nada (así las pruebas locales con Sandbox no crean clientes reales).
//  · Sin reintentos automáticos: un tiempo agotado puede haber creado el registro y repetirlo lo duplicaría. Una sola vez por pago, con registro persistente
//    en disco (crmClientStore.ts: processing / sent / failed / unknown), que exige NUXT_CONTENT_DIR absoluto: sin él no se envía nada.
//  · Nunca se registran datos personales ni el cuerpo: solo el estado HTTP o el tipo de fallo.
const CRM_TIMEOUT_MS = 15_000
const CRM_HEADLINE = 'formulario web'
const crmPending = new Set<Promise<unknown>>()

/** Celular para el CRM: solo dígitos y con indicativo de país (57) cuando es un celular colombiano de 10 dígitos. */
export function crmPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 && digits.startsWith('3') ? `57${digits}` : digits
}

export function buildCrmClientPayload(input: { name: string, phone: string, document: string }, cfg: { lineId: number, advisorEmail: string }) {
  return {
    name: cleanLine(input.name),
    phone: crmPhone(input.phone),
    ...(input.document ? { identificacion: input.document } : {}),
    ad_headline: CRM_HEADLINE,
    advisor_email: cfg.advisorEmail,
    id_line: cfg.lineId
  }
}

/**
 * Criterio de éxito del alta (API de chat del CRM). PROVISIONAL: el contrato de respuesta NO está confirmado por el responsable del CRM (pendiente con PDT) y aquí
 * no se inventa. Solo se acepta como alta confirmada una respuesta 2xx con cuerpo JSON (objeto) que traiga una marca POSITIVA explícita (`success: true`,
 * `ok: true` o `status` = success/ok/created) y ninguna marca de fallo. Cuerpo vacío, `{}`, un `message` genérico, no JSON o cualquier otra cosa es ambigua:
 * NO se marca como enviada y NO se reenvía (estado unknown, a conciliar a mano). Mientras PDT no confirme el contrato, es esperable que respuestas reales de éxito
 * queden en unknown: es preferible a registrar como enviado algo no comprobado.
 */
export function crmChatConfirmed(data: unknown): boolean {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false
  const d = data as Record<string, unknown>
  if (d.success === false || d.ok === false || d.status === false) return false
  if (d.error || (Array.isArray(d.errors) ? d.errors.length : d.errors)) return false
  if (typeof d.status === 'string' && /^(error|fail|failed|failure)$/i.test(d.status)) return false
  return d.success === true || d.ok === true || (typeof d.status === 'string' && /^(success|ok|created)$/i.test(d.status))
}

/** Códigos de red que demuestran que NO se llegó a conectar con el CRM (la petición no salió): conexión rechazada o nombre no resuelto. */
const CRM_NO_CONNECTION_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'])

/**
 * Clasifica un error de `$fetch` (ofetch). Recorre toda la cadena de `cause` y los `errors` de un AggregateError. Solo es `failed` (la petición no llegó al CRM)
 * si hay al menos un código de red y TODOS pertenecen a CRM_NO_CONNECTION_CODES, sin tiempo agotado ni cancelación. Todo lo demás (tiempo agotado, ECONNRESET,
 * UND_ERR_*, errores sin código, cadenas mixtas) es `unknown`: no se puede demostrar que el CRM no recibió la petición.
 */
export function classifyCrmError(error: unknown): 'failed' | 'unknown' {
  const codes: string[] = []
  const seen = new Set<unknown>()
  let abort = false
  const walk = (e: any, depth: number) => {
    if (!e || typeof e !== 'object' || seen.has(e) || depth > 8) return
    seen.add(e)
    if (e.name === 'TimeoutError' || e.name === 'AbortError') abort = true
    if (typeof e.code === 'string') codes.push(e.code)
    if (e.cause) walk(e.cause, depth + 1)
    if (Array.isArray(e.errors)) for (const x of e.errors) walk(x, depth + 1)
  }
  walk(error, 0)
  return !abort && codes.length > 0 && codes.every(c => CRM_NO_CONNECTION_CODES.has(c)) ? 'failed' : 'unknown'
}

/** 4xx con rechazo demostrable de la petición y causa transitoria: 408 (el servidor no recibió la petición completa) y 429 (límite de peticiones). El resto de 4xx no se reintenta. */
const CRM_RETRYABLE_HTTP = new Set([408, 429])

/** Registro estructurado con etiqueta fija (`event`), sin datos personales, secretos ni cuerpos del CRM. `payment` es el uuid opaco del pago (para localizar la conciliación). */
function crmLog(event: 'crm_store_error' | 'crm_lock_timeout' | 'crm_send_failed' | 'crm_send_unknown' | 'crm_send_sent', fields: Record<string, unknown>) {
  const line = `[${TAG}] ${JSON.stringify({ event, ...fields })}`
  if (event === 'crm_send_sent') console.info(line)
  else console.error(line)
}

export async function registerCrmClient(runtime: Record<string, any>, input: { name: string, phone: string, document: string }, key: string): Promise<'sent' | 'skipped' | 'failed' | 'unknown'> {
  const url = String(runtime.crmClientUrl || '').trim()
  if (!url) return 'skipped'
  const problem = crmDestinationProblem(url)
  const lineId = Number(runtime.crmClientLineId)
  const advisorEmail = String(runtime.crmClientAdvisorEmail || '').trim()
  if (problem || !Number.isInteger(lineId) || lineId <= 0 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(advisorEmail)) {
    console.error(`[${TAG}] alta en el CRM omitida: configuración inválida (NUXT_CRM_CLIENT_URL, NUXT_CRM_CLIENT_LINE_ID, NUXT_CRM_CLIENT_ADVISOR_EMAIL).`)
    return 'skipped'
  }
  const payload = buildCrmClientPayload(input, { lineId, advisorEmail })
  if (!payload.name || payload.phone.length < 7) return 'skipped'

  // Idempotencia persistente por pago. Sin NUXT_CONTENT_DIR absoluto y escribible (o sin poder reservar el envío) no se envía nada.
  const loc = crmStoreDir(runtime)
  if (!loc.ok) {
    crmLog('crm_store_error', { payment: key, detail: loc.detail, action: 'set NUXT_CONTENT_DIR to an absolute path outside the app folder' })
    return 'skipped'
  }
  const dir = loc.dir
  const claim = await claimCrm(dir, key)
  if (!claim.ok) {
    if (claim.reason === 'store_error') crmLog('crm_store_error', { payment: key, detail: claim.detail })
    else if (claim.reason === 'lock_timeout') crmLog('crm_lock_timeout', { payment: key })
    else if (claim.reason === 'unknown') crmLog('crm_send_unknown', { payment: key, stage: 'claim', reason: claim.detail, action: 'manual reconciliation, no resend' })
    else if (claim.reason === 'failed_permanent' || claim.reason === 'exhausted') crmLog('crm_send_failed', { payment: key, stage: 'claim', reason: claim.detail ?? claim.reason, retryable: false, action: 'fix cause and reconcile manually' })
    return 'skipped'
  }

  let state: 'sent' | 'failed' | 'unknown'
  let httpStatus: number | undefined
  let reason: string
  let retryable: boolean | undefined
  try {
    const res = await $fetch.raw(url, {
      method: 'POST',
      body: payload,
      headers: { Accept: 'application/json' },
      timeout: CRM_TIMEOUT_MS,
      retry: 0,
      // Nunca seguir redirecciones: un 307/308 reenviaría los datos personales a otro host.
      redirect: 'manual',
      ignoreResponseError: true
    })
    httpStatus = res.status
    if (res.status >= 200 && res.status < 300) {
      state = crmChatConfirmed(res._data) ? 'sent' : 'unknown'
      reason = state === 'sent' ? 'confirmed' : 'unconfirmed_response'
    } else if (res.status >= 400 && res.status < 500) {
      state = 'failed'
      retryable = CRM_RETRYABLE_HTTP.has(res.status)
      reason = retryable ? 'http_retryable' : 'http_rejected'
    } else if (res.status >= 300 && res.status < 400) {
      state = 'unknown'
      reason = 'redirect_not_followed'
    } else {
      state = 'unknown'
      reason = 'http_other'
    }
  } catch (error) {
    state = classifyCrmError(error)
    reason = state === 'failed' ? 'no_connection' : 'no_response'
    if (state === 'failed') retryable = true
  }
  const saved = await finishCrm(dir, key, claim.attempt, state, { ...(httpStatus ? { httpStatus } : {}), reason, ...(retryable !== undefined ? { retryable } : {}) })
  const fields = { payment: key, attempt: claim.attempt, http: httpStatus, reason, ...(retryable !== undefined ? { retryable } : {}), ...(saved ? {} : { saved: false }) }
  if (state === 'sent') crmLog('crm_send_sent', fields)
  else if (state === 'failed') crmLog('crm_send_failed', fields)
  else crmLog('crm_send_unknown', { ...fields, action: 'manual reconciliation, no resend' })
  return state
}

/**
 * Correo de confirmación del PAGO: un único destinatario (`valuationPayTo`) y nunca copia ni copia oculta. No lee `valuationTo`/`valuationCc` ni las claves
 * de los demás formularios; aunque la clave tuviera varias direcciones, el pago se bloquea (configuración inválida) en lugar de enviar a más de una.
 */
export function resolvePayMailConfig(runtime: Record<string, any>) {
  const mail = resolveMailConfig(runtime, VALUATION_PAY_RECIPIENTS)
  if (!mail.ok) return mail
  if (mail.config.to.length !== 1) return { ok: false as const, invalid: [envName(VALUATION_PAY_RECIPIENTS.to)] }
  return { ok: true as const, config: { ...mail.config, cc: [] as string[] } }
}

function trackCrm(p: Promise<unknown>) {
  crmPending.add(p)
  void p.finally(() => crmPending.delete(p))
}

/** Solo pruebas: espera las altas en curso. */
export async function settleCrmClients() {
  await Promise.allSettled([...crmPending])
}

export async function handleValuationPayConfirm(event: H3Event) {
  assertSameOrigin(event)
  setHeader(event, 'Cache-Control', 'no-store')
  const { runtime, hub } = requireHub(event)

  if (isRateLimited(CONFIRM_FORM, event, runtime, Date.now())) formFail(429, 'Recibimos demasiados intentos. Espera unos minutos e inténtalo de nuevo.', { reason: 'rate_limited' })

  const body = await readJson(event)
  const paymentUuid = typeof body.payment_uuid === 'string' ? body.payment_uuid : ''
  const transactionId = typeof body.transaction_id === 'string' ? body.transaction_id : ''
  // La cédula solo la conoce la web (el Hub no la guarda): se usa únicamente para el correo; si no llega válida se informa como «No informada».
  const documentNumber = normalizeDocument(body.document)
  const document = isValidDocument(documentNumber) ? documentNumber : ''
  if (!UUID_RE.test(paymentUuid) || (transactionId && !TX_RE.test(transactionId))) formFail(400, 'No pudimos procesar la verificación.', { reason: 'malformed' })

  const res = await hubSignedPost(hub, `/payments/${paymentUuid.toLowerCase()}/refresh`, transactionId ? { transaction_id: transactionId } : {})
  const status = typeof res.data?.payment?.status === 'string' ? res.data.payment.status : ''

  if (res.status !== 200 || !status) {
    console.error(`[${TAG}] el Hub respondió ${res.status} al verificar el pago.`)
    formFail(res.status === 404 ? 404 : 502, MSG_PAY_VERIFY, { reason: 'verify_failed' })
  }
  if (status !== 'APPROVED') return { status }

  const r = res.data.receipt
  const p = res.data.patient
  if (!r || !p?.name || !p?.email) {
    console.error(`[${TAG}] pago aprobado sin comprobante o sin datos del paciente en la respuesta del Hub.`)
    return { status, name: String(p?.name ?? ''), emailed: 'skipped' as NotifyResult }
  }

  // Alta del cliente en el CRM Médico (en segundo plano: no retrasa ni altera la respuesta al usuario).
  trackCrm(registerCrmClient(runtime, { name: String(p.name), phone: String(p.phone ?? ''), document }, paymentUuid.toLowerCase()))

  const mail = resolvePayMailConfig(runtime)
  if (!mail.ok) console.error(`[${TAG}] configuración de correo incompleta (${mail.invalid.join(', ')}): el pago está aprobado pero no se envió el correo.`)

  // El pago ya es real: el correo es un aviso a Crediestética con reintentos (nunca altera el resultado). Una clave por pago evita duplicados.
  const emailed = await notifyComplementary({
    tag: TAG,
    form: TAG,
    key: `valuation-pay:${paymentUuid.toLowerCase()}`,
    mail: mail.ok ? mail.config : null,
    build: () => buildPaidValuationEmail({
      brand: String(runtime.public?.appName || 'Crediestética'),
      receivedAt: new Date(),
      patient: { name: String(p.name), email: String(p.email), phone: String(p.phone ?? ''), document },
      receipt: { reference: String(r.reference), transactionId: String(r.transaction_id ?? ''), amountCents: Number(r.amount_cents), currency: String(r.currency), paidAt: r.paid_at ? String(r.paid_at) : null }
    })
  })

  return { status, name: String(p.name), emailed }
}

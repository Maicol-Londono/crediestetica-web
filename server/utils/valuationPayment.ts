import type { H3Event } from 'h3'
import { createHash, createHmac, randomBytes } from 'node:crypto'
import { crmDestinationProblem } from '#shared/utils/crmDestination'
import { isValidDocument, normalizeDocument, normalizeValuationPay, validateValuationPay } from '#shared/utils/valuationPay'
import {
  VALUATION_RECIPIENTS, cleanLine, fmtMoney, formFail, isRateLimited, notifyComplementary, renderFormEmail, resolveMailConfig,
  type MailSection, type NotifyResult
} from './formMail'
import { buildReceiptPdf } from './receiptPdf'

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
//  · Sin reintentos: un tiempo agotado puede haber creado el registro y repetirlo lo duplicaría. Una sola vez por pago (memoria de este proceso).
//  · Nunca se registran datos personales ni el cuerpo: solo el estado HTTP o el tipo de fallo.
const CRM_TIMEOUT_MS = 15_000
const CRM_HEADLINE = 'formulario web'
const crmSent = new Set<string>()
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

export async function registerCrmClient(runtime: Record<string, any>, input: { name: string, phone: string, document: string }, key: string): Promise<'sent' | 'skipped' | 'failed'> {
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
  if (crmSent.has(key)) return 'skipped'
  crmSent.add(key)

  try {
    const res = await $fetch.raw(url, {
      method: 'POST',
      body: payload,
      headers: { Accept: 'application/json' },
      timeout: CRM_TIMEOUT_MS,
      retry: 0,
      ignoreResponseError: true
    })
    if (res.status >= 200 && res.status < 300) return 'sent'
    console.error(`[${TAG}] el CRM respondió ${res.status} al dar de alta el cliente.`)
    return 'failed'
  } catch {
    console.error(`[${TAG}] sin respuesta del CRM al dar de alta el cliente (resultado incierto, no se reintenta).`)
    return 'failed'
  }
}

function trackCrm(p: Promise<unknown>) {
  crmPending.add(p)
  void p.finally(() => crmPending.delete(p))
}

/** Solo pruebas: espera las altas en curso y vacía las claves ya enviadas. */
export async function settleCrmClients(reset = false) {
  await Promise.allSettled([...crmPending])
  if (reset) crmSent.clear()
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

  const mail = resolveMailConfig(runtime, VALUATION_RECIPIENTS)
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

// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Pago en línea de la valoración (Wompi vía Hub): firma HMAC hacia el Hub, checkout, confirmación SOLO de consulta y aviso interno de cambio de correo.
// El correo de pago aprobado y el alta en el CRM los ejecuta el Hub (ver tests/Feature/Payments/ValoracionPostApprovalTest.php en wellezy-hub).
// Se ejecuta el código REAL del servidor con un Hub y un transporte SMTP simulados: sin red ni correos reales. Datos y claves FICTICIOS.
import { test, describe, before, beforeEach, after, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'
import { createHash, createHmac } from 'node:crypto'
import { ROOT } from '../recommendations/harness.ts'

const fileUrl = rel => pathToFileURL(join(ROOT, rel)).href
const read = rel => readFileSync(join(ROOT, rel), 'utf8')
const SECRET = 'secreto-ficticio-de-integracion'
const PAY_UUID = '3f2b8c1e-5d4a-4e7b-9a10-123456789abc'
const ATTEMPT = '0b9a1c52-77de-4a3c-8f21-aabbccddeeff'

const CFG = {
  wellezyApiBaseUrl: 'https://hub.example.test/api',
  hubIntegrationKeyId: 'key-ficticia',
  hubIntegrationSecret: SECRET,
  mailHost: 'smtp.example.test', mailPort: 465, mailUsername: 'sender@example.test', mailPassword: 'x-ficticia', mailFromAddress: '', mailFromName: 'Marca',
  valuationTo: 'destino@example.test', valuationCc: '', valuationPayTo: 'convenioscrediestetica@gmail.com', trustedProxyHops: 0,
  public: { appName: 'Marca de prueba' }
}

const state = { cfg: {}, hub: [], hubImpl: null, sent: [], logs: [] }
let dir, V, mail, realError, realInfo

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'valuation-pay-'))
  realError = console.error
  console.error = (...a) => { state.logs.push(a.map(String).join(' ')) }
  realInfo = console.info
  console.info = (...a) => { state.logs.push(a.map(String).join(' ')) }
  const g = globalThis
  g.createError = o => Object.assign(new Error(o.message ?? 'error'), o)
  g.useRuntimeConfig = () => state.cfg
  g.setHeader = () => {}
  g.assertSameOrigin = () => {}
  g.getRequestIP = e => e.ip
  g.getRequestHeader = (e, name) => e.headers?.[name.toLowerCase()]
  g.getRequestURL = () => new URL('https://crediestetica.test/api/forms/valuation-payment/checkout')
  g.readBody = async e => e.body
  g.$fetch = { raw: async (url, opts) => { state.hub.push({ url, opts }); return state.hubImpl(url, opts) } }

  const base = fileUrl('shared/utils')
  const fix = s => s.replace(/'#shared\/utils\/([A-Za-z]+)'/g, (_, m) => `'${base}/${m}.ts'`)
  writeFileSync(join(dir, 'formMail.ts'), fix(read('server/utils/formMail.ts')))
  writeFileSync(join(dir, 'valuationPayment.ts'), fix(read('server/utils/valuationPayment.ts')).replace("'./formMail'", "'./formMail.ts'"))
  V = await import(pathToFileURL(join(dir, 'valuationPayment.ts')).href)
  mail = await import(pathToFileURL(join(dir, 'formMail.ts')).href)
})

beforeEach(() => {
  state.cfg = { ...CFG }
  state.hub = []
  state.sent = []
  state.logs = []
  mail.resetMailGuards()
  mail.setMailTransportFactory(async () => ({ sendMail: async (msg) => { state.sent.push(msg); return { accepted: ['destino@example.test'], rejected: [] } }, close: () => {} }))
})

after(() => {
  console.error = realError
  console.info = realInfo
  mail.setMailTransportFactory()
  rmSync(dir, { recursive: true, force: true })
})

const ev = (body, ip = '203.0.113.1') => ({ body, ip, headers: {} })
const run = async (fn, event) => { try { return { value: await fn(event) } } catch (error) { return { error } } }
const contact = (over = {}) => ({ name: 'Ana Prueba', document: '1020434966', phone: '3001234567', email: 'ana@example.com', accept: true, attempt: ATTEMPT, ...over })
const approved = () => ({ status: 200, _data: { payment: { uuid: PAY_UUID, status: 'APPROVED' }, receipt: { concept: 'Valoración', reference: 'VAL-123', transaction_id: 'tx-999', amount_cents: 15000000, currency: 'COP', paid_at: '2026-11-20T15:30:00Z' }, patient: { name: 'Ana Prueba', email: 'ana@example.com', phone: '3001234567' } } })


describe('checkout', () => {
  test('firma la petición con HMAC y devuelve solo los datos públicos del widget', async () => {
    state.hubImpl = async () => ({ status: 201, _data: { payment: { uuid: PAY_UUID, status: 'PENDING' }, checkout: { public_key: 'pub_test_x', reference: 'VAL-123', amount_in_cents: 15000000, currency: 'COP', signature_integrity: 'abc', redirect_url: 'https://crediestetica.test/financiacion' }, secret: 'no-debe-salir' } })
    const r = await run(V.handleValuationPayCheckout, ev(contact()))
    assert.equal(r.value.payment_uuid, PAY_UUID)
    assert.equal(r.value.checkout.amount_in_cents, 15000000)
    assert.equal(JSON.stringify(r.value).includes('no-debe-salir'), false)

    const { url, opts } = state.hub[0]
    assert.equal(url, 'https://hub.example.test/api/integrations/v1/valoraciones/checkout')
    const h = opts.headers
    const canonical = ['POST', '/api/integrations/v1/valoraciones/checkout', h['X-Hub-Timestamp'], h['X-Hub-Nonce'], createHash('sha256').update(opts.body).digest('hex')].join('\n')
    assert.equal(h['X-Hub-Signature'], createHmac('sha256', SECRET).update(canonical).digest('hex'))
    assert.equal(h['X-Hub-Key-Id'], 'key-ficticia')
    assert.equal(h['Idempotency-Key'], `vp-${ATTEMPT}`)
    // El precio NO viaja desde la web: el Hub lo fija por la línea.
    assert.equal(/amount|price|valor/i.test(opts.body), false)
  })

  test('solo envía return_url con https (el WAF de Wompi bloquea http://localhost)', async () => {
    state.hubImpl = async () => ({ status: 201, _data: { payment: { uuid: PAY_UUID }, checkout: { public_key: 'pub', reference: 'R', amount_in_cents: 1, currency: 'COP', signature_integrity: 's', redirect_url: null } } })
    await run(V.handleValuationPayCheckout, ev(contact()))
    assert.equal(JSON.parse(state.hub[0].opts.body).return_url, 'https://crediestetica.test/financiacion')
    state.hub = []
    globalThis.getRequestURL = () => new URL('http://localhost:3000/api/forms/valuation-payment/checkout')
    const r = await run(V.handleValuationPayCheckout, ev(contact()))
    globalThis.getRequestURL = () => new URL('https://crediestetica.test/api/forms/valuation-payment/checkout')
    assert.equal('return_url' in JSON.parse(state.hub[0].opts.body), false)
    assert.equal(r.value.checkout.redirect_url, null)
  })

  test('rechaza datos inválidos sin llamar al Hub', async () => {
    const r = await run(V.handleValuationPayCheckout, ev(contact({ email: 'no-es-correo', accept: false })))
    assert.equal(r.error.statusCode, 422)
    for (const document of ['', 'abc', '123']) assert.equal((await run(V.handleValuationPayCheckout, ev(contact({ document })))).error.statusCode, 422)
    assert.equal(state.hub.length, 0)
  })

  test('sin credenciales de integración bloquea el pago (503) sin llamar al Hub', async () => {
    state.cfg = { ...CFG, hubIntegrationSecret: '' }
    const r = await run(V.handleValuationPayCheckout, ev(contact()))
    assert.equal(r.error.statusCode, 503)
    assert.equal(state.hub.length, 0)
  })

  test('error o caída del Hub → 503 genérico, sin detalles internos', async () => {
    state.hubImpl = async () => ({ status: 503, _data: { message: 'detalle interno del hub' } })
    const r = await run(V.handleValuationPayCheckout, ev(contact()))
    assert.equal(r.error.statusCode, 503)
    assert.equal(r.error.message.includes('detalle interno'), false)
  })

  test('envía la cédula al Hub (la necesita para el alta en el CRM y el correo a Convenios) y no la reenvía al navegador', async () => {
    state.hubImpl = async () => ({ status: 201, _data: { payment: { uuid: PAY_UUID, status: 'PENDING' }, checkout: { public_key: 'pub', reference: 'R', amount_in_cents: 1, currency: 'COP', signature_integrity: 's', redirect_url: null } } })
    const r = await run(V.handleValuationPayCheckout, ev(contact({ document: '1.020.434.966' })))
    assert.equal(JSON.parse(state.hub[0].opts.body).patient.document, '1020434966')
    assert.equal(JSON.stringify(r.value).includes('1020434966'), false)
  })
})


describe('confirmación: solo consulta, sin efectos secundarios', () => {
  const crmOrPdf = /registerCrmClient|crmClientStore|receiptPdf|buildPaidValuationEmail|buildReceiptPdf|crmClientUrl/
  test('pago aprobado: devuelve estado y nombre; NO envía correo ni registra al cliente (lo hace el Hub)', async () => {
    state.hubImpl = async () => approved()
    const r = await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID, transaction_id: 'tx-999', document: '1020434966' }))
    await mail.settleNotifications()
    assert.deepEqual(r.value, { status: 'APPROVED', name: 'Ana Prueba' })
    assert.equal(state.sent.length, 0)
    assert.equal(state.hub.length, 1, 'solo consulta al Hub; ninguna otra llamada (p. ej. CRM)')
    assert.equal(state.hub[0].url, `https://hub.example.test/api/integrations/v1/payments/${PAY_UUID}/refresh`)
  })

  test('repetir la confirmación (o volver tarde al navegador) no envía nada', async () => {
    state.hubImpl = async () => approved()
    for (let i = 0; i < 3; i++) await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID }))
    await mail.settleNotifications()
    assert.equal(state.sent.length, 0)
  })

  test('pago pendiente, rechazado o anulado: solo el estado, sin nombre ni correo', async () => {
    for (const status of ['PENDING', 'DECLINED', 'ERROR', 'VOIDED']) {
      state.hubImpl = async () => ({ status: 200, _data: { payment: { uuid: PAY_UUID, status } } })
      const r = await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID }))
      assert.deepEqual(r.value, { status })
    }
    await mail.settleNotifications()
    assert.equal(state.sent.length, 0)
  })

  test('identificadores mal formados se rechazan sin llamar al Hub', async () => {
    for (const body of [{}, { payment_uuid: 'x' }, { payment_uuid: PAY_UUID, transaction_id: 'a b' }]) {
      assert.equal((await run(V.handleValuationPayConfirm, ev(body))).error.statusCode, 400)
    }
    assert.equal(state.hub.length, 0)
  })

  test('falla del Hub al verificar → error genérico', async () => {
    state.hubImpl = async () => ({ status: 500, _data: { message: 'detalle interno' } })
    const r = await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID }))
    assert.equal(r.error.statusCode, 502)
    assert.equal(r.error.message.includes('detalle interno'), false)
  })

  test('el servidor ya no contiene el alta en el CRM, el correo de pago ni el PDF (están en el Hub)', () => {
    assert.equal(crmOrPdf.test(read('server/utils/valuationPayment.ts')), false)
    assert.equal(crmOrPdf.test(read('components/forms/ValuationPayModal.vue')), false)
    assert.equal(/document/.test(read('server/api/forms/valuation-payment/confirm.post.ts')), false)
  })
})

describe('el cambio de correo NO genera ningún correo desde la web', () => {
  const OBS = { uuid: '7a1f0c2e-3b4d-4c5e-8f60-0123456789ab', status: 'pending_verification', registered_email: 'viejo.registrado@example.com', informed_email: 'nuevo.informado@example.com', detected_at: '2026-11-21T15:30:00Z', valoracion_uuid: '9c8b7a65-4d3e-4f21-b0a9-fedcba987654' }

  test('aunque el Hub devuelva un bloque email_change en el checkout, la web no envía ningún correo ni lo expone al navegador', async () => {
    state.hubImpl = async () => ({ status: 201, _data: { valoracion: { uuid: OBS.valoracion_uuid }, payment: { uuid: PAY_UUID, status: 'PENDING' }, checkout: { public_key: 'pub', reference: 'R', amount_in_cents: 1, currency: 'COP', signature_integrity: 's', redirect_url: null }, email_change: OBS } })
    const r = await run(V.handleValuationPayCheckout, ev(contact()))
    await mail.settleNotifications()
    assert.equal(r.error, undefined)
    assert.equal(r.value.payment_uuid, PAY_UUID)
    assert.equal(state.sent.length, 0)
    assert.equal(JSON.stringify(r.value).includes('viejo.registrado'), false)
  })

  test('el servidor ya no contiene el aviso de cambio de correo ni su envío (el Hub lo incluye en el correo de pago aprobado)', () => {
    const src = read('server/utils/valuationPayment.ts')
    assert.equal(/notifyEmailChange|buildEmailChangeAlert|parseEmailChange|notifyComplementary|EMAIL_CHANGE_BANNER|Cambio de correo informado/.test(src), false)
    assert.equal(/banner/.test(read('server/utils/formMail.ts')), false)
  })
})

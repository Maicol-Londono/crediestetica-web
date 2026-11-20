// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Pago en línea de la valoración (Wompi vía Hub): comprobante PDF, correo con adjunto, firma HMAC hacia el Hub y manejadores de checkout/confirmación.
// Se ejecuta el código REAL del servidor con un Hub y un transporte SMTP simulados: sin red ni correos reales. Datos y claves FICTICIOS.
import { test, describe, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
  valuationTo: 'destino@example.test', valuationCc: '', trustedProxyHops: 0,
  public: { appName: 'Marca de prueba' }
}

const state = { cfg: {}, hub: [], hubImpl: null, sent: [], logs: [] }
let dir, V, mail, realError

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'valuation-pay-'))
  realError = console.error
  console.error = (...a) => { state.logs.push(a.map(String).join(' ')) }
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
  writeFileSync(join(dir, 'receiptPdf.ts'), read('server/utils/receiptPdf.ts'))
  writeFileSync(join(dir, 'formMail.ts'), fix(read('server/utils/formMail.ts')))
  writeFileSync(join(dir, 'valuationPayment.ts'), fix(read('server/utils/valuationPayment.ts')).replace("'./formMail'", "'./formMail.ts'").replace("'./receiptPdf'", "'./receiptPdf.ts'"))
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
  mail.setMailTransportFactory()
  rmSync(dir, { recursive: true, force: true })
})

const ev = (body, ip = '203.0.113.1') => ({ body, ip, headers: {} })
const run = async (fn, event) => { try { return { value: await fn(event) } } catch (error) { return { error } } }
const contact = (over = {}) => ({ name: 'Ana Prueba', phone: '3001234567', email: 'ana@example.com', accept: true, attempt: ATTEMPT, ...over })
const approved = () => ({ status: 200, _data: { payment: { uuid: PAY_UUID, status: 'APPROVED' }, receipt: { concept: 'Valoración', reference: 'VAL-123', transaction_id: 'tx-999', amount_cents: 15000000, currency: 'COP', paid_at: '2026-11-20T15:30:00Z' }, patient: { name: 'Ana Prueba', email: 'ana@example.com', phone: '3001234567' } } })

describe('comprobante PDF', () => {
  test('es un PDF válido de una página con los datos y escapa paréntesis', async () => {
    const { buildReceiptPdf } = await import(pathToFileURL(join(dir, 'receiptPdf.ts')).href)
    const pdf = Buffer.from(buildReceiptPdf({ brand: 'Marca', title: 'Comprobante', rows: [{ label: 'Paciente', value: 'Ana (prueba) \\ ñ' }] })).toString('latin1')
    assert.ok(pdf.startsWith('%PDF-1.4'))
    assert.ok(pdf.trimEnd().endsWith('%%EOF'))
    assert.match(pdf, /\/Count 1/)
    assert.ok(pdf.includes('Ana \\(prueba\\) \\\\'))
    const xrefAt = Number(/startxref\n(\d+)/.exec(pdf)[1])
    assert.ok(pdf.slice(xrefAt).startsWith('xref'))
  })
})

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

  test('rechaza datos inválidos sin llamar al Hub', async () => {
    const r = await run(V.handleValuationPayCheckout, ev(contact({ email: 'no-es-correo', accept: false })))
    assert.equal(r.error.statusCode, 422)
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
})

describe('confirmación y correo', () => {
  test('pago aprobado: devuelve el nombre y envía el correo con el comprobante PDF adjunto', async () => {
    state.hubImpl = async () => approved()
    const r = await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID, transaction_id: 'tx-999' }))
    assert.equal(r.value.status, 'APPROVED')
    assert.equal(r.value.name, 'Ana Prueba')
    await mail.settleNotifications()
    assert.equal(state.sent.length, 1)
    const msg = state.sent[0]
    assert.match(msg.subject, /Pago de valoración aprobado — Ana Prueba/)
    assert.equal(msg.attachments.length, 1)
    assert.equal(msg.attachments[0].contentType, 'application/pdf')
    assert.match(msg.attachments[0].filename, /^comprobante-valoracion-VAL123\.pdf$|^comprobante-valoracion-VAL-123\.pdf$/)
    assert.ok(Buffer.from(msg.attachments[0].content).toString('latin1').startsWith('%PDF'))
    assert.match(msg.text, /3001234567/)
  })

  test('confirmar dos veces el mismo pago no duplica el correo', async () => {
    state.hubImpl = async () => approved()
    await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID }))
    await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID }))
    await mail.settleNotifications()
    assert.equal(state.sent.length, 1)
  })

  test('pago no aprobado: no envía correo ni devuelve nombre', async () => {
    for (const status of ['PENDING', 'DECLINED']) {
      state.hubImpl = async () => ({ status: 200, _data: { payment: { uuid: PAY_UUID, status } } })
      const r = await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID }))
      assert.deepEqual(r.value, { status })
    }
    await mail.settleNotifications()
    assert.equal(state.sent.length, 0)
  })

  test('identificadores mal formados se rechazan sin llamar al Hub', async () => {
    for (const body of [{ payment_uuid: '../../x' }, { payment_uuid: PAY_UUID, transaction_id: 'a b;c' }, {}]) {
      const r = await run(V.handleValuationPayConfirm, ev(body))
      assert.equal(r.error.statusCode, 400)
    }
    assert.equal(state.hub.length, 0)
  })

  test('falla del Hub al verificar → error sin enviar correo', async () => {
    state.hubImpl = async () => ({ status: 502, _data: {} })
    const r = await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID }))
    assert.equal(r.error.statusCode, 502)
    await mail.settleNotifications()
    assert.equal(state.sent.length, 0)
  })
})

// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Pago en línea de la valoración (Wompi vía Hub): comprobante PDF, correo con adjunto, firma HMAC hacia el Hub y manejadores de checkout/confirmación.
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
let dir, V, S, mail, realError, realInfo

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
  writeFileSync(join(dir, 'receiptPdf.ts'), read('server/utils/receiptPdf.ts'))
  writeFileSync(join(dir, 'formMail.ts'), fix(read('server/utils/formMail.ts')))
  writeFileSync(join(dir, 'crmClientStore.ts'), read('server/utils/crmClientStore.ts'))
  writeFileSync(join(dir, 'valuationPayment.ts'), fix(read('server/utils/valuationPayment.ts')).replace("'./formMail'", "'./formMail.ts'").replace("'./receiptPdf'", "'./receiptPdf.ts'").replace("'./crmClientStore'", "'./crmClientStore.ts'"))
  S = await import(pathToFileURL(join(dir, 'crmClientStore.ts')).href)
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
})

describe('confirmación y correo', () => {
  test('pago aprobado: devuelve el nombre y envía el correo con el comprobante PDF adjunto', async () => {
    state.hubImpl = async () => approved()
    const r = await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID, transaction_id: 'tx-999', document: '1.020.434.966' }))
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
    assert.match(msg.text, /Cédula/)
    assert.match(msg.text, /1020434966/)
    assert.ok(msg.html.includes('1020434966'))
    assert.ok(Buffer.from(msg.attachments[0].content).toString('latin1').includes('1020434966'))
  })

  describe('alta del cliente en el CRM Médico', () => {
    const CRM_URL = 'https://crm.example.test/api/chat/create/client'
    const crmCfg = { crmClientUrl: CRM_URL, crmClientLineId: '30', crmClientAdvisorEmail: 'asesora@example.test', contentDir: '' }
    const crmCalls = () => state.hub.filter(c => c.url === CRM_URL)
    beforeEach(async () => {
      await V.settleCrmClients()
      crmCfg.contentDir = mkdtempSync(join(tmpdir(), 'crm-store-'))
    })
    afterEach(() => { rmSync(crmCfg.contentDir, { recursive: true, force: true }) })
    const crmOk = async url => (url === CRM_URL ? { status: 200, _data: { ok: true } } : approved())
    const confirm = () => run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID, document: '1020434966' }))
    const storeDir = () => S.crmStoreDir(crmCfg).dir
    const record = () => JSON.parse(readFileSync(join(storeDir(), PAY_UUID + '.json'), 'utf8'))

    test('pago aprobado: envía solo los datos del formulario con id_line y el asesor', async () => {
      state.cfg = { ...CFG, ...crmCfg }
      state.hubImpl = async url => (url === CRM_URL ? { status: 200, _data: { ok: true } } : approved())
      const r = await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID, document: '1.020.434.966' }))
      assert.equal(r.value.status, 'APPROVED')
      await V.settleCrmClients()
      assert.equal(crmCalls().length, 1)
      assert.deepEqual(crmCalls()[0].opts.body, { name: 'Ana Prueba', phone: '573001234567', identificacion: '1020434966', ad_headline: 'formulario web', advisor_email: 'asesora@example.test', id_line: 30 })
      assert.equal(crmCalls()[0].opts.retry, 0)
    })

    test('una sola vez por pago, aunque se confirme dos veces', async () => {
      state.cfg = { ...CFG, ...crmCfg }
      state.hubImpl = async url => (url === CRM_URL ? { status: 200, _data: { ok: true } } : approved())
      await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID }))
      await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID }))
      await V.settleCrmClients()
      assert.equal(crmCalls().length, 1)
      assert.equal('identificacion' in crmCalls()[0].opts.body, false)
    })

    test('sin URL configurada, o pago no aprobado, no sale nada hacia el CRM', async () => {
      state.hubImpl = async () => approved()
      await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID }))
      state.cfg = { ...CFG, ...crmCfg }
      state.hubImpl = async url => (url === CRM_URL ? { status: 200, _data: { ok: true } } : { status: 200, _data: { payment: { uuid: PAY_UUID, status: 'DECLINED' } } })
      await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID }))
      await V.settleCrmClients()
      assert.equal(crmCalls().length, 0)
    })

    test('configuración inválida (id_line, asesor o destino heredado) no envía', async () => {
      state.hubImpl = async url => (url === CRM_URL ? { status: 200, _data: { ok: true } } : approved())
      for (const bad of [{ crmClientLineId: '' }, { crmClientLineId: 'abc' }, { crmClientAdvisorEmail: 'sin-arroba' }]) {
        await V.settleCrmClients()
        state.cfg = { ...CFG, ...crmCfg, ...bad }
        await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID }))
        await V.settleCrmClients()
      }
      assert.equal(crmCalls().length, 0)
    })

    test('si el CRM falla (error o red) el usuario igual ve el pago aprobado y no se reintenta', async () => {
      state.cfg = { ...CFG, ...crmCfg }
      state.hubImpl = async (url) => { if (url === CRM_URL) throw new Error('red caída'); return approved() }
      const r = await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID }))
      assert.equal(r.value.status, 'APPROVED')
      assert.equal(r.value.name, 'Ana Prueba')
      await V.settleCrmClients()
      assert.equal(crmCalls().length, 1)
      await mail.settleNotifications()
      assert.equal(state.sent.length, 1)
    })

    test('pendiente o rechazado: no crea registro en el CRM ni deja ficha', async () => {
      state.cfg = { ...CFG, ...crmCfg }
      for (const st of ['PENDING', 'DECLINED', 'ERROR', 'VOIDED']) {
        state.hubImpl = async url => (url === CRM_URL ? { status: 200, _data: { ok: true } } : { status: 200, _data: { payment: { uuid: PAY_UUID, status: st } } })
        await confirm()
      }
      await V.settleCrmClients()
      assert.equal(crmCalls().length, 0)
      assert.equal(await S.readCrmRecord(storeDir(), PAY_UUID), null)
    })

    test('dos confirmaciones SIMULTÁNEAS no duplican el alta', async () => {
      state.cfg = { ...CFG, ...crmCfg }
      state.hubImpl = async url => { if (url === CRM_URL) { await new Promise(r => setTimeout(r, 80)); return { status: 200, _data: { ok: true } } } return approved() }
      await Promise.all([confirm(), confirm(), confirm()])
      await V.settleCrmClients()
      assert.equal(crmCalls().length, 1)
      assert.equal(record().state, 'sent')
    })

    test('reclamos concurrentes de la ficha: solo uno obtiene el derecho de enviar', async () => {
      const d = storeDir()
      const claims = await Promise.all(Array.from({ length: 12 }, () => S.claimCrm(d, PAY_UUID)))
      assert.equal(claims.filter(c => c.ok).length, 1)
      assert.ok(claims.filter(c => !c.ok).every(c => c.reason === 'processing'))
    })

    test('reinicio simulado: la idempotencia se conserva en disco', async () => {
      state.cfg = { ...CFG, ...crmCfg }
      state.hubImpl = crmOk
      await confirm()
      await V.settleCrmClients()
      assert.equal(crmCalls().length, 1)
      // Reinicio: módulo nuevo (memoria vacía) sobre el mismo directorio.
      const fresh = await import(pathToFileURL(join(dir, 'valuationPayment.ts')).href + '?reinicio=' + Date.now())
      await fresh.handleValuationPayConfirm(ev({ payment_uuid: PAY_UUID }))
      await fresh.settleCrmClients()
      assert.equal(crmCalls().length, 1)
      assert.equal(record().state, 'sent')
    })

    test('CRM 400/401/403/404/409/422: failed NO reintentable (no se reenvía sin corregir la causa)', async () => {
      state.cfg = { ...CFG, ...crmCfg }
      let n = 0
      for (const status of [400, 401, 403, 404, 409, 422]) {
        rmSync(storeDir(), { recursive: true, force: true })
        state.hubImpl = async url => (url === CRM_URL ? { status, _data: { message: 'rechazado' } } : approved())
        const before = crmCalls().length
        await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID }, '192.0.2.' + (++n)))
        await V.settleCrmClients()
        assert.equal(record().state, 'failed', String(status))
        assert.equal(record().retryable, false, String(status))
        assert.equal(record().httpStatus, status)
        state.hubImpl = crmOk
        await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID }, '192.0.2.' + (++n)))
        await V.settleCrmClients()
        assert.equal(crmCalls().length - before, 1, 'no reenvía tras ' + status)
        assert.equal(record().state, 'failed')
      }
    })

    test('CRM 408/429: failed reintentable en una confirmación posterior, máximo 3 intentos', async () => {
      state.cfg = { ...CFG, ...crmCfg }
      for (const status of [408, 429]) {
        rmSync(storeDir(), { recursive: true, force: true })
        state.hubImpl = async url => (url === CRM_URL ? { status, _data: {} } : approved())
        const before = crmCalls().length
        for (let i = 0; i < 5; i++) { await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID }, `198.18.${status % 250}.${i + 1}`)); await V.settleCrmClients() }
        assert.equal(crmCalls().length - before, 3, String(status))
        assert.equal(record().retryable, true)
      }
      rmSync(storeDir(), { recursive: true, force: true })
      state.hubImpl = async url => (url === CRM_URL ? { status: 429, _data: {} } : approved())
      await confirm(); await V.settleCrmClients()
      state.hubImpl = crmOk
      await confirm(); await V.settleCrmClients()
      assert.equal(record().state, 'sent')
      assert.equal(record().attempts, 2)
    })

    test('redirección 3xx: no se sigue (redirect manual) y queda unknown', async () => {
      state.cfg = { ...CFG, ...crmCfg }
      state.hubImpl = async url => (url === CRM_URL ? { status: 307, _data: undefined } : approved())
      await confirm()
      await V.settleCrmClients()
      assert.equal(crmCalls()[0].opts.redirect, 'manual')
      assert.equal(record().state, 'unknown')
      assert.equal(record().reason, 'redirect_not_followed')
    })

    test('CRM 5xx: no se marca enviado y queda unknown sin reenviar', async () => {
      state.cfg = { ...CFG, ...crmCfg }
      state.hubImpl = async url => (url === CRM_URL ? { status: 502, _data: {} } : approved())
      await confirm()
      await V.settleCrmClients()
      assert.equal(record().state, 'unknown')
      await confirm()
      await V.settleCrmClients()
      assert.equal(crmCalls().length, 1)
    })

    test('timeout: unknown, sin reenvío automático; sin conexión previa: failed', async () => {
      state.cfg = { ...CFG, ...crmCfg }
      state.hubImpl = async url => { if (url === CRM_URL) { const e = new Error('timeout'); e.name = 'TimeoutError'; throw e } return approved() }
      await confirm()
      await V.settleCrmClients()
      assert.equal(record().state, 'unknown')
      await confirm()
      await V.settleCrmClients()
      assert.equal(crmCalls().length, 1)
      rmSync(storeDir(), { recursive: true, force: true })
      state.hubImpl = async url => { if (url === CRM_URL) { const e = new Error('fetch failed'); e.cause = { code: 'ECONNREFUSED' }; throw e } return approved() }
      await confirm()
      await V.settleCrmClients()
      assert.equal(record().state, 'failed')
    })

    test('2xx sin confirmación reconocible (cuerpo no JSON o con error) → unknown, no sent', async () => {
      state.cfg = { ...CFG, ...crmCfg }
      let n = 0
      for (const body of ['<html>ok</html>', undefined, { success: false }, { error: 'x' }, { errors: ['x'] }, [], { status: 'error' }, {}, { message: 'Cliente creado' }, { message: 'ok' }, { status: 'pending' }, { id: 5 }]) {
        rmSync(storeDir(), { recursive: true, force: true })
        state.hubImpl = async url => (url === CRM_URL ? { status: 200, _data: body } : approved())
        await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID }, '198.51.100.' + (++n)))
        await V.settleCrmClients()
        assert.equal(record().state, 'unknown', JSON.stringify(body))
      }
      for (const good of [{ ok: true }, { success: true }, { status: 'created' }, { status: 'OK' }, { ok: true, id: 5 }]) assert.equal(V.crmChatConfirmed(good), true, JSON.stringify(good))
      assert.equal(V.crmChatConfirmed({ message: 'Cliente creado' }), false)
    })

    test('proceso interrumpido (processing obsoleto) pasa a unknown y no se reenvía; processing vigente bloquea', async () => {
      const d = storeDir()
      const t0 = Date.now()
      assert.equal((await S.claimCrm(d, PAY_UUID, t0)).ok, true)
      assert.deepEqual(await S.claimCrm(d, PAY_UUID, t0 + 1000), { ok: false, reason: 'processing' })
      assert.deepEqual(await S.claimCrm(d, PAY_UUID, t0 + S.CRM_PROCESSING_STALE_MS + 1), { ok: false, reason: 'unknown', detail: 'stale_processing' })
      assert.equal((await S.readCrmRecord(d, PAY_UUID)).reason, 'stale_processing')
    })

    test('ficha ilegible o clave no válida: no se envía', async () => {
      const d = storeDir()
      mkdirSync(d, { recursive: true })
      writeFileSync(join(d, PAY_UUID + '.json'), '{no es json')
      assert.deepEqual(await S.claimCrm(d, PAY_UUID), { ok: false, reason: 'unknown', detail: 'corrupt_record' })
      assert.deepEqual(await S.claimCrm(d, '../../etc/passwd'), { ok: false, reason: 'store_error', detail: 'invalid_key' })
    })

    test('sin directorio escribible no se envía nada (falla cerrado)', async () => {
      const file = join(crmCfg.contentDir, 'bloqueo')
      writeFileSync(file, 'x')
      state.cfg = { ...CFG, ...crmCfg, contentDir: file }
      state.hubImpl = crmOk
      const r = await confirm()
      await V.settleCrmClients()
      assert.equal(r.value.status, 'APPROVED')
      assert.equal(crmCalls().length, 0)
    })

    test('NUXT_CONTENT_DIR obligatorio, absoluto y fuera de la app: si no, no se envía y se registra crm_store_error', async () => {
      state.hubImpl = crmOk
      let n = 0
      for (const contentDir of ['', '   ', 'relativo/dir', './.data/crediestetica-content', join(process.cwd(), '.data', 'x'), process.cwd(), join(tmpdir(), '.output', 'x')]) {
        state.logs = []
        state.cfg = { ...CFG, ...crmCfg, contentDir }
        await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID }, '203.0.113.' + (++n + 50)))
        await V.settleCrmClients()
        assert.ok(state.logs.some(l => l.includes('"event":"crm_store_error"')), JSON.stringify(contentDir))
      }
      assert.equal(crmCalls().length, 0)
      assert.equal(S.crmStoreDir({ contentDir: '' }).detail, 'not_configured')
      assert.equal(S.crmStoreDir({ contentDir: 'a/b' }).detail, 'not_absolute')
      assert.equal(S.crmStoreDir({ contentDir: join(process.cwd(), 'x') }).detail, 'inside_app')
      assert.equal(S.crmStoreDir({ contentDir: join(tmpdir(), 'ok') }, process.cwd()).ok, true)
    })

    test('logs estructurados con etiqueta fija: sent, failed y unknown (sin datos personales)', async () => {
      state.cfg = { ...CFG, ...crmCfg }
      const tags = []
      const one = async (impl, ip) => {
        rmSync(storeDir(), { recursive: true, force: true })
        state.logs = []
        state.hubImpl = impl
        await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID }, ip))
        await V.settleCrmClients()
        const line = state.logs.find(l => /"event":"crm_/.test(l))
        tags.push(JSON.parse(line.slice(line.indexOf('{'))))
      }
      await one(crmOk, '203.0.113.90')
      await one(async url => (url === CRM_URL ? { status: 422, _data: {} } : approved()), '203.0.113.91')
      await one(async url => (url === CRM_URL ? { status: 502, _data: {} } : approved()), '203.0.113.92')
      assert.deepEqual(tags.map(t => t.event), ['crm_send_sent', 'crm_send_failed', 'crm_send_unknown'])
      assert.ok(tags.every(t => t.payment === PAY_UUID))
      assert.equal(tags[1].retryable, false)
    })

    test('listCrmPending localiza lo que requiere conciliación (todo menos sent)', async () => {
      state.cfg = { ...CFG, ...crmCfg }
      state.hubImpl = async url => (url === CRM_URL ? { status: 502, _data: {} } : approved())
      await confirm()
      await V.settleCrmClients()
      const pend = await S.listCrmPending(storeDir())
      assert.deepEqual(pend.map(p => [p.key, p.state]), [[PAY_UUID, 'unknown']])
    })

    test('lock de otro proceso vivo (sin importar su edad): no se roba, no se envía (crm_lock_timeout)', async () => {
      const d = storeDir()
      mkdirSync(d, { recursive: true })
      const { hostname } = await import('node:os')
      writeFileSync(S.crmLockPath(d, PAY_UUID), JSON.stringify({ token: 'ajeno', pid: process.pid, host: hostname(), at: 1 }))
      assert.deepEqual(await S.claimCrm(d, PAY_UUID, Date.now(), { lockWaitMs: 150 }), { ok: false, reason: 'lock_timeout' })
      assert.equal(JSON.parse(readFileSync(S.crmLockPath(d, PAY_UUID), 'utf8')).token, 'ajeno')
    })

    describe('clasificación de errores REALES de ofetch (red local controlada, sin CRM)', () => {
      let ofetch, servers
      const listen = async handler => { const s = createServer(handler); await new Promise(r => s.listen(0, '127.0.0.1', r)); servers.push(s); return s.address().port }
      const real = (url, timeout = 1500) => ofetch.raw(url, { method: 'POST', body: { a: 1 }, retry: 0, timeout, redirect: 'manual', ignoreResponseError: true })
      const classify = async (url, timeout) => { try { await real(url, timeout); return 'sin-error' } catch (e) { return V.classifyCrmError(e) } }
      before(async () => { ({ ofetch } = await import('ofetch')); servers = [] })
      after(() => { for (const s of servers) { s.closeAllConnections?.(); s.close() } })

      test('puerto cerrado (127.0.0.1 y localhost/AggregateError) → failed', async () => {
        const tmpSrv = createServer(); await new Promise(r => tmpSrv.listen(0, '127.0.0.1', r))
        const port = tmpSrv.address().port; await new Promise(r => tmpSrv.close(r))
        assert.equal(await classify(`http://127.0.0.1:${port}/x`), 'failed')
        assert.equal(await classify(`http://localhost:${port}/x`), 'failed')
      })
      test('dominio inexistente → failed', async () => { assert.equal(await classify('http://no-existe.invalid/x'), 'failed') })
      test('tiempo agotado real → unknown', async () => {
        const port = await listen(() => {})
        assert.equal(await classify(`http://127.0.0.1:${port}/x`, 250), 'unknown')
      })
      test('conexión restablecida (socket cerrado / RST) → unknown', async () => {
        const port = await listen((req) => { req.on('data', () => {}); req.on('end', () => req.socket.destroy()) })
        assert.equal(await classify(`http://127.0.0.1:${port}/x`), 'unknown')
        const port2 = await listen((req) => { req.on('data', () => {}); req.on('end', () => (req.socket.resetAndDestroy ? req.socket.resetAndDestroy() : req.socket.destroy())) })
        assert.equal(await classify(`http://127.0.0.1:${port2}/x`), 'unknown')
      })
      test('cadenas sintéticas: mixtas, sin código, anidadas y circulares', () => {
        const agg = new AggregateError([Object.assign(new Error('a'), { code: 'ECONNREFUSED' }), Object.assign(new Error('b'), { code: 'ECONNRESET' })])
        assert.equal(V.classifyCrmError(Object.assign(new Error('x'), { cause: agg })), 'unknown')
        assert.equal(V.classifyCrmError(new Error('sin código')), 'unknown')
        assert.equal(V.classifyCrmError(null), 'unknown')
        assert.equal(V.classifyCrmError(Object.assign(new Error('x'), { cause: Object.assign(new Error('y'), { code: 'ETIMEDOUT' }) })), 'unknown')
        assert.equal(V.classifyCrmError(Object.assign(new Error('x'), { cause: Object.assign(new Error('y'), { code: 'ENOTFOUND' }) })), 'failed')
        const a = new Error('a'); a.cause = a; a.code = 'ECONNREFUSED'
        assert.equal(V.classifyCrmError(a), 'failed')
        const t = Object.assign(new Error('t'), { name: 'TimeoutError', cause: Object.assign(new Error('z'), { code: 'ECONNREFUSED' }) })
        assert.equal(V.classifyCrmError(t), 'unknown')
      })
      test('flujo completo con red real hacia el CRM simulado local: puerto cerrado → failed reintentable; redirección no se sigue; timeout → unknown', async () => {
        const realRaw = globalThis.$fetch.raw
        try {
          const tmpSrv = createServer(); await new Promise(r => tmpSrv.listen(0, '127.0.0.1', r))
          const closed = tmpSrv.address().port; await new Promise(r => tmpSrv.close(r))
          const flow = async (url, ip) => {
            rmSync(storeDir(), { recursive: true, force: true })
            state.cfg = { ...CFG, ...crmCfg, crmClientUrl: url }
            state.hubImpl = approved
            // El Hub sigue simulado: solo la llamada al CRM sale por la red real (a un servidor local).
            globalThis.$fetch.raw = (u, o) => (u === url ? ofetch.raw(u, { ...o, timeout: Math.min(o.timeout, 300) }) : realRaw(u, o))
            await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID }, ip))
            await V.settleCrmClients()
            return record()
          }
          const r1 = await flow(`http://127.0.0.1:${closed}/api/chat/create/client`, '203.0.113.101')
          assert.equal(r1.state, 'failed'); assert.equal(r1.retryable, true); assert.equal(r1.reason, 'no_connection')
          let hitsB = 0
          const portB = await listen((req, res) => { hitsB++; res.end('{"ok":true}') })
          const portA = await listen((req, res) => { req.resume(); res.writeHead(307, { Location: `http://127.0.0.1:${portB}/robado` }); res.end() })
          const r2 = await flow(`http://127.0.0.1:${portA}/api/chat/create/client`, '203.0.113.102')
          assert.equal(r2.state, 'unknown'); assert.equal(r2.reason, 'redirect_not_followed'); assert.equal(hitsB, 0)
          const portH = await listen(() => {})
          const r3 = await flow(`http://127.0.0.1:${portH}/api/chat/create/client`, '203.0.113.103')
          assert.equal(r3.state, 'unknown'); assert.equal(r3.reason, 'no_response')
        } finally { globalThis.$fetch.raw = realRaw }
      })
    })

    test('ni los logs ni la ficha contienen datos personales', async () => {
      state.cfg = { ...CFG, ...crmCfg }
      state.hubImpl = async url => (url === CRM_URL ? { status: 500, _data: { detail: 'Ana Prueba 3001234567 1020434966 ana@example.com' } } : approved())
      await confirm()
      await V.settleCrmClients()
      const all = state.logs.join('\n') + readFileSync(join(storeDir(), PAY_UUID + '.json'), 'utf8')
      for (const pii of ['Ana', '3001234567', '1020434966', 'ana@example.com', 'asesora@example.test']) assert.equal(all.includes(pii), false, pii)
    })

    test('crmPhone antepone 57 solo a celulares colombianos de 10 dígitos', () => {
      assert.equal(V.crmPhone('300 123 4567'), '573001234567')
      assert.equal(V.crmPhone('+57 300 123 4567'), '573001234567')
      assert.equal(V.crmPhone('6041234567'), '6041234567')
    })
  })

  test('cédula ausente o inválida: el correo la marca «No informada» y el pago se procesa igual', async () => {
    state.hubImpl = async () => approved()
    await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID, document: '<script>x</script>' }))
    await mail.settleNotifications()
    assert.equal(state.sent.length, 1)
    assert.match(state.sent[0].text, /No informada/)
    assert.equal(state.sent[0].text.includes('script'), false)
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

describe('destinatarios del correo de confirmación del pago (aislados de los demás formularios)', () => {
  const PAY_TO = 'convenioscrediestetica@gmail.com'
  const DESIGNER = 'disenadoraplanmed@gmail.com'
  const pay = async () => {
    state.hubImpl = async () => approved()
    await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID, transaction_id: 'tx-999', document: '1020434966' }))
    await mail.settleNotifications()
  }

  test('el TO del pago es exactamente convenioscrediestetica@gmail.com, sin CC ni BCC', async () => {
    await pay()
    assert.equal(state.sent.length, 1)
    const msg = state.sent[0]
    assert.deepEqual(msg.to, [PAY_TO])
    assert.equal('cc' in msg, false)
    assert.equal('bcc' in msg, false)
  })

  test('aunque valuationCc (y la copia de los demás formularios) tenga a la diseñadora, el pago no la recibe', async () => {
    state.cfg = { ...CFG, valuationTo: 'otro@example.test', valuationCc: DESIGNER, creditStudyTo: PAY_TO, creditStudyCc: DESIGNER, leadFormTo: PAY_TO, leadFormCc: DESIGNER, referralTo: PAY_TO, referralCc: DESIGNER }
    await pay()
    assert.equal(state.sent.length, 1)
    const msg = state.sent[0]
    assert.deepEqual(msg.to, [PAY_TO])
    assert.equal('cc' in msg, false)
    assert.equal('bcc' in msg, false)
    assert.equal(JSON.stringify({ to: msg.to, cc: msg.cc, bcc: msg.bcc }).includes(DESIGNER), false)
  })

  test('una clave de copia del pago (valuationPayCc) o cualquier otra no puede añadirle CC', async () => {
    state.cfg = { ...CFG, valuationPayCc: DESIGNER, valuationPayBcc: DESIGNER }
    await pay()
    const msg = state.sent[0]
    assert.deepEqual(msg.to, [PAY_TO])
    assert.equal('cc' in msg, false)
    assert.equal('bcc' in msg, false)
    const cfg = V.resolvePayMailConfig(state.cfg)
    assert.equal(cfg.ok, true)
    assert.deepEqual(cfg.config.cc, [])
  })

  test('el comprobante PDF sigue adjunto', async () => {
    await pay()
    const [att] = state.sent[0].attachments
    assert.equal(att.contentType, 'application/pdf')
    assert.ok(Buffer.from(att.content).toString('latin1').startsWith('%PDF'))
  })

  test('sin valuationPayTo el pago NO usa valuationTo/Cc de respaldo: no se envía correo', async () => {
    const { valuationPayTo, ...sin } = CFG
    state.cfg = { ...sin, valuationTo: 'otro@example.test', valuationCc: DESIGNER }
    await pay()
    assert.equal(state.sent.length, 0)
  })

  test('varias direcciones en valuationPayTo bloquean el envío (el pago tiene un único destinatario)', async () => {
    state.cfg = { ...CFG, valuationPayTo: `${PAY_TO}, ${DESIGNER}` }
    assert.equal(V.resolvePayMailConfig(state.cfg).ok, false)
    await pay()
    assert.equal(state.sent.length, 0)
  })

  test('un pago no aprobado no envía correo', async () => {
    for (const status of ['PENDING', 'DECLINED', 'ERROR', 'VOIDED']) {
      state.hubImpl = async () => ({ status: 200, _data: { payment: { uuid: PAY_UUID, status } } })
      await run(V.handleValuationPayConfirm, ev({ payment_uuid: PAY_UUID }))
    }
    await mail.settleNotifications()
    assert.equal(state.sent.length, 0)
  })

  test('los demás formularios conservan sus claves y destinatarios', () => {
    assert.deepEqual(mail.CREDIT_STUDY_RECIPIENTS, { to: 'creditStudyTo', cc: 'creditStudyCc' })
    assert.deepEqual(mail.LEAD_FORM_RECIPIENTS, { to: 'leadFormTo', cc: 'leadFormCc' })
    assert.deepEqual(mail.VALUATION_RECIPIENTS, { to: 'valuationTo', cc: 'valuationCc' })
    assert.deepEqual(mail.REFERRAL_RECIPIENTS, { to: 'referralTo', cc: 'referralCc' })
    assert.deepEqual(mail.VALUATION_PAY_RECIPIENTS, { to: 'valuationPayTo' })
    const cfg = { ...CFG, creditStudyTo: PAY_TO, creditStudyCc: DESIGNER, leadFormTo: PAY_TO, leadFormCc: DESIGNER, valuationCc: DESIGNER, referralTo: PAY_TO, referralCc: DESIGNER }
    for (const keys of [mail.CREDIT_STUDY_RECIPIENTS, mail.LEAD_FORM_RECIPIENTS, mail.REFERRAL_RECIPIENTS]) {
      const r = mail.resolveMailConfig(cfg, keys)
      assert.equal(r.ok, true)
      assert.deepEqual(r.config.to, [PAY_TO])
      assert.deepEqual(r.config.cc, [DESIGNER])
    }
    const val = mail.resolveMailConfig(cfg, mail.VALUATION_RECIPIENTS)
    assert.deepEqual(val.config.to, ['destino@example.test'])
    assert.deepEqual(val.config.cc, [DESIGNER])
  })

  test('nuxt.config: el pago tiene su propia clave fija y no existe clave de CC del pago; las demás no cambian', () => {
    const cfg = read('nuxt.config.ts')
    assert.match(cfg, new RegExp("valuationPayTo: '" + PAY_TO.replace('.', '\.') + "'"))
    assert.equal(/valuationPayCc|VALUATION_PAY_CC/i.test(cfg), false)
    for (const k of ['creditStudyCc', 'leadFormCc', 'valuationCc', 'referralCc']) assert.match(cfg, new RegExp(k + ": 'disenadoraplanmed@gmail\.com'"))
    for (const k of ['creditStudyTo', 'leadFormTo', 'valuationTo', 'referralTo']) assert.match(cfg, new RegExp(k + ": '" + PAY_TO.replace('.', '\.') + "'"))
    const pay = read('server/utils/valuationPayment.ts')
    assert.equal(pay.includes('VALUATION_RECIPIENTS'), false)
    assert.match(pay, /VALUATION_PAY_RECIPIENTS/)
  })
})

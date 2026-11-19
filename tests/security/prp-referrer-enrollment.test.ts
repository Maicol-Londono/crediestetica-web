// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Inscripción al PRP desde el micrositio /prp/[slug]: el `external_code` del referidor lo resuelve el SERVIDOR con Hub a partir del slug y viaja en el payload
// (y en la clave de idempotencia). Se ejecuta el código REAL del servidor con Hub y SMTP SIMULADOS: no se llama a ningún sistema externo ni se hace
// ninguna inscripción real. Slugs, códigos, nombres, documentos y direcciones de este archivo son FICTICIOS.
import { test, describe, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from '../recommendations/harness.ts'

const fileUrl = rel => pathToFileURL(join(ROOT, rel)).href
const read = rel => readFileSync(join(ROOT, rel), 'utf8')
const SECRET = 'x'.repeat(40)
const SLUG = 'referidora-demo'
const CODE = 'REF001'
const OTHER_SLUG = 'otra-referidora'
const OTHER_CODE = 'REF002'

const state = { cfg: {}, logs: [], hubCalls: [], referrerCalls: [], referrerImpl: null, hubImpl: null }
let dir, enrol, referral, mail, shared, service, realError, realFetch

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'prp-referrer-'))
  realError = console.error
  console.error = (...a) => { state.logs.push(a.map(String).join(' ')) }
  const g = globalThis
  realFetch = g.fetch
  g.fetch = () => { throw new Error('sin red en las pruebas') }
  g.createError = o => Object.assign(new Error(o.message ?? 'error'), o)
  g.useRuntimeConfig = () => state.cfg
  g.setHeader = () => {}
  g.assertSameOrigin = () => {}
  g.getRequestIP = e => e.ip
  g.getRequestHeader = (e, name) => e.headers?.[name.toLowerCase()]
  g.readBody = async e => e.body
  g.wellezyPublicGet = async (event, path) => { state.referrerCalls.push(path); return state.referrerImpl(path) }
  g.wellezyPublicPost = async (event, path, payload, headers) => { state.hubCalls.push({ path, payload, headers }); return state.hubImpl({ path, payload, headers }) }
  const base = fileUrl('shared/utils')
  const fix = s => s.replace(/'#shared\/utils\/([A-Za-z]+)'/g, (_, m) => `'${base}/${m}.ts'`)
    .replace("'./formMail'", "'./formMail.ts'").replace("'./referral'", "'./referral.ts'").replace("'./prpReferrer'", "'./prpReferrer.ts'")
  for (const f of ['formMail', 'referral', 'prpEnrollment', 'prpReferrer']) writeFileSync(join(dir, `${f}.ts`), fix(read(`server/utils/${f}.ts`)))
  enrol = await import(pathToFileURL(join(dir, 'prpEnrollment.ts')).href)
  referral = await import(pathToFileURL(join(dir, 'referral.ts')).href)
  mail = await import(pathToFileURL(join(dir, 'formMail.ts')).href)
  shared = await import(fileUrl('shared/utils/prpEnrollment.ts'))
  service = await import(fileUrl('services/ReferralService.ts'))
})

beforeEach(() => {
  // Sin SMTP configurado: el correo de respaldo se omite (no es objeto de estas pruebas).
  state.cfg = { sessionPassword: SECRET, trustedProxyHops: 0, public: { appName: 'Marca de prueba' } }
  state.logs = []
  state.hubCalls = []
  state.referrerCalls = []
  // Hub (lectura pública): solo devuelve referidores ACTIVOS; uno inexistente o inactivo es 404.
  state.referrerImpl = async (path) => {
    const known = { [SLUG]: CODE, [OTHER_SLUG]: OTHER_CODE }
    const slug = path.replace('/v1/web/prp/', '')
    return known[slug] ? { status: 200, data: { data: { name: 'Referidora Demo', slug, title: null, external_code: known[slug] } } } : { status: 404, data: { message: 'No encontrado' } }
  }
  state.hubImpl = async () => ({ status: 201, data: { data: { status: 'completed' } } })
  enrol.resetEnrollmentGuards()
  mail.resetMailGuards()
})

after(() => {
  console.error = realError
  globalThis.fetch = realFetch
  mail.resetMailGuards()
  rmSync(dir, { recursive: true, force: true })
})

const CASH = {
  prp_slug: SLUG,
  full_name: 'Ana María Prueba', phone: '300 123 4567', email: 'Ana.Prueba@Example.com', document_type: 'Cédula de ciudadanía', document_number: '1.098.765.432',
  surgery_date: '2025-03-10', surgery_name: 'Rinoplastia', wants_control: true, payment_method: 'Efectivo', suggestion: 'Todo muy bien, gracias.',
  bank_holder_name: '', bank_holder_document: '', bank_account_number: '', accepted_contract: true
}
const event = (body = { ...CASH }) => ({ method: 'POST', ip: '203.0.113.40', body, headers: { 'content-length': '900', 'content-type': 'application/json' } })
const run = async (fn, e) => { try { return { value: await fn(e) } } catch (error) { return { error } } }
// Cada envío parte sin historial de límite por IP (el límite de peticiones se prueba en otro archivo).
const enroll = (body) => { enrol.resetEnrollmentGuards(); return run(enrol.handlePrpEnrollment, event(body)) }
const keyOf = i => state.hubCalls[i].headers['Idempotency-Key']

describe('1. Inscripción desde un micrositio con código correcto', () => {
  test('el servidor resuelve el referidor del slug con Hub y la inscripción se envía y confirma', async () => {
    const r = await enroll()
    assert.deepEqual(r.value, { ok: true, status: 'completed' })
    assert.deepEqual(state.referrerCalls, [`/v1/web/prp/${SLUG}`], 'lee el referidor del micrositio, una vez')
    assert.equal(state.hubCalls.length, 1)
    assert.equal(state.hubCalls[0].path, '/v1/web/prp-enrollments')
  })
  test('«received» (Hub guardó, CRM pendiente) también es aceptado, igual que antes', async () => {
    state.hubImpl = async () => ({ status: 201, data: { data: { status: 'received' } } })
    assert.deepEqual((await enroll()).value, { ok: true, status: 'received' })
  })
})

describe('2. El código correcto llega a Hub y el contrato se conserva', () => {
  test('payload a Hub: external_code del referidor + los campos del contrato actual, sin campos extra', async () => {
    await enroll()
    const p = state.hubCalls[0].payload
    assert.equal(p.external_code, CODE)
    assert.deepEqual(Object.keys(p).sort(), ['accepted_contract', 'document_number', 'document_type', 'email', 'external_code', 'full_name', 'payment_method', 'phone', 'suggestion', 'surgery_date', 'surgery_name', 'wants_control'])
    assert.equal(p.payment_method, 'efectivo')
    assert.equal(p.document_type, 'CÉDULA DE CIUDADANÍA')
    assert.equal(p.accepted_contract, true)
    assert.equal('prp_slug' in p, false, 'el slug no viaja a Hub: solo el código resuelto')
    assert.match(keyOf(0), /^[0-9a-f]{48}$/)
  })
  test('con transferencia viajan los datos bancarios y el external_code; no hay empresa ni línea del navegador', async () => {
    await enroll({ ...CASH, payment_method: 'Transferencia Bancaria (Bancolombia)', bank_holder_name: 'Ana María Prueba', bank_holder_document: '1020304050', bank_account_number: '12345678901', company_id: 99, linea_id: 99 })
    const p = state.hubCalls[0].payload
    assert.equal(p.external_code, CODE)
    assert.equal(p.payment_method, 'transferencia')
    assert.equal(p.bank_account_number, '12345678901')
    for (const k of ['company_id', 'linea_id', 'prp_slug']) assert.equal(k in p, false, k)
  })
})

describe('3. La clave de idempotencia (HMAC) incluye el external_code', () => {
  test('la clave es el HMAC del payload completo, que contiene el external_code', async () => {
    await enroll()
    assert.equal(keyOf(0), referral.enrollmentKey(SECRET, state.hubCalls[0].payload))
    assert.equal(state.hubCalls[0].payload.external_code, CODE)
  })
  test('los mismos datos con OTRO referidor producen OTRA clave (no pueden colisionar entre referidores)', async () => {
    await enroll()
    await enroll({ ...CASH, prp_slug: OTHER_SLUG })
    assert.equal(state.hubCalls[1].payload.external_code, OTHER_CODE)
    assert.notEqual(keyOf(0), keyOf(1))
  })
})

describe('4. Reintentos: mismo código y misma clave', () => {
  test('reintentar el mismo envío (también tras un fallo de Hub) usa el mismo código y la misma Idempotency-Key', async () => {
    state.hubImpl = async () => ({ status: 503 })
    const first = await enroll()
    assert.equal(first.error?.statusCode, 503)
    state.hubImpl = async () => ({ status: 200, data: { data: { status: 'completed' } } })
    const again = await enroll()
    assert.equal(again.value?.ok, true)
    assert.equal(state.hubCalls.length, 2)
    assert.equal(state.hubCalls[0].payload.external_code, CODE)
    assert.equal(state.hubCalls[1].payload.external_code, CODE)
    assert.equal(keyOf(0), keyOf(1))
    assert.deepEqual(state.hubCalls[0].payload, state.hubCalls[1].payload)
  })
  test('Hub 409 (misma clave con otro contenido) se informa sin reintentar con otro referidor', async () => {
    state.hubImpl = async () => ({ status: 409, data: {} })
    const r = await enroll()
    assert.equal(r.error?.statusCode, 409)
    assert.equal(state.hubCalls.length, 1)
  })
})

describe('5. Rechazo cuando no existe referidor', () => {
  test('micrositio inexistente: 404, no se envía nada a Hub y no hay fallback a otro código', async () => {
    const r = await enroll({ ...CASH, prp_slug: 'no-existe' })
    assert.equal(r.error?.statusCode, 404)
    assert.equal(r.error?.data?.reason, 'referrer_not_found')
    assert.equal(state.hubCalls.length, 0)
  })
  test('sin slug o con un slug inválido: 422, sin consultar a Hub ni inscribir', async () => {
    const { prp_slug, ...sinSlug } = CASH
    for (const body of [sinSlug, { ...CASH, prp_slug: '' }, { ...CASH, prp_slug: '../admin' }, { ...CASH, prp_slug: 'MAYUS' }, { ...CASH, prp_slug: { a: 1 } }, { ...CASH, prp_slug: 'a'.repeat(300) }, { ...CASH, prp_slug: null }]) {
      const r = await enroll(body)
      assert.equal(r.error?.statusCode, 422, JSON.stringify(body.prp_slug))
      assert.equal(r.error?.data?.reason, 'referrer_required')
    }
    assert.equal(state.referrerCalls.length, 0)
    assert.equal(state.hubCalls.length, 0)
  })
  test('nunca se deriva el código del slug, del nombre ni de un valor por defecto', async () => {
    state.referrerImpl = async () => ({ status: 200, data: { data: { name: 'Referidora Demo', slug: SLUG, title: null } } }) // sin external_code
    const r = await enroll()
    assert.equal(r.error?.statusCode, 503)
    assert.equal(state.hubCalls.length, 0)
    for (const bad of ['', '   ', 'DOS PALABRAS', 'X'.repeat(51), 12, null]) {
      state.referrerImpl = async () => ({ status: 200, data: { data: { external_code: bad } } })
      assert.equal((await enroll()).error?.statusCode, 503, String(bad))
    }
    assert.equal(state.hubCalls.length, 0)
  })
  test('si Hub no responde al leer el referidor: 503 reintentable y NO se inscribe (sin referidor no hay inscripción)', async () => {
    for (const reply of [{ status: 0 }, { status: 500 }]) {
      state.referrerImpl = async () => reply
      const r = await enroll()
      assert.equal(r.error?.statusCode, 503)
      assert.equal(r.error?.data?.retryable, true)
    }
    assert.equal(state.hubCalls.length, 0)
  })
})

describe('6. Rechazo cuando el referidor está inactivo', () => {
  test('Hub no entrega referidores inactivos (404): la inscripción se rechaza sin llegar a Hub', async () => {
    state.referrerImpl = async () => ({ status: 404, data: { message: 'No encontrado' } }) // inactivo = no publicado
    const r = await enroll()
    assert.equal(r.error?.statusCode, 404)
    assert.equal(r.error?.data?.reason, 'referrer_not_found')
    assert.equal(state.hubCalls.length, 0)
  })
  test('referidor desactivado ENTRE la lectura y el envío: Hub responde 422 external_code → se rechaza, sin reintentar con otro', async () => {
    state.hubImpl = async () => ({ status: 422, data: { errors: { external_code: ['El código del referidor no es válido.'] } } })
    const r = await enroll()
    assert.equal(r.error?.statusCode, 422)
    assert.equal(r.error?.data?.reason, 'referrer_invalid')
    assert.deepEqual(r.error?.data?.errors ?? {}, {})
    assert.equal(state.hubCalls.length, 1)
    assert.equal(state.referrerCalls.length, 1)
  })
})

describe('7. La persona no puede alterar el código desde el navegador', () => {
  test('un external_code (o variantes) en el cuerpo se ignora: Hub recibe el del referidor resuelto', async () => {
    await enroll({ ...CASH, external_code: 'HACK', externalCode: 'HACK', code_prp: 'HACK', codePrp: 'HACK', referrer: 'HACK', prp_referrer_id: 7 })
    assert.equal(state.hubCalls[0].payload.external_code, CODE)
    assert.doesNotMatch(JSON.stringify(state.hubCalls[0].payload), /HACK/)
    assert.equal(state.hubCalls[0].payload.prp_referrer_id, undefined)
  })
  test('con un slug inexistente y un external_code «válido» en el cuerpo igualmente se rechaza (el código del navegador no sirve)', async () => {
    const r = await enroll({ ...CASH, prp_slug: 'no-existe', external_code: CODE })
    assert.equal(r.error?.statusCode, 404)
    assert.equal(state.hubCalls.length, 0)
  })
  test('el servicio del navegador envía el slug del micrositio y NUNCA un external_code', async () => {
    const calls = []
    const svc = new service.ReferralService(async (url, options) => { calls.push({ url, options }); return { ok: true, status: 'completed' } })
    const value = shared.normalizeEnrollment({ ...CASH, external_code: 'HACK' })
    await svc.submit(value, SLUG)
    assert.equal(calls[0].url, '/api/forms/prp-enrollment')
    assert.equal(calls[0].options.body.prp_slug, SLUG)
    assert.equal('external_code' in calls[0].options.body, false)
    assert.doesNotMatch(JSON.stringify(calls[0].options.body), /HACK/)
  })
  test('el contrato compartido: el código lo exige buildHubPayload (no hay payload sin referidor) y el slug se valida', () => {
    const value = shared.normalizeEnrollment(CASH)
    for (const bad of ['', undefined, null, 'DOS PALABRAS', 'X'.repeat(51)]) assert.throws(() => shared.buildHubPayload(value, bad), /Referidor no resuelto/)
    assert.equal(shared.buildHubPayload(value, CODE).external_code, CODE)
    assert.equal(shared.readPrpSlug({ prp_slug: ` ${SLUG} ` }), SLUG)
    assert.equal(shared.readPrpSlug({ external_code: CODE }), '')
  })
})

describe('Reintento del correo (POST /api/forms/referral) usa el mismo referidor', () => {
  test('sin slug no se calcula ninguna clave y se rechaza; con slug la clave coincide con la de la inscripción', async () => {
    const { prp_slug, ...sinSlug } = CASH
    const bad = await run(referral.handleReferral, event(sinSlug))
    assert.equal(bad.error?.statusCode, 422)
    await enroll()
    const key = keyOf(0)
    // Con el slug se resuelve el mismo código ⇒ misma clave ⇒ el estado del correo se consulta por esa clave (aquí no consta pendiente: 409 «no confirmada»).
    const ok = await run(referral.handleReferral, event())
    assert.equal(ok.error?.statusCode, 409)
    assert.equal(referral.enrollmentKey(SECRET, shared.buildHubPayload(shared.normalizeEnrollment(CASH), CODE)), key)
  })
})

// ---------------------------------------------------------------------------------------------------------------------------------------------------------

const walk = (d, out = []) => {
  for (const n of readdirSync(d)) {
    const f = join(d, n)
    if (statSync(f).isDirectory()) { if (!['node_modules', '.nuxt', '.output', '.output-uat-portable', '.git', 'dist', 'tests', 'documentacion', 'docs'].includes(n)) walk(f, out) } else if (/\.(vue|ts)$/.test(n)) out.push(f)
  }
  return out
}
const rel = f => relative(ROOT, f).replace(/\\/g, '/')

describe('8. Separación de formularios: solo el micrositio inscribe al PRP', () => {
  const files = walk(ROOT)

  test('únicamente pages/prp/[slug].vue monta ReferralForm; la página genérica de referidos no', () => {
    const users = files.filter(f => /<ReferralForm[\s>]/.test(readFileSync(f, 'utf8'))).map(rel)
    assert.deepEqual(users, ['pages/prp/[slug].vue'])
    assert.doesNotMatch(read('pages/testimonios/programa-de-referidos.vue'), /ReferralForm/)
  })

  test('solo ReferralService (usado por ReferralForm) llama al endpoint de inscripción PRP', () => {
    // Solo cuentan las referencias de código (la ruta entre comillas), no los comentarios.
    const callers = files.filter(f => /['"`]\/api\/forms\/prp-enrollment['"`]/.test(readFileSync(f, 'utf8'))).map(rel)
    assert.deepEqual(callers, ['services/ReferralService.ts'])
    assert.match(read('components/referral/ReferralForm.vue'), /referralService\.submit\(payload, props\.slug\)/)
  })

  test('financiación, estudio de crédito, valoración y simulador no invocan el endpoint PRP ni envían external_code/prp_slug', () => {
    const generic = [
      'server/api/forms/lead.post.ts', 'server/utils/leadForm.ts', 'services/LeadService.ts', 'components/forms/LeadForm.vue',
      'server/api/forms/credit-study.post.ts', 'server/utils/creditStudy.ts', 'services/CreditStudyService.ts',
      'server/api/forms/valuation.post.ts', 'server/utils/valuation.ts', 'shared/utils/valuation.ts', 'services/ValuationService.ts', 'components/forms/ValuationRequest.vue',
      'pages/financiacion.vue', 'pages/estudio-de-creditos.vue', 'composables/useSimulator.ts'
    ]
    for (const f of generic) {
      const src = read(f)
      assert.doesNotMatch(src, /prp-enrollment|prp_slug|external_code|ReferralForm|ReferralService|prpReferrer/i, f)
    }
  })

  test('el endpoint genérico de correo de referidos no se invoca desde ningún formulario', () => {
    const callers = files.filter(f => /api\/forms\/referral['"`]/.test(readFileSync(f, 'utf8'))).map(rel)
    assert.deepEqual(callers, [])
  })
})

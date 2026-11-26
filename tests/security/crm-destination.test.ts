// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Destinos de CRM ausentes o inválidos (valoración y PRP) y guardia de tenant vacío hacia Hub.
// Se ejecuta el código REAL del servidor (copiado a un directorio temporal solo para resolver los alias `#shared/`).
import { test, describe, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from '../recommendations/harness.ts'

const fileUrl = rel => pathToFileURL(join(ROOT, rel)).href
const SHARED_VALUATION = 'https://pdtclientsolutions.com/crm-public/api/clients/forms'
const SHARED_PRP = 'https://pdtclientsolutions.com/crm-public/api/forms-px-prp'
const OWN_CRM = 'https://crm.crediestetica.example/api/forms' // destino hipotético válido SOLO para las pruebas

const state = { cfg: {}, fetchCalls: [], hubCalls: [], rawCalls: [] }
let dir, D, handleValuation, prpGet, W

// Copia el archivo del servidor reescribiendo `#shared/utils/<x>` a la ruta real del módulo compartido (Node no conoce los alias de Nuxt).
const copyServer = (rel, name) => {
  const base = fileUrl('shared/utils')
  const fix = src => src.replace(/'#shared\/utils\/([A-Za-z]+)'/g, (_, m) => `'${base}/${m}.ts'`).replace("'./formMail'", "'./formMail.ts'").replace("'./crmClient'", "'./crmClient.ts'")
  writeFileSync(join(dir, 'formMail.ts'), fix(readFileSync(join(ROOT, 'server/utils/formMail.ts'), 'utf8'))) // el módulo de valoración ahora importa el núcleo de correo
  writeFileSync(join(dir, 'crmClient.ts'), fix(readFileSync(join(ROOT, 'server/utils/crmClient.ts'), 'utf8')))
  writeFileSync(join(dir, name), fix(readFileSync(join(ROOT, rel), 'utf8')))
  return import(pathToFileURL(join(dir, name)).href)
}
const run = async (fn, e) => { try { return { value: await fn(e) } } catch (error) { return { error } } }

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'crm-dest-'))
  const g = globalThis
  g.defineEventHandler = fn => fn
  g.createError = o => Object.assign(new Error(o.message ?? 'error'), o)
  g.useRuntimeConfig = () => state.cfg
  g.setHeader = () => {}
  g.assertSameOrigin = () => {}
  g.getRequestIP = () => '203.0.113.9'
  g.getRequestHeader = () => undefined
  g.readBody = async e => e.body
  g.getRouterParam = (e, n) => e.params?.[n]
  g.fetch = async (...args) => { state.fetchCalls.push(args); return { ok: true, status: 200, json: async () => ({}) } }
  g.wellezyPublicGet = async (...args) => { state.hubCalls.push(args); return { status: 404, data: {} } }
  g.$fetch = { raw: async (...args) => { state.rawCalls.push(args); return { status: 200, _data: {} } } }
  D = await import(fileUrl('shared/utils/crmDestination.ts'))
  handleValuation = (await copyServer('server/utils/valuation.ts', 'valuation.ts')).handleValuation
  prpGet = (await copyServer('server/api/public/prp/[slug].get.ts', 'prp.ts')).default
  W = await import(fileUrl('server/utils/wellezy.ts'))
})
beforeEach(() => { state.cfg = {}; state.fetchCalls = []; state.hubCalls = []; state.rawCalls = [] })
after(() => rmSync(dir, { recursive: true, force: true }))

describe('crmDestinationProblem', () => {
  test('bloquea ausente, vacío, inválido, sin https y credenciales embebidas', () => {
    for (const v of [undefined, null, '', '   ']) assert.equal(D.crmDestinationProblem(v), 'not_configured', String(v))
    for (const v of ['no es url', 'ftp://crm.example/x', 'http://crm.example/x', 'https://user:pw@crm.example/x', 'javascript:alert(1)']) assert.equal(D.crmDestinationProblem(v), 'invalid', v)
  })
  test('el CRM compartido es un destino válido: no se bloquea ningún endpoint por su dirección', () => {
    for (const v of [SHARED_VALUATION, SHARED_PRP]) assert.equal(D.crmDestinationProblem(v), null, v)
  })
  test('un destino propio válido (https, o http local) no se bloquea', () => {
    assert.equal(D.crmDestinationProblem(OWN_CRM), null)
    assert.equal(D.crmDestinationProblem('http://localhost:8000/crm'), null)
  })
})

describe('POST /api/forms/valuation (handleValuation)', () => {
  test('sin destino, vacío o inválido => 503 y ninguna petición al CRM', async () => {
    const body = { nombres: 'Ana', apellidos: 'Prueba', identificacion: '12345678', fecha_nacimiento: '1990-05-10', direccion: 'Bogotá', telefono: '3001234567', email: 'ana@example.com', name_surgery: 'Rinoplastia', forma_pago: 'Contado', accept: true }
    for (const [i, crmFormUrl] of [undefined, '', '  ', 'x', 'http://crm.example/crm-public/api/clients/forms', SHARED_PRP].entries()) {
      state.cfg = { crmFormUrl, crmFormUserId: '9101', crmFormLineId: '30', crmFormAdvisorId: '9103', crmFormAdvisorEmail: 'asesora@example.test', crmFormCityId: '3', crmFormClinicId: '6' }
      const r = await run(handleValuation, { method: 'POST', body: { ...body, identificacion: '1000000' + i }, headers: {} })
      assert.equal(r.error?.statusCode, 503, String(crmFormUrl))
      assert.equal(r.error.data.reason, 'not_configured')
    }
    assert.equal(state.fetchCalls.length, 0)
  })
})

describe('GET /api/public/prp/[slug]', () => {
  const e = { params: { slug: 'demo' }, headers: {} }
  test('el endpoint de PRP del CRM es compartido con Planmed: ya no se considera heredado', () => {
    for (const v of [SHARED_PRP, SHARED_PRP + '/', 'HTTPS://PDTCLIENTSOLUTIONS.COM/CRM-PUBLIC/API/FORMS-PX-PRP']) assert.equal(D.crmDestinationProblem(v), null, v)
  })
  // La inscripción se procesa en Wellezy Hub: el micrositio ya NO depende del destino del CRM (crmPrpFormUrl), valga lo que valga.
  test('el micrositio consulta a Hub con cualquier valor de crmPrpFormUrl (ausente, inválido, heredado o propio): ya no lo desactiva', async () => {
    for (const crmPrpFormUrl of [SHARED_PRP, '', undefined, 'x', OWN_CRM]) {
      state.hubCalls = []
      state.cfg = { public: { crmPrpFormUrl } }
      await run(prpGet, e)
      assert.equal(state.hubCalls.length, 1, String(crmPrpFormUrl))
    }
    state.hubCalls = []
    state.cfg = {}
    await run(prpGet, e)
    assert.equal(state.hubCalls.length, 1, 'sin ninguna configuración de CRM')
  })
  test('el recurso público entrega solo nombre, slug y título: el external_code del referidor NO llega al navegador', async () => {
    const real = globalThis.wellezyPublicGet
    globalThis.wellezyPublicGet = async () => ({ status: 200, data: { data: { name: 'Referidora Demo', slug: 'demo', title: 'Título', external_code: 'REF001', is_active: true, id: 7 } } })
    try {
      const r = await run(prpGet, e)
      assert.deepEqual(r.value, { name: 'Referidora Demo', slug: 'demo', title: 'Título' })
      assert.doesNotMatch(JSON.stringify(r.value), /REF001|external_code|externalCode/)
    } finally { globalThis.wellezyPublicGet = real }
  })
  test('un referidor inexistente o inactivo (404 de Hub) sigue siendo 404', async () => {
    assert.equal((await run(prpGet, e)).error?.statusCode, 404)
  })
  test('el proveedor del navegador también se niega a enviar (defensa en profundidad)', () => {
    const src = readFileSync(join(ROOT, 'providers/CrmPrpLeadProvider.ts'), 'utf8')
    const guard = src.indexOf('crmDestinationProblem(url)')
    assert.ok(guard > -1, 'hay guardia')
    assert.ok(guard < src.indexOf('await fetch('), 'la guardia va antes del fetch')
  })
})

describe('tenant hacia Hub', () => {
  const ev = {}
  test('línea ausente, vacía o solo espacios: NO se hace petición (nunca X-Tenant-Linea vacío)', async () => {
    for (const wellezyLineSlug of [undefined, null, '', '   ']) {
      state.cfg = { wellezyApiBaseUrl: 'https://hub.test/api', wellezyLineSlug }
      assert.deepEqual(await W.wellezyPublicGet(ev, '/v1/web/x'), { status: 0 }, `GET ${wellezyLineSlug}`)
      assert.deepEqual(await W.wellezyPublicPost(ev, '/v1/web/x', {}), { status: 0 }, `POST ${wellezyLineSlug}`)
    }
    assert.equal(state.rawCalls.length, 0)
  })
  test('con línea configurada se envía exactamente X-Tenant-Linea: crediestetica', async () => {
    state.cfg = { wellezyApiBaseUrl: 'https://hub.test/api', wellezyLineSlug: ' crediestetica ' }
    await W.wellezyPublicGet(ev, '/v1/web/x')
    await W.wellezyPublicPost(ev, '/v1/web/x', {})
    assert.equal(state.rawCalls.length, 2)
    for (const [, opts] of state.rawCalls) assert.equal(opts.headers['X-Tenant-Linea'], 'crediestetica')
  })
})

describe('robots.txt', () => {
  test('el sitemap apunta a crediestetica.com y no a Planmed', () => {
    const robots = readFileSync(join(ROOT, 'public/robots.txt'), 'utf8')
    assert.match(robots, /^Sitemap: https:\/\/crediestetica\.com\/sitemap\.xml\s*$/m)
    assert.ok(!/planmed/i.test(robots))
    assert.match(robots, /^Disallow: \/api\/\s*$/m)
  })
})

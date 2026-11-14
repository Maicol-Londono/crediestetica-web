// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Formulario PRP de Crediestética → CRM médico compartido: payload (con id_line=30), envío habilitado, bloqueo de destinos inválidos y
// separación entre «páginas PRP» y «envío PRP». Se ejecuta el proveedor REAL con `fetch` simulado: NUNCA se llama al CRM.
import { test, describe, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from '../recommendations/harness.ts'

const fileUrl = rel => pathToFileURL(join(ROOT, rel)).href
const read = rel => readFileSync(join(ROOT, rel), 'utf8')
const PRP_URL = 'https://pdtclientsolutions.com/crm-public/api/forms-px-prp'
const LEGACY_VALUATION = 'https://pdtclientsolutions.com/crm-public/api/clients/forms'

const state = { cfg: { public: { crmPrpFormUrl: PRP_URL } }, calls: [], reply: null }
let dir, P, F, ERR

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'prp-form-'))
  globalThis.__prp = state
  globalThis.fetch = async (...args) => {
    state.calls.push(args)
    const r = state.reply ?? { ok: true, status: 200, json: async () => ({ mensagge: 'Registro exitoso' }) }
    if (r instanceof Error) throw r
    return r
  }
  // El proveedor usa alias de Nuxt: se copia reescribiéndolos hacia los módulos reales (y `#imports` hacia la configuración simulada).
  const src = read('providers/CrmPrpLeadProvider.ts')
    .replace("import { useRuntimeConfig } from '#imports'", 'const useRuntimeConfig = () => globalThis.__prp.cfg')
    .replace(/'#shared\/utils\/([A-Za-z]+)'/g, (_, m) => `'${fileUrl(`shared/utils/${m}.ts`)}'`)
    .replace("'~/types/prpPublic'", `'${fileUrl('types/prpPublic.ts')}'`)
  writeFileSync(join(dir, 'provider.ts'), src)
  P = await import(pathToFileURL(join(dir, 'provider.ts')).href)
  F = await import(fileUrl('shared/utils/features.ts'))
  ERR = (await import(fileUrl('types/prpPublic.ts'))).PrpLeadError
})
beforeEach(() => { state.cfg = { public: { crmPrpFormUrl: PRP_URL } }; state.calls = []; state.reply = null })
after(() => { rmSync(dir, { recursive: true, force: true }); delete globalThis.__prp })

const LEAD = { fullName: '  Persona de Prueba  ', phone: ' 3001234567 ', city: ' Medellín ', surgery: ' Rinoplastia ', codePrp: 'ZZ9Q' }
const entries = fd => [...fd.entries()]

describe('payload del formulario PRP', () => {
  test('conserva los ocho campos existentes (mismos nombres y valores) y agrega id_line=30', () => {
    assert.deepEqual(entries(P.buildPrpLeadFormData(LEAD)), [
      ['nombres', 'Persona de Prueba'],
      ['telefono', '3001234567'],
      ['direccion', 'Medellín'],
      ['name_surgery', 'Rinoplastia'],
      ['state', 'No Contactada'],
      ['origen', 'Formulario Web'],
      ['code_prp', 'ZZ9Q'],
      ['accept', '1'],
      ['id_line', '30']
    ])
  })
  test('id_line llega exactamente una vez, como texto «30»', () => {
    const fd = P.buildPrpLeadFormData(LEAD)
    assert.deepEqual(fd.getAll('id_line'), ['30'])
    assert.equal(P.CRM_PRP_ID_LINE, '30')
  })
  test('code_prp conserva el valor dinámico recibido de Hub (no se fija ni se transforma)', () => {
    for (const codePrp of ['ZZ9Q', 'PM5N', 'ab-12']) assert.equal(P.buildPrpLeadFormData({ ...LEAD, codePrp }).get('code_prp'), codePrp)
    assert.doesNotMatch(read('providers/CrmPrpLeadProvider.ts'), /code_prp', '[A-Za-z0-9]/)
  })
  test('id_line es el id del CRM médico: no es el linea_id (4) ni el company_id (16) de Hub, ni el de Planmed (16), y no se envían campos de Hub', () => {
    const fd = P.buildPrpLeadFormData(LEAD)
    assert.notEqual(fd.get('id_line'), '4')
    assert.notEqual(fd.get('id_line'), '16')
    for (const name of ['linea_id', 'line_id', 'company_id', 'id_user', 'id_user_asesora']) assert.equal(fd.has(name), false, name)
  })
})

describe('envío del formulario PRP', () => {
  test('con el destino compartido aprobado, el envío se realiza (una petición POST multipart) y es aceptado', async () => {
    await new P.CrmPrpLeadProvider().submit(LEAD)
    assert.equal(state.calls.length, 1)
    const [url, init] = state.calls[0]
    assert.equal(url, PRP_URL)
    assert.equal(init.method, 'POST')
    assert.ok(init.body instanceof FormData)
    assert.equal(init.body.get('id_line'), '30')
    assert.equal(init.headers['Content-Type'], undefined, 'sin Content-Type manual: el navegador agrega el boundary')
  })
  test('sigue exigiendo la confirmación del CRM (un 2xx sin «mensagge»/«message» no es éxito) y traduce 422 y errores', async () => {
    state.reply = { ok: true, status: 200, json: async () => ({}) }
    await assert.rejects(() => new P.CrmPrpLeadProvider().submit(LEAD), e => e instanceof ERR && e.kind === 'unexpected')
    state.reply = { ok: false, status: 422, json: async () => ({}) }
    await assert.rejects(() => new P.CrmPrpLeadProvider().submit(LEAD), e => e instanceof ERR && e.kind === 'validation')
    state.reply = { ok: false, status: 500, json: async () => ({}) }
    await assert.rejects(() => new P.CrmPrpLeadProvider().submit(LEAD), e => e instanceof ERR && e.kind === 'server')
    state.reply = new Error('sin red')
    await assert.rejects(() => new P.CrmPrpLeadProvider().submit(LEAD), e => e instanceof ERR && e.kind === 'network')
  })
})

describe('bloqueo de destinos inválidos (sin cambios)', () => {
  test('destino ausente, inválido, sin https, con credenciales o del CRM de valoración heredado: no sale ninguna petición', async () => {
    for (const crmPrpFormUrl of [undefined, '', '   ', 'x', 'http://crm.example/x', 'ftp://crm.example/x', 'https://u:p@crm.example/x', LEGACY_VALUATION]) {
      state.cfg = { public: { crmPrpFormUrl } }
      await assert.rejects(() => new P.CrmPrpLeadProvider().submit(LEAD), e => e instanceof ERR && e.kind === 'server', String(crmPrpFormUrl))
    }
    assert.equal(state.calls.length, 0)
  })
  test('la configuración del destino sigue siendo el endpoint compartido aprobado', () => {
    assert.match(read('nuxt.config.ts'), /crmPrpFormUrl: 'https:\/\/pdtclientsolutions\.com\/crm-public\/api\/forms-px-prp'/)
    assert.match(read('server/api/public/prp/[slug].get.ts'), /crmDestinationProblem\(useRuntimeConfig\(event\)\.public\?\.crmPrpFormUrl\)/)
  })
})

describe('páginas PRP y envío PRP son interruptores independientes', () => {
  test('ambos están habilitados: las páginas y su lectura pública no se bloquean', () => {
    assert.equal(F.PRP_ENABLED, true)
    assert.equal(F.PRP_SUBMIT_ENABLED, true)
    for (const p of ['/prp/un-slug', '/prp', '/prp/un-slug/']) assert.equal(F.isDisabledPagePath(p), false, p)
    assert.equal(F.isDisabledApiPath('/api/public/prp/un-slug'), false)
  })
  test('el bloqueo de páginas y lectura sigue funcionando al apagar PRP_ENABLED (solo /prp y /api/public/prp)', () => {
    assert.equal(F.isDisabledPagePath('/prp/un-slug', false), true)
    assert.equal(F.isDisabledApiPath('/api/public/prp/un-slug', false), true)
    for (const p of ['/prpx', '/', '/financiacion', '/admin/micrositios', '/testimonios/programa-de-referidos']) assert.equal(F.isDisabledPagePath(p, false), false, p)
    for (const p of ['/api/valuation', '/api/forms/valuation', '/api/forms/prp-enrollment', '/api/admin/prp', '/api/public/news']) assert.equal(F.isDisabledApiPath(p, false), false, p)
  })
  test('el proveedor depende SOLO de PRP_SUBMIT_ENABLED, y la guarda va antes de leer la URL y de hacer fetch', () => {
    const src = read('providers/CrmPrpLeadProvider.ts')
    assert.match(src, /import \{ PRP_SUBMIT_ENABLED \} from '#shared\/utils\/features'/)
    assert.doesNotMatch(src, /\bPRP_ENABLED\b/)
    const guard = src.indexOf('if (!PRP_SUBMIT_ENABLED)')
    assert.ok(guard > 0)
    assert.ok(guard < src.indexOf('crmPrpFormUrl || '))
    assert.ok(guard < src.indexOf('fetch(url'))
  })
  test('los middlewares de páginas y de API dependen solo de PRP_ENABLED (no del envío)', () => {
    for (const f of ['middleware/00-disabled-features.global.ts', 'server/middleware/disabled-features.ts']) assert.doesNotMatch(read(f), /PRP_SUBMIT_ENABLED/, f)
  })
})

describe('los demás formularios no cambian', () => {
  test('valoración, simulador, preaprobado e inscripción de referidos no dependen de features.ts', () => {
    for (const f of ['server/utils/valuation.ts', 'server/api/forms/valuation.post.ts', 'shared/utils/valuation.ts', 'services/ValuationService.ts', 'components/forms/ValuationRequest.vue',
      'components/forms/LeadForm.vue', 'services/LeadService.ts', 'providers/MockLeadProvider.ts', 'server/utils/prpEnrollment.ts', 'server/utils/referral.ts', 'services/ReferralService.ts']) {
      assert.doesNotMatch(read(f), /utils\/features/, f)
    }
  })
  test('la valoración sigue sin destino (503 not_configured) y no recibe id_line de PRP', () => {
    assert.match(read('nuxt.config.ts'), /^    crmValuationUrl: '',$/m)
    assert.doesNotMatch(read('shared/utils/valuation.ts'), /id_line', '30'|CRM_PRP_ID_LINE/)
    assert.match(read('shared/utils/valuation.ts'), /\['id_line', crm\.lineId\]/)
  })
  test('el preaprobado del simulador se envía por correo (/api/forms/lead), sin CRM ni PRP', () => {
    const svc = read('services/LeadService.ts')
    assert.match(svc, /LEAD_ENDPOINT = '\/api\/forms\/lead'/)
    assert.doesNotMatch(svc, /MockLeadProvider|crm-public|prp/i)
  })
})

// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Registro en el CRM de «Estudio de créditos» y «Solicitud de financiación». Se ejecuta el código REAL del servidor con CRM y SMTP SIMULADOS:
// no hay red, no se envía ningún correo y no se crea ningún registro. Todos los datos son FICTICIOS.
import { test, describe, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from '../recommendations/harness.ts'
import { CRM_CFG, CRM_COOKIE, CRM_OK, CRM_TOKEN, CRM_URL, crmPage, crmReply, installCrmStub } from './crm-stub.ts'

const fileUrl = rel => pathToFileURL(join(ROOT, rel)).href
const read = rel => readFileSync(join(ROOT, rel), 'utf8')

const CFG = {
  ...CRM_CFG,
  mailHost: 'smtp.example.test', mailPort: 465, mailUsername: 'sender@example.test', mailPassword: 'clave-FICTICIA',
  creditStudyTo: 'destino@example.test', creditStudyCc: '', leadFormTo: 'destino@example.test', leadFormCc: '',
  trustedProxyHops: 0, public: { appName: 'Marca de prueba' }
}

const state = { cfg: {}, sent: [], sendImpl: null, logs: [] }
let dir, crm, credit, lead, valuation, mail, reg, S, L, svc
const originals = { info: console.info, warn: console.warn, error: console.error, log: console.log }

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'crm-forms-'))
  for (const k of Object.keys(originals)) console[k] = (...a) => { state.logs.push(a.map(String).join(' ')) }
  const g = globalThis
  g.createError = o => Object.assign(new Error(o.message ?? 'error'), o)
  g.useRuntimeConfig = () => state.cfg
  g.setHeader = () => {}
  g.assertSameOrigin = () => {}
  g.getRequestIP = e => e.ip
  g.getRequestHeader = (e, name) => e.headers?.[name.toLowerCase()]
  g.readBody = async e => e.body
  g.readMultipartFormData = async e => e.parts
  crm = installCrmStub()

  const base = fileUrl('shared/utils')
  const copy = (rel, name) => writeFileSync(join(dir, name), read(rel)
    .replace(/'#shared\/utils\/([A-Za-z]+)'/g, (_, m) => `'${base}/${m}.ts'`)
    .replace(/'\.\/(formMail|crmClient|crmRegistration)'/g, (_, m) => `'./${m}.ts'`))
  for (const n of ['formMail', 'crmClient', 'crmRegistration', 'creditStudy', 'leadForm', 'valuation']) copy(`server/utils/${n}.ts`, `${n}.ts`)
  copy('services/CreditStudyService.ts', 'CreditStudyService.ts')
  const load = n => import(pathToFileURL(join(dir, `${n}.ts`)).href)
  mail = await load('formMail')
  reg = await load('crmRegistration')
  credit = await load('creditStudy')
  lead = await load('leadForm')
  valuation = await load('valuation')
  svc = await load('CreditStudyService')
  S = await import(fileUrl('shared/utils/creditStudy.ts'))
  L = await import(fileUrl('shared/utils/leadForm.ts'))
})

beforeEach(() => {
  state.cfg = { ...CFG }
  state.sent = []
  state.logs = []
  state.sendImpl = async () => ({ accepted: ['destino@example.test'], rejected: [] })
  crm.reset()
  mail.resetMailGuards()
  reg.resetCrmRegistrationGuards()
  valuation.resetValuationGuards()
  mail.setMailTransportFactory(async () => ({ sendMail: async (msg) => { crm.order.push('correo'); state.sent.push(msg); return state.sendImpl(msg) }, close: () => {} }))
})

after(() => {
  Object.assign(console, originals)
  crm.restore()
  mail.setMailTransportFactory()
  rmSync(dir, { recursive: true, force: true })
})

// ── Datos de prueba ──────────────────────────────────────────────────────────
const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(300, 1)])
const DOC_IDS = ['archivo-carta-laboral', 'archivo-colillas', 'archivo-extractos']

function creditRaw(over = {}) {
  const raw = {}
  for (const fd of S.CREDIT_FIELDS) {
    if (fd.type === 'file' || fd.sum || fd.type === 'checkbox') continue
    if (fd.type === 'select') raw[fd.id] = fd.options[0]
    else if (fd.type === 'tel') raw[fd.id] = '3000000001'
    else if (fd.type === 'email') raw[fd.id] = 'zoila.ficticia@example.com'
    else if (fd.type === 'number') raw[fd.id] = '1500'
    else if (fd.type === 'date') raw[fd.id] = '1991-07-23'
    else raw[fd.id] = 'Texto de prueba'
  }
  return {
    ...raw,
    'primer-nombre': 'Zoila', 'segundo-nombre': 'Renata', 'primer-apellido': 'Quintero', 'segundo-apellido': 'Vallejo',
    'numero-documento': '1.098.765.432', 'barrio-residencia': 'Laureles, Medellín', celular: '+57 (300) 000-0001',
    'proc-Rinoplastia': 'true', 'proc-Otoplastia': 'true', [S.CREDIT_CONSENT_ID]: 'true', ...over
  }
}
const creditEvent = (raw = creditRaw()) => ({
  ip: '203.0.113.31',
  headers: { 'content-length': '6000', 'content-type': 'multipart/form-data; boundary=x' },
  parts: [
    ...Object.entries(raw).map(([name, v]) => ({ name, data: Buffer.from(String(v)) })),
    ...DOC_IDS.map(name => ({ name, filename: 'doc.pdf', data: Buffer.from(PDF) }))
  ]
})

const leadBody = (over = {}, meta = {}) => ({
  first_name: 'Zoila Renata', last_name: 'Quintero Vallejo', phone: '300 000 0001', email: 'zoila.ficticia@example.com', city: 'Cali',
  procedure_name: 'Rinoplastia', requested_amount: 9_000_000, installments: 24, accepted_habeas_data: true,
  metadata: { doc_number: '1.098.765.432', birth_date: '1991-07-23', residence_city: 'Palmira', ...meta }, ...over
})
const leadEvent = (body = leadBody()) => ({ ip: '203.0.113.32', body, headers: { 'content-length': '900', 'content-type': 'application/json' } })

const run = async (fn, e) => { try { return { value: await fn(e) } } catch (error) { return { error } } }
const FORMS = [
  { name: 'Estudio de créditos', tag: 'credit-study', submit: () => run(credit.handleCreditStudy, creditEvent()), attachments: 3 },
  { name: 'Solicitud de financiación', tag: 'lead-form', submit: () => run(lead.handleLead, leadEvent()), attachments: 0 }
]
const PERSONAL = ['Zoila', 'Renata', 'Quintero', 'Vallejo', '1098765432', '1.098', '1991-07-23', '3000000001', '000-0001', 'zoila', 'Laureles', 'Palmira', 'Rinoplastia', CRM_TOKEN, 'sesionDePrueba']
const assertCleanLogs = () => { const all = state.logs.join('\n').toLowerCase(); for (const p of PERSONAL) assert.ok(!all.includes(p.toLowerCase()), `el registro contiene «${p}»`) }

const ORDER = ['_token', '_method', 'nombres', 'apellidos', 'name', 'identificacion', 'fecha_nacimiento', 'direccion', 'city', 'clinic', 'telefono', 'phone', 'email', 'name_surgery', 'forma_pago', 'state', 'origen', 'id_user', 'id_line', 'id_user_asesora', 'advisor_email', 'accept']
const FIXED = { _token: CRM_TOKEN, _method: 'post', forma_pago: 'Financiacion', state: 'No Contactada', origen: 'Formulario Web', id_user: '101', id_line: '30', id_user_asesora: '103', city: '3', clinic: '6', advisor_email: 'asesora@example.test', accept: '1' }

// ── Mapeo ────────────────────────────────────────────────────────────────────
describe('Campos enviados al CRM', () => {
  test('estudio de crédito: nombres unidos, cédula sin puntos, teléfono solo dígitos, barrio/ciudad y procedimientos', async () => {
    assert.deepEqual((await FORMS[0].submit()).value, { ok: true })
    assert.deepEqual([...crm.posts[0][1].body.keys()], ORDER)
    assert.deepEqual(crm.fields(), {
      ...FIXED, nombres: 'Zoila Renata', apellidos: 'Quintero Vallejo', name: 'Zoila Renata Quintero Vallejo', phone: '573000000001', identificacion: '1098765432', fecha_nacimiento: '1991-07-23',
      direccion: 'Laureles, Medellín', telefono: '573000000001', email: 'zoila.ficticia@example.com', name_surgery: 'Rinoplastia, Otoplastia'
    })
  })
  test('estudio de crédito sin segundo nombre ni procedimientos: nada se rellena', async () => {
    await run(credit.handleCreditStudy, creditEvent(creditRaw({ 'segundo-nombre': '', 'segundo-apellido': '', 'proc-Rinoplastia': '', 'proc-Otoplastia': '' })))
    const f = crm.fields()
    assert.equal(f.nombres, 'Zoila')
    assert.equal(f.apellidos, 'Quintero')
    assert.equal(f.name_surgery, '')
    assert.deepEqual([f.name, f.phone, f.id_line, f.advisor_email], ['Zoila Quintero', '573000000001', '30', 'asesora@example.test'])
  })
  test('financiación: usa nombres y apellidos, ciudad de residencia y procedimiento', async () => {
    assert.deepEqual((await FORMS[1].submit()).value, { ok: true })
    assert.deepEqual([...crm.posts[0][1].body.keys()], ORDER)
    assert.deepEqual(crm.fields(), {
      ...FIXED, nombres: 'Zoila Renata', apellidos: 'Quintero Vallejo', name: 'Zoila Renata Quintero Vallejo', phone: '3000000001', identificacion: '1098765432', fecha_nacimiento: '1991-07-23',
      direccion: 'Palmira', telefono: '3000000001', email: 'zoila.ficticia@example.com', name_surgery: 'Rinoplastia'
    })
  })
  test('financiación sin datos opcionales: viajan vacíos, sin valores ficticios', async () => {
    const body = leadBody({ email: '' })
    delete body.metadata
    assert.deepEqual((await run(lead.handleLead, leadEvent(body))).value, { ok: true })
    const f = crm.fields()
    assert.deepEqual([f.identificacion, f.fecha_nacimiento, f.email, f.direccion], ['', '', '', ''])
  })
  test('financiación sin ciudad de residencia: «Ciudad» no la sustituye', async () => {
    for (const city of ['Cali', 'Medellín', 'Por Definir']) {
      reg.resetCrmRegistrationGuards()
      mail.resetMailGuards()
      crm.reset()
      assert.deepEqual((await run(lead.handleLead, leadEvent(leadBody({ city }, { residence_city: '' })))).value, { ok: true })
      assert.equal(crm.fields().direccion, '', city)
    }
    assert.match(state.sent.at(-1).text, /Ciudad: Por Definir/)
    assert.doesNotMatch(read('components/forms/LeadForm.vue'), /residence_city = props\.city/)
  })
})

describe('Identificadores fijos de Crediestética en los tres formularios', () => {
  // Valores por defecto REALES de nuxt.config.ts; usuario y asesora son los que se definen por entorno en producción.
  const fromNuxt = name => new RegExp(`^    ${name}: '(\\d*)',\\r?$`, 'm').exec(read('nuxt.config.ts'))[1]
  const real = () => ({
    ...CFG, crmFormUserId: '403031', crmFormAdvisorId: '403031',
    crmFormLineId: fromNuxt('crmFormLineId'), crmFormAdvisorEmail: emailFromNuxt(), crmFormCityId: fromNuxt('crmFormCityId'), crmFormClinicId: fromNuxt('crmFormClinicId')
  })
  const emailFromNuxt = () => /^    crmFormAdvisorEmail: '([^']*)',\r?$/m.exec(read('nuxt.config.ts'))[1]
  const valuationEvent = () => ({
    ip: '203.0.113.33', headers: {},
    body: { nombres: 'Zoila', apellidos: 'Quintero', identificacion: '1098765432', fecha_nacimiento: '1991-07-23', direccion: 'Santa Rosa de Osos', telefono: '3000000001', email: 'zoila.ficticia@example.com', name_surgery: 'Rinoplastia', forma_pago: 'Contado', accept: true, city: '99', clinic: '99' }
  })
  const bare = () => leadBody({ email: '', city: 'Por Definir' }, { doc_number: '', birth_date: '', residence_city: '' })
  // [nombre completo, teléfono] que debe salir en cada flujo (los obligatorios del CRM).
  const required = { 'valoración': ['Zoila Quintero', '3000000001'], 'estudio de crédito': ['Zoila Renata Quintero Vallejo', '573000000001'] }
  const leadRequired = ['Zoila Renata Quintero Vallejo', '3000000001']
  const flows = [
    ['valoración', () => run(valuation.handleValuation, valuationEvent()), 'Santa Rosa de Osos'],
    ['estudio de crédito', () => run(credit.handleCreditStudy, creditEvent()), 'Laureles, Medellín'],
    ['financiación', () => run(lead.handleLead, leadEvent()), 'Palmira'],
    ['financiación sin datos opcionales', () => run(lead.handleLead, leadEvent(bare())), '']
  ]
  for (const [name, submit, direccion] of flows) {
    test(`${name}: multipart con city=3, clinic=6, línea 30 y usuario/asesora 403031; \`direccion\` conserva su texto`, async () => {
      state.cfg = real()
      assert.deepEqual((await submit()).value, { ok: true })
      const body = crm.posts[0][1].body
      assert.ok(body instanceof FormData)
      for (const [field, expected] of [['city', '3'], ['clinic', '6'], ['id_line', '30'], ['id_user', '403031'], ['id_user_asesora', '403031']]) {
        assert.deepEqual(body.getAll(field), [expected], field)
      }
      assert.deepEqual(body.getAll('direccion'), [direccion])
      const [fullName, phone] = required[name] ?? leadRequired
      assert.deepEqual(body.getAll('name'), [fullName])
      assert.deepEqual(body.getAll('phone'), [phone])
      assert.deepEqual(body.getAll('advisor_email'), ['convenioscrediestetica@gmail.com'])
      // Así viaja en la petición real.
      const wire = await new Response(body).text()
      assert.match(wire, /name="city"\r\n\r\n3\r\n/)
      assert.match(wire, /name="clinic"\r\n\r\n6\r\n/)
    })
  }
  test('sin ciudad, clínica o correo de asesora válidos la configuración se rechaza y no sale ninguna petición', async () => {
    for (const over of [{ crmFormCityId: '' }, { crmFormClinicId: 'Medellín' }, { crmFormAdvisorEmail: '' }, { crmFormAdvisorEmail: '403031' }]) {
      state.cfg = { ...real(), ...over }
      assert.equal((await run(lead.handleLead, leadEvent())).error.data.reason, 'not_configured')
      mail.resetMailGuards()
    }
    assert.equal(crm.pages.length + crm.posts.length, 0)
  })
})

describe('Datos requeridos', () => {
  test('estudio de crédito sin autorización: 422, sin correo y sin CRM', async () => {
    for (const v of ['', 'false', 'on']) {
      const r = await run(credit.handleCreditStudy, creditEvent(creditRaw({ [S.CREDIT_CONSENT_ID]: v })))
      assert.equal(r.error.statusCode, 422)
      assert.ok(r.error.data.errors[S.CREDIT_CONSENT_ID])
      mail.resetMailGuards()
    }
    assert.equal(state.sent.length + crm.pages.length + crm.posts.length, 0)
  })
  test('el navegador envía la autorización solo si fue aceptada', () => {
    const values = S.normalizeCreditValues(creditRaw())
    assert.equal(svc.buildCreditStudyFormData(values, {}).has(S.CREDIT_CONSENT_ID), false)
    assert.equal(svc.buildCreditStudyFormData({ ...values, [S.CREDIT_CONSENT_ID]: true }, {}).get(S.CREDIT_CONSENT_ID), 'true')
  })
  test('la autorización no altera el contenido del correo', async () => {
    await FORMS[0].submit()
    assert.doesNotMatch(state.sent[0].text, /acepta-datos|Autorizaci/i)
  })
  test('financiación sin apellidos o sin autorización: 422, sin correo y sin CRM', async () => {
    for (const over of [{ last_name: '' }, { accepted_habeas_data: false }]) {
      assert.equal((await run(lead.handleLead, leadEvent(leadBody(over)))).error.statusCode, 422)
    }
    assert.equal(state.sent.length + crm.pages.length + crm.posts.length, 0)
    assert.ok(L.validateLead(leadBody({ last_name: 'x' })).errors.last_name)
  })
  test('el correo de financiación conserva «Nombre completo»', async () => {
    await FORMS[1].submit()
    assert.match(state.sent[0].text, /Nombre completo: Zoila Renata Quintero Vallejo/)
  })
})

// ── Flujo, respuestas y correo (ambos formularios) ───────────────────────────
for (const form of FORMS) {
  describe(`${form.name}: CRM y correo`, () => {
    test('correo primero; luego GET de sesión y un único POST con cookie y token; ok solo con ambos', async () => {
      assert.deepEqual((await form.submit()).value, { ok: true })
      assert.deepEqual(crm.order, ['correo', 'crm-sesion', 'crm-envio'])
      assert.equal(crm.pages[0][0], 'https://crm.example.test/crm-public/forms/101/30')
      const [url, init] = crm.posts[0]
      assert.equal(url, CRM_URL)
      assert.equal(init.headers.Cookie, CRM_COOKIE)
      assert.equal(init.redirect, 'manual')
      assert.equal(init.body.get('_token'), CRM_TOKEN)
      assert.equal(state.sent.length, 1)
      assert.equal(state.sent[0].attachments.length, form.attachments)
      assert.ok(state.logs.some(l => l.startsWith(`[${form.tag}] crm-registro`) && l.includes('clasificacion=confirmado')))
      assertCleanLogs()
    })

    const cases = [
      ['2xx sin mensagge', () => crmReply(200, {}), 502, true],
      ['2xx con otro texto', () => crmReply(200, { mensagge: 'No fue posible' }), 502, true],
      ['clave bien escrita (mensaje)', () => crmReply(200, { mensaje: CRM_OK.mensagge }), 502, true],
      ['2xx que no es JSON', () => ({ status: 200, json: async () => { throw new SyntaxError('html') } }), 502, true],
      ['redirección', () => crmReply(302), 502, true],
      ['422', () => crmReply(422, { errors: { email: ['El correo zoila.ficticia@example.com ya existe'] } }), 422, false],
      ['500', () => crmReply(500, { message: 'Server Error' }), 502, true],
      ['503', () => crmReply(503), 502, true]
    ]
    for (const [label, reply, status, blocks] of cases) {
      test(`${label}: sin éxito, un solo POST, correo conservado${blocks ? ' y reenvío bloqueado' : ''}`, async () => {
        crm.post = async () => reply()
        const r = await form.submit()
        assert.equal(r.value, undefined)
        assert.equal(r.error.statusCode, status)
        assert.match(r.error.message, /^Recibimos tu información/)
        assert.doesNotMatch(JSON.stringify(r.error.data), /zoila/i)
        assert.equal(crm.posts.length, 1)
        assert.equal(state.sent.length, 1)
        assert.equal(state.sent[0].attachments.length, form.attachments)

        crm.post = async () => crmReply(200, CRM_OK)
        const again = await form.submit()
        assert.equal(state.sent.length, 1, 'el mismo correo no se repite')
        if (blocks) {
          assert.equal(again.error.statusCode, 409)
          assert.equal(again.error.data.uncertain, true)
          assert.equal(crm.posts.length, 1)
        } else {
          assert.deepEqual(again.value, { ok: true })
          assert.equal(crm.posts.length, 2)
        }
        assertCleanLogs()
      })
    }

    test('corte de red y tiempo agotado: incierto, sin reintento', async () => {
      crm.post = async () => { throw Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error('reset'), { code: 'ECONNRESET' }) }) }
      const r = await form.submit()
      assert.equal(r.error.statusCode, 503)
      assert.equal(r.error.data.uncertain, true)
      await form.submit()
      assert.equal(crm.posts.length, 1)
      assertCleanLogs()
    })

    test('sin sesión o sin token no se envían datos y reenviar solo repite el CRM', async () => {
      for (const page of [async () => ({ status: 500 }), async () => crmPage('corto'), async () => { throw new Error('sin red') }]) {
        crm.page = page
        const r = await form.submit()
        assert.equal(r.error.statusCode, 503)
        assert.equal(r.error.data.reason, 'crm_session')
      }
      assert.equal(crm.posts.length, 0)
      crm.page = async () => crmPage()
      assert.deepEqual((await form.submit()).value, { ok: true })
      assert.equal(crm.posts.length, 1)
      assert.equal(state.sent.length, 1)
    })

    test('CRM sin configurar: el correo sale, no hay peticiones y no se declara éxito', async () => {
      state.cfg = { ...CFG, crmFormUrl: '' }
      const r = await form.submit()
      assert.equal(r.error.statusCode, 503)
      assert.equal(r.error.data.reason, 'not_configured')
      assert.equal(state.sent.length, 1)
      assert.equal(crm.pages.length + crm.posts.length, 0)
      assert.match(state.logs.join('\n'), /NUXT_CRM_FORM_URL/)
      assertCleanLogs()
    })

    test('si el correo falla no se llama al CRM; al reintentar salen ambos', async () => {
      state.sendImpl = async () => { throw Object.assign(new Error('x'), { code: 'ETIMEDOUT' }) }
      assert.equal((await form.submit()).error.statusCode, 503)
      assert.equal(crm.pages.length + crm.posts.length, 0)
      state.sendImpl = async () => ({ accepted: ['destino@example.test'], rejected: [] })
      assert.deepEqual((await form.submit()).value, { ok: true })
      assert.equal(crm.posts.length, 1)
      assertCleanLogs()
    })

    test('repetido tras confirmar: 409, sin segundo correo ni segundo registro', async () => {
      await form.submit()
      const r = await form.submit()
      assert.equal(r.error.statusCode, 409)
      assert.equal(state.sent.length, 1)
      assert.equal(crm.posts.length, 1)
    })

    test('doble envío simultáneo: un correo y un registro', async () => {
      const [a, b] = await Promise.all([form.submit(), form.submit()])
      assert.deepEqual([a, b].map(x => x.error?.statusCode ?? 200).sort(), [200, 409])
      assert.equal(state.sent.length, 1)
      assert.equal(crm.posts.length, 1)
    })
  })
}

describe('Alcance', () => {
  test('cada formulario registra por separado a la misma persona', async () => {
    await FORMS[0].submit()
    await FORMS[1].submit()
    assert.equal(crm.posts.length, 2)
  })
  test('la valoración no pasa por este módulo', () => {
    assert.doesNotMatch(read('server/utils/valuation.ts'), /crmRegistration/)
    assert.match(read('server/utils/crmClient.ts'), /registerCrmClient\(config: CrmClientConfig, value: ValuationInput, tag = 'valuation'\)/)
  })
})

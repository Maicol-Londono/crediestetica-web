// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Solicitud de valoración (server/utils/valuation.ts): configuración del CRM sin valores por defecto, IP no falsificable, límite por ventana,
// duplicados y tratamiento de errores del CRM. Se ejecuta el código REAL del servidor con el CRM simulado: no hay red ni escrituras externas.
// Los ids y textos de configuración de este archivo son FICTICIOS (solo para las pruebas): no son valores de ningún CRM.
import { test, describe, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from '../recommendations/harness.ts'

const fileUrl = rel => pathToFileURL(join(ROOT, rel)).href
const OWN_CRM = 'https://crm.crediestetica.example/api/forms' // destino hipotético válido SOLO para las pruebas
const SOCKET_IP = '203.0.113.9'
const WINDOW = 10 * 60_000
const DUP_WINDOW = 2 * 60_000

const CRM_CFG = {
  crmValuationUrl: OWN_CRM,
  crmValuationUserId: '9101',
  crmValuationLineId: '9102',
  crmValuationAdvisorId: '9103',
  crmValuationState: 'Estado de prueba',
  crmValuationOrigin: 'Origen de prueba',
  trustedProxyHops: 0
}

const state = { cfg: {}, fetchCalls: [], bodyReads: 0, fetchImpl: null, clock: 1_800_000_000_000, sent: [], sendImpl: null }
let dir, mod, mailMod, realNow

const copyServer = (rel, name) => {
  const base = fileUrl('shared/utils')
  const fix = src => src.replace(/'#shared\/utils\/([A-Za-z]+)'/g, (_, m) => `'${base}/${m}.ts'`).replace("'./formMail'", "'./formMail.ts'")
  writeFileSync(join(dir, 'formMail.ts'), fix(readFileSync(join(ROOT, 'server/utils/formMail.ts'), 'utf8')))
  writeFileSync(join(dir, name), fix(readFileSync(join(ROOT, rel), 'utf8')))
  return import(pathToFileURL(join(dir, name)).href)
}
const run = async (fn, e) => { try { return { value: await fn(e) } } catch (error) { return { error } } }

const VALID = {
  nombres: 'Ana', apellidos: 'Prueba', identificacion: '12345678', fecha_nacimiento: '1990-05-10', direccion: 'Bogotá',
  telefono: '3001234567', email: 'ana@example.com', name_surgery: 'Rinoplastia', forma_pago: 'Financiación', accept: true
}
const event = (over = {}) => ({ method: 'POST', body: { ...VALID }, headers: {}, ip: SOCKET_IP, ...over })
const submit = async (over = {}) => { const r = await run(mod.handleValuation, event(over)); await mailMod?.settleNotifications(); return r }
const okFetch = async () => ({ ok: true, status: 200, json: async () => ({ mensagge: 'Registro creado' }) })

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'valuation-'))
  realNow = Date.now
  Date.now = () => state.clock // reloj determinista: nada depende de esperas reales
  const g = globalThis
  g.createError = o => Object.assign(new Error(o.message ?? 'error'), o)
  g.useRuntimeConfig = () => state.cfg
  g.setHeader = () => {}
  g.assertSameOrigin = () => {}
  g.getRequestIP = e => e.ip
  g.getRequestHeader = (e, name) => e.headers?.[name.toLowerCase()]
  g.readBody = async e => { state.bodyReads++; return e.body }
  g.fetch = (...args) => { state.fetchCalls.push(args); return state.fetchImpl(...args) }
  mod = await copyServer('server/utils/valuation.ts', 'valuation.ts')
  mailMod = await import(pathToFileURL(join(dir, 'formMail.ts')).href)
})
beforeEach(() => {
  state.cfg = { ...CRM_CFG }
  state.fetchCalls = []
  state.bodyReads = 0
  state.fetchImpl = okFetch
  state.clock += 3 * WINDOW // cada prueba parte de una ventana limpia
  mod.resetValuationGuards()
  state.sent = []
  state.sendImpl = async () => ({ accepted: ['valoracion@example.test'], rejected: [] })
  mailMod.resetMailGuards()
  mailMod.setMailTransportFactory(async () => ({ sendMail: async (msg) => { state.sent.push(msg); return state.sendImpl(msg) }, close: () => {} }))
})
after(() => { mailMod.setMailTransportFactory(); Date.now = realNow; rmSync(dir, { recursive: true, force: true }) })

const sentFields = () => [...state.fetchCalls[0][1].body.entries()]

describe('configuración del CRM (sin valores por defecto)', () => {
  const KEYS = ['crmValuationUserId', 'crmValuationLineId', 'crmValuationAdvisorId', 'crmValuationState', 'crmValuationOrigin']

  test('sin configuración => 503 not_configured, sin leer el cuerpo y sin llamar al CRM', async () => {
    state.cfg = { crmValuationUrl: OWN_CRM, trustedProxyHops: 0 }
    const r = await submit()
    assert.equal(r.error.statusCode, 503)
    assert.equal(r.error.data.reason, 'not_configured')
    assert.equal(state.bodyReads, 0, 'no se lee el cuerpo')
    assert.equal(state.fetchCalls.length, 0)
  })

  test('falta CUALQUIERA de los cinco valores (ausente, vacío o solo espacios) => 503 not_configured', async () => {
    for (const key of KEYS) {
      for (const blank of [undefined, '', '   ']) {
        state.cfg = { ...CRM_CFG, [key]: blank }
        const r = await submit()
        assert.equal(r.error?.statusCode, 503, `${key}=${JSON.stringify(blank)}`)
        assert.equal(r.error.data.reason, 'not_configured', key)
      }
    }
    assert.equal(state.bodyReads, 0)
    assert.equal(state.fetchCalls.length, 0)
  })

  test('valores inválidos => 503: ids que no son enteros positivos, textos demasiado largos o con caracteres de control', async () => {
    for (const bad of ['0', '-1', '1.5', '01', 'abc', '12abc', '1 2', '12345678901', 'NaN']) {
      for (const key of ['crmValuationUserId', 'crmValuationLineId', 'crmValuationAdvisorId']) {
        state.cfg = { ...CRM_CFG, [key]: bad }
        assert.equal((await submit()).error?.statusCode, 503, `${key}=${bad}`)
      }
    }
    for (const bad of ['x'.repeat(101), 'con\nsalto', 'con\u0000nulo']) {
      for (const key of ['crmValuationState', 'crmValuationOrigin']) {
        state.cfg = { ...CRM_CFG, [key]: bad }
        assert.equal((await submit()).error?.statusCode, 503, key)
      }
    }
    assert.equal(state.fetchCalls.length, 0)
  })

  test('la comprobación va ANTES del límite por IP: con la configuración incompleta no se consume ningún intento', async () => {
    state.cfg = { ...CRM_CFG, crmValuationLineId: '' }
    for (let i = 0; i < 30; i++) assert.equal((await submit()).error.statusCode, 503)
    state.cfg = { ...CRM_CFG }
    const r = await submit()
    assert.equal(r.value?.ok, true, 'la primera petición con configuración válida no queda limitada por las 503 anteriores')
  })

  test('la comprobación va también ANTES de validar el cuerpo (cuerpo inválido con configuración incompleta => 503, no 422)', async () => {
    state.cfg = { ...CRM_CFG, crmValuationOrigin: '' }
    for (const body of [undefined, null, {}, 'x']) assert.equal((await submit({ body })).error.statusCode, 503)
  })

  test('los ids numéricos que Nitro puede entregar como número (NUXT_* => 9101) también son válidos', async () => {
    state.cfg = { ...CRM_CFG, crmValuationUserId: 9101, crmValuationLineId: 9102, crmValuationAdvisorId: 9103 }
    assert.equal((await submit()).value?.ok, true)
    const f = Object.fromEntries(sentFields())
    assert.deepEqual([f.id_user, f.id_line, f.id_user_asesora], ['9101', '9102', '9103'])
  })

  test('con configuración válida se envían EXACTAMENTE los cinco valores configurados', async () => {
    const r = await submit()
    assert.equal(r.value.ok, true)
    assert.equal(state.fetchCalls.length, 1)
    assert.equal(state.fetchCalls[0][0], OWN_CRM)
    const f = Object.fromEntries(sentFields())
    assert.equal(f.id_user, '9101')
    assert.equal(f.id_line, '9102')
    assert.equal(f.id_user_asesora, '9103')
    assert.equal(f.state, 'Estado de prueba')
    assert.equal(f.origen, 'Origen de prueba')
  })

  test('el contrato conserva nombres, orden y formato de los campos', async () => {
    await submit()
    assert.deepEqual(sentFields().map(([k]) => k), [
      'nombres', 'apellidos', 'identificacion', 'fecha_nacimiento', 'direccion', 'telefono', 'email', 'name_surgery',
      'forma_pago', 'state', 'origen', 'id_user', 'id_line', 'id_user_asesora', 'accept'
    ])
    const f = Object.fromEntries(sentFields())
    assert.equal(f.nombres, 'Ana')
    assert.equal(f.fecha_nacimiento, '1990-05-10')
    assert.equal(f.direccion, 'Bogotá')
    assert.equal(f.forma_pago, 'financiacion')
    assert.equal(f.accept, '1')
    assert.equal(state.fetchCalls[0][1].method, 'POST')
    assert.equal(state.fetchCalls[0][1].headers.Accept, 'application/json')
    assert.equal('Content-Type' in state.fetchCalls[0][1].headers, false, 'fetch genera el multipart con su boundary')
  })

  test('«Contado» se envía como `contado`', async () => {
    await submit({ body: { ...VALID, forma_pago: 'Contado' } })
    assert.equal(Object.fromEntries(sentFields()).forma_pago, 'contado')
  })

  test('ningún 73 ni 16 de Planmed queda como valor de respaldo en el código ni en la configuración pública', () => {
    for (const rel of ['shared/utils/valuation.ts', 'server/utils/valuation.ts']) {
      const src = readFileSync(join(ROOT, rel), 'utf8')
      assert.doesNotMatch(src, /['"`](73|16)['"`]/, rel)
      assert.doesNotMatch(src, /(?<![A-Z_])VALUATION_(CRM_IDS|STATE|ORIGIN)(?![A-Z_])/, `${rel}: constantes heredadas eliminadas`)
    }
    const cfg = readFileSync(join(ROOT, 'nuxt.config.ts'), 'utf8')
    const publicAt = cfg.indexOf('public: {')
    for (const key of ['crmValuationUserId', 'crmValuationLineId', 'crmValuationAdvisorId', 'crmValuationState', 'crmValuationOrigin']) {
      const at = cfg.indexOf(`${key}: ''`)
      assert.ok(at > -1, `${key} existe con valor por defecto vacío`)
      assert.ok(at < publicAt, `${key} está en el runtimeConfig del servidor, no en public`)
    }
  })

  test('el módulo compartido no lee variables de entorno ni runtimeConfig', () => {
    const src = readFileSync(join(ROOT, 'shared/utils/valuation.ts'), 'utf8')
    assert.doesNotMatch(src, /process\.env|useRuntimeConfig|runtimeConfig/)
  })
})

describe('límite de intentos por IP', () => {
  const ten = i => ({ body: { ...VALID, identificacion: `1000000${i}` } }) // cada envío distinto: no choca con el bloqueo de duplicados

  test('ocho intentos desde la misma IP se aceptan y el noveno devuelve 429', async () => {
    for (let i = 0; i < 8; i++) assert.equal((await submit(ten(i))).value?.ok, true, `intento ${i + 1}`)
    const r = await submit(ten(8))
    assert.equal(r.error.statusCode, 429)
    assert.equal(r.error.data.reason, 'rate_limited')
    assert.equal(state.fetchCalls.length, 8, 'el noveno no llega al CRM')
  })

  test('otra IP no queda limitada por la primera', async () => {
    for (let i = 0; i < 9; i++) await submit(ten(i))
    assert.equal((await submit({ ...ten(20), ip: '203.0.113.77' })).value?.ok, true)
  })

  test('con cero saltos, variar X-Forwarded-For NO permite evadir el límite ni cambiar la IP real', async () => {
    for (let i = 0; i < 8; i++) {
      const r = await submit({ ...ten(i), headers: { 'x-forwarded-for': `198.51.100.${i + 1}` } })
      assert.equal(r.value?.ok, true)
    }
    const r = await submit({ ...ten(8), headers: { 'x-forwarded-for': '198.51.100.200' } })
    assert.equal(r.error.statusCode, 429)
  })

  test('con un proxy de confianza (1 salto), variar el inicio de X-Forwarded-For tampoco evade el límite', async () => {
    state.cfg = { ...CRM_CFG, trustedProxyHops: 1 }
    const REAL = '192.0.2.50' // la entrada que añade el proxy
    for (let i = 0; i < 8; i++) {
      const r = await submit({ ...ten(i), headers: { 'x-forwarded-for': `198.51.100.${i + 1}, ${REAL}` } })
      assert.equal(r.value?.ok, true)
    }
    const r = await submit({ ...ten(8), headers: { 'x-forwarded-for': `198.51.100.99, ${REAL}` } })
    assert.equal(r.error.statusCode, 429)
  })

  test('con un salto, clientes reales distintos (última entrada distinta) no comparten el límite', async () => {
    state.cfg = { ...CRM_CFG, trustedProxyHops: 1 }
    for (let i = 0; i < 8; i++) await submit({ ...ten(i), headers: { 'x-forwarded-for': '192.0.2.50' } })
    assert.equal((await submit({ ...ten(8), headers: { 'x-forwarded-for': '192.0.2.50' } })).error.statusCode, 429)
    assert.equal((await submit({ ...ten(9), headers: { 'x-forwarded-for': '192.0.2.51' } })).value?.ok, true)
  })

  test('la ventana de diez minutos se reinicia (reloj simulado, sin esperas)', async () => {
    for (let i = 0; i < 8; i++) await submit(ten(i))
    assert.equal((await submit(ten(8))).error.statusCode, 429)
    state.clock += WINDOW - 1
    assert.equal((await submit(ten(9))).error.statusCode, 429, 'un milisegundo antes de cumplirse la ventana sigue limitado')
    state.clock += 1
    assert.equal((await submit(ten(10))).value?.ok, true, 'al cumplirse la ventana vuelve a aceptar')
  })

  test('las peticiones rechazadas por validación también consumen el límite (comportamiento existente)', async () => {
    for (let i = 0; i < 8; i++) assert.equal((await submit({ body: {} })).error.statusCode, 422)
    assert.equal((await submit({ body: {} })).error.statusCode, 429)
  })
})

describe('duplicados y envíos simultáneos', () => {
  test('el mismo envío repetido devuelve 409 y no llega dos veces al CRM', async () => {
    assert.equal((await submit()).value?.ok, true)
    const r = await submit()
    assert.equal(r.error.statusCode, 409)
    assert.equal(r.error.data.reason, 'duplicate')
    assert.equal(state.fetchCalls.length, 1)
  })

  test('la huella ignora el formato del teléfono y las mayúsculas de la cirugía', async () => {
    await submit()
    const r = await submit({ body: { ...VALID, telefono: '300 123 4567', name_surgery: 'RINOPLASTIA' } })
    assert.equal(r.error.statusCode, 409)
  })

  test('pasada la ventana de dos minutos se acepta de nuevo (reloj simulado)', async () => {
    await submit()
    state.clock += DUP_WINDOW - 1
    assert.equal((await submit()).error.statusCode, 409)
    state.clock += 1
    assert.equal((await submit()).value?.ok, true)
    assert.equal(state.fetchCalls.length, 2)
  })

  test('dos envíos simultáneos idénticos generan UN solo registro: uno responde ok y el otro 409', async () => {
    state.fetchImpl = async () => { await new Promise(r => setTimeout(r, 25)); return okFetch() }
    const results = await Promise.all([submit(), submit()])
    const codes = results.map(r => r.value ? 200 : r.error.statusCode).sort()
    assert.deepEqual(codes, [200, 409])
    assert.equal(state.fetchCalls.length, 1, 'el CRM recibe una sola petición')
  })

  test('seis envíos simultáneos idénticos: un único registro', async () => {
    state.fetchImpl = async () => { await new Promise(r => setTimeout(r, 25)); return okFetch() }
    const results = await Promise.all(Array.from({ length: 6 }, () => submit()))
    assert.equal(results.filter(r => r.value?.ok).length, 1)
    assert.equal(results.filter(r => r.error?.statusCode === 409).length, 5)
    assert.equal(state.fetchCalls.length, 1)
  })

  test('si el CRM falla, el envío no queda marcado como aceptado: se puede reintentar', async () => {
    state.fetchImpl = async () => ({ ok: false, status: 500, json: async () => ({}) })
    assert.equal((await submit()).error.statusCode, 502)
    state.fetchImpl = okFetch
    assert.equal((await submit()).value?.ok, true)
  })
})

describe('tratamiento de errores del CRM (sin cambios)', () => {
  test('el CRM responde 422 => 422 con los errores conocidos por campo', async () => {
    state.fetchImpl = async () => ({ ok: false, status: 422, json: async () => ({ errors: { email: ['El email ya existe'], otro: ['x'] } }) })
    const r = await submit()
    assert.equal(r.error.statusCode, 422)
    assert.equal(r.error.data.reason, 'crm_validation')
    assert.deepEqual(r.error.data.errors, { email: 'El email ya existe' })
  })

  test('el CRM responde otro error => 502 crm_error', async () => {
    for (const status of [400, 401, 403, 404, 500, 503]) {
      mod.resetValuationGuards()
      state.fetchImpl = async () => ({ ok: false, status, json: async () => ({}) })
      const r = await submit()
      assert.equal(r.error.statusCode, 502, String(status))
      assert.equal(r.error.data.reason, 'crm_error')
    }
  })

  test('2xx sin confirmación en el cuerpo => 502 unconfirmed e incierto', async () => {
    for (const body of [{}, null, { message: 'Algo pasó' }, { mensagge: '  ' }]) {
      mod.resetValuationGuards()
      state.fetchImpl = async () => ({ ok: true, status: 200, json: async () => body })
      const r = await submit()
      assert.equal(r.error.statusCode, 502, JSON.stringify(body))
      assert.equal(r.error.data.reason, 'unconfirmed')
      assert.equal(r.error.data.uncertain, true)
    }
  })

  test('timeout => 504 (incierto) y sin conexión => 503; no se reintenta', async () => {
    state.fetchImpl = async () => { throw Object.assign(new Error('abort'), { name: 'AbortError' }) }
    const t = await submit()
    assert.equal(t.error.statusCode, 504)
    assert.equal(t.error.data.reason, 'timeout')
    mod.resetValuationGuards()
    state.fetchImpl = async () => { throw new TypeError('fetch failed') }
    const n = await submit()
    assert.equal(n.error.statusCode, 503)
    assert.equal(n.error.data.reason, 'network')
    assert.equal(state.fetchCalls.length, 2, 'una sola petición por intento')
  })

  test('la confirmación acepta `mensagge` o un `message` que hable de registro', async () => {
    for (const body of [{ mensagge: 'ok' }, { message: 'Cliente registrado' }]) {
      mod.resetValuationGuards()
      state.fetchImpl = async () => ({ ok: true, status: 200, json: async () => body })
      assert.equal((await submit()).value?.ok, true, JSON.stringify(body))
    }
  })

  test('destino ausente, inválido o heredado de Planmed sigue bloqueado (503) aunque la configuración esté completa', async () => {
    for (const crmValuationUrl of [undefined, '', 'x', 'http://crm.example/x', 'https://pdtclientsolutions.com/crm-public/api/clients/forms']) {
      state.cfg = { ...CRM_CFG, crmValuationUrl }
      const r = await submit()
      assert.equal(r.error?.statusCode, 503, String(crmValuationUrl))
      assert.equal(r.error.data.reason, 'not_configured')
    }
    assert.equal(state.fetchCalls.length, 0)
  })
})

// ── Correo COMPLEMENTARIO y canal principal sin CRM ──────────────────────────────────────────────────────────────────────────────────────────────────
// Todo con CRM simulado y transporte SMTP simulado: no hay red ni correos reales. Direcciones y contraseñas FICTICIAS.
const MAIL_CFG = {
  mailHost: 'smtp.example.test', mailPort: 465, mailUsername: 'sender@example.test', mailPassword: 'clave-ficticia', mailFromAddress: '', mailFromName: 'Marca de prueba',
  valuationTo: 'valoracion@example.test', valuationCc: '', public: { appName: 'Marca de prueba' }
}

async function keyOf() {
  const { createHash } = await import('node:crypto')
  return createHash('sha256').update(`${VALID.identificacion}|${VALID.telefono.replace(/\D/g, '')}|${VALID.name_surgery.toLowerCase()}`).digest('hex')
}

describe('CRM configurado: el CRM es el destino principal y el correo es complementario', () => {
  test('CRM ok + correo ok => {ok:true}; el CRM se llama primero y el correo sale después, con asunto y destinatarios del servidor', async () => {
    state.cfg = { ...CRM_CFG, ...MAIL_CFG }
    const order = []
    state.fetchImpl = async () => { order.push('crm'); return okFetch() }
    state.sendImpl = async () => { order.push('mail'); return { accepted: ['valoracion@example.test'], rejected: [] } }
    const r = await submit()
    assert.equal(r.value?.ok, true)
    assert.deepEqual(order, ['crm', 'mail'])
    assert.equal(state.fetchCalls.length, 1)
    assert.equal(state.sent.length, 1)
    assert.equal(state.sent[0].subject, '[Marca de prueba] Nueva solicitud de valoración')
    assert.deepEqual(state.sent[0].to, ['valoracion@example.test'])
  })

  test('CRM ok + correo FALLA => sigue {ok:true} (el registro del CRM se conserva), el usuario no ve error y queda pendiente de reintento', async () => {
    state.cfg = { ...CRM_CFG, ...MAIL_CFG }
    state.sendImpl = async () => { throw Object.assign(new Error('boom'), { code: 'ECONNREFUSED' }) }
    const r = await submit()
    assert.equal(r.value?.ok, true)
    assert.equal(r.error, undefined)
    assert.equal(state.fetchCalls.length, 1, 'el CRM se llamó una sola vez')
    assert.equal(mailMod.notificationState(`valuation|${await keyOf()}`), 'pending')
  })

  test('CRM ok + sin correo configurado => {ok:true} y no se intenta ningún envío', async () => {
    state.cfg = { ...CRM_CFG }
    const r = await submit()
    assert.equal(r.value?.ok, true)
    assert.equal(state.sent.length, 0)
  })

  test('CRM FALLA => no se envía correo ni se afirma que se registró', async () => {
    state.cfg = { ...CRM_CFG, ...MAIL_CFG }
    state.fetchImpl = async () => ({ ok: false, status: 500, json: async () => ({}) })
    const r = await submit()
    assert.equal(r.error?.statusCode, 502)
    assert.equal(r.error.data.reason, 'crm_error')
    assert.equal(state.sent.length, 0)
    state.fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({}) })
    mod.resetValuationGuards()
    const u = await submit()
    assert.equal(u.error?.data?.reason, 'unconfirmed')
    assert.equal(state.sent.length, 0)
  })
})

const JSON_HDRS = { headers: { 'content-length': '900', 'content-type': 'application/json' } }

describe('CRM NO configurado: el correo es el canal principal', () => {
  test('sin CRM propio pero con correo => {ok:true} por correo, sin llamar al CRM', async () => {
    state.cfg = { ...MAIL_CFG, trustedProxyHops: 0 }
    const r = await submit(JSON_HDRS)
    assert.equal(r.value?.ok, true)
    assert.equal(state.fetchCalls.length, 0)
    assert.equal(state.sent.length, 1)
  })

  test('ids del CRM incompletos o destino heredado de Planmed + correo => correo principal; nunca se llama al CRM', async () => {
    for (const cfg of [{ ...CRM_CFG, crmValuationLineId: '' }, { ...CRM_CFG, crmValuationUrl: 'https://pdtclientsolutions.com/crm-public/api/clients/forms' }]) {
      state.cfg = { ...cfg, ...MAIL_CFG }
      mod.resetValuationGuards(); mailMod.resetMailGuards(); state.sent = []
      const r = await submit(JSON_HDRS)
      assert.equal(r.value?.ok, true)
      assert.equal(state.fetchCalls.length, 0)
      assert.equal(state.sent.length, 1)
    }
  })

  test('ni CRM ni correo => 503 not_configured sin leer el cuerpo', async () => {
    state.cfg = { trustedProxyHops: 0 }
    const r = await submit(JSON_HDRS)
    assert.equal(r.error?.statusCode, 503)
    assert.equal(r.error.data.reason, 'not_configured')
    assert.equal(state.bodyReads, 0)
    assert.equal(state.fetchCalls.length, 0)
    assert.equal(state.sent.length, 0)
  })

  test('correo principal con SMTP caído => error al usuario (no hay registro que conservar)', async () => {
    state.cfg = { ...MAIL_CFG, trustedProxyHops: 0 }
    state.sendImpl = async () => { throw Object.assign(new Error('x'), { code: 'ECONNREFUSED' }) }
    const r = await submit(JSON_HDRS)
    assert.equal(r.error?.statusCode, 503)
  })
})

describe('Blindaje y respuesta independiente del correo complementario', () => {
  test('un error al LEER la configuración de correo no altera el registro confirmado por el CRM', async () => {
    const cfg = { ...CRM_CFG, ...MAIL_CFG }
    Object.defineProperty(cfg, 'mailHost', { get() { throw new Error('config corrupta') }, enumerable: true, configurable: true })
    state.cfg = cfg
    const r = await submit()
    assert.equal(r.value?.ok, true)
    assert.equal(state.fetchCalls.length, 1)
    assert.equal(state.sent.length, 0)
  })

  test('SMTP mal configurado (sin contraseña o puerto inválido) => el CRM confirma igual y no se intenta el envío', async () => {
    for (const bad of [{ mailPassword: '' }, { mailPort: 'abc' }]) {
      state.cfg = { ...CRM_CFG, ...MAIL_CFG, ...bad }
      mod.resetValuationGuards(); mailMod.resetMailGuards(); state.fetchCalls = []
      const r = await submit()
      assert.equal(r.value?.ok, true, JSON.stringify(bad))
      assert.equal(state.sent.length, 0)
    }
  })

  test('la respuesta NO espera al SMTP: con el SMTP colgado responde {ok:true} de inmediato y el correo queda pendiente hasta que termina', async () => {
    state.cfg = { ...CRM_CFG, ...MAIL_CFG }
    let release
    state.sendImpl = () => new Promise((res) => { release = () => res({ accepted: ['valoracion@example.test'], rejected: [] }) })
    const r = await run(mod.handleValuation, event()) // sin esperar al correo
    assert.equal(r.value?.ok, true)
    const k = `valuation|${await keyOf()}`
    assert.equal(mailMod.notificationState(k), 'pending', 'no se informa como enviado mientras no lo esté')
    await new Promise(res => setImmediate(res))
    assert.equal(typeof release, 'function')
    release()
    await mailMod.settleNotifications()
    assert.equal(mailMod.notificationState(k), 'sent')
  })

  test('REINICIO simulado: el estado del correo se pierde y un reenvío puede enviar OTRO correo (límite documentado, sin garantía de «exactamente una vez»)', async () => {
    state.cfg = { ...CRM_CFG, ...MAIL_CFG }
    await submit()
    assert.equal(state.sent.length, 1)
    mailMod.resetMailGuards()
    mod.resetValuationGuards() // el reinicio también borra el bloqueo de doble envío del CRM, que es de memoria
    await submit()
    assert.equal(state.sent.length, 2)
  })

  test('el pendiente no retiene el formulario completo: tras fallar, el correo reintentado es el mensaje ya construido', async () => {
    state.cfg = { ...CRM_CFG, ...MAIL_CFG }
    state.sendImpl = async () => { throw Object.assign(new Error('x'), { code: 'ECONNREFUSED' }) }
    await submit()
    const src = readFileSync(join(ROOT, 'server/utils/formMail.ts'), 'utf8')
    const entry = src.slice(src.indexOf('interface NotifyEntry'), src.indexOf('const pending'))
    assert.match(entry, /msg\?: ComplementaryMessage/)
    assert.doesNotMatch(entry, /build|value/)
  })
})

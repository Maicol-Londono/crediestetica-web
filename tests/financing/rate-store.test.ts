// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Tasa de usura mensual: persistencia (arranque 2 %, reinicios, historial, concurrencia), validación, permisos (líder y diseñadora) y
// protección de las rutas. Se ejecutan las rutas y utilidades REALES de Nitro con auto-imports simulados y un Hub falso.
import { test, describe, before, beforeEach, after } from 'node:test'
import fsp from 'node:fs/promises'
import { syncBuiltinESMExports } from 'node:module'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from '../recommendations/harness.ts'

const HOST = 'planmed.test'
const imp = rel => import(pathToFileURL(join(ROOT, rel)).href)
const dirs = []
const state = { dir: '', hub: {}, config: {}, cleared: false }

const LEADER = { id: 7, name: 'Líder Planmed', email: 'lider@x.test', role: { id: 19, name: 'Diseñador gráfico' }, is_area_leader: true }
const DESIGNER = { id: 20, name: 'Diseñadora Planmed', email: 'disenadoraplanmed@gmail.com', role: { id: 19, name: 'Diseñador gráfico' }, is_area_leader: false }
const OTHER_CMS = { id: 21, name: 'Editora', email: 'e@x.test', role: { id: 25, name: 'Editor' }, is_area_leader: false }
const OUTSIDER = { id: 22, name: 'Otra', email: 'o@x.test', role: { id: 99, name: 'Ventas' }, is_area_leader: false }
const PLANMED = { company: { slug: 'legalmed' }, line: { slug: 'crediestetica' } }
for (const u of [LEADER, DESIGNER, OTHER_CMS, OUTSIDER]) Object.assign(u, PLANMED)
const SUPER = { id: 1, name: 'Superadmin Hub', email: 'super@x.test', role: null, is_area_leader: false, is_global_admin: true, company: null, line: null }
const FAKE_SUPER = { ...OTHER_CMS, id: 23, is_global_admin: 'true' } // no estricto: no cuenta
const hubUsers = { 'tk-leader': LEADER, 'tk-designer': DESIGNER, 'tk-other': OTHER_CMS, 'tk-outsider': OUTSIDER, 'tk-super': SUPER, 'tk-fake-super': FAKE_SUPER }

let getAdmin, putAdmin, getPublic, access, F

const ev = (method, { token = 'tk-designer', body, origin = true, session = true, headers = {} } = {}) => ({
  method,
  headers: { host: HOST, ...(origin ? { origin: `https://${HOST}` } : {}), ...headers },
  body,
  session: session ? { token, user: { id: 1 } } : undefined
})
const run = async (fn, e) => { try { return { value: await fn(e) } } catch (error) { return { error } } }
const file = () => join(state.dir, 'financing-rate.json')
const stored = () => JSON.parse(readFileSync(file(), 'utf8'))
const seedRate = (rate = '2.0000') => {
  const entry = { rate, updatedAt: new Date(Date.now() - 60_000).toISOString(), updatedBy: { id: 1, name: 'Configuración de prueba' }, source: 'admin' }
  writeFileSync(file(), JSON.stringify({ version: 1, ...entry, history: [entry] }, null, 2))
}
const wait = () => new Promise(r => setTimeout(r, 3)) // updatedAt distinto entre cambios consecutivos

before(async () => {
  const g = globalThis
  g.defineEventHandler = fn => fn
  g.setHeader = () => {}
  g.readBody = async e => e.body
  g.createError = o => Object.assign(new Error(o.message ?? 'error'), o)
  g.useRuntimeConfig = () => ({ sessionPassword: 'x'.repeat(40), wellezyApiBaseUrl: 'https://hub.test/api', adminRoleIds: '19,25', rateEditorRoleIds: '19', wellezyCompanySlug: 'legalmed', wellezyLineSlug: 'crediestetica', ...state.config })
  g.useSession = async (e) => ({ data: e.session ?? {}, clear: async () => { state.cleared = true }, update: async () => {} })
  g.getRequestHeader = (e, name) => e.headers[name.toLowerCase()]
  g.aboutContentDir = () => state.dir
  g.$fetch = { raw: async (_url, opts) => {
    const auth = opts.headers.Authorization?.replace('Bearer ', '')
    const rule = state.hub[auth]
    if (rule === 'down') throw new Error('network')
    if (typeof rule === 'number') return { status: rule, _data: {} }
    const user = hubUsers[auth]
    return user ? { status: 200, _data: { user } } : { status: 401, _data: {} }
  } }
  // auth.ts importa './wellezy' sin extensión (lo resuelve Nitro, no Node): se prueba el código real desde una copia con la extensión.
  const shim = mkdtempSync(join(tmpdir(), 'planmed-auth-'))
  dirs.push(shim)
  writeFileSync(join(shim, 'wellezy.ts'), readFileSync(join(ROOT, 'server/utils/wellezy.ts'), 'utf8'))
  writeFileSync(join(shim, 'auth.ts'), readFileSync(join(ROOT, 'server/utils/auth.ts'), 'utf8').replaceAll("'./wellezy'", "'./wellezy.ts'"))
  for (const rel of ['server/utils/origin.ts', 'server/utils/news.ts', 'shared/utils/financing.ts', 'server/utils/financingRate.ts']) Object.assign(g, await imp(rel))
  Object.assign(g, await import(pathToFileURL(join(shim, 'wellezy.ts')).href), await import(pathToFileURL(join(shim, 'auth.ts')).href))
  F = await imp('shared/utils/financing.ts')
  getAdmin = (await imp('server/api/admin/config/financing-rate.get.ts')).default
  putAdmin = (await imp('server/api/admin/config/financing-rate.put.ts')).default
  getPublic = (await imp('server/api/public/financing-rate.get.ts')).default
  access = (await imp('server/api/admin/config/access.get.ts')).default
})

beforeEach(() => {
  state.dir = mkdtempSync(join(tmpdir(), 'planmed-rate-'))
  dirs.push(state.dir)
  state.hub = {}
  state.config = {}
})
after(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }) })

describe('tasa no configurada y persistencia', () => {
  test('sin archivo: la tasa NO está configurada, no se crea ningún archivo y no hay valor por defecto', async () => {
    assert.ok(!existsSync(file()))
    const pub = await run(getPublic, ev('GET', { session: false }))
    assert.equal(pub.value, undefined)
    assert.equal(pub.error.statusCode, 503)
    assert.equal(pub.error.data.code, 'rate_not_configured')
    const adm = await run(getAdmin, ev('GET'))
    assert.equal(adm.value.configured, false)
    assert.equal(adm.value.rate, '')
    assert.deepEqual(adm.value.history, [])
    assert.ok(!existsSync(file()), 'ninguna lectura crea el archivo')
    assert.ok(!JSON.stringify([pub.error.data, adm.value]).includes('2.0000'))
  })

  test('la primera tasa real se configura desde el panel (sin versión previa) y queda como único elemento del historial', async () => {
    const stale = await run(putAdmin, ev('PUT', { token: 'tk-leader', body: { rate: '2.2', expectedUpdatedAt: '2020-01-01T00:00:00.000Z' } }))
    assert.equal(stale.error.statusCode, 409, 'con una versión inexistente no se guarda')
    assert.ok(!existsSync(file()))
    const first = await run(putAdmin, ev('PUT', { token: 'tk-leader', body: { rate: '2.2', expectedUpdatedAt: null } }))
    assert.equal(first.error, undefined)
    assert.equal(first.value.configured, true)
    assert.equal(first.value.rate, '2.2000')
    assert.equal(stored().history.length, 1)
    assert.equal(stored().source, 'admin')
    assert.equal((await run(getPublic, ev('GET', { session: false }))).value.rate, '2.2000')
    assert.deepEqual(readdirSync(state.dir).filter(n => n.endsWith('.tmp')), [], 'no quedan temporales')
  })

  test('una tasa modificada persiste (reinicio / reconstrucción / redespliegue)', async () => {
    seedRate()
    const first = stored().updatedAt
    const saved = await run(putAdmin, ev('PUT', { token: 'tk-leader', body: { rate: '2.0126', expectedUpdatedAt: first } }))
    assert.equal(saved.value.rate, '2.0126')
    // «Reinicio»: nada vive en memoria del proceso; cada lectura va al archivo, y un despliegue no toca el directorio de contenido.
    for (let i = 0; i < 3; i++) assert.equal((await run(getPublic, ev('GET', { session: false }))).value.rate, '2.0126')
    assert.equal(stored().history.length, 2)
    assert.equal(stored().source, 'admin')
  })

  test('lecturas concurrentes sin configurar: todas responden «no configurada» y no se crea archivo', async () => {
    const all = await Promise.all(Array.from({ length: 8 }, () => run(getPublic, ev('GET', { session: false }))))
    assert.ok(all.every(r => r.error?.data?.code === 'rate_not_configured'))
    assert.ok(!existsSync(file()))
  })

  test('actualiza y recupera la tasa con cuatro decimales sin perder precisión (2, 2.12, 2.0126)', async () => {
    seedRate()
    let version = (await run(getAdmin, ev('GET'))).value.updatedAt
    for (const [input, expected] of [['2.5', '2.5000'], [2.12, '2.1200'], ['2.0126', '2.0126'], ['0.0001', '0.0001'], ['5', '5.0000'], ['2', '2.0000']]) {
      await wait()
      const r = await run(putAdmin, ev('PUT', { body: { rate: input, expectedUpdatedAt: version } }))
      assert.equal(r.error, undefined, String(input))
      assert.equal(r.value.rate, expected)
      assert.equal(stored().rate, expected)
      assert.equal((await run(getAdmin, ev('GET'))).value.rate, expected)
      assert.equal((await run(getPublic, ev('GET', { session: false }))).value.rate, expected)
      version = r.value.updatedAt
    }
  })

  test('historial: tasa, fecha y usuario, el más reciente primero; guardar la misma tasa no agrega una entrada', async () => {
    seedRate()
    const v0 = (await run(getAdmin, ev('GET'))).value.updatedAt
    const a = await run(putAdmin, ev('PUT', { token: 'tk-designer', body: { rate: '2.5', expectedUpdatedAt: v0 } }))
    await wait()
    const b = await run(putAdmin, ev('PUT', { token: 'tk-leader', body: { rate: '2.75', expectedUpdatedAt: a.value.updatedAt } }))
    assert.deepEqual(b.value.history.map(h => [h.rate, h.updatedBy.name, h.source]), [
      ['2.7500', 'Líder Planmed', 'admin'], ['2.5000', 'Diseñadora Planmed', 'admin'], ['2.0000', 'Configuración de prueba', 'admin']
    ])
    assert.equal(b.value.updatedBy.id, 7)
    const same = await run(putAdmin, ev('PUT', { token: 'tk-leader', body: { rate: '2.75', expectedUpdatedAt: b.value.updatedAt } }))
    assert.equal(same.value.history.length, 3)
    assert.ok(existsSync(join(state.dir, 'financing-rate.prev.json')), 'respaldo de la versión anterior')
  })
})

describe('validación de formato y rango (servidor)', () => {
  test('rechaza coma decimal, más de 4 decimales, texto, vacío, cero, negativos, exponentes y fuera de rango, sin guardar nada', async () => {
    seedRate()
    const v = (await run(getAdmin, ev('GET'))).value.updatedAt
    const before = readFileSync(file(), 'utf8')
    for (const bad of ['2,5', '2.12345', 'abc', '', '   ', '0', '0.0000', '0.00001', '-1', '+2', '5.0001', '6', '100', '1e1', '2.', '.5', '2.0.1', '2 %', '1.000,5', null, undefined, NaN, {}, [], true]) {
      const r = await run(putAdmin, ev('PUT', { body: { rate: bad, expectedUpdatedAt: v } }))
      assert.equal(r.error?.statusCode, 422, `debía rechazar ${JSON.stringify(bad)}`)
      assert.ok(typeof r.error.data.errors.rate === 'string' && r.error.data.errors.rate.length > 5)
    }
    assert.equal(readFileSync(file(), 'utf8'), before, 'el archivo no cambió')
  })

  test('mensajes específicos: coma y exceso de decimales', async () => {
    const v = (await run(getAdmin, ev('GET'))).value.updatedAt
    assert.match((await run(putAdmin, ev('PUT', { body: { rate: '2,5', expectedUpdatedAt: v } }))).error.message, /punto/i)
    assert.match((await run(putAdmin, ev('PUT', { body: { rate: '2.12345', expectedUpdatedAt: v } }))).error.message, /cuatro decimales/i)
  })

  test('cuerpo ausente o no objeto => 422', async () => {
    for (const body of [undefined, null, 'x', 5, []]) assert.equal((await run(putAdmin, ev('PUT', { body }))).error?.statusCode, 422)
  })
})

describe('permisos: líder y diseñadora; nadie más', () => {
  test('líder y diseñadora consultan y modifican la tasa', async () => {
    for (const token of ['tk-leader', 'tk-designer']) {
      await wait()
      const g = await run(getAdmin, ev('GET', { token }))
      assert.equal(g.error, undefined, token)
      const p = await run(putAdmin, ev('PUT', { token, body: { rate: token === 'tk-leader' ? '2.2' : '2.3', expectedUpdatedAt: g.value.updatedAt } }))
      assert.equal(p.error, undefined, token)
    }
  })

  test('un rol del CMS que no es líder ni diseño, y un rol ajeno al CMS, reciben 403 y no escriben', async () => {
    seedRate()
    const v = (await run(getAdmin, ev('GET'))).value.updatedAt
    const before = readFileSync(file(), 'utf8')
    for (const token of ['tk-other', 'tk-outsider']) {
      assert.equal((await run(getAdmin, ev('GET', { token }))).error?.statusCode, 403, `GET ${token}`)
      assert.equal((await run(putAdmin, ev('PUT', { token, body: { rate: '3', expectedUpdatedAt: v } }))).error?.statusCode, 403, `PUT ${token}`)
    }
    assert.equal(readFileSync(file(), 'utf8'), before)
  })

  test('el permiso de la diseñadora sale de NUXT_RATE_EDITOR_ROLE_IDS: sin su rol listado, 403; el líder conserva el acceso', async () => {
    state.config = { rateEditorRoleIds: '' }
    assert.equal((await run(getAdmin, ev('GET', { token: 'tk-designer' }))).error?.statusCode, 403)
    assert.equal((await run(getAdmin, ev('GET', { token: 'tk-leader' }))).error, undefined)
    state.config = { rateEditorRoleIds: '25' }
    assert.equal((await run(getAdmin, ev('GET', { token: 'tk-other' }))).error, undefined)
    assert.equal((await run(getAdmin, ev('GET', { token: 'tk-designer' }))).error?.statusCode, 403)
  })

  test('sin sesión 401; otro origen o sin señal de origen 403; token vencido 401 y sesión limpia; Hub caído 503', async () => {
    assert.equal((await run(putAdmin, ev('PUT', { session: false, body: { rate: '2', expectedUpdatedAt: 'x' } }))).error?.statusCode, 401)
    assert.equal((await run(getAdmin, ev('GET', { session: false }))).error?.statusCode, 401)
    assert.equal((await run(putAdmin, ev('PUT', { origin: false, body: { rate: '2', expectedUpdatedAt: 'x' } }))).error?.statusCode, 403)
    assert.equal((await run(putAdmin, ev('PUT', { origin: false, headers: { origin: 'https://evil.example' }, body: { rate: '2', expectedUpdatedAt: 'x' } }))).error?.statusCode, 403)
    state.cleared = false
    state.hub['tk-designer'] = 401
    assert.equal((await run(getAdmin, ev('GET'))).error?.statusCode, 401)
    assert.equal(state.cleared, true)
    state.hub['tk-designer'] = 'down'
    assert.equal((await run(getAdmin, ev('GET'))).error?.statusCode, 503)
    assert.equal((await run(putAdmin, ev('PUT', { body: { rate: '2.5', expectedUpdatedAt: 'x' } }))).error?.statusCode, 503)
  })

  test('el 422 no se adelanta a la autenticación ni a la autorización', async () => {
    assert.equal((await run(putAdmin, ev('PUT', { session: false, body: { rate: 'basura' } }))).error?.statusCode, 401)
    assert.equal((await run(putAdmin, ev('PUT', { token: 'tk-outsider', body: { rate: 'basura' } }))).error?.statusCode, 403)
  })

  test('acceso a Configuración: el líder ve colaboradores y tasa; la diseñadora solo la tasa; el resto 403', async () => {
    assert.deepEqual((await run(access, ev('GET', { token: 'tk-leader' }))).value, { ok: true, canManageLine: true, canManageRate: true })
    assert.deepEqual((await run(access, ev('GET', { token: 'tk-designer' }))).value, { ok: true, canManageLine: false, canManageRate: true })
    for (const token of ['tk-other', 'tk-outsider']) assert.equal((await run(access, ev('GET', { token }))).error?.statusCode, 403, token)
    assert.equal((await run(access, ev('GET', { session: false }))).error?.statusCode, 401)
  })

  test('el usuario público informa canEditRate sin exponer permisos ni token', () => {
    const e = ev('GET')
    assert.equal(globalThis.toPublicUser(LEADER, e).canEditRate, true)
    assert.equal(globalThis.toPublicUser(DESIGNER, e).canEditRate, true)
    assert.equal(globalThis.toPublicUser(OTHER_CMS, e).canEditRate, false)
    assert.deepEqual(Object.keys(globalThis.toPublicUser(DESIGNER, e)).sort(), ['canAccessConfiguration', 'canCreateMicrosites', 'canCreatePrp', 'canDeletePrp', 'canEditContent', 'canEditPrp', 'canEditRate', 'canViewMicrosites', 'canViewNews', 'canViewPatients', 'canViewProcedures', 'canViewRecommendations', 'email', 'id', 'isAreaLeader', 'mustChangePassword', 'name', 'role'])
  })

  test('colaboradores sigue siendo solo del líder (la diseñadora no lo gana)', async () => {
    assert.equal((await run(globalThis.requireAreaLeader, ev('GET', { token: 'tk-leader' }))).error, undefined)
    assert.equal((await run(globalThis.requireAreaLeader, ev('GET', { token: 'tk-designer' }))).error?.statusCode, 403)
  })
})

describe('concurrencia', () => {
  test('una edición con una versión vieja => 409 y no pisa la más reciente', async () => {
    const v0 = (await run(getAdmin, ev('GET'))).value.updatedAt
    await wait()
    const a = await run(putAdmin, ev('PUT', { token: 'tk-leader', body: { rate: '2.4', expectedUpdatedAt: v0 } }))
    const stale = await run(putAdmin, ev('PUT', { token: 'tk-designer', body: { rate: '2.9', expectedUpdatedAt: v0 } }))
    assert.equal(stale.error?.statusCode, 409)
    assert.equal(stored().rate, '2.4000')
    assert.equal(a.value.rate, '2.4000')
  })

  test('dos guardados simultáneos con la misma versión: exactamente uno gana', async () => {
    seedRate()
    const v0 = (await run(getAdmin, ev('GET'))).value.updatedAt
    await wait()
    const [x, y] = await Promise.all([
      run(putAdmin, ev('PUT', { token: 'tk-leader', body: { rate: '2.4', expectedUpdatedAt: v0 } })),
      run(putAdmin, ev('PUT', { token: 'tk-designer', body: { rate: '2.9', expectedUpdatedAt: v0 } }))
    ])
    assert.deepEqual([x.error?.statusCode ?? 200, y.error?.statusCode ?? 200].sort(), [200, 409])
    assert.equal(stored().history.length, 2)
  })

  test('sin expectedUpdatedAt no se guarda (409)', async () => {
    seedRate()
    await run(getAdmin, ev('GET'))
    assert.equal((await run(putAdmin, ev('PUT', { body: { rate: '2.4' } }))).error?.statusCode, 409)
  })
})

describe('configuración no disponible: error explícito, nunca un 2 % silencioso', () => {
  const entry = { version: 1, updatedAt: '2026-10-01T00:00:00.000Z', updatedBy: { id: 1, name: 'x' }, source: 'admin', history: [] }
  const corrupt = [
    ['JSON dañado', '{ no es json'],
    ['valor fuera de rango', JSON.stringify({ ...entry, rate: '9.0000' })],
    ['valor con formato ambiguo', JSON.stringify({ ...entry, rate: '2,5' })],
    ['tasa no canónica', JSON.stringify({ ...entry, rate: '2.5' })],
    ['sin versión', JSON.stringify({ rate: '2.0000' })]
  ]
  for (const [label, content] of corrupt) {
    test(`${label}: público y administración responden 503 rate_unavailable y el archivo no se sobrescribe`, async () => {
      writeFileSync(file(), content)
      const p = await run(getPublic, ev('GET', { session: false }))
      assert.equal(p.error?.statusCode, 503)
      assert.equal(p.error.data.code, 'rate_unavailable')
      assert.equal((await run(getAdmin, ev('GET'))).error?.statusCode, 503)
      assert.equal((await run(putAdmin, ev('PUT', { body: { rate: '2.4', expectedUpdatedAt: '2026-10-01T00:00:00.000Z' } }))).error?.statusCode, 503)
      assert.equal(readFileSync(file(), 'utf8'), content)
    })
  }

  test('directorio inaccesible (ruta real): el resultado depende del código de error del sistema y es determinista en cada plataforma', async () => {
    const blocker = join(state.dir, 'archivo-no-directorio')
    writeFileSync(blocker, 'x')
    state.dir = join(blocker, 'contenido') // un archivo en medio del camino impide leer/crear el directorio
    // Linux/macOS: ENOTDIR => lectura imposible => rate_unavailable. Windows: ENOENT => «no configurada» => rate_not_configured. Se sondea el código real.
    let code = ''
    try { readFileSync(file()) } catch (e) { code = e.code }
    const expected = code === 'ENOENT' ? 'rate_not_configured' : 'rate_unavailable'
    const p = await run(getPublic, ev('GET', { session: false }))
    assert.equal(p.error?.statusCode, 503)
    assert.equal(p.error.data.code, expected, `código del sistema: ${code}`)
    assert.ok(!existsSync(file()))
    // Guardar tampoco puede crear un directorio bajo un archivo: error explícito, nunca una tasa inventada.
    const w = await run(putAdmin, ev('PUT', { token: 'tk-leader', body: { rate: '2.2', expectedUpdatedAt: null } }))
    assert.equal(w.error?.statusCode, 500)
  })

  test('error de lectura distinto de «no existe» (EACCES/EIO/ENOTDIR): SIEMPRE rate_unavailable, en cualquier sistema operativo', async (t) => {
    for (const code of ['EACCES', 'EIO', 'ENOTDIR']) {
      t.mock.method(fsp, 'readFile', async () => { throw Object.assign(new Error(code), { code }) })
      syncBuiltinESMExports()
      let p, a
      try {
        p = await run(getPublic, ev('GET', { session: false }))
        a = await run(getAdmin, ev('GET', { token: 'tk-leader' }))
      } finally { t.mock.restoreAll(); syncBuiltinESMExports() }
      assert.equal(p.error?.statusCode, 503, code)
      assert.equal(p.error.data.code, 'rate_unavailable', code)
      assert.equal(a.error?.statusCode, 503, `admin ${code}`)
    }
    assert.ok(!existsSync(file()))
  })

  test('«no existe» (ENOENT) SIEMPRE es rate_not_configured, en cualquier sistema operativo', async (t) => {
    t.mock.method(fsp, 'readFile', async () => { throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }) })
    syncBuiltinESMExports()
    let p
    try { p = await run(getPublic, ev('GET', { session: false })) } finally { t.mock.restoreAll(); syncBuiltinESMExports() }
    assert.equal(p.error?.statusCode, 503)
    assert.equal(p.error.data.code, 'rate_not_configured')
  })
})

describe('vista pública y primera tasa (autorización)', () => {
  test('financingRatePublicView solo expone rate y updatedAt: nunca quién modificó la tasa, el origen ni el historial', () => {
    const entry = { rate: '2.2000', updatedAt: '2026-11-01T10:00:00.000Z', updatedBy: { id: 4242, name: 'Nombre Secreto' }, source: 'admin' }
    const view = globalThis.financingRatePublicView({ version: 1, ...entry, history: [entry] })
    assert.deepEqual(Object.keys(view).sort(), ['rate', 'updatedAt'])
    assert.ok(!JSON.stringify(view).includes('Nombre Secreto') && !JSON.stringify(view).includes('4242'))
  })

  test('la respuesta HTTP pública tampoco filtra el autor (ruta real)', async () => {
    const entry = { rate: '2.2000', updatedAt: new Date().toISOString(), updatedBy: { id: 4242, name: 'Nombre Secreto' }, source: 'admin' }
    writeFileSync(file(), JSON.stringify({ version: 1, ...entry, history: [entry] }))
    const { value } = await run(getPublic, ev('GET', { session: false }))
    assert.deepEqual(Object.keys(value).sort(), ['rate', 'updatedAt'])
    assert.ok(!JSON.stringify(value).includes('Nombre Secreto'))
  })

  test('superadmin global verificado por Hub (is_global_admin === true) puede configurar la PRIMERA tasa', async () => {
    const r = await run(putAdmin, ev('PUT', { token: 'tk-super', body: { rate: '2.2', expectedUpdatedAt: null } }))
    assert.equal(r.error, undefined)
    assert.equal(r.value.configured, true)
    assert.equal(stored().updatedBy.name, 'Superadmin Hub')
    assert.equal((await run(getPublic, ev('GET', { session: false }))).value.rate, '2.2000')
  })

  test('un valor NO estricto de is_global_admin ("true", 1) no concede nada', async () => {
    const r = await run(putAdmin, ev('PUT', { token: 'tk-fake-super', body: { rate: '2.2', expectedUpdatedAt: null } }))
    assert.equal(r.error?.statusCode, 403)
    assert.ok(!existsSync(file()))
  })

  test('sin ningún perfil autorizado (sin IDs de rol, usuario no líder): 403 al crear la primera tasa, no se crea archivo y el público sigue sin tasa', async () => {
    state.config = { rateEditorRoleIds: '' }
    for (const token of ['tk-designer', 'tk-other', 'tk-outsider']) {
      assert.equal((await run(getAdmin, ev('GET', { token }))).error?.statusCode, 403, `GET ${token}`)
      assert.equal((await run(putAdmin, ev('PUT', { token, body: { rate: '2.2', expectedUpdatedAt: null } }))).error?.statusCode, 403, `PUT ${token}`)
    }
    assert.ok(!existsSync(file()))
    assert.equal((await run(getPublic, ev('GET', { session: false }))).error.data.code, 'rate_not_configured')
  })

  test('sin sesión no se crea la primera tasa (401)', async () => {
    const r = await run(putAdmin, ev('PUT', { session: false, body: { rate: '2.2', expectedUpdatedAt: null } }))
    assert.equal(r.error?.statusCode, 401)
    assert.ok(!existsSync(file()))
  })

  test('el superadmin también modifica una tasa existente (con la versión vigente) y no con una versión vieja', async () => {
    seedRate()
    const v = (await run(getAdmin, ev('GET', { token: 'tk-super' }))).value.updatedAt
    assert.equal((await run(putAdmin, ev('PUT', { token: 'tk-super', body: { rate: '2.9', expectedUpdatedAt: '2020-01-01T00:00:00.000Z' } }))).error?.statusCode, 409)
    assert.equal((await run(putAdmin, ev('PUT', { token: 'tk-super', body: { rate: '2.9', expectedUpdatedAt: v } }))).value.rate, '2.9000')
  })
})

describe('constantes de validación', () => {
  test('mayor que 0 y hasta 5 %, cuatro decimales, placeholder con punto decimal', () => {
    assert.equal(F.FINANCING_RATE_MIN_PERCENT, 0.0001)
    assert.equal(F.FINANCING_RATE_MAX_PERCENT, 5)
    assert.equal(F.FINANCING_RATE_DECIMALS, 4)
    assert.equal(F.FINANCING_RATE_PLACEHOLDER, 'Ej. 2.0126 (usa punto decimal)')
  })
})

describe('escritura robusta', () => {
  test('updatedAt es ESTRICTAMENTE creciente aunque dos guardados caigan en el mismo milisegundo o el reloj retroceda', async (t) => {
    const v0 = (await run(getAdmin, ev('GET'))).value.updatedAt
    const fixed = Date.now() + 60_000
    const clock = t.mock.method(Date, 'now', () => fixed)
    const a = await run(putAdmin, ev('PUT', { body: { rate: '2.1', expectedUpdatedAt: v0 } }))
    const b = await run(putAdmin, ev('PUT', { body: { rate: '2.2', expectedUpdatedAt: a.value.updatedAt } })) // mismo milisegundo
    clock.mock.mockImplementation(() => fixed - 5_000)
    const c = await run(putAdmin, ev('PUT', { body: { rate: '2.3', expectedUpdatedAt: b.value.updatedAt } })) // el reloj retrocede
    assert.ok([a, b, c].every(r => !r.error), 'los tres guardados son válidos')
    assert.ok(a.value.updatedAt < b.value.updatedAt && b.value.updatedAt < c.value.updatedAt, `${a.value.updatedAt} < ${b.value.updatedAt} < ${c.value.updatedAt}`)
    // Un editor que abrió el formulario con la versión de «a» NO puede pisar lo guardado después: 409.
    const stale = await run(putAdmin, ev('PUT', { body: { rate: '2.9', expectedUpdatedAt: a.value.updatedAt } }))
    assert.equal(stale.error?.statusCode, 409)
    assert.equal(stored().rate, '2.3000')
    assert.equal(new Set(stored().history.map(h => h.updatedAt)).size, stored().history.length, 'las versiones del historial no se repiten')
  })

  for (const [label, fn] of [['rename', 'rename'], ['writeFile', 'writeFile']]) {
    test(`si falla ${label} al guardar: 500, sin .tmp huérfano y el archivo vigente intacto`, async (t) => {
      seedRate()
      const v0 = (await run(getAdmin, ev('GET'))).value.updatedAt
      const before = readFileSync(file(), 'utf8')
      t.mock.method(fsp, fn, async (...args) => {
        // writeFile deja un archivo parcial en disco antes de fallar, como un disco lleno; rename falla con el temporal ya escrito.
        if (fn === 'writeFile') { await (await import('node:fs')).promises.appendFile(args[0], '{"parcial":'); }
        throw Object.assign(new Error('EIO'), { code: 'EIO' })
      })
      syncBuiltinESMExports()
      let r
      try { r = await run(putAdmin, ev('PUT', { body: { rate: '2.8', expectedUpdatedAt: v0 } })) } finally { t.mock.restoreAll(); syncBuiltinESMExports() }
      assert.equal(r.error?.statusCode, 500)
      assert.deepEqual(readdirSync(state.dir).filter(n => n.endsWith('.tmp')), [], 'no queda ningún temporal')
      assert.equal(readFileSync(file(), 'utf8'), before, 'el archivo vigente no cambió')
      // Y el servicio sigue funcionando después del fallo.
      assert.equal((await run(putAdmin, ev('PUT', { body: { rate: '2.8', expectedUpdatedAt: v0 } }))).value.rate, '2.8000')
    })
  }
})

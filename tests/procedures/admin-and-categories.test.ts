// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Administración de procedimientos (D7.1). Pruebas con HUB SIMULADO (FakeHub): comprueban qué le pide Crediestética al Hub y cómo traduce
// sus respuestas (permisos 403, validación 422, sesión 401). NO prueban escrituras reales; las lecturas reales están en tests/integration/hub-readonly.test.ts.
import { test, describe, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { FakeHub, HUB_TOKEN, ROOT, makeEvent, run, setup } from '../recommendations/harness.ts'

const hub = new FakeHub()
let api: any
const src = (rel: string) => readFileSync(join(ROOT, rel), 'utf8')
const fresh = () => { hub.calls = []; hub.rules = []; hub.sessionCleared = false; hub.token = HUB_TOKEN }
const cms = (over = {}) => ({ id: 188, nombre: 'Mamoplastia', slug: 'mamoplastia-1794324501', categoria_slug: 'corporal', activo: true, destacado: false, is_master: false, ...over })

before(async () => { api = await setup(hub) })

describe('categorías (solo lectura desde Hub)', () => {
  test('se mapean slug, nombre y cantidad; se descartan filas sin slug o sin nombre', async () => {
    fresh()
    hub.on('GET', '/v1/web/categorias-cirugias', 200, { data: [{ nombre: 'Corporal', slug: 'corporal', cirugias_count: 1 }, { nombre: '', slug: 'x' }, { slug: 'y' }] })
    const { value, error } = await run(await api.handler('server/api/public/procedure-categories.get.ts'), makeEvent())
    assert.equal(error, undefined)
    assert.deepEqual(value, [{ slug: 'corporal', name: 'Corporal', count: 1 }])
  })

  test('lista vacía no es un error; un fallo del Hub sí lo es (503) y no se disfraza de vacío', async () => {
    fresh()
    hub.on('GET', '/v1/web/categorias-cirugias', 200, { data: [] })
    assert.deepEqual((await run(await api.handler('server/api/public/procedure-categories.get.ts'), makeEvent())).value, [])
    fresh()
    hub.on('GET', '/v1/web/categorias-cirugias', 500, {})
    const { error } = await run(await api.handler('server/api/public/procedure-categories.get.ts'), makeEvent())
    assert.ok(error, 'debe fallar')
    assert.ok([502, 503].includes(error.statusCode), `statusCode ${error.statusCode}`)
  })

  test('solo lectura: la ruta no envía nada al Hub salvo un GET con el tenant de la configuración', async () => {
    fresh()
    hub.on('GET', '/v1/web/categorias-cirugias', 200, { data: [] })
    await run(await api.handler('server/api/public/procedure-categories.get.ts'), makeEvent())
    assert.deepEqual(hub.calls.map(c => `${c.method} ${c.path}`), ['GET /v1/web/categorias-cirugias'])
    assert.equal(/X-Tenant-Domain/i.test(src('server/api/public/procedure-categories.get.ts')), false)
  })

  test('no existen rutas para crear, editar ni ordenar categorías (Hub no ofrece ese contrato)', () => {
    const walk = (d) => readdirSync(join(ROOT, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`])
    assert.deepEqual(walk('server/api').filter(f => /categor/i.test(f) && !/\.get\.ts$/.test(f)), [])
    assert.deepEqual(walk('server/api/admin').filter(f => /categor/i.test(f)), [])
  })
})

describe('formulario y listado: las categorías reales aparecen y el ejemplo es correcto', () => {
  const form = src('pages/admin/procedimientos/[slug].vue')
  const list = src('pages/procedimientos/index.vue')

  test('el admin sugiere las categorías reales (datalist) y ya no propone un slug inexistente', () => {
    assert.match(form, /list="procedure-category-options"/)
    assert.match(form, /<datalist id="procedure-category-options"/)
    assert.match(form, /\/api\/public\/procedure-categories/)
    assert.equal(form.includes('cirugia-corporal'), false)
    assert.match(form, /las categorías se administran en Wellezy Hub/)
  })

  test('el catálogo público usa el nombre real de la categoría, con respaldo en el slug', () => {
    assert.match(list, /\/api\/public\/procedure-categories/)
    // La etiqueta (nombre real con respaldo en el slug) vive en el helper compartido (D8.3), que el catálogo y el detalle usan.
    assert.match(list, /procedureCategoryLabel\(slug, categoryNames\.value\)/)
    const helper = src('shared/utils/procedureCategories.ts')
    assert.match(helper, /\?\.name/)
    assert.match(helper, /replace\(\/\[-_\]\+\/g/)
  })
})

describe('administración de procedimientos: Hub es la autoridad de permisos (HUB SIMULADO)', () => {
  const session = { token: HUB_TOKEN }
  const post = (body) => makeEvent({ method: 'POST', body, headers: { host: 'x.test', origin: 'https://x.test' }, session })

  test('crear: envía solo los campos que Hub acepta, nunca company_id/linea_id, y el slug de categoría tal cual', async () => {
    fresh()
    hub.on('POST', '/cms/procedures', 201, cms())
    hub.on('GET', '/cms/procedures/188', 200, { data: cms() })
    const { error } = await run(await api.handler('server/api/admin/procedures/index.post.ts'), post({ name: 'Mamoplastia', category: 'corporal', shortDescription: 'x', company_id: 99, linea_id: 9 }))
    const sent = hub.calls.find(c => c.method === 'POST' && c.path === '/cms/procedures')
    assert.ok(sent, error?.message)
    assert.equal(sent.body.categoria_slug, 'corporal')
    assert.equal(sent.body.nombre, 'Mamoplastia')
    assert.equal('company_id' in sent.body || 'linea_id' in sent.body, false)
  })

  test('sin el permiso cirugias.crear Hub responde 403 y el panel lo recibe como 403 (no se oculta ni se reintenta)', async () => {
    fresh()
    hub.on('POST', '/cms/procedures', 403, { message: 'This action is unauthorized.' })
    const { error } = await run(await api.handler('server/api/admin/procedures/index.post.ts'), post({ name: 'X', category: 'corporal' }))
    assert.equal(error?.statusCode, 403)
    assert.equal(hub.calls.filter(c => c.method === 'POST').length, 1)
  })

  test('una categoría que Hub no reconoce (422) llega al formulario como 422 con el mensaje de Hub', async () => {
    fresh()
    hub.on('POST', '/cms/procedures', 422, { message: 'The selected categoria slug is invalid.', errors: { categoria_slug: ['The selected categoria slug is invalid.'] } })
    const { error } = await run(await api.handler('server/api/admin/procedures/index.post.ts'), post({ name: 'X', category: 'no-existe' }))
    assert.equal(error?.statusCode, 422)
  })

  test('sesión vencida (401 de Hub) cierra la sesión local', async () => {
    fresh()
    hub.on('POST', '/cms/procedures', 401, { message: 'Unauthenticated.' })
    const { error } = await run(await api.handler('server/api/admin/procedures/index.post.ts'), post({ name: 'X' }))
    assert.equal(error?.statusCode, 401)
    assert.equal(hub.sessionCleared, true)
  })

  test('no hay almacenamiento local de procedimientos ni de categorías (Hub es la fuente)', () => {
    const files = ['server/api/admin/procedures/index.post.ts', 'server/api/admin/procedures/[id].put.ts', 'server/api/public/procedure-categories.get.ts']
    for (const f of files) assert.equal(/writeFile|useStorage|localStorage/.test(src(f)), false, f)
  })
})

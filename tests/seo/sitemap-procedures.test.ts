// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Sitemap dinámico de procedimientos: listado completo de Hub (todo o nada), validación de paginación y slugs, plugin del hook `sitemap:input`
// y contrato del endpoint público. Hub se simula con FakeHub: NINGUNA prueba hace peticiones reales.
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { FakeHub, ROOT, makeEvent, run, setup } from '../recommendations/harness.ts'

const hub = new FakeHub()
const src = rel => readFileSync(join(ROOT, rel), 'utf8')
const imp = rel => import(pathToFileURL(join(ROOT, rel)).href)
const LIST = /^\/v1\/web\/cirugias\?page=(\d+)$/
const row = (slug, extra = {}) => ({ slug, nombre: `Procedimiento ${slug}`, ...extra })

let api, S, plugin, procSlug
const realError = console.error
let logs = []
before(async () => {
  api = await setup(hub)
  S = await imp('server/utils/procedureSitemap.ts')
  procSlug = await imp('shared/utils/procedureSlug.ts')
  Object.assign(globalThis, S)
  globalThis.defineNitroPlugin = fn => fn
  plugin = (await imp('server/plugins/sitemap-procedures.ts')).default
  console.error = (...a) => { logs.push(a.join(' ')) }
})
after(() => { console.error = realError })
const fresh = () => { hub.calls = []; hub.rules = []; logs = [] }

/** Hub paginado: `pages[n-1]` es el cuerpo de la página n+1 (o { status, data } para forzar una respuesta). */
function hubPages(pages) {
  hub.on('GET', LIST, call => pages[Number(call.path.match(LIST)[1]) - 1]?.status ?? 200, call => {
    const p = pages[Number(call.path.match(LIST)[1]) - 1]
    return p && 'status' in p ? p.data : p
  })
}
const body = (slugs, last_page) => ({ data: slugs.map(s => row(s)), meta: { last_page } })
const fetchAll = () => run(globalThis.fetchPublicProcedureRows, makeEvent())
const entries = () => run(S.procedureSitemapEntries, makeEvent())

describe('listado completo de Hub (fetchPublicProcedureRows)', () => {
  test('1. lista vacía válida: 200 con data: [] es una respuesta válida (no un error)', async () => {
    fresh(); hubPages([{ data: [], meta: { last_page: 1 } }])
    const r = await fetchAll()
    assert.equal(r.error, undefined)
    assert.deepEqual(r.value, [])
    fresh(); hubPages([{ data: [] }]) // sin meta: formato histórico
    assert.deepEqual((await fetchAll()).value, [])
  })

  test('2. una sola página: devuelve todas las filas y consulta solo esa página', async () => {
    fresh(); hubPages([body(['rinoplastia', 'mamoplastia'], 1)])
    const r = await fetchAll()
    assert.deepEqual(r.value.map(x => x.slug), ['rinoplastia', 'mamoplastia'])
    assert.deepEqual(hub.calls.map(c => c.path), ['/v1/web/cirugias?page=1'])
  })

  test('3. varias páginas: recorre todas, en orden, y las concatena', async () => {
    fresh(); hubPages([body(['a', 'b'], 3), body(['c'], 3), body(['d', 'e'], 3)])
    const r = await fetchAll()
    assert.deepEqual(r.value.map(x => x.slug), ['a', 'b', 'c', 'd', 'e'])
    assert.deepEqual(hub.calls.map(c => c.path), [1, 2, 3].map(n => `/v1/web/cirugias?page=${n}`))
  })

  test('3b. last_page acepta el entero como texto de dígitos (compatibilidad con el formato actual)', async () => {
    fresh(); hubPages([body(['a'], '2'), body(['b'], '2')])
    assert.deepEqual((await fetchAll()).value.map(x => x.slug), ['a', 'b'])
  })

  test('4. una página intermedia que falla => error (503), nunca una lista parcial', async () => {
    fresh(); hubPages([body(['a'], 3), { status: 500, data: {} }, body(['c'], 3)])
    const r = await fetchAll()
    assert.equal(r.value, undefined)
    assert.equal(r.error.statusCode, 503)
    assert.equal(r.error.data.reason, 'hub_unavailable')
    // También con una página intermedia que no responde (red) o llega malformada.
    for (const mid of [{ status: 0, data: undefined }, { status: 200, data: { data: 'x' } }]) {
      fresh(); hubPages([body(['a'], 3), mid, body(['c'], 3)])
      const e = (await fetchAll()).error
      assert.equal(e.statusCode, 503)
      assert.equal(e.data.reason, mid.status === 0 ? 'hub_unavailable' : 'invalid_response')
    }
  })

  test('5. error 500 de Hub => 503 hub_unavailable (y 503/sin respuesta igual)', async () => {
    for (const status of [500, 502, 503, 0]) {
      fresh(); hubPages([{ status, data: { message: 'x' } }])
      const { error } = await fetchAll()
      assert.equal(error.statusCode, 503, String(status))
      assert.equal(error.data.reason, 'hub_unavailable', String(status))
    }
  })

  test('6. Hub no resuelve el tenant => 503 tenant; 401/403 => rejected', async () => {
    fresh(); hubPages([{ status: 404, data: { message: 'Tenant Linea not found or inactive' } }])
    assert.equal((await fetchAll()).error.data.reason, 'tenant')
    for (const status of [401, 403]) {
      fresh(); hubPages([{ status, data: {} }])
      assert.equal((await fetchAll()).error.data.reason, 'rejected')
    }
  })

  test('7. HTTP 200 malformado (data no es una lista, cuerpo vacío, meta no objeto) => 503 invalid_response', async () => {
    for (const bad of [{ data: 'no-es-lista' }, {}, { data: null }, { data: {} }, { data: [], meta: 'x' }]) {
      fresh(); hubPages([bad])
      const { error } = await fetchAll()
      assert.equal(error.statusCode, 503, JSON.stringify(bad))
      assert.equal(error.data.reason, 'invalid_response', JSON.stringify(bad))
    }
  })

  test('8. last_page inválido (0, negativo, decimal, texto, objeto, NaN, infinito) => invalid_response', async () => {
    for (const last_page of [0, -1, 1.5, 'abc', '1.5', '-2', '', {}, [], true, Number.NaN, Infinity]) {
      fresh(); hubPages([{ data: [row('a')], meta: { last_page } }])
      const { error } = await fetchAll()
      assert.equal(error?.statusCode, 503, `last_page=${String(last_page)}`)
      assert.equal(error.data.reason, 'invalid_response', `last_page=${String(last_page)}`)
    }
    // Una página posterior con last_page inválido también invalida todo.
    fresh(); hubPages([body(['a'], 2), { data: [row('b')], meta: { last_page: 'x' } }])
    assert.equal((await fetchAll()).error.data.reason, 'invalid_response')
  })

  test('9. más páginas que el límite (20) => error controlado, sin lista aparentemente completa', async () => {
    fresh(); hubPages([body(['a'], 21)])
    const r = await fetchAll()
    assert.equal(r.value, undefined)
    assert.equal(r.error.statusCode, 503)
    assert.equal(r.error.data.reason, 'invalid_response')
    assert.equal(hub.calls.length, 1, 'no sigue consultando páginas')
    assert.ok(logs.some(l => /21 páginas/.test(l)), 'se registra la causa')
    // Exactamente 20 páginas sí se aceptan y se recorren todas.
    fresh(); hubPages(Array.from({ length: 20 }, (_, i) => body([`p-${i + 1}`], 20)))
    const ok = await fetchAll()
    assert.equal(ok.value.length, 20)
    assert.equal(hub.calls.length, 20)
    assert.equal(api.proc.HUB_PROCEDURES_MAX_PAGES, 20)
  })

  test('solo se hacen lecturas públicas GET (sin escrituras ni token)', async () => {
    fresh(); hubPages([body(['a'], 2), body(['b'], 2)])
    await fetchAll()
    assert.ok(hub.calls.length > 0)
    for (const c of hub.calls) { assert.equal(c.kind, 'public'); assert.equal(c.method, 'GET'); assert.equal(c.token, undefined) }
  })
})

describe('slugs y duplicados (procedureSitemapPaths)', () => {
  test('10. solo se generan rutas para slugs válidos; los inválidos se omiten y se registran (no en silencio)', () => {
    fresh()
    const bad = ['Rinoplastia', 'con espacio', 'doble--guion', '-inicio', 'fin-', '', 'a/b', '../admin', 'ñandú', 'x_y', '<script>']
    const paths = S.procedureSitemapPaths([row('rinoplastia'), ...bad.map(s => row(s)), row('lipo-360'), row('abdominoplastia-2')])
    assert.deepEqual(paths, ['/procedimientos/rinoplastia', '/procedimientos/lipo-360', '/procedimientos/abdominoplastia-2'])
    assert.ok(logs.some(l => l.includes(`${bad.length} procedimiento(s)`) && /slug inválido/.test(l)))
  })

  test('10b. una fila sin slug de texto (contrato roto) => error, no un sitemap incompleto', () => {
    for (const bad of [{}, { slug: null }, { slug: 7 }, null, 'texto', []]) {
      fresh()
      assert.throws(() => S.procedureSitemapPaths([row('ok'), bad]), e => e.statusCode === 503 && e.data.reason === 'invalid_response', JSON.stringify(bad))
    }
  })

  test('11. no se generan URLs duplicadas (aunque Hub repita el slug, también entre páginas)', async () => {
    fresh(); hubPages([body(['a', 'b', 'a'], 2), body(['b', 'c', 'a'], 2)])
    const { value } = await entries()
    assert.deepEqual(value, [{ loc: '/procedimientos/a' }, { loc: '/procedimientos/b' }, { loc: '/procedimientos/c' }])
  })

  test('el patrón es el mismo que valida el detalle público', () => {
    assert.equal(procSlug.PROCEDURE_SLUG_PATTERN.source, '^[a-z0-9]+(?:-[a-z0-9]+)*$')
    assert.ok(src('server/api/public/procedures/[slug].get.ts').includes(`/${procSlug.PROCEDURE_SLUG_PATTERN.source}/`))
  })
})

describe('integración con el sitemap (plugin del hook sitemap:input)', () => {
  const install = () => {
    const hooks = {}
    plugin({ hooks: { hook: (name, fn) => { hooks[name] = fn } } })
    return hooks
  }

  test('13. registra un único hook `sitemap:input` y agrega los procedimientos de Hub a las URLs existentes', async () => {
    fresh(); hubPages([body(['rinoplastia', 'lipo'], 2), body(['mamoplastia'], 2)])
    const hooks = install()
    assert.deepEqual(Object.keys(hooks), ['sitemap:input'])
    const ctx = { urls: [{ loc: '/' }, { loc: '/nosotros' }], sitemapName: 'default', event: makeEvent() }
    await hooks['sitemap:input'](ctx)
    assert.deepEqual(ctx.urls.map(u => u.loc), ['/', '/nosotros', '/procedimientos/rinoplastia', '/procedimientos/lipo', '/procedimientos/mamoplastia'])
    // Rutas relativas: el módulo las convierte en absolutas con el dominio público (site.url).
    for (const u of ctx.urls) assert.ok(u.loc.startsWith('/'))
  })

  test('14. un error de Hub hace fallar el hook y NO modifica las URLs (nada parcial que se pueda publicar ni cachear)', async () => {
    const cases = {
      'hub caído': [{ status: 0, data: undefined }],
      'error 500': [{ status: 500, data: {} }],
      'tenant sin resolver': [{ status: 404, data: { message: 'Tenant Linea not found' } }],
      'página intermedia': [body(['a', 'b'], 3), { status: 500, data: {} }, body(['c'], 3)],
      'respuesta malformada': [body(['a'], 2), { data: 'x' }],
      'last_page inválido': [{ data: [row('a')], meta: { last_page: 'x' } }],
      'demasiadas páginas': [body(['a'], 99)],
      'fila sin slug': [{ data: [row('a'), {}], meta: { last_page: 1 } }]
    }
    for (const [name, pages] of Object.entries(cases)) {
      fresh(); hubPages(pages)
      const hooks = install()
      const ctx = { urls: [{ loc: '/' }], sitemapName: 'default', event: makeEvent() }
      const { error } = await run(hooks['sitemap:input'], ctx)
      assert.equal(error?.statusCode, 503, name)
      assert.deepEqual(ctx.urls, [{ loc: '/' }], `${name}: sin URLs parciales`)
    }
  })

  test('el sitemap usa el HOOK (que aborta ante un error) y no una fuente (que el módulo trata como no crítica y cachea)', () => {
    const plug = src('server/plugins/sitemap-procedures.ts')
    assert.match(plug, /\.hook\('sitemap:input', async \(ctx\)/)
    const cfg = src('nuxt.config.ts')
    assert.doesNotMatch(cfg, /sitemap:\s*\{[^}]*(sources|urls)\s*:/)
  })

  test('12. se conservan el dominio público y las exclusiones (/admin, /admin/**, /prp/**)', () => {
    const cfg = src('nuxt.config.ts')
    assert.match(cfg, /url: 'https:\/\/crediestetica\.com'/)
    assert.match(cfg, /sitemap: \{\s*exclude: \['\/admin', '\/admin\/\*\*', '\/prp\/\*\*'\]\s*\}/)
    assert.match(cfg, /'@nuxtjs\/sitemap'/)
  })

  test('no depende de CRM, PRP ni de otra fuente de datos; no hay lista manual de procedimientos', () => {
    for (const f of ['server/plugins/sitemap-procedures.ts', 'server/utils/procedureSitemap.ts']) {
      assert.doesNotMatch(src(f).replace(/\/\/.*$/gm, ''), /crm|prp|wellezyPublicPost|wellezyRequest|\bPOST\b/i, f)
    }
    assert.match(src('server/utils/procedureSitemap.ts'), /fetchPublicProcedureRows\(event\)/)
  })
})

describe('endpoint público de procedimientos: contrato anterior', () => {
  test('15. misma salida que antes (filas -> fromPublicListItem -> withOrientation), una y varias páginas, y lista vacía => []', async () => {
    const handler = await api.handler('server/api/public/procedures/index.get.ts')
    const rows = [row('a', { categoria_slug: 'facial' }), row('b'), row('c')]
    fresh(); hubPages([{ data: rows.slice(0, 2), meta: { last_page: 2 } }, { data: rows.slice(2), meta: { last_page: 2 } }])
    const got = await run(handler, makeEvent())
    const expected = await globalThis.withOrientation(makeEvent(), rows.map(globalThis.fromPublicListItem))
    assert.deepEqual(got.value, expected)
    assert.deepEqual(got.value.map(p => p.slug), ['a', 'b', 'c'])
    fresh(); hubPages([{ data: [], meta: { last_page: 1 } }])
    assert.deepEqual((await run(handler, makeEvent())).value, [])
  })

  test('15b. mismos errores que antes (503 con causa) y no recorta en silencio: con más de 20 páginas ahora falla', async () => {
    const handler = await api.handler('server/api/public/procedures/index.get.ts')
    for (const [reason, status, data] of [['hub_unavailable', 0, {}], ['hub_unavailable', 500, {}], ['tenant', 404, { message: 'Tenant x' }], ['rejected', 403, {}], ['invalid_response', 200, { data: 'x' }]]) {
      fresh(); hubPages([{ status, data }])
      const { error } = await run(handler, makeEvent())
      assert.equal(error.statusCode, 503)
      assert.equal(error.data.reason, reason)
    }
    fresh(); hubPages([body(['a'], 25)])
    assert.equal((await run(handler, makeEvent())).error.data.reason, 'invalid_response')
  })

  test('el endpoint público ya no duplica la paginación: usa la función compartida', () => {
    const f = src('server/api/public/procedures/index.get.ts')
    assert.match(f, /fetchPublicProcedureRows\(event\)/)
    assert.doesNotMatch(f, /wellezyPublicGet|last_page/)
  })
})

// Consistencia de la paginación: la PRIMERA respuesta puede omitir `meta`/`last_page` (formato histórico: una sola página), pero si anuncia
// más de una, TODAS las siguientes deben informar el mismo `last_page`. Si no, no se puede saber si el listado está completo => 503.
describe('consistencia de la paginación (nunca una lista parcial)', () => {
  const expectInconsistent = async (pages, name) => {
    fresh(); hubPages(pages)
    const r = await fetchAll()
    assert.equal(r.value, undefined, `${name}: no devuelve una lista parcial`)
    assert.equal(r.error?.statusCode, 503, name)
    assert.equal(r.error.data.reason, 'invalid_response', name)
    // El sitemap tampoco publica nada parcial y el endpoint público falla igual.
    const hooks = {}
    plugin({ hooks: { hook: (n, fn) => { hooks[n] = fn } } })
    const ctx = { urls: [{ loc: '/' }], sitemapName: 'default', event: makeEvent() }
    const s = await run(hooks['sitemap:input'], ctx)
    assert.equal(s.error?.statusCode, 503, `${name} (sitemap)`)
    assert.deepEqual(ctx.urls, [{ loc: '/' }], `${name}: el sitemap no recibe URLs parciales`)
    const handler = await api.handler('server/api/public/procedures/index.get.ts')
    assert.equal((await run(handler, makeEvent())).error?.data?.reason, 'invalid_response', `${name} (endpoint público)`)
  }

  test('la página 1 anuncia 3 páginas y la 2 no trae `meta` => error', async () => {
    await expectInconsistent([body(['a'], 3), { data: [row('b')] }, body(['c'], 3)], 'sin meta')
    await expectInconsistent([body(['a'], 3), { data: [row('b')], meta: null }, body(['c'], 3)], 'meta null')
  })

  test('la página 1 anuncia 3 páginas y la 2 no trae `last_page` => error', async () => {
    await expectInconsistent([body(['a'], 3), { data: [row('b')], meta: {} }, body(['c'], 3)], 'meta sin last_page')
    await expectInconsistent([body(['a'], 3), { data: [row('b')], meta: { current_page: 2 } }, body(['c'], 3)], 'solo current_page')
    await expectInconsistent([body(['a'], 3), { data: [row('b')], meta: { last_page: null } }, body(['c'], 3)], 'last_page null')
  })

  test('la página 1 anuncia 3 páginas y la 2 anuncia 2 => error', async () => {
    await expectInconsistent([body(['a'], 3), body(['b'], 2), body(['c'], 3)], '3 y luego 2')
  })

  test('la página 1 anuncia 2 páginas y la 2 anuncia 3 => error', async () => {
    await expectInconsistent([body(['a'], 2), body(['b'], 3), body(['c'], 3)], '2 y luego 3')
  })

  test('el total puede cambiar o faltar también en una página posterior a la 2 (la última)', async () => {
    await expectInconsistent([body(['a'], 3), body(['b'], 3), { data: [row('c')] }], 'la 3 sin meta')
    await expectInconsistent([body(['a'], 3), body(['b'], 3), body(['c'], 4)], 'la 3 anuncia 4')
    await expectInconsistent([body(['a'], 3), body(['b'], 3), body(['c'], 1)], 'la 3 anuncia 1')
  })

  test('un valor inválido en una página posterior (texto, 0, decimal, meta que no es objeto) => error', async () => {
    for (const bad of ['x', 0, -3, 1.5, {}, 'tres']) {
      await expectInconsistent([body(['a'], 3), { data: [row('b')], meta: { last_page: bad } }, body(['c'], 3)], `last_page=${JSON.stringify(bad)}`)
    }
    await expectInconsistent([body(['a'], 3), { data: [row('b')], meta: 'no-objeto' }, body(['c'], 3)], 'meta texto')
  })

  test('`meta` debe ser un objeto: un arreglo (typeof [] === "object"), texto, número o booleano se rechaza, en la primera página y en las posteriores', async () => {
    // Primera página con meta: [] (sin la guarda se aceptaría como «una sola página»): 503 invalid_response, sin lista parcial.
    await expectInconsistent([{ data: [row('a')], meta: [] }, body(['b'], 1)], 'primera página con meta: []')
    await expectInconsistent([{ data: [row('a')], meta: [{ last_page: 1 }] }], 'primera página con meta: [ {...} ]')
    // Página posterior con meta: [] tras anunciar varias páginas.
    await expectInconsistent([body(['a'], 3), { data: [row('b')], meta: [] }, body(['c'], 3)], 'página 2 con meta: []')
    await expectInconsistent([body(['a'], 3), body(['b'], 3), { data: [row('c')], meta: [] }], 'página 3 con meta: []')
    // Texto, número y booleano (la primera página también los rechaza; antes solo se probaban en páginas posteriores).
    for (const bad of ['x', '', 7, 0, true, false]) {
      await expectInconsistent([{ data: [row('a')], meta: bad }], `primera página con meta=${JSON.stringify(bad)}`)
      await expectInconsistent([body(['a'], 3), { data: [row('b')], meta: bad }, body(['c'], 3)], `página 2 con meta=${JSON.stringify(bad)}`)
    }
  })

  test('`meta` null o ausente conserva las reglas: válido solo en la primera página (una sola consulta); inválido en las posteriores', async () => {
    for (const first of [{ data: [row('a')] }, { data: [row('a')], meta: null }]) {
      fresh(); hubPages([first, body(['no-debe-leerse'], 1)])
      const r = await fetchAll()
      assert.deepEqual(r.value.map(x => x.slug), ['a'])
      assert.equal(hub.calls.length, 1)
    }
    await expectInconsistent([body(['a'], 2), { data: [row('b')], meta: null }], 'página 2 con meta null')
    await expectInconsistent([body(['a'], 2), { data: [row('b')] }], 'página 2 sin meta')
    // Un objeto válido sigue aceptándose.
    fresh(); hubPages([body(['a'], 2), body(['b'], 2)])
    assert.deepEqual((await fetchAll()).value.map(x => x.slug), ['a', 'b'])
  })

  test('todas las páginas anuncian 3 y responden bien => éxito con TODAS las filas, en orden', async () => {
    fresh(); hubPages([body(['a', 'b'], 3), body(['c'], 3), body(['d'], 3)])
    const r = await fetchAll()
    assert.equal(r.error, undefined)
    assert.deepEqual(r.value.map(x => x.slug), ['a', 'b', 'c', 'd'])
    assert.equal(hub.calls.length, 3)
    // Mismo total como texto en unas páginas y número en otras: es el mismo valor, no un cambio.
    fresh(); hubPages([body(['a'], 2), body(['b'], '2')])
    assert.deepEqual((await fetchAll()).value.map(x => x.slug), ['a', 'b'])
  })

  test('primera página sin metadatos: compatibilidad histórica, una sola consulta', async () => {
    for (const first of [{ data: [row('a'), row('b')] }, { data: [row('a'), row('b')], meta: {} }, { data: [row('a'), row('b')], meta: { last_page: null } }]) {
      fresh(); hubPages([first, body(['no-debe-leerse'], 1)])
      const r = await fetchAll()
      assert.equal(r.error, undefined, JSON.stringify(first))
      assert.deepEqual(r.value.map(x => x.slug), ['a', 'b'])
      assert.equal(hub.calls.length, 1, 'una sola consulta')
    }
  })

  test('primera página con last_page: 1 => éxito (una consulta)', async () => {
    fresh(); hubPages([body(['a'], 1), body(['no-debe-leerse'], 1)])
    const r = await fetchAll()
    assert.deepEqual(r.value.map(x => x.slug), ['a'])
    assert.equal(hub.calls.length, 1)
  })

  test('una respuesta válida con data: [] se acepta: sola, o como página intermedia con el total consistente', async () => {
    fresh(); hubPages([{ data: [] }])
    assert.deepEqual((await fetchAll()).value, [])
    fresh(); hubPages([body(['a'], 3), { data: [], meta: { last_page: 3 } }, body(['c'], 3)])
    assert.deepEqual((await fetchAll()).value.map(x => x.slug), ['a', 'c'])
    // ...pero una página vacía SIN metadatos tras anunciar varias no es válida.
    await expectInconsistent([body(['a'], 3), { data: [] }, body(['c'], 3)], 'página intermedia vacía sin meta')
  })

  test('se mantienen el límite de 20 páginas y los errores HTTP/red/tenant/malformado, también en páginas posteriores', async () => {
    fresh(); hubPages([body(['a'], 21)])
    const over = await fetchAll()
    assert.equal(over.value, undefined)
    assert.equal(over.error.data.reason, 'invalid_response')
    assert.equal(hub.calls.length, 1)
    for (const [reason, status, data] of [['hub_unavailable', 500, {}], ['hub_unavailable', 0, undefined], ['tenant', 404, { message: 'Tenant x' }], ['rejected', 403, {}], ['invalid_response', 200, { data: 'x' }]]) {
      fresh(); hubPages([body(['a'], 3), body(['b'], 3), { status, data }])
      const r = await fetchAll()
      assert.equal(r.value, undefined, reason)
      assert.equal(r.error.statusCode, 503, reason)
      assert.equal(r.error.data.reason, reason)
    }
  })

  test('integración con el bus de hooks REAL (hookable, el de Nitro): callHook propaga el fallo de paginación y no deja URLs parciales', async () => {
    const { createHooks } = await imp('node_modules/hookable/dist/index.mjs')
    const casos = {
      'página 2 sin meta': [body(['a'], 3), { data: [row('b')] }, body(['c'], 3)],
      'página 2 sin last_page': [body(['a'], 3), { data: [row('b')], meta: {} }, body(['c'], 3)],
      'el total cambia (3 -> 2)': [body(['a'], 3), body(['b'], 2), body(['c'], 3)],
      'el total cambia (2 -> 3)': [body(['a'], 2), body(['b'], 3)],
      'más de 20 páginas': [body(['a'], 21)],
      'página intermedia 500': [body(['a'], 3), { status: 500, data: {} }, body(['c'], 3)]
    }
    for (const [nombre, pages] of Object.entries(casos)) {
      fresh(); hubPages(pages)
      const nitroApp = { hooks: createHooks() }
      plugin(nitroApp)
      // Otro consumidor del mismo hook (como el propio módulo) no debe ver URLs parciales: el hook falla ANTES de agregarlas.
      const ctx = { urls: [{ loc: '/' }], sitemapName: 'default', event: makeEvent() }
      await assert.rejects(() => nitroApp.hooks.callHook('sitemap:input', ctx), e => e.statusCode === 503 && typeof e.data.reason === 'string', nombre)
      assert.deepEqual(ctx.urls, [{ loc: '/' }], nombre)
    }
    // Con el listado completo y consistente, el mismo bus agrega TODAS las URLs.
    fresh(); hubPages([body(['a', 'b'], 3), body(['c'], 3), body(['d'], 3)])
    const nitroApp = { hooks: createHooks() }
    plugin(nitroApp)
    const ctx = { urls: [{ loc: '/' }], sitemapName: 'default', event: makeEvent() }
    await nitroApp.hooks.callHook('sitemap:input', ctx)
    assert.deepEqual(ctx.urls.map(u => u.loc), ['/', '/procedimientos/a', '/procedimientos/b', '/procedimientos/c', '/procedimientos/d'])
  })

  test('la paginación administrativa (hubProceduresAll) no cambió', () => {
    assert.match(src('server/utils/procedures.ts'), /export async function hubProceduresAll[\s\S]*?Number\(res\.meta\.last_page \?\? 1\)/)
  })
})

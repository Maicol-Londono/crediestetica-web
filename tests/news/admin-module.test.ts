// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Módulo de Noticias ACTIVO: menú del panel, administración (consultar, crear, editar, publicar, despublicar, portada) con las rutas reales de
// Nitro contra un Hub simulado, restricciones de acceso y vista pública. La visibilidad por perfil (banderas canViewNews) está en
// tests/security/authorization.test.ts; aquí se comprueba que el menú la usa y que el servidor impone el acceso por su cuenta.
import { test, describe, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { FakeHub, setup, run, makeEvent, PNG, ROOT } from '../recommendations/harness.ts'

const read = rel => readFileSync(join(ROOT, rel), 'utf8')
const F = await import(pathToFileURL(join(ROOT, 'shared/utils/features.ts')).href)

const cmsPost = (over = {}) => ({ id: 5, slug: 'mi-noticia', title: 'Mi noticia', excerpt: 'Resumen', content: '<p>Texto</p>', cover_url: null, status: 'draft', published_at: null, author_name: 'Autora', meta_title: null, meta_description: null, youtube_url: null, instagram_url: null, ...over })

describe('menú y acceso a Noticias', () => {
  test('Noticias no está desactivada: ninguna ruta de noticias queda bloqueada', () => {
    assert.equal('NEWS_ENABLED' in F, false)
    for (const p of ['/noticias', '/noticias/un-articulo', '/admin/noticias', '/admin/noticias/nuevo']) assert.equal(F.isDisabledPagePath(p), false, p)
    for (const p of ['/api/public/news', '/api/public/news-page', '/api/public/news/x', '/api/admin/news', '/api/admin/news/5', '/api/admin/news-sections/a']) assert.equal(F.isDisabledApiPath(p), false, p)
  })
  test('menú lateral: en CONTENIDO, después de Nuestros Pacientes y antes de Recomendaciones, con la bandera canViewNews', () => {
    const layout = read('layouts/admin.vue')
    const iPac = layout.indexOf('to="/admin/testimonios"')
    const iNews = layout.indexOf('to="/admin/noticias"')
    const iRec = layout.indexOf('to="/admin/recomendaciones/temas"')
    assert.ok(iPac > 0 && iNews > iPac && iRec > iNews, 'orden Pacientes → Noticias → Recomendaciones')
    assert.ok(layout.includes('v-if="user?.canViewNews" to="/admin/noticias"'))
    assert.ok(layout.indexOf('Contenido') < iNews)
    assert.doesNotMatch(layout, /NEWS_ENABLED/)
  })
  test('tablero, Navbar público, guía del panel y sitemap incluyen Noticias', () => {
    assert.ok(read('pages/admin/index.vue').includes('v-if="user?.canViewNews" to="/admin/noticias"'))
    assert.match(read('components/layout/Navbar.vue'), /\{ to: '\/noticias', label: 'Noticias' \}/)
    assert.match(read('components/layout/Navbar.vue'), /<NuxtLink to="\/noticias"/)
    assert.match(read('utils/adminGuide.ts'), /id: 'noticias'/)
    assert.doesNotMatch(read('nuxt.config.ts'), /'\/noticias/)
  })
  test('las páginas del panel y las públicas existen (se reutilizan, sin módulo paralelo)', () => {
    for (const f of ['pages/admin/noticias/index.vue', 'pages/admin/noticias/[slug].vue', 'pages/noticias/index.vue', 'pages/noticias/[slug].vue']) assert.ok(existsSync(join(ROOT, f)), f)
    const editor = read('pages/admin/noticias/[slug].vue')
    assert.match(editor, /v-model="isPublished"/, 'interruptor de publicación')
    assert.match(editor, /coverImage/, 'portada')
  })
})

describe('administración de noticias (rutas reales contra un Hub simulado)', () => {
  let hub, api
  const route = rel => api.handler(rel)
  before(async () => {
    hub = new FakeHub()
    api = await setup(hub)
    Object.assign(globalThis, api.news)
    // news.ts resuelve su propia sesión: se simulan los auto-imports que usa (origen y sesión sellada con el token del Hub simulado).
    globalThis.assertSameOrigin = () => {}
    globalThis.useAdminSession = async () => ({ data: hub.token ? { token: hub.token, user: { id: 1 } } : {}, clear: async () => { hub.sessionCleared = true } })
  })
  const reset = () => { hub.calls = []; hub.rules = []; hub.token = 'hub-secret-token'; hub.sessionCleared = false }

  test('consultar: lista las noticias de Hub (borradores y publicadas) con el token de la sesión', async () => {
    reset()
    hub.on('GET', '/cms/posts', 200, { data: [cmsPost(), cmsPost({ id: 6, slug: 'otra', status: 'published', published_at: '2026-11-01T10:00:00Z' })], meta: { total: 2 } })
    const { value, error } = await run(await route('server/api/admin/news/index.get.ts'), makeEvent())
    assert.equal(error, undefined)
    assert.equal(value.data.length, 2)
    assert.equal(value.data[0].publishedAt, null, 'borrador sin fecha pública')
    assert.equal(value.data[1].publishedAt, '2026-11-01T10:00:00Z')
    assert.equal(hub.last().token, 'hub-secret-token')
  })

  test('crear: reenvía solo los campos permitidos (nunca company_id, linea_id, author_name ni status)', async () => {
    reset()
    hub.on('POST', '/cms/posts', 201, { data: cmsPost() })
    const body = { title: 'Mi noticia', slug: 'mi-noticia', excerpt: 'R', content: '<p>x</p>', company_id: 99, linea_id: 99, author_name: 'Intruso', status: 'published' }
    const { value, error } = await run(await route('server/api/admin/news/index.post.ts'), makeEvent({ method: 'POST', body }))
    assert.equal(error, undefined)
    assert.equal(value.slug, 'mi-noticia')
    const sent = hub.calls.find(c => c.method === 'POST' && c.path === '/cms/posts').body
    assert.deepEqual(Object.keys(sent).sort(), ['content', 'excerpt', 'slug', 'title'])
  })

  test('editar y administrar la portada: PUT al Hub y subida multipart de la imagen', async () => {
    reset()
    hub.on('PUT', '/cms/posts/5', 200, { data: cmsPost({ title: 'Nuevo título' }) })
    hub.on('POST', '/cms/posts/5/cover', 200, { data: cmsPost({ title: 'Nuevo título', cover_url: 'https://hub.test/c.png' }) })
    const { value, error } = await run(await route('server/api/admin/news/[id].put.ts'), makeEvent({ method: 'PUT', params: { id: '5' }, body: { title: 'Nuevo título', coverImage: PNG } }))
    assert.equal(error, undefined)
    assert.equal(value.coverImage, 'https://hub.test/c.png')
    assert.ok(hub.calls.some(c => c.kind === 'upload' && c.path === '/cms/posts/5/cover'))
  })

  test('publicar y despublicar: published_at con fecha publica; null despublica (PUT parcial)', async () => {
    reset()
    hub.on('PUT', '/cms/posts/5', 200, c => ({ data: cmsPost(c.body.published_at ? { status: 'published', published_at: c.body.published_at } : {}) }))
    const put = await route('server/api/admin/news/[id].put.ts')
    const pub = await run(put, makeEvent({ method: 'PUT', params: { id: '5' }, body: { publishedAt: '2026-11-11T09:00:00Z' } }))
    assert.equal(pub.value.publishedAt, '2026-11-11T09:00:00Z')
    const un = await run(put, makeEvent({ method: 'PUT', params: { id: '5' }, body: { publishedAt: null } }))
    assert.equal(un.value.publishedAt, null)
    assert.deepEqual(hub.calls.map(c => c.body), [{ published_at: '2026-11-11T09:00:00Z' }, { published_at: null }])
  })

  test('eliminar despublica en Hub (se conserva como borrador)', async () => {
    reset()
    hub.on('DELETE', '/cms/posts/5', 200, { data: cmsPost({ status: 'draft' }) })
    const { value, error } = await run(await route('server/api/admin/news/[id].delete.ts'), makeEvent({ method: 'DELETE', params: { id: '5' } }))
    assert.equal(error, undefined)
    assert.equal(value.publishedAt, null)
  })

  test('restricciones: sin sesión 401 sin llamar a Hub; sin permiso en Hub 403; id inválido 404', async () => {
    reset()
    hub.token = null
    for (const [rel, m] of [['server/api/admin/news/index.get.ts', 'GET'], ['server/api/admin/news/index.post.ts', 'POST'], ['server/api/admin/news/[id].put.ts', 'PUT'], ['server/api/admin/news/[id].delete.ts', 'DELETE']]) {
      const { error } = await run(await route(rel), makeEvent({ method: m, params: { id: '5' }, body: { title: 'x' } }))
      assert.equal(error?.statusCode, 401, rel)
    }
    assert.equal(hub.calls.length, 0, 'sin sesión no se llama a Hub')

    reset()
    hub.on('GET', '/cms/posts', 403, { message: 'forbidden' })
    hub.on('PUT', '/cms/posts/5', 403, { message: 'forbidden' })
    assert.equal((await run(await route('server/api/admin/news/index.get.ts'), makeEvent())).error?.statusCode, 403)
    assert.equal((await run(await route('server/api/admin/news/[id].put.ts'), makeEvent({ method: 'PUT', params: { id: '5' }, body: { title: 'x' } }))).error?.statusCode, 403)
    assert.equal((await run(await route('server/api/admin/news/[id].put.ts'), makeEvent({ method: 'PUT', params: { id: 'abc' }, body: {} }))).error?.statusCode, 404)
  })

  test('el servidor impone el acceso por su cuenta: cada ruta pasa por hubNews/adminSession, sin depender de la bandera del menú', () => {
    for (const f of ['index.get.ts', 'index.post.ts', '[id].put.ts', '[id].delete.ts']) assert.match(read(`server/api/admin/news/${f}`), /hubNews\(/, f)
    assert.match(read('server/utils/news.ts'), /assertSameOrigin\(event\)[\s\S]*?authError\(401/)
    assert.doesNotMatch(read('server/utils/news.ts'), /canViewNews/)
  })
})

describe('Noticias públicas', () => {
  let hub, api
  before(async () => {
    hub = new FakeHub()
    api = await setup(hub)
    Object.assign(globalThis, api.news)
  })
  const pub = (over = {}) => ({ id: 6, slug: 'otra', title: 'Otra', excerpt: 'R', content: '<p>x</p>', cover_url: null, published_at: '2026-11-01T10:00:00Z', author_name: 'Autora', company_id: 1, linea_id: 3, ...over })

  test('la lista pública sale del endpoint público de Hub, se mapea y no expone company_id ni linea_id', async () => {
    hub.on('GET', '/v1/web/posts\\?per_page=50', 200, { data: [pub()] })
    const { value, error } = await run(await api.handler('server/api/public/news/index.get.ts'), makeEvent())
    assert.equal(error, undefined)
    assert.equal(value.length, 1)
    assert.equal(value[0].slug, 'otra')
    assert.equal(JSON.stringify(value).includes('company_id') || JSON.stringify(value).includes('linea_id'), false)
    assert.equal(hub.last().kind, 'public', 'solo lectura pública, sin token')
  })

  test('los borradores no se piden ni se exponen: la web no usa la API administrativa para el sitio público', () => {
    for (const f of ['server/api/public/news/index.get.ts', 'server/api/public/news/[slug].get.ts', 'server/api/public/news-page.get.ts']) {
      const src = read(f)
      assert.match(src, /wellezyPublicGet/, f)
      assert.doesNotMatch(src, /\/cms\/|hubNews|adminSession|wellezyRequest/, f)
    }
    assert.match(read('server/utils/news.ts'), /Hub solo entrega noticias publicadas y vigentes/)
  })

  test('rutas y enlaces públicos: el Navbar enlaza /noticias y la lista y el detalle usan /noticias/<slug>', () => {
    assert.match(read('pages/noticias/index.vue'), /:to="\/noticias\/ \+ (featured|article)\.slug"/)
    assert.match(read('pages/noticias/[slug].vue'), /`\/noticias\/\$\{slug\}`/)
    assert.equal(F.isDisabledPagePath('/noticias'), false)
  })
})

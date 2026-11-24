// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// D8.2 · «Nosotros» y «Clínicas aliadas»: visibilidad, datos de contacto, video opcional, estados vacíos y ausencia de contenido de Planmed.
// Tipo de prueba: UNITARIAS y de handlers con persistencia en un directorio temporal (sin Hub, sin escrituras reales fuera de /tmp);
// las pruebas de plantillas son ESTÁTICAS (leen el código fuente). No hay validación visual ni lecturas del Hub aquí.
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from '../recommendations/harness.ts'

const imp = rel => import(pathToFileURL(join(ROOT, rel)).href)
const read = rel => readFileSync(join(ROOT, rel), 'utf8')
const C = await imp('shared/utils/clinics.ts')
const A = await imp('shared/utils/aboutContent.ts')
const PNG = 'data:image/png;base64,iVBORw0KGgo='
let dir, get, put, upload, pub, aboutPut, aboutPub
const ev = (body, extra = {}) => ({ method: 'PUT', body, headers: {}, params: {}, ...extra })
const GET = () => ev(undefined, { method: 'GET' })
const run = async (fn, e) => { try { return { value: await fn(e) } } catch (error) { return { error } } }

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'inst-d82-'))
  const g = globalThis
  g.defineEventHandler = fn => fn
  g.readBody = async e => e.body
  g.getRouterParam = (e, n) => e.params[n]
  g.setHeader = () => {}
  g.useRuntimeConfig = () => ({ contentDir: dir })
  g.createError = o => Object.assign(new Error(o.message ?? 'error'), o)
  g.authError = (statusCode, message) => g.createError({ statusCode, message, data: { message } })
  g.assertSameOrigin = () => {}
  g.wellezyMe = async () => ({ status: 200, data: { user: { id: 1 } } })
  g.isAuthorizedUser = () => true
  g.canEditLocalContent = () => true
  g.MSG_CONTENT_FORBIDDEN = 'content forbidden'
  g.MSG_FORBIDDEN = 'forbidden'
  g.MSG_UNAVAILABLE = 'unavailable'
  Object.assign(g, C, A, await imp('server/utils/news.ts'), await imp('server/utils/aboutStore.ts'), await imp('server/utils/clinics.ts'))
  g.adminSession = async () => ({ session: { clear: async () => {} }, token: 't' })
  get = (await imp('server/api/admin/clinics.get.ts')).default
  put = (await imp('server/api/admin/clinics.put.ts')).default
  upload = (await imp('server/api/admin/clinics/upload.post.ts')).default
  pub = (await imp('server/api/public/clinics/index.get.ts')).default
  aboutPut = (await imp('server/api/admin/about.put.ts')).default
  aboutPub = (await imp('server/api/public/about/index.get.ts')).default
})
after(() => rmSync(dir, { recursive: true, force: true }))

const img = async () => (await upload(ev({ dataUrl: PNG, kind: 'image' }, { method: 'POST' }))).url
const base = (over = {}) => ({ id: 'clinica-1', name: 'Clínica de prueba', description: '<p>Texto</p>', image: '', gallery: [], documents: [], ...over })

describe('Clínicas aliadas · visibilidad y contacto (unitarias)', () => {
  test('una clínica guardada antes de existir «active» se considera visible; los datos de contacto quedan vacíos', () => {
    const n = C.normalizeClinics({ clinics: [{ id: 'a', name: 'X', description: '<p>d</p>', image: '', gallery: [], documents: [] }] })
    assert.equal(n.clinics[0].active, true)
    for (const k of ['website', 'phone', 'email', 'address']) assert.equal(n.clinics[0][k], '', k)
  })
  test('la vista pública excluye las clínicas desactivadas y conserva el orden', () => {
    const v = C.clinicsPublicView({ updatedAt: '', clinics: [{ id: 'a', active: true }, { id: 'b', active: false }, { id: 'c', active: true }] })
    assert.deepEqual(v.clinics.map(c => c.id), ['a', 'c'])
  })
  test('validación de contacto: https obligatorio, teléfono y correo con formato; todo opcional', () => {
    const ok = C.validateClinics({ updatedAt: '', clinics: [base({ image: '/api/public/clinics/media/img-abc123.png', website: 'https://clinica.example', phone: '+57 300 123 4567', email: 'info@clinica.example', address: 'Calle 1 # 2-3' })] })
    assert.deepEqual(ok, {})
    const bad = C.validateClinics({ updatedAt: '', clinics: [base({ image: '/api/public/clinics/media/img-abc123.png', website: 'http://inseguro.example', phone: 'abc', email: 'no-es-correo' })] })
    assert.ok(bad['clinics.0.website'] && bad['clinics.0.phone'] && bad['clinics.0.email'])
    assert.ok(C.validateClinics({ updatedAt: '', clinics: [base({ image: '/api/public/clinics/media/img-abc123.png', website: 'javascript:alert(1)' })] })['clinics.0.website'])
  })
})

describe('Clínicas aliadas · persistencia local y API pública (handlers, directorio temporal)', () => {
  test('sin archivo guardado: lista vacía (sin clínicas heredadas)', async () => {
    assert.deepEqual((await pub(GET())).clinics, [])
    assert.deepEqual((await get(GET())).clinics, [])
  })
  test('crear con contacto, desactivar una y reordenar: la API pública solo muestra las activas, en el orden guardado', async () => {
    const a = base({ id: 'clinica-a', name: 'Clínica A', image: await img(), website: 'https://a.example', phone: '+57 300 111 2222' })
    const b = base({ id: 'clinica-b', name: 'Clínica B', image: await img() })
    const saved = await run(put, ev({ clinics: [b, a], updatedAt: '' }))
    assert.ok(!saved.error, saved.error?.message)
    assert.deepEqual((await pub(GET())).clinics.map(c => c.id), ['clinica-b', 'clinica-a'])

    const cur = await get(GET())
    const off = await run(put, ev({ clinics: cur.clinics.map(c => (c.id === 'clinica-b' ? { ...c, active: false } : c)), updatedAt: cur.updatedAt }))
    assert.ok(!off.error, off.error?.message)
    const publicNow = await pub(GET())
    assert.deepEqual(publicNow.clinics.map(c => c.id), ['clinica-a'])
    assert.equal(publicNow.clinics[0].website, 'https://a.example')
    // La administración conserva la desactivada (no se pierde al ocultarla).
    const admin = await get(GET())
    assert.equal(admin.clinics.length, 2)
    assert.equal(admin.clinics.find(c => c.id === 'clinica-b').active, false)
  })
  test('datos de contacto inválidos => 422 con el campo, y no se escribe nada', async () => {
    const cur = await get(GET())
    const r = await run(put, ev({ clinics: cur.clinics.map((c, i) => (i === 0 ? { ...c, website: 'http://x.example' } : c)), updatedAt: cur.updatedAt }))
    assert.equal(r.error.statusCode, 422)
    assert.ok(Object.keys(r.error.data.errors).some(k => k.endsWith('.website')))
    assert.equal((await get(GET())).updatedAt, cur.updatedAt)
  })
  test('todas desactivadas => la API pública devuelve lista vacía (estado vacío público)', async () => {
    const cur = await get(GET())
    const r = await run(put, ev({ clinics: cur.clinics.map(c => ({ ...c, active: false })), updatedAt: cur.updatedAt }))
    assert.ok(!r.error, r.error?.message)
    assert.deepEqual((await pub(GET())).clinics, [])
  })
})

describe('Nosotros · video opcional y estado vacío (handlers, directorio temporal)', () => {
  const full = () => ({
    hero: { title: 'Título', image: '', imageAlt: 'Descripción' },
    institutional: { title: 'Institucional', legal: '<p>Texto legal</p>', paragraphs: ['<p>Uno</p>', '<p>Dos</p>', '<p>Tres</p>'] },
    video: { url: '' }, faqs: [],
    contact: { address: '', building: '', city: '', region: '', phone: '', email: '', schedule: '', socials: { instagram: '', facebook: '', tiktok: '' }, map: { enabled: false } },
    updatedAt: ''
  })
  test('sin guardar: el contenido público es el estado «sin configurar»', async () => {
    assert.equal(A.aboutIsEmpty(await aboutPub(GET())), true)
  })
  test('el video ya no es obligatorio: sin enlace es válido; con enlace inválido sigue siendo error', () => {
    const c = full(); c.hero.image = '/images/x.png'
    assert.equal(A.validateAboutContent(c)['video.url'], undefined)
    c.video.url = 'https://evil.example/v'
    assert.ok(A.validateAboutContent(c)['video.url'])
  })
  test('guardar sin video persiste con video vacío y el público lo refleja', async () => {
    const body = full()
    body.hero.image = PNG
    const r = await run(aboutPut, ev(body))
    assert.ok(!r.error, r.error?.message)
    assert.equal(r.value.video.url, '')
    const p = await aboutPub(GET())
    assert.equal(p.hero.title, 'Título')
    assert.equal(p.video.url, '')
    assert.equal(A.aboutIsEmpty(p), false)
  })
  test('campos obligatorios vacíos => 422 con mensajes por campo', async () => {
    const cur = await aboutPub(GET())
    const r = await run(aboutPut, ev({ ...cur, hero: { ...cur.hero, title: '' }, updatedAt: cur.updatedAt }))
    assert.equal(r.error.statusCode, 422)
    assert.ok(r.error.data.errors['hero.title'])
  })
})

describe('Plantillas y ausencia de contenido de Planmed (estáticas)', () => {
  const files = ['components/home/ClinicsSection.vue', 'components/site/ClinicsList.vue', 'components/admin/ClinicsManager.vue', 'pages/nosotros.vue', 'pages/admin/nosotros.vue', 'pages/clinicas-aliadas/index.vue', 'pages/clinicas-aliadas/[id].vue', 'shared/utils/clinics.ts', 'shared/utils/aboutContent.ts']
  test('ningún archivo de «Nosotros»/«Clínicas» menciona a Planmed ni importa los logos o ciudades heredados', () => {
    for (const f of files) {
      const src = read(f)
      assert.ok(!/planmed|cliniplanes|allies\/|~\/data\/clinics|Medell[ií]n|Barranquilla/i.test(src), f)
    }
  })
  test('la sección de inicio solo se renderiza con clínicas administradas (sin respaldo de logos)', () => {
    const src = read('components/home/ClinicsSection.vue')
    assert.match(src, /<section v-if="managed\.length"/)
    assert.ok(!/v-else/.test(src))
  })
  test('la lista pública tiene estado vacío y de error, y contacto con enlaces seguros', () => {
    const src = read('components/site/ClinicsList.vue')
    assert.match(src, /data-testid="clinics-empty"/)
    assert.match(src, /CommonHubUnavailable/)
    // El contacto vive en el detalle de la clínica; la tarjeta de la lista es un único enlace a ese detalle.
    assert.match(src, /\/clinicas-aliadas\/\$\{c\.id\}/)
    const detail = read('pages/clinicas-aliadas/[id].vue')
    assert.match(detail, /rel="noopener noreferrer"/)
    assert.match(detail, /mailto:/)
    assert.match(detail, /tel:/)
  })
  test('la administración ofrece visibilidad, orden (subir/bajar), contacto y confirmación antes de eliminar', () => {
    const src = read('components/admin/ClinicsManager.vue')
    assert.match(src, /v-model="c\.active"/)
    assert.match(src, /@click="move\(i, -1\)"/)
    assert.match(src, /@click="move\(i, 1\)"/)
    assert.match(src, /v-model="c\.website"/)
    assert.match(src, /notify\.confirm/)
  })
  test('paleta y tipografías de Crediestética en las plantillas; sin los colores de Planmed', () => {
    for (const f of ['components/home/ClinicsSection.vue', 'components/site/ClinicsList.vue', 'pages/nosotros.vue']) {
      const src = read(f)
      assert.ok(!/#0C2619|#D3A76A|#fcf9f8/i.test(src), f)
      assert.match(src, /#111111|#F7F3EE|#CBA36B|#E7DDD1/)
    }
    assert.match(read('components/home/ClinicsSection.vue'), /font-serif/)
  })
  test('responsive: las rejillas usan puntos de corte móviles y el hero de Nosotros mantiene las clases de alto adaptable', () => {
    assert.match(read('components/home/ClinicsSection.vue'), /grid-cols-2 lg:grid-cols-5/)
    assert.match(read('components/site/ClinicsList.vue'), /sm:grid-cols-2 lg:grid-cols-3/)
    assert.match(read('pages/clinicas-aliadas/[id].vue'), /md:grid-cols-5/)
    assert.match(read('pages/nosotros.vue'), /md:/)
  })
})

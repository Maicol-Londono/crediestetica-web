// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Estados vacíos de Noticias y Clínicas aliadas.
// TIPO: pruebas UNITARIAS con un Hub simulado (FakeHub) y comprobaciones ESTÁTICAS de las plantillas. NO verifican el Hub real:
// la verificación contra un Hub local está en tests/integration/hub-readonly.test.ts y se omite sin NUXT_WELLEZY_API_BASE_URL.
import { test, describe, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { FakeHub, makeEvent, run, setup, ROOT } from '../recommendations/harness.ts'

const src = (rel: string) => readFileSync(join(ROOT, rel), 'utf8')
const hub = new FakeHub()
let api: Awaited<ReturnType<typeof setup>>

before(async () => {
  api = await setup(hub)
  Object.assign(globalThis, api.news) // fromPublicPost
})

describe('[unitaria, Hub simulado] respuesta vacía frente a error', () => {
  test('noticias: una lista vacía válida (200) es una lista vacía, no un error', async () => {
    hub.rules = []
    hub.on('GET', /^\/v1\/web\/posts/, 200, { data: [], meta: { total: 0 } })
    const { value, error } = await run(await api.handler('server/api/public/news/index.get.ts'), makeEvent())
    assert.equal(error, undefined)
    assert.deepEqual(value, [])
  })

  test('noticias: un fallo del Hub (503) es un error, nunca una lista vacía exitosa', async () => {
    hub.rules = []
    hub.on('GET', /^\/v1\/web\/posts/, 503, { message: 'down' })
    const { value, error } = await run(await api.handler('server/api/public/news/index.get.ts'), makeEvent())
    assert.equal(value, undefined)
    assert.ok(error, 'debe fallar')
  })

  test('noticias: una respuesta sin `data` (contrato inválido) es un error', async () => {
    hub.rules = []
    hub.on('GET', /^\/v1\/web\/posts/, 200, { unexpected: true })
    const { value, error } = await run(await api.handler('server/api/public/news/index.get.ts'), makeEvent())
    assert.equal(value, undefined)
    assert.ok(error)
  })

  test('procedimientos: el arnés registra `withOrientation` y una lista vacía responde []', async () => {
    hub.rules = []
    hub.on('GET', /^\/v1\/web\/cirugias/, 200, { data: [], meta: { last_page: 1 } })
    const { value, error } = await run(await api.handler('server/api/public/procedures/index.get.ts'), makeEvent())
    assert.equal(error, undefined, error?.message)
    assert.deepEqual(value, [])
  })

  test('las lecturas simuladas son solo GET', () => {
    assert.ok(hub.calls.length > 0)
    assert.ok(hub.calls.every(c => c.method === 'GET'))
  })
})

describe('[estática] plantillas de estados vacíos', () => {
  test('Noticias: mensaje de lista vacía solo cuando no hay error ni noticias; conserva el aviso de error', () => {
    const t = src('pages/noticias/index.vue')
    assert.match(t, /<CommonHubUnavailable v-if="error"/)
    const empty = t.slice(t.indexOf('data-testid="news-empty"') - 120, t.indexOf('data-testid="news-empty"') + 300)
    // Con paginación, «sin noticias» se decide por el total de Hub (no por la página actual, que puede estar fuera de rango).
    assert.match(empty, /v-if="!total"/)
    assert.match(t, /Pronto publicaremos nuestras noticias\./)
    // El mensaje vive dentro del `v-else` del error: un error nunca se presenta como lista vacía.
    assert.ok(t.indexOf('<template v-else>') < t.indexOf('data-testid="news-empty"'))
  })

  test('Clínicas: error => aviso con reintento; sin clínicas => mensaje; con clínicas => lista', () => {
    const t = src('components/site/ClinicsList.vue')
    const iErr = t.indexOf('<CommonHubUnavailable v-if="error"')
    const iEmpty = t.indexOf('v-else-if="!clinics.length"')
    const iList = t.indexOf('<section v-else aria-label="Clínicas aliadas"')
    assert.ok(iErr >= 0 && iErr < iEmpty && iEmpty < iList, 'orden error → vacío → lista')
    assert.match(t, /Pronto compartiremos aquí nuestras clínicas aliadas\./)
  })

  test('no hay contenido, rutas ni nombres de otra marca en los mensajes', () => {
    for (const f of ['pages/noticias/index.vue', 'components/site/ClinicsList.vue']) {
      assert.doesNotMatch(src(f).replace(/\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, ''), /planmed|#0C2619|#D3A76A/i, f)
    }
  })
})

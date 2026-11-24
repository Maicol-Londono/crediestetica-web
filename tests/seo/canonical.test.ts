// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Canonical de las páginas públicas: origen del sitio + ruta, sin cadena de consulta (utm, fbclid, page...). Sin red: se ejecuta el composable real
// con las funciones de Nuxt simuladas y se revisa el código fuente de las páginas.
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from '../recommendations/harness.ts'

const read = rel => readFileSync(join(ROOT, rel), 'utf8')

let dir, useCanonicalUrl
const state = { path: '/', url: 'https://crediestetica.com', head: null }

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'canonical-seo-'))
  globalThis.__canon = state
  const src = read('composables/useCanonicalUrl.ts').replace(
    /import \{[^}]*\} from '#imports'/,
    "const useHead = h => { globalThis.__canon.head = h }; const useRoute = () => ({ path: globalThis.__canon.path }); const useSiteConfig = () => ({ url: globalThis.__canon.url })"
  )
  writeFileSync(join(dir, 'composable.ts'), src)
  useCanonicalUrl = (await import(pathToFileURL(join(dir, 'composable.ts')).href)).useCanonicalUrl
})
after(() => { rmSync(dir, { recursive: true, force: true }); delete globalThis.__canon })

const canonicalFor = (path, url = 'https://crediestetica.com') => {
  state.path = path; state.url = url; state.head = null
  useCanonicalUrl()
  const links = state.head.link
  assert.equal(links.length, 1)
  assert.equal(links[0].rel, 'canonical')
  return links[0].href
}

describe('useCanonicalUrl', () => {
  test('origen del sitio + ruta; la raíz termina en «/»', () => {
    assert.equal(canonicalFor('/'), 'https://crediestetica.com/')
    assert.equal(canonicalFor('/noticias'), 'https://crediestetica.com/noticias')
    assert.equal(canonicalFor('/testimonios/antes-y-despues'), 'https://crediestetica.com/testimonios/antes-y-despues')
    assert.equal(canonicalFor('/noticias/Mi-Nota'), 'https://crediestetica.com/noticias/Mi-Nota') // el slug conserva su forma
  })

  test('sin barra final y sin barras duplicadas del origen', () => {
    assert.equal(canonicalFor('/noticias/'), 'https://crediestetica.com/noticias')
    assert.equal(canonicalFor('/noticias', 'https://crediestetica.com/'), 'https://crediestetica.com/noticias')
  })

  test('usa route.path: la consulta nunca forma parte del canonical (utm, fbclid, page, ...)', () => {
    const src = read('composables/useCanonicalUrl.ts')
    assert.match(src, /useRoute\(\)\.path/)
    assert.doesNotMatch(src, /fullPath|\.query|location\.search|\.hash/)
    // Aunque alguien pasara una ruta con consulta a la función, el composable solo lee route.path.
    assert.doesNotMatch(canonicalFor('/noticias'), /[?#]|utm_|fbclid/)
  })
})

describe('las páginas públicas declaran su canonical', () => {
  // Páginas con useCanonicalUrl() o con su canonical propio (ManagedPage, estudio de créditos, financiación, nosotros, servicios, quienes somos,
  // procedimientos, subtemas de recomendaciones).
  const WITH_COMPOSABLE = [
    'pages/index.vue', 'pages/noticias/index.vue', 'pages/noticias/[slug].vue', 'pages/procedimientos/[slug].vue', 'pages/recomendaciones/[slug].vue',
    'pages/recursos/index.vue', 'pages/recursos/[slug].vue', 'pages/informacion-precontractual.vue', 'pages/politica-datos-personales.vue',
    'pages/testimonios/index.vue', 'pages/testimonios/antes-y-despues.vue', 'pages/testimonios/programa-de-referidos.vue',
    'components/recommendations/ProcedureRecommendationIndex.vue', 'components/recommendations/ProcedureRecommendation.vue'
  ]
  test('las que usan el composable lo llaman una vez', () => {
    for (const rel of WITH_COMPOSABLE) {
      const n = (read(rel).match(/useCanonicalUrl\(\)/g) ?? []).length
      assert.equal(n, 1, `${rel}: useCanonicalUrl() ${n} veces`)
      assert.doesNotMatch(read(rel), /rel: 'canonical'/, `${rel}: canonical duplicado`)
    }
  })

  test('toda página pública (salvo admin y PRP desactivado) tiene canonical, por el composable o propio', () => {
    const files = []
    const walk = d => { for (const n of readdirSync(d)) { const f = join(d, n); statSync(f).isDirectory() ? walk(f) : f.endsWith('.vue') && files.push(f) } }
    walk(join(ROOT, 'pages'))
    // Páginas que delegan en componentes: se revisa el componente.
    const DELEGATED = { 'pages/recomendaciones/cuidados/index.vue': 'components/recommendations/ProcedureRecommendationIndex.vue', 'pages/recomendaciones/revision/index.vue': 'components/recommendations/ProcedureRecommendationIndex.vue', 'pages/recomendaciones/cuidados/[slug].vue': 'components/recommendations/ProcedureRecommendation.vue', 'pages/recomendaciones/revision/[slug].vue': 'components/recommendations/ProcedureRecommendation.vue', 'pages/clinicas-aliadas/index.vue': 'components/site/ManagedPage.vue' }
    const missing = []
    for (const f of files) {
      const rel = relative(ROOT, f).split(sep).join('/')
      if (rel.startsWith('pages/admin/') || rel.startsWith('pages/prp/')) continue
      const src = DELEGATED[rel] ? read(DELEGATED[rel]) : read(rel)
      if (!/useCanonicalUrl\(\)|rel: 'canonical'/.test(src)) missing.push(rel)
    }
    assert.deepEqual(missing, [])
  })

  test('los canonical propios tampoco usan la consulta', () => {
    for (const rel of ['pages/financiacion.vue', 'pages/nosotros.vue', 'pages/quienes-somos.vue', 'pages/estudio-de-creditos.vue', 'components/site/ManagedPage.vue', 'pages/recomendaciones/[topic]/[subtopic].vue']) {
      const src = read(rel)
      const m = src.match(/rel: 'canonical'[^}]*/g) ?? []
      assert.ok(m.length || /canonical/.test(src), rel)
      for (const c of m) assert.doesNotMatch(c, /fullPath|query|search/, rel)
    }
  })
})

describe('títulos y descripciones de Testimonios', () => {
  test('/testimonios: título acorde con el contenido aprobado y sin el error gramatical', () => {
    const src = read('pages/testimonios/index.vue')
    assert.match(src, /title: 'Nuestros pacientes \| Crediestética'/)
    assert.doesNotMatch(src, /las testimonios/i)
    assert.match(src, /Conoce las experiencias de personas que, como tú, decidieron dar el paso hacia su bienestar/)
  })
  test('antes y después y programa de referidos: título y descripción acordes', () => {
    assert.match(read('pages/testimonios/antes-y-despues.vue'), /title: 'Resultados reales: antes y después \| Crediestética'/)
    assert.match(read('pages/testimonios/programa-de-referidos.vue'), /Programa de referidos de Crediestética/)
  })
})

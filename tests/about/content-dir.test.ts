// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Aislamiento del almacenamiento local: el directorio por defecto es propio de Crediestética y nunca se lee ni se escribe `.data/planmed-content`.
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, existsSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from '../recommendations/harness.ts'

const imp = rel => import(pathToFileURL(join(ROOT, rel)).href)
const state = { cfg: {} }
let store

before(async () => {
  const g = globalThis
  g.useRuntimeConfig = () => state.cfg
  g.createError = o => Object.assign(new Error(o.message ?? 'error'), o)
  const C = await imp('shared/utils/aboutContent.ts')
  Object.assign(g, C, await imp('server/utils/news.ts'))
  store = await imp('server/utils/aboutStore.ts')
})

describe('directorio de contenido', () => {
  test('por defecto es `.data/crediestetica-content` (relativo al directorio de trabajo), nunca `planmed-content`', () => {
    state.cfg = {}
    assert.equal(store.aboutContentDir({}), resolve(process.cwd(), '.data', 'crediestetica-content'))
    state.cfg = { contentDir: '   ' }
    assert.equal(store.aboutContentDir({}), resolve(process.cwd(), '.data', 'crediestetica-content'))
    assert.ok(!/planmed/i.test(store.aboutContentDir({})))
  })

  test('NUXT_CONTENT_DIR (absoluto o relativo) manda sobre el valor por defecto', () => {
    const abs = join(tmpdir(), 'crediestetica-abs')
    state.cfg = { contentDir: abs }
    assert.equal(store.aboutContentDir({}), abs)
    state.cfg = { contentDir: 'otro/dir' }
    assert.equal(store.aboutContentDir({}), resolve(process.cwd(), 'otro/dir'))
  })

  test('leer y escribir usan SOLO el directorio configurado (lectura vacía = contenido neutro; escritura crea el directorio nuevo)', async () => {
    const base = mkdtempSync(join(tmpdir(), 'cred-dir-'))
    const dir = join(base, 'nuevo', 'content') // no existe todavía
    try {
      state.cfg = { contentDir: dir }
      const empty = await store.readAboutContent({})
      assert.equal(empty.faqs.length, 0)
      assert.ok(!existsSync(dir), 'leer no crea nada')
      const content = structuredClone(empty); content.hero.title = 'PRUEBA'
      await store.writeAboutContent({}, content)
      assert.equal(JSON.parse(readFileSync(join(dir, 'about.json'), 'utf8')).hero.title, 'PRUEBA')
      await store.writeAboutContent({}, content) // segunda escritura: respaldo `.prev`
      assert.deepEqual(readdirSync(dir).sort(), ['about.json', 'about.prev.json'])
      assert.equal((await store.readAboutContent({})).hero.title, 'PRUEBA')
    } finally { rmSync(base, { recursive: true, force: true }) }
  })

  test('el código fuente no referencia `planmed-content` ni NUXT_PLANMED_*', () => {
    for (const rel of ['server/utils/aboutStore.ts', 'server/utils/financingRate.ts', 'server/utils/clinics.ts', 'server/utils/sitePages.ts', 'server/utils/procedureOrientation.ts', 'nuxt.config.ts', '.env.example']) {
      const src = readFileSync(join(ROOT, rel), 'utf8')
      assert.ok(!/planmed-content|NUXT_PLANMED_|planmedContentDir/.test(src), rel)
    }
  })
})

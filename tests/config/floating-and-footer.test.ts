// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// KI-25: pie de noticias/recomendaciones sin afirmaciones institucionales no confirmadas, y botones flotantes que no se superponen en móvil.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')
const src = (rel: string) => readFileSync(join(ROOT, rel), 'utf8')

describe('pie de noticias y recomendaciones (KI-25-A)', () => {
  for (const f of ['pages/noticias/[slug].vue', 'components/recommendations/RecommendationShell.vue']) {
    test(`${f}: sin «entidad especializada» ni promesas de seguridad`, () => {
      const t = src(f)
      assert.equal(/entidad especializada/i.test(t), false)
      assert.equal(/Tu seguridad es lo más importante/i.test(t), false)
      assert.match(t, /Infórmate y resuelve tus dudas/)
      assert.match(t, /to="\/financiacion#calculadora"/)
    })
  }
})

describe('botones flotantes en móvil (KI-25-B)', () => {
  const fab = src('components/forms/ValuationRequest.vue')
  const chat = src('components/layout/ChatLauncher.vue')

  test('«Pide tu cita» es compacto (solo icono) en móvil y conserva su texto accesible y su pastilla desde md', () => {
    assert.match(fab, /w-11 h-11/)
    assert.match(fab, /md:w-auto md:h-auto/)
    assert.match(fab, /<span class="sr-only md:not-sr-only">Pide tu cita<\/span>/)
    assert.match(fab, /data-testid="valuation-fab"/)
    assert.match(fab, /@click="open"/)
  })

  test('el botón queda alineado sobre el del chat y no cambia su posición en escritorio', () => {
    assert.match(fab, /right-\[1\.375rem\] md:bottom-28 md:right-8/)
    assert.match(chat, /fixed bottom-4 right-4 md:bottom-8 md:right-8/)
  })
})

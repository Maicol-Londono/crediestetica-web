// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// D9.3-B: el detalle del procedimiento usa la composición del original (hero dividido) sin perder datos de Hub ni estados de error.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const detail = readFileSync('pages/procedimientos/[slug].vue', 'utf8')

describe('detalle de procedimiento: composición del original', () => {
  test('hero dividido en dos columnas desde lg y la imagen primero en móvil', () => {
    assert.match(detail, /data-testid="procedure-hero"/)
    assert.match(detail, /flex flex-col lg:flex-row lg:min-h-\[600px\]/)
    assert.match(detail, /order-2 lg:order-1/)
    assert.match(detail, /order-1 lg:order-2/)
    assert.match(detail, /Imagen no disponible/)
  })

  test('conserva secciones de Hub, galería, CTA a financiación y estados de error', () => {
    assert.match(detail, /<ProcedureSections :sections="procedure\.secciones"/)
    assert.match(detail, /data-testid="procedure-gallery"/)
    assert.match(detail, /path: '\/financiacion', query: \{ procedureId: procedure\.id \}, hash: '#calculadora'/)
    assert.match(detail, /statusCode: 503/)
    assert.match(detail, /statusCode: 404/)
  })

  test('ficha técnica y perfil solo se pintan con datos reales (sin «No especificado» inventado)', () => {
    assert.match(detail, /v-if="fichaItems\.length"/)
    assert.match(detail, /v-if="profileItems\.length"/)
    assert.doesNotMatch(detail, /No especificado/)
  })

  test('no copia contactos ni textos del original (WhatsApp, Planmed, Cliniplanes)', () => {
    assert.doesNotMatch(detail, /wa\.me|573011409597|planmed|cliniplanes/i)
  })
})

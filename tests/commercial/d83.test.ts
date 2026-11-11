// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// D8.3 · funcionalidades comerciales. Todas son pruebas UNITARIAS o ESTÁTICAS sobre el código: no usan el Hub ni escriben datos.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from '../recommendations/harness.ts'

const imp = rel => import(pathToFileURL(join(ROOT, rel)).href)
const src = rel => readFileSync(join(ROOT, rel), 'utf8')
const C = await imp('shared/utils/procedureCategories.ts')
const F = await imp('shared/utils/financing.ts')

describe('categorías: etiqueta visible (unitaria)', () => {
  const names = [{ slug: 'corporal', name: 'Corporal' }, { slug: 'rostro-y-cuello', name: '  Rostro y cuello ' }]

  test('usa el nombre real de Hub cuando el slug está en la lista', () => {
    assert.equal(C.procedureCategoryLabel('corporal', names), 'Corporal')
    assert.equal(C.procedureCategoryLabel('rostro-y-cuello', names), 'Rostro y cuello')
  })

  test('categoría inactiva, inexistente o consulta fallida: etiqueta legible derivada del slug (no el slug crudo)', () => {
    assert.equal(C.procedureCategoryLabel('facial-avanzado', names), 'Facial avanzado')
    assert.equal(C.procedureCategoryLabel('corporal', []), 'Corporal')
    assert.equal(C.procedureCategoryLabel('corporal', null), 'Corporal')
    assert.equal(C.procedureCategoryLabel('mama_y_torax', undefined), 'Mama y torax')
  })

  test('sin categoría => cadena vacía (la vista muestra «Procedimiento» y no genera filtro)', () => {
    for (const v of ['', '   ', null, undefined, 42, {}]) assert.equal(C.procedureCategoryLabel(v, names), '')
  })

  test('no se inventan categorías: nombres vacíos o malformados se ignoran', () => {
    assert.equal(C.procedureCategoryLabel('corporal', [{ slug: 'corporal', name: '' }, null, {}]), 'Corporal')
  })
})

describe('catálogo y detalle: consumo de categorías (estático)', () => {
  test('el catálogo y el detalle muestran el nombre de la categoría, no el slug', () => {
    const list = src('pages/procedimientos/index.vue')
    const detail = src('pages/procedimientos/[slug].vue')
    assert.match(list, /procedureCategoryLabel\(slug, categoryNames\.value\)/)
    assert.match(list, /categoryLabel\(proc\.category\)/)
    assert.doesNotMatch(list, /\{\{\s*proc\.category\s*\|\|/)
    assert.match(detail, /procedureCategoryLabel\(procedure\.value\?\.category, categoryNames\.value\)/)
    assert.doesNotMatch(detail, /\{\{\s*procedure\.category\s*\|\|/)
  })

  test('las categorías solo se leen del endpoint público (sin CRUD local ni archivos propios)', () => {
    const route = src('server/api/public/procedure-categories.get.ts')
    assert.match(route, /wellezyPublicGet/)
    assert.doesNotMatch(route, /writeFile|\.json|wellezyRequest\(|'POST'|'PUT'|'DELETE'/)
    const admin = src('pages/admin/procedimientos/[slug].vue')
    assert.match(admin, /las categorías se administran en Wellezy Hub/)
  })

  test('el detalle no depende de textos de Planmed ni de un placeholder de desarrollo', () => {
    const detail = src('pages/procedimientos/[slug].vue')
    assert.doesNotMatch(detail, /planmed|cliniplanes|IMAGEN EN PRODUCCI/i)
    assert.match(detail, /Imagen no disponible/)
  })
})

describe('simulador: sin contenido heredado de Planmed (estático)', () => {
  test('ni el panel ni el composable traen ciudades fijas de Planmed', () => {
    for (const rel of ['components/simulator/SimulatorPanel.vue', 'composables/useSimulator.ts', 'components/simulator/ResultCard.vue', 'components/simulator/NextStepsSection.vue']) {
      assert.doesNotMatch(src(rel), /Medell[ií]n|Barranquilla|\bCali\b|Ciudad de Operaci[oó]n|target_location|planmed|cliniplanes/i, rel)
    }
  })

  test('el composable no cotiza fuera del rango (mínimo y máximo)', () => {
    const s = src('composables/useSimulator.ts')
    assert.match(s, /if \(amount\.value < MIN_AMOUNT\) return/)
    assert.match(s, /if \(amount\.value > MAX_AMOUNT\) return/)
  })

  test('si al montar no hay procedimientos, el composable los consulta de nuevo (carga directa de /financiacion)', () => {
    const s = src('composables/useSimulator.ts')
    assert.match(s, /execute: loadProcedures/)
    assert.match(s, /if \(!availableProcedures\.value\?\.length\) loadProcedures\(\)/)
  })

  test('el panel no calcula nada por su cuenta: la tasa y la fórmula vienen del servicio', () => {
    const panel = src('components/simulator/SimulatorPanel.vue')
    assert.doesNotMatch(panel, /Math\.pow|\*\*|interestRate|tasa\s*=/)
    assert.match(panel, /data-testid="simulator-unavailable"/)
  })
})

describe('simulador: fórmula y casos extremos (unitaria, sin tasa comercial real)', () => {
  // Tasas de PRUEBA para ejercitar la fórmula: no son condiciones comerciales de Crediestética.
  test('monto mínimo y máximo del simulador con todos los plazos: cuotas finitas, positivas y crecientes con el monto', () => {
    for (const months of F.FINANCING_TERMS) {
      const lo = F.buildFinancingQuote(1_000_000, months, '1.5000')
      const hi = F.buildFinancingQuote(100_000_000, months, '1.5000')
      assert.ok(Number.isFinite(lo.monthlyPayment) && lo.monthlyPayment > 0)
      assert.ok(hi.monthlyPayment > lo.monthlyPayment)
      assert.ok(hi.totalAmount > 100_000_000, 'con tasa positiva el total supera el capital')
    }
  })

  test('tasa mínima técnica y máxima técnica: sin NaN ni infinitos', () => {
    for (const rate of ['0.0001', '5.0000']) {
      const q = F.buildFinancingQuote(15_000_000, 72, rate)
      assert.ok(Number.isFinite(q.monthlyPayment) && q.monthlyPayment > 15_000_000 / 72 - 1)
    }
  })

  test('entradas inválidas se rechazan: monto 0 o negativo, plazo no entero, tasa vacía o con coma', () => {
    assert.throws(() => F.buildFinancingQuote(0, 24, '2.0000'), RangeError)
    assert.throws(() => F.buildFinancingQuote(-1, 24, '2.0000'), RangeError)
    assert.throws(() => F.buildFinancingQuote(1_000_000, 24.5, '2.0000'), RangeError)
    assert.throws(() => F.buildFinancingQuote(1_000_000, 0, '2.0000'), RangeError)
    assert.throws(() => F.buildFinancingQuote(1_000_000, 24, ''), RangeError)
    assert.throws(() => F.buildFinancingQuote(1_000_000, 24, '2,5'), RangeError)
    assert.equal(F.parseFinancingRate(undefined).ok, false)
  })

  test('formato de pesos: solo presentación y valores no finitos no rompen la vista', () => {
    assert.match(F.formatPesos(1234567), /1\.234\.567/)
    assert.equal(F.formatPesos(Number.NaN), '$ 0')
  })
})

describe('Nuestros Pacientes: contenido y estados (estático)', () => {
  test('las páginas públicas no incluyen contenido, testimonios ni imágenes fijas de Planmed', () => {
    for (const rel of ['pages/testimonios/index.vue', 'pages/testimonios/antes-y-despues.vue', 'pages/testimonios/programa-de-referidos.vue', 'components/testimonials/TestimonialsNav.vue']) {
      const s = src(rel)
      assert.doesNotMatch(s, /planmed|cliniplanes|medell[ií]n|barranquilla/i, rel)
      assert.doesNotMatch(s, /https?:\/\/(www\.)?(instagram|youtube)\.com\/[a-z]+\/[\w-]{6,}/i, `${rel} no debe traer enlaces fijos`)
    }
  })

  test('antes y después tiene estado vacío y aviso de sección oculta; no inventa casos', () => {
    const s = src('pages/testimonios/antes-y-despues.vue')
    assert.match(s, /Pronto compartiremos aquí los resultados de nuestros pacientes\./)
    assert.match(s, /Esta sección no está disponible por el momento\./)
    // D9.5: todas las lecturas de 'patient-section' comparten el manejador fetchPatientSection (servicio público de Hub).
    assert.match(s, /useAsyncData\('patient-section', fetchPatientSection\)/)
    assert.match(src('services/PublicTestimonialsService.ts'), /fetchPatientSection = .*publicTestimonialsService\.getContent\(\)/)
  })

  test('la ruta pública lee de Hub y no persiste contenido propio', () => {
    const route = src('server/api/public/patient-section.get.ts')
    assert.doesNotMatch(route, /writeFile|readFile|crediestetica-content/)
  })
})

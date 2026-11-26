// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Etapa D4.7: presentación documental (páginas legales sin modal, documentos en el modal, área táctil, botones flotantes en móvil).
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from '../recommendations/harness.ts'

const read = rel => readFileSync(join(ROOT, rel), 'utf8')
const layout = read('layouts/default.vue')
const content = read('components/legal/PrecontractualContent.vue')
const policy = read('pages/politica-datos-personales.vue')
const modal = read('components/common/PrecontractualModal.vue')

describe('páginas legales sin modal', () => {
  test('el layout no monta el modal en /politica-datos-personales ni /informacion-precontractual', () => {
    assert.match(layout, /const isLegalPage = computed\(\(\) => \/\^\\\/\(politica-datos-personales\|informacion-precontractual\)\\\/\?\$\/\.test\(route\.path\)\)/)
    assert.match(layout, /<CommonPrecontractualModal v-if="!isPrpPage && !isLegalPage" \/>/)
  })
  test('el comportamiento del modal (clave, aceptar, rechazar) no cambió', () => {
    assert.match(modal, /const STORAGE_KEY = 'crediestetica_precontractual_v1'/)
    assert.match(modal, /localStorage\.setItem\(STORAGE_KEY, 'accepted'\)/)
    assert.match(modal, /if \(status !== 'accepted'\) \{/)
    assert.match(modal, /window\.location\.href = 'https:\/\/google\.com'/)
  })
  test('las rutas PRP siguen sin modal', () => {
    assert.match(layout, /isPrpPage = computed\(\(\) => \/\^\\\/prp/)
  })
})

describe('botones flotantes', () => {
  test('en las páginas legales se ocultan en móvil y se mantienen en escritorio; en el resto del sitio no cambian', () => {
    assert.match(layout, /<div :class="isLegalPage \? 'hidden md:block' : ''" data-testid="floating-actions">/)
    const wrapper = layout.slice(layout.indexOf('data-testid="floating-actions"'), layout.indexOf('<!-- Modal Precontractual'))
    assert.ok(wrapper.includes('<LayoutChatLauncher />') && wrapper.includes('<FormsValuationRequest v-if="!isPrpPage" />'))
  })
})

describe('documentos en el modal y la página precontractual', () => {
  test('se listan los documentos disponibles por sus referencias centrales (sin URL en el componente)', () => {
    assert.match(content, /const RELATED: LegalDocumentKey\[\] = \['politicaDatos', 'avisoPrivacidad', 'autorizacionDatos', 'advertencias', 'pagare', 'autorizacionCentrales'\]/)
    assert.match(content, /legalDocumentUrl\(k\)/)
    assert.ok(!/drive\.google\.com|docs\.google\.com/.test(content))
  })
  test('los documentos pendientes no se muestran (solo los que tienen URL válida)', () => {
    assert.match(content, /\.filter\(d => d\.url\)/)
  })
  test('el bloque de documentos aparece antes de las cláusulas y la frase de aceptación sigue al final', () => {
    const i = content.indexOf('data-section="documentos-relacionados"')
    const j = content.indexOf('v-for="s in sections"')
    const k = content.indexOf('PRECONTRACTUAL_ACCEPTANCE_CLOSING }}')
    assert.ok(i > 0 && i < j && j < k)
  })
})

describe('área táctil de los enlaces documentales', () => {
  test('los enlaces de la lista del modal/página precontractual miden al menos 44 px de alto', () => {
    assert.match(content, /inline-flex items-center min-h-\[44px\][^"]*">\{\{ d\.title \}\}/)
  })
  test('los enlaces de documentos de la política de datos miden al menos 44 px de alto', () => {
    assert.equal((policy.match(/flex items-center justify-between gap-4 min-h-\[44px\]/g) ?? []).length, 1)
  })
})

describe('sin cambios en integraciones ni consentimientos', () => {
  test('los formularios y sus payloads no se tocaron en esta etapa', () => {
    assert.match(read('components/referral/ReferralForm.vue'), /v-model="values\.accepted_contract" type="checkbox"/)
    assert.match(read('shared/utils/prpEnrollment.ts'), /accepted_contract: true,/)
    assert.match(read('services/LeadService.ts'), /'\/api\/forms\/lead'/) // envío por correo (antes: proveedor simulado)
    assert.match(read('server/utils/crmClient.ts'), /\['accept', '1'\]/)
    assert.match(read('providers/CrmPrpLeadProvider.ts'), /form\.append\('accept', '1'\)/)
  })
})

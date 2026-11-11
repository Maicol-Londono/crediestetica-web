// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Etapa D4: contacto confirmado y textos legales sin identidad ni datos de Planmed (razón social y PQRS pendientes, no inventados).
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from '../recommendations/harness.ts'

const read = rel => readFileSync(join(ROOT, rel), 'utf8')
function walk(dir, out = []) {
  for (const n of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${n}`
    if (statSync(join(ROOT, rel)).isDirectory()) { if (!['node_modules', '.nuxt', '.output', '.data'].includes(n)) walk(rel, out) } else if (/\.(vue|ts)$/.test(n)) out.push(rel)
  }
  return out
}
const SRC = ['components', 'pages', 'layouts', 'shared', 'server', 'services', 'utils', 'composables', 'types', 'providers'].flatMap(d => walk(d)).concat(['app.vue', 'error.vue', 'nuxt.config.ts'])
const contact = await import(pathToFileURL(join(ROOT, 'shared/utils/contact.ts')).href)
const legal = await import(pathToFileURL(join(ROOT, 'shared/utils/legalIdentity.ts')).href)
const LEGAL_PAGES = ['components/common/PrecontractualModal.vue', 'pages/informacion-precontractual.vue', 'pages/politica-datos-personales.vue']

describe('datos de contacto confirmados', () => {
  test('valores y formatos', () => {
    assert.equal(contact.CONTACT_EMAIL, 'legalmedcartera@gmail.com')
    assert.equal(contact.CONTACT_MAILTO, 'mailto:legalmedcartera@gmail.com')
    assert.equal(contact.PHONE_NUMBER, '3174563224')
    assert.equal(contact.PHONE_DISPLAY, '317 456 3224')
    assert.equal(contact.PHONE_TEL, 'tel:+573174563224')
    assert.equal(contact.WHATSAPP_NUMBER, '573011409597')
    assert.equal(contact.WHATSAPP_DISPLAY, '301 140 9597')
    assert.equal(contact.WHATSAPP_URL, 'https://wa.me/573011409597')
  })
  test('el correo, el celular y el WhatsApp solo están escritos en shared/utils/contact.ts (sin duplicados)', () => {
    for (const f of SRC) {
      if (f === 'shared/utils/contact.ts') continue
      const s = read(f)
      assert.ok(!/legalmedcartera@gmail\.com/.test(s), `${f}: correo duplicado`)
      assert.ok(!/3174563224|317 456 3224/.test(s), `${f}: celular duplicado`)
      assert.ok(!/573011409597|301 140 9597/.test(s), `${f}: WhatsApp duplicado`)
    }
  })
  test('el pie de página muestra correo, celular y WhatsApp desde contact.ts', () => {
    const f = read('components/layout/Footer.vue')
    for (const t of ['CONTACT_MAILTO', 'CONTACT_EMAIL', 'PHONE_TEL', 'PHONE_DISPLAY', 'WHATSAPP_URL', 'WHATSAPP_DISPLAY']) assert.ok(f.includes(t), t)
  })
})

describe('datos heredados de Planmed', () => {
  test('ningún código ejecutable ni visible contiene correos, NIT o teléfonos de Planmed', () => {
    for (const f of SRC) {
      const s = read(f)
      assert.ok(!/pqrs\.institucional|900\.?794\.?105|planmed\.com|3188043382|318 804 3382|315 785 7783/i.test(s), f)
    }
  })
  test('los textos legales no nombran a Planmed ni a «Plan Médico»', () => {
    for (const f of LEGAL_PAGES) assert.ok(!/planmed|plan m[eé]dico/i.test(read(f)), f)
  })
  test('la política de datos ya no enlaza documentos de otra sociedad', () => {
    const s = read('pages/politica-datos-personales.vue')
    assert.ok(!/\.pdf|https?:\/\/(?!wa\.me)/.test(s.replace(/href="https?:\/\/[^"]*"/g, m => m)), 'sin PDF ni dominios externos')
    assert.ok(!/documents\s*=\s*\[/.test(s))
  })
})

describe('identidad legal pendiente (no se inventa)', () => {
  test('la razón social y el correo de PQRS siguen sin confirmar', () => {
    assert.equal(legal.LEGAL_ENTITY_NAME, null)
    assert.equal(legal.PQRS_EMAIL, null)
    assert.equal(legal.LEGAL_IDENTITY_CONFIRMED, false)
    assert.equal(legal.LEGAL_NIT, '901532790')
  })
  test('ni «Legamled» ni «LEGALMED S.A.S.» ni el NIT se publican fuera de legalIdentity.ts', () => {
    for (const f of SRC) {
      if (f === 'shared/utils/legalIdentity.ts') continue
      const s = read(f)
      assert.ok(!/legamled|LEGALMED S\.A\.S/i.test(s), `${f}: razón social sin confirmar`)
      assert.ok(!/901\.?532\.?790/.test(s), `${f}: NIT fuera del módulo legal`)
    }
  })
  test('los textos legales usan la referencia genérica y condicionan NIT y PQRS a su confirmación; conservan las cláusulas', () => {
    // Modal y página no llevan texto propio: renderizan PrecontractualContent.vue (identificación) con las cláusulas de precontractualContent.ts.
    for (const f of LEGAL_PAGES.slice(0, 2)) assert.ok(read(f).includes('<PrecontractualContent />'), f)
    const comp = read('components/legal/PrecontractualContent.vue')
    assert.ok(comp.includes('LEGAL_ISSUER_LABEL') && comp.includes('v-if="LEGAL_IDENTITY_CONFIRMED"') && comp.includes('v-if="PQRS_EMAIL"'))
    const s = read('shared/utils/precontractualContent.ts')
    for (const t of ['recursos propios', 'no garantiza resultados médicos', 'pagos anticipados', 'Datacrédito', 'firma física o digital']) assert.ok(s.includes(t), `cláusula «${t}»`)
    assert.ok(read('components/common/PrecontractualModal.vue').includes('Acepto y continuar'))
    assert.equal(legal.LEGAL_ISSUER_LABEL, 'la sociedad responsable de la financiación en Crediestética')
  })
  test('el modal conserva su clave de almacenamiento y los botones de aceptar/rechazar', () => {
    const m = read('components/common/PrecontractualModal.vue')
    assert.match(m, /'crediestetica_precontractual_v1'/)
    assert.match(m, /handleAccept/)
    assert.match(m, /handleReject/)
  })
})

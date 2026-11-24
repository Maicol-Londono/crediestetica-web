// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Etapa D1: identidad visual y textos institucionales de Crediestética en las páginas públicas recuperadas.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { ROOT } from '../recommendations/harness.ts'

const read = rel => readFileSync(join(ROOT, rel), 'utf8')
const md5 = rel => createHash('md5').update(readFileSync(join(ROOT, rel))).digest('hex')
// Huellas md5 de los recursos del proyecto original de Crediestética (los de Planmed tenían otra huella).
const ORIGINAL = {
  'public/images/branding/logo.jpg': 'f5a9019f', 'public/images/branding/logo_fondo_transparente.png': 'f030e02b',
  'public/images/branding/logo-ico.ico': 'd69f4820', 'public/images/web/home.png': '8caba184'
}
const PAGES = ['pages/index.vue', 'pages/quienes-somos.vue', 'pages/servicios.vue', 'pages/nosotros.vue', 'components/site/PageShell.vue', 'components/site/ManagedPage.vue', 'pages/recursos/index.vue', 'error.vue', 'app.vue', 'shared/utils/financingSeo.ts', 'components/common/TrustSection.vue', 'components/home/ClinicsSection.vue', 'components/common/MedicalLeadershipSection.vue']

describe('recursos visuales', () => {
  test('logos, favicon y portada son los originales de Crediestética', () => {
    for (const [f, h] of Object.entries(ORIGINAL)) assert.ok(md5(f).startsWith(h), f)
  })
  test('ya no existen los recursos exclusivos de Planmed', () => {
    for (const f of ['branding/logo-blanco-transparente.png', 'branding/logo-blanco.jpg', 'branding/logo-ico2.ico', 'branding/logo.ico', 'team/equipo-planmed.png', 'web/home2.png', 'web/nosotros-hero.jpg', 'web/portada_simulador.png']) assert.ok(!existsSync(join(ROOT, 'public/images', f)), f)
  })
  test('toda imagen /images/... usada por las páginas modificadas existe', () => {
    for (const p of PAGES) for (const m of read(p).matchAll(/["'`](\/images\/[A-Za-z0-9/_().-]+\.(?:png|jpe?g|webp|ico|svg))["'`]/g)) assert.ok(existsSync(join(ROOT, 'public', m[1])), `${p}: ${m[1]}`)
  })
})

describe('pie de página', () => {
  // Las redes sociales y el WhatsApp del pie son datos de contacto: quedan fuera de D1 (pendientes de verificación del titular).
  // D9.5: el pie reproduce el del original (descripción, columnas Legal y Contacto, línea de derechos); sin logo, como el original.
  test('descripción, enlaces y derechos son los del original de Crediestética', () => {
    const f = read('components/layout/Footer.vue')
    assert.match(f, /Soluciones de financiación médica premium/)
    assert.match(f, /Información de Contacto/)
    assert.match(f, /© 2026 Crediestética\. Financiación Médica Premium\. Todos los derechos reservados\./)
    assert.doesNotMatch(f, /Financiamos directamente|50%|Planmed/)
  })
})

describe('textos públicos', () => {
  test('las páginas modificadas no nombran a Planmed ni incrustan videos fijos suyos', () => {
    for (const p of PAGES) {
      const src = read(p)
      assert.ok(!/planmed/i.test(src), p)
      assert.ok(!/youtube(-nocookie)?\.com|aboutYoutubeEmbedUrl\('|wa\.me\/573188043382/.test(src), `${p}: recurso externo de Planmed`)
    }
  })
  test('título global y SEO de la portada son de Crediestética', () => {
    assert.match(read('nuxt.config.ts'), /title:\s*'FINANCIACIÓN DE CIRUGÍAS PLÁSTICAS \| CREDIESTÉTICA'/)
    assert.match(read('pages/index.vue'), /alt="Crediestética/)
  })
})

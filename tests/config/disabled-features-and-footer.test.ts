// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Funcionalidades desactivadas (PRP público), Footer (login, redes, enlaces legales) y catálogo Hub-first. Noticias está activa: tests/news/admin-module.test.ts.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from '../recommendations/harness.ts'

const read = rel => readFileSync(join(ROOT, rel), 'utf8')
const imp = async rel => await import(pathToFileURL(join(ROOT, rel)).href)
const F = await imp('shared/utils/features.ts')
const C = await imp('shared/utils/contact.ts')
const L = await imp('shared/utils/legalDocuments.ts')

describe('PRP desactivado', () => {
  test('la bandera está apagada y bloquea el micrositio y su lectura', () => {
    assert.equal(F.PRP_ENABLED, false)
    assert.equal(F.isDisabledPagePath('/prp/un-codigo'), true)
    assert.equal(F.isDisabledApiPath('/api/public/prp/un-codigo'), true)
    assert.equal(F.isDisabledPagePath('/prpx'), false)
  })
  test('el proveedor del CRM falla ANTES de leer la URL y de hacer fetch', () => {
    const src = read('providers/CrmPrpLeadProvider.ts')
    const guard = src.indexOf('if (!PRP_ENABLED)')
    assert.ok(guard > 0)
    assert.ok(guard < src.indexOf('crmPrpFormUrl || '), 'la guardia va antes de leer la URL')
    assert.ok(guard < src.indexOf('await fetch(') || guard < src.indexOf('fetch(url'), 'la guardia va antes del fetch')
  })
  test('el CRM de valoración no tiene destino por defecto (el de Planmed se retiró) y el de PRP no cambió', () => {
    assert.match(read('nuxt.config.ts'), /crmPrpFormUrl: 'https:\/\/pdtclientsolutions\.com\/crm-public\/api\/forms-px-prp'/)
    assert.match(read('nuxt.config.ts'), /^    crmValuationUrl: '',$/m)
    assert.doesNotMatch(read('nuxt.config.ts'), /crmValuationUrl: '[^']/)
  })
})

describe('Footer', () => {
  const footer = read('components/layout/Footer.vue')
  test('el acceso al login está en el Footer y ya no en el Navbar', () => {
    assert.match(footer, /to="\/admin\/login"/)
    assert.match(footer, /data-testid="footer-login"/)
    assert.doesNotMatch(read('components/layout/Navbar.vue'), /\/admin\/login/)
  })
  test('WhatsApp oficial +57 301 140 9597', () => {
    assert.equal(C.WHATSAPP_NUMBER, '573011409597')
    assert.equal(C.WHATSAPP_URL, 'https://wa.me/573011409597')
    assert.match(footer, /data-testid="footer-social-whatsapp"/)
  })
  test('sin enlaces genéricos a /recursos ni perfiles de otras marcas', () => {
    assert.doesNotMatch(footer, /\/recursos/)
    assert.doesNotMatch(footer, /instagram\.com\/|facebook\.com\/|tiktok\.com\/@/)
  })
  test('enlaces legales desde el registro central: política de datos (Drive) y precontractual (ruta propia)', () => {
    assert.match(footer, /legalDocLink\(l\.key\)/)
    assert.match(footer, /key: 'politicaDatos'/)
    assert.match(footer, /key: 'precontractual'/)
    assert.equal(L.legalDocLink('politicaDatos').external, true)
    assert.equal(L.legalDocLink('politicaDatos').href, L.LEGAL_DOCUMENTS.politicaDatos.url)
    assert.equal(L.legalDocLink('precontractual').href, '/informacion-precontractual')
  })
  test('redes: Facebook, Instagram y TikTok con sus URL oficiales; Messenger pendiente y sin enlace inventado', () => {
    assert.deepEqual(C.SOCIAL_PROFILES.map(p => p.key), ['instagram', 'facebook', 'tiktok', 'messenger'])
    const urls = Object.fromEntries(C.publicSocialProfiles().map(p => [p.key, p.url]))
    assert.deepEqual(urls, {
      instagram: 'https://www.instagram.com/crediestetica/',
      facebook: 'https://www.facebook.com/profile.php?id=61591493931360',
      tiktok: 'https://www.tiktok.com/@crediestetica'
    })
    assert.equal(C.SOCIAL_PROFILES.find(p => p.key === 'messenger').url, null)
    assert.equal(C.WHATSAPP_URL, 'https://wa.me/573011409597')
    assert.equal(C.isValidSocialUrl('instagram', 'https://www.instagram.com/perfil_ejemplo'), true)
    assert.equal(C.isValidSocialUrl('instagram', 'https://www.facebook.com/perfil'), false)
    assert.equal(C.isValidSocialUrl('tiktok', 'http://www.tiktok.com/@x'), false)
    assert.equal(C.isValidSocialUrl('facebook', 'https://user:pw@www.facebook.com/x'), false)
    assert.equal(C.isValidSocialUrl('facebook', null), false)
    const pub = C.publicSocialProfiles([{ key: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@ejemplo' }, { key: 'instagram', label: 'Instagram', url: 'https://example.com/x' }])
    assert.deepEqual(pub.map(p => p.key), ['tiktok'])
  })
})

describe('Catálogo de procedimientos Hub-first', () => {
  test('lista y detalle salen de Wellezy Hub; el cliente solo habla con Nitro', () => {
    assert.match(read('server/api/public/procedures/index.get.ts'), /wellezyPublicGet<any>\(event, `\/v1\/web\/cirugias\?page=/)
    assert.match(read('server/api/public/procedures/\[slug\].get.ts'), /wellezyPublicGet<any>\(event, `\/v1\/web\/cirugias\//)
    assert.match(read('providers/HubPublicProcedureProvider.ts'), /\/api\/public\/procedures/)
  })
  test('no hay fuente local paralela de procedimientos', () => {
    for (const f of ['data/procedures.ts', 'data/procedures.js', 'data/clinics.ts', 'data/allies.js']) assert.equal(existsSync(join(ROOT, f)), false, f)
  })
})

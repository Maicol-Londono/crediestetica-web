// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Identidad/aislamiento de Crediestética: tenant, dominio público, cookie de sesión, claves de almacenamiento y variables de entorno.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from '../recommendations/harness.ts'

const read = rel => readFileSync(join(ROOT, rel), 'utf8')

describe('tenant y dominio', () => {
  test('empresa legalmed, línea crediestetica (por defecto)', () => {
    const src = read('nuxt.config.ts')
    assert.match(src, /wellezyCompanySlug:\s*'legalmed'/)
    assert.match(src, /wellezyLineSlug:\s*'crediestetica'/)
    assert.match(src, /appName:\s*'Crediestética'/)
    assert.match(src, /site:\s*\{\s*(\/\/[^\n]*\n\s*)*url:\s*'https:\/\/crediestetica\.com'/)
  })
  test('la URL de la API del Hub sigue separada del dominio público y no tiene valor por defecto', () => {
    const src = read('nuxt.config.ts')
    assert.match(src, /wellezyApiBaseUrl:\s*''/)
    assert.ok(!/wellezyApiBaseUrl:\s*'https:\/\/crediestetica/.test(src))
  })
  test('el tenant enviado al Hub sale de wellezyLineSlug (X-Tenant-Linea); no se envía X-Tenant-Domain', () => {
    const src = read('server/utils/wellezy.ts')
    assert.match(src, /X-Tenant-Linea/)
    assert.match(src, /wellezyLineSlug/)
    assert.ok(!/X-Tenant-Domain/.test(src))
  })
  test('el tenant se resuelve por slug: la empresa 16 y la línea 4 solo figuran como referencia documental, no como configuración', () => {
    const src = read('nuxt.config.ts')
    assert.match(src, /companies\.id 16/)
    assert.match(src, /lineas\.id 4/)
    assert.ok(!/(companyId|lineaId|lineId|company_id|linea_id)\s*:/.test(src), 'no hay claves de id de empresa/línea en la configuración')
    for (const f of ['server/utils/wellezy.ts', 'server/utils/auth.ts']) assert.ok(!/company_id|linea_id|companyId|lineaId/.test(read(f)), `${f} no usa ids de tenant`)
  })
  test('la URL pública del sitio, localDomain y la API del Hub son valores distintos', () => {
    const src = read('nuxt.config.ts')
    assert.match(src, /localDomain:\s*'crediestetica\.com'/)
    assert.match(src, /wellezyApiBaseUrl:\s*''/)
    assert.ok(!/wellezyApiBaseUrl[^\n]*crediestetica\.com/.test(src))
  })
  test('sin IDs de rol heredados por defecto', () => {
    const src = read('nuxt.config.ts')
    for (const k of ['adminRoleIds', 'rateEditorRoleIds', 'contentEditorRoleIds']) assert.ok(src.replace(/\s+/g, '').includes(`${k}:''`), k)
  })
})

describe('sesión y almacenamiento del navegador', () => {
  test('cookie de sesión crediestetica-admin en auth.ts y en el middleware', () => {
    assert.match(read('server/utils/auth.ts'), /name:\s*'crediestetica-admin'/)
    assert.match(read('server/middleware/admin-password-change.ts'), /getCookie\(event,\s*'crediestetica-admin'\)/)
  })
  test('claves de localStorage propias', () => {
    assert.match(read('components/common/PrecontractualModal.vue'), /'crediestetica_precontractual_v1'/)
    assert.match(read('pages/admin/login.vue'), /'crediestetica-admin-email'/)
    assert.match(read('services/TrackingService.ts'), /crediestetica_session_id/)
  })
  test('el secreto de sesión no tiene valor por defecto ni aparece en .env.example', () => {
    assert.match(read('nuxt.config.ts'), /sessionPassword:\s*''/)
    assert.match(read('.env.example'), /^NUXT_SESSION_PASSWORD=$/m)
  })
})

describe('.env.example', () => {
  const env = read('.env.example')
  test('valores de Crediestética y sin variables NUXT_PLANMED_*', () => {
    assert.match(env, /^NUXT_WELLEZY_COMPANY_SLUG=legalmed$/m)
    assert.match(env, /^NUXT_WELLEZY_LINE_SLUG=crediestetica$/m)
    assert.match(env, /^NUXT_PUBLIC_SITE_URL=https:\/\/crediestetica\.com$/m)
    assert.ok(!/PLANMED/i.test(env))
  })
})

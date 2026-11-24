// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isHeroRoute } from '../../shared/utils/heroRoutes.ts'

describe('menú transparente sobre el hero (D9.1)', () => {
  test('Inicio, Procedimientos (lista) y las páginas con ImageHero tienen hero a ancho completo', () => {
    assert.equal(isHeroRoute('/'), true)
    assert.equal(isHeroRoute('/procedimientos'), true)
    assert.equal(isHeroRoute('/procedimientos/'), true)
    assert.equal(isHeroRoute('/procedimientos?q=a'), true)
    assert.equal(isHeroRoute('/procedimientos/abdominoplastia'), false)
    for (const r of ['/noticias', '/servicios', '/clinicas-aliadas', '/estudio-de-creditos', '/informacion-precontractual', '/politica-datos-personales', '/recursos', '/quienes-somos', '/financiacion']) {
      assert.equal(isHeroRoute(r), true, r)
    }
    assert.equal(isHeroRoute('/noticias/un-articulo'), false)
    assert.equal(isHeroRoute('/nosotros'), true)
    assert.equal(isHeroRoute('/financiacion'), true)
    assert.equal(isHeroRoute('/testimonios'), false)
  })

  test('el layout reserva el alto del menú fijo solo fuera de las páginas con hero', () => {
    const layout = readFileSync('layouts/default.vue', 'utf8')
    assert.match(layout, /isHero \? '' : 'pt-20'/)
  })

  test('el menú alterna transparente/sólido por ruta y desplazamiento, con logo blanco sobre el hero', () => {
    const nav = readFileSync('components/layout/Navbar.vue', 'utf8')
    assert.match(nav, /isHeroRoute\(route\.path\)/)
    assert.match(nav, /scrollY\.value <= 30 && !isMobileMenuOpen\.value/)
    assert.match(nav, /brightness-0 invert/)
    assert.match(nav, /fixed top-0/)
  })
})

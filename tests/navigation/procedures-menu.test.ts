// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Desplegable de Procedimientos: datos reales de la lista pública de Hub, slugs reales, sin lista hardcodeada ni detalle por ítem.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from '../recommendations/harness.ts'

const { buildProcedureMenu } = await import(pathToFileURL(join(ROOT, 'utils/navMenus.ts')).href)
const navbar = readFileSync(join(ROOT, 'components/layout/Navbar.vue'), 'utf8')

describe('buildProcedureMenu', () => {
  test('un enlace por procedimiento con su slug real y el orden de Hub', () => {
    const items = buildProcedureMenu([{ slug: 'mamoplastia-de-aumento', name: 'Mamoplastia de aumento' }, { slug: 'lipo', name: ' Lipo ' }])
    assert.deepEqual(items, [{ to: '/procedimientos/mamoplastia-de-aumento', label: 'Mamoplastia de aumento' }, { to: '/procedimientos/lipo', label: 'Lipo' }])
  })
  test('lista vacía (o Hub caído) => sin entradas: el Navbar deja el enlace simple', () => {
    assert.deepEqual(buildProcedureMenu([]), [])
  })
  test('descarta datos inválidos (slug raro, sin nombre) para no generar enlaces rotos ni inyectar rutas', () => {
    const items = buildProcedureMenu([{ slug: '../admin', name: 'X' }, { slug: 'a b', name: 'X' }, { slug: 'ok', name: '' }, { slug: 'ok2', name: 'Bien' }, { name: 'Sin slug' }])
    assert.deepEqual(items.map(i => i.to), ['/procedimientos/ok2'])
  })
  test('una lista larga se entrega completa (el límite es visual, con scroll, no un recorte de datos)', () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ slug: `p-${i}`, name: `P ${i}` }))
    assert.equal(buildProcedureMenu(many).length, 60)
  })
})

describe('Navbar.vue — desplegable de Procedimientos', () => {
  test('usa la lista pública ya cargada (sin detalle por procedimiento) y no hay lista hardcodeada', () => {
    assert.match(navbar, /buildProcedureMenu\(hubMenu\.value\?\.procedures/)
    assert.equal(/getProcedureBySlug/.test(navbar), false)
    assert.equal(/\/procedimientos\/[a-z]/.test(navbar), false, 'ningún slug escrito a mano')
  })
  test('altura máxima ligada al viewport y scroll interno, en escritorio y móvil', () => {
    assert.match(navbar, /max-h-\[min\(70vh,calc\(100dvh-120px\)\)\] overflow-y-auto/)
    assert.match(navbar, /data-testid="procedures-list-mobile"/)
    assert.match(navbar, /max-h-\[50dvh\] overflow-y-auto/)
  })
  test('accesible: se abre con foco de teclado, expone aria-expanded/haspopup y Escape cierra', () => {
    assert.match(navbar, /data-testid="procedures-menu" @focusin="openMenu = 'PROCEDIMIENTOS'" @focusout="openMenu = null"/)
    assert.match(navbar, /aria-haspopup="true" :aria-expanded="openMenu === 'PROCEDIMIENTOS'/)
    assert.match(navbar, /@keydown\.esc/)
  })
  test('sin procedimientos queda el enlace simple a /procedimientos', () => {
    assert.match(navbar, /<NuxtLink v-else to="\/procedimientos"/)
  })
  test('un fallo de la lista de páginas o del árbol no borra el menú de procedimientos (y viceversa)', () => {
    // Las dos listas (procedimientos y árbol de temas) se piden de forma independiente; el menú ya no usa el contrato histórico.
    assert.match(navbar, /Promise\.allSettled\(\[publicProcedureService\.getProcedures\(\), publicRecommendationsService\.getTopics\(\)\]\)/)
  })
  test('si el servidor no trajo los temas, el navegador los vuelve a pedir al montar (menú siempre igual)', () => {
    assert.match(navbar, /recoverTopics\(\)/)
    assert.match(navbar, /await refreshHubMenu\(\)/)
  })
})

describe('Navbar.vue: recuperación de temas sincronizada con Planmed (KI-15)', () => {
  test('sin reintento en el servidor (withRetry) ni bucle ensureTopics heredados', () => {
    assert.doesNotMatch(navbar, /withRetry|ensureTopics/)
  })
  test('recoverTopics: máximo 3 intentos, se detiene con temas o al desmontar y limpia el temporizador', () => {
    assert.match(navbar, /async function recoverTopics\(attempt = 1\)/)
    assert.match(navbar, /attempt >= 3/)
    assert.match(navbar, /if \(unmounted \|\| hasTopics\(\)\) return/)
    assert.match(navbar, /setTimeout\(\(\) => recoverTopics\(attempt \+ 1\), 3000\)/)
    assert.match(navbar, /clearTimeout\(retryTimer\)/)
    assert.doesNotMatch(navbar, /setInterval/)
  })
  test('se invoca al montar (navegador), no durante el render del servidor', () => {
    assert.match(navbar, /onMounted\(\(\) => \{\s*window\.addEventListener\('resize', onResize\)\s*window\.addEventListener\('scroll', onScroll, \{ passive: true \}\)\s*onScroll\(\)\s*recoverTopics\(\)\s*\}\)/)
  })
  test('los errores de Hub siguen siendo independientes: cada lista cae a [] por separado', () => {
    assert.match(navbar, /procedures: procedures\.status === 'fulfilled' \? procedures\.value : \[\]/)
    assert.match(navbar, /topics: topics\.status === 'fulfilled' \? topics\.value : \[\]/)
  })
})

// Comportamiento REAL de recoverTopics: se extrae del propio Navbar.vue y se ejecuta con un refresh simulado y temporizador falso.
describe('recoverTopics (ejecutada con refresh simulado)', () => {
  const start = navbar.indexOf('const hasTopics')
  const end = navbar.indexOf('onMounted(() => {', start)
  const body = navbar.slice(start, end)
  assert.ok(start > 0 && end > start, 'bloque recoverTopics localizado')

  function harness(responses: Array<any[] | 'error'>) {
    const hubMenu = { value: { procedures: [], topics: [] as any[] } }
    const timers: Array<() => void> = []
    let calls = 0
    const refreshHubMenu = async () => {
      const r = responses[Math.min(calls++, responses.length - 1)]
      if (r === 'error') hubMenu.value = { procedures: [], topics: [] } // Navbar: un fallo deja los temas en []
      else hubMenu.value = { procedures: [], topics: r }
    }
    const setTimeoutFake = (fn: () => void, ms: number) => { assert.equal(ms, 3000); timers.push(fn); return timers.length }
    const clearTimeoutFake = () => { timers.length = 0 }
    const api = new Function('hubMenu', 'refreshHubMenu', 'setTimeout', 'clearTimeout', `${body}; return { recoverTopics, unmount: () => { unmounted = true; if (retryTimer) clearTimeout(retryTimer) } }`)(hubMenu, refreshHubMenu, setTimeoutFake, clearTimeoutFake)
    const flush = async () => { while (timers.length) { const fn = timers.shift()!; await fn(); await Promise.resolve() } }
    return { api, calls: () => calls, flush, timers }
  }
  const topic = [{ slug: 'cuidados', subtopics: [{ slug: 'a' }] }]

  test('con los temas ya presentes (SSR completo) no se pide nada', async () => {
    const hubMenu = { value: { topics: topic } }
    const recover = new Function('hubMenu', 'refreshHubMenu', 'setTimeout', 'clearTimeout', `${body}; return recoverTopics`)(hubMenu, async () => { throw new Error('no debe pedir') }, () => 0, () => {})
    await recover()
  })
  test('primera respuesta incompleta (sin temas): recupera al segundo intento y se detiene', async () => {
    const h = harness([[], topic])
    await h.api.recoverTopics(); assert.equal(h.calls(), 1); assert.equal(h.timers.length, 1)
    await h.flush(); assert.equal(h.calls(), 2); assert.equal(h.timers.length, 0, 'sin más reintentos')
  })
  test('respuestas vacías o con error: exactamente 3 intentos y se detiene', async () => {
    for (const seq of [[[]], ['error'], ['error', [], 'error']] as any[]) {
      const h = harness(seq)
      await h.api.recoverTopics(); await h.flush()
      assert.equal(h.calls(), 3, JSON.stringify(seq))
      assert.equal(h.timers.length, 0)
    }
  })
  test('al desmontar se cancela el reintento pendiente y no se vuelve a pedir', async () => {
    const h = harness([[]])
    await h.api.recoverTopics(); assert.equal(h.timers.length, 1)
    h.api.unmount(); await h.flush()
    assert.equal(h.calls(), 1)
  })
})

describe('Navbar.vue conserva la identidad y la navegación de Crediestética tras la sincronización', () => {
  test('menú CONÓCENOS y rutas institucionales intactos, sin etiquetas de Planmed', () => {
    for (const to of ['/nosotros', '/quienes-somos', '/servicios', '/clinicas-aliadas', '/estudio-de-creditos', '/informacion-precontractual', '/politica-datos-personales', '/recursos']) assert.ok(navbar.includes(`to: '${to}'`), to)
    assert.match(navbar, /data-testid="institutional-menu"/)
    assert.match(navbar, /CONÓCENOS/)
    // El acceso al panel se trasladó al Footer (decisión aprobada): el Navbar ya no lo ofrece.
    assert.doesNotMatch(navbar, /\/admin\/login/)
    assert.doesNotMatch(navbar, /planmed|0C2619|D3A76A/i)
  })
})

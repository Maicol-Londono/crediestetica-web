// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Guarda de rutas del panel (middleware/admin-auth.global.ts). El router de Nuxt NO distingue mayúsculas: `/Admin/noticias` llega a la misma
// página que `/admin/noticias`. La guarda comparaba `to.path.startsWith('/admin')` con distinción de mayúsculas y dejaba pasar las variantes
// sin autenticación. Se ejecuta el código REAL del middleware y de shared/utils/adminPasswordGate.ts con la sesión y la navegación simuladas:
// no hay red, ni Hub, ni escrituras.
import { test, describe, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from '../recommendations/harness.ts'

const imp = rel => import(pathToFileURL(join(ROOT, rel)).href)
const read = rel => readFileSync(join(ROOT, rel), 'utf8')

const EDITOR = { id: 1, canEditContent: true, mustChangePassword: false }
const NO_EDITOR = { id: 2, canEditContent: false, mustChangePassword: false }
const PENDING = { id: 3, canEditContent: true, mustChangePassword: true }

// Variantes de mayúsculas de cada ruta protegida (más las formas que el router también resuelve: barra final y barras repetidas).
const PROTECTED = [
  '/admin', '/Admin', '/ADMIN', '/admin/',
  '/admin/noticias', '/Admin/noticias', '/ADMIN/NOTICIAS', '/aDmIn/NoTiCiAs', '/admin/noticias/', '/admin//noticias', '//admin/noticias',
  '/admin/noticias/mi-nota', '/Admin/Noticias/Mi-Nota',
  '/admin/configuracion', '/Admin/configuracion', '/ADMIN/CONFIGURACION',
  '/admin/nosotros', '/Admin/Nosotros', '/ADMIN/NOSOTROS',
  '/admin/paginas/clinicas-aliadas', '/ADMIN/PAGINAS/clinicas-aliadas',
  '/admin/procedimientos', '/ADMIN/PROCEDIMIENTOS', '/admin/recomendaciones/temas', '/Admin/Recomendaciones/Temas',
  '/admin/cambiar-contrasena', '/Admin/Cambiar-Contrasena'
]
const LOGIN = ['/admin/login', '/Admin/login', '/ADMIN/LOGIN', '/admin/login/', '/Admin/Login/']

const state = { user: null, fetchImpl: null, headers: {}, loads: 0 }
let dir, middleware, gate

// Copia del middleware con sus importaciones de Nuxt sustituidas por simulaciones; el módulo compartido es el REAL.
const redirect = p => ({ __redirect: p })
async function loadMiddleware() {
  writeFileSync(join(dir, 'imports.mjs'), `
    export const defineNuxtRouteMiddleware = fn => fn
    export const navigateTo = p => ({ __redirect: p })
    export const createError = o => Object.assign(new Error(o.statusMessage ?? 'error'), o)
    export const useRequestFetch = () => (...a) => globalThis.__adminTest.fetchImpl(...a)
    export const useResponseHeader = name => ({ set value(v) { globalThis.__adminTest.headers[name] = v } })
  `)
  writeFileSync(join(dir, 'auth.mjs'), `
    const t = () => globalThis.__adminTest
    export const authService = {
      loadUserSession: async () => { t().loads++; return !!t().user },
      getUser: () => ({ get value() { return t().user } })
    }
  `)
  const src = read('middleware/admin-auth.global.ts')
    .replace("from '#imports'", `from '${pathToFileURL(join(dir, 'imports.mjs')).href}'`)
    .replace("from '~/services/AuthService'", `from '${pathToFileURL(join(dir, 'auth.mjs')).href}'`)
    .replace(/import\.meta\.server/g, 'true') // en el servidor (SSR) la guarda también fija la cabecera noindex
  writeFileSync(join(dir, 'middleware.ts'), src)
  return (await import(pathToFileURL(join(dir, 'middleware.ts')).href)).default
}

/** Simula una navegación: ejecuta el middleware y sigue las redirecciones. Falla si hay un bucle. */
async function navigate(path, max = 6) {
  const trail = [path]
  let current = path
  for (let i = 0; i < max; i++) {
    let result
    try {
      result = await middleware({ path: current })
    } catch (error) {
      return { status: error.statusCode, final: current, trail }
    }
    if (result?.__redirect) {
      current = result.__redirect
      trail.push(current)
      continue
    }
    return { status: 200, final: current, trail }
  }
  assert.fail(`bucle de redirecciones: ${trail.join(' → ')}`)
}

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'admin-guard-'))
  globalThis.__adminTest = state
  gate = await imp('shared/utils/adminPasswordGate.ts')
  // El middleware usa estas funciones como importaciones automáticas de Nuxt (shared/utils).
  Object.assign(globalThis, { isAdminPanelPath: gate.isAdminPanelPath, normalizeAdminPath: gate.normalizeAdminPath, adminGateRedirect: gate.adminGateRedirect, ADMIN_LOGIN_PATH: gate.ADMIN_LOGIN_PATH })
  middleware = await loadMiddleware()
})
beforeEach(() => {
  state.user = null
  state.headers = {}
  state.loads = 0
  state.fetchImpl = async () => ({ canManageLine: true })
})
after(() => { delete globalThis.__adminTest; rmSync(dir, { recursive: true, force: true }) })

describe('normalización de rutas del panel', () => {
  test('isAdminPanelPath reconoce el panel en cualquier combinación de mayúsculas y no confunde otras rutas', () => {
    for (const p of [...PROTECTED, ...LOGIN]) assert.equal(gate.isAdminPanelPath(p), true, p)
    for (const p of ['/', '/administracion', '/Administracion', '/adminx/noticias', '/api/admin/news', '/noticias', '/procedimientos', '/prp/x', '/adm', '']) {
      assert.equal(gate.isAdminPanelPath(p), false, p)
    }
  })

  test('normalizeAdminPath: minúsculas, sin barras repetidas ni barra final', () => {
    assert.equal(gate.normalizeAdminPath('/ADMIN/NOTICIAS/'), '/admin/noticias')
    assert.equal(gate.normalizeAdminPath('//Admin//Noticias//'), '/admin/noticias')
    assert.equal(gate.normalizeAdminPath('/'), '/')
    assert.equal(gate.normalizeAdminPath('/Admin'), '/admin')
  })

  test('adminGateRedirect: sin sesión toda variante protegida va al login y las variantes del login no redirigen', () => {
    for (const p of PROTECTED) assert.equal(gate.adminGateRedirect(p, null), '/admin/login', p)
    for (const p of LOGIN) assert.equal(gate.adminGateRedirect(p, null), null, p)
  })

  test('adminGateRedirect: con sesión las variantes protegidas continúan y las del login llevan al panel', () => {
    const user = { mustChangePassword: false }
    for (const p of PROTECTED.filter(x => !/cambiar-contrasena/i.test(x))) assert.equal(gate.adminGateRedirect(p, user), null, p)
    for (const p of LOGIN) assert.equal(gate.adminGateRedirect(p, user), '/admin', p)
    for (const p of PROTECTED.filter(x => /cambiar-contrasena/i.test(x))) assert.equal(gate.adminGateRedirect(p, user), '/admin', p)
  })

  test('adminGateRedirect: con cambio de contraseña pendiente solo se permite la pantalla de cambio, también en variantes', () => {
    const user = { mustChangePassword: true }
    for (const p of [...PROTECTED, ...LOGIN]) {
      const expected = /cambiar-contrasena/i.test(p) ? null : '/admin/cambiar-contrasena'
      assert.equal(gate.adminGateRedirect(p, user), expected, p)
    }
  })
})

describe('middleware real: sin sesión', () => {
  test('toda variante protegida termina en el login (una sola redirección, sin bucles)', async () => {
    for (const p of PROTECTED) {
      const r = await navigate(p)
      assert.equal(r.final, '/admin/login', `${p} → ${r.trail.join(' → ')}`)
      assert.equal(r.trail.length, 2, `${p}: una sola redirección`)
    }
  })

  test('los casos del hallazgo: /Admin/noticias y /ADMIN/NOTICIAS ya no devuelven la página sin autenticación', async () => {
    for (const p of ['/admin/noticias', '/Admin/noticias', '/ADMIN/NOTICIAS', '/admin/configuracion', '/Admin/configuracion', '/admin/nosotros', '/ADMIN/NOSOTROS']) {
      assert.deepEqual((await navigate(p)).trail, [p, '/admin/login'], p)
    }
  })

  test('el login es accesible sin sesión en cualquier variante y no redirige (sin bucle)', async () => {
    for (const p of LOGIN) {
      const r = await navigate(p)
      assert.equal(r.status, 200, p)
      assert.deepEqual(r.trail, [p], `${p}: sin redirecciones`)
    }
  })

  test('no se consulta la configuración ni se llega a ninguna comprobación de permisos sin sesión', async () => {
    let called = 0
    state.fetchImpl = async () => { called++; return {} }
    for (const p of ['/Admin/configuracion', '/ADMIN/CONFIGURACION', '/Admin/Nosotros', '/ADMIN/PAGINAS/x']) await navigate(p)
    assert.equal(called, 0)
  })

  test('las rutas públicas no se tocan: no cargan la sesión ni se redirigen', async () => {
    for (const p of ['/', '/noticias', '/procedimientos', '/administracion', '/Administracion', '/api/admin/news', '/nosotros']) {
      const r = await navigate(p)
      assert.deepEqual(r.trail, [p], p)
    }
    assert.equal(state.loads, 0, 'una ruta pública no consulta la sesión')
  })
})

describe('middleware real: con sesión', () => {
  test('las variantes protegidas permiten el acceso (sin redirecciones)', async () => {
    state.user = EDITOR
    for (const p of PROTECTED.filter(x => !/cambiar-contrasena/i.test(x))) {
      const r = await navigate(p)
      assert.equal(r.status, 200, p)
      assert.deepEqual(r.trail, [p], p)
    }
  })

  test('con sesión, el login (cualquier variante) lleva al panel y ahí se queda: sin bucle', async () => {
    state.user = EDITOR
    for (const p of LOGIN) assert.deepEqual((await navigate(p)).trail, [p, '/admin'], p)
  })

  test('Nosotros y Páginas exigen perfil editor también en variantes de mayúsculas (403, no 200)', async () => {
    state.user = NO_EDITOR
    for (const p of ['/admin/nosotros', '/Admin/nosotros', '/ADMIN/NOSOTROS', '/admin/paginas/x', '/Admin/Paginas/clinicas-aliadas', '/ADMIN/PAGINAS/X']) {
      assert.equal((await navigate(p)).status, 403, p)
    }
    state.user = EDITOR
    for (const p of ['/admin/nosotros', '/ADMIN/NOSOTROS', '/Admin/Paginas/clinicas-aliadas']) assert.equal((await navigate(p)).status, 200, p)
  })

  test('Configuración consulta el acceso del servidor en cualquier variante: 401 → login, rechazo → 403, aceptado → 200', async () => {
    state.user = EDITOR
    for (const p of ['/admin/configuracion', '/Admin/configuracion', '/ADMIN/CONFIGURACION']) {
      state.fetchImpl = async () => ({ canManageLine: true })
      assert.equal((await navigate(p)).status, 200, `${p} aceptado`)
      state.user = EDITOR
      // Un 401 del servidor significa que la sesión ya no existe: el login que sigue debe abrirse sin sesión (si no, volvería al panel).
      state.fetchImpl = async () => { state.user = null; throw Object.assign(new Error('no'), { statusCode: 401 }) }
      assert.deepEqual((await navigate(p)).trail, [p, '/admin/login'], `${p} 401`)
      state.user = EDITOR
      state.fetchImpl = async () => { throw Object.assign(new Error('no'), { statusCode: 403 }) }
      assert.equal((await navigate(p)).status, 403, `${p} 403`)
    }
  })

  test('con cambio de contraseña pendiente todas las variantes van a la pantalla de cambio, y ahí no hay bucle', async () => {
    state.user = PENDING
    for (const p of ['/admin', '/Admin/noticias', '/ADMIN/CONFIGURACION', '/Admin/login']) {
      const r = await navigate(p)
      assert.equal(r.final, '/admin/cambiar-contrasena', p)
      assert.equal(r.trail.length, 2, p)
    }
    for (const p of ['/admin/cambiar-contrasena', '/Admin/Cambiar-Contrasena']) assert.deepEqual((await navigate(p)).trail, [p], p)
  })
})

describe('noindex y código fuente', () => {
  test('en el servidor, toda variante del panel (también el login) fija X-Robots-Tag: noindex, nofollow', async () => {
    for (const p of ['/admin/login', '/Admin/login', '/ADMIN/NOTICIAS', '/Admin']) {
      state.headers = {}
      await navigate(p)
      assert.equal(state.headers['X-Robots-Tag'], 'noindex, nofollow', p)
    }
    state.headers = {}
    await navigate('/noticias')
    assert.equal(state.headers['X-Robots-Tag'], undefined, 'el sitio público no se marca')
  })

  test('el middleware no compara to.path con distinción de mayúsculas y la regla compartida sigue siendo la misma', () => {
    const src = read('middleware/admin-auth.global.ts')
    assert.doesNotMatch(src, /to\.path\.startsWith\(/)
    assert.doesNotMatch(src, /to\.path\s*===/)
    assert.match(src, /isAdminPanelPath\(to\.path\)/)
    assert.match(src, /adminGateRedirect\(to\.path, authService\.getUser\(\)\.value\)/)
    assert.doesNotMatch(src, /\.toLowerCase\(\)/, 'la normalización vive en un solo lugar (shared/utils/adminPasswordGate.ts)')
  })
})

describe('APIs administrativas (se rechazan sin sesión; el servidor no depende de la guarda de páginas)', () => {
  test('los manejadores /api/admin/** exigen sesión: la cobertura completa está en tests/security/routes.test.ts', () => {
    const matrix = read('tests/security/routes.test.ts')
    assert.match(matrix, /lecturas admin sin sesión => 401/)
    assert.match(matrix, /mutaciones con origen válido y sin sesión => 401/)
  })
})

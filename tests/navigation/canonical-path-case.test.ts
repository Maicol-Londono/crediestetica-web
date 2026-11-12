// @ts-nocheck -- pruebas ejecutadas con Node (node:test); fuera del alcance del typecheck de Nuxt.
// Mayúsculas en rutas públicas: `/SIMULADOR` respondía 200 (cascarón vacío) mientras `/simulador` redirigía. Ahora las páginas públicas conocidas
// redirigen con 301 a su forma en minúsculas (shared/utils/canonicalPath.ts + server/middleware/canonical-path-case.ts).
// Se ejecuta el código REAL de la regla y del middleware de Nitro con el evento simulado: no hay red.
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from '../recommendations/harness.ts'

const imp = rel => import(pathToFileURL(join(ROOT, rel)).href)
const read = rel => readFileSync(join(ROOT, rel), 'utf8')

let rule, middleware, dir
const redirects = []

before(async () => {
  rule = await imp('shared/utils/canonicalPath.ts')
  dir = mkdtempSync(join(tmpdir(), 'canonical-'))
  const g = globalThis
  g.defineEventHandler = fn => fn
  g.sendRedirect = (event, location, code) => { redirects.push({ location, code }); return { location, code } }
  const base = pathToFileURL(join(ROOT, 'shared/utils')).href
  writeFileSync(join(dir, 'mw.ts'), read('server/middleware/canonical-path-case.ts').replace("'#shared/utils/canonicalPath'", `'${base}/canonicalPath.ts'`))
  middleware = (await import(pathToFileURL(join(dir, 'mw.ts')).href)).default
})
after(() => { rmSync(dir, { recursive: true, force: true }) })

/** Ejecuta el middleware: devuelve { code, location } si redirige, o null si deja pasar la petición. */
const run = (path, method = 'GET') => {
  redirects.length = 0
  const r = middleware({ path, method })
  return r ? { code: r.code, location: r.location } : null
}
const to = (path, location) => assert.deepEqual(run(path), { code: 301, location }, path)
const untouched = (path, method = 'GET') => assert.equal(run(path, method), null, `${method} ${path}`)

describe('redirección a minúsculas (301, destino exacto)', () => {
  test('el caso del hallazgo: /SIMULADOR, /Simulador y cualquier variante → directo a /financiacion (sin salto por /simulador)', () => {
    to('/SIMULADOR', '/financiacion')
    to('/Simulador', '/financiacion')
    to('/sImUlAdOr', '/financiacion')
    untouched('/simulador') // la forma en minúsculas no se toca: la sigue atendiendo la regla de Nitro (301 a /financiacion)
  })

  test('páginas públicas: /NOTICIAS, /PROCEDIMIENTOS y el resto de páginas estáticas', () => {
    to('/NOTICIAS', '/noticias')
    to('/PROCEDIMIENTOS', '/procedimientos')
    to('/Nosotros', '/nosotros')
    to('/FINANCIACION', '/financiacion')
    to('/Quienes-Somos', '/quienes-somos')
    to('/CLINICAS-ALIADAS', '/clinicas-aliadas')
    to('/Estudio-De-Creditos', '/estudio-de-creditos')
    to('/INFORMACION-PRECONTRACTUAL', '/informacion-precontractual')
    to('/Politica-Datos-Personales', '/politica-datos-personales')
    to('/RECURSOS', '/recursos')
    to('/Servicios', '/servicios')
    to('/TESTIMONIOS', '/testimonios')
    to('/Testimonios/Antes-Y-Despues', '/testimonios/antes-y-despues')
    to('/TESTIMONIOS/PROGRAMA-DE-REFERIDOS', '/testimonios/programa-de-referidos')
  })

  test('la cadena de consulta se conserva exacta', () => {
    to('/SIMULADOR?origen=web', '/financiacion?origen=web')
    to('/Noticias?page=2&q=Ñandú%20Azul', '/noticias?page=2&q=Ñandú%20Azul')
    to('/FINANCIACION?', '/financiacion?')
    to('/Simulador?a=B&c=D#x', '/financiacion?a=B&c=D#x')
    to('/Procedimientos?Categoria=Facial', '/procedimientos?Categoria=Facial')
  })

  test('la barra final se conserva: la URL canónica se comporta igual que su equivalente en minúsculas', () => {
    to('/Simulador/', '/financiacion') // /simulador/ ya redirige a /financiacion: mismo destino y sin barra final
    to('/NOTICIAS/', '/noticias/')
    to('/Procedimientos/?x=1', '/procedimientos/?x=1')
    untouched('/simulador/')
    untouched('/noticias/')
  })

  test('rutas anidadas y dinámicas: se normalizan los segmentos estáticos y se CONSERVA la mayúscula de los parámetros', () => {
    to('/NOTICIAS/Mi-Nota', '/noticias/Mi-Nota')
    to('/PROCEDIMIENTOS/Rinoplastia-Primaria', '/procedimientos/Rinoplastia-Primaria')
    to('/Recomendaciones/Tema-X', '/recomendaciones/Tema-X')
    to('/RECOMENDACIONES/Tema/SubTema', '/recomendaciones/Tema/SubTema')
    to('/Recomendaciones/Cuidados', '/recomendaciones/cuidados')
    to('/RECOMENDACIONES/CUIDADOS/Mi-Guia', '/recomendaciones/cuidados/Mi-Guia')
    to('/Recomendaciones/Revision/Mi-Revision', '/recomendaciones/revision/Mi-Revision')
    to('/Noticias/Mi-Nota/?utm=A', '/noticias/Mi-Nota/?utm=A')
  })

  test('solo la mayúscula de un PARÁMETRO no se toca (es dato de Hub, no de la aplicación)', () => {
    untouched('/noticias/Mi-Nota')
    untouched('/procedimientos/Rinoplastia')
    untouched('/recomendaciones/Tema/SubTema')
    untouched('/recomendaciones/cuidados/Mi-Guia')
    // «Cuidados» tras /noticias no es un segmento estático: es el slug
    untouched('/noticias/Cuidados')
    to('/NOTICIAS/Cuidados', '/noticias/Cuidados')
    // bajo /recomendaciones, «Cuidados» sí es la ruta estática (el router prefiere la ruta estática al parámetro)
    to('/recomendaciones/Cuidados', '/recomendaciones/cuidados')
  })
})

describe('lo que NO se redirige', () => {
  test('el panel /admin y sus variantes: ni se redirige ni se altera su guarda', () => {
    for (const p of ['/admin', '/Admin', '/ADMIN', '/ADMIN/NOTICIAS', '/Admin/Login', '/admin/noticias/Mi-Nota', '/ADMIN/CONFIGURACION']) untouched(p)
  })

  test('las rutas de API (incluida la autenticación) nunca se redirigen', () => {
    for (const p of ['/api/auth/login', '/API/AUTH/LOGIN', '/Api/Admin/News', '/api/public/news', '/API/PUBLIC/NEWS', '/api/forms/valuation', '/API/FORMS/VALUATION']) untouched(p)
  })

  test('archivos estáticos y recursos de la aplicación', () => {
    for (const p of ['/robots.txt', '/ROBOTS.TXT', '/sitemap.xml', '/SITEMAP.XML', '/images/branding/logo-ico.ico', '/IMAGES/branding/logo-ico.ico',
      '/documents/Politica.pdf', '/Documents/Politica.pdf', '/_nuxt/Entry.AbC123.js', '/_NUXT/entry.js', '/__nuxt_island/Comp_Hash.json', '/favicon.ico', '/Favicon.ico',
      '/Financiacion.png', '/NOTICIAS.html', '/noticias.JSON']) untouched(p)
  })

  test('PRP (desactivado) sigue su camino: no se redirige y por tanto sigue en 404', () => {
    for (const p of ['/prp', '/PRP', '/Prp/Abc', '/PRP/abc']) untouched(p)
  })

  test('rutas inexistentes: se dejan pasar (404), con o sin mayúsculas', () => {
    for (const p of ['/inexistente', '/INEXISTENTE', '/Inexistente/Otra', '/noticiass', '/NOTICIASS', '/Simuladorx', '/blog', '/BLOG/x', '/administracion', '/Administracion']) untouched(p)
  })

  test('formas raras de la ruta no se interpretan: la raíz, barras dobles, codificación y valores no textuales', () => {
    for (const p of ['/', '', '//Noticias', '//NOTICIAS/x', '/%4Eoticias', '/Noticias%2F', '/NOTICIAS%00', 'NOTICIAS', 'http://evil.example/NOTICIAS', '/\\NOTICIAS']) untouched(p)
    assert.equal(rule.canonicalPublicUrl(undefined), null)
    assert.equal(rule.canonicalPublicUrl(null), null)
    assert.equal(rule.canonicalPublicUrl(42), null)
  })

  test('métodos: las páginas públicas solo se redirigen con GET y HEAD (sus formas en minúsculas atienden los demás métodos igual)', () => {
    for (const m of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) { untouched('/NOTICIAS', m); untouched('/Procedimientos/Mi-Slug', m) }
    assert.deepEqual(run('/NOTICIAS', 'GET'), { code: 301, location: '/noticias' })
    assert.deepEqual(run('/NOTICIAS', 'HEAD'), { code: 301, location: '/noticias' })
    assert.deepEqual(run('/SIMULADOR', 'GET'), { code: 301, location: '/financiacion' })
    assert.deepEqual(run('/SIMULADOR', 'HEAD'), { code: 301, location: '/financiacion' })
  })

  test('el antiguo simulador con otro método: mismo destino que su regla de Nitro, pero 308 (conserva método y cuerpo; un 301 convertiría el POST en GET)', () => {
    for (const m of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) assert.deepEqual(run('/SIMULADOR?x=1', m), { code: 308, location: '/financiacion?x=1' }, m)
    for (const m of ['GET', 'HEAD']) assert.deepEqual(run('/SIMULADOR?x=1', m), { code: 301, location: '/financiacion?x=1' }, m)
  })

  test('solo la ruta exacta del antiguo simulador: subrutas, parecidos y claves heredadas del objeto no se redirigen', () => {
    for (const p of ['/SIMULADOR/x', '/Simuladorx', '/Constructor', '/__PROTO__', '/ToString', '/HasOwnProperty']) untouched(p)
  })
})

describe('sin bucles y sin redirecciones abiertas', () => {
  const SAMPLES = ['/SIMULADOR', '/Simulador/?a=B', '/NOTICIAS/Mi-Nota?x=A', '/Recomendaciones/Cuidados/Guia', '/TESTIMONIOS/ANTES-Y-DESPUES', '/FINANCIACION?utm=B']

  test('el destino es idempotente: aplicar la regla al destino no vuelve a redirigir (como mucho una redirección)', () => {
    for (const p of SAMPLES) {
      const first = rule.canonicalPublicUrl(p)
      assert.ok(first, p)
      assert.equal(rule.canonicalPublicUrl(first), null, `${p} → ${first}`)
    }
  })

  test('el destino siempre es una ruta relativa del mismo sitio (nunca un host ni «//»)', () => {
    const urls = [...SAMPLES, '/NOTICIAS/%2F%2Fevil.example', '/Noticias/https://evil.example', '/NOTICIAS?next=//evil.example']
    for (const p of urls) {
      const dest = rule.canonicalPublicUrl(p)
      assert.ok(dest.startsWith('/') && !dest.startsWith('//'), `${p} → ${dest}`)
      assert.doesNotMatch(dest.split('?')[0], /^\/[a-z]+:\/\//)
    }
  })

  test('solo cambian las mayúsculas de los segmentos estáticos: el destino, en minúsculas, coincide con el origen', () => {
    for (const p of SAMPLES.filter(x => !/simulador/i.test(x))) { // el antiguo simulador cambia de destino (a /financiacion), no solo de mayúsculas
      const dest = rule.canonicalPublicUrl(p)
      assert.equal(dest.toLowerCase(), p.toLowerCase(), p)
    }
  })

  test('la minúscula es solo ASCII (el signo Kelvin U+212A no se convierte en «k»)', () => {
    assert.equal(rule.canonicalPublicUrl('/NOTICIAS/K'), '/noticias/K')
    assert.equal(rule.canonicalPublicUrl('/Koticias'), null)
  })
})

describe('la lista de páginas públicas sigue a pages/ (no se desactualiza)', () => {
  const walk = (d, out = []) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n)
      statSync(p).isDirectory() ? walk(p, out) : out.push(p)
    }
    return out
  }
  // Prefijos estáticos de cada página: cada segmento fijo (sin corchetes) hasta el primer parámetro.
  const pagePrefixes = () => {
    const found = new Set()
    for (const file of walk(join(ROOT, 'pages')).filter(f => f.endsWith('.vue'))) {
      const segs = relative(join(ROOT, 'pages'), file).replace(/\.vue$/, '').split(sep).filter(s => s !== 'index')
      if (segs[0] === 'admin') continue
      let prefix = ''
      for (const s of segs) {
        if (s.startsWith('[')) break
        prefix += `/${s}`
        found.add(prefix)
      }
    }
    return found
  }

  test('todo segmento estático de pages/ (salvo /admin y /prp) está en la lista', () => {
    for (const prefix of pagePrefixes()) {
      if (prefix === '/prp' || prefix.startsWith('/prp/')) continue
      assert.ok(rule.PUBLIC_STATIC_ROUTES.has(prefix), `falta ${prefix} en PUBLIC_STATIC_ROUTES`)
    }
  })

  test('la lista solo contiene páginas que existen y nada de admin, api, prp ni archivos', () => {
    const real = pagePrefixes()
    for (const route of rule.PUBLIC_STATIC_ROUTES) {
      assert.ok(real.has(route), `${route} no existe en pages/`)
      assert.doesNotMatch(route, /^\/(admin|api|prp|_nuxt)(\/|$)/)
      assert.doesNotMatch(route, /[A-Z.]/)
    }
    // la redirección del antiguo simulador (REDIRECT_ONLY) apunta al mismo destino final que su regla de Nitro en nuxt.config.ts
    assert.match(read('nuxt.config.ts'), /'\/simulador': \{ redirect: \{ to: '\/financiacion', statusCode: 301 \} \}/)
    assert.equal(rule.canonicalPublicUrl('/SIMULADOR'), '/financiacion')
    assert.ok(!rule.PUBLIC_STATIC_ROUTES.has('/simulador'), 'no es una página')
  })

  test('el middleware se limita a la regla compartida y a GET/HEAD (sin lógica propia de normalización)', () => {
    const src = read('server/middleware/canonical-path-case.ts')
    assert.match(src, /canonicalPublicUrl\(event\.path, event\.method\)/)
    assert.match(src, /sendRedirect\(event, target, event\.method === 'GET' \|\| event\.method === 'HEAD' \? 301 : 308\)/)
    assert.doesNotMatch(src, /toLowerCase/)
  })
})

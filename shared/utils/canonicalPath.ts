// Mayúsculas en las rutas PÚBLICAS: el router de Nuxt no distingue mayúsculas (`/FINANCIACION` muestra la misma página), pero las reglas de ruta
// de Nitro (`routeRules`) sí. Resultado: la ruta antigua del simulador redirige a /financiacion, mientras que `/SIMULADOR` no encuentra la regla, cae en la ruta
// «de relleno» que Nuxt registra en el router para esa redirección y responde 200 con un cascarón vacío. Mismo contenido en varias URL.
//
// Estrategia: una redirección 301 a la forma canónica (minúsculas) SOLO para las páginas públicas conocidas. Módulo PURO (sin imports): lo usa el
// middleware de Nitro (server/middleware/canonical-path-case.ts) y las pruebas.
//
// Qué se pasa a minúsculas y qué no:
//  - SOLO los segmentos ESTÁTICOS de las páginas públicas listados abajo (`/Noticias`, `/Recomendaciones/Cuidados`...).
//  - Los segmentos DINÁMICOS (slug, tema, subtema) se conservan tal cual: su mayúscula es dato de Hub, no de la aplicación.
//  - La barra final y la cadena de consulta se conservan: la URL canónica se comporta igual que su equivalente en minúsculas.
//  - Todo lo que no esté en la lista queda intacto: `/admin/**` (lo protege su propia guarda, middleware/admin-auth.global.ts), `/api/**`,
//    `/_nuxt/**`, archivos estáticos (`/robots.txt`, `/images/...`), `/prp/**` (funcionalidad desactivada: sigue respondiendo 404) y las
//    rutas inexistentes (siguen en 404).
// Como solo se escribe en minúsculas y la forma canónica ya no contiene mayúsculas en esos segmentos, no puede haber bucles.

/** Prefijos de rutas estáticas de las páginas públicas (pages/, sin /admin ni /prp). Una prueba las compara con el directorio pages/. */
export const PUBLIC_STATIC_ROUTES: ReadonlySet<string> = new Set([
  '/clinicas-aliadas',
  '/estudio-de-creditos',
  '/financiacion',
  '/informacion-precontractual',
  '/nosotros',
  '/noticias',
  '/politica-datos-personales',
  '/procedimientos',
  '/quienes-somos',
  '/recomendaciones',
  '/recomendaciones/cuidados',
  '/recomendaciones/revision',
  '/recursos',
  '/servicios',
  '/testimonios',
  '/testimonios/antes-y-despues',
  '/testimonios/programa-de-referidos'
])

/**
 * Segmentos que NO son página sino una redirección de `routeRules` (nuxt.config.ts), con su destino FINAL. Se guardan sin barra inicial a propósito:
 * así este módulo no contiene ningún enlace literal a la ruta antigua y la prueba «ningún enlace interno apunta ya a ella» (tests/about/pages.test.ts)
 * sigue vigilando todos los archivos. La regla de Nitro responde a CUALQUIER método, por eso estas variantes también se redirigen con cualquiera.
 */
const REDIRECT_ONLY: Readonly<Record<string, string>> = { simulador: '/financiacion' }

// Solo ASCII: `toLowerCase()` convertiría también caracteres como el signo Kelvin (U+212A) en una «k» ASCII.
const asciiLower = (s: string) => s.replace(/[A-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + 32))

/**
 * URL canónica (ruta + consulta, relativa) de una petición a una página pública con mayúsculas en un segmento estático, o `null` si no hay
 * nada que redirigir. `url` es la ruta cruda de la petición, con la cadena de consulta si la trae (`/SIMULADOR?origen=web`).
 */
export function canonicalPublicUrl(url: string, method = 'GET'): string | null {
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) return null
  const q = url.indexOf('?')
  const path = q === -1 ? url : url.slice(0, q)
  const query = q === -1 ? '' : url.slice(q)
  if (!/[A-Z]/.test(path)) return null

  // Variante con mayúsculas de una ruta que solo existe como redirección: directo al destino final (sin salto intermedio por la forma en minúsculas),
  // con la consulta intacta. Solo la ruta exacta (con o sin barra final), igual que la regla de Nitro. La forma en minúsculas la sigue atendiendo Nitro.
  const exact = /^\/([^/]+)\/?$/.exec(path)
  const seg = exact ? asciiLower(exact[1]!) : ''
  if (exact && Object.hasOwn(REDIRECT_ONLY, seg)) return REDIRECT_ONLY[seg]! + query

  // El resto de páginas públicas: solo GET y HEAD (sus formas en minúsculas atienden los demás métodos igual que las variantes).
  if (method !== 'GET' && method !== 'HEAD') return null

  const segments = path.split('/')
  let prefix = ''
  let changed = false
  for (let i = 1; i < segments.length; i++) {
    const lower = asciiLower(segments[i]!)
    const candidate = `${prefix}/${lower}`
    if (!PUBLIC_STATIC_ROUTES.has(candidate)) break // a partir de aquí son parámetros dinámicos (o una ruta que no es pública): no se tocan
    if (lower !== segments[i]) { segments[i] = lower; changed = true }
    prefix = candidate
  }
  return changed ? segments.join('/') + query : null
}

import { useHead, useRoute, useSiteConfig } from '#imports'

/**
 * Enlace canónico de la página actual: origen público del sitio (`site.url` / NUXT_PUBLIC_SITE_URL) + RUTA de la petición, sin barra final.
 * Usa `route.path`, que NO incluye la cadena de consulta ni el fragmento: `?utm_source=…`, `?fbclid=…` o `?page=2` nunca llegan al canonical.
 * (Las variantes con mayúsculas ya se redirigen antes con 301: server/middleware/canonical-path-case.ts.)
 */
export function useCanonicalUrl() {
  const origin = String(useSiteConfig().url ?? '').replace(/\/+$/, '')
  const path = useRoute().path.replace(/\/+$/, '')
  useHead({ link: [{ rel: 'canonical', href: `${origin}${path || '/'}` }] })
}

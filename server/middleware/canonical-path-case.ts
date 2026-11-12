// Redirige con 301 las páginas públicas pedidas con mayúsculas a su forma en minúsculas (p. ej. /SIMULADOR hacia su forma en minúsculas). Ver shared/utils/canonicalPath.ts:
// qué se normaliza, qué no (admin, API, archivos estáticos, parámetros dinámicos, PRP) y por qué no hay bucles.
// GET y HEAD (la redirección del antiguo simulador, igual que su regla de Nitro, con cualquier método; ver abajo el código). El destino es relativo (sin host): detrás de un proxy no depende de la cabecera Host. Conserva la cadena de consulta.
import { canonicalPublicUrl } from '#shared/utils/canonicalPath'

export default defineEventHandler((event) => {
  const target = canonicalPublicUrl(event.path, event.method)
  // 301 para GET/HEAD. Con otro método, 308: conserva método y cuerpo (un 301 convertiría un POST en GET y perdería el cuerpo en navegadores y clientes).
  if (target) return sendRedirect(event, target, event.method === 'GET' || event.method === 'HEAD' ? 301 : 308)
})

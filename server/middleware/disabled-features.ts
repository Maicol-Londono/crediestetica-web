// Bloquea en el servidor las rutas de API de las funcionalidades desactivadas (Noticias y PRP público). Ver shared/utils/features.ts.
// Responde 404 como si la ruta no existiera: no consulta a Hub ni al CRM. El código de los endpoints se conserva sin cambios.
import { isDisabledApiPath } from '#shared/utils/features'

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/')) return
  if (isDisabledApiPath(path)) throw createError({ statusCode: 404, message: 'No encontrado' })
})

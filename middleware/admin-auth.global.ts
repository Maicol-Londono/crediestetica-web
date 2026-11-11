import { defineNuxtRouteMiddleware, navigateTo, useRequestFetch, useResponseHeader, createError } from '#imports'
import { authService } from '~/services/AuthService'

export default defineNuxtRouteMiddleware(async (to, from) => {
  // Solo protege /admin. El router de Nuxt NO distingue mayúsculas (/Admin/noticias es la misma página), así que TODA comprobación se hace
  // sobre la ruta normalizada (shared/utils/adminPasswordGate.ts): comparar `to.path` tal cual dejaba pasar las variantes sin autenticación.
  if (!isAdminPath(to.path)) {
    return
  }
  const path = normalizeAdminPath(to.path)

  // Las reglas de ruta (X-Robots-Tag en /admin/**) distinguen mayúsculas y no alcanzan a las variantes: el panel nunca se indexa.
  if (import.meta.server) useResponseHeader('X-Robots-Tag').value = 'noindex, nofollow'

  // Ensure session is loaded (especially important on SSR and first load)
  await authService.loadUserSession()
  
  // Sesión, login y cambio obligatorio de contraseña: mientras haya una contraseña temporal sin cambiar, solo se permite
  // /admin/cambiar-contrasena (el servidor bloquea además todas las rutas /api/admin/**). Reglas en shared/utils/adminPasswordGate.ts.
  const redirect = adminGateRedirect(to.path, authService.getUser().value)
  if (redirect) return navigateTo(redirect)

  if (path === ADMIN_LOGIN_PATH) return

  // Nosotros / Clínicas / páginas: solo perfiles editores de contenido. La UI solo lo refleja; el servidor lo impone en cada escritura (403).
  if (path.startsWith('/admin/nosotros') || path.startsWith('/admin/paginas')) {
    if (authService.getUser().value?.canEditContent !== true) {
      throw createError({ statusCode: 403, statusMessage: 'No tienes permiso para editar este contenido.', fatal: true })
    }
  }

  // Configuración: solo el líder de la línea. El servidor decide (403); la UI solo lo refleja.
  if (path.startsWith('/admin/configuracion')) {
    try {
      await useRequestFetch()('/api/admin/config/access')
    } catch (e: any) {
      if ((e?.statusCode ?? e?.response?.status) === 401) return navigateTo('/admin/login')
      throw createError({ statusCode: 403, statusMessage: 'Solo el líder de la línea puede acceder a la configuración.', fatal: true })
    }
  }
})
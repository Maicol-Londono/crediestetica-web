// Reglas de navegación del panel (/admin/**) según sesión y cambio obligatorio de contraseña. Función pura: la usa el middleware de rutas y
// se prueba sin Nuxt. La seguridad real la imponen el servidor (server/middleware/admin-password-change.ts) y Hub; esto solo guía la interfaz.
export const ADMIN_LOGIN_PATH = '/admin/login'
export const ADMIN_HOME_PATH = '/admin'
export const ADMIN_CHANGE_PASSWORD_PATH = '/admin/cambiar-contrasena'

/**
 * Ruta normalizada para COMPARAR (no para navegar): minúsculas, sin barras repetidas y sin barra final. El router de Nuxt no distingue
 * mayúsculas (`/Admin/noticias` llega a la misma página que `/admin/noticias`), así que toda comprobación sobre rutas del panel debe hacerse
 * con esta forma: una comparación sensible a mayúsculas dejaría pasar las variantes sin autenticación.
 */
export function normalizeAdminPath(path: string): string {
  const p = path.toLowerCase().replace(/\/{2,}/g, '/')
  return p.length > 1 ? p.replace(/\/+$/, '') : p
}

/** ¿Es `/admin` o una ruta anidada del panel (en cualquier combinación de mayúsculas)? */
export function isAdminPanelPath(path: string): boolean {
  const p = normalizeAdminPath(path)
  return p === ADMIN_HOME_PATH || p.startsWith(`${ADMIN_HOME_PATH}/`)
}

/** Ruta a la que hay que redirigir, o null si se puede continuar. */
export function adminGateRedirect(path: string, user: { mustChangePassword?: boolean } | null | undefined): string | null {
  if (!isAdminPanelPath(path)) return null
  const p = normalizeAdminPath(path)

  if (p === ADMIN_LOGIN_PATH) {
    if (!user) return null
    return user.mustChangePassword === true ? ADMIN_CHANGE_PASSWORD_PATH : ADMIN_HOME_PATH
  }
  if (!user) return ADMIN_LOGIN_PATH
  if (user.mustChangePassword === true) return p === ADMIN_CHANGE_PASSWORD_PATH ? null : ADMIN_CHANGE_PASSWORD_PATH
  return p === ADMIN_CHANGE_PASSWORD_PATH ? ADMIN_HOME_PATH : null
}

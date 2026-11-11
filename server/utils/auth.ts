import type { H3Event } from 'h3'
import type { WellezyUser } from './wellezy'
import { wellezyMe } from './wellezy'

export interface PublicAdminUser {
  id: number
  name: string
  email: string
  role: { id: number, name: string }
  isAreaLeader: boolean
  /** Puede ver y modificar la tasa de interés del simulador (líder o rol de diseño configurado). Solo informativo para la UI. */
  canEditRate: boolean
  /** Capacidades de micrositios (permisos prp_referrers.* de Hub). Solo informativas para la UI; Hub las impone en cada llamada. */
  canCreatePrp: boolean
  canEditPrp: boolean
  canDeletePrp: boolean
  /** Visibilidad de módulos en menú y dashboard (permisos `*.ver` de Hub; el superadmin global los tiene todos). Solo informativa: Hub impone cada llamada. */
  canViewProcedures: boolean
  canViewNews: boolean
  canViewPatients: boolean
  canViewRecommendations: boolean
  canViewMicrosites: boolean
  /** Mismo permiso que canCreatePrp (`prp_referrers.crear`): botón «Nuevo micrositio». No implica editar ni eliminar. */
  canCreateMicrosites: boolean
  /** Acceso a Configuración: líder de área o rol que administra la tasa. */
  canAccessConfiguration: boolean
  /** Puede escribir el contenido local (Nosotros, Clínicas aliadas, páginas informativas). Solo informativo para la UI. */
  canEditContent: boolean
  /** Contraseña temporal sin cambiar: el panel solo permite la pantalla de cambio obligatorio. La impone el servidor (middleware) y Hub (403). */
  mustChangePassword: boolean
}

interface AdminSessionData {
  token?: string
  user?: PublicAdminUser
}

const SESSION_MAX_AGE = 60 * 60 * 8

function sessionOptions(event: H3Event) {
  const password = String(useRuntimeConfig(event).sessionPassword || '')
  if (password.length < 32) {
    console.error('[auth] NUXT_SESSION_PASSWORD no está configurada (mínimo 32 caracteres).')
    throw createError({ statusCode: 503, message: 'No fue posible conectar con el servicio de autenticación. Intenta nuevamente.' })
  }
  return {
    name: 'crediestetica-admin',
    password,
    maxAge: SESSION_MAX_AGE,
    cookie: {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: !import.meta.dev,
      path: '/'
    }
  }
}

export function useAdminSession(event: H3Event) {
  return useSession<AdminSessionData>(event, sessionOptions(event))
}

// IDs de rol autorizados para el CMS (configuración de runtime NUXT_ADMIN_ROLE_IDS, p. ej. "19" o "19,25").
export function allowedRoleIds(event: H3Event): number[] {
  return String(useRuntimeConfig(event).adminRoleIds ?? '')
    .split(',')
    .map(s => Number(s.trim()))
    .filter(n => Number.isSafeInteger(n) && n > 0)
}

// Política ÚNICA de acceso al panel (la usan login, /auth/me y los helpers que revalidan contra Hub). Coincide con Wellezy Hub
// (ApiAccessService::validateAccess):
//  A. Superadmin global: `is_global_admin === true` (estricto), verificado por Hub (users.is_superadmin). Único acceso sin pertenecer a la
//     empresa y línea configuradas.
//  B. Todos los demás usuarios —con cualquier rol, incluido `admin`—: deben pertenecer a la empresa y línea configuradas. La pertenencia se compara
//     con company.slug / line.slug que devuelve Hub (contexto del token) contra NUXT_WELLEZY_COMPANY_SLUG / NUXT_WELLEZY_LINE_SLUG; nunca con
//     datos del navegador. Si falta algún dato, se deniega.
// El rol `admin` NO concede acceso global y NUXT_ADMIN_ROLE_IDS NO interviene en el acceso. Entrar al panel no implica permiso para cada
// operación (ver los helpers siguientes y los permisos de Hub).
function belongsToConfiguredLine(event: H3Event, user: WellezyUser): boolean {
  const config = useRuntimeConfig(event)
  const company = String(config.wellezyCompanySlug ?? '').trim().toLowerCase()
  const line = String(config.wellezyLineSlug ?? '').trim().toLowerCase()
  if (!company || !line) return false
  return user.company?.slug?.trim().toLowerCase() === company && user.line?.slug?.trim().toLowerCase() === line
}

export function isAuthorizedUser(event: H3Event, user: WellezyUser): boolean {
  if (user.is_global_admin === true) return true
  return belongsToConfiguredLine(event, user)
}

// Acceso al panel (isAuthorizedUser) NO implica permiso para cada operación: ver los helpers siguientes.

/** ¿El usuario tiene este permiso de Hub (lista `permissions` de /auth/me, ya verificada en servidor)? Sin lista => no. */
export function hasHubPermission(user: Pick<WellezyUser, 'permissions'>, permission: string): boolean {
  return Array.isArray(user.permissions) && user.permissions.includes(permission)
}

// Perfiles de Hub que pueden ESCRIBIR el contenido local de la web (Nosotros, Clínicas aliadas, páginas informativas), que no pasa por Hub:
// «Administrador de contenido de línea», «Diseñador gráfico», «admin» y superadmin (en Hub: «Superadmin»/«super_admin»). Se identifican por el
// rol principal que Hub devuelve en /auth/me (id o nombre), nunca por datos del navegador. Los ids opcionales se configuran en
// NUXT_CONTENT_EDITOR_ROLE_IDS (los ids difieren entre UAT y producción).
export const CONTENT_EDITOR_ROLE_NAMES = ['administrador de contenido de línea', 'diseñador gráfico', 'admin', 'superadmin', 'super_admin']

export function contentEditorRoleIds(event: H3Event): number[] {
  return String(useRuntimeConfig(event).contentEditorRoleIds ?? '')
    .split(',')
    .map(s => Number(s.trim()))
    .filter(n => Number.isSafeInteger(n) && n > 0)
}

export function canEditLocalContent(event: H3Event | undefined, user: WellezyUser): boolean {
  // Superadmin global verificado por Hub: puede escribir el contenido local (política de contenido: «Superadmin»).
  if (user.is_global_admin === true) return true
  if (!user.role) return false
  if (event && !isAuthorizedUser(event, user)) return false
  const name = String(user.role.name ?? '').trim().toLowerCase()
  return CONTENT_EDITOR_ROLE_NAMES.includes(name) || (!!event && contentEditorRoleIds(event).includes(Number(user.role.id)))
}

// Permiso de Hub para la UI: Hub da por concedido todo al superadmin global (User::hasPermission), así que aquí también.
function canHub(user: WellezyUser, permission: string): boolean {
  return user.is_global_admin === true || hasHubPermission(user, permission)
}

// Solo los datos públicos mínimos: nunca el token ni la lista de permisos (solo banderas derivadas).
export function toPublicUser(user: WellezyUser, event?: H3Event): PublicAdminUser {
  const isAreaLeader = user.is_area_leader === true
  const canEditRate = event ? canManageFinancingRate(event, user) : isAreaLeader
  const canCreatePrp = hasHubPermission(user, 'prp_referrers.crear')
  return {
    id: Number(user.id),
    name: user.name,
    email: user.email,
    // Sin rol principal: el superadmin global (contexto virtual de Hub) se muestra como Superadmin; un usuario de la línea sin rol, como «Sin rol».
    role: user.role ? { id: Number(user.role.id), name: user.role.name } : { id: 0, name: user.is_global_admin === true ? 'Superadmin' : 'Sin rol' },
    isAreaLeader,
    canEditRate,
    canCreatePrp,
    canEditPrp: hasHubPermission(user, 'prp_referrers.editar'),
    canDeletePrp: hasHubPermission(user, 'prp_referrers.eliminar'),
    canViewProcedures: canHub(user, 'cirugias.ver'),
    canViewNews: canHub(user, 'blog.ver'),
    canViewPatients: canHub(user, 'pacientes_web.ver'),
    canViewRecommendations: canHub(user, 'recomendaciones.ver'),
    canViewMicrosites: canHub(user, 'prp_referrers.ver'),
    canCreateMicrosites: canCreatePrp,
    canAccessConfiguration: isAreaLeader || canEditRate,
    canEditContent: canEditLocalContent(event, user),
    mustChangePassword: user.must_change_password === true
  }
}

// Autoridad de servidor para la sección Configuración: solo el líder de la línea
// (personnels.is_area_leader = true en Wellezy Hub), que NO es lo mismo que ser administrador del CMS.
// Se consulta Hub en cada llamada (no se confía en el valor cacheado en la cookie de sesión).
export async function requireAreaLeader(event: H3Event): Promise<WellezyUser> {
  const session = await useAdminSession(event)
  const token = session.data.token
  if (!token) throw authError(401, 'No autenticado')

  const res = await wellezyMe(event, token)
  if (res.status === 401) {
    await session.clear()
    throw authError(401, 'No autenticado')
  }
  if (res.status !== 200) throw authError(503, MSG_UNAVAILABLE)

  const user = res.data!.user
  if (!isAuthorizedUser(event, user) || user.is_area_leader !== true) throw authError(403, MSG_LEADER_ONLY)
  return user
}

export interface ConfigAccess { ok: true, canManageLine: boolean, canManageRate: boolean }

// Acceso a la pantalla Configuración: líder de la línea (colaboradores + tasa) o rol con permiso sobre la tasa (solo la tasa).
// Se consulta Hub en cada llamada. 401 sin sesión · 403 sin ninguna de las dos · 503 si Hub no responde.
export async function resolveConfigAccess(event: H3Event): Promise<ConfigAccess> {
  const session = await useAdminSession(event)
  const token = session.data.token
  if (!token) throw authError(401, 'No autenticado')

  const res = await wellezyMe(event, token)
  if (res.status === 401) {
    await session.clear()
    throw authError(401, 'No autenticado')
  }
  if (res.status !== 200) throw authError(503, MSG_UNAVAILABLE)

  const user = res.data!.user
  const canManageLine = isAuthorizedUser(event, user) && user.is_area_leader === true
  const canManageRate = canManageFinancingRate(event, user)
  if (!canManageLine && !canManageRate) throw authError(403, MSG_CONFIG_FORBIDDEN)
  return { ok: true, canManageLine, canManageRate }
}

export const MSG_CONFIG_FORBIDDEN = 'No tienes acceso a la configuración.'
export const MSG_UNAVAILABLE = 'No fue posible conectar con el servicio de autenticación. Intenta nuevamente.'
export const MSG_LEADER_ONLY = 'Solo el líder de la línea puede acceder a la configuración.'
export const MSG_CONTENT_FORBIDDEN = 'No tienes permiso para editar este contenido.'
export const MSG_FORBIDDEN = 'No tienes acceso al panel administrativo de Crediestética.'

export function authError(statusCode: number, message: string) {
  return createError({ statusCode, message, data: { message } })
}

// assertSameOrigin vive en server/utils/origin.ts (auto-import de Nitro).

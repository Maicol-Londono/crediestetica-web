import type { H3Event } from 'h3'
import { mkdir, readFile, rename, writeFile, copyFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { parseFinancingRate } from '#shared/utils/financing'

// Tasa de interés mensual del simulador. Persistencia LOCAL (no usa Wellezy Hub): `<NUXT_CONTENT_DIR>/financing-rate.json`, el mismo
// directorio persistente y fuera de `.output/` que usan «Nosotros» y «Clínicas aliadas». Helpers de Nitro (createError, authError,
// aboutContentDir, adminSession, wellezyMe, isAuthorizedUser, …) son auto-imports.
//
// - SIN valor de arranque: si el archivo NO existe, la tasa está «no configurada». No se crea ningún archivo ni se usa un valor por defecto:
//   el público recibe 503 `rate_not_configured` (el simulador muestra «no disponible») y el panel permite configurar la primera tasa real.
// - Archivo ilegible, dañado o con un valor inválido => error explícito (503 `rate_unavailable`); NO se reemplaza por el 2 %.
// - Escritura atómica (temporal + rename) con respaldo `.prev`, exclusión mutua dentro del proceso y control de edición concurrente por `updatedAt`.

const FILE = 'financing-rate.json'
const BACKUP = 'financing-rate.prev.json'
export const FINANCING_RATE_HISTORY_MAX = 500
export const MSG_RATE_NOT_CONFIGURED = 'La tasa de financiación aún no está configurada.'
export const MSG_RATE_UNAVAILABLE = 'La tasa de financiación no está disponible en este momento. Intenta nuevamente más tarde.'
export const MSG_RATE_FORBIDDEN = 'No tienes permiso para consultar o modificar la tasa de financiación.'

export interface FinancingRateActor { id: number | null, name: string }
export interface FinancingRateEntry { rate: string, updatedAt: string, updatedBy: FinancingRateActor, source: 'initial' | 'admin' }
export interface FinancingRateRecord extends FinancingRateEntry { version: 1, history: FinancingRateEntry[] }

function unavailable(): never {
  throw createError({ statusCode: 503, message: MSG_RATE_UNAVAILABLE, data: { message: MSG_RATE_UNAVAILABLE, code: 'rate_unavailable' } })
}

function rateFile(event: H3Event) { return join(aboutContentDir(event), FILE) }

// Comprobación pura (no es un type guard): un guard sobre el documento completo lo estrecharía a FinancingRateEntry y ocultaría `history`.
function isEntry(e: any): boolean {
  if (!e || typeof e !== 'object' || typeof e.updatedAt !== 'string' || Number.isNaN(Date.parse(e.updatedAt))) return false
  if (e.source !== 'initial' && e.source !== 'admin') return false
  if (!e.updatedBy || typeof e.updatedBy.name !== 'string' || !(e.updatedBy.id === null || Number.isSafeInteger(e.updatedBy.id))) return false
  const p = parseFinancingRate(e.rate)
  return typeof e.rate === 'string' && p.ok && p.text === e.rate
}

/** Valida el JSON guardado. Cualquier incoherencia => null (el llamador responde con error explícito). */
export function parseStoredFinancingRate(raw: string): FinancingRateRecord | null {
  let data: any
  try { data = JSON.parse(raw) } catch { return null }
  if (!data || data.version !== 1 || !isEntry(data) || !Array.isArray(data.history) || !data.history.every(isEntry)) return null
  return data as FinancingRateRecord
}

/** Lee el archivo. `null` = no existe (tasa no configurada). Ilegible/dañado => 503 explícito. */
async function readExisting(event: H3Event): Promise<FinancingRateRecord | null> {
  let raw: string
  try {
    raw = await readFile(rateFile(event), 'utf8')
  } catch (error: any) {
    if (error?.code === 'ENOENT') return null
    console.error('[financing-rate] No se pudo leer la tasa:', error?.code ?? 'error')
    return unavailable()
  }
  const record = parseStoredFinancingRate(raw)
  if (!record) {
    console.error(`[financing-rate] ${FILE} está dañado o contiene un valor inválido. Revisa ${BACKUP} antes de guardar.`)
    return unavailable()
  }
  return record
}

/** Tasa vigente persistida, o `null` si aún no se configuró (nunca se inventa ni se crea una por defecto). */
export function readFinancingRateOrNull(event: H3Event): Promise<FinancingRateRecord | null> {
  return readExisting(event)
}

/** Tasa vigente para uso público: sin configurar => 503 `rate_not_configured`. */
export async function readFinancingRate(event: H3Event): Promise<FinancingRateRecord> {
  const record = await readExisting(event)
  if (!record) throw createError({ statusCode: 503, message: MSG_RATE_NOT_CONFIGURED, data: { message: MSG_RATE_NOT_CONFIGURED, code: 'rate_not_configured' } })
  return record
}

// Exclusión mutua dentro del proceso: comprobar `updatedAt` y escribir es una sola sección crítica.
let queue: Promise<unknown> = Promise.resolve()
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn)
  queue = run.catch(() => {})
  return run
}

/** Guarda una tasa nueva. `expectedUpdatedAt` es la versión que la persona vio al abrir el formulario; si cambió => 409. */
export function saveFinancingRate(event: H3Event, rate: string, expectedUpdatedAt: unknown, actor: FinancingRateActor): Promise<FinancingRateRecord> {
  return exclusive(async () => {
    const current = await readExisting(event)
    // Sin tasa configurada la versión esperada es «ninguna» (null/vacío); con tasa, debe coincidir con la vigente.
    const expected = current ? current.updatedAt : null
    const received = typeof expectedUpdatedAt === 'string' && expectedUpdatedAt !== '' ? expectedUpdatedAt : null
    if (received !== expected) {
      const message = 'Otra persona modificó la tasa mientras editabas. Recarga la página para ver el valor vigente antes de guardar.'
      throw createError({ statusCode: 409, message, data: { message, errors: {} } })
    }
    if (current && current.rate === rate) return current // sin cambios: no se agrega una entrada de historial
    // `updatedAt` es la versión que detecta ediciones concurrentes: debe ser ESTRICTAMENTE creciente (dos guardados en el mismo milisegundo,
    // o un reloj que retrocede, darían la misma versión y una edición con datos viejos pasaría sin conflicto).
    const updatedAt = new Date(Math.max(Date.now(), current ? Date.parse(current.updatedAt) + 1 : 0)).toISOString()
    const entry: FinancingRateEntry = { rate, updatedAt, updatedBy: actor, source: 'admin' }
    const next: FinancingRateRecord = { version: 1, ...entry, history: [entry, ...(current?.history ?? [])].slice(0, FINANCING_RATE_HISTORY_MAX) }
    const dir = aboutContentDir(event)
    const tmp = join(dir, `${FILE}.${randomBytes(6).toString('hex')}.tmp`)
    try {
      const target = rateFile(event)
      await mkdir(dir, { recursive: true })
      await copyFile(target, join(dir, BACKUP)).catch((e: any) => { if (e?.code !== 'ENOENT') throw e })
      await writeFile(tmp, JSON.stringify(next, null, 2), 'utf8')
      await rename(tmp, target)
    } catch (error: any) {
      console.error('[financing-rate] No se pudo guardar la tasa:', error?.code ?? 'error')
      throw createError({ statusCode: 500, message: 'No fue posible guardar la tasa en el servidor. Intenta nuevamente.' })
    } finally {
      // Tras un rename correcto el temporal ya no existe (ENOENT ignorado); tras cualquier fallo no queda un .tmp huérfano.
      await unlink(tmp).catch(() => {})
    }
    return next
  })
}

/** Cuerpo del formulario de administración. Lanza 422 con el error por campo; nunca corrige la entrada. */
export function parseFinancingRateBody(body: any): { rate: string, expectedUpdatedAt: unknown } {
  const fail = (message: string): never => {
    throw createError({ statusCode: 422, message, data: { message, errors: { rate: message } } })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('Revisa los datos ingresados.')
  const parsed = parseFinancingRate(body.rate)
  if (!parsed.ok) return fail(parsed.message)
  return { rate: parsed.text, expectedUpdatedAt: body.expectedUpdatedAt }
}

/** Vista pública: solo la tasa y la versión. Nunca quién la modificó. */
export function financingRatePublicView(record: FinancingRateRecord) {
  return { rate: record.rate, updatedAt: record.updatedAt }
}

/** Vista de administración: tasa vigente, responsable y los últimos cambios. Sin tasa => `configured: false` y campos vacíos. */
export function financingRateAdminView(record: FinancingRateRecord | null) {
  if (!record) return { configured: false as const, rate: '', updatedAt: '', updatedBy: null, source: null, history: [] as FinancingRateEntry[] }
  return { configured: true as const, rate: record.rate, updatedAt: record.updatedAt, updatedBy: record.updatedBy, source: record.source, history: record.history.slice(0, 20) }
}

// ── Autorización ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Pueden consultar y modificar la tasa: el superadmin global verificado por Hub, el líder de la línea y los roles listados en NUXT_RATE_EDITOR_ROLE_IDS.
// En ambos casos el usuario debe seguir autorizado para el CMS (pertenecer a la empresa y línea configuradas; NUXT_ADMIN_ROLE_IDS no interviene en el acceso). No se concede nada a otros roles ni
// se modifican los permisos de las demás secciones de Configuración (colaboradores: solo el líder).
export function rateEditorRoleIds(event: H3Event): number[] {
  return String(useRuntimeConfig(event).rateEditorRoleIds ?? '')
    .split(',')
    .map(s => Number(s.trim()))
    .filter(n => Number.isSafeInteger(n) && n > 0)
}

export function canManageFinancingRate(event: H3Event, user: { role?: { id: number | string } | null, is_area_leader?: boolean, is_global_admin?: boolean }): boolean {
  if (!isAuthorizedUser(event, user as any)) return false
  // Superadmin global verificado por Hub (`=== true`, estricto): vía de arranque para configurar la PRIMERA tasa cuando aún no hay líder de área
  // ni IDs de rol configurados. Es la misma autoridad que ya puede escribir el contenido local (auth.ts · canEditLocalContent). No amplía el acceso a
  // ningún otro perfil y no depende de IDs de rol inventados.
  if (user.is_global_admin === true) return true
  if (user.is_area_leader === true) return true
  return !!user.role && rateEditorRoleIds(event).includes(Number(user.role.id))
}

/** Origen + sesión + usuario vigente en Hub con permiso sobre la tasa. 401 sin sesión · 403 sin permiso · 503 si Hub no responde. */
export async function requireRateEditor(event: H3Event) {
  const { session, token } = await adminSession(event)
  const res = await wellezyMe(event, token)
  if (res.status === 401) {
    await session.clear()
    throw authError(401, 'No autenticado')
  }
  if (res.status === 403) throw authError(403, MSG_RATE_FORBIDDEN)
  if (res.status !== 200 || !res.data) throw authError(503, MSG_UNAVAILABLE)
  const user = res.data.user
  if (!canManageFinancingRate(event, user)) throw authError(403, MSG_RATE_FORBIDDEN)
  return user
}

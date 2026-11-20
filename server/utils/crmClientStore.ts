import { constants } from 'node:fs'
import { access, link, mkdir, readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { hostname } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { createHash, randomBytes } from 'node:crypto'

// Registro PERSISTENTE (idempotencia) del alta de clientes en el CRM Médico tras un pago de valoración aprobado: una ficha por pago (payment_uuid).
// Vive en `<NUXT_CONTENT_DIR>/crm-chat-clients/`. NUXT_CONTENT_DIR es OBLIGATORIO, ABSOLUTO y debe quedar fuera de la carpeta de la aplicación y de `.output/`
// (sin él NO se envía el alta: no hay ruta de respaldo). Solo guarda estado técnico (estado, intentos, fecha, HTTP, motivo): NUNCA datos personales ni secretos.
//
// Estados:
//  · processing → una petición está en curso (impide confirmaciones simultáneas). Si queda así más de CRM_PROCESSING_STALE_MS (el proceso murió a mitad), pasa a unknown.
//  · sent       → el CRM confirmó el alta con evidencia positiva. Nunca se reenvía.
//  · failed     → el CRM rechazó la petición o ni siquiera se pudo conectar. Solo se reintenta (en una confirmación posterior, nunca automática) si `retryable`
//                 es true, hasta CRM_MAX_ATTEMPTS. Si `retryable` es false (p. ej. 400, 401, 403, 422) hace falta corregir datos o configuración y conciliar a mano.
//  · unknown    → no se sabe si el CRM creó el registro (tiempo agotado, conexión restablecida, 5xx, redirección, respuesta ambigua, proceso interrumpido, ficha dañada).
//                 NUNCA se reenvía solo: requiere conciliación manual (ver listCrmPending).
//
// Exclusión mutua: cola en el proceso por clave + archivo `.lock` creado de forma exclusiva con contenido ya escrito (escritura a un temporal y `link`, atómico:
// nunca queda un lock vacío). El lock guarda token, pid y host. NO caduca por tiempo: solo se recupera si se DEMUESTRA huérfano (mismo host y pid inexistente),
// y la retirada la hace quien tiene la «compuerta» `.lock.take`, tras verificar de nuevo que el lock sigue siendo el observado. Ante cualquier duda (otro host, lock
// ilegible, pid vivo, compuerta atascada) NO se roba: se agota la espera (crm_lock_timeout) y no se envía. Limitaciones: un pid reutilizado por otro proceso mantiene
// el lock «vivo» (falla cerrado); no vale en sistemas de archivos de red ni con varias máquinas; exige que el sistema de archivos admita enlaces duros.

export type CrmState = 'processing' | 'sent' | 'failed' | 'unknown'
export interface CrmRecord { state: CrmState, attempts: number, updatedAt: number, httpStatus?: number, reason?: string, retryable?: boolean }
export type CrmClaim =
  | { ok: true, attempt: number }
  | { ok: false, reason: 'sent' | 'processing' | 'unknown' | 'failed_permanent' | 'exhausted' | 'store_error' | 'lock_timeout', detail?: string }
export type CrmStoreLocation = { ok: true, dir: string } | { ok: false, detail: 'not_configured' | 'not_absolute' | 'inside_app' }

export const CRM_MAX_ATTEMPTS = 3
export const CRM_PROCESSING_STALE_MS = 5 * 60_000
const LOCK_WAIT_MS = 2000
const LOCK_POLL_MS = 25
const TMP_MAX_AGE_MS = 10 * 60_000
const KEY_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const STATES = ['processing', 'sent', 'failed', 'unknown']

/** Ubicación del registro: exige NUXT_CONTENT_DIR absoluto, fuera de la carpeta de la aplicación (cwd) y de `.output`. Sin fallback. */
export function crmStoreDir(runtime: Record<string, any>, appDir: string = process.cwd()): CrmStoreLocation {
  const configured = String(runtime.contentDir || '').trim()
  if (!configured) return { ok: false, detail: 'not_configured' }
  if (!isAbsolute(configured)) return { ok: false, detail: 'not_absolute' }
  const base = resolve(configured)
  const rel = relative(resolve(appDir), base)
  const insideApp = rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
  if (insideApp || base.split(/[\\/]/).includes('.output')) return { ok: false, detail: 'inside_app' }
  return { ok: true, dir: join(base, 'crm-chat-clients') }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const lockPath = (dir: string, key: string) => join(dir, `${key}.lock`)
export { lockPath as crmLockPath }

// ── Archivos: creación exclusiva con contenido, lectura, atómicos ────────────────────────────────────────────────────────────────────
async function createExclusive(path: string, content: string): Promise<boolean> {
  const tmp = `${path}.${randomBytes(6).toString('hex')}.tmp`
  await writeFile(tmp, content, { mode: 0o600 })
  try {
    await link(tmp, path)
    return true
  } catch (error: any) {
    if (error?.code === 'EEXIST') return false
    throw error
  } finally {
    await unlink(tmp).catch(() => {})
  }
}

export interface LockInfo { token: string, pid: number, host: string, at: number }

/** null = no existe; 'invalid' = existe pero no se puede interpretar (no se puede demostrar que sea huérfano). */
export async function readLockInfo(path: string): Promise<LockInfo | null | 'invalid'> {
  let raw: string
  try {
    raw = await readFile(path, 'utf8')
  } catch (error: any) {
    if (error?.code === 'ENOENT') return null
    return 'invalid'
  }
  try {
    const i = JSON.parse(raw)
    if (typeof i?.token === 'string' && Number.isInteger(i?.pid) && typeof i?.host === 'string') return i as LockInfo
  } catch { /* ilegible */ }
  return 'invalid'
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error: any) {
    return error?.code !== 'ESRCH'
  }
}

const newInfo = (): LockInfo => ({ token: randomBytes(12).toString('hex'), pid: process.pid, host: hostname(), at: Date.now() })

async function releaseIfMine(path: string, token: string) {
  const info = await readLockInfo(path)
  if (info && info !== 'invalid' && info.token === token) await unlink(path).catch(() => {})
}

/**
 * Retira un lock observado SOLO si sigue siendo el mismo (mismo token), es de este host y su pid ya no existe. Solo quien obtiene la compuerta puede retirarlo,
 * y la compuerta nunca se roba. Devuelve true únicamente si se retiró.
 */
export async function takeoverOrphanLock(dir: string, key: string, observed: LockInfo): Promise<boolean> {
  const path = lockPath(dir, key)
  const gatePath = `${path}.take`
  const gate = newInfo()
  if (!(await createExclusive(gatePath, JSON.stringify(gate)))) return false
  try {
    const current = await readLockInfo(path)
    if (current && current !== 'invalid' && current.token === observed.token && current.host === hostname() && !pidAlive(current.pid)) {
      await unlink(path)
      return true
    }
    return false
  } finally {
    await releaseIfMine(gatePath, gate.token)
  }
}

const queues = new Map<string, Promise<unknown>>()

async function acquireLock(dir: string, key: string, waitMs: number): Promise<LockInfo> {
  const path = lockPath(dir, key)
  const mine = newInfo()
  const deadline = Date.now() + waitMs
  for (;;) {
    if (await createExclusive(path, JSON.stringify(mine))) return mine
    const seen = await readLockInfo(path)
    if (seen === null) continue
    if (seen !== 'invalid' && seen.host === hostname() && !pidAlive(seen.pid)) {
      if (await takeoverOrphanLock(dir, key, seen)) continue
    }
    if (Date.now() >= deadline) throw Object.assign(new Error('lock_timeout'), { code: 'lock_timeout' })
    await sleep(LOCK_POLL_MS)
  }
}

/** Exclusión mutua: cola en proceso por clave + lock de archivo entre procesos. La sección crítica es corta (nunca incluye la petición HTTP). */
export async function withCrmLock<T>(dir: string, key: string, fn: () => Promise<T>, waitMs = LOCK_WAIT_MS): Promise<T> {
  const qk = `${dir}|${key}`
  const previous = queues.get(qk) ?? Promise.resolve()
  const run = previous.catch(() => {}).then(async () => {
    const mine = await acquireLock(dir, key, waitMs)
    try {
      return await fn()
    } finally {
      await releaseIfMine(lockPath(dir, key), mine.token)
    }
  })
  queues.set(qk, run)
  const clear = () => { if (queues.get(qk) === run) queues.delete(qk) }
  void run.then(clear, clear)
  return run
}

// ── Fichas ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const checksum = (key: string, r: CrmRecord) =>
  createHash('sha256').update(JSON.stringify([1, key, r.state, r.attempts, r.updatedAt, r.httpStatus ?? null, r.reason ?? null, r.retryable ?? null])).digest('hex')

/** La suma detecta truncados y daños accidentales (no es una firma: sin secreto no protege contra manipulación deliberada). */
async function readRecord(dir: string, key: string): Promise<CrmRecord | null> {
  let raw: string
  try {
    raw = await readFile(join(dir, `${key}.json`), 'utf8')
  } catch (error: any) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
  try {
    const r = JSON.parse(raw)
    if (r?.v === 1 && r.key === key && STATES.includes(r.state) && Number.isInteger(r.attempts) && Number.isFinite(r.updatedAt)) {
      const rec: CrmRecord = { state: r.state, attempts: r.attempts, updatedAt: r.updatedAt, ...(r.httpStatus != null ? { httpStatus: r.httpStatus } : {}), ...(r.reason != null ? { reason: r.reason } : {}), ...(r.retryable != null ? { retryable: r.retryable } : {}) }
      if (r.sum === checksum(key, rec)) return rec
    }
  } catch { /* ficha ilegible */ }
  // Ficha dañada: no se sabe qué pasó, así que no se reenvía.
  return { state: 'unknown', attempts: 0, updatedAt: Date.now(), reason: 'corrupt_record' }
}

async function writeRecord(dir: string, key: string, record: CrmRecord): Promise<void> {
  const tmp = join(dir, `${key}.${randomBytes(6).toString('hex')}.tmp`)
  try {
    await writeFile(tmp, JSON.stringify({ v: 1, key, ...record, sum: checksum(key, record) }), { mode: 0o600 })
    await rename(tmp, join(dir, `${key}.json`))
  } catch (error) {
    await unlink(tmp).catch(() => {})
    throw error
  }
}

/** Borra temporales huérfanos (de esta clave) con más de TMP_MAX_AGE_MS. Mejor esfuerzo. */
async function sweepTmp(dir: string, key: string) {
  try {
    for (const name of await readdir(dir)) {
      if (!name.startsWith(`${key}.`) || !name.endsWith('.tmp')) continue
      const age = await stat(join(dir, name)).then(s => Date.now() - s.mtimeMs).catch(() => 0)
      if (age > TMP_MAX_AGE_MS) await unlink(join(dir, name)).catch(() => {})
    }
  } catch { /* sin limpieza */ }
}

async function ensureDir(dir: string) {
  await mkdir(dirname(dir), { recursive: true })
  await mkdir(dir, { recursive: true, mode: 0o700 })
  await access(dir, constants.W_OK)
}

export async function readCrmRecord(dir: string, key: string): Promise<CrmRecord | null> {
  if (!KEY_RE.test(key)) return null
  try { return await readRecord(dir, key) } catch { return null }
}

/** Reserva el derecho a enviar (processing). Solo uno puede obtenerlo. */
export async function claimCrm(dir: string, key: string, now = Date.now(), opts: { lockWaitMs?: number } = {}): Promise<CrmClaim> {
  if (!KEY_RE.test(key)) return { ok: false, reason: 'store_error', detail: 'invalid_key' }
  try {
    await ensureDir(dir)
    return await withCrmLock(dir, key, async (): Promise<CrmClaim> => {
      await sweepTmp(dir, key)
      const rec = await readRecord(dir, key)
      if (rec) {
        if (rec.state === 'sent') return { ok: false, reason: 'sent' }
        if (rec.state === 'unknown') return { ok: false, reason: 'unknown', detail: rec.reason }
        if (rec.state === 'processing') {
          if (now - rec.updatedAt > CRM_PROCESSING_STALE_MS) {
            await writeRecord(dir, key, { state: 'unknown', attempts: rec.attempts, updatedAt: now, reason: 'stale_processing' })
            return { ok: false, reason: 'unknown', detail: 'stale_processing' }
          }
          return { ok: false, reason: 'processing' }
        }
        if (rec.retryable !== true) return { ok: false, reason: 'failed_permanent', detail: rec.reason }
        if (rec.attempts >= CRM_MAX_ATTEMPTS) return { ok: false, reason: 'exhausted', detail: rec.reason }
      }
      const attempt = (rec?.attempts ?? 0) + 1
      await writeRecord(dir, key, { state: 'processing', attempts: attempt, updatedAt: now })
      return { ok: true, attempt }
    }, opts.lockWaitMs)
  } catch (error: any) {
    if (error?.code === 'lock_timeout') return { ok: false, reason: 'lock_timeout' }
    return { ok: false, reason: 'store_error', detail: typeof error?.code === 'string' ? error.code : 'io_error' }
  }
}

/** Registra el resultado de un envío reclamado. Devuelve false si no se pudo guardar (la ficha queda en processing y acabará como unknown: nunca se reenvía). */
export async function finishCrm(dir: string, key: string, attempt: number, state: Exclude<CrmState, 'processing'>, details: { httpStatus?: number, reason?: string, retryable?: boolean } = {}): Promise<boolean> {
  try {
    await withCrmLock(dir, key, () => writeRecord(dir, key, { state, attempts: attempt, updatedAt: Date.now(), ...details }))
    return true
  } catch {
    return false
  }
}

/** Operaciones que requieren atención: todo lo que no esté en `sent` (unknown = conciliar a mano; failed; processing = en curso o interrumpido). */
export async function listCrmPending(dir: string): Promise<Array<{ key: string } & CrmRecord>> {
  const out: Array<{ key: string } & CrmRecord> = []
  let names: string[]
  try { names = await readdir(dir) } catch { return out }
  for (const name of names) {
    const key = name.endsWith('.json') ? name.slice(0, -5) : ''
    if (!KEY_RE.test(key)) continue
    const rec = await readCrmRecord(dir, key)
    if (rec && rec.state !== 'sent') out.push({ key, ...rec })
  }
  return out
}

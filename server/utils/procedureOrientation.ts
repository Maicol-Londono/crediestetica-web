import type { H3Event } from 'h3'
import { mkdir, readFile, rename, writeFile, copyFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'

// Orientación de la imagen de portada de cada procedimiento («vertical» 1080 × 1920 u «horizontal» 1920 × 1080).
// Wellezy Hub no tiene ese dato, así que se guarda LOCALMENTE en esta web (`<NUXT_CONTENT_DIR>/procedure-image-orientation.json`,
// mapa slug → orientación), igual que «Nosotros» y «Clínicas aliadas». Sin dato, la portada es vertical.
// Helpers de Nitro (aboutContentDir, createError) son auto-imports.
//
// Persistencia, con las mismas garantías que el resto de archivos JSON locales:
//  - Escritura ATÓMICA: archivo temporal de nombre ALEATORIO en el mismo directorio + rename (nunca se ve un JSON a medias).
//  - Respaldo `procedure-image-orientation.prev.json` (copia de la versión anterior) antes de reemplazar.
//  - Lectura ESTRICTA: un JSON corrupto no se interpreta como «sin datos». `readOrientations` falla y `saveOrientation` NO reescribe el archivo
//    (un guardado nunca destruye las orientaciones válidas): hay que restaurar el archivo o el respaldo `.prev`.
//  - Solo la visualización (`withOrientation`) tolera el fallo: registra el error y usa la orientación por defecto, para que un archivo dañado
//    no deje sin portadas el listado público de procedimientos.
// Concurrencia: los guardados se serializan con una cola en la MEMORIA de este proceso (evita perder la orientación de otro procedimiento
// guardado a la vez). No hay exclusión entre procesos: la aplicación debe ejecutarse como una sola instancia de Node.

export type ProcedureImageOrientation = 'vertical' | 'horizontal'
export const DEFAULT_IMAGE_ORIENTATION: ProcedureImageOrientation = 'vertical'

const FILE = 'procedure-image-orientation.json'
const BACKUP = 'procedure-image-orientation.prev.json'
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const MSG_ORIENTATION_CORRUPT = 'El archivo de orientación de imágenes está dañado. Restaura el archivo o su respaldo antes de guardar.'

export function normalizeOrientation(v: unknown): ProcedureImageOrientation {
  return v === 'horizontal' ? 'horizontal' : DEFAULT_IMAGE_ORIENTATION
}

function corrupt(): never {
  throw createError({ statusCode: 500, message: MSG_ORIENTATION_CORRUPT, data: { message: MSG_ORIENTATION_CORRUPT, code: 'orientation_corrupt' } })
}

/**
 * Lee el mapa slug → orientación. Sin archivo (ENOENT) => {} (todavía no se guardó ninguna). Archivo ilegible, vacío, con JSON inválido o que
 * no es un objeto => ERROR (nunca `{}`): quien lo llama decide, pero no puede confundirlo con «sin datos».
 */
export async function readOrientations(event: H3Event): Promise<Record<string, ProcedureImageOrientation>> {
  let raw: string
  try {
    raw = await readFile(join(aboutContentDir(event), FILE), 'utf8')
  } catch (error: any) {
    if (error?.code === 'ENOENT') return {}
    console.error('[procedures] No se pudo leer la orientación de imágenes:', error?.code ?? 'error')
    return corrupt()
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    console.error('[procedures] El archivo de orientación de imágenes no es JSON válido.')
    return corrupt()
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    console.error('[procedures] El archivo de orientación de imágenes no contiene un objeto.')
    return corrupt()
  }
  const out: Record<string, ProcedureImageOrientation> = {}
  for (const [k, v] of Object.entries(parsed)) if (SLUG_RE.test(k)) out[k] = normalizeOrientation(v)
  return out
}

// Exclusión mutua dentro del proceso: leer, modificar y escribir es una sola sección crítica.
let queue: Promise<unknown> = Promise.resolve()
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn)
  queue = run.catch(() => {})
  return run
}

export function saveOrientation(event: H3Event, slug: string, value: unknown): Promise<void> {
  if (value !== 'vertical' && value !== 'horizontal') return Promise.resolve()
  if (!SLUG_RE.test(slug)) return Promise.resolve()
  return exclusive(async () => {
    const dir = aboutContentDir(event)
    const all = await readOrientations(event) // archivo corrupto => lanza y NO se reescribe
    if (all[slug] === value) return
    all[slug] = value
    const target = join(dir, FILE)
    const tmp = join(dir, `${FILE}.${randomBytes(6).toString('hex')}.tmp`)
    try {
      await mkdir(dir, { recursive: true })
      await copyFile(target, join(dir, BACKUP)).catch((e: any) => { if (e?.code !== 'ENOENT') throw e })
      await writeFile(tmp, JSON.stringify(all, null, 2), 'utf8')
      await rename(tmp, target)
    } catch (error: any) {
      console.error('[procedures] No se pudo guardar la orientación de imágenes:', error?.code ?? 'error')
      throw createError({ statusCode: 500, message: 'El procedimiento se guardó, pero no fue posible guardar la orientación de la imagen.' })
    } finally {
      // Tras un rename correcto el temporal ya no existe (ENOENT ignorado); tras cualquier fallo no queda un .tmp huérfano.
      await unlink(tmp).catch(() => {})
    }
  })
}

/** Añade `imageOrientation` a cada procedimiento (por slug). Si el archivo está dañado: registra el error y usa la orientación por defecto. */
export async function withOrientation<T extends { slug: string }>(event: H3Event, rows: T[]): Promise<Array<T & { imageOrientation: ProcedureImageOrientation }>> {
  let all: Record<string, ProcedureImageOrientation> = {}
  try {
    all = await readOrientations(event)
  } catch {
    // Ya registrado en readOrientations. La web pública sigue mostrando los procedimientos con la portada por defecto.
    console.error('[procedures] Se usa la orientación por defecto mientras el archivo de orientación no se pueda leer.')
  }
  return rows.map(r => ({ ...r, imageOrientation: all[r.slug] ?? DEFAULT_IMAGE_ORIENTATION }))
}

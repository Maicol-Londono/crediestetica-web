import type { H3Event } from 'h3'
import { PROCEDURE_SLUG_PATTERN } from '../../shared/utils/procedureSlug.ts'

// Sitemap: URLs individuales de los procedimientos publicados. La fuente de verdad es Wellezy Hub (listado público de la línea), vía
// `fetchPublicProcedureRows`; no hay lista manual. Todo o nada: si Hub no entrega el listado completo se lanza un error (503) y NO se
// devuelve ninguna URL parcial, de modo que el sitemap no se publique incompleto (ver server/plugins/sitemap-procedures.ts).

export interface SitemapEntry { loc: string }

/**
 * Rutas `/procedimientos/{slug}` de las filas de Hub. Orden de Hub, sin duplicados.
 *  - Fila que no es un objeto o sin `slug` de texto: el contrato de Hub se rompió => error (no se publica un sitemap incompleto).
 *  - `slug` de texto con formato inválido (el detalle público respondería 404): se omite y se registra el error, nunca en silencio.
 */
export function procedureSitemapPaths(rows: unknown[]): string[] {
  const seen = new Set<string>()
  const skipped: string[] = []
  for (const row of rows) {
    const slug = row && typeof row === 'object' ? (row as { slug?: unknown }).slug : undefined
    if (typeof slug !== 'string') {
      console.error('[sitemap] Fila del listado de Hub sin `slug` de texto: no se genera el sitemap.')
      throw createError({ statusCode: 503, message: 'No fue posible generar el sitemap.', data: { reason: 'invalid_response' } })
    }
    if (!PROCEDURE_SLUG_PATTERN.test(slug)) skipped.push(slug)
    else seen.add(`/procedimientos/${slug}`)
  }
  if (skipped.length) {
    console.error(`[sitemap] ${skipped.length} procedimiento(s) con slug inválido omitidos del sitemap: ${skipped.slice(0, 5).map(s => JSON.stringify(s.slice(0, 60))).join(', ')}`)
  }
  return [...seen]
}

/** Entradas del sitemap para los procedimientos de la línea (consulta a Hub). Lanza si el listado no está completo. */
export async function procedureSitemapEntries(event: H3Event): Promise<SitemapEntry[]> {
  return procedureSitemapPaths(await fetchPublicProcedureRows(event)).map(loc => ({ loc }))
}

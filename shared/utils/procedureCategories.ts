// Etiqueta visible de la categoría de un procedimiento. Módulo PURO (sin imports): lo usan el catálogo, el detalle y las pruebas.
// Hub identifica la categoría por slug; el nombre real viene de GET /api/v1/web/categorias-cirugias (solo categorías activas con
// procedimientos activos). Si el slug no está en esa lista (categoría inactiva, inexistente o consulta fallida) se deriva una etiqueta
// legible del slug: nunca se muestra el slug crudo ni se inventa un nombre.

export interface ProcedureCategoryName { slug: string, name: string }

export function procedureCategoryLabel(slug: unknown, names: ProcedureCategoryName[] | null | undefined): string {
  const s = typeof slug === 'string' ? slug.trim() : ''
  if (!s) return ''
  const named = (names ?? []).find(c => c?.slug === s)?.name
  if (typeof named === 'string' && named.trim()) return named.trim()
  const t = s.replace(/[-_]+/g, ' ').trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''
}

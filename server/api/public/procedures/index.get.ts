// Listado público de procedimientos desde Wellezy Hub (GET /api/v1/web/cirugias).
// Hub resuelve la línea con X-Tenant-Linea (configuración del servidor) y solo entrega los procedimientos activos y habilitados
// para esa línea (maestros habilitados + propios). Nada de company_id/linea_id viaja desde el navegador.
// La consulta paginada (y su validación) es `fetchPublicProcedureRows`, compartida con el sitemap.
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')

  const rows = await fetchPublicProcedureRows(event)

  return await withOrientation(event, rows.map(fromPublicListItem))
})

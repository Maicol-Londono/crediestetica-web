// Categorías de procedimientos desde Wellezy Hub (GET /api/v1/web/categorias-cirugias). Solo lectura.
// Hub entrega únicamente las categorías activas que tienen al menos un procedimiento activo y habilitado en la línea configurada,
// con su nombre real. No existe un endpoint de administración de categorías en Hub: aquí no se crean ni se editan (ver INTEGRATION_BLOCKERS B-08).
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')

  const res = await wellezyPublicGet<any>(event, '/v1/web/categorias-cirugias')
  assertHubOk('procedures', res, Array.isArray(res.data?.data), 'No fue posible cargar las categorías. Intenta nuevamente.')

  return (res.data.data as any[])
    .map(c => ({
      slug: typeof c?.slug === 'string' ? c.slug.trim() : '',
      name: typeof c?.nombre === 'string' ? c.nombre.trim() : '',
      count: Number.isFinite(Number(c?.cirugias_count)) ? Number(c.cirugias_count) : 0
    }))
    .filter(c => c.slug && c.name)
})

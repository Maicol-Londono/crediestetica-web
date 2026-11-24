// Lectura pública de un micrositio PRP desde Wellezy Hub (GET /api/v1/web/prp/{slug}).
// Hub resuelve empresa/línea con X-Tenant-Linea y solo devuelve PRP activos de ese tenant.
// Nunca se reenvía nada más que los 3 campos públicos (nombre, slug y título). El `external_code` del referidor NO se entrega al navegador: la
// inscripción envía solo el slug y el servidor resuelve el código con Hub (server/utils/prpReferrer.ts).

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')

  // El micrositio ya no depende del destino del CRM (crmPrpFormUrl): la inscripción se procesa en Wellezy Hub, no se envía directo al CRM.

  const slug = String(getRouterParam(event, 'slug') ?? '')
  if (!slug || slug.length > 255 || !SLUG_RE.test(slug)) {
    throw createError({ statusCode: 404, message: 'No encontrado' })
  }

  const res = await wellezyPublicGet<any>(event, `/v1/web/prp/${slug}`)

  if (res.status === 404) {
    // Un tenant mal configurado también responde 404: se deja rastro para no confundirlo con "PRP inexistente".
    if (String(res.data?.message ?? '').includes('Tenant')) {
      console.error('[prp] Hub no resolvió el tenant (revisa NUXT_WELLEZY_LINE_SLUG).')
    }
    throw createError({ statusCode: 404, message: 'No encontrado' })
  }

  const prp = res.data?.data
  if (res.status !== 200 || !prp || typeof prp.name !== 'string' || typeof prp.slug !== 'string') {
    throw createError({ statusCode: 503, message: 'No fue posible cargar esta página. Intenta nuevamente.' })
  }

  return {
    name: prp.name,
    slug: prp.slug,
    title: typeof prp.title === 'string' && prp.title ? prp.title : null
  }
})

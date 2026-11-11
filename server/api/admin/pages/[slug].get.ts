// Contenido de una página informativa simple para el administrador. Persistencia local: server/utils/sitePages.ts.
export default defineEventHandler(async (event) => {
  await requireAboutEditor(event)
  return await readSitePage(event, resolveSitePageSlug(getRouterParam(event, 'slug')))
})

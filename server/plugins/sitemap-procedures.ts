import type { SitemapInputCtx } from '@nuxtjs/sitemap'

// Agrega al sitemap (/sitemap.xml, @nuxtjs/sitemap) las URLs de los procedimientos publicados en Wellezy Hub.
//
// Se usa el hook `sitemap:input` y NO una fuente (`sitemap.sources`/`urls`) porque el módulo trata las fuentes que fallan como «no
// críticas»: las registra, devuelve un sitemap sin sus URLs y ese XML incompleto se guarda en la caché. Un error lanzado desde este
// hook, en cambio, aborta la generación: con caché (stale-while-revalidate) se sigue sirviendo la última versión completa y NO se
// almacena una nueva; sin ninguna versión previa la petición responde con error en lugar de un sitemap sin procedimientos.
// Las URLs entran antes del filtrado del módulo, así que se conservan `exclude` (/admin/**, /prp/**), el dominio público y la
// deduplicación. Las URLs se agregan solo cuando el listado llegó completo.

// El módulo declara `sitemap:input` (con el tipo oficial SitemapInputCtx) en `.nuxt/types/nuxt-sitemap-augments.d.ts`, pero ese archivo
// no forma parte del proyecto TypeScript del servidor (tsconfig.server.json). Se repite aquí la MISMA declaración oficial, en lugar de un cast.
declare module 'nitropack' {
  interface NitroRuntimeHooks {
    'sitemap:input': (ctx: SitemapInputCtx) => void | Promise<void>
  }
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:input', async (ctx) => {
    const entries = await procedureSitemapEntries(ctx.event)
    ctx.urls.push(...entries)
  })
})

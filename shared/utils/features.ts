// Funcionalidades heredadas de Planmed que permanecen DESACTIVADAS en Crediestética. Módulo PURO (sin imports): lo usan el middleware de rutas,
// el middleware de Nitro, el proveedor del CRM y las pruebas.
//
// Hoy solo el PRP público está desactivado. Noticias está ACTIVA (administración y sitio público): no figura aquí.
// El código de PRP se CONSERVA (páginas, componentes, proveedores, endpoints y pruebas), pero queda fuera de la experiencia funcional: sin rutas
// públicas, sin lectura pública y sin envío al CRM. Para reactivarlo hace falta una decisión expresa (validación independiente de los destinos y
// contratos del CRM) y cambiar la constante.

/** Micrositios PRP: página pública (/prp/**), su lectura (/api/public/prp/*) y el envío del formulario al CRM. */
export const PRP_ENABLED = false

const startsWithSegment = (path: string, base: string) => path === base || path.startsWith(`${base}/`)

/** Rutas de PÁGINAS (navegador) bloqueadas por funcionalidad desactivada. */
export function isDisabledPagePath(path: string): boolean {
  const p = path.replace(/\/+$/, '') || '/'
  return !PRP_ENABLED && startsWithSegment(p, '/prp')
}

/** Rutas de API (Nitro) bloqueadas por funcionalidad desactivada. */
export function isDisabledApiPath(path: string): boolean {
  const p = path.replace(/\/+$/, '') || '/'
  return !PRP_ENABLED && startsWithSegment(p, '/api/public/prp')
}

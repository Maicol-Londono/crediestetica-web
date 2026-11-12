// Interruptores de funcionalidades heredadas de Planmed. Módulo PURO (sin imports): lo usan el middleware de rutas, el middleware de Nitro,
// el proveedor del CRM y las pruebas.
//
// PRP tiene DOS interruptores independientes (cada uno se puede apagar sin afectar al otro):
//  · PRP_ENABLED: las páginas públicas (/prp/**) y su lectura (/api/public/prp/*, que consulta a Hub).
//  · PRP_SUBMIT_ENABLED: el ENVÍO del formulario del micrositio al CRM médico (POST directo desde el navegador, solo PRP).
// Ninguno de los dos toca los demás formularios (valoración, simulador, preaprobado, inscripción de referidos): esos se controlan por su propia
// configuración. El envío conserva además la validación del destino (crmDestinationProblem) en el proveedor y en la lectura pública.
// Noticias está ACTIVA (administración y sitio público): no figura aquí.

/** Micrositios PRP: página pública (/prp/**) y su lectura (/api/public/prp/*). */
export const PRP_ENABLED = true

/** Envío del formulario del micrositio PRP al CRM médico (solo ese formulario). */
export const PRP_SUBMIT_ENABLED = true

const startsWithSegment = (path: string, base: string) => path === base || path.startsWith(`${base}/`)

/** Rutas de PÁGINAS (navegador) bloqueadas por funcionalidad desactivada. */
export function isDisabledPagePath(path: string, prpEnabled: boolean = PRP_ENABLED): boolean {
  const p = path.replace(/\/+$/, '') || '/'
  return !prpEnabled && startsWithSegment(p, '/prp')
}

/** Rutas de API (Nitro) bloqueadas por funcionalidad desactivada. */
export function isDisabledApiPath(path: string, prpEnabled: boolean = PRP_ENABLED): boolean {
  const p = path.replace(/\/+$/, '') || '/'
  return !prpEnabled && startsWithSegment(p, '/api/public/prp')
}

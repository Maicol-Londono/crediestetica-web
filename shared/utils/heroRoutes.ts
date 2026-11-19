// Rutas cuya cabecera de página es una imagen a ancho completo (hero). Sobre ellas el menú es transparente y se superpone a la imagen
// (como en el sitio original de Crediestética); en el resto de páginas el menú es sólido y el contenido se desplaza bajo él.
// Módulo PURO (sin imports): lo usan el menú, el layout y las pruebas. Solo presentación.
export const HERO_ROUTES = [
  '/',
  '/procedimientos',
  '/noticias',
  '/servicios',
  '/clinicas-aliadas',
  '/estudio-de-creditos',
  '/informacion-precontractual',
  '/politica-datos-personales',
  '/recursos',
  '/quienes-somos',
  '/nosotros',
  '/financiacion',
] as const

export function isHeroRoute(path: string): boolean {
  const p = (path || '/').split(/[?#]/)[0]!.replace(/\/+$/, '') || '/'
  return (HERO_ROUTES as readonly string[]).includes(p)
}

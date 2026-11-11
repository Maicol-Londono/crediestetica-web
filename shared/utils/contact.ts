// Datos de contacto públicos de Crediestética: única fuente para WhatsApp, celular y correo de contacto general.
// Módulo PURO (sin imports): lo usan componentes, páginas y pruebas.
// El correo de contacto NO es el correo de PQRS (ese está pendiente de confirmación: ver legalIdentity.ts).
// Redes sociales: ver SOCIAL_PROFILES al final. Un perfil sin URL oficial NO se publica (Messenger está pendiente; nunca se reutilizan perfiles de otras marcas).

/** Número oficial de WhatsApp en formato internacional (57 = Colombia), sin espacios, «+» ni guiones. */
export const WHATSAPP_NUMBER = '573011409597'
/** Formato visible para los usuarios. */
export const WHATSAPP_DISPLAY = '301 140 9597'
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`
/** Enlace de WhatsApp con mensaje predefinido. */
export const whatsappUrlWithText = (text: string): string => `${WHATSAPP_URL}?text=${encodeURIComponent(text)}`

/** Celular de contacto (llamadas), formato nacional sin espacios. */
export const PHONE_NUMBER = '3174563224'
/** Formato visible para los usuarios. */
export const PHONE_DISPLAY = '317 456 3224'
export const PHONE_TEL = `tel:+57${PHONE_NUMBER}`

/** Correo de contacto general (no PQRS). */
export const CONTACT_EMAIL = 'legalmedcartera@gmail.com'
export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`

/** Perfiles sociales de Crediestética. `url: null` = pendiente de recibir la URL oficial del titular: el Footer no muestra ese icono. */
export type SocialKey = 'instagram' | 'facebook' | 'tiktok' | 'messenger'
export interface SocialProfile { key: SocialKey, label: string, url: string | null }
export const SOCIAL_PROFILES: SocialProfile[] = [
  { key: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/crediestetica/' },
  { key: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61591493931360' },
  { key: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@crediestetica' },
  // Messenger: pendiente de recibir su URL oficial (no se inventa).
  { key: 'messenger', label: 'Messenger', url: null }
]

const SOCIAL_HOSTS: Record<SocialKey, RegExp> = {
  instagram: /^(www\.)?instagram\.com$/i,
  facebook: /^(www\.|m\.)?(facebook\.com|fb\.com)$/i,
  tiktok: /^(www\.)?tiktok\.com$/i,
  messenger: /^(www\.)?(m\.me|messenger\.com|facebook\.com)$/i
}
/** ¿URL aceptable para un perfil? https, host de la red indicada, con ruta, sin credenciales. */
export function isValidSocialUrl(key: SocialKey, url: string | null | undefined): boolean {
  if (typeof url !== 'string' || url.trim() === '' || url !== url.trim()) return false
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && !u.username && !u.password && SOCIAL_HOSTS[key].test(u.hostname) && u.pathname.length > 1
  } catch { return false }
}

/** Perfiles publicables (solo los de URL válida). */
export function publicSocialProfiles(profiles: SocialProfile[] = SOCIAL_PROFILES): Array<SocialProfile & { url: string }> {
  return profiles.filter((p): p is SocialProfile & { url: string } => isValidSocialUrl(p.key, p.url))
}

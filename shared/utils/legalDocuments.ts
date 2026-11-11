// Registro CENTRAL de los documentos legales de Crediestética y de sus enlaces. Módulo PURO (sin imports).
//
// Estado actual: `politicaDatos` (D4.4), `avisoPrivacidad` y `autorizacionDatos` (D4.5) y `reclamaciones` (D5.5) tienen enlace oficial; los demás siguen en `url: null` hasta que el responsable
// entregue las URL de Google Drive. Para publicarlas basta con completar `url` AQUÍ (un único lugar); los formularios, el modal
// y las páginas legales leen este registro y pasan solos de «pendiente» a «enlace».
//
// Validación: una URL solo se publica si `isValidLegalDocumentUrl` la acepta (https, host de Google Drive/Docs, con ruta, sin
// credenciales ni dominios heredados). Una URL inválida se trata como NO configurada y la prueba `legal-documents` falla.
// Esta validación NO comprueba que el archivo sea público: los permisos de acceso se verifican cuando se entreguen las URL.
// No usar nunca las URL de Planmed ni los PDF heredados de Cliniplanes (archivo-legal-heredado/).

export type LegalDocumentKey =
  | 'precontractual'
  | 'politicaDatos'
  | 'avisoPrivacidad'
  | 'autorizacionDatos'
  | 'pagare'
  | 'autorizacionCentrales'
  | 'reclamaciones'
  | 'advertencias'

export interface LegalDocument {
  key: LegalDocumentKey
  /** Nombre del documento tal como se muestra al usuario. */
  title: string
  /** Para qué sirve (descriptivo, no es texto jurídico). */
  purpose: string
  /** Ruta interna del sitio si el documento se muestra en una página propia (no es un archivo). */
  route?: string
  /** URL oficial (Google Drive). `null` = pendiente: no se muestra ningún enlace. */
  url: string | null
}

export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, LegalDocument> = {
  precontractual: {
    key: 'precontractual',
    title: 'Información precontractual',
    purpose: 'Condiciones y advertencias previas a la solicitud de financiación.',
    route: '/informacion-precontractual',
    url: null,
  },
  politicaDatos: {
    key: 'politicaDatos',
    title: 'Política de tratamiento de datos personales',
    purpose: 'Responsable, finalidades, derechos de los titulares y procedimientos de consulta y reclamación.',
    url: 'https://drive.google.com/file/d/1hUZk27N0B09zWoZV0VHdvDeCUB_BtiBw/view?usp=sharing',
  },
  avisoPrivacidad: {
    key: 'avisoPrivacidad',
    title: 'Aviso de privacidad',
    purpose: 'Información al titular sobre la existencia y el alcance de la política de tratamiento de datos.',
    url: 'https://drive.google.com/file/d/19to35HZmCvXZn_WefVsUXpNdzqDjyU68/view?usp=sharing',
  },
  autorizacionDatos: {
    key: 'autorizacionDatos',
    title: 'Aviso de privacidad y autorización expresa para el tratamiento de datos personales',
    purpose: 'Documento combinado (un único archivo): aviso de privacidad y autorización expresa del titular para el tratamiento de sus datos.',
    url: 'https://drive.google.com/file/d/1T8-tXO9EIiZZDg2UojmQZ_W5x7-sr29s/view?usp=sharing',
  },
  pagare: {
    key: 'pagare',
    title: 'Pagaré',
    purpose: 'Título valor que respalda la obligación de pago de la financiación.',
    url: null,
  },
  autorizacionCentrales: {
    key: 'autorizacionCentrales',
    title: 'Autorización de consulta y reporte a centrales de riesgo',
    purpose: 'Autorización del titular para consultar y reportar información crediticia.',
    url: null,
  },
  reclamaciones: {
    key: 'reclamaciones',
    title: 'Formato o canal de reclamaciones',
    purpose: 'Medio para presentar consultas, peticiones, quejas y reclamos.',
    // D5.5: enlace confirmado por el responsable como documento de reclamaciones (el nombre del archivo en Drive es otro; la confirmación manda).
    url: 'https://drive.google.com/file/d/17HFP_Djmj9UFIC51BW_UCLWUexoMsC_g/view?usp=sharing',
  },
  advertencias: {
    key: 'advertencias',
    title: 'Documento oficial de advertencias precontractuales',
    purpose: 'Documento de advertencias que se firma para la formalización de la financiación.',
    url: null,
  },
}

/** Hosts permitidos para los documentos alojados en Google. */
export const LEGAL_DOCUMENT_HOSTS = ['drive.google.com', 'docs.google.com'] as const
/** Dominios/archivos heredados que nunca deben publicarse como documento de Crediestética. */
const FORBIDDEN_FRAGMENTS = /pdtclientsolutions|planmed|cliniplanes|politica_tratamiento|archivo-legal-heredado/i

/** ¿Es una URL aceptable para publicar un documento? (formato y origen; NO verifica permisos de acceso). */
export function isValidLegalDocumentUrl(url: string | null | undefined): boolean {
  if (typeof url !== 'string' || url.trim() === '' || url !== url.trim()) return false
  if (FORBIDDEN_FRAGMENTS.test(url)) return false
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') return false
  if (parsed.username || parsed.password) return false
  if (!(LEGAL_DOCUMENT_HOSTS as readonly string[]).includes(parsed.hostname)) return false
  return parsed.pathname.length > 1
}

/** URL publicable del documento o `null` si está pendiente/es inválida. */
export function legalDocumentUrl(key: LegalDocumentKey, docs: Record<LegalDocumentKey, LegalDocument> = LEGAL_DOCUMENTS): string | null {
  const url = docs[key]?.url ?? null
  return isValidLegalDocumentUrl(url) ? url : null
}

/** Enlace a un documento: externo (Drive) si está configurado; si no, la página provisional de datos personales con la leyenda de pendiente. */
export interface LegalDocLink {
  href: string
  label: string
  external: boolean
  pending: boolean
}

export const PENDING_LABEL = '(documento en actualización)'
export const PENDING_HREF = '/politica-datos-personales'

export function legalDocLink(key: LegalDocumentKey, docs: Record<LegalDocumentKey, LegalDocument> = LEGAL_DOCUMENTS): LegalDocLink {
  const url = legalDocumentUrl(key, docs)
  if (url) return { href: url, label: '(ver documento)', external: true, pending: false }
  const route = docs[key]?.route
  if (route) return { href: route, label: '(ver documento)', external: false, pending: false }
  return { href: PENDING_HREF, label: PENDING_LABEL, external: false, pending: true }
}

/** Variante HTML para etiquetas que usan v-html (LeadForm). El texto sale solo de constantes de este módulo. */
export function legalDocLinkHtml(key: LegalDocumentKey, cssClass: string, docs: Record<LegalDocumentKey, LegalDocument> = LEGAL_DOCUMENTS): string {
  const l = legalDocLink(key, docs)
  const rel = l.external ? ' rel="noopener noreferrer"' : ''
  return `<a href="${l.href}" target="_blank"${rel} class="${cssClass}">${l.label}</a>`
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Documentos descargables de la página pública /recursos (D5.4). Son un registro APARTE de LEGAL_DOCUMENTS: publicarlos en /recursos
// NO cambia los enlaces que usan el modal precontractual, los formularios ni la página de política de datos (esos siguen leyendo
// LEGAL_DOCUMENTS). Los archivos están en Google Drive (enlaces entregados por el responsable); no se alojan copias en el sitio.
// El 4.º documento se publica con el nombre indicado por el responsable, aunque el archivo en Drive se titule «02. Aviso de privacidad y
// autorización expresa para el tratamiento de datos personales»: confirmado por el usuario en D5.4.
// ---------------------------------------------------------------------------------------------------------------------------------
export interface PublicResourceDocument {
  id: string
  /** Nombre completo mostrado al visitante. */
  title: string
  /** Enlace oficial de Drive (abre el visor). */
  viewUrl: string
}

export const PUBLIC_RESOURCE_DOCUMENTS: PublicResourceDocument[] = [
  { id: 'politica-tratamiento-datos', title: 'Política de tratamiento de datos personales', viewUrl: 'https://drive.google.com/file/d/1D_80Fi7LWygH2pYyyoC7i5QKywBMMsW_/view?usp=sharing' },
  { id: 'aviso-privacidad', title: 'Aviso de privacidad', viewUrl: 'https://drive.google.com/file/d/1onGM7UH-CgaVgbCEpyKq38sL6t093wgS/view?usp=sharing' },
  { id: 'formato-autorizacion-datos', title: 'Formato de Autorización de Tratamiento de Datos Personales', viewUrl: 'https://drive.google.com/file/d/1k0T9Z8WB3OlpvORvdUgbbZwAElPATiRb/view?usp=sharing' },
  { id: 'formato-reclamacion-datos', title: 'Formato de Reclamación de Tratamiento de Datos Personales', viewUrl: 'https://drive.google.com/file/d/17HFP_Djmj9UFIC51BW_UCLWUexoMsC_g/view?usp=sharing' },
]

/** Identificador de archivo de una URL de Drive del tipo /file/d/<ID>/…, o `null`. */
export function driveFileId(url: string | null | undefined): string | null {
  const m = typeof url === 'string' ? /^https:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)(?:\/|$)/.exec(url) : null
  return m?.[1] ?? null
}

/** Enlace de descarga directa de Drive para un enlace /file/d/<ID>/view (verificado en D5.4: responde con el archivo, no con el visor). */
export function driveDirectDownloadUrl(viewUrl: string): string | null {
  const id = driveFileId(viewUrl)
  return id ? `https://drive.google.com/uc?export=download&id=${id}` : null
}

export interface PublicResourceLink extends PublicResourceDocument {
  downloadUrl: string
}

/** Documentos publicables en /recursos: solo los de URL válida (misma validación que el resto de documentos legales). */
export function publicResourceDocuments(docs: PublicResourceDocument[] = PUBLIC_RESOURCE_DOCUMENTS): PublicResourceLink[] {
  const out: PublicResourceLink[] = []
  for (const d of docs) {
    const downloadUrl = driveDirectDownloadUrl(d.viewUrl)
    if (!downloadUrl || !isValidLegalDocumentUrl(d.viewUrl) || !isValidLegalDocumentUrl(downloadUrl)) continue
    out.push({ ...d, downloadUrl })
  }
  return out
}

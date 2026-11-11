// Página «Nosotros»: modelo, contenido inicial y validación. Módulo PURO (sin imports) compartido por el navegador (formulario
// del administrador), el servidor Nitro (rutas /api/{admin,public}/about) y las pruebas de Node.
// Este contenido se administra SOLO en esta web (no en Wellezy Hub): ver server/utils/aboutStore.ts.
// Los textos largos (legal, párrafos, respuestas y horario) admiten texto enriquecido: el servidor los sanea con la lista blanca de
// utils/richText.ts (aboutStore.parseAboutBody) y la página los renderiza con CommonRichContent, que vuelve a sanear. El resto es texto plano.

export interface AboutFaq { id: string, question: string, answer: string, active: boolean }
export type AboutSocialNetwork = 'instagram' | 'facebook' | 'tiktok'

export interface AboutContent {
  hero: { title: string, image: string, imageAlt: string }
  institutional: { title: string, legal: string, paragraphs: string[] }
  video: { url: string }
  faqs: AboutFaq[]
  contact: {
    address: string
    building: string
    city: string
    region: string
    phone: string
    email: string
    schedule: string
    socials: Record<AboutSocialNetwork, string>
    map: { enabled: boolean }
  }
  /** ISO 8601 del último guardado; vacío = contenido inicial (aún no guardado). */
  updatedAt: string
}

export type AboutErrors = Record<string, string>

export const ABOUT_LIMITS = { short: 200, legal: 4000, paragraph: 6000, question: 300, answer: 4000, schedule: 1000, faqs: 30, paragraphs: 3 } as const
export const ABOUT_SOCIAL_NETWORKS: AboutSocialNetwork[] = ['instagram', 'facebook', 'tiktok']
export const ABOUT_MEDIA_PREFIX = '/api/public/about/media/'
export const ABOUT_MEDIA_NAME_RE = /^hero-[a-z0-9-]{6,60}\.(jpg|png|webp)$/

const SOCIAL_HOSTS: Record<AboutSocialNetwork, RegExp> = {
  instagram: /^(www\.)?instagram\.com$/i,
  facebook: /^(www\.|m\.)?(facebook\.com|fb\.com)$/i,
  tiktok: /^(www\.)?tiktok\.com$/i
}

// Contenido inicial NEUTRO: esta web aún no tiene contenido propio configurado. No se hereda ningún texto, imagen, contacto ni red social
// de otra marca: todo queda vacío y las páginas muestran un estado «sin configurar». El contenido real se carga desde /admin/nosotros.
export function aboutDefaultContent(): AboutContent {
  return {
    hero: { title: '', image: '', imageAlt: '' },
    institutional: { title: '', legal: '', paragraphs: ['', '', ''] },
    video: { url: '' },
    faqs: [],
    contact: {
      address: '',
      building: '',
      city: '',
      region: '',
      phone: '',
      email: '',
      schedule: '',
      socials: { instagram: '', facebook: '', tiktok: '' },
      map: { enabled: false }
    },
    updatedAt: ''
  }
}

/** ¿Aún no hay contenido de «Nosotros» configurado? (nada guardado: se muestra el estado «sin configurar»). */
export function aboutIsEmpty(c: AboutContent): boolean {
  return !c.hero.title && !c.institutional.title && !c.institutional.legal && !c.institutional.paragraphs.some(Boolean) && !c.faqs.length
}

// ── YouTube: solo se guarda una URL canónica con un id válido; el reproductor se construye a partir del id (nunca HTML del usuario).
const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/
const YT_HOST_RE = /^(www\.|m\.|music\.)?(youtube\.com|youtube-nocookie\.com)$/i

export function aboutYoutubeId(input: string): string | null {
  let url: URL
  try { url = new URL(String(input ?? '').trim()) } catch { return null }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  let id: string | null = null
  if (/^(www\.)?youtu\.be$/i.test(url.hostname)) id = url.pathname.split('/')[1] ?? null
  else if (YT_HOST_RE.test(url.hostname)) {
    if (url.pathname === '/watch') id = url.searchParams.get('v')
    else id = /^\/(?:embed|shorts|live|v)\/([^/?#]+)/.exec(url.pathname)?.[1] ?? null
  }
  return id && YT_ID_RE.test(id) ? id : null
}

export const aboutYoutubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`
/** Reproductor sin cookies hasta reproducir, sin autoplay y sin videos relacionados de otros canales. */
export const aboutYoutubeEmbedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?rel=0`

// ── Mapa: se arma SOLO con la dirección guardada (sin coordenadas inventadas ni URLs/HTML del administrador).
export function aboutMapQuery(c: AboutContent['contact']): string {
  return [c.address, c.building, c.city, c.region].map(s => s.trim()).filter(Boolean).join(', ')
}
export const aboutMapEmbedUrl = (query: string) => `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`
export const aboutMapLinkUrl = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`

export const aboutPhoneHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

// ── Normalización: convierte cualquier entrada en un AboutContent bien formado. Lo que falta se toma de `fallback`
// (el contenido guardado), de modo que un cuerpo incompleto nunca borra datos existentes.
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
const text = (v: unknown, fb: string) => (typeof v === 'string' ? v.replace(CONTROL_RE, '').replace(/\r\n?/g, '\n').trim() : fb)
const FAQ_ID_RE = /^[a-z0-9-]{1,40}$/

export function normalizeAboutContent(raw: any, fallback: AboutContent = aboutDefaultContent()): AboutContent {
  const r = raw && typeof raw === 'object' ? raw : {}
  const hero = r.hero ?? {}, inst = r.institutional ?? {}, video = r.video ?? {}, contact = r.contact ?? {}
  const socials = contact.socials ?? {}
  const paragraphs = Array.isArray(inst.paragraphs)
    ? Array.from({ length: ABOUT_LIMITS.paragraphs }, (_, i) => text(inst.paragraphs[i], ''))
    : [...fallback.institutional.paragraphs]
  const seen = new Set<string>()
  const faqs = Array.isArray(r.faqs)
    ? r.faqs.filter((f: any) => f && typeof f === 'object').map((f: any, i: number) => {
        let id = typeof f.id === 'string' && FAQ_ID_RE.test(f.id) ? f.id : `faq-${i + 1}`
        while (seen.has(id)) id = `${id}-${i + 1}`.slice(0, 40)
        seen.add(id)
        return { id, question: text(f.question, ''), answer: text(f.answer, ''), active: f.active !== false }
      })
    : fallback.faqs.map(f => ({ ...f }))
  return {
    hero: { title: text(hero.title, fallback.hero.title), image: text(hero.image, fallback.hero.image), imageAlt: text(hero.imageAlt, fallback.hero.imageAlt) },
    institutional: { title: text(inst.title, fallback.institutional.title), legal: text(inst.legal, fallback.institutional.legal), paragraphs },
    video: { url: text(video.url, fallback.video.url) },
    faqs,
    contact: {
      address: text(contact.address, fallback.contact.address),
      building: text(contact.building, fallback.contact.building),
      city: text(contact.city, fallback.contact.city),
      region: text(contact.region, fallback.contact.region),
      phone: text(contact.phone, fallback.contact.phone),
      email: text(contact.email, fallback.contact.email),
      schedule: text(contact.schedule, fallback.contact.schedule),
      socials: Object.fromEntries(ABOUT_SOCIAL_NETWORKS.map(n => [n, text(socials[n], fallback.contact.socials[n])])) as Record<AboutSocialNetwork, string>,
      map: { enabled: typeof contact.map?.enabled === 'boolean' ? contact.map.enabled : fallback.contact.map.enabled }
    },
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : fallback.updatedAt
  }
}

// ── Validación: devuelve { campo: mensaje } (vacío = válido). La usan el formulario (antes de enviar) y el servidor (autoridad).
const SITE_IMAGE_RE = /^\/images\/(?!.*\.\.)[A-Za-z0-9/_().-]+\.(png|jpe?g|webp)$/i
const NEW_IMAGE_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/
const PHONE_RE = /^\+?[0-9][0-9 ()-]{6,19}$/

export const isAboutImageValue = (v: string) =>
  SITE_IMAGE_RE.test(v) || (v.startsWith(ABOUT_MEDIA_PREFIX) && ABOUT_MEDIA_NAME_RE.test(v.slice(ABOUT_MEDIA_PREFIX.length))) || NEW_IMAGE_RE.test(v)

export function validateAboutContent(c: AboutContent): AboutErrors {
  const e: AboutErrors = {}
  const req = (key: string, v: string, label: string, max: number = ABOUT_LIMITS.short) => {
    if (!v.trim()) e[key] = `${label} es obligatorio.`
    else if (v.length > max) e[key] = `${label} admite máximo ${max} caracteres.`
  }
  const opt = (key: string, v: string, label: string, max: number = ABOUT_LIMITS.short) => {
    if (v.length > max) e[key] = `${label} admite máximo ${max} caracteres.`
  }

  req('hero.title', c.hero.title, 'El título de la portada')
  if (!c.hero.image) e['hero.image'] = 'La imagen de portada es obligatoria.'
  else if (!isAboutImageValue(c.hero.image)) e['hero.image'] = 'La imagen de portada debe ser JPG, PNG o WebP.'
  req('hero.imageAlt', c.hero.imageAlt, 'La descripción de la imagen')

  req('institutional.title', c.institutional.title, 'El título institucional')
  req('institutional.legal', c.institutional.legal, 'La descripción legal e institucional', ABOUT_LIMITS.legal)
  if (c.institutional.paragraphs.length !== ABOUT_LIMITS.paragraphs) e['institutional.paragraphs'] = 'Deben existir tres párrafos.'
  c.institutional.paragraphs.forEach((p, i) => req(`institutional.paragraphs.${i}`, p, `El párrafo ${i + 1}`, ABOUT_LIMITS.paragraph))

  // El video es opcional: sin enlace, la sección de video no se muestra en la página pública.
  if (c.video.url && !aboutYoutubeId(c.video.url)) e['video.url'] = 'Usa un enlace válido de YouTube (youtube.com/watch?v=…, youtu.be/…, /shorts/… o /embed/…).'

  if (c.faqs.length > ABOUT_LIMITS.faqs) e.faqs = `Máximo ${ABOUT_LIMITS.faqs} preguntas.`
  c.faqs.forEach((f, i) => {
    const n = i + 1
    if (f.active && !f.question) e[`faqs.${i}.question`] = `La pregunta ${n} está activa: escribe la pregunta.`
    else opt(`faqs.${i}.question`, f.question, `La pregunta ${n}`, ABOUT_LIMITS.question)
    if (f.active && !f.answer) e[`faqs.${i}.answer`] = `La pregunta ${n} está activa: escribe la respuesta.`
    else opt(`faqs.${i}.answer`, f.answer, `La respuesta ${n}`, ABOUT_LIMITS.answer)
    if (!f.question && !f.answer) e[`faqs.${i}.question`] ??= `La pregunta ${n} está vacía: complétala o elimínala.`
  })

  const k = c.contact
  opt('contact.address', k.address, 'La dirección')
  opt('contact.building', k.building, 'El edificio')
  opt('contact.city', k.city, 'La ciudad')
  opt('contact.region', k.region, 'El departamento')
  if (k.phone && !PHONE_RE.test(k.phone)) e['contact.phone'] = 'El teléfono solo admite números, espacios, guiones, paréntesis y el prefijo +.'
  if (k.email && (!EMAIL_RE.test(k.email) || k.email.length > ABOUT_LIMITS.short)) e['contact.email'] = 'Escribe un correo electrónico válido.'
  opt('contact.schedule', k.schedule, 'El horario', ABOUT_LIMITS.schedule)
  for (const n of ABOUT_SOCIAL_NETWORKS) {
    const v = k.socials[n]
    if (!v) continue
    let ok = false
    try { const u = new URL(v); ok = u.protocol === 'https:' && SOCIAL_HOSTS[n].test(u.hostname) && u.pathname.length > 1 } catch { ok = false }
    if (!ok || v.length > ABOUT_LIMITS.short) e[`contact.socials.${n}`] = `Usa el enlace https del perfil de ${n === 'tiktok' ? 'TikTok' : n === 'facebook' ? 'Facebook' : 'Instagram'}.`
  }
  if (k.map.enabled && (!k.address || !k.city)) e['contact.map'] = 'Para mostrar el mapa se necesitan al menos la dirección y la ciudad.'
  return e
}

/** Vista pública: solo las preguntas activas y completas. */
export function aboutPublicView(c: AboutContent): AboutContent {
  return { ...c, faqs: c.faqs.filter(f => f.active && f.question && f.answer) }
}

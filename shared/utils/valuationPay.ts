// Datos básicos del formulario de pago de la valoración (/financiacion): nombre, cédula, celular y correo. Módulo PURO (sin imports): lo usan el
// formulario, el servidor (que repite la validación: el navegador no es de fiar) y las pruebas.

export interface ValuationPayContact { name: string, document: string, phone: string, email: string, accept: boolean }
export type ValuationPayErrors = Partial<Record<keyof ValuationPayContact, string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const text = (v: unknown) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '')

/** Cédula: solo se aceptan dígitos con separadores habituales (puntos, espacios o guiones); se guarda solo con dígitos. */
export function normalizeDocument(v: unknown): string {
  const raw = text(v)
  return /^[\d.\s-]+$/.test(raw) ? raw.replace(/\D/g, '') : raw
}
export const isValidDocument = (d: string) => /^\d{5,12}$/.test(d)

export function normalizeValuationPay(body: unknown): ValuationPayContact {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  return { name: text(b.name), document: normalizeDocument(b.document), phone: text(b.phone), email: text(b.email), accept: b.accept === true }
}

export function validateValuationPay(v: ValuationPayContact): ValuationPayErrors {
  const e: ValuationPayErrors = {}
  if (!v.name) e.name = 'Ingresa tu nombre.'
  else if (v.name.length < 2 || v.name.length > 100) e.name = 'Ingresa tu nombre (entre 2 y 100 caracteres).'

  if (!v.document) e.document = 'Ingresa tu número de cédula.'
  else if (!isValidDocument(v.document)) e.document = 'Ingresa un número de cédula válido (solo números).'

  const digits = v.phone.replace(/\D/g, '')
  if (!v.phone) e.phone = 'Ingresa tu número de celular.'
  else if (digits.length < 7 || digits.length > 15 || !/^[+\d\s()-]+$/.test(v.phone)) e.phone = 'Ingresa un número de celular válido.'

  if (!v.email) e.email = 'Ingresa tu correo.'
  else if (v.email.length > 150 || !EMAIL_RE.test(v.email)) e.email = 'Ingresa un correo válido.'

  if (!v.accept) e.accept = 'Debes aceptar la política de tratamiento de datos personales para continuar.'
  return e
}

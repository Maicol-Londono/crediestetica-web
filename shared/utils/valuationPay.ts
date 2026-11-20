// Datos básicos del formulario de pago de la valoración (/financiacion): nombre, celular y correo. Módulo PURO (sin imports): lo usan el
// formulario y las pruebas. La validación del servidor deberá repetirse cuando se conecte el check-out (el navegador no es de fiar).

export interface ValuationPayContact { name: string, phone: string, email: string, accept: boolean }
export type ValuationPayErrors = Partial<Record<keyof ValuationPayContact, string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const text = (v: unknown) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '')

export function normalizeValuationPay(body: unknown): ValuationPayContact {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  return { name: text(b.name), phone: text(b.phone), email: text(b.email), accept: b.accept === true }
}

export function validateValuationPay(v: ValuationPayContact): ValuationPayErrors {
  const e: ValuationPayErrors = {}
  if (!v.name) e.name = 'Ingresa tu nombre.'
  else if (v.name.length < 2 || v.name.length > 100) e.name = 'Ingresa tu nombre (entre 2 y 100 caracteres).'

  const digits = v.phone.replace(/\D/g, '')
  if (!v.phone) e.phone = 'Ingresa tu número de celular.'
  else if (digits.length < 7 || digits.length > 15 || !/^[+\d\s()-]+$/.test(v.phone)) e.phone = 'Ingresa un número de celular válido.'

  if (!v.email) e.email = 'Ingresa tu correo.'
  else if (v.email.length > 150 || !EMAIL_RE.test(v.email)) e.email = 'Ingresa un correo válido.'

  if (!v.accept) e.accept = 'Debes aceptar la política de tratamiento de datos personales para continuar.'
  return e
}

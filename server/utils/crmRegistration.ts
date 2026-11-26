// Registro en el CRM Médico de los formularios que además se envían por CORREO: «Estudio de créditos» y «Solicitud de financiación». SOLO servidor.
// Reutiliza el cliente de la valoración (./crmClient): misma sesión, token, campos, confirmación y traza. La valoración NO pasa por aquí.
//  · El correo sale SIEMPRE primero (con sus adjuntos): una falla del CRM no pierde la solicitud. Si el correo falla, no se llama al CRM.
//  · Éxito para el usuario SOLO si, además, el CRM confirma. El correo nunca sustituye al registro.
//  · Sin reintentos automáticos. Si la persona reenvía tras un rechazo, el correo repetido no se vuelve a enviar y se intenta de nuevo el CRM;
//    tras un resultado incierto o un 5xx NO se repite el envío al CRM durante 24 horas.
//  · Los guardas guardan solo huellas SHA-256 en la memoria de este proceso (se pierden al reiniciar).

import { createHash } from 'node:crypto'
import { PROCEDIMIENTOS, type CreditValues } from '#shared/utils/creditStudy'
import type { LeadValues } from '#shared/utils/leadForm'
import { PAYMENT_OPTIONS, type ValuationInput } from '#shared/utils/valuation'

import { registerCrmClient, resolveCrmClientConfig, type CrmClientResult } from './crmClient'

/** Ambos formularios son solicitudes de financiación: se usa esa opción del contrato del CRM. */
const FINANCING = PAYMENT_OPTIONS[1].label

/** Mismo contenido que acepta el CRM para la valoración. Lo que el formulario no recoge o la persona no informa viaja VACÍO. */
export type CrmApplicant = ValuationInput

/** La cédula se escribe a veces con puntos o espacios: se quitan, sin cambiar nada más. */
const documentNumber = (s: string) => s.replace(/[\s.,]/g, '')
const joined = (...parts: string[]) => parts.map(p => p.trim()).filter(Boolean).join(' ')

/** Estudio de créditos (valores ya normalizados y validados, con la autorización aceptada). */
export function creditStudyCrmApplicant(values: CreditValues, accepted: boolean): CrmApplicant {
  const v = (id: string) => String(values[id] ?? '').trim()
  return {
    nombres: joined(v('primer-nombre'), v('segundo-nombre')),
    apellidos: joined(v('primer-apellido'), v('segundo-apellido')),
    identificacion: documentNumber(v('numero-documento')),
    fecha_nacimiento: v('fecha-nacimiento'),
    // El formulario no tiene un campo solo de ciudad: «Barrio / ciudad» de la residencia es el dato disponible.
    direccion: v('barrio-residencia'),
    telefono: v('celular'),
    email: v('email'),
    name_surgery: PROCEDIMIENTOS.filter(p => values[`proc-${p}`] === true).join(', '),
    forma_pago: FINANCING,
    accept: accepted
  }
}

/** Solicitud de financiación (valores ya validados: la autorización es obligatoria). */
export function leadCrmApplicant(v: LeadValues): CrmApplicant {
  const meta = (k: string) => String(v.meta[k] ?? '')
  return {
    nombres: v.first_name,
    apellidos: v.last_name,
    identificacion: documentNumber(meta('doc_number')),
    fecha_nacimiento: meta('birth_date'),
    // Solo la ciudad de residencia informada. La «Ciudad» del formulario no es la residencia: si falta, viaja vacío.
    direccion: meta('residence_city'),
    telefono: v.phone,
    email: v.email,
    name_surgery: v.procedure_name,
    forma_pago: FINANCING,
    accept: v.accepted_habeas_data
  }
}

const CONFIRMED_WINDOW_MS = 10 * 60_000 // igual que la ventana de correo duplicado de ./formMail
const UNCERTAIN_WINDOW_MS = 24 * 60 * 60_000
const MAX_TRACKED = 5000

const inflight = new Set<string>()
const confirmed = new Map<string, number>()
const uncertain = new Map<string, number>()

/** Solo pruebas: vacía el estado en memoria. */
export function resetCrmRegistrationGuards() {
  inflight.clear()
  confirmed.clear()
  uncertain.clear()
}

/** Cédula + teléfono. Sin cédula (opcional en un formulario) se distingue además por el nombre: un teléfono puede ser compartido. */
function guardKey(form: string, a: CrmApplicant): string {
  const phone = a.telefono.replace(/\D/g, '').replace(/^57(?=3\d{9}$)/, '')
  const who = a.identificacion ? [a.identificacion, phone] : [phone, a.nombres, a.apellidos]
  return createHash('sha256').update([form, ...who].join('|').toUpperCase()).digest('hex')
}

function remember(map: Map<string, number>, key: string, ttl: number) {
  const now = Date.now()
  if (map.size > MAX_TRACKED) for (const [k, t] of map) if (now - t >= ttl) map.delete(k)
  map.set(key, now)
}

function fail(statusCode: number, message: string, data: Record<string, unknown> = {}): never {
  throw createError({ statusCode, message, data: { message, ...data } })
}

const MSG_IN_PROGRESS = 'Ya estamos procesando tu solicitud. Espera unos segundos.'
const MSG_UNCERTAIN = 'Recibimos tu información, pero no pudimos confirmar tu registro. Antes de reenviar, comunícate con nosotros para evitar duplicados.'
const MSG_RETRY = 'Recibimos tu información, pero no pudimos completar tu registro. Inténtalo de nuevo en unos minutos.'
const MSG_CONTACT = 'Recibimos tu información, pero no pudimos completar tu registro. Comunícate con nosotros para finalizar tu solicitud.'

/** Respuesta de la ruta cuando el CRM no confirma (el correo ya salió). El cuerpo del CRM no se repite al navegador. */
function failFromCrm(result: CrmClientResult): never {
  if (result.state === 'unknown') {
    if (result.reason === 'timeout') fail(504, MSG_UNCERTAIN, { reason: 'timeout', uncertain: true })
    if (result.reason === 'no_response') fail(503, MSG_UNCERTAIN, { reason: 'network', uncertain: true })
    fail(502, MSG_UNCERTAIN, { reason: result.reason === 'unconfirmed_response' ? 'unconfirmed' : 'crm_error', uncertain: true })
  }
  if (result.reason === 'internal_error') fail(500, MSG_CONTACT, { reason: 'internal_error' })
  if (result.reason.startsWith('session_')) fail(503, MSG_RETRY, { reason: 'crm_session' })
  if (result.reason === 'no_connection') fail(503, MSG_RETRY, { reason: 'network' })
  if (result.status === 422) fail(422, MSG_CONTACT, { reason: 'crm_validation' })
  if (result.reason === 'http_retryable') fail(502, MSG_RETRY, { reason: 'crm_error' })
  if (result.reason === 'http_server_error') fail(502, MSG_UNCERTAIN, { reason: 'crm_error', uncertain: true })
  fail(502, MSG_CONTACT, { reason: 'crm_error' })
}

/**
 * Envía el correo (`send`, que lanza si el SMTP no lo acepta) y después registra al solicitante en el CRM.
 * Devuelve { ok: true } solo con ambas confirmaciones.
 */
export async function sendMailAndRegisterInCrm(opts: {
  tag: string
  runtime: Record<string, unknown>
  applicant: CrmApplicant
  send: () => Promise<unknown>
}): Promise<{ ok: true }> {
  const { tag, applicant } = opts
  const key = guardKey(tag, applicant)
  if (inflight.has(key)) fail(409, MSG_IN_PROGRESS, { reason: 'duplicate' })

  inflight.add(key)
  try {
    // 1) Correo. Un 409 «duplicate» significa que ese mismo contenido ya se entregó: se sigue hacia el CRM sin repetirlo.
    let repeated: unknown
    try {
      await opts.send()
    } catch (e: any) {
      if (e?.statusCode !== 409 || e?.data?.reason !== 'duplicate') throw e
      repeated = e
    }

    // 2) CRM.
    const done = confirmed.get(key)
    if (done && Date.now() - done < CONFIRMED_WINDOW_MS) {
      if (repeated) throw repeated
      return { ok: true }
    }
    const doubt = uncertain.get(key)
    if (doubt && Date.now() - doubt < UNCERTAIN_WINDOW_MS) fail(409, MSG_UNCERTAIN, { reason: 'duplicate', uncertain: true })

    const crm = resolveCrmClientConfig(opts.runtime)
    if (!crm.ok) {
      console.error(`[${tag}] registro en el CRM no configurado (${crm.invalid.join(', ')})`)
      fail(503, MSG_CONTACT, { reason: 'not_configured' })
    }

    const result = await registerCrmClient(crm.config, applicant, tag)
    if (result.state !== 'sent') {
      console.error(`[${tag}] CRM: ${result.state} (${result.reason}${result.status ? `, HTTP ${result.status}` : ''})`)
      // Un 5xx pudo ocurrir después de guardar: tampoco se permite repetir.
      if (result.state === 'unknown' || result.reason === 'http_server_error') remember(uncertain, key, UNCERTAIN_WINDOW_MS)
      failFromCrm(result)
    }
    remember(confirmed, key, CONFIRMED_WINDOW_MS)
    return { ok: true }
  } finally {
    inflight.delete(key)
  }
}

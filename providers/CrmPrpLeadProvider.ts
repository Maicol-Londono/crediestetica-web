import type { PrpLeadProvider } from './PrpLeadProvider'
import { crmDestinationProblem, MSG_CRM_UNAVAILABLE } from '#shared/utils/crmDestination'
import { PrpLeadError, type PrpLeadInput } from '~/types/prpPublic'
import { PRP_SUBMIT_ENABLED } from '#shared/utils/features'
import { useRuntimeConfig } from '#imports'

// Envío DIRECTO navegador -> CRM médico externo (sin Wellezy Hub ni proxy), con el contrato ya validado:
// multipart/form-data, sin _token. La URL sale de runtimeConfig.public.crmPrpFormUrl.

const TIMEOUT_MS = 20_000

// Valores fijos del formulario web de PRP.
const STATE = 'No Contactada'
const ORIGIN = 'Formulario Web'

// Identificador de la línea Crediestética en el CRM médico (compartido con Planmed, que usa otro). Es un id EXTERNO del CRM: no es `linea_id` (4) ni
// `company_id` (16) de Wellezy Hub y no se deduce de ellos. Valor fijo confirmado por el responsable del CRM. `code_prp` sigue llegando de Hub.
export const CRM_PRP_ID_LINE = '30'

export function buildPrpLeadFormData(lead: PrpLeadInput): FormData {
  const form = new FormData()
  form.append('nombres', lead.fullName.trim())
  form.append('telefono', lead.phone.trim())
  form.append('direccion', lead.city.trim())
  form.append('name_surgery', lead.surgery.trim())
  form.append('state', STATE)
  form.append('origen', ORIGIN)
  form.append('code_prp', lead.codePrp)
  form.append('accept', '1')
  form.append('id_line', CRM_PRP_ID_LINE)
  return form
}

export class CrmPrpLeadProvider implements PrpLeadProvider {
  async submit(lead: PrpLeadInput): Promise<void> {
    // Envío PRP desactivado (PRP_SUBMIT_ENABLED, shared/utils/features.ts): nada sale hacia el CRM aunque alguien invoque el proveedor. Va ANTES de leer la URL.
    if (!PRP_SUBMIT_ENABLED) throw new PrpLeadError('server', MSG_CRM_UNAVAILABLE)
    const url = String(useRuntimeConfig().public.crmPrpFormUrl || '')
    // Defensa en profundidad (la autoridad es el servidor: /api/public/prp/[slug] no sirve el micrositio con un destino bloqueado).
    if (crmDestinationProblem(url)) throw new PrpLeadError('server', MSG_CRM_UNAVAILABLE)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    let res: Response
    try {
      // Sin Content-Type manual: el navegador agrega el boundary del multipart.
      res = await fetch(url, {
        method: 'POST',
        body: buildPrpLeadFormData(lead),
        headers: { Accept: 'application/json' },
        signal: controller.signal
      })
    } catch {
      throw new PrpLeadError('network', 'No pudimos conectar para enviar tus datos.')
    } finally {
      clearTimeout(timer)
    }

    if (res.status === 422) throw new PrpLeadError('validation', 'Revisa los datos ingresados.', 422)
    if (!res.ok) throw new PrpLeadError('server', 'No pudimos registrar tus datos.', res.status)

    // 2xx no basta: el CRM confirma con un JSON de éxito ("mensagge", como lo devuelve hoy).
    const body: any = await res.json().catch(() => null)
    const confirmation = body && typeof body === 'object' ? (body.mensagge ?? body.message) : null
    if (typeof confirmation !== 'string' || !confirmation) {
      throw new PrpLeadError('unexpected', 'No recibimos la confirmación del registro.', res.status)
    }
  }
}

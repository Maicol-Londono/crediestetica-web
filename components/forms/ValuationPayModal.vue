<template>
  <div>
    <button type="button" ref="trigger" class="mt-6 inline-flex items-center justify-center min-h-[3.25rem] px-8 py-3 rounded-full bg-[#111111] text-white text-xs font-bold tracking-[0.15em] uppercase hover:bg-[#333333] active:scale-95 transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#CBA36B]" aria-haspopup="dialog" data-testid="valuation-pay" @click="open">Pagar mi valoración</button>

    <div v-if="isOpen" v-show="!widgetOpen" class="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 text-left" @click.self="close" @keydown.esc="close">
      <div ref="dialog" role="dialog" aria-modal="true" aria-labelledby="vpay-title" tabindex="-1" class="relative bg-white w-full max-w-md max-h-[92dvh] flex flex-col shadow-2xl border border-[#E7DDD1] focus:outline-none">
        <button type="button" class="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600" aria-label="Cerrar" @click="close">✕</button>

        <!-- Resultado del pago: éxito por nombre, verificación en curso o pendiente. -->
        <div v-if="view !== 'form'" class="px-6 py-10 text-center" role="status" aria-live="polite" data-testid="valuation-pay-result">
          <template v-if="view === 'success'">
            <h2 id="vpay-title" class="font-serif text-2xl text-[#111111]">¡Pago exitoso!</h2>
            <p class="text-sm text-gray-700 mt-3 leading-relaxed" data-testid="valuation-pay-success">Hola {{ firstName }}, tu pago de la valoración fue exitoso. Pronto una de nuestras asesoras se pondrá en contacto contigo.</p>
            <button type="button" class="mt-6 bg-[#111111] hover:bg-[#333333] text-white px-10 py-3 text-xs font-bold tracking-widest uppercase transition-colors" @click="close">Cerrar</button>
          </template>
          <template v-else-if="view === 'pending'">
            <h2 id="vpay-title" class="font-serif text-2xl text-[#111111]">Estamos verificando tu pago</h2>
            <p class="text-sm text-gray-700 mt-3 leading-relaxed" data-testid="valuation-pay-pending">Tu pago todavía no aparece confirmado. No vuelvas a pagar: si fue aprobado, una asesora te contactará. También puedes escribirnos por WhatsApp.</p>
            <a :href="whatsappHref" target="_blank" rel="noopener noreferrer" class="mt-5 inline-flex items-center min-h-[44px] bg-[#111111] text-white px-5 text-[11px] font-bold tracking-widest uppercase hover:bg-[#333333] transition-colors">Escribir por WhatsApp<span class="sr-only"> (se abre en una pestaña nueva)</span></a>
          </template>
          <template v-else>
            <h2 id="vpay-title" class="font-serif text-2xl text-[#111111]">Verificando tu pago…</h2>
            <p class="text-sm text-gray-600 mt-3">Un momento, estamos confirmando la transacción.</p>
          </template>
        </div>

        <template v-else>
        <div class="px-6 pt-6 pb-4 border-b border-[#E7DDD1] shrink-0">
          <h2 id="vpay-title" class="font-serif text-2xl text-[#111111] pr-8">Paga tu valoración</h2>
          <p class="text-sm text-gray-600 mt-1">Déjanos tus datos y continúa al pago de <strong>{{ price }}</strong>.</p>
        </div>

        <form novalidate class="flex flex-col min-h-0" data-testid="valuation-pay-form" @submit.prevent="onSubmit">
          <div class="overflow-y-auto overscroll-contain px-6 py-5 space-y-4">
            <!-- Si el pago en línea falla se informa con claridad (sin cobro) y se deja el acceso directo a WhatsApp. -->
            <div v-if="unavailable" role="alert" data-testid="valuation-pay-unavailable" class="border border-[#CBA36B] border-l-4 bg-[#F7F3EE] text-[#111111] px-4 py-3 text-xs leading-relaxed">
              {{ unavailableMessage }}
              <a :href="whatsappHref" target="_blank" rel="noopener noreferrer" class="mt-3 inline-flex items-center min-h-[44px] bg-[#111111] text-white px-5 text-[11px] font-bold tracking-widest uppercase hover:bg-[#333333] transition-colors" data-testid="valuation-pay-whatsapp">Escribir por WhatsApp<span class="sr-only"> (se abre en una pestaña nueva)</span></a>
            </div>

            <div v-for="f in fields" :key="f.key">
              <label :for="`vpay-${f.key}`" class="block text-sm font-semibold text-[#4c4546] mb-1.5">{{ f.label }}<span aria-hidden="true"> *</span><span class="sr-only"> (obligatorio)</span></label>
              <input :id="`vpay-${f.key}`" v-model="values[f.key]" class="field" :type="f.type" :inputmode="f.inputmode" :autocomplete="f.autocomplete" :maxlength="f.maxlength" required :aria-invalid="!!errors[f.key]" />
              <p v-if="errors[f.key]" class="text-red-600 text-xs mt-1" :data-testid="`vpay-error-${f.key}`">{{ errors[f.key] }}</p>
            </div>

            <div class="pt-1">
              <div class="flex items-start gap-3">
                <input id="vpay-accept" v-model="values.accept" type="checkbox" class="mt-1 w-4 h-4 accent-[#111111]" :aria-invalid="!!errors.accept" />
                <label for="vpay-accept" class="text-sm text-gray-600 leading-relaxed">He leído y acepto las Políticas de Tratamiento de Datos Personales <LegalDocLink doc="politicaDatos" class="text-[#111111] font-semibold underline underline-offset-2" /></label>
              </div>
              <p v-if="errors.accept" class="text-red-600 text-xs mt-1 font-bold" data-testid="vpay-error-accept">{{ errors.accept }}</p>
            </div>
          </div>

          <div class="px-6 py-4 border-t border-[#E7DDD1] bg-[#F7F3EE] shrink-0 flex justify-center">
            <button type="submit" data-testid="valuation-pay-submit" :disabled="submitting" class="bg-[#111111] hover:bg-[#333333] disabled:opacity-60 disabled:cursor-not-allowed text-white px-10 py-3 text-xs font-bold tracking-widest uppercase transition-colors">{{ submitting ? 'Preparando el pago…' : 'Ir a pagar' }}</button>
          </div>
        </form>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import LegalDocLink from '~/components/legal/LegalDocLink.vue'
// Formulario previo al pago de la valoración: nombre, celular y correo (solo en memoria mientras está abierto). «Ir a pagar» valida los datos;
// luego pide el checkout al servidor (que habla con el Hub), abre el widget de Wompi y confirma el pago; el correo con el comprobante lo envía el servidor.
import { ref, reactive, computed, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'
import { whatsappUrlWithText } from '#shared/utils/contact'
import { normalizeValuationPay, validateValuationPay, valuationAttemptFingerprint, pickAttempt, type StoredAttempt, type ValuationPayContact, type ValuationPayErrors } from '#shared/utils/valuationPay'

defineProps<{ price: string }>()

// WhatsApp oficial (shared/utils/contact.ts) como acceso directo si el pago en línea falla.
const whatsappHref = whatsappUrlWithText('Hola, quiero pagar mi valoración y necesito ayuda con el pago en línea.')

type FieldKey = Exclude<keyof ValuationPayContact, 'accept'>
const fields: Array<{ key: FieldKey, label: string, type: string, inputmode: 'text' | 'numeric' | 'tel' | 'email', autocomplete: string, maxlength: number }> = [
  { key: 'name', label: 'Nombre completo', type: 'text', inputmode: 'text', autocomplete: 'name', maxlength: 100 },
  { key: 'document', label: 'Número de cédula', type: 'text', inputmode: 'numeric', autocomplete: 'off', maxlength: 15 },
  { key: 'phone', label: 'Celular', type: 'tel', inputmode: 'tel', autocomplete: 'tel', maxlength: 20 },
  { key: 'email', label: 'Correo electrónico', type: 'email', inputmode: 'email', autocomplete: 'email', maxlength: 150 }
]

const values = reactive<ValuationPayContact>({ name: '', document: '', phone: '', email: '', accept: false })
const errors = reactive<ValuationPayErrors>({})
const unavailable = ref(false)
const isOpen = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)
const dialog = ref<HTMLElement | null>(null)

const DEFAULT_UNAVAILABLE = 'El pago en línea no está disponible en este momento. No se realizó ningún cobro. Escríbenos por WhatsApp y una asesora te ayudará.'
const unavailableMessage = ref(DEFAULT_UNAVAILABLE)
const submitting = ref(false)
const widgetOpen = ref(false)
const view = ref<'form' | 'verifying' | 'success' | 'pending'>('form')
const paidName = ref('')
const firstName = computed(() => paidName.value.trim().split(/\s+/)[0] || 'paciente')

// Un identificador por envío del formulario: reintentar (doble clic, red, recarga, cerrar el widget) con los mismos datos no crea otra valoración ni otro cobro
// en el Hub. Se guarda en la pestaña atado a los datos enviados y con vigencia corta (pickAttempt); un pago aprobado lo descarta.
const ATTEMPT_STORE_KEY = 'valuation-pay:attempt'
const attemptStore = {
  get: (): unknown => { try { return JSON.parse(sessionStorage.getItem(ATTEMPT_STORE_KEY) || 'null') } catch { return null } },
  set: (a: StoredAttempt) => { try { sessionStorage.setItem(ATTEMPT_STORE_KEY, JSON.stringify(a)) } catch { /* sin almacenamiento: solo se pierde la reanudación tras recargar */ } },
  clear: () => { try { sessionStorage.removeItem(ATTEMPT_STORE_KEY) } catch { /* nada */ } }
}
const newAttempt = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`)
const STORE_KEY = 'valuation-pay:payment'
// Pago en curso en esta pestaña: solo el id del pago en el Hub (sin datos personales). La cédula ya viaja al Hub en el checkout.
const store = {
  get: (): { uuid: string } | null => {
    try {
      const p = JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null')
      return p && typeof p.uuid === 'string' ? { uuid: p.uuid } : null
    } catch { return null }
  },
  set: (uuid: string) => { try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ uuid })) } catch { /* sin almacenamiento: solo se pierde la reanudación tras redirección */ } },
  clear: () => { try { sessionStorage.removeItem(STORE_KEY) } catch { /* nada */ } }
}

function fail(message?: string) {
  unavailableMessage.value = message || DEFAULT_UNAVAILABLE
  unavailable.value = true
}

function loadWidget(): Promise<void> {
  const w = window as any
  if (w.WidgetCheckout) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.wompi.co/widget.js'
    s.async = true
    s.onload = () => (w.WidgetCheckout ? resolve() : reject(new Error('widget')))
    s.onerror = () => reject(new Error('widget'))
    document.head.appendChild(s)
  })
}

interface ConfirmResult { status: string, name?: string }

// La aprobación la decide el Hub (consulta a Wompi con su llave privada) y él mismo ejecuta el correo a Convenios y el alta en el CRM: esta consulta es solo
// para mostrar el resultado y NO es necesaria para completar el pago administrativamente.
async function confirm(paymentUuid: string, transactionId?: string): Promise<ConfirmResult | null> {
  for (let i = 0; i < 5; i++) {
    try {
      const res = await $fetch<ConfirmResult>('/api/forms/valuation-payment/confirm', { method: 'POST', body: { payment_uuid: paymentUuid, ...(transactionId ? { transaction_id: transactionId } : {}) } })
      if (res.status !== 'PENDING') return res
      if (i < 4) await new Promise(r => setTimeout(r, 3000))
      else return res
    } catch {
      return null
    }
  }
  return null
}

async function finish(paymentUuid: string, transactionId?: string) {
  view.value = 'verifying'
  isOpen.value = true
  const res = await confirm(paymentUuid, transactionId)
  if (res?.status === 'APPROVED') {
    store.clear()
    attemptStore.clear()
    paidName.value = res.name || values.name
    view.value = 'success'
  } else if (res && ['DECLINED', 'ERROR', 'VOIDED'].includes(res.status)) {
    store.clear()
    view.value = 'form'
    fail('El pago no fue aprobado y no se realizó ningún cobro. Puedes intentarlo de nuevo o escribirnos por WhatsApp.')
  } else {
    view.value = 'pending'
  }
}

async function goToPay(contact: ValuationPayContact) {
  submitting.value = true
  try {
    const picked = pickAttempt(attemptStore.get(), valuationAttemptFingerprint(contact), Date.now(), newAttempt)
    attemptStore.set(picked)
    const attempt = picked.key
    const res = await $fetch<{ payment_uuid: string, checkout: { public_key: string, reference: string, amount_in_cents: number, currency: string, signature_integrity: string, redirect_url: string | null } }>(
      '/api/forms/valuation-payment/checkout',
      { method: 'POST', body: { name: contact.name, document: contact.document, phone: contact.phone, email: contact.email, accept: contact.accept, attempt } }
    )
    paidName.value = contact.name
    store.set(res.payment_uuid)
    await loadWidget()
    const c = res.checkout
    const checkout = new (window as any).WidgetCheckout({
      currency: c.currency,
      amountInCents: c.amount_in_cents,
      reference: c.reference,
      publicKey: c.public_key,
      signature: { integrity: c.signature_integrity },
      ...(c.redirect_url ? { redirectUrl: c.redirect_url } : {}),
      customerData: { email: contact.email, fullName: contact.name, phoneNumber: contact.phone.replace(/\D/g, '').slice(-10), phoneNumberPrefix: '+57' }
    })
    widgetOpen.value = true
    checkout.open((result: { transaction?: { id?: string } }) => {
      widgetOpen.value = false
      const tx = result?.transaction?.id
      if (tx) void finish(res.payment_uuid, tx)
    })
  } catch (e: any) {
    widgetOpen.value = false
    const status = e?.statusCode ?? e?.data?.statusCode
    // Mensajes del servidor ya son seguros y en español (validación, límite de intentos, reintento); el resto cae al aviso genérico.
    fail([409, 422, 429].includes(status) ? e?.data?.message : undefined)
  } finally {
    submitting.value = false
  }
}

function onSubmit() {
  for (const k of Object.keys(errors)) delete (errors as Record<string, unknown>)[k]
  unavailable.value = false
  if (submitting.value) return
  const contact = normalizeValuationPay({ ...values })
  const found = validateValuationPay(contact)
  if (Object.keys(found).length) { Object.assign(errors, found); return }
  void goToPay(contact)
}

// Regreso desde Wompi (métodos con redirección): `?id=<transacción>` + el pago guardado en esta pestaña. La URL no prueba nada: se confirma con el Hub.
const route = useRoute()
onMounted(() => {
  const id = typeof route.query.id === 'string' ? route.query.id : ''
  const stored = store.get()
  if (id && stored) void finish(stored.uuid, id)
})

async function open() {
  isOpen.value = true
  await nextTick()
  dialog.value?.focus()
}
function close() {
  isOpen.value = false
  trigger.value?.focus()
}

// Bloquea el scroll de la página mientras la ventana está abierta y mantiene el foco dentro (Tab / Shift+Tab).
function trap(e: KeyboardEvent) {
  if (e.key !== 'Tab' || !dialog.value) return
  const items = Array.from(dialog.value.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea')).filter(el => !el.hasAttribute('disabled'))
  if (!items.length) return
  const first = items[0]!, last = items[items.length - 1]!
  if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
}
// Mientras el widget de Wompi está abierto se libera el bloqueo: su formulario es más alto que muchas ventanas y hay que poder desplazar la página para verlo completo.
watch([isOpen, widgetOpen], ([open, widget]) => {
  const locked = open && !widget
  document.body.style.overflow = locked ? 'hidden' : ''
  if (locked) document.addEventListener('keydown', trap)
  else document.removeEventListener('keydown', trap)
})
onBeforeUnmount(() => { document.body.style.overflow = ''; document.removeEventListener('keydown', trap) })
</script>

<style scoped>
.field { width: 100%; min-height: 2.5rem; padding: 0 .75rem; background: #fff; border: 1px solid #cfc4c5; border-radius: 3px; font-size: .875rem; color: #1c1b1b; }
.field:focus { outline: 2px solid #111111; outline-offset: 0; border-color: #111111; }
.field[aria-invalid="true"] { border-color: #dc2626; }
</style>

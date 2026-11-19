<template>
  <!-- -mt-20 pt-20: el fondo marfil cubre también el espacio que el layout reserva bajo el menú fijo (sin franja blanca). -->
  <div class="-mt-20 pt-20 bg-[#F7F3EE] min-h-screen font-sans selection:bg-[#111111] selection:text-white">
    <CommonHubUnavailable v-if="error" :retrying="status === 'pending'" class="max-w-[1000px] mx-auto px-6 py-24" @retry="refresh()" />

    <template v-else-if="clinic">
      <!-- Cabecera: imagen principal y datos de la clínica -->
      <section class="max-w-[1200px] mx-auto px-6 md:px-12 pt-6 md:pt-10 pb-12 md:pb-16" aria-labelledby="clinic-title">
        <NuxtLink to="/clinicas-aliadas" class="inline-flex items-center gap-3 text-[11px] font-bold tracking-[0.15em] text-[#111111]/60 hover:text-[#111111] transition-colors uppercase mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Volver a clínicas aliadas
        </NuxtLink>
        <div class="grid md:grid-cols-5 gap-8 lg:gap-14 items-center">
          <div class="md:col-span-3">
            <img :src="clinic.image" :alt="`Imagen de ${clinic.name}`" width="1200" height="900" fetchpriority="high" class="w-full aspect-[4/3] object-cover rounded-2xl shadow-xl bg-[#111111]" />
          </div>
          <div class="md:col-span-2">
            <p class="inline-block bg-[#CBA36B] text-[#111111] px-4 py-1.5 rounded-full font-bold text-xs mb-5">Clínica aliada</p>
            <h1 id="clinic-title" class="font-serif text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#111111] leading-tight break-words">{{ clinic.name }}</h1>
            <dl v-if="hasContact" class="mt-7 space-y-3 text-[15px] text-gray-700" :data-testid="`clinic-contact-${clinic.id}`">
              <div v-if="clinic.address"><dt class="label">Dirección</dt><dd class="break-words">{{ clinic.address }}</dd></div>
              <div v-if="clinic.phone"><dt class="label">Teléfono</dt><dd><a :href="`tel:${clinic.phone.replace(/[^\d+]/g, '')}`" class="underline underline-offset-2 hover:text-[#111111]">{{ clinic.phone }}</a></dd></div>
              <div v-if="clinic.email"><dt class="label">Correo electrónico</dt><dd><a :href="`mailto:${clinic.email}`" class="underline underline-offset-2 hover:text-[#111111] break-all">{{ clinic.email }}</a></dd></div>
              <div v-if="clinic.website"><dt class="label">Sitio web</dt><dd><a :href="clinic.website" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2 hover:text-[#111111] break-all">{{ clinic.website }}<span class="sr-only"> (se abre en una pestaña nueva)</span></a></dd></div>
            </dl>
            <div v-if="hasContact" class="mt-7 flex flex-wrap gap-3">
              <a v-if="clinic.address" :href="mapsUrl" target="_blank" rel="noopener noreferrer" class="btn btn-dark">Cómo llegar<span class="sr-only"> (se abre en una pestaña nueva)</span></a>
              <a v-if="clinic.phone" :href="`tel:${clinic.phone.replace(/[^\d+]/g, '')}`" class="btn btn-outline">Llamar</a>
              <a v-if="clinic.website" :href="clinic.website" target="_blank" rel="noopener noreferrer" class="btn btn-outline">Visitar sitio<span class="sr-only"> (se abre en una pestaña nueva)</span></a>
            </div>
          </div>
        </div>
      </section>

      <!-- Descripción -->
      <section v-if="clinic.description" class="bg-white border-t border-[#E7DDD1]" aria-labelledby="clinic-about">
        <div class="max-w-[900px] mx-auto px-6 md:px-12 py-12 md:py-16">
          <h2 id="clinic-about" class="font-serif text-2xl md:text-3xl text-[#111111] mb-5">Sobre la clínica</h2>
          <CommonRichContent :html="clinic.description" class="text-gray-600 font-light text-lg leading-relaxed" />
        </div>
      </section>

      <!-- Galería con visor -->
      <section v-if="clinic.gallery.length" class="border-t border-[#E7DDD1]" aria-labelledby="clinic-gallery">
        <div class="max-w-[1200px] mx-auto px-6 md:px-12 py-12 md:py-16">
          <div class="flex items-end justify-between gap-4 mb-6">
            <h2 id="clinic-gallery" class="font-serif text-2xl md:text-3xl text-[#111111]">Galería</h2>
            <p class="text-sm text-gray-500">{{ clinic.gallery.length }} {{ clinic.gallery.length === 1 ? 'foto' : 'fotos' }}</p>
          </div>
          <!-- La primera imagen se destaca (2×2); el resto son miniaturas cuadradas, así las fotos verticales no se deforman. -->
          <ul class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <li v-for="(g, gi) in clinic.gallery" :key="g" :class="gi === 0 && clinic.gallery.length > 2 ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square'">
              <button type="button" class="block w-full h-full overflow-hidden rounded-xl bg-white focus-visible:outline-2 focus-visible:outline-[#CBA36B]" :aria-label="`Ampliar imagen ${gi + 1} de ${clinic.gallery.length} de ${clinic.name}`" @click="open(gi, $event)">
                <img :src="g" :alt="`${clinic.name}: imagen ${gi + 1}`" loading="lazy" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500 motion-reduce:transition-none" />
              </button>
            </li>
          </ul>
        </div>
      </section>

      <!-- Documentos -->
      <section v-if="clinic.documents.length" class="bg-[#EFE7DC] border-t border-[#E7DDD1]" aria-labelledby="clinic-docs">
        <div class="max-w-[1200px] mx-auto px-6 md:px-12 py-12 md:py-16">
          <h2 id="clinic-docs" class="font-serif text-2xl md:text-3xl text-[#111111] mb-6">Documentos y certificados</h2>
          <ul class="grid gap-4 md:grid-cols-2">
            <li v-for="d in clinic.documents" :key="d.id" class="bg-white border border-[#E7DDD1] rounded-xl p-5">
              <p class="font-semibold text-[#111111] break-words">{{ d.title }}</p>
              <ul class="mt-2 space-y-1">
                <li v-for="f in d.files" :key="f.url">
                  <a :href="f.url" target="_blank" rel="noopener noreferrer" class="text-sm text-gray-600 underline underline-offset-2 hover:text-[#111111] break-all">{{ f.name || 'Ver archivo' }}<span class="sr-only"> (se abre en una pestaña nueva)</span></a>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </section>

      <!-- Otras clínicas aliadas (solo si hay más de una) -->
      <section v-if="others.length" class="bg-white border-t border-[#E7DDD1]" aria-labelledby="clinic-others">
        <div class="max-w-[1200px] mx-auto px-6 md:px-12 py-12 md:py-16">
          <h2 id="clinic-others" class="font-serif text-2xl md:text-3xl text-[#111111] mb-6">Otras clínicas aliadas</h2>
          <ul class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <li v-for="o in others" :key="o.id">
              <NuxtLink :to="`/clinicas-aliadas/${o.id}`" class="group flex items-center gap-4 bg-[#F7F3EE] border border-[#E7DDD1] rounded-2xl p-3 hover:shadow-lg transition-shadow focus-visible:outline-2 focus-visible:outline-[#CBA36B]">
                <img :src="o.image" :alt="`Imagen de ${o.name}`" loading="lazy" class="w-24 h-24 rounded-xl object-cover shrink-0" />
                <span class="font-serif text-lg text-[#111111] group-hover:text-[#755A26] transition-colors break-words">{{ o.name }}</span>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </section>

      <!-- Cierre: tarjeta oscura sobre fondo marfil (no se funde con el pie de página negro) -->
      <section class="bg-[#F7F3EE]" aria-labelledby="clinic-cta">
        <div class="max-w-[1200px] mx-auto px-6 md:px-12 py-14 md:py-20">
          <div class="bg-[#111111] rounded-2xl shadow-xl border border-[#CBA36B]/30 px-8 py-12 md:px-16 md:py-14 text-center">
            <h2 id="clinic-cta" class="font-serif text-2xl md:text-4xl font-extrabold text-white leading-tight">¿Quieres conocer tus opciones?</h2>
            <p class="mt-4 max-w-2xl mx-auto text-[#BBB2AA] font-light text-[1.0625rem] leading-[1.75]">Simula tu financiación o recibe asesoría para resolver tus dudas. Cualquier procedimiento está sujeto a valoración médica y a la disponibilidad de cada institución.</p>
            <div class="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <a :href="advisoryUrl" target="_blank" rel="noopener noreferrer" class="btn btn-gold">Recibir asesoría<span class="sr-only"> (se abre en una pestaña nueva)</span></a>
              <NuxtLink to="/financiacion#calculadora" class="btn btn-outline-light">Simular financiación</NuxtLink>
            </div>
          </div>
        </div>
      </section>

      <!-- Visor de la galería: imagen ampliada con anterior/siguiente (sin salir de la página ni abrir pestañas) -->
      <div
        v-if="current"
        ref="dialog"
        class="fixed inset-0 z-[90] bg-black/90 flex items-center justify-center p-4 outline-none"
        role="dialog"
        aria-modal="true"
        :aria-label="`Galería de ${clinic.name}`"
        tabindex="-1"
        @click.self="close"
        @keydown="onKey"
        @touchstart.passive="touchX = $event.touches[0]?.clientX ?? null"
        @touchend.passive="onTouchEnd"
      >
        <button type="button" class="absolute top-4 right-4 text-white text-3xl leading-none px-3" aria-label="Cerrar" @click="close">×</button>
        <button v-if="current.total > 1" type="button" class="absolute left-2 md:left-6 text-white text-4xl px-3 py-6" aria-label="Imagen anterior" @click="step(-1)">‹</button>
        <img :src="current.url" :alt="`${clinic.name}: imagen ${current.index + 1}`" class="max-h-full max-w-full object-contain select-none" />
        <button v-if="current.total > 1" type="button" class="absolute right-2 md:right-6 text-white text-4xl px-3 py-6" aria-label="Imagen siguiente" @click="step(1)">›</button>
        <p class="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm" aria-live="polite">{{ current.index + 1 }} / {{ current.total }}</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// Detalle de una clínica aliada (administrada en /admin/paginas/clinicas-aliadas). Usa el mismo endpoint y clave de caché que la lista.
// Un id inexistente (o de una clínica oculta) responde 404.
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useFetch, useRoute, useSeoMeta, useHead, useSiteConfig, createError } from '#imports'
import { clinicsDefault, type ClinicsContent } from '#shared/utils/clinics'
import { whatsappUrlWithText } from '#shared/utils/contact'

const route = useRoute()
const id = String(route.params.id ?? '')
const { data, error, refresh, status } = await useFetch<ClinicsContent>('/api/public/clinics', { key: 'clinics-public', default: () => clinicsDefault() })
useServiceUnavailable(error)

const clinic = computed(() => data.value?.clinics.find(c => c.id === id) ?? null)
if (!error.value && !clinic.value) throw createError({ statusCode: 404, statusMessage: 'Clínica no encontrada', fatal: true })

const others = computed(() => (data.value?.clinics ?? []).filter(c => c.id !== id))
// «Cómo llegar»: búsqueda de la dirección guardada en Google Maps (sin clave de API ni datos nuevos).
const mapsUrl = computed(() => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${clinic.value?.name ?? ''} ${clinic.value?.address ?? ''}`.trim())}`)
const advisoryUrl = computed(() => whatsappUrlWithText(`Hola, quiero recibir asesoría. Vi la clínica aliada ${clinic.value?.name ?? ''} en Crediestética.`))
const hasContact = computed(() => !!(clinic.value && (clinic.value.website || clinic.value.phone || clinic.value.email || clinic.value.address)))

const plain = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
const title = computed(() => `${clinic.value?.name ?? 'Clínica aliada'} | Clínicas aliadas | Crediestética`)
const description = computed(() => plain(clinic.value?.description ?? '').slice(0, 160) || `Conoce a ${clinic.value?.name ?? 'nuestra clínica aliada'}, clínica aliada de Crediestética.`)
useSeoMeta({ title, ogTitle: title, description, ogDescription: description, ogType: 'website', ogImage: () => clinic.value?.image })
useHead({ link: [{ rel: 'canonical', href: `${String(useSiteConfig().url ?? '').replace(/\/+$/, '')}/clinicas-aliadas/${id}` }] })

// Visor de la galería
const active = ref<number | null>(null)
const dialog = ref<HTMLElement | null>(null)
const touchX = ref<number | null>(null)
let opener: HTMLElement | null = null

const current = computed(() => {
  const gallery = clinic.value?.gallery ?? []
  if (active.value === null || !gallery.length) return null
  const index = Math.min(active.value, gallery.length - 1)
  return { index, total: gallery.length, url: gallery[index] }
})

function open(index: number, e: Event) {
  opener = e.currentTarget as HTMLElement
  active.value = index
}
function close() {
  active.value = null
}
function step(dir: 1 | -1) {
  const c = current.value
  if (!c || c.total < 2) return
  active.value = (c.index + dir + c.total) % c.total
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowLeft') step(-1)
  else if (e.key === 'ArrowRight') step(1)
}
function onTouchEnd(e: TouchEvent) {
  const endX = e.changedTouches[0]?.clientX
  const startX = touchX.value
  touchX.value = null
  if (endX === undefined || startX === null) return
  const dx = endX - startX
  if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1)
}

// Bloquea el scroll de fondo mientras el visor está abierto, enfoca la ventana (teclado) y devuelve el foco a la miniatura al cerrar.
watch(() => !!current.value, async (isOpen) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = isOpen ? 'hidden' : ''
  if (isOpen) { await nextTick(); dialog.value?.focus() }
  else { opener?.focus(); opener = null }
})
onBeforeUnmount(() => { if (typeof document !== 'undefined') document.body.style.overflow = '' })
</script>

<style scoped>
.btn { display: inline-flex; align-items: center; justify-content: center; min-height: 3rem; padding: 0.8rem 1.6rem; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 9999px; text-align: center; transition: background-color 0.2s, color 0.2s, border-color 0.2s, transform 0.15s; }
.btn:active { transform: scale(0.97); }
.btn:focus-visible { outline: 2px solid #CBA36B; outline-offset: 3px; }
.btn-dark { background: #111111; color: #ffffff; }
.btn-dark:hover { background: #333333; }
.btn-outline { border: 1.5px solid #111111; color: #111111; }
.btn-outline:hover { background: #111111; color: #ffffff; }
.btn-gold { background: #CBA36B; color: #111111; }
.btn-gold:hover { background: #d9b37d; }
.btn-outline-light { border: 1.5px solid rgba(255, 255, 255, 0.7); color: #ffffff; }
.btn-outline-light:hover { background: #ffffff; color: #111111; }
@media (prefers-reduced-motion: reduce) { .btn { transition: none; } .btn:active { transform: none; } }
.label { font-size: 0.6875rem; letter-spacing: 0.15em; text-transform: uppercase; font-weight: 700; color: #755A26; margin-bottom: 0.15rem; }
</style>

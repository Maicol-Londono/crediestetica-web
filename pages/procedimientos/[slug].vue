<template>
  <!-- Detalle del procedimiento con la composición del original (hero dividido, secciones a ancho completo sobre marfil).
       Solo se pintan los bloques que tienen datos reales de Hub; ninguno se rellena con texto inventado. -->
  <div v-if="procedure" class="bg-[#F7F3EE] min-h-screen font-sans selection:bg-[#111111] selection:text-white">

    <!-- 1. HERO dividido: contenido + imagen (en móvil la imagen va primero) -->
    <header class="flex flex-col lg:flex-row lg:min-h-[600px] bg-[#F7F3EE]" data-testid="procedure-hero">
      <div class="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-16 lg:p-20 order-2 lg:order-1 bg-[#E7DDD1] lg:bg-[#F7F3EE]">
        <div class="max-w-xl w-full">
          <NuxtLink to="/procedimientos" class="inline-flex items-center gap-3 text-[11px] font-bold tracking-[0.15em] text-[#111111]/60 hover:text-[#111111] transition-colors uppercase mb-8 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Volver al portafolio
          </NuxtLink>
          <div class="block w-fit px-4 py-1.5 bg-[#111111] text-white rounded-full font-bold text-xs tracking-widest uppercase mb-6">
            {{ categoryLabel || 'PROCEDIMIENTO' }}
          </div>
          <h1 class="font-serif text-4xl md:text-5xl xl:text-6xl font-extrabold text-[#111111] mb-6 leading-tight tracking-tight break-words">{{ procedure.name }}</h1>
          <p v-if="procedure.shortDescription" class="text-lg md:text-xl text-[#111111]/80 mb-10 leading-relaxed font-light">{{ procedure.shortDescription }}</p>
          <NuxtLink
            :to="{ path: '/financiacion', query: { procedureId: procedure.id }, hash: '#calculadora' }"
            class="inline-flex w-full sm:w-auto justify-center bg-[#CBA36B] text-[#111111] px-8 py-4 rounded-full font-bold hover:bg-[#111111] hover:text-white transition-all active:scale-95 text-center cursor-pointer"
          >
            Simular financiación
          </NuxtLink>
        </div>
      </div>
      <div class="w-full lg:w-1/2 h-[350px] md:h-[450px] lg:h-auto order-1 lg:order-2 bg-[#BBB2AA]/30 flex items-center justify-center overflow-hidden">
        <img
          v-if="procedure.image"
          :src="procedure.image"
          :alt="procedure.name"
          class="w-full h-full object-cover object-[75%_20%] lg:object-center grayscale-0 [@media(hover:hover)]:grayscale [@media(hover:hover)]:hover:grayscale-0 transition-all duration-1000"
        />
        <span v-else class="text-[#111111]/50 text-xs font-medium tracking-widest uppercase text-center px-4">Imagen no disponible</span>
      </div>
    </header>

    <!-- 2. ¿QUÉ ES? texto con filete dorado + galería en carrusel (viene del detalle de Hub; sin imágenes no se muestra) -->
    <section v-if="hasIntro || galleryImages.length" class="py-20 md:py-32 bg-[#F7F3EE]" aria-labelledby="procedure-what-title">
      <div class="max-w-[1200px] mx-auto px-4 md:px-12 flex flex-col md:flex-row gap-16 lg:gap-24">
        <div class="flex flex-col min-w-0" :class="galleryImages.length ? 'md:w-1/2' : 'w-full max-w-[800px]'">
          <h2 id="procedure-what-title" class="font-serif text-3xl md:text-5xl font-extrabold text-[#111111] mb-10 leading-tight tracking-tight">¿Qué es?</h2>
          <div class="border-l-2 border-[#CBA36B] pl-6 md:pl-8 max-h-[400px] lg:max-h-[500px] overflow-y-auto pr-4">
            <CommonRichContent v-if="procedure.whatIsIt" :html="procedure.whatIsIt" class="reco-body md:!text-xl !leading-loose" />
            <p v-else class="reco-body md:!text-xl !leading-loose">{{ procedure.shortDescription }}</p>
          </div>
        </div>

        <div
          v-if="galleryImages.length"
          class="md:w-1/2 w-full h-[400px] lg:h-[500px] relative"
          data-testid="procedure-gallery"
          role="region"
          aria-roledescription="carrusel"
          aria-label="Galería de imágenes"
        >
          <div class="w-full h-full rounded-3xl overflow-hidden relative bg-[#BBB2AA]/30">
            <ul ref="track" class="flex w-full h-full overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" @scroll.passive="onTrackScroll">
              <li v-for="(url, i) in galleryImages" :key="url + i" class="min-w-full h-full snap-center shrink-0" :aria-label="`Imagen ${i + 1} de ${galleryImages.length}`">
                <button
                  type="button"
                  class="block w-full h-full overflow-hidden cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]"
                  :aria-label="`Ampliar imagen ${i + 1} de ${galleryImages.length}`"
                  @click="activeImage = i"
                >
                  <img :src="url" :alt="`${procedure.name} — imagen ${i + 1}`" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                </button>
              </li>
            </ul>
            <template v-if="galleryImages.length > 1">
              <button type="button" class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors cursor-pointer" aria-label="Imagen anterior" @click="slide(-1)">‹</button>
              <button type="button" class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors cursor-pointer" aria-label="Imagen siguiente" @click="slide(1)">›</button>
            </template>
          </div>
          <div v-if="galleryImages.length > 1" class="flex justify-center gap-2 mt-4">
            <button
              v-for="(url, i) in galleryImages" :key="'dot-' + i" type="button"
              class="w-2 h-2 rounded-full transition-colors cursor-pointer"
              :class="i === currentSlide ? 'bg-[#111111]' : 'bg-gray-300 hover:bg-gray-400'"
              :aria-label="`Ir a la imagen ${i + 1}`"
              :aria-current="i === currentSlide"
              @click="goTo(i)"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- 2b. Secciones de la línea (Hub): debajo del contenido del procedimiento, sin sustituirlo -->
    <div v-if="procedure.secciones?.length" class="max-w-[900px] mx-auto px-4 md:px-6 pb-20 md:pb-28">
      <ProcedureSections :sections="procedure.secciones" :procedure-name="procedure.name" />
    </div>

    <!-- 3. FICHA TÉCNICA: solo los datos que Hub entrega -->
    <section v-if="fichaItems.length" class="py-20 md:py-32 bg-[#F7F3EE]" aria-labelledby="procedure-ficha-title" data-testid="procedure-ficha">
      <div class="max-w-[1200px] mx-auto px-4 md:px-12">
        <div class="mb-16 md:mb-24 text-center md:text-left">
          <h2 id="procedure-ficha-title" class="font-serif text-3xl md:text-5xl font-extrabold text-[#111111] mb-6 leading-tight tracking-tight">Ficha técnica</h2>
          <p class="text-lg md:text-xl text-[#111111]/80 font-light max-w-2xl">Información esencial sobre tu procedimiento.</p>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-12 lg:gap-y-16 mt-12">
          <div v-for="item in fichaItems" :key="item.label" class="bg-[#E7DDD1] border border-[#BBB2AA]/30 p-10 lg:p-14 flex flex-col justify-start">
            <h3 class="font-serif text-2xl md:text-3xl font-extrabold text-[#111111] mb-4 tracking-tight">{{ item.label }}</h3>
            <p class="text-lg text-[#111111]/80 leading-relaxed font-light">{{ item.value }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 4. ¿ES PARA TI? perfil del paciente: solo los datos que Hub entrega -->
    <section v-if="profileItems.length" class="py-20 md:py-32 bg-[#F7F3EE]" aria-labelledby="procedure-profile-title" data-testid="procedure-profile">
      <div class="max-w-[1000px] mx-auto px-4 md:px-12">
        <div class="flex flex-col md:flex-row gap-12 lg:gap-16 items-start">
          <div class="w-full md:w-2/5 md:sticky md:top-28">
            <h2 id="procedure-profile-title" class="font-serif text-3xl md:text-5xl font-extrabold text-[#111111] leading-tight mb-6 tracking-tight">¿Es para ti?</h2>
            <p class="text-[#111111]/80 font-light text-lg leading-relaxed">Perfil recomendado para este procedimiento.</p>
          </div>
          <ul class="w-full md:w-3/5 space-y-5">
            <li v-for="(item, i) in profileItems" :key="i" class="flex items-start gap-6 p-8 bg-white rounded-xl border border-[#BBB2AA]/30">
              <div class="shrink-0 mt-1"><svg class="w-6 h-6 text-[#CBA36B]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg></div>
              <CommonRichContent v-if="item.html" :html="item.html" class="reco-body !text-lg" />
              <span v-else class="text-lg text-[#111111]/80 font-light leading-relaxed">{{ item.text }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- 5. FINANCIACIÓN -->
    <section class="py-24 bg-[#F7F3EE] text-center px-4">
      <div class="max-w-[1000px] mx-auto bg-[#111111] rounded-[3rem] p-10 md:p-20 relative overflow-hidden">
        <div class="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#CBA36B]/20 blur-3xl" aria-hidden="true"></div>
        <div class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12 text-left">
          <div class="md:w-3/5 text-center md:text-left">
            <p class="text-[11px] font-bold tracking-[0.2em] text-[#CBA36B] uppercase mb-3">En Crediestética te acompañamos</p>
            <h2 class="font-serif text-3xl md:text-5xl font-extrabold text-white mb-6 leading-tight tracking-tight">Inicia tu plan</h2>
            <p class="text-lg md:text-xl text-white/80 font-light leading-relaxed">
              La viabilidad de esta intervención médica será determinada por un profesional certificado. Nuestro rol es brindarte la tranquilidad financiera para que puedas enfocarte en tu bienestar.
            </p>
          </div>
          <div class="md:w-2/5 flex flex-col gap-4 w-full">
            <NuxtLink
              :to="{ path: '/financiacion', query: { procedureId: procedure.id }, hash: '#calculadora' }"
              class="w-full bg-[#CBA36B] text-[#111111] px-8 py-5 rounded-full font-bold text-lg hover:bg-white transition-all active:scale-95 border-2 border-transparent text-center cursor-pointer"
            >
              Simular financiación
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- 6. PROCEDIMIENTOS RELACIONADOS (misma categoría); sin coincidencias no se muestra -->
    <section v-if="relatedProcedures.length" class="py-20 md:py-28 bg-[#F7F3EE] border-t border-[#BBB2AA]/30" aria-labelledby="procedure-related-title" data-testid="procedure-related">
      <div class="max-w-[1200px] mx-auto px-4 md:px-12">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <h2 id="procedure-related-title" class="font-serif text-2xl md:text-3xl font-extrabold text-[#111111] mb-3 leading-tight tracking-tight">Otros procedimientos</h2>
            <p class="text-base md:text-lg text-[#111111]/80 font-light">Explora alternativas de la misma categoría.</p>
          </div>
          <NuxtLink to="/procedimientos" class="inline-flex items-center font-medium text-[#111111]/80 hover:text-[#755A26] transition-colors text-base whitespace-nowrap">
            Ver todos <span class="ml-2" aria-hidden="true">→</span>
          </NuxtLink>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <NuxtLink v-for="proc in relatedProcedures" :key="proc.slug" :to="`/procedimientos/${proc.slug}`" class="group cursor-pointer block">
            <div class="overflow-hidden rounded-2xl mb-5 bg-[#E7DDD1] relative aspect-video">
              <img v-if="proc.image" :src="proc.image" :alt="proc.name" loading="lazy" class="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-105" />
              <div v-else class="w-full h-full flex items-center justify-center bg-[#BBB2AA]/30">
                <span class="text-[#111111]/50 text-xs font-medium tracking-widest uppercase">Imagen no disponible</span>
              </div>
            </div>
            <h3 class="font-serif text-lg md:text-xl font-bold text-[#111111] mb-2 group-hover:text-[#755A26] transition-colors">{{ proc.name }}</h3>
            <span class="inline-flex items-center text-[#111111]/80 font-light text-sm">Leer más <span class="ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" aria-hidden="true">→</span></span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Imagen ampliada de la galería -->
    <div
      v-if="activeImage !== null"
      class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Galería de imágenes"
      @click.self="activeImage = null"
    >
      <button type="button" class="absolute top-4 right-4 text-white text-3xl leading-none px-3 cursor-pointer" aria-label="Cerrar" @click="activeImage = null">×</button>
      <button v-if="galleryImages.length > 1" type="button" class="absolute left-2 md:left-6 text-white text-4xl px-3 cursor-pointer" aria-label="Imagen anterior" @click="step(-1)">‹</button>
      <img :src="galleryImages[activeImage]" :alt="`${procedure.name} — imagen ${activeImage + 1}`" class="max-h-full max-w-full object-contain" />
      <button v-if="galleryImages.length > 1" type="button" class="absolute right-2 md:right-6 text-white text-4xl px-3 cursor-pointer" aria-label="Imagen siguiente" @click="step(1)">›</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSeoMeta, createError } from '#imports'
import { useAsyncData } from '#imports'
import { publicProcedureService } from '~/services/PublicProcedureService'
useCanonicalUrl()

const route = useRoute()
const router = useRouter()

const { data: procedure, error } = await useAsyncData('procedure-' + route.params.slug, () => publicProcedureService.getProcedureBySlug(route.params.slug))

// Hub caído, timeout o error de servicio NO es "no existe": 503 reintentable. Solo un 404 de Hub (null) es 404.
if (error.value) {
  throw createError({
    statusCode: 503,
    statusMessage: 'No fue posible cargar la página. Intenta nuevamente.',
    fatal: true
  })
}

if (!procedure.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Procedimiento no encontrado',
    fatal: true
  })
}

// Nombre real de la categoría (Hub, solo lectura). Si la consulta falla, se deriva la etiqueta del slug.
const { data: categoryNames } = await useAsyncData('procedure-category-names', () => $fetch('/api/public/procedure-categories').catch(() => []), { default: () => [] })
const categoryLabel = computed(() => procedureCategoryLabel(procedure.value?.category, categoryNames.value))

// Relacionados: misma categoría, sin el actual. Si la consulta falla no se muestra el bloque (nunca rompe el detalle).
const { data: relatedAll } = await useAsyncData('procedure-related-' + route.params.slug, () => publicProcedureService.getProcedures().catch(() => []), { default: () => [] })
const relatedProcedures = computed(() => (relatedAll.value ?? [])
  .filter(p => p.slug !== procedure.value?.slug && !!procedure.value?.category && p.category === procedure.value.category)
  .slice(0, 3))

// Ficha técnica y perfil del paciente: solo los datos que Hub entrega (sin texto de relleno).
const fichaItems = computed(() => {
  const f = procedure.value?.ficha_tecnica ?? {}
  return [
    { label: 'Tipo de anestesia', value: f.tipo_anestesia },
    { label: 'Tiempo quirúrgico', value: f.tiempo_quirurgico },
    { label: 'Tiempo de recuperación', value: f.tiempo_recuperacion },
    { label: 'Cicatrización mínima', value: typeof f.cicatrizacion_minima === 'boolean' ? (f.cicatrizacion_minima ? 'Sí' : 'Según el caso') : undefined }
  ].filter(i => typeof i.value === 'string' && i.value.trim() !== '')
})
const profileItems = computed(() => {
  const p = procedure.value?.perfil_paciente ?? {}
  const items = []
  if (p.edad_minima || p.edad_maxima) items.push({ text: `Edad recomendada: ${p.edad_minima || 18} - ${p.edad_maxima || 65} años.` })
  if (p.imc_maximo) items.push({ text: `IMC máximo sugerido: ${p.imc_maximo}.` })
  if (p.condiciones_medicas_compatibles) items.push({ html: p.condiciones_medicas_compatibles })
  return items
})
const hasIntro = computed(() => !!(procedure.value?.whatIsIt || procedure.value?.shortDescription))

// Galería: el detalle de Hub trae `galeria` como lista de URLs (se aceptan también objetos { url }); se descartan valores vacíos.
const galleryImages = computed(() => (procedure.value?.galeria ?? [])
  .map(g => (typeof g === 'string' ? g : g?.url))
  .filter(u => typeof u === 'string' && u.trim() !== ''))
const activeImage = ref(null)
const track = ref(null)
const currentSlide = ref(0)

function goTo(i) {
  const el = track.value
  if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
}
function slide(delta) {
  const n = galleryImages.value.length
  goTo((currentSlide.value + delta + n) % n)
}
function onTrackScroll() {
  const el = track.value
  if (el && el.clientWidth) currentSlide.value = Math.round(el.scrollLeft / el.clientWidth)
}

function step(delta) {
  const n = galleryImages.value.length
  activeImage.value = (activeImage.value + delta + n) % n
}
function onKey(e) {
  if (activeImage.value === null) return
  if (e.key === 'Escape') activeImage.value = null
  else if (e.key === 'ArrowLeft') step(-1)
  else if (e.key === 'ArrowRight') step(1)
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

// SEO
useSeoMeta({
  title: procedure.value.seo?.meta_title || `${procedure.value.name} | Crediestética`,
  description: procedure.value.seo?.meta_description || procedure.value.shortDescription
})
</script>


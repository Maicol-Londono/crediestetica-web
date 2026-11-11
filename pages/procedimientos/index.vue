<template>
  <div class="bg-[#F7F3EE] min-h-screen font-sans selection:bg-[#111111] selection:text-white pb-24">
    <!-- Hero a ancho completo con imagen (procedimientos.png); el menú transparente se superpone. -->
    <section class="relative min-h-[600px] md:min-h-[700px] flex items-center overflow-hidden pt-24 md:pt-32 mb-12 md:mb-16" data-testid="catalog-hero">
      <div class="absolute inset-0 z-0 bg-[#111111]">
        <img src="/images/web/procedimientos.png" alt="" aria-hidden="true" class="w-full h-full object-cover object-[75%_20%] md:object-center opacity-50" />
      </div>
      <div class="relative z-10 max-w-[1200px] mx-auto px-4 md:px-12 w-full py-12">
        <div class="max-w-3xl text-center md:text-left">
          <p class="inline-block bg-[#CBA36B] text-[#111111] px-4 py-1.5 rounded-full font-bold text-xs md:text-sm mb-6">PORTAFOLIO MÉDICO</p>
          <h1 class="font-serif text-4xl md:text-6xl lg:text-[64px] font-extrabold text-white mb-6 leading-tight tracking-tight uppercase break-words">
            NUESTROS PROCEDIMIENTOS.
          </h1>
          <p class="text-base md:text-[18px] text-white/80 mb-8 md:mb-10 max-w-2xl mx-auto md:mx-0 leading-relaxed md:leading-[28px]">
            Explora los tratamientos estéticos disponibles y descubre cómo podemos ayudarte a financiarlos sin comprometer tu estilo de vida.
          </p>
          <NuxtLink to="/financiacion#calculadora" class="inline-block w-full sm:w-auto bg-[#CBA36B] text-[#111111] px-8 py-4 rounded-full font-bold border-2 border-transparent hover:bg-white transition-all active:scale-95 text-center">Simular financiación</NuxtLink>
        </div>
      </div>
    </section>
    <div class="max-w-[1200px] mx-auto px-6">

      <!-- Hub caído: aviso con reintento (no un catálogo vacío). Lista vacía válida => cuadrícula vacía. -->
      <CommonHubUnavailable v-if="error" :retrying="status === 'pending'" @retry="refresh()" />

      <!-- Buscador y filtros por tipo de procedimiento -->
      <template v-else>
      <div class="mb-12 flex flex-col gap-6" data-testid="procedure-filters">
        <div class="relative max-w-xl">
          <label for="procedure-search" class="sr-only">Buscar procedimientos</label>
          <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#848484]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" /></svg>
          <input
            id="procedure-search"
            v-model="query"
            type="search"
            autocomplete="off"
            placeholder="Buscar por palabra clave (p. ej. abdomen, busto, grasa)"
            class="w-full pl-11 pr-4 py-3 bg-white border border-[#E7DDD1] rounded-full focus:outline-none focus:border-[#111111] focus-visible:ring-2 focus-visible:ring-[#CBA36B] text-sm"
          />
        </div>
        <div v-if="categories.length > 1" class="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo de procedimiento">
          <button
            v-for="c in [{ value: '', label: 'Todos' }, ...categories]"
            :key="c.value || 'todos'"
            type="button"
            class="px-5 py-2 rounded-full text-[11px] font-bold tracking-[0.15em] uppercase border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CBA36B]"
            :class="category === c.value ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#111111] border-[#E7DDD1] hover:border-[#111111]'"
            :aria-pressed="category === c.value"
            @click="category = c.value"
          >
            {{ c.label }}
          </button>
        </div>
        <p class="text-xs text-[#848484]" aria-live="polite">
          {{ filtered.length }} {{ filtered.length === 1 ? 'procedimiento' : 'procedimientos' }}
        </p>
      </div>

      <div v-if="cirugias.length && !filtered.length" class="mb-24 py-16 text-center bg-white rounded-xl border border-[#E7DDD1]" data-testid="procedure-empty">
        <p class="font-serif text-2xl text-black mb-2">No encontramos procedimientos con esa búsqueda.</p>
        <button type="button" class="text-[11px] font-bold tracking-[0.15em] uppercase text-[#111111] border-b border-[#111111] pb-1" @click="query = ''; category = ''">Limpiar filtros</button>
      </div>

      <!-- CATÁLOGO GRID -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16 mb-24">
        
        <NuxtLink 
          v-for="proc in filtered" 
          :key="proc.slug" 
          :to="`/procedimientos/${proc.slug}`" 
          class="group cursor-pointer flex flex-col h-full"
        >
          <!-- Contenedor Imagen -->
          <div class="relative w-full overflow-hidden rounded-xl bg-[#E7DDD1] mb-6" :class="proc.imageOrientation === 'horizontal' ? 'aspect-video' : 'aspect-[9/16]'">
            <img 
              v-if="proc.image"
              :src="proc.image" 
              :alt="proc.name" 
              class="w-full h-full object-contain transition-all duration-700 ease-out group-hover:scale-105"
            />
            <div v-else class="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400 text-sm">
              Sin imagen
            </div>
          </div>
          
          <!-- Contenido -->
          <div class="flex-grow flex flex-col">
            <div class="text-[10px] font-bold tracking-widest text-[#848484] uppercase mb-2">
              {{ categoryLabel(proc.category) || 'Procedimiento' }}
            </div>
            <h3 class="font-serif text-2xl lg:text-3xl font-medium text-black mb-3 group-hover:text-[#111111] transition-colors">
              {{ proc.name }}
            </h3>
            <p class="text-gray-600 text-sm leading-relaxed font-light mb-6 flex-grow">
              {{ proc.shortDescription }}
            </p>
            <div class="inline-flex items-center text-xs font-bold tracking-widest uppercase text-black group-hover:text-[#111111] transition-colors border-b border-transparent group-hover:border-[#111111] pb-1 self-start">
              Conocer más
            </div>
          </div>
        </NuxtLink>

      </div>
      </template>

      <!-- CTA FINAL FINANCIACIÓN -->
      <div class="max-w-4xl mx-auto bg-[#111111] text-white rounded-[2.5rem] p-10 md:p-16 relative overflow-hidden shadow-2xl text-center">
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#CBA36B]/20 rounded-full blur-[100px] pointer-events-none" aria-hidden="true"></div>
        <div class="relative z-10">
          <p class="text-[11px] font-bold tracking-[0.15em] text-white/60 uppercase mb-4">
            TU PRÓXIMA ETAPA
          </p>
          <h2 class="font-serif text-3xl md:text-5xl font-extrabold text-white mb-6 leading-tight tracking-tight">
            DISEÑA TU PLAN DE PAGO
          </h2>
          <p class="text-lg md:text-xl text-white/80 mb-10 max-w-xl mx-auto font-light leading-relaxed">
            ¿Ya sabes qué procedimiento deseas? Utiliza nuestro simulador para estructurar cuotas que se adapten a tu capacidad financiera.
          </p>
          <NuxtLink to="/financiacion#calculadora" class="inline-block w-full sm:w-auto bg-white text-[#111111] px-12 py-5 rounded-full font-bold text-lg hover:bg-[#CBA36B] transition-all shadow-xl active:scale-95 border-2 border-transparent">
            Ir al Simulador
          </NuxtLink>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useSeoMeta, useHead, useSiteConfig } from '#imports'
import { useAsyncData } from '#imports'
import { publicProcedureService } from '~/services/PublicProcedureService'

const { data: cirugias, error, refresh, status } = await useAsyncData('procedures', () => publicProcedureService.getProcedures(), {
  default: () => []
})
useServiceUnavailable(error)

// Nombres reales de las categorías (Hub). Si la consulta falla o no trae el slug, se deriva la etiqueta del slug como antes.
const { data: categoryNames } = await useAsyncData('procedure-category-names', () => $fetch('/api/public/procedure-categories').catch(() => []), { default: () => [] })

// Buscador y filtro por tipo: todo en el cliente sobre la lista que ya llega de Hub (no se duplica ni se guarda información).
const query = ref('')
const category = ref('')
const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const categoryLabel = (slug) => procedureCategoryLabel(slug, categoryNames.value)

// Tipos disponibles = los que traen los procedimientos cargados (corporal, facial, …); sin categoría no genera filtro.
const categories = computed(() => [...new Set((cirugias.value ?? []).map(p => p.category).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b, 'es'))
  .map(value => ({ value, label: categoryLabel(value) })))

const filtered = computed(() => {
  const words = fold(query.value).split(/\s+/).filter(Boolean)
  return (cirugias.value ?? []).filter((p) => {
    if (category.value && p.category !== category.value) return false
    const hay = fold(`${p.name} ${p.shortDescription} ${p.category}`)
    return words.every(w => hay.includes(w))
  })
})

useSeoMeta({
  title: 'Procedimientos | Crediestética',
  description: 'Explora nuestro portafolio de procedimientos estéticos y descubre cómo financiarlos con Crediestética.',
  ogTitle: 'Procedimientos | Crediestética',
  ogDescription: 'Explora nuestro portafolio de procedimientos estéticos y descubre cómo financiarlos con Crediestética.',
  ogImage: '/images/branding/logo_fondo_transparente.png',
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterImage: '/images/branding/logo_fondo_transparente.png'
})

useHead({
  link: [
    { rel: 'canonical', href: `${String(useSiteConfig().url ?? '').replace(/\/+$/, '')}/procedimientos` }
  ]
})
</script>

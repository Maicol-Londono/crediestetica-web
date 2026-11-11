<template>
  <div class="bg-[#F7F3EE] min-h-screen font-sans">

    <!-- HERO -->
    <header class="relative overflow-hidden bg-gradient-to-br from-[#111111] via-[#1b1815] to-[#2b2620] text-white pt-16 md:pt-24 pb-28 md:pb-36">
      <div class="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-[#CBA36B]/15 blur-3xl"></div>
      <div class="absolute -bottom-32 -left-20 w-[360px] h-[360px] rounded-full bg-white/5 blur-2xl"></div>
      <svg class="absolute inset-0 w-full h-full opacity-[0.05]" aria-hidden="true"><defs><pattern id="reco-dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="#fff" /></pattern></defs><rect width="100%" height="100%" fill="url(#reco-dots)" /></svg>

      <div class="relative max-w-[900px] mx-auto px-6 text-center">
        <div v-if="backTo" class="text-left"><CommonDetailBack :to="backTo" :label="backLabel || 'Volver'" /></div>
        <p class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#CBA36B]/20 text-[#CBA36B] text-[11px] font-bold tracking-[0.2em] uppercase mb-6">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          {{ eyebrow }}
        </p>
        <h1 class="font-serif text-[34px] md:text-[54px] font-medium leading-[1.08] tracking-[-0.02em]">{{ title }}</h1>
        <p v-if="subtitle" class="mt-6 text-white/70 font-light text-lg max-w-2xl mx-auto leading-relaxed">{{ subtitle }}</p>
        <!-- Compartir: solo en las páginas que declaran su ruta pública (subtemas); enlace corto de Hub cuando existe. -->
        <CommonShareActions v-if="sharePath" :title="title" :short-url="shortUrl" :path="sharePath" tone="dark" class="mt-8" />
      </div>
    </header>

    <!-- CONTENIDO -->
    <main class="relative max-w-[900px] mx-auto px-4 md:px-6 -mt-16 md:-mt-20 pb-24">
      <!-- Con secciones (slot) la tarjeta de introducción solo aparece si tiene algo que mostrar; las páginas antiguas, sin slot, la conservan siempre. -->
      <article v-if="hasArticle" class="bg-white border border-[#E7DDD1] shadow-xl shadow-black/5 rounded-2xl p-6 md:p-12">
        <div v-if="videoUrl" class="-mt-2 mb-10 rounded-xl overflow-hidden [&>div]:my-0">
          <NewsYouTubeEmbed :url="videoUrl" />
        </div>

        <img v-if="image" :src="image" :alt="title" class="w-full md:w-[42%] md:float-right md:ml-10 mb-8 rounded-xl object-cover shadow-lg" />
        <CommonRichContent :html="html" class="reco-body" />
        <div class="clear-both"></div>
      </article>

      <!-- SECCIONES (subtemas del árbol de recomendaciones) -->
      <div v-if="$slots.default" class="space-y-8" :class="hasArticle ? 'mt-10' : ''">
        <slot />
      </div>

      <!-- LLAMADO A LA ACCIÓN -->
      <aside class="mt-10 relative overflow-hidden rounded-2xl bg-[#111111] text-white p-8 md:p-12 text-center">
        <div class="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#CBA36B]/20 blur-3xl"></div>
        <p class="relative text-[11px] font-bold tracking-[0.2em] text-[#CBA36B] uppercase mb-3">En Crediestética te acompañamos</p>
        <h2 class="relative font-serif text-2xl md:text-3xl mb-4">Infórmate y resuelve tus dudas</h2>
        <p class="relative text-white/70 font-light max-w-xl mx-auto mb-8">Antes de tomar una decisión sobre tu procedimiento, conoce cómo funciona la financiación y resuelve tus dudas.</p>
        <div class="relative flex flex-wrap justify-center gap-3">
          <NuxtLink to="/financiacion#calculadora" class="px-7 py-3 text-[11px] font-bold tracking-[0.15em] uppercase bg-[#CBA36B] text-[#111111] hover:bg-white transition-colors">Simular financiación</NuxtLink>
          <NuxtLink to="/procedimientos" class="px-7 py-3 text-[11px] font-bold tracking-[0.15em] uppercase border border-white/40 hover:bg-white/10 transition-colors">Ver procedimientos</NuxtLink>
        </div>
      </aside>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'

const props = defineProps<{
  eyebrow: string
  backTo?: string
  backLabel?: string
  title: string
  subtitle?: string
  html?: string
  videoUrl?: string
  image?: string
  /** Ruta pública de la página (activa las acciones de compartir) y su enlace corto real de Hub, si lo tiene. */
  sharePath?: string
  shortUrl?: string | null
}>()

const slots = useSlots()
const hasArticle = computed(() => !slots.default || !!(props.html && props.html.replace(/<[^>]*>/g, '').trim()) || !!props.videoUrl || !!props.image)
</script>

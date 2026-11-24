<template>
  <div class="bg-[#F7F3EE] text-[#111111] font-sans selection:bg-[#CBA36B] selection:text-[#111111]">

    <!-- 1. Hero (igual que el home del proyecto original de Crediestética) -->
    <section class="relative min-h-[600px] md:min-h-[870px] flex items-center overflow-hidden pt-24 md:pt-32">
      <div class="absolute inset-0 z-0">
        <img src="/images/web/home.png" alt="Crediestética: financiación de procedimientos estéticos" class="w-full h-full object-cover object-[75%_20%] md:object-center" />
      </div>
      <div class="relative z-10 max-w-[1200px] mx-auto px-4 md:px-12 w-full py-12">
        <div class="max-w-2xl text-center md:text-left">
          <span class="inline-block bg-[#CBA36B] text-[#111111] px-4 py-1.5 rounded-full font-bold text-xs md:text-sm mb-6">Financiación Médica Premium</span>
          <h1 class="font-serif text-4xl md:text-5xl lg:text-[56px] text-white mb-6 md:mb-8 leading-tight md:leading-[1.15] tracking-tight font-extrabold">Financiación para cirugía plástica y procedimientos estéticos.</h1>
          <p class="text-base md:text-[18px] text-white/80 mb-8 md:mb-10 max-w-lg mx-auto md:mx-0 leading-relaxed md:leading-[28px]">Red médica verificada, instituciones habilitadas y financiación especializada en un solo lugar.</p>
          <div class="flex flex-col sm:flex-row flex-wrap gap-4 justify-center md:justify-start">
            <NuxtLink to="/financiacion#calculadora" class="w-full sm:w-auto bg-[#111111] text-white px-8 py-4 rounded-full font-bold hover:bg-white hover:text-[#111111] border-2 border-transparent hover:border-[#111111] transition-all shadow-lg active:scale-95 text-center">Simular financiación</NuxtLink>
            <NuxtLink to="/nosotros" class="w-full sm:w-auto border-2 border-white text-white px-8 py-4 rounded-full font-bold hover:bg-white hover:text-black transition-all active:scale-95 text-center">Hablar con un asesor</NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. Proceso -->
    <CommonProcessSection />

    <!-- 3. Respaldo y seguridad -->
    <CommonTrustSection />

    <!-- 4. Aliados médicos: solo las clínicas aliadas activas administradas en Crediestética (sin la lista heredada de otra marca). Sin ellas no se muestra. -->
    <section v-if="allies.length" class="py-16 md:py-20 bg-[#F7F3EE] overflow-hidden" data-testid="home-clinics-section">
      <div class="max-w-[1200px] mx-auto px-4 md:px-12">
        <div class="text-center mb-10 md:mb-12">
          <h2 class="font-serif text-3xl md:text-[40px] font-extrabold text-[#111111] leading-tight">Aliados Médicos Top</h2>
          <p class="text-base md:text-[18px] text-[#111111]/80 mt-4 max-w-2xl mx-auto">Nos asociamos solo con las clínicas y cirujanos más prestigiosos.</p>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6" data-testid="home-clinics">
          <NuxtLink v-for="ally in allies" :key="ally.id" :to="`/clinicas-aliadas#${ally.id}`" class="group bg-white rounded-xl overflow-hidden flex flex-col transition-all shadow-sm hover:shadow-md hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#CBA36B]">
            <div class="aspect-[4/3] w-full overflow-hidden bg-[#E7DDD1]">
              <img :src="ally.image" :alt="ally.name" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
            </div>
            <p class="px-4 py-4 text-center font-serif text-base md:text-lg font-bold text-[#111111] leading-snug">{{ ally.name }}</p>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- 5. Financiación -->
    <section class="py-16 md:py-24 bg-[#F7F3EE]">
      <div class="max-w-[1200px] mx-auto px-4 md:px-12 text-center">
        <div class="max-w-3xl mx-auto bg-[#E7DDD1] p-8 md:p-12 rounded-[2rem] border border-[#BBB2AA]/30 shadow-sm">
          <div class="w-14 h-14 md:w-16 md:h-16 bg-[#111111] text-[#CBA36B] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 md:h-8 md:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h2 class="font-serif text-3xl md:text-[40px] font-extrabold text-[#111111] mb-4 leading-tight">Financiación Transparente</h2>
          <p class="text-base md:text-[18px] text-[#111111]/80 mb-8 md:mb-10 max-w-xl mx-auto leading-relaxed">Hacemos que tu proceso médico sea posible. Utiliza nuestra herramienta de simulación para visualizar tus cuotas reales, sin costos ocultos y con total transparencia.</p>
          <NuxtLink to="/financiacion#calculadora" class="inline-block w-full sm:w-auto bg-[#111111] text-white px-8 md:px-10 py-4 md:py-5 rounded-full font-bold text-base md:text-lg hover:bg-white hover:text-[#111111] border-2 border-transparent hover:border-[#111111] transition-all shadow-md active:scale-95">Ir al Simulador Financiero</NuxtLink>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useFetch } from '#imports'
useCanonicalUrl()

// Clínicas activas (el endpoint público ya excluye las ocultas); misma clave de caché que la página /clinicas-aliadas.
const { data } = await useFetch('/api/public/clinics', { key: 'clinics-public', default: () => ({ clinics: [], updatedAt: '' }) })
const allies = computed(() => (data.value?.clinics ?? []).filter(c => c.image))

useSeoMeta({
  title: 'FINANCIACIÓN DE CIRUGÍAS PLÁSTICAS | CREDIESTÉTICA',
  ogTitle: 'FINANCIACIÓN DE CIRUGÍAS PLÁSTICAS | CREDIESTÉTICA',
  description: 'Financiamos desde el 50% hasta el 100% de tu procedimiento médico o estético directamente.',
})
</script>

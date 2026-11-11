<template>
  <div class="bg-[#F7F3EE] min-h-screen font-sans selection:bg-[#111111] selection:text-white pt-6 md:pt-10 pb-24">
    <div class="max-w-[1200px] mx-auto px-6">
      <CommonPageHero
        eyebrow="RESULTADOS REALES"
        :lines="['ANTES', 'Y DESPUÉS.']"
        lead="Casos de pacientes de Crediestética, publicados con su autorización."
      />
      <TestimonialsNav />

      <CommonHubUnavailable v-if="error" :retrying="status === 'pending'" @retry="refresh()" />

      <p v-else-if="loaded && !visibility" class="text-center text-gray-500 font-light py-16 border border-dashed border-gray-300 bg-white">
        Esta sección no está disponible por el momento.
      </p>

      <template v-else-if="visibility">
        <div v-if="cases.length" class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12">
          <article v-for="c in cases" :key="c.id" class="group bg-white border border-[#E7DDD1] hover:shadow-xl transition-shadow duration-300">
            <div class="grid grid-cols-2 gap-px bg-[#E7DDD1]">
              <figure class="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                <img :src="c.beforeImage" :alt="`Antes: ${c.title}`" class="w-full h-full object-cover grayscale-[10%] group-hover:grayscale-0 transition-all duration-700" />
                <figcaption class="absolute bottom-0 left-0 bg-black/75 text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1.5">Antes</figcaption>
              </figure>
              <figure class="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                <img :src="c.afterImage" :alt="`Después: ${c.title}`" class="w-full h-full object-cover grayscale-[10%] group-hover:grayscale-0 transition-all duration-700" />
                <figcaption class="absolute bottom-0 left-0 bg-[#111111] text-[#CBA36B] text-[10px] font-bold tracking-widest uppercase px-3 py-1.5">Después</figcaption>
              </figure>
            </div>
            <div v-if="c.title || c.description" class="p-8">
              <h3 v-if="c.title" class="font-serif text-2xl font-medium text-black mb-3 leading-snug">{{ c.title }}</h3>
              <p v-if="c.description" class="text-sm text-gray-600 font-light leading-relaxed">{{ c.description }}</p>
            </div>
          </article>
        </div>
        <p v-else-if="loaded && !instagram.length" class="text-center text-gray-500 font-light py-16 border border-dashed border-gray-300 bg-white">
          Pronto compartiremos aquí los resultados de nuestros pacientes.
        </p>

        <!-- Todas las tarjetas miden lo mismo (la fila toma la más alta), se renderice o no el post de Instagram. -->
        <section v-if="instagram.length" class="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="post in instagram" :key="post.id" class="flex items-start justify-center min-h-[620px] bg-white shadow-[0_0_1px_0_rgba(0,0,0,0.5),0_1px_10px_0_rgba(0,0,0,0.08)]">
            <NewsInstagramEmbed :url="post.url" class="!my-0" />
          </div>
        </section>

        <section class="mt-8 bg-[#111111] text-white px-6 py-12 md:px-14 md:py-14 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div class="max-w-2xl">
            <h2 class="font-serif text-2xl md:text-3xl font-medium leading-tight mb-3">Da el primer paso hoy</h2>
            <p class="text-white/80 font-light leading-relaxed">Explora nuestra galería y visualiza cómo podría ser tu transformación. Contáctanos para una consulta y descubre cómo nuestra financiación flexible puede ayudarte a alcanzar tus objetivos estéticos.</p>
          </div>
          <NuxtLink to="/financiacion#calculadora" class="shrink-0 self-start md:self-center px-8 py-4 text-[11px] font-bold tracking-[0.15em] uppercase bg-[#CBA36B] text-[#111111] border border-[#CBA36B] hover:bg-white hover:border-white transition-colors">
            Simular financiación
          </NuxtLink>
        </section>

        <p class="mt-8 text-xs text-gray-500 font-light text-center max-w-2xl mx-auto">
          Los resultados varían según cada paciente. Toda cirugía requiere valoración médica previa.
        </p>

      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSeoMeta } from '#imports'
import { fetchPatientSection } from '~/services/PublicTestimonialsService'

// Se lee de Wellezy Hub (vía Nitro) también en el servidor. Hub solo entrega casos publicados con ambas imágenes.
const { data, status, error, refresh } = await useAsyncData('patient-section', fetchPatientSection)
useServiceUnavailable(error)
const cases = computed(() => data.value?.beforeAfter ?? [])
const instagram = computed(() => data.value?.instagram ?? [])
const visibility = computed(() => data.value?.visibility.beforeAfter ?? true)
// Según los datos (no el estado del fetch, que difiere entre servidor e hidratación y provocaba un desajuste).
const loaded = computed(() => data.value != null || error.value != null)

const description = 'Casos de antes y después de pacientes de Crediestética.'
useSeoMeta({ title: 'Antes y después | Crediestética', description, ogTitle: 'Antes y después | Crediestética', ogDescription: description })
</script>

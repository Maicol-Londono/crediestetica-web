<template>
  <div class="bg-[#F7F3EE] min-h-screen font-sans selection:bg-[#111111] selection:text-white pt-6 md:pt-10 pb-24">
    <div class="max-w-[1200px] mx-auto px-6">

      <CommonPageHero
        eyebrow="HISTORIAS REALES"
        :lines="['PACIENTES', 'FELICES.']"
        lead="Aquí compartiremos las historias de pacientes de Crediestética cuando estén disponibles."
      />
      <TestimonialsNav />

      <CommonHubUnavailable v-if="error" :retrying="status === 'pending'" @retry="refresh()" />

      <!-- Videos -->
      <section v-if="content.visibility.videos" class="mb-20">
        <div v-if="content.videos.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          <div v-for="video in content.videos" :key="video.id" class="bg-white border border-[#E7DDD1] p-3 pb-6 hover:shadow-xl transition-shadow duration-300 [&>div]:my-0">
            <NewsYouTubeEmbed :url="video.url" />
            <p v-if="video.title" class="mt-4 px-3 font-serif text-xl font-medium text-black leading-snug">{{ video.title }}</p>
          </div>
        </div>
        <p v-else-if="loaded && !error" class="text-center text-gray-500 font-light py-16 border border-dashed border-gray-300 bg-white">
          Pronto compartiremos aquí los videos de nuestros pacientes.
        </p>
      </section>

      <div class="mt-16 text-center">
        <NuxtLink to="/financiacion#calculadora" class="inline-block px-8 py-4 text-[11px] font-bold tracking-[0.15em] uppercase bg-[#111111] text-[#CBA36B] hover:bg-[#CBA36B] hover:text-[#111111] transition-colors">Simular financiación</NuxtLink>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { useSeoMeta } from '#imports'
import { fetchPatientSection } from '~/services/PublicTestimonialsService'
import type { TestimonialsContent } from '~/types/testimonials'

const empty: TestimonialsContent = { visibility: { videos: true, beforeAfter: true }, videos: [], beforeAfter: [], instagram: [], referral: { title: '', content: '' } }

// Se lee de Wellezy Hub (vía Nitro) también en el servidor, para que el HTML inicial ya traiga el contenido publicado.
const { data, status, error, refresh } = await useAsyncData('patient-section', fetchPatientSection)
useServiceUnavailable(error)
const content = computed(() => data.value ?? empty)
// Según los datos (no el estado del fetch, que difiere entre servidor e hidratación y provocaba un desajuste).
const loaded = computed(() => data.value != null || error.value != null)

const description = 'Conoce las testimonios de pacientes de Crediestética.'
useSeoMeta({ title: 'Pacientes | Crediestética', description, ogTitle: 'Pacientes | Crediestética', ogDescription: description })
</script>

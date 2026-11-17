<template>
  <div class="bg-[#F7F3EE] min-h-screen font-sans selection:bg-[#111111] selection:text-white pt-6 md:pt-10 pb-24">
    <div class="max-w-[1200px] mx-auto px-6">
      <!-- Escritorio/tableta: la imagen ya trae el título y el texto de la cabecera (se conserva el h1 para lectores de pantalla). En móvil el texto
           de la imagen sería ilegible por su tamaño, así que se mantiene la cabecera de texto. -->
      <div class="hidden md:block mb-10 md:mb-14">
        <h1 class="sr-only">Programa de referidos</h1>
        <picture>
          <!-- Móvil: este bloque está oculto (hidden md:block) y una imagen oculta con display:none SE DESCARGA igual. Por eso en pantallas estrechas la fuente es un GIF
               transparente en data URI (sin petición de red) y la imagen real solo se elige desde 768 px (breakpoint md). El PNG es el respaldo
               de navegadores sin WebP. -->
          <source media="(max-width: 767.98px)" srcset="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" />
          <source media="(min-width: 768px)" srcset="/images/web/prp.webp" type="image/webp" />
          <img
            src="/images/web/prp.png"
            alt="Programa de referidos: recomienda y gana. Comparte la experiencia Crediestética con tus amigas y recibe una recompensa por cada paciente que refieras y se opere con nosotros."
            width="1920"
            height="819"
            decoding="async"
            fetchpriority="high"
            class="w-full h-auto rounded-[2rem] shadow-sm"
          />
        </picture>
      </div>
      <CommonPageHero
        class="md:hidden"
        eyebrow="PROGRAMA DE REFERIDOS"
        :lines="referral.title ? [referral.title] : ['RECOMIENDA', 'Y GANA']"
        lead="Comparte la experiencia Crediestética con tus amigas y recibe una recompensa por cada paciente que refieras y se opere con nosotros."
      />
      <TestimonialsNav />

      <div class="max-w-[900px] mx-auto">
        <CommonHubUnavailable v-if="error" :retrying="status === 'pending'" @retry="refresh()" />
        <CommonRichContent v-else-if="referral.content" :html="referral.content" class="bg-white border border-[#E7DDD1] p-6 md:p-12 text-gray-700 font-light leading-relaxed" />
        <!-- Sin texto administrado en Hub: se muestra el contenido estático del programa (presentación estática del programa de referidos de Crediestética). -->
        <ReferralProgramContent v-else-if="loaded" />

        <!-- Sin formulario: esta página es informativa. La inscripción al programa solo se hace desde el micrositio del referidor (/prp/[slug]). -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSeoMeta } from '#imports'
import { fetchPatientSection } from '~/services/PublicTestimonialsService'
useCanonicalUrl()

// Se lee de Wellezy Hub (vía Nitro) también en el servidor.
const { data, status, error, refresh } = await useAsyncData('patient-section', fetchPatientSection)
useServiceUnavailable(error)
const referral = computed(() => data.value?.referral ?? { title: '', content: '' })
// Según los datos (no el estado del fetch, que difiere entre servidor e hidratación y provocaba un desajuste).
const loaded = computed(() => data.value != null || error.value != null)

const description = 'Programa de referidos de Crediestética: comparte tu experiencia con tus amigas y conoce cómo recomendar.'
useSeoMeta({ title: 'Programa de referidos | Crediestética', description, ogTitle: 'Programa de referidos | Crediestética', ogDescription: description })
</script>

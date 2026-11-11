<template>
  <div class="bg-[#F7F3EE] min-h-screen font-sans selection:bg-[#111111] selection:text-white pt-6 md:pt-10 pb-24">
    <div class="max-w-[1200px] mx-auto px-6">
      <CommonPageHero
        eyebrow="PROGRAMA DE REMISIÓN"
        :lines="referral.title ? [referral.title] : ['PROGRAMA DE', 'REFERIDOS.']"
        lead="Información del programa de referidos de Crediestética."
      />
      <TestimonialsNav />

      <div class="max-w-[900px] mx-auto">
        <CommonHubUnavailable v-if="error" :retrying="status === 'pending'" @retry="refresh()" />
        <CommonRichContent v-else-if="referral.content" :html="referral.content" class="bg-white border border-[#E7DDD1] p-6 md:p-12 text-gray-700 font-light leading-relaxed" />
        <!-- Sin texto administrado en Hub no se muestra el programa: el contenido estático era de otra marca y no hay términos verificados de Crediestética. -->
        <p v-else-if="loaded" class="text-center text-gray-500 font-light py-16 border border-dashed border-gray-300 bg-white">Pronto compartiremos aquí la información del programa de referidos.</p>

        <!-- Formulario (maqueta, aún no funcional; destino futuro: CRM médico). Se muestra con el texto de Hub o con el estático, no en error. -->
        <ReferralForm v-if="loaded && !error && referral.content" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSeoMeta } from '#imports'
import { fetchPatientSection } from '~/services/PublicTestimonialsService'

// Se lee de Wellezy Hub (vía Nitro) también en el servidor.
const { data, status, error, refresh } = await useAsyncData('patient-section', fetchPatientSection)
useServiceUnavailable(error)
const referral = computed(() => data.value?.referral ?? { title: '', content: '' })
// Según los datos (no el estado del fetch, que difiere entre servidor e hidratación y provocaba un desajuste).
const loaded = computed(() => data.value != null || error.value != null)

const description = 'Conoce el programa de referidos de Crediestética.'
useSeoMeta({ title: 'Programa de referidos | Crediestética', description, ogTitle: 'Programa de referidos | Crediestética', ogDescription: description })
</script>

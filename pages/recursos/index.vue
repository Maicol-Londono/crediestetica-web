<template>
  <div class="bg-[#F7F3EE] min-h-screen font-sans selection:bg-[#CBA36B] selection:text-[#111111] pb-24">
    <!-- Cabecera como el original: imagen a ancho completo (recursos.png) con degradado y tarjeta oscura que la solapa. -->
    <section class="relative w-full pt-0 md:pt-0 mb-12 md:mb-16">
      <div class="relative w-full h-[60vh] md:h-[70vh] lg:h-[80vh]">
        <img src="/images/web/recursos.png" alt="" aria-hidden="true" class="w-full h-full object-cover object-center" />
        <div class="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/60 to-transparent md:bg-gradient-to-r md:from-[#111111] md:via-[#111111]/80 md:to-transparent"></div>
      </div>
      <div class="w-full max-w-[1200px] mx-auto px-4 md:px-8 -mt-24 md:-mt-32 relative z-10">
        <div class="bg-[#111111] shadow-2xl rounded-2xl p-8 md:p-12 lg:p-16 w-full md:max-w-[85%] lg:max-w-[800px] flex flex-col border border-[#BBB2AA]/20">
          <h1 class="font-serif text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#F7F3EE] mb-6 leading-snug tracking-tight">DOCUMENTOS Y RECURSOS.</h1>
          <p class="text-base md:text-lg text-[#BBB2AA] leading-relaxed font-light max-w-2xl">Información y documentos importantes para tu proceso.</p>
        </div>
      </div>
    </section>

    <div class="max-w-[1200px] mx-auto px-4 md:px-8">
      <div class="mb-24">
        <div v-if="documents.length === 0" class="border border-[#E7DDD1] rounded-xl p-12 text-center bg-white">
          <p class="text-[14px] text-[#4c4546]">Próximamente encontrarás aquí los documentos y requisitos oficiales para tu proceso.</p>
        </div>
        <ul v-else class="flex flex-col gap-4" data-testid="resource-documents" aria-label="Documentos legales">
          <li
            v-for="doc in documents"
            :key="doc.slug"
            class="bg-white border border-[#BBB2AA]/20 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 motion-reduce:hover:translate-y-0 transition-all p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            :data-testid="`resource-${doc.slug}`"
          >
            <div class="min-w-0">
              <p class="text-[10px] font-bold tracking-[0.2em] text-[#755A26] uppercase mb-1">Documento PDF</p>
              <h2 class="font-serif text-lg md:text-xl font-medium text-[#111111] leading-snug break-words">{{ doc.title }}</h2>
              <p class="mt-1 text-sm text-gray-600 font-light break-words">{{ doc.description }}</p>
            </div>
            <div class="flex flex-col sm:flex-row gap-3 shrink-0">
              <NuxtLink
                :to="`/recursos/${doc.slug}`"
                class="inline-flex items-center justify-center min-h-[48px] bg-[#111111] text-white rounded-full border-2 border-[#111111] px-6 py-3 text-[11px] font-bold tracking-[0.15em] uppercase hover:bg-transparent hover:text-[#111111] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CBA36B]"
                :aria-label="`Leer ${doc.title}`"
              >Leer documento</NuxtLink>
              <a
                :href="doc.file"
                :download="`${doc.slug}.pdf`"
                class="inline-flex items-center justify-center min-h-[48px] border-2 border-[#111111] text-[#111111] rounded-full px-6 py-3 text-[11px] font-bold tracking-[0.15em] uppercase hover:bg-[#111111] hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CBA36B]"
                :aria-label="`Descargar ${doc.title} (PDF)`"
              >Descargar PDF</a>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useSeoMeta } from '#imports'
import { resourceDocuments as documents } from '~/data/resourceDocuments'
useCanonicalUrl()

useSeoMeta({
  title: 'Recursos | Crediestética',
  description: 'Documentos e información importante para tu proceso en Crediestética.'
})
</script>

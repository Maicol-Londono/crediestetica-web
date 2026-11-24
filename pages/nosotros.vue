<template>
  <div class="bg-white font-sans selection:bg-[#111111] selection:text-white">

    <!-- Sin contenido configurado: estado neutro (no se hereda ningún texto, imagen ni contacto de otra marca). -->
    <section v-if="isEmpty" class="bg-[#F7F3EE]" aria-labelledby="about-empty-title" data-testid="about-not-configured">
      <div class="max-w-[900px] mx-auto px-6 md:px-12 py-24 text-center">
        <h1 id="about-empty-title" class="font-serif text-3xl md:text-4xl text-[#111111] uppercase mb-4">Nosotros</h1>
        <p class="text-gray-600 text-lg">La información de esta sección aún no está disponible.</p>
      </div>
    </section>

    <!-- 1. PORTADA: vista principal; misma caja contenida con barra dorada que CommonPageHero, con la foto de fondo. -->
    <!-- Composición del original: imagen a ancho completo con degradado y tarjeta oscura que la solapa (el contenido sigue siendo el del panel). -->
    <section v-if="!isEmpty" class="relative w-full bg-[#F7F3EE]" aria-labelledby="about-hero-title">
      <div class="relative w-full h-[60vh] md:h-[70vh] lg:h-[80vh] bg-[#111111]">
        <img
          v-if="content.hero.image"
          :src="content.hero.image"
          :alt="content.hero.imageAlt"
          width="1915"
          height="821"
          fetchpriority="high"
          class="w-full h-full object-cover object-center"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/60 to-transparent md:bg-gradient-to-r md:from-[#111111] md:via-[#111111]/80 md:to-transparent" aria-hidden="true"></div>
      </div>
      <div class="w-full max-w-[1200px] mx-auto px-4 md:px-8 -mt-24 md:-mt-32 relative z-10">
        <div class="bg-[#111111] shadow-2xl rounded-2xl p-8 md:p-12 lg:p-16 w-full md:max-w-[85%] lg:max-w-[800px] flex flex-col border border-[#BBB2AA]/20">
          <p class="inline-block self-start bg-[#CBA36B] text-[#111111] px-4 py-1.5 rounded-full font-bold text-xs md:text-sm mb-6">Crediestética</p>
          <h1 id="about-hero-title" class="font-serif text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#F7F3EE] mb-2 leading-snug tracking-tight uppercase break-words">
            {{ content.hero.title }}
          </h1>
        </div>
      </div>
    </section>

    <!-- 2. INFORMACIÓN INSTITUCIONAL: presentación sobre marfil y, debajo, una banda de fondo propio por cada bloque de texto (se parte por sus títulos) -->
    <section v-if="!isEmpty" class="bg-[#F7F3EE] pt-8 md:pt-12" aria-labelledby="about-institutional-title">
      <div class="max-w-[1200px] mx-auto px-6 md:px-12 py-12 md:py-16 flex flex-col gap-8">
        <h2 id="about-institutional-title" class="font-serif text-3xl md:text-4xl leading-[1.15] tracking-[-0.01em] text-[#111111] uppercase">
          {{ content.institutional.title }}
        </h2>
        <div class="bg-white border border-[#E7DDD1] rounded-xl shadow-sm p-6 md:p-8">
          <CommonRichContent :html="content.institutional.legal" class="text-[15px] text-gray-700 leading-relaxed" />
        </div>
      </div>
    </section>

    <section
      v-for="(block, i) in blocks"
      :key="i"
      class="border-t border-[#E7DDD1]"
      :class="blockBg(i)"
    >
      <div class="max-w-[1000px] mx-auto px-6 md:px-12 py-12 md:py-16">
        <CommonRichContent :html="block" class="about-block text-gray-600 font-light text-lg leading-relaxed" />
      </div>
    </section>

    <!-- 3. VIDEO INSTITUCIONAL -->
    <section v-if="videoId" class="bg-[#111111]" aria-labelledby="about-video-title">
      <div class="max-w-[1000px] mx-auto px-6 md:px-12 py-16 md:py-24">
        <h2 id="about-video-title" class="font-serif text-3xl md:text-4xl font-medium text-white uppercase text-center mb-10">
          Video institucional
        </h2>
        <div class="relative w-full aspect-video bg-black/40 overflow-hidden rounded-[2rem] shadow-2xl ring-1 ring-[#CBA36B]/30">
          <iframe
            :src="aboutYoutubeEmbedUrl(videoId)"
            class="absolute inset-0 w-full h-full"
            title="Video institucional de Crediestética"
            loading="lazy"
            referrerpolicy="strict-origin-when-cross-origin"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          ></iframe>
        </div>
      </div>
    </section>

    <!-- 4. PREGUNTAS FRECUENTES -->
    <section v-if="content.faqs.length" class="bg-white" aria-labelledby="about-faq-title">
      <div class="max-w-[900px] mx-auto px-6 md:px-12 py-16 md:py-24">
        <h2 id="about-faq-title" class="font-serif text-3xl md:text-4xl font-medium text-[#111111] uppercase text-center mb-10 md:mb-14">
          Preguntas frecuentes
        </h2>
        <AboutFaqAccordion :faqs="content.faqs" id-prefix="about-faq" />
      </div>
    </section>

    <!-- 5. CONTACTO INSTITUCIONAL -->
    <AboutContactSection :contact="content.contact" />

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFetch, useSeoMeta, useHead, useSiteConfig } from '#imports'
import { aboutDefaultContent, aboutIsEmpty, aboutPublicView, aboutYoutubeId, aboutYoutubeEmbedUrl, type AboutContent } from '#shared/utils/aboutContent'

// Contenido administrado desde /admin/nosotros y persistido en el servidor de la web (GET /api/public/about).
// Si la lectura falla o no hay contenido guardado se muestra el estado neutro «sin configurar» (nunca contenido de otra marca).
const { data } = await useFetch<AboutContent>('/api/public/about', { key: 'about-page', default: () => aboutPublicView(aboutDefaultContent()) })
const content = computed<AboutContent>(() => data.value ?? aboutPublicView(aboutDefaultContent()))

const isEmpty = computed(() => aboutIsEmpty(content.value))
// Los tres párrafos se unen y se parten en cada título (h2), para dar a cada tema su propia banda de fondo.
const blocks = computed(() => content.value.institutional.paragraphs.filter(Boolean).join('').split(/(?=<h2[\s>])/i).map(b => b.trim()).filter(Boolean))
const blockBg = (i: number) => ['bg-white', 'bg-[#EFE7DC]', 'bg-[#F7F3EE]'][i % 3]
const videoId = computed(() => aboutYoutubeId(content.value.video.url))

const description = 'Conoce la trayectoria, el respaldo médico y las instituciones aliadas que hacen parte del ecosistema Crediestética.'
useSeoMeta({
  title: 'Nosotros | Crediestética',
  description,
  ogTitle: 'Nosotros | Crediestética',
  ogDescription: description,
  ogImage: () => (content.value.hero.image.startsWith('/') ? content.value.hero.image : '/images/branding/logo_fondo_transparente.png'),
  ogType: 'website'
})

useHead({
  link: [
    { rel: 'canonical', href: `${String(useSiteConfig().url ?? '').replace(/\/+$/, '')}/nosotros` }
  ]
})
</script>

<style scoped>
.about-block :deep(h2) { font-family: var(--font-serif, serif); font-size: 1.75rem; line-height: 1.2; font-weight: 500; color: #111111; text-transform: uppercase; margin-bottom: 1.25rem; padding-bottom: .75rem; border-bottom: 2px solid #CBA36B; width: fit-content; }
.about-block :deep(p + p), .about-block :deep(p + ul), .about-block :deep(ul + p) { margin-top: 1rem; }
</style>

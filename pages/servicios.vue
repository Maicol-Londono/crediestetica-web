<template>
  <SitePageShell title="Servicios" wide image="/images/web/servicios.png">
    <div class="space-y-16 md:space-y-24">

      <!-- Asesoría y financiación -->
      <section class="grid md:grid-cols-2 gap-10 md:gap-16 items-center" aria-labelledby="srv-asesoria">
        <div>
          <h2 id="srv-asesoria" class="h2">Asesoría y financiación de procedimientos estéticos</h2>
          <div class="prose-p mt-5">
            <p>Análisis financiero diligente y humano, diseñado para brindar alternativas crediticias viables sin dilaciones burocráticas.</p>
            <p>Asesoría estructurada y discreta durante toda tu planeación financiera hasta el día efectivo de tu procedimiento.</p>
          </div>
        </div>
        <img src="/images/team/equipo-crediestetica.png" alt="Equipo de Crediestética" loading="lazy" class="w-full aspect-[4/3] object-cover border border-[#E7DDD1]" />
      </section>

      <!-- Preguntas frecuentes: las mismas de /nosotros (administradas en /admin/nosotros) -->
      <section v-if="faqs.length" aria-labelledby="srv-faq" class="max-w-3xl mx-auto">
        <h2 id="srv-faq" class="h2 text-center mb-8 md:mb-10 uppercase">Preguntas frecuentes</h2>
        <AboutFaqAccordion :faqs="faqs" id-prefix="srv-faq" />
      </section>
    </div>
  </SitePageShell>
</template>

<script setup lang="ts">
// Página «Servicios»: textos recuperados del proyecto original de Crediestética; las preguntas frecuentes se comparten con /nosotros.
import { computed } from 'vue'
import { useFetch, useSeoMeta, useHead, useSiteConfig } from '#imports'
import { aboutDefaultContent, aboutPublicView, type AboutContent } from '#shared/utils/aboutContent'

const { data } = await useFetch<AboutContent>('/api/public/about', { key: 'about-page', default: () => aboutPublicView(aboutDefaultContent()) })
const faqs = computed(() => (data.value ?? aboutPublicView(aboutDefaultContent())).faqs)

const description = 'Asesoría y financiación de procedimientos estéticos con Crediestética: estudio de perfil ágil y acompañamiento integral durante tu planeación financiera.'
useSeoMeta({ title: 'Servicios | Crediestética', ogTitle: 'Servicios | Crediestética', description, ogDescription: description, ogType: 'website' })
useHead({ link: [{ rel: 'canonical', href: `${String(useSiteConfig().url ?? '').replace(/\/+$/, '')}/servicios` }] })
</script>

<style scoped>
.h2 { font-family: var(--font-serif, serif); font-size: 1.75rem; line-height: 1.2; font-weight: 500; color: #111111; }
.prose-p { color: #4b5563; font-weight: 300; font-size: 1.0625rem; line-height: 1.75; }
.prose-p > * + * { margin-top: 1rem; }
</style>

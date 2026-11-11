<template>
  <SitePageShell title="¿Quiénes somos?" image="/images/web/quienes_somos.png" wide>
    <div class="space-y-16 md:space-y-24">

      <!-- Introducción -->
      <section aria-labelledby="qs-intro">
        <h2 id="qs-intro" class="h2">Especialistas en financiación para procedimientos estéticos</h2>
        <div class="prose-p mt-4 max-w-3xl">
          <p>Creemos que postergar tu bienestar ya no es necesario. Facilitamos el acceso a procedimientos estéticos de alta calidad mediante planes de financiación accesibles.</p>
          <p>Detrás de cada procedimiento existe un equipo comprometido con tu tranquilidad.</p>
        </div>
      </section>

      <!-- Valores -->
      <section class="grid md:grid-cols-3 gap-10" aria-labelledby="qs-valores">
        <h2 id="qs-valores" class="h2 md:col-span-3">Lo que nos define</h2>
        <div>
          <h3 class="h3">Responsabilidad</h3>
          <p class="prose-p mt-3">Transparencia absoluta en cada proceso financiero, priorizando tu tranquilidad mental y capacidad de pago.</p>
        </div>
        <div>
          <h3 class="h3">Innovación</h3>
          <p class="prose-p mt-3">Tecnología de punta para aprobaciones inmediatas y una experiencia de usuario digital fluida.</p>
        </div>
        <div>
          <h3 class="h3">Inmediatez</h3>
          <p class="prose-p mt-3">Entendemos que tus sueños no pueden esperar. Procesamos tu solicitud en tiempo récord con mínima fricción.</p>
        </div>
      </section>

      <!-- Garantía -->
      <section aria-labelledby="qs-garantia">
        <h2 id="qs-garantia" class="h2">La Garantía Crediestética</h2>
        <div class="prose-p mt-4 max-w-3xl">
          <p>Operamos bajo estrictos estándares de validación para garantizar la seguridad clínica y viabilidad financiera de nuestros pacientes.</p>
        </div>
        <div class="grid md:grid-cols-2 gap-10 mt-8">
          <div>
            <h3 class="h3">Especialistas verificables</h3>
            <p class="prose-p mt-3">Verificación estricta en el Registro Único Nacional de Talento Humano en Salud (RETHUS) para asegurar idoneidad profesional.</p>
          </div>
          <div>
            <h3 class="h3">Instituciones habilitadas</h3>
            <p class="prose-p mt-3">Nuestra red médica aliada cumple rigurosamente con los requisitos del Registro Especial de Prestadores de Servicios de Salud (REPS).</p>
          </div>
          <div>
            <h3 class="h3">Estudio de perfil ágil</h3>
            <p class="prose-p mt-3">Análisis financiero diligente y humano diseñado para brindar alternativas crediticias viables sin dilaciones burocráticas.</p>
          </div>
          <div>
            <h3 class="h3">Acompañamiento integral</h3>
            <p class="prose-p mt-3">Asesoría estructurada y discreta durante toda tu planeación financiera hasta el día efectivo de tu procedimiento.</p>
          </div>
        </div>
      </section>

      <!-- Cierre -->
      <section class="max-w-4xl mx-auto text-center md:text-left md:mx-0">
        <h2 class="h2">Da el primer paso hoy</h2>
        <div class="prose-p mt-4">
          <p>Puedes conocer cómo funciona el proceso, evaluar tu caso y descubrir cuánto podrías financiar.</p>
        </div>
        <div class="flex justify-center md:justify-start mt-8">
          <NuxtLink to="/financiacion#calculadora" class="inline-flex items-center gap-3 bg-[#111111] hover:bg-[#333333] text-white px-8 py-4 text-xs font-bold tracking-[0.15em] uppercase transition-colors">Simular financiación</NuxtLink>
        </div>
      </section>
    </div>
  </SitePageShell>
</template>

<script setup lang="ts">
// Página estática (sin administración): textos institucionales recuperados del proyecto original de Crediestética.
import { useSeoMeta, useHead, useSiteConfig } from '#imports'

const description = 'Conoce a Crediestética: especialistas en financiación para procedimientos estéticos, con especialistas verificables en RETHUS e instituciones habilitadas en REPS.'
useSeoMeta({ title: 'Quiénes somos | Crediestética', ogTitle: 'Quiénes somos | Crediestética', description, ogDescription: description, ogType: 'website' })
useHead({ link: [{ rel: 'canonical', href: `${String(useSiteConfig().url ?? '').replace(/\/+$/, '')}/quienes-somos` }] })
</script>

<style scoped>
.h2 { font-family: var(--font-serif, serif); font-size: 1.625rem; line-height: 1.2; font-weight: 500; color: #111111; }
.h3 { font-family: var(--font-serif, serif); font-size: 1.25rem; font-weight: 500; color: #9a7a45; }
.prose-p { color: #4b5563; font-weight: 300; font-size: 1.0625rem; line-height: 1.75; }
.prose-p > * + * { margin-top: 1rem; }
.prose-p strong { color: #111111; font-weight: 600; }
.prose-p ul { list-style: none; padding: 0; }
.prose-p ul li { position: relative; padding-left: 1.25rem; margin-top: .5rem; }
.prose-p ul li::before { content: ''; position: absolute; left: 0; top: .7em; width: 6px; height: 6px; background: #CBA36B; border-radius: 9999px; }
</style>

<template>
  <nav aria-label="Secciones de pacientes" class="flex flex-wrap justify-center md:justify-start gap-2 mb-14">
    <NuxtLink
      v-for="item in visibleItems"
      :key="item.to"
      :to="item.to"
      class="px-5 py-2.5 text-[11px] font-bold tracking-[0.15em] uppercase border transition-colors"
      :class="$route.path === item.to ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#111111] border-[#E7DDD1] hover:border-[#111111]'"
    >
      {{ item.label }}
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
import { fetchPatientSection } from '~/services/PublicTestimonialsService'

// Misma clave que las páginas: una sola petición a Hub por navegación y el menú ya sale correcto en el servidor.
const { data } = await useAsyncData('patient-section', fetchPatientSection)
const visibility = computed(() => data.value?.visibility ?? { videos: true, beforeAfter: true })

const items = [
  { to: '/testimonios', label: 'Videos', key: 'videos' },
  { to: '/testimonios/antes-y-despues', label: 'Antes y después', key: 'beforeAfter' },
  { to: '/testimonios/programa-de-referidos', label: 'Programa de referidos', key: null }
]
const visibleItems = computed(() => items.filter(i => !i.key || visibility.value[i.key as 'videos' | 'beforeAfter']))
</script>

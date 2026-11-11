<template>
  <!-- Botón de acción opcional de una sección. El destino ya viene validado (https, mailto:, tel: o ruta interna). -->
  <NuxtLink v-if="internal" :to="cta.url" :class="classes">{{ cta.label }}</NuxtLink>
  <a v-else :href="cta.url" :class="classes" :target="external ? '_blank' : undefined" :rel="external ? 'noopener noreferrer' : undefined">{{ cta.label }}</a>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TreeCta } from '#shared/utils/recommendationTree'

const props = defineProps<{ cta: TreeCta, variant?: 'dark' | 'gold' | 'light' }>()

const internal = computed(() => props.cta.url.startsWith('/'))
const external = computed(() => props.cta.url.startsWith('https://'))
const classes = computed(() => [
  'inline-flex items-center justify-center max-w-full px-7 py-3 text-[11px] font-bold tracking-[0.15em] uppercase text-center break-words transition-colors',
  props.variant === 'light' ? 'bg-[#CBA36B] text-[#111111] hover:bg-white' : props.variant === 'gold' ? 'bg-[#CBA36B] text-[#111111] hover:bg-[#111111] hover:text-white' : 'bg-[#111111] text-white hover:bg-black'
])
</script>

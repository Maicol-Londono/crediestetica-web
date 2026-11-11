<template>
  <SitePageShell :title="page.title" :subtitle="page.subtitle" :wide="wide" :image="image">
    <CommonRichContent v-if="page.body" :html="page.body" class="text-lg font-light" />
    <slot />
  </SitePageShell>
</template>

<script setup lang="ts">
// Página informativa administrada desde /admin/paginas/<slug> (GET /api/public/pages/<slug>). Sin texto guardado muestra «Contenido próximamente».
import { computed } from 'vue'
import { useFetch, useSeoMeta, useHead, useSiteConfig } from '#imports'
import { SITE_PAGES, sitePageDefault, type SitePageContent, type SitePageSlug } from '#shared/utils/sitePages'

const props = defineProps<{ slug: SitePageSlug, wide?: boolean, image?: string }>()

const { data } = await useFetch<SitePageContent>(`/api/public/pages/${props.slug}`, { key: `site-page-${props.slug}`, default: () => sitePageDefault(props.slug) })
const page = computed(() => data.value ?? sitePageDefault(props.slug))

const title = `${page.value.title} | Crediestética`
useSeoMeta({ title, ogTitle: title, ogType: 'website', description: () => page.value.subtitle || `${page.value.title} - Crediestética`, ogDescription: () => page.value.subtitle || `${page.value.title} - Crediestética` })
useHead({ link: [{ rel: 'canonical', href: `${String(useSiteConfig().url ?? '').replace(/\/+$/, '')}${SITE_PAGES[props.slug].route}` }] })
</script>

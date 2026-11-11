<!-- Enlace de un consentimiento a su documento legal. Mientras el documento no tenga URL oficial válida (shared/utils/legalDocuments.ts)
     se muestra «(documento en actualización)» y apunta a la página provisional; nunca simula un documento disponible. -->
<script setup lang="ts">
import { computed } from 'vue'
import { legalDocLink, type LegalDocumentKey } from '#shared/utils/legalDocuments'

const props = defineProps<{ doc: LegalDocumentKey }>()
const link = computed(() => legalDocLink(props.doc))
</script>

<template>
  <a v-if="link.external" :href="link.href" target="_blank" rel="noopener noreferrer" :data-doc="doc" data-doc-pending="false" @click.stop><slot>{{ link.label }}</slot></a>
  <NuxtLink v-else :to="link.href" target="_blank" :data-doc="doc" :data-doc-pending="String(link.pending)" @click.stop><slot>{{ link.label }}</slot></NuxtLink>
</template>

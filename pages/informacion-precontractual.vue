<template>
  <SitePageShell title="Información precontractual y advertencias al consumidor" image="/images/web/informacion_precontractual.png">
    <article class="space-y-6 text-base md:text-[17px] font-light text-gray-700 leading-relaxed bg-white border border-[#E7DDD1] border-l-[3px] border-l-[#CBA36B] p-6 md:p-10">
      <PrecontractualContent />
    </article>
  </SitePageShell>
</template>

<script setup lang="ts">
// Página estática (sin administración). Mismo contenido que el modal global: ambos renderizan PrecontractualContent.vue (texto en
// shared/utils/precontractualContent.ts; identificación en shared/utils/legalIdentity.ts, razón social y PQRS pendientes).
import { useSeoMeta } from '#imports'
import PrecontractualContent from '~/components/legal/PrecontractualContent.vue'
useCanonicalUrl()

useSeoMeta({ title: 'Información precontractual | Crediestética', ogTitle: 'Información precontractual | Crediestética', ogType: 'website' })
</script>

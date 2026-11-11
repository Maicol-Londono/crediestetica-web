<template>
  <!-- Página estática (sin administración en este panel): solo el formulario, que aún es maqueta. -->
  <SitePageShell title="Estudio de créditos" wide image="/images/web/estudio_creditos.png">
    <CreditStudyForm class="!mt-0" />
  </SitePageShell>
</template>

<script setup lang="ts">
import { useSeoMeta, useHead, useSiteConfig } from '#imports'

useSeoMeta({ title: 'Estudio de créditos | Crediestética', ogTitle: 'Estudio de créditos | Crediestética', ogType: 'website' })
useHead({ link: [{ rel: 'canonical', href: `${String(useSiteConfig().url ?? '').replace(/\/+$/, '')}/estudio-de-creditos` }] })
</script>

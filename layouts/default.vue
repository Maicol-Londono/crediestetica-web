<template>
  <div class="theme-crediestetica min-h-screen bg-white text-black flex flex-col font-sans">
    <LayoutNavbar />
    <!-- El menú es fijo: salvo en las páginas con hero (que pasa por debajo del menú transparente), el contenido empieza bajo él. -->
    <main class="flex-grow" :class="isHero ? '' : 'pt-20'">
      <slot />
    </main>
    <LayoutFooter />
    
    <!-- Botones flotantes: en móvil se ocultan en las páginas legales para no tapar el texto (en escritorio se mantienen). -->
    <div :class="isLegalPage ? 'hidden md:block' : ''" data-testid="floating-actions">
      <!-- Chat global: botón flotante con WhatsApp y Messenger (reemplaza el FAB único de WhatsApp) -->
      <LayoutChatLauncher />

      <!-- «Pide tu cita de valoración»: botón flotante + ventana (maqueta, no funcional). Sin micrositios PRP. -->
      <FormsValuationRequest v-if="!isPrpPage" />
    </div>

    <!-- Modal Precontractual Global (no se monta en los micrositios PRP: /prp/** ni en las páginas legales, que deben poder consultarse sin aceptarlo) -->
    <CommonPrecontractualModal v-if="!isPrpPage && !isLegalPage" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { isHeroRoute } from '#shared/utils/heroRoutes'

const route = useRoute()
const isHero = computed(() => isHeroRoute(route.path))
// Los micrositios de referidos (/prp/**) no muestran la información precontractual global.
const isPrpPage = computed(() => /^\/prp(\/|$)/.test(route.path))
// Páginas legales: se consultan sin el modal precontractual y sin botones flotantes sobre el texto en móvil.
const isLegalPage = computed(() => /^\/(politica-datos-personales|informacion-precontractual)\/?$/.test(route.path))
</script>

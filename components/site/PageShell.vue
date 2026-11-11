<template>
  <div class="bg-white font-sans selection:bg-[#111111] selection:text-white">
    <!-- Con imagen: cabecera a ancho completo con tarjeta oscura (CommonImageHero). Sin imagen: mismo encabezado que las listas (CommonPageHero). -->
    <CommonImageHero v-if="image" :image="image" :eyebrow="eyebrow" :title="title" :lead="subtitle" />
    <div v-else class="bg-[#F7F3EE] pt-6 md:pt-10 px-6" :class="bare ? 'pb-10 md:pb-14' : ''">
      <div class="mx-auto" :class="wide ? 'max-w-[1200px]' : 'max-w-[1000px]'">
        <CommonPageHero :eyebrow="eyebrow || 'Crediestética'" :lines="[title]" :lead="subtitle" :facts="[]" class="!mb-0">
          <template v-if="$slots.actions" #actions><slot name="actions" /></template>
        </CommonPageHero>
      </div>
    </div>
    <main v-if="bare">
      <slot />
    </main>
    <main v-else class="bg-[#F7F3EE]">
      <div class="mx-auto px-6 md:px-12 pt-10 pb-14 md:pt-14 md:pb-20 text-gray-700 leading-relaxed" :class="wide ? 'max-w-[1200px]' : 'max-w-[1000px]'">
        <slot>
          <p class="text-gray-500 font-light text-lg">Contenido próximamente.</p>
        </slot>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string, eyebrow?: string, /** Imagen de la cabecera (ruta pública); activa la cabecera con imagen. */ image?: string, subtitle?: string, wide?: boolean, /** Sin contenedor: la página arma sus propias secciones de ancho completo. */ bare?: boolean }>()
</script>

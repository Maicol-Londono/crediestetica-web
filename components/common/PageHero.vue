<template>
  <!-- Encabezado de VISTA PRINCIPAL (listas y páginas institucionales) con la identidad original de Crediestética: bloque oscuro
       #111111 de esquinas muy redondeadas, eyebrow dorado, título serif en negrita y texto alineado a la izquierda.
       Las vistas de DETALLE usan en cambio cabecera a todo el ancho con degradado (ver CommonDetailBack y las páginas [slug]). -->
  <header class="relative overflow-hidden bg-[#111111] text-white rounded-[2rem] mb-10 md:mb-14 px-6 py-10 md:px-16 md:py-14 text-center md:text-left">
    <div class="relative grid gap-10 items-center" :class="facts.length ? 'md:grid-cols-[1fr_auto]' : ''">
      <div>
        <p class="text-[11px] font-bold tracking-[0.2em] text-[#CBA36B] uppercase mb-5">{{ eyebrow }}</p>
        <h1 class="font-serif text-[36px] md:text-[52px] lg:text-[64px] leading-[1.1] tracking-[-0.01em] text-white uppercase max-w-4xl break-words">
          <template v-for="(line, i) in lines" :key="i">{{ line }}<br v-if="i < lines.length - 1" /></template>
        </h1>
        <p v-if="lead" class="mt-6 text-base md:text-lg text-white/80 max-w-2xl leading-relaxed mx-auto md:mx-0">{{ lead }}</p>
        <div v-if="$slots.actions" class="mt-8"><slot name="actions" /></div>
      </div>

      <!-- Cifras destacadas a la derecha (solo escritorio). -->
      <dl v-if="facts.length" class="hidden md:grid gap-6 border-l border-[#CBA36B]/40 pl-10 text-left">
        <div v-for="f in facts" :key="f.label">
          <dd class="font-serif text-4xl lg:text-5xl text-[#CBA36B] leading-none">{{ f.value }}</dd>
          <dt class="mt-1 text-[11px] font-bold tracking-[0.15em] uppercase text-white/70">{{ f.label }}</dt>
        </div>
      </dl>
    </div>
  </header>
</template>

<script setup lang="ts">
// Sin `facts` no se muestran cifras: las de Planmed (pacientes, años) no aplican a Crediestética y no hay cifras verificadas.
withDefaults(defineProps<{ eyebrow: string, lines: string[], lead?: string, facts?: { value: string, label: string }[] }>(), {
  facts: () => []
})
</script>

<template>
  <!-- Cabecera con imagen a ancho completo y tarjeta oscura que la solapa (composición del original: Nosotros y Recursos). -->
  <section class="relative w-full bg-[#F7F3EE]" :aria-labelledby="titleId">
    <div class="relative w-full h-[60vh] md:h-[70vh] lg:h-[80vh] bg-[#111111]">
      <img :src="image" alt="" aria-hidden="true" width="1920" height="819" fetchpriority="high" class="w-full h-full object-cover object-center" />
      <div class="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/60 to-transparent md:bg-gradient-to-r md:from-[#111111] md:via-[#111111]/80 md:to-transparent" aria-hidden="true"></div>
    </div>
    <div class="w-full max-w-[1200px] mx-auto px-4 md:px-8 -mt-24 md:-mt-32 relative z-10">
      <div class="bg-[#111111] shadow-2xl rounded-2xl p-8 md:p-12 lg:p-16 w-full md:max-w-[85%] lg:max-w-[800px] flex flex-col border border-[#BBB2AA]/20">
        <p class="inline-block self-start bg-[#CBA36B] text-[#111111] px-4 py-1.5 rounded-full font-bold text-xs md:text-sm mb-6">{{ eyebrow }}</p>
        <h1 :id="titleId" class="font-serif text-[26px] sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#F7F3EE] mb-2 leading-snug tracking-tight uppercase break-words">{{ title }}</h1>
        <p v-if="lead" class="mt-4 text-base md:text-lg text-[#BBB2AA] leading-relaxed font-light max-w-2xl">{{ lead }}</p>
        <dl v-if="facts?.length" class="mt-6 flex flex-wrap gap-x-10 gap-y-4">
          <div v-for="f in facts" :key="f.label">
            <dd class="font-serif text-3xl text-[#CBA36B] leading-none">{{ f.value }}</dd>
            <dt class="mt-1 text-[11px] font-bold tracking-[0.15em] uppercase text-white/70">{{ f.label }}</dt>
          </div>
        </dl>
        <div v-if="$slots.actions" class="mt-8"><slot name="actions" /></div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ image: string, title: string, eyebrow?: string, lead?: string, facts?: { value: string, label: string }[], titleId?: string }>(), {
  eyebrow: 'Crediestética',
  titleId: 'page-hero-title'
})
</script>

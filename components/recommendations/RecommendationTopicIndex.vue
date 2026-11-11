<template>
  <!-- Portada de un tema principal de recomendaciones: lista de sus subtemas publicados. Mismo diseño que los índices de cuidados/revisión. -->
  <div class="bg-[#F7F3EE] min-h-screen font-sans">
    <div class="max-w-[1200px] mx-auto px-6 pt-6 md:pt-10">
      <CommonPageHero eyebrow="RECOMENDACIONES" :lines="[topic.title]" :facts="[{ value: String(topic.subtopics.length), label: topic.subtopics.length === 1 ? 'Tema' : 'Temas' }]" class="!mb-0" />
    </div>

    <main class="max-w-[1200px] mx-auto px-6 py-12 md:py-16">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <NuxtLink
          v-for="sub in topic.subtopics" :key="sub.slug" :to="subtopicPath(topic.slug, sub.slug)"
          class="group bg-white border border-[#E7DDD1] border-t-4 border-t-[#CBA36B] overflow-hidden hover:shadow-xl transition-all duration-300"
        >
          <div class="aspect-[16/9] bg-gradient-to-br from-[#111111] to-[#333333]"></div>
          <div class="p-6">
            <h2 class="font-serif text-xl text-black mb-3 break-words">{{ sub.menuLabel }}</h2>
            <span class="inline-flex items-center text-[11px] font-bold tracking-[0.15em] uppercase text-[#111111]">
              Ver recomendaciones
              <svg class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </span>
          </div>
        </NuxtLink>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { subtopicPath, type TreeTopic } from '#shared/utils/recommendationTree'

defineProps<{ topic: TreeTopic }>()
</script>

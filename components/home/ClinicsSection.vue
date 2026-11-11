<template>
  <!-- Solo se muestra si hay clínicas aliadas activas administradas (/admin/paginas/clinicas-aliadas). Sin ellas la sección no existe:
       no se heredan logos, ciudades ni afirmaciones de otra marca. -->
  <section v-if="managed.length" class="py-24 md:py-32 px-6 bg-[#F7F3EE] border-t border-[#E7DDD1]" data-testid="home-clinics-section">
    <div class="max-w-[1200px] mx-auto">

      <div class="mb-16 md:mb-24 max-w-2xl">
        <p class="text-[11px] font-bold tracking-[0.15em] text-[#848484] uppercase mb-6">INSTITUCIONES Y PROFESIONALES</p>
        <h2 class="font-serif text-[40px] md:text-[56px] font-medium leading-[1.05] tracking-[-0.02em] text-black uppercase">
          CLÍNICAS ALIADAS
        </h2>
        <div class="w-12 h-[1px] bg-[#111111] mt-8"></div>
      </div>

      <ul class="grid grid-cols-2 lg:grid-cols-5 border-t border-l border-[#E7DDD1]" data-testid="home-clinics">
        <li v-for="(clinic, index) in managed" :key="clinic.id" class="border-b border-r border-[#E7DDD1]">
          <NuxtLink
            :to="`/clinicas-aliadas#${clinic.id}`"
            class="group relative h-full min-h-[14rem] flex flex-col items-center justify-center gap-4 p-6 hover:bg-white transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#111111]"
          >
            <span class="absolute top-4 left-5 text-[10px] font-bold tracking-widest text-[#cfc4c5] group-hover:text-[#111111] transition-colors" aria-hidden="true">
              {{ String(index + 1).padStart(2, '0') }}
            </span>
            <img :src="clinic.image" :alt="`Imagen de ${clinic.name}`" loading="lazy" class="w-full max-w-[160px] h-24 object-contain group-hover:scale-105 transition-transform duration-500 ease-out" />
            <span class="text-[11px] font-bold tracking-[0.1em] uppercase text-[#4c4546] group-hover:text-[#111111] text-center leading-snug break-words">{{ clinic.name }}</span>
          </NuxtLink>
        </li>
      </ul>

    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useFetch } from '#imports'

// Clínicas activas (el endpoint público ya excluye las ocultas); misma clave de caché que la página /clinicas-aliadas.
const { data } = await useFetch('/api/public/clinics', { key: 'clinics-public', default: () => ({ clinics: [], updatedAt: '' }) })
const managed = computed(() => data.value?.clinics ?? [])
</script>

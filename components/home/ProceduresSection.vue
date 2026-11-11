<template>
  <section class="bg-[#F7F3EE] py-16 md:py-24 px-4 md:px-12 border-b border-[#BBB2AA]/30">
    <div class="max-w-[1200px] mx-auto">
      
      <!-- Encabezado de la sección -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 md:mb-24 border-t border-[#111111] pt-8">
        <div class="max-w-xl">
          <p class="text-[11px] font-bold tracking-[0.15em] text-[#848484] uppercase mb-6 flex items-center gap-3">
             <span class="w-2 h-2 rounded-full bg-[#111111]"></span>
             PORTAFOLIO MÉDICO
          </p>
          <h2 class="font-serif text-[32px] md:text-[44px] lg:text-[52px] font-medium leading-[1.1] tracking-[-0.01em] text-[#111111] uppercase mb-4">
            PROCEDIMIENTOS<br/>
            DESTACADOS.
          </h2>
          <p class="text-[14px] text-[#4c4546] font-medium">Estamos ampliando progresivamente nuestra oferta de procedimientos financiables.</p>
        </div>
        <div class="hidden md:block">
          <NuxtLink :to="'/procedimientos'" class="text-[11px] font-bold tracking-[0.15em] text-[#111111] border-b border-[#111111] pb-2 uppercase hover:text-[#848484] hover:border-[#848484] transition-colors">
            VER TODOS LOS PROCEDIMIENTOS
          </NuxtLink>
        </div>
      </div>

      <!-- Cuadrícula editorial (staggered grid en desktop) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 lg:gap-x-24 gap-y-16">
        <HomeProcedureCard 
          v-for="(proc, index) in featured" 
          :key="proc.id" 
          :procedure="proc"
          :class="{ 'md:mt-24': index % 2 !== 0 }"
        />
      </div>

      <div class="mt-16 text-center border-t border-[#E7DDD1] pt-12">
        <NuxtLink
          :to="'/procedimientos'"
          class="inline-flex bg-[#111111] text-white px-10 py-4 text-xs font-bold tracking-[0.15em] uppercase rounded-full border-2 border-[#111111] hover:bg-transparent hover:text-[#111111] transition-all active:scale-95"
          data-testid="home-all-procedures"
        >
          Ver todos los procedimientos
        </NuxtLink>
      </div>

    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useAsyncData } from '#imports'
import { publicProcedureService } from '~/services/PublicProcedureService'

const { data: procedures } = await useAsyncData('home-procedures', () => publicProcedureService.getProcedures(), {
  default: () => []
})

// Solo 4 en la home: primero los destacados y, si faltan, se completan con los demás en el orden de la API.
const HOME_LIMIT = 4
const featured = computed(() => {
  const all = procedures.value ?? []
  return [...all.filter(p => p.destacado), ...all.filter(p => !p.destacado)].slice(0, HOME_LIMIT)
})
</script>

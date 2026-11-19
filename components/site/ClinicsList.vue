<template>
  <!-- Error de lectura: aviso con reintento (no «sin clínicas»). Lista vacía válida: mensaje de ausencia de contenido. -->
  <CommonHubUnavailable v-if="error" :retrying="status === 'pending'" class="mt-10" @retry="refresh()" />
  <p
    v-else-if="!clinics.length"
    data-testid="clinics-empty"
    class="mt-10 text-center text-gray-500 font-light py-16 border border-dashed border-[#BBB2AA] rounded-xl bg-white"
  >
    Pronto compartiremos aquí nuestras clínicas aliadas.
  </p>
  <section v-else aria-label="Clínicas aliadas" class="mt-10">
    <!-- Cada tarjeta es un solo enlace al detalle (enlace extendido sobre el nombre): una imagen, nombre y extracto. -->
    <ul class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
      <li v-for="c in clinics" :id="c.id" :key="c.id" class="scroll-mt-28">
        <article class="group relative h-full flex flex-col bg-white border border-[#E7DDD1] rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-within:ring-2 focus-within:ring-[#CBA36B]">
          <div class="overflow-hidden bg-[#111111]">
            <img :src="c.image" :alt="`Imagen de ${c.name}`" loading="lazy" class="w-full aspect-[4/3] object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
          </div>
          <div class="flex flex-col flex-1 p-6 md:p-7">
            <span class="block w-10 h-[2px] bg-[#CBA36B] mb-4" aria-hidden="true"></span>
            <h2 class="font-serif text-2xl text-[#111111] break-words">
              <NuxtLink :to="`/clinicas-aliadas/${c.id}`" class="outline-none after:absolute after:inset-0 after:content-['']">{{ c.name }}</NuxtLink>
            </h2>
            <p v-if="excerpt(c.description)" class="mt-3 text-gray-600 font-light leading-relaxed line-clamp-3 flex-1">{{ excerpt(c.description) }}</p>
            <span class="mt-5 inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] uppercase text-[#111111] group-hover:text-[#755A26] transition-colors" aria-hidden="true">
              Ver detalle
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 12h14m-6-6l6 6-6 6" /></svg>
            </span>
          </div>
        </article>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
// Clínicas aliadas administradas desde /admin/paginas/clinicas-aliadas (GET /api/public/clinics). Sin clínicas se muestra un mensaje; un error de lectura, el aviso con reintento.
// La galería, los documentos y el contacto se muestran en el detalle (/clinicas-aliadas/<id>).
import { computed } from 'vue'
import { useFetch } from '#imports'
import { clinicsDefault, type ClinicsContent } from '#shared/utils/clinics'

const { data, error, refresh, status } = await useFetch<ClinicsContent>('/api/public/clinics', { key: 'clinics-public', default: () => clinicsDefault() })
useServiceUnavailable(error)
const clinics = computed(() => data.value?.clinics ?? [])

// Extracto en texto plano de la descripción (HTML saneado): sin etiquetas ni entidades básicas.
const excerpt = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim()
</script>

<template>
  <!-- Se despliega con <details>/<summary> NATIVOS: abrir y cerrar funciona aunque la página aún no se haya hidratado (en las páginas pesadas la
       hidratación tarda y un botón controlado solo por Vue ignoraba los clics). Vue añade el cierre con Escape y al hacer clic fuera. -->
  <div ref="root" class="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50" data-testid="chat-launcher" @keydown.esc="close(true)">
    <details ref="details" class="group relative">
      <summary
        class="list-none [&::-webkit-details-marker]:hidden flex items-center justify-center w-14 h-14 bg-black text-white rounded-full shadow-2xl hover:bg-[#CBA36B] hover:scale-110 active:scale-95 transition-all cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2"
        aria-controls="chat-launcher-panel"
        aria-label="Chatea con nosotros" title="Chatea con nosotros"
      >
        <span class="relative flex">
          <svg class="w-6 h-6 group-open:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 10h8M8 14h5m-9 6l2.6-3.1A8 8 0 1112 20H4z" /></svg>
          <svg class="w-6 h-6 hidden group-open:block" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M6 18L18 6M6 6l12 12" /></svg>
          <span class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#25D366] ring-2 ring-black group-open:hidden" aria-hidden="true"></span>
        </span>
      </summary>

      <!-- Canales de chat (encima del botón, alineados a su borde derecho) -->
      <div id="chat-launcher-panel" role="group" aria-label="Elige un canal de chat" class="absolute bottom-full right-0 mb-3">
        <ul class="flex flex-col items-end gap-3">
          <li>
          <a :href="whatsappUrl" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-xl hover:scale-110 active:scale-95 transition" data-testid="chat-whatsapp" aria-label="Chatear por WhatsApp" title="WhatsApp">
            <svg class="w-7 h-7 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
          </a>
        </li>
        </ul>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
// Lanzador de chat global: botón flotante que despliega el canal de WhatsApp de Crediestética.
// El estado abierto/cerrado vive en el <details> nativo (funciona antes de hidratar); aquí solo se añaden Escape y clic fuera.
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { WHATSAPP_URL } from '#shared/utils/contact'

const whatsappUrl = WHATSAPP_URL


const root = ref<HTMLElement | null>(null)
const details = ref<HTMLDetailsElement | null>(null)

function close(restoreFocus = false) {
  if (!details.value?.open) return
  details.value.open = false
  if (restoreFocus) details.value.querySelector<HTMLElement>('summary')?.focus()
}
function onOutside(e: MouseEvent) {
  if (details.value?.open && root.value && !root.value.contains(e.target as Node)) close()
}
onMounted(() => document.addEventListener('click', onOutside))
onBeforeUnmount(() => document.removeEventListener('click', onOutside))
</script>

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
      <div id="chat-launcher-panel" role="group" aria-label="Elige un canal de chat" class="absolute bottom-full right-0 mb-3 -mr-1 px-1 py-1 max-h-[calc(100dvh-7.5rem)] overflow-y-auto overscroll-contain">
        <ul class="flex flex-col items-end gap-3">
          <li class="chat-item" style="--i: 0">
          <a :href="whatsappUrl" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#25D366] text-white shadow-xl hover:scale-110 active:scale-95 transition" data-testid="chat-whatsapp" aria-label="Chatear por WhatsApp" title="WhatsApp">
            <svg class="w-7 h-7 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
          </a>
        </li>
        <!-- Messenger: abre el perfil de Facebook de Crediestética (aún no hay URL oficial de chat directo). -->
        <li class="chat-item" style="--i: 1">
          <a :href="messengerUrl" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#0084FF] text-white shadow-xl hover:scale-110 active:scale-95 transition" data-testid="chat-messenger" aria-label="Messenger de Crediestética (abre el perfil de Facebook)" title="Messenger">
            <svg class="w-6 h-6 md:w-7 md:h-7 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0C5.24 0 0 4.952 0 11.64c0 3.499 1.434 6.521 3.769 8.61a.96.96 0 0 1 .323.683l.065 2.135a.96.96 0 0 0 1.347.85l2.381-1.053a.96.96 0 0 1 .641-.046A13 13 0 0 0 12 23.28c6.76 0 12-4.952 12-11.64S18.76 0 12 0m6.806 7.44c.522-.03.971.567.63 1.094l-4.178 6.457a.707.707 0 0 1-.977.208l-3.87-2.504a.44.44 0 0 0-.49.007l-4.363 3.01c-.637.438-1.415-.317-.995-.966l4.179-6.457a.706.706 0 0 1 .977-.21l3.87 2.505c.145.09.33.086.472-.011l4.361-3.01c.142-.098.296-.14.438-.151" /></svg>
          </a>
        </li>
        <li class="chat-item" style="--i: 2">
          <a :href="instagramUrl" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-tr from-[#FEDA75] via-[#D62976] to-[#4F5BD5] text-white shadow-xl hover:scale-110 active:scale-95 transition" data-testid="chat-instagram" aria-label="Instagram de Crediestética" title="Instagram">
            <svg class="w-6 h-6 md:w-7 md:h-7 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
          </a>
        </li>
        <li class="chat-item" style="--i: 3">
          <a :href="facebookUrl" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#1877F2] text-white shadow-xl hover:scale-110 active:scale-95 transition" data-testid="chat-facebook" aria-label="Facebook de Crediestética" title="Facebook">
            <svg class="w-6 h-6 md:w-7 md:h-7 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
          </a>
        </li>
        </ul>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
// Lanzador de chat global: botón flotante que despliega WhatsApp, Messenger (cuando exista su URL oficial), Instagram y Facebook de Crediestética.
// El estado abierto/cerrado vive en el <details> nativo (funciona antes de hidratar); aquí solo se añaden Escape y clic fuera.
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { WHATSAPP_URL } from '#shared/utils/contact'

const whatsappUrl = WHATSAPP_URL
// Perfiles oficiales indicados por el titular para este lanzador (se abren en pestaña nueva).
const instagramUrl = 'https://www.instagram.com/crediestetica?gwpx=MTk1MWJrdTFvYno1cQ%3D%3D&utm_source=qr'
const facebookUrl = 'https://www.facebook.com/share/1JALds9xxy/?mibextid=wwXIfr'
// Messenger: no hay URL oficial de chat. Por decisión del titular, el botón abre el perfil de Facebook de Crediestética (no un chat directo).
// Cuando exista la URL oficial de Messenger (m.me/…), basta con sustituir este valor.
const messengerUrl = 'https://www.facebook.com/profile.php?id=61591493931360'


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

<style scoped>
/* Aparición sutil y escalonada de los canales al abrir el menú (sin movimiento si el usuario lo reduce). */
@media (prefers-reduced-motion: no-preference) {
  details[open] .chat-item {
    animation: chat-item-in 180ms ease-out both;
    animation-delay: calc(var(--i, 0) * 45ms);
  }
}
@keyframes chat-item-in {
  from { opacity: 0; transform: translateY(8px) scale(0.9); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>

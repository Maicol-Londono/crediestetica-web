<template>
  <!-- Menú fijo, igual que el original: transparente sobre el hero de Inicio y Procedimientos (logo y enlaces blancos) y blanco translúcido
       con desenfoque al desplazarse o en cualquier otra página. En escritorio se oculta al bajar y reaparece al subir. Los colores se
       definen con variables CSS según el estado, para no duplicar clases. -->
  <nav class="font-sans fixed top-0 w-full z-50 transition-all duration-300"
    :class="[
      isTransparent
        ? (onHero ? 'bg-transparent backdrop-blur-none shadow-none [--nav-fg:#ffffff] [--nav-fg-hover:rgba(255,255,255,0.8)] [--nav-login-fg:#ffffff] [--nav-login-border:rgba(255,255,255,0.6)] [--nav-login-hover-bg:rgba(255,255,255,0.1)] [--nav-login-hover-fg:#ffffff] [--nav-login-hover-border:rgba(255,255,255,0.6)]' : 'bg-transparent backdrop-blur-none shadow-none [--nav-fg:#000000] [--nav-fg-hover:#755A26] [--nav-login-fg:#000000] [--nav-login-border:rgba(0,0,0,0.2)] [--nav-login-hover-bg:transparent] [--nav-login-hover-fg:#755A26] [--nav-login-hover-border:#755A26]')
        : 'bg-white/70 backdrop-blur-md shadow-sm [--nav-fg:#000000] [--nav-fg-hover:#755A26] [--nav-login-fg:#000000] [--nav-login-border:rgba(0,0,0,0.2)] [--nav-login-hover-bg:transparent] [--nav-login-hover-fg:#755A26] [--nav-login-hover-border:#755A26]',
      isNavbarHidden ? 'md:-translate-y-full translate-y-0' : 'translate-y-0'
    ]"
    aria-label="Menú principal"
    @keydown.esc="closeMenu(true)"
    @focusin="navFocused = true"
    @focusout="navFocused = false"
  >
    <div class="max-w-[1280px] mx-auto px-4 md:px-12 h-20 flex justify-between items-center">
      
      <!-- Logo -->
      <NuxtLink :to="'/'" class="block">
        <!-- Mismo logo.png del original: en blanco (filtro) sobre el hero, a color al desplazarse. -->
        <img v-if="isTransparent && onHero" src="/images/branding/logo.png" alt="Crediestética" class="h-12 md:h-16 w-auto object-contain origin-left transition-all duration-300 brightness-0 invert" />
        <img src="/images/branding/logo.png" alt="Crediestética" v-else class="h-12 md:h-16 w-auto object-contain origin-left transition-all duration-300" />
      </NuxtLink>

      <!-- Men Desktop -->
      <div class="hidden min-[1280px]:flex items-center gap-6">
        <NuxtLink :to="'/'" class="text-sm font-bold text-[color:var(--nav-fg)] hover:text-[color:var(--nav-fg-hover)] transition-colors [&.router-link-exact-active]:border-b-2 [&.router-link-exact-active]:border-[#755A26] [&.router-link-exact-active]:pb-1 [&.router-link-exact-active]:text-[#755A26]">{{ sentence('INICIO') }}</NuxtLink>
        <div v-if="procedureItems.length" class="relative group" data-testid="procedures-menu" @focusin="openMenu = 'PROCEDIMIENTOS'" @focusout="openMenu = null">
          <NuxtLink to="/procedimientos" aria-haspopup="true" :aria-expanded="openMenu === 'PROCEDIMIENTOS' ? 'true' : 'false'" class="text-sm font-bold text-[color:var(--nav-fg)] group-hover:text-[color:var(--nav-fg-hover)] transition-colors [&.router-link-active]:border-b-2 [&.router-link-active]:border-[#755A26] [&.router-link-active]:pb-1 [&.router-link-active]:text-[#755A26] flex items-center gap-1 whitespace-nowrap">
            {{ sentence('PROCEDIMIENTOS') }}
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>
          </NuxtLink>
          <div class="absolute left-0 top-full pt-4 hidden group-hover:block" :class="{ '!block': openMenu === 'PROCEDIMIENTOS' }">
            <div class="bg-white shadow-lg border border-[#E7DDD1] rounded-xl py-2 w-[280px] max-h-[min(70vh,calc(100dvh-120px))] overflow-y-auto overscroll-contain" data-testid="procedures-list">
              <NuxtLink to="/procedimientos" class="block px-6 py-3 text-sm font-bold text-[#000000] hover:text-[#755A26] hover:bg-[#F7F3EE] transition-colors border-b border-[#E7DDD1]">Ver todos</NuxtLink>
              <NuxtLink v-for="item in procedureItems" :key="item.to" :to="item.to" class="block px-6 py-3 text-sm font-bold text-[#43474d] hover:text-[#755A26] hover:bg-[#F7F3EE] transition-colors">{{ item.label }}</NuxtLink>
            </div>
          </div>
        </div>
        <NuxtLink v-else to="/procedimientos" class="text-sm font-bold text-[color:var(--nav-fg)] hover:text-[color:var(--nav-fg-hover)] transition-colors [&.router-link-active]:border-b-2 [&.router-link-active]:border-[#755A26] [&.router-link-active]:pb-1 [&.router-link-active]:text-[#755A26]">{{ sentence('PROCEDIMIENTOS') }}</NuxtLink>
        <NuxtLink to="/noticias" class="text-sm font-bold text-[color:var(--nav-fg)] hover:text-[color:var(--nav-fg-hover)] transition-colors [&.router-link-active]:border-b-2 [&.router-link-active]:border-[#755A26] [&.router-link-active]:pb-1 [&.router-link-active]:text-[#755A26]">{{ sentence('NOTICIAS') }}</NuxtLink>

        <!-- CONÓCENOS: Nosotros, páginas institucionales y Recursos en un solo desplegable -->
        <div class="relative group" data-testid="institutional-menu" @focusin="openMenu = 'CONOCENOS'" @focusout="openMenu = null">
          <button type="button" aria-haspopup="true" :aria-expanded="openMenu === 'CONOCENOS' ? 'true' : 'false'" class="text-sm font-bold text-[color:var(--nav-fg)] group-hover:text-[color:var(--nav-fg-hover)] transition-colors [&.router-link-active]:border-b-2 [&.router-link-active]:border-[#755A26] [&.router-link-active]:pb-1 [&.router-link-active]:text-[#755A26] flex items-center gap-1 whitespace-nowrap">
            {{ sentence('CONÓCENOS') }}
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>
          </button>
          <div class="absolute left-0 top-full pt-4 hidden group-hover:block" :class="{ '!block': openMenu === 'CONOCENOS' }">
            <div class="bg-white shadow-lg border border-[#E7DDD1] rounded-xl py-2 w-[280px]" data-testid="institutional-list">
              <NuxtLink v-for="item in institutionalItems" :key="item.to" :to="item.to" class="block px-6 py-3 text-sm font-bold text-[#43474d] hover:text-[#755A26] hover:bg-[#F7F3EE] transition-colors leading-snug">{{ item.label }}</NuxtLink>
            </div>
          </div>
        </div>


        <div v-for="menu in menus" :key="menu.label" class="relative group" @focusin="openMenu = menu.label" @focusout="openMenu = null">
          <NuxtLink :to="menu.items[0]?.to || menu.to" class="text-sm font-bold text-[color:var(--nav-fg)] group-hover:text-[color:var(--nav-fg-hover)] transition-colors [&.router-link-active]:border-b-2 [&.router-link-active]:border-[#755A26] [&.router-link-active]:pb-1 [&.router-link-active]:text-[#755A26] flex items-center gap-1 whitespace-nowrap">
            {{ sentence(menu.label) }}
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>
          </NuxtLink>
          <div v-if="menu.items.length" class="absolute left-0 top-full pt-4 hidden group-hover:block" :class="{ '!block': openMenu === menu.label }">
            <div class="bg-white shadow-lg border border-[#E7DDD1] rounded-xl py-2 min-w-[240px] max-w-[300px]">
              <template v-for="item in menu.items" :key="item.to">
                <div v-if="item.children" class="relative group/sub">
                  <NuxtLink :to="item.to" class="block px-6 py-3 text-sm font-bold text-[#43474d] hover:text-[#755A26] hover:bg-[#F7F3EE] transition-colors flex items-center justify-between gap-3">
                    {{ item.label }}
                    <svg class="w-3 h-3 shrink-0" :class="menu.flip ? 'rotate-90' : '-rotate-90'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>
                  </NuxtLink>
                  <div class="absolute top-0 hidden group-hover/sub:block group-focus-within/sub:block" :class="menu.flip ? 'right-full' : 'left-full'">
                    <div class="bg-white shadow-lg border border-[#E7DDD1] py-2 w-[280px] max-h-[70vh] overflow-y-auto">
                      <NuxtLink v-for="child in item.children" :key="child.to" :to="child.to" class="block px-6 py-3 text-sm font-bold text-[#43474d] hover:text-[#755A26] hover:bg-[#F7F3EE] transition-colors">{{ child.label }}</NuxtLink>
                    </div>
                  </div>
                </div>
                <NuxtLink v-else :to="item.to" class="block px-6 py-3 text-sm font-bold text-[#43474d] hover:text-[#755A26] hover:bg-[#F7F3EE] transition-colors">{{ item.label }}</NuxtLink>
              </template>
            </div>
          </div>
        </div>
        
        <NuxtLink to="/financiacion#calculadora" class="bg-black text-white px-6 py-2.5 rounded-full font-bold text-sm whitespace-nowrap hover:bg-white hover:text-black border-2 border-transparent hover:border-black transition-all duration-300 active:scale-95 opacity-90 ml-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CBA36B]">
          {{ sentence('SIMULAR FINANCIACIÓN') }}
        </NuxtLink>
      </div>

      <!-- Botón hamburguesa (tablet y móvil) -->
      <button
        ref="menuButton"
        type="button"
        class="min-[1280px]:hidden p-2 -mr-2 text-[color:var(--nav-fg)] focus-visible:outline-2 focus-visible:outline-[#CBA36B]"
        :aria-expanded="isMobileMenuOpen ? 'true' : 'false'"
        aria-controls="mobile-menu"
        :aria-label="isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'"
        @click="isMobileMenuOpen = !isMobileMenuOpen"
      >
        <svg v-if="!isMobileMenuOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    </div>

    <!-- Menú móvil/tablet: scroll interno, sin desbordes; los desplegables son <details> accesibles -->
    <div
      v-if="isMobileMenuOpen"
      id="mobile-menu"
      class="min-[1280px]:hidden absolute top-20 left-0 w-full max-h-[calc(100dvh-80px)] overflow-y-auto overflow-x-hidden overscroll-contain bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-lg z-[100]"
    >
      <div class="mx-auto w-full max-w-[520px] px-6 py-6 flex flex-col text-center">
        <template v-for="link in mainLinks" :key="link.to">
          <details v-if="link.to === '/procedimientos' && procedureItems.length" class="group border-t border-gray-100">
            <summary class="list-none [&::-webkit-details-marker]:hidden cursor-pointer py-3.5 flex items-center justify-center gap-2 text-black font-bold text-lg select-none">
              <span class="break-words">{{ link.label }}</span>
              <svg class="w-3 h-3 shrink-0 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <div class="flex flex-col pb-2 max-h-[50dvh] overflow-y-auto overscroll-contain" data-testid="procedures-list-mobile">
              <NuxtLink to="/procedimientos" @click="closeMenu" class="py-2.5 text-black font-bold text-base underline underline-offset-4 break-words">Ver todos</NuxtLink>
              <NuxtLink v-for="item in procedureItems" :key="item.to" :to="item.to" @click="closeMenu" class="py-2.5 text-[#43474d] font-bold text-base break-words">{{ item.label }}</NuxtLink>
            </div>
          </details>
          <NuxtLink v-else :to="link.to" @click="closeMenu" class="py-3.5 text-black font-bold text-lg break-words">{{ link.label }}</NuxtLink>
        </template>

        <!-- Conócenos -->
        <details class="group border-t border-gray-100" data-testid="institutional-menu-mobile">
          <summary class="list-none [&::-webkit-details-marker]:hidden cursor-pointer py-3.5 flex items-center justify-center gap-2 text-black font-bold text-lg select-none">
            <span>Conócenos</span>
            <svg class="w-3 h-3 shrink-0 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>
          </summary>
          <div class="flex flex-col pb-2">
            <NuxtLink v-for="item in institutionalItems" :key="item.to" :to="item.to" @click="closeMenu" class="py-2.5 text-[#43474d] font-bold text-base break-words">{{ item.label }}</NuxtLink>
          </div>
        </details>

        <!-- Nuestros pacientes / Recomendaciones -->
        <details v-for="menu in menus" :key="menu.label" class="group border-t border-gray-100 first-of-type:mt-2">
          <summary class="list-none [&::-webkit-details-marker]:hidden cursor-pointer py-3.5 flex items-center justify-center gap-2 text-black font-bold text-lg select-none">
            <span class="break-words">{{ sentence(menu.label) }}</span>
            <svg class="w-3 h-3 shrink-0 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>
          </summary>
          <div class="flex flex-col pb-2">
            <template v-for="item in menu.items" :key="item.to">
              <details v-if="item.children" class="group/sub">
                <summary class="list-none [&::-webkit-details-marker]:hidden cursor-pointer py-3 flex items-center justify-center gap-2 text-black font-bold text-base select-none">
                  <span class="break-words">{{ item.label }}</span>
                  <svg class="w-3 h-3 shrink-0 transition-transform group-open/sub:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <div class="flex flex-col pb-2">
                  <NuxtLink :to="item.to" @click="closeMenu" class="py-2.5 text-black font-bold text-base underline underline-offset-4 break-words">Ver todo</NuxtLink>
                  <NuxtLink v-for="child in item.children" :key="child.to" :to="child.to" @click="closeMenu" class="py-2.5 text-[#43474d] font-bold text-base break-words">{{ child.label }}</NuxtLink>
                </div>
              </details>
              <NuxtLink v-else :to="item.to" @click="closeMenu" class="py-3 text-black font-bold text-base break-words">{{ item.label }}</NuxtLink>
            </template>
          </div>
        </details>

        <NuxtLink to="/financiacion#calculadora" @click="closeMenu" class="bg-black text-white px-8 py-3.5 mt-6 font-bold text-base border-2 border-black rounded-full">
          {{ sentence('SIMULAR FINANCIACIÓN') }}
        </NuxtLink>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useAsyncData } from '#imports'
import { fetchPatientSection } from '~/services/PublicTestimonialsService'
import { publicRecommendationsService } from '~/services/PublicRecommendationsService'
import { publicProcedureService } from '~/services/PublicProcedureService'
import { buildMenus, buildProcedureMenu } from '~/utils/navMenus'
import { isHeroRoute } from '#shared/utils/heroRoutes'

const isMobileMenuOpen = ref(false)
const scrollY = ref(0)
const lastScrollY = ref(0)
const isNavbarHidden = ref(false)
const navFocused = ref(false)
const openMenu = ref(null)
const menuButton = ref(null)

const mainLinks = [
  { to: '/', label: 'Inicio' },
  { to: '/procedimientos', label: 'Procedimientos' },
  { to: '/noticias', label: 'Noticias' }
]

// Desplegable «Conócenos» (escritorio y móvil). Las páginas informativas viven en pages/*.vue; Recursos se movió aquí desde el menú principal.
const institutionalItems = [
  { to: '/nosotros', label: 'Nosotros' },
  { to: '/quienes-somos', label: '¿Quiénes somos?' },
  { to: '/servicios', label: 'Servicios' },
  { to: '/clinicas-aliadas', label: 'Clínicas aliadas' },
  { to: '/estudio-de-creditos', label: 'Estudio de créditos' },
  { to: '/informacion-precontractual', label: 'Información precontractual y advertencias al consumidor' },
  { to: '/politica-datos-personales', label: 'Políticas y protección de datos personales' },
  { to: '/recursos', label: 'Recursos' }
]

// Cierra el menú móvil (al navegar, con Escape o al volver a escritorio) y, con Escape, devuelve el foco al botón.
function closeMenu(restoreFocus = false) {
  isMobileMenuOpen.value = false
  if (restoreFocus === true) menuButton.value?.focus()
}

// Visibilidad de "Nuestros Pacientes" desde Wellezy Hub (SSR). Misma clave que las páginas /testimonios*: una sola petición por
// navegación y el menú ya sale correcto en el servidor. Si Hub falla, se muestran todas las entradas (comportamiento por defecto).
const { data: patientSection, refresh: refreshPatientSection } = useAsyncData('patient-section', fetchPatientSection)

// Menú de recomendaciones desde Wellezy Hub (SSR): SOLO el árbol vigente de temas con sus subtemas publicados (API pública
// `recommendation-topics`). La lista de procedimientos se pide aparte únicamente para el desplegable de Procedimientos. Si Hub no
// responde, el menú queda sin esa sección (nunca se rellena con una fuente heredada).
const { data: hubMenu, refresh: refreshHubMenu } = useAsyncData('nav-recommendations', async () => {
  // Independientes: si falla una de las listas no se pierde la otra.
  const [procedures, topics] = await Promise.allSettled([publicProcedureService.getProcedures(), publicRecommendationsService.getTopics()])
  return {
    procedures: procedures.status === 'fulfilled' ? procedures.value : [],
    topics: topics.status === 'fulfilled' ? topics.value : []
  }
}, { default: () => ({ procedures: [], topics: [] }) })

// La construcción de los menús vive en utils/navMenus.ts (función pura, con pruebas).
const menus = computed(() => buildMenus({
  visibility: patientSection.value?.visibility ?? { videos: true, beforeAfter: true },
  topics: hubMenu.value?.topics ?? []
}))

// Desplegable de Procedimientos: misma lista pública (activos y habilitados para la línea), sin pedir el detalle de cada uno.
const procedureItems = computed(() => buildProcedureMenu(hubMenu.value?.procedures ?? []))

const route = useRoute()

// Transparente solo sobre un hero, sin desplazamiento y con el menú móvil cerrado (abierto necesita fondo para leerse).
// Transparente en todas las páginas mientras no se desplaza; solo sobre un hero (imagen oscura) los textos van en blanco.
const onHero = computed(() => isHeroRoute(route.path))
const isTransparent = computed(() => scrollY.value <= 30 && !isMobileMenuOpen.value)

// Primera letra en mayúscula y el resto en minúscula («PROCEDIMIENTOS» -> «Procedimientos»): los textos del menú no se cambian, solo su presentación.
const sentence = (t) => { const x = String(t).toLocaleLowerCase('es'); return x.charAt(0).toLocaleUpperCase('es') + x.slice(1) }

// Como el original: en escritorio el menú se oculta al bajar (pasados 100 px) y reaparece al subir. Nunca se oculta con el menú móvil
// abierto, con un desplegable abierto o con el foco dentro (teclado), para no dejar controles inaccesibles.
function onScroll() {
  const y = window.scrollY
  isNavbarHidden.value = y > lastScrollY.value && y > 100 && !isMobileMenuOpen.value && !navFocused.value && !openMenu.value
  lastScrollY.value = y
  scrollY.value = y
}

// Al navegar se refrescan los menús (recomendaciones y pacientes) para reflejar publicaciones o cambios hechos desde cualquier panel o el CRM.
watch(() => route.path, () => { closeMenu(); refreshHubMenu(); refreshPatientSection() })

// Si la ventana pasa a escritorio con el menú abierto, se cierra para no dejarlo "colgado".
function onResize() {
  if (window.innerWidth >= 1280 && isMobileMenuOpen.value) closeMenu()
}
// Recuperación única de los temas: si Hub no respondió en la carga inicial (el servidor lo corta a los 10 s) el menú llega sin Recomendaciones;
// el navegador vuelve a pedirlo, como máximo 3 veces separadas 3 s, y se detiene en cuanto hay temas o el componente se desmonta.
// Sin reintento en el servidor (no alarga el render) ni consultas periódicas: si los temas ya llegaron, no se pide nada.
const hasTopics = () => (hubMenu.value?.topics?.length ?? 0) > 0
let retryTimer = null
let unmounted = false
async function recoverTopics(attempt = 1) {
  if (unmounted || hasTopics()) return
  await refreshHubMenu()
  if (unmounted || hasTopics() || attempt >= 3) return
  retryTimer = setTimeout(() => recoverTopics(attempt + 1), 3000)
}
onMounted(() => {
  window.addEventListener('resize', onResize)
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
  recoverTopics()
})
onBeforeUnmount(() => {
  unmounted = true
  if (retryTimer) clearTimeout(retryTimer)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('scroll', onScroll)
})
</script>
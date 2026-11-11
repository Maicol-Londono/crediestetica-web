<!-- components/common/PrecontractualModal.vue -->
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import PrecontractualContent from '~/components/legal/PrecontractualContent.vue'

const STORAGE_KEY = 'crediestetica_precontractual_v1'
const isOpen = ref(false)

onMounted(() => {
  const status = localStorage.getItem(STORAGE_KEY)
  if (status !== 'accepted') {
    isOpen.value = true
    // Bloquear el scroll de la página de fondo
    document.body.style.overflow = 'hidden'
  }
})

onUnmounted(() => {
  document.body.style.overflow = ''
})

const handleAccept = () => {
  localStorage.setItem(STORAGE_KEY, 'accepted')
  isOpen.value = false
  // Restaurar el scroll de la página
  document.body.style.overflow = ''

  // FUTURO:
  // registrar aceptación en CRM
  // guardar timestamp
  // guardar versión del documento
  // guardar evidencia de aceptación
}

const handleReject = () => {
  window.location.href = 'https://google.com'
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
    <div class="bg-white text-black w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100">
      
      <!-- Encabezado del Modal -->
      <div class="px-8 py-6 border-b border-gray-100 flex-shrink-0">
        <h2 class="text-xl font-extrabold text-black uppercase tracking-wide">
          {{ 'Información Precontractual' }}
        </h2>
      </div>

      <!-- Cuerpo del Modal (Scroll Interno) -->
      <div class="p-4 md:p-8 overflow-y-auto text-gray-700 leading-relaxed text-sm">
        <PrecontractualContent />
      </div>

      <!-- Pie del Modal (Botones de Acción) -->
      <div class="px-4 md:px-8 py-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-4 flex-shrink-0">
        <button 
          @click="handleReject" 
          class="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-full font-bold hover:bg-gray-100 transition-colors text-center text-sm active:scale-95"
        >
          <span class="font-bold">{{ 'No acepto' }}</span>
        </button>
        <button 
          @click="handleAccept" 
          class="w-full sm:w-auto px-8 py-3 bg-black text-white rounded-full font-bold hover:bg-primary hover:text-black transition-all text-center text-sm active:scale-95 shadow-md flex items-center justify-center"
        >
          {{ 'Acepto y continuar' }}
          <span class="ml-2">➔</span>
        </button>
      </div>
      
    </div>
  </div>
</template>

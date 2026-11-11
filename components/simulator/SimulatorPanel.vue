<template>
  <div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <!-- Controls -->
    <div class="lg:col-span-2 bg-white p-6 md:p-10 border border-[#E7DDD1] rounded-[2rem] shadow-sm">
      <h3 class="font-serif text-2xl md:text-3xl text-[#111111] mb-10">Calcula tu plan de pago</h3>
  
      <div class="space-y-12">
        <!-- Selectors -->
        <!-- Sin selector de ciudad: la lista fija heredada no aplica a Crediestética; la ciudad se pide en el formulario de solicitud. -->
        <div class="flex flex-col gap-4">
          <label for="sim-procedure" class="text-[11px] font-bold uppercase tracking-wider text-[#4c4546]">Procedimiento</label>
          <select id="sim-procedure" v-model="procedure" data-testid="simulator-procedure" class="w-full bg-white border border-[#BBB2AA] rounded-xl p-3 text-base focus:outline-none focus:border-[#111111] focus-visible:ring-2 focus-visible:ring-[#CBA36B] transition-colors">
            <option v-if="!availableProcedures.length" value="" disabled>Sin procedimientos disponibles</option>
            <option v-for="proc in availableProcedures" :key="proc.id" :value="proc.id">
              {{ proc.name }}
            </option>
          </select>
        </div>

        <!-- Financing Amount Slider -->
        <div class="space-y-4">
          <div class="flex justify-between items-end">
            <label class="text-[11px] font-bold uppercase tracking-wider text-[#4c4546]">Monto a financiar</label>
            <div class="relative">
              <span class="absolute left-2 top-1/2 -translate-y-1/2 text-2xl font-bold text-[#111111]">$</span>
              <input 
                type="text" 
                v-model="displayAmount"
                @blur="handleAmountBlur"
                class="bg-transparent pl-8 text-2xl md:text-3xl font-bold text-[#111111] w-[180px] md:w-[220px] text-right focus:outline-none border-b border-transparent focus:border-[#111111] transition-colors"
              />
            </div>
          </div>
          <input 
            type="range" 
            v-model.number="amount" 
            :min="MIN_AMOUNT" 
            :max="MAX_AMOUNT" 
            :step="STEP_AMOUNT" 
            class="w-full h-2 rounded-full bg-[#BBB2AA]/30 appearance-none cursor-pointer accent-[#CBA36B]"
          />
          <div class="flex justify-between text-xs text-[#111111]/60 font-bold mt-2">
            <span>${{ MIN_AMOUNT / 1000000 }}M</span>
            <span>${{ MAX_AMOUNT / 1000000 }}M</span>
          </div>
      
        </div>

        <!-- Installments -->
        <div class="space-y-4">
          <label class="text-[11px] font-bold uppercase tracking-wider text-[#4c4546]">Plazo estimado (Meses)</label>
          <div class="grid grid-cols-3 md:grid-cols-7 gap-3 md:gap-4">
            <button 
              v-for="term in [12, 18, 24, 36, 48, 60, 72]" :key="term"
              @click="months = term"
              :class="[
                'p-3 rounded-full font-bold text-base transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CBA36B]',
                months === term 
                  ? 'border-2 border-[#CBA36B] bg-[#CBA36B]/20 text-[#111111]'
                  : 'border border-[#BBB2AA] text-[#4c4546] hover:bg-white hover:border-[#111111]'
              ]"
            >
              {{ term }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Result Card Component -->
    <div class="w-full">
      <div class="bg-[#111111] text-white rounded-[2rem] p-8 md:p-10 shadow-xl lg:sticky lg:top-28">
        <h3 class="text-xs font-bold tracking-widest text-[#848484] uppercase mb-8">CUOTA ESTIMADA</h3>
    
        <div v-if="quoteError" role="alert" data-testid="simulator-unavailable" class="text-sm text-white/90 leading-relaxed border border-[#CBA36B]/60 rounded-xl bg-black/30 p-5">
          <p class="font-bold text-[#CBA36B] uppercase tracking-wider text-xs mb-2">Simulación no disponible</p>
          <p>{{ quoteError }}</p>
          <button type="button" class="mt-4 underline text-xs font-bold tracking-widest uppercase" @click="submitSimulation">Reintentar</button>
        </div>

        <div v-else-if="isLoading && !currentQuote" class="flex flex-col gap-4 animate-pulse">
          <div class="h-12 bg-[#313030] rounded w-3/4 mb-4"></div>
          <div class="h-6 bg-[#313030] rounded w-1/2"></div>
        </div>

        <div v-else-if="currentQuote" :class="{'opacity-50 transition-opacity': isLoading}">
          <div class="flex flex-col gap-2 mb-10">
            <span class="text-sm text-[#848484]">Cuota mensual aproximada</span>
            <span class="text-4xl md:text-5xl font-medium text-white tracking-tight leading-none">
              {{ formatCurrency(currentQuote.monthlyPayment) }}
            </span>
          </div>
      
          <hr class="border-[#313030] mb-8" />
      
          <div class="flex flex-col gap-4 mb-8">
            <div class="flex justify-between items-center text-sm">
              <span class="text-[#848484]">Total a financiar</span>
              <span class="font-medium text-white">{{ formatCurrency(amount) }}</span>
            </div>
            <div class="flex justify-between items-center text-sm">
              <span class="text-[#848484]">Plazo seleccionado</span>
              <span class="font-medium text-white">{{ months }} meses</span>
            </div>
        
            <div class="flex items-start gap-3 mt-4 p-4 bg-black/40 border border-[#313030] rounded-xl">
              <p class="text-xs text-[#848484] leading-relaxed">
                {{ currentQuote.disclaimer }}
              </p>
            </div>
          </div>
      
          <div class="flex flex-col gap-4">
            <button @click="isLeadFormOpen = true" class="w-full bg-[#CBA36B] text-[#111111] rounded-full py-4 font-bold text-xs tracking-widest uppercase hover:bg-white transition-colors active:scale-95 flex justify-center items-center gap-3">
              SOLICITAR FINANCIACIÓN
            </button>
            <p class="text-[11px] text-[#848484] text-center leading-relaxed">
              ¿Tienes alguna situación en centrales de riesgo? Puedes realizar tu solicitud. La viabilidad será determinada durante el estudio de crédito con un asesor.
            </p>
          </div>
        </div>
    
        <div v-else class="text-[#848484] text-sm">
          Modifica los valores para generar tu estimación.
        </div>
    
      </div>
    </div>

    </div>

    <!-- Formulario de solicitud (ventana) -->
    <FormsLeadForm
      v-model:isOpen="isLeadFormOpen"
      :procedure="procedure"
      :amount="amount"
      :installments="months"
    />
  </div>
</template>

<script setup>
// Simulador de cuota (antes en /simulador; hoy dentro de /financiacion). Misma lógica de useSimulator: procedimiento, monto y plazo.
import { useSimulator } from '~/composables/useSimulator'
import { watch, ref, onMounted, onBeforeUnmount } from 'vue'

const isLeadFormOpen = ref(false)

const {
  amount,
  months,
  procedure,
  currentQuote,
  quoteError,
  isLoading,
  formatCurrency,
  displayAmount,
  handleAmountBlur,
  submitSimulation,
  availableProcedures,
  MIN_AMOUNT,
  MAX_AMOUNT,
  STEP_AMOUNT
} = useSimulator()

// Calcula de inmediato al montar
onMounted(() => {
  submitSimulation()
})

let simulatorDebounceTimer = null
watch([amount, months, procedure], () => {
  if (simulatorDebounceTimer) clearTimeout(simulatorDebounceTimer)
  // Nueva cotización tras una breve pausa
  simulatorDebounceTimer = setTimeout(() => {
    submitSimulation()
  }, 400)
}, { deep: true })

onBeforeUnmount(() => {
  if (simulatorDebounceTimer) clearTimeout(simulatorDebounceTimer)
})
</script>

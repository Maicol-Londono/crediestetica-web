import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { quotationService } from '~/services/QuotationService'
import type { QuotationResult } from '~/providers/MockQuotationProvider'
import { trackingService } from '~/services/TrackingService'
import { publicProcedureService } from '~/services/PublicProcedureService'
import type { Procedure } from '~/types/procedure'
import { useAsyncData } from '#imports'
import { FinancingRateUnavailableError } from '~/services/FinancingRateService'

export function useSimulator() {
  const route = useRoute()
  
  const STEP_AMOUNT = 500000
  const MIN_AMOUNT = 1000000
  const MAX_AMOUNT = 100000000
  
  const amount = ref(15000000)
  
  const months = ref(24)
  const procedure = ref('')
  
  const currentQuote = ref<QuotationResult | null>(null)
  const isLoading = ref(false)
  // Mensaje cuando no se pudo cotizar (p. ej. la tasa no está disponible). Mientras exista NO se muestra ninguna cuota.
  const quoteError = ref<string | null>(null)
  let abortController: AbortController | null = null

  const { data: availableProcedures, execute: loadProcedures } = useAsyncData('procedures', () => publicProcedureService.getProcedures(), {
    default: () => [] as Procedure[]
  })
  // El simulador se monta solo en el navegador (<ClientOnly>): en una carga directa de la página, useAsyncData puede quedar en «success»
  // con la lista vacía sin haber consultado nada. Si al montar no hay procedimientos, se consulta explícitamente (lectura pública).
  onMounted(() => {
    if (!availableProcedures.value?.length) loadProcedures().catch(() => {})
  })
  
  watch(availableProcedures, (newProcs) => {
    if (newProcs && newProcs.length > 0 && !procedure.value) {
      const queryProcedureId = route.query.procedureId as string
      if (queryProcedureId && newProcs.some(p => p.id === queryProcedureId)) {
        procedure.value = queryProcedureId
      } else {
        procedure.value = newProcs[0]!.id
      }
    }
  }, { immediate: true })

  const formatCurrency = (value: number) => {
    if (!value) return '$ 0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(value)
  }

  const displayAmount = computed({
    get: () => {
      if (!amount.value || isNaN(amount.value)) return '';
      return new Intl.NumberFormat('es-CO').format(amount.value);
    },
    set: (val: string) => {
      const parsed = parseInt(val.replace(/\D/g, ''))
      if (!isNaN(parsed)) {
        amount.value = parsed
      } else {
        amount.value = 0
      }
    }
  })

  const handleAmountBlur = () => {
    if (!amount.value) amount.value = MIN_AMOUNT;
    if (amount.value < MIN_AMOUNT) amount.value = MIN_AMOUNT
    if (amount.value > MAX_AMOUNT) amount.value = MAX_AMOUNT
    amount.value = Math.round(amount.value / STEP_AMOUNT) * STEP_AMOUNT
  }

  const submitSimulation = async () => {
    if (amount.value < MIN_AMOUNT) return;
    // Fuera del rango del simulador no se cotiza (el monto se corrige al salir del campo).
    if (amount.value > MAX_AMOUNT) return;

    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();
    const signal = abortController.signal;

    isLoading.value = true;
    try {
      const quote = await quotationService.calculateQuotation(amount.value, months.value, procedure.value, signal);
      
      if (signal.aborted) return;
      
      currentQuote.value = quote;
      quoteError.value = null;
      
      trackingService.track('SIMULATOR_CALC', '/financiacion', {
        intent: {
          item_name: procedure.value,
          financial_amount: amount.value,
          financial_installments: months.value
        }
      });
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Error al simular cotizacion:', e);
        // Sin tasa vigente no se deja la cuota anterior en pantalla: se muestra un estado controlado.
        currentQuote.value = null;
        quoteError.value = e instanceof FinancingRateUnavailableError ? e.message : 'No fue posible calcular la cuota en este momento. Intenta nuevamente.';
      }
    } finally {
      if (!signal.aborted) {
        isLoading.value = false;
      }
    }
  }

  return {
    amount,
    months,
    procedure,
    currentQuote,
    isLoading,
    quoteError,
    formatCurrency,
    displayAmount,
    handleAmountBlur,
    submitSimulation,
    availableProcedures,
    MIN_AMOUNT,
    MAX_AMOUNT,
    STEP_AMOUNT
  }
}

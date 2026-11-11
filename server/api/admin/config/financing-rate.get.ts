// Tasa de interés mensual vigente del simulador (administración). Solo líder de la línea y rol de diseño configurado
// (NUXT_RATE_EDITOR_ROLE_IDS). Lógica y autorización: server/utils/financingRate.ts.
export default defineEventHandler(async (event) => {
  await requireRateEditor(event)
  return financingRateAdminView(await readFinancingRateOrNull(event))
})

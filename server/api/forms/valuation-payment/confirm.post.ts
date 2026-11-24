// POST /api/forms/valuation-payment/confirm: consulta el resultado del pago en el Hub (que verifica con Wompi) para mostrarlo. NO envía correos ni registra al cliente en el CRM: tras la aprobación eso lo ejecuta el Hub por su cuenta. Ver server/utils/valuationPayment.ts.
export default defineEventHandler(event => handleValuationPayConfirm(event))

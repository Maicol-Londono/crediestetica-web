// POST /api/forms/valuation-payment/confirm: verifica el pago con el Hub (que consulta a Wompi) y, si quedó aprobado, envía el correo con el comprobante. Ver server/utils/valuationPayment.ts.
export default defineEventHandler(event => handleValuationPayConfirm(event))

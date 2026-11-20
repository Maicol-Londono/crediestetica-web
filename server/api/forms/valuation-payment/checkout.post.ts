// POST /api/forms/valuation-payment/checkout: valida los datos básicos y pide al Hub el checkout de Wompi para la valoración. Ver server/utils/valuationPayment.ts.
export default defineEventHandler(event => handleValuationPayCheckout(event))

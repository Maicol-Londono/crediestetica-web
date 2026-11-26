// @ts-nocheck -- utilidad de pruebas (node:test). CRM SIMULADO en memoria: sustituye `fetch`, así que ninguna prueba sale a la red.
export const CRM_URL = 'https://crm.example.test/crm-public/api/clients/forms'
// Usuario y asesora FICTICIOS; línea 30, ciudad 3 y clínica 6 son los de Crediestética.
export const CRM_CFG = { crmFormUrl: CRM_URL, crmFormUserId: 101, crmFormLineId: 30, crmFormAdvisorId: '103', crmFormAdvisorEmail: 'asesora@example.test', crmFormCityId: '3', crmFormClinicId: '6' }
export const CRM_TOKEN = 'tokenDePrueba1234567890abcdef'
export const CRM_COOKIE = 'laravel_session=sesionDePrueba'
export const CRM_OK = { mensagge: 'Los datos fueron registrados satisfactoriamente' }

export const crmPage = (token = CRM_TOKEN) => ({
  status: 200,
  headers: { getSetCookie: () => [`${CRM_COOKIE}; path=/; httponly`] },
  text: async () => `<form><input type="hidden" name="_token" value="${token}"></form>`
})
export const crmReply = (status, data = {}) => ({ status, json: async () => data })

/** `posts` = envíos de datos; `pages` = cargas del formulario público. */
export function installCrmStub() {
  const real = globalThis.fetch
  const stub = {
    posts: [], pages: [], order: [], post: null, page: null,
    reset() {
      this.posts = []; this.pages = []; this.order = []
      this.post = async () => crmReply(200, CRM_OK)
      this.page = async () => crmPage()
    },
    fields(i = 0) { return Object.fromEntries(this.posts[i][1].body.entries()) },
    restore() { globalThis.fetch = real }
  }
  stub.reset()
  globalThis.fetch = (url, init) => {
    if (init?.method === 'GET') { stub.pages.push([url, init]); stub.order.push('crm-sesion'); return stub.page(url, init) }
    stub.posts.push([url, init]); stub.order.push('crm-envio'); return stub.post(url, init)
  }
  return stub
}

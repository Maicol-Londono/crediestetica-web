// Estado de una lista del panel (Noticias, Procedimientos) a partir de lo que devolvió Hub. Lógica pura (sin Nuxt) para poder probarla con Node.
//  - Con error NUNCA se muestra «sin resultados»: 403 = sin permiso, 401 = sesión vencida, resto = fallo de carga.
//  - 200 con registros = lista; 200 sin registros = estado vacío.

export type AdminListState = 'loading' | 'unauthorized' | 'forbidden' | 'error' | 'empty' | 'list'

export const MSG_LIST_FORBIDDEN = 'No tienes permisos para consultar este módulo'
export const MSG_LIST_UNAUTHORIZED = 'Tu sesión expiró. Inicia sesión de nuevo.'
export const MSG_LIST_ERROR = 'No fue posible cargar la información. Intenta nuevamente.'

export const errorStatus = (e: unknown): number | undefined => {
  const x = e as any
  const raw = Number(x?.statusCode ?? x?.status ?? x?.response?.status)
  return Number.isInteger(raw) ? raw : undefined
}

export function adminListState(input: { loading: boolean, error: unknown, count: number }): AdminListState {
  if (input.loading) return 'loading'
  if (input.error) {
    const s = errorStatus(input.error)
    if (s === 401) return 'unauthorized'
    if (s === 403) return 'forbidden'
    return 'error'
  }
  return input.count > 0 ? 'list' : 'empty'
}

// Páginas de funcionalidades desactivadas (hoy, los micrositios PRP si PRP_ENABLED se apaga): responden 404 en el servidor y en la navegación del cliente.
// Ver shared/utils/features.ts. Las páginas se conservan en el repositorio, pero no son accesibles.
import { defineNuxtRouteMiddleware, createError } from '#imports'
import { isDisabledPagePath } from '#shared/utils/features'

export default defineNuxtRouteMiddleware((to) => {
  if (isDisabledPagePath(to.path)) {
    throw createError({ statusCode: 404, statusMessage: 'Página no encontrada', fatal: true })
  }
})

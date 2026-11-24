# 07 · Manejo de errores y estados vacíos

Errores del Hub: Hub `docs/api/crediestetica/08-contratos-y-errores.md`. Aquí, cómo los traduce esta web.

## 1. Regla central: vacío ≠ fallo

Una lista **vacía** es `200` con `data: []` y se muestra como estado vacío. Todo lo demás es un fallo de servicio. Fuente: `server/utils/publicErrors.ts`.

## 2. Clasificación en las rutas públicas de Nitro

`classifyHubFailure(res, bodyIsValid)` y `assertHubOk(...)`:

| Respuesta del Hub | `data.reason` | HTTP de la web |
|---|---|---|
| `404` con «Tenant» en el mensaje | `tenant` | 503 (línea mal configurada; se registra en log) |
| `200` con cuerpo no conforme (p. ej. `data` no es lista) | `invalid_response` | 503 |
| `401` / `403` en una lectura pública | `rejected` | 503 |
| Red caída, timeout (10 s), `5xx` u otro estado | `hub_unavailable` | 503 |
| `404` de «no existe» (slug) | — | 404 propio (`El procedimiento no existe.`, `No encontrado`…) decidido por cada ruta |

Los textos de 503 de cada ruta («No fue posible cargar…») no incluyen datos internos.

## 3. Qué ve el usuario

| Contexto | Comportamiento |
|---|---|
| Listas y detalle con SSR | `useAsyncData(...)` expone `error`; `useServiceUnavailable(error)` y `components/common/HubUnavailable.vue` (`<CommonHubUnavailable>`) muestran el aviso con botón «reintentar» (`refresh()`); no se confunde con «sin contenido» (`pages/procedimientos/index.vue`, `pages/noticias/index.vue`) |
| Detalle inexistente | `createError` 404 en `pages/procedimientos/[slug].vue` y `pages/noticias/[slug].vue`. Páginas de `pages/recomendaciones/*`: `NO VERIFICADO` el tratamiento del 404 (solo se leyó que consumen `error` de `useAsyncData`) |
| Menús (`Navbar.vue`) | `Promise.allSettled` / `useAsyncData` independientes: el menú no cae si falla uno |
| Formularios | `reason` + mensaje en español; `retryable: true` en PRP; el pago tiene mensajes específicos ([06](06-valoraciones-y-pagos.md)) |
| Panel | `401` limpia la sesión; `403 password_change_required` redirige a cambiar contraseña |

## 4. Reintentos, caché y estados de carga

- **Reintentos:** ninguno (`retry: 0`) en `server/utils/wellezy.ts` y en el pago. La idempotencia permite reintentar PRP y checkout con la misma clave desde el cliente.
- **Caché:** `Cache-Control: no-store` en las rutas públicas de Nitro; no hay caché de respuestas del Hub en el servidor. `useAsyncData` comparte datos por clave dentro de la página (p. ej. `patient-section`).
- **Carga:** `useAsyncData`/`useLazyAsyncData` con `status`; el micrositio PRP usa `useLazyAsyncData`.

## 5. Códigos que la web no maneja de forma específica

`429` de las lecturas del Hub (60/min por IP del **servidor**: todas las visitas comparten la IP de salida del servidor Nuxt) cae en `hub_unavailable` (503). Es un riesgo operativo: en tráfico alto las lecturas podrían agotar el límite del Hub. `NO VERIFICADO` en carga real; no hay caché en el servidor que lo mitigue.

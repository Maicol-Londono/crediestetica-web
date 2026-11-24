# 06 · Configuración para el móvil

Todo lo de este documento se refiere a contratos **candidatos** de Hub (lectura pública y login de personal). Para pagos no hay configuración móvil: ver [NEW_API_INTEGRATIONS §6](NEW_API_INTEGRATIONS.md#6-decisiones-pendientes-y-capacidades-por-exponer).

## 1. URLs base

| Ambiente | Hub (API) | Web | Fuente |
|---|---|---|---|
| Local | `http://localhost:8000/api` | `nuxt dev` | `.env.example` (comentario de `NUXT_WELLEZY_API_BASE_URL`) |
| Producción | `https://wellezyhub.com/api` | `https://crediestetica.com` | `.env.example`, `nuxt.config.ts` (`site.url`) |
| Staging / UAT | **NO VERIFICADO** (no hay URL de Hub de staging en el repo; `docs/despliegue` no la define) | NO VERIFICADO | — |

Confirma con el equipo de Hub la URL real de cada ambiente y qué línea/datos contiene cada uno antes de configurar la app. La verificación documentada (`docs/migration/HUB_READ_VERIFICATION.md`) se hizo contra una copia **local** del Hub, no contra staging ni producción.

## 2. Headers

| Contexto | Headers |
|---|---|
| Lecturas públicas (`/v1/web/*`) | `X-Tenant-Linea: crediestetica`, `Accept: application/json` |
| Escritura pública PRP | los anteriores + `Content-Type: application/json` + `Idempotency-Key` (`^[A-Za-z0-9_-]{16,64}$`) |
| Login | `Accept: application/json`, `Content-Type: application/json` (sin `X-Tenant-*`; el contexto va en el cuerpo) |
| Rutas autenticadas | `Authorization: Bearer <token>`, `Accept: application/json` |
| **No usar** | `X-Tenant-Domain`, `X-Wellezy-Tenant`, `X-Hub-*` (firmas), ids de empresa/línea |

## 3. Tenant

- Empresa `legalmed`, línea `crediestetica`: constantes de configuración de la app, nunca derivadas de datos del usuario.
- Un `404 Tenant Linea not found or inactive` indica línea inexistente/inactiva en ese Hub: mostrar error de configuración, no «sin contenido».

## 4. Autenticación

- Solo para personal (`Personnel`). Ver [03](03-autenticacion-y-tenancy.md).
- Token Bearer con `expires_at` (480 min por defecto); **sin refresh**. Al recibir `401`/`403 No tienes acceso a esta aplicación.` en una ruta autenticada → cerrar sesión local y pedir login.
- Guardar el token solo en almacenamiento seguro del dispositivo; nunca en logs.
- Mientras `must_change_password` sea `true`, solo `/auth/me` y `/auth/password/change` funcionan.

## 5. CORS

- Apps **nativas** no aplican CORS. Si la app usa WebView o framework web híbrido, el origen sí cuenta.
- Hub restringe CORS **solo en `api/auth/*`** a `wellezy.api_auth.allowed_origins` (`ApplyApiAuthCors`, `supports_credentials=false`); el resto de `/api/*` conserva el CORS por defecto de Laravel (`config/cors.php` del Hub no se auditó en detalle: `NO VERIFICADO`).
- Para pruebas en navegador contra Hub, el origen debe estar en esa lista; es configuración del Hub (variable de entorno), no de la app.

## 6. Timeouts (referencia del servidor web)

| Llamada | Timeout en la web | Evidencia |
|---|---|---|
| Lecturas/escrituras a Hub | 10 s, sin reintentos | `server/utils/wellezy.ts` (`TIMEOUT_MS`) |
| Checkout/refresh firmados | 20 s | `valuationPayment.ts` |
| Subidas multipart | 30 s | `wellezyUpload` |
| CRM de valoración | 15 s, sin reintentos | `valuation.ts` |

Recomendación (no es un contrato): usar ≥10 s para lecturas. **No reintentar automáticamente** escrituras sin `Idempotency-Key`; un timeout en el checkout de pago puede haber creado el registro.

## 7. Límites de frecuencia a respetar

| Superficie | Límite | Fuente |
|---|---|---|
| `/v1/web/*` | 60/min (`throttle:60,1`) | Hub `routes/api.php` |
| `/v1/web/prp-enrollments` | 10/min por IP (`prp-enrollment`) | Hub `AppServiceProvider` |
| `/auth/password/change` | 5/min por usuario; 30/min por IP (`api-auth-password`) | Hub `AppServiceProvider` |
| Login | 10/min por IP+correo; 30/min IP; 20/10 min por cuenta | Hub `AppServiceProvider` |
| `/integrations/v1/*` | 120/min por clave+IP; checkout 20/min por defecto | Hub `PaymentsServiceProvider` |

Maneja `429` con espera exponencial; Hub puede enviar `Retry-After` (p. ej. en `409 retry_window_active`).

## 8. Manejo de errores

| HTTP | Significado | Acción sugerida |
|---|---|---|
| 200 `data: []` | Vacío válido | Estado vacío |
| 401 (Hub, ruta autenticada) | Token inválido/vencido | Logout local |
| 403 | Sin acceso al contexto o contraseña temporal | Mensaje de Hub (`message`) |
| 404 con «Tenant» | Tenant sin resolver | Error de configuración |
| 404 en detalle | No existe/no habilitado | «No encontrado» |
| 409 | Idempotencia / ya existe | No reenviar con datos distintos |
| 422 | Validación: `{message, errors{campo:[...]}}` | Mostrar por campo |
| 429 | Límite | Reintentar más tarde |
| 5xx / sin red | Fallo de servicio | Reintento manual; no mostrar como «sin contenido» |

Hub devuelve mensajes de usuario en español para varios errores (p. ej. login 401/403).

## 9. Ejemplo de configuración (sin credenciales)

```json
{
  "hubApiBaseUrl": "https://wellezyhub.com/api",
  "tenant": { "company": "legalmed", "line": "crediestetica" },
  "headers": {
    "public": { "Accept": "application/json", "X-Tenant-Linea": "crediestetica" },
    "authenticated": { "Accept": "application/json", "Authorization": "Bearer <TOKEN_DE_LA_SESION>" }
  },
  "timeoutsMs": { "read": 10000 }
}
```
```text
# Ejemplo de peticiones
GET  {hubApiBaseUrl}/v1/web/cirugias?page=1        (X-Tenant-Linea: crediestetica)
GET  {hubApiBaseUrl}/v1/web/categorias-cirugias
POST {hubApiBaseUrl}/auth/login   {"email":"…","password":"…","company":"legalmed","line":"crediestetica"}
```
La URL de producción procede de un comentario de `.env.example`; confírmala antes de fijarla en la app.

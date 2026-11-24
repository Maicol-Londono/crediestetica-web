# 01 · Configuración y conexión

## 1. Cliente HTTP

Archivo único: `server/utils/wellezy.ts`. Usa `$fetch.raw` de Nitro (`ofetch`) **solo en el servidor** con `retry: 0` y `ignoreResponseError: true`: devuelve `{ status, data }` y `status = 0` ante red caída, timeout, DNS o respuesta inesperada (sin registrar la URL interna).

| Función | Qué hace | Cabeceras |
|---|---|---|
| `wellezyPublicGet` | GET sin Bearer | `Accept: application/json`, `X-Tenant-Linea: <slug>` |
| `wellezyPublicPost` | POST sin Bearer (PRP) | las anteriores + las que pase el llamador (`Idempotency-Key`) |
| `wellezyLogin` / `wellezyMe` / `wellezyLogout` | Autenticación del panel | `Accept`; `Authorization: Bearer` en `me`/`logout` |
| `wellezyRequest` | Llamada autenticada al CMS | `Authorization: Bearer <token de la sesión>` |
| `wellezyUpload` | Subida multipart al CMS | Bearer; **timeout 30 s** |
| `valuationPayment.ts` (propio) | Llamada firmada al Hub | `X-Hub-Key-Id`, `X-Hub-Timestamp`, `X-Hub-Nonce`, `X-Hub-Signature`, `Idempotency-Key`; **timeout 20 s** |

Timeout por defecto: **10 s** (`TIMEOUT_MS`). Sin reintentos automáticos en ningún flujo (una escritura repetida solo es segura con la misma clave de idempotencia; la decide el llamador).

## 2. Variables de entorno (solo valores públicos o vacíos; **no se copian secretos**)

| Variable | Uso | Valor por defecto / ejemplo |
|---|---|---|
| `NUXT_WELLEZY_API_BASE_URL` | URL base **con** `/api` del Hub | Vacía en el repositorio. Ejemplos en `.env.example`: producción `https://wellezyhub.com/api`, local `http://localhost:8000/api`. Sin ella: el servidor responde con error de configuración y registra `[auth] NUXT_WELLEZY_API_BASE_URL no está configurada.` |
| `NUXT_WELLEZY_COMPANY_SLUG` | `company` del login | `legalmed` |
| `NUXT_WELLEZY_LINE_SLUG` | `X-Tenant-Linea` y `line` del login | `crediestetica` (vacío ⇒ no se hace ninguna petición pública) |
| `NUXT_HUB_INTEGRATION_KEY_ID` / `NUXT_HUB_INTEGRATION_SECRET` | Firma HMAC del pago de valoración (**secreto**, solo servidor) | Vacíos: sin ellas el pago responde `503 not_configured` |
| `NUXT_SESSION_PASSWORD` | Sella la cookie de sesión del panel y deriva la clave de idempotencia de PRP (≥32 caracteres; **secreto**) | Obligatoria; sin ella el panel responde 503 |

Fuentes: `nuxt.config.ts` (`runtimeConfig`), `.env.example`, `.env.production.example`. Variables de otros flujos (CRM de valoración, SMTP, destinatarios) están en esos archivos y **no** son del Hub.

## 3. Ambientes

| Ambiente | URL | Estado |
|---|---|---|
| Producción del Hub | `https://wellezyhub.com/api` (solo como ejemplo en `.env.example`) | `NO VERIFICADO` (no hay evidencia de despliegue ni de que la web apunte allí) |
| Local | `http://localhost:8000/api` | Usado en `docs/migration/HUB_READ_VERIFICATION.md` (copia local, sin contenido publicado) |
| Staging / UAT | Ninguna URL en el repositorio | `NO VERIFICADO` |
| Web pública | `https://crediestetica.com` (`NUXT_PUBLIC_SITE_URL` es informativa: canonical, sitemap, Open Graph; **no** se usa para el tenant) | `NO VERIFICADO` el despliegue |

## 4. Reglas de seguridad de la conexión

- El navegador **nunca** conoce la URL del Hub ni el tenant: lo resuelve el servidor desde la configuración (`wellezyLineSlug`).
- El Bearer del personal vive en una cookie sellada `httpOnly` (`crediestetica-admin`, 8 h) y no se envía al navegador en claro; no se escribe en logs.
- El secreto HMAC solo existe en el servidor Nuxt; no se expone en `runtimeConfig.public`.
- Las mutaciones de `/api/*` exigen mismo origen (`server/utils/origin.ts`, `assertSameOrigin`); las respuestas públicas llevan `Cache-Control: no-store` salvo medios (`immutable`).

Contrato de cada endpoint: Hub `docs/api/crediestetica/`.

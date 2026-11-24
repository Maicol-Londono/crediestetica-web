# 02 · Inventario de contratos de API (base)

> Este documento inventaría y clasifica la superficie **base** (catálogo, login, BFF de Nuxt). Los contratos **nuevos** (checkout y estado de pago, webhook, post-aprobación, PRP, pacientes/CRM) están completos en [NEW_API_INTEGRATIONS.md](NEW_API_INTEGRATIONS.md); aquí solo se enlazan.

Leyenda de disponibilidad móvil:
- **Candidato**: contrato de Hub sin dependencia de cookie/origen/secreto; la app podría consumirlo. *Es una constatación técnica, no una decisión de producto.*
- **No móvil**: depende de cookie de sesión, mismo origen o secreto de servidor.
- **Interno**: lo llama otro sistema (Wompi) o el propio servidor.

Base de Hub: `{HUB}/api` (producción según `.env.example`: `https://wellezyhub.com/api`). Base de la web: `https://crediestetica.com`. Ver [06](06-configuracion-movil.md).

---

## A. Wellezy Hub — públicos (candidatos móviles)

Middleware: `throttle:60,1` + `linea.tenant` (Hub: `routes/api.php` L221-244). Header obligatorio: `X-Tenant-Linea: crediestetica`; opcional `Accept: application/json`. Sin Bearer.

Errores comunes a todos: `404 {"message":"Tenant Linea not found or inactive"}` (línea ausente/inactiva), `429` (límite 60/min), `5xx`.

| Método | Ruta | Propósito | Parámetros | Éxito |
|---|---|---|---|---|
| GET | `/v1/web/categorias-cirugias` | Categorías activas con ≥1 procedimiento habilitado en la línea | — | `{data:[{nombre, slug, cirugias_count}]}` |
| GET | `/v1/web/cirugias` | Procedimientos de la línea (paginado **15 fijo**) | `page`, `categoria` (slug) | `{data:[CirugiaList], links, meta}` |
| GET | `/v1/web/cirugias/{slug}` | Detalle | — | `{data: CirugiaDetail}`; `404 {message}` si no existe/no habilitado |
| GET | `/v1/web/cirugias/{slug}/recomendaciones/{tipo}` | Recomendaciones (`tipo`: `cuidados\|revision`) | — | ver `CatalogoController::cirugiaRecomendaciones` (campos `NO VERIFICADO` aquí; la web no lo consume) |
| GET | `/v1/web/posts` | Noticias publicadas | `page`, `per_page` (1–50, defecto 15) | `{data:[PublicPost], links, meta}` |
| GET | `/v1/web/posts/{slug}` | Detalle de noticia | — | `{data: PublicPost}`; `404` |
| GET | `/v1/web/patient-section` | «Nuestros pacientes» | — | `{data:{visibility, videos[], instagram[], before_after[], referral}}` |
| GET | `/v1/web/recommendation-pages` | Menú de páginas de recomendaciones | — | `{data:[...]}` |
| GET | `/v1/web/recommendation-pages/{slug}` | Página de recomendaciones | — | `{data:{...}}`; `404` |
| GET | `/v1/web/recommendation-pages/{slug}/items/{itemSlug}` | Ítem | — | no consumido por la web; `NO VERIFICADO` |
| GET | `/v1/web/recommendation-topics` | Árbol tema → subtemas | — | `{data:[...]}` |
| GET | `/v1/web/recommendation-topics/{topic}` y `/{topic}/{subtopic}` | Tema / subtema | — | `{data:{...}}`; `404` |
| GET | `/v1/web/prp/{slug}` | Micrositio PRP activo | — | `{data:{name, slug, title, external_code}}` (la web solo conserva `name`, `slug`, `title`; el Hub entrega `external_code` públicamente) |
| POST | `/v1/web/prp-enrollments` | Inscripción PRP (escritura pública) | cabecera `Idempotency-Key` `^[A-Za-z0-9_-]{16,64}$`; cuerpo en §A.1 | `201 {data:{uuid, status}}` |

Formas de datos (Hub: `app/Http/Resources/Web/*`):
- `CirugiaList`: `nombre, slug, descripcion_corta, imagen_destacada (URL|null), categoria_slug, tiene_recomendaciones_post, tiene_recomendaciones_revision, recomendaciones{cuidados|revision:{fuente,pagina_slug}}, destacado, orden`.
- `CirugiaDetail` (campos verificados): `nombre, slug, destacado, descripcion_corta, procedimiento (HTML saneado), imagen_destacada, galeria[], perfil_paciente, datos_paciente{edad_minima, edad_maxima, imc_maximo, cicatrizacion_minima}, categoria{nombre,slug}, ficha_tecnica{tiempo_quirurgico, tipo_anestesia, hospitalizacion, tiempo_recuperacion, visibilidad_resultados}, adicionales_basicos, tecnicas, adicionales_complementarios, complicaciones, candidatos_ideales, candidatos_no_ideales, restricciones_medicas, recomendaciones_post, recomendaciones_revision, recomendaciones, clinicas_asociadas[{nombre,slug,logo,is_featured}], galeria_antes_despues[], secciones[{orden,title,layout,content,image,...}], seo{meta_title,meta_description}`.
- `PublicPost`: `slug, title, excerpt, content, cover_url, author_name (null en crediestetica), published_at (ISO-8601), youtube_url, instagram_url, secciones[]` (solo detalle), `seo{...}`.
- `meta` de paginación Laravel: `current_page, last_page, per_page, total` (la web lee `meta.last_page`, `total`, `per_page`, `current_page`).

### A.1 Cuerpo de `POST /v1/web/prp-enrollments`
Validación (Hub: `StorePrpEnrollmentRequest`): `external_code` (req, ≤50, sin espacios), `full_name` (3–150), `phone` (7–15 dígitos), `email?`, `document_type` (enum `PrpEnrollment::DOCUMENT_TYPES`), `document_number` (`^[A-Z0-9-]{5,20}$`), `surgery_date` (`Y-m-d`, ≤hoy, >1990-01-01), `surgery_name`, `wants_control` (bool), `payment_method` (enum `PrpEnrollment::PAYMENT_METHODS`; con `transferencia` exige `bank_holder_name`, `bank_holder_document`, `bank_account_number`; con otro, prohibidos), `suggestion?` (≤1000), `accepted_contract` (accepted). Errores: `422` validación, `409 {"message":"La clave de idempotencia ya se utilizó con otros datos."}`.
**Importante:** `external_code` es el código del referidor. La web **no lo expone** al navegador (lo resuelve el servidor con el slug, `server/utils/prpReferrer.ts`), pero el Hub **sí lo devuelve en `GET /v1/web/prp/{slug}` sin autenticación**. Si debe protegerse es una decisión pendiente (ver [NEW_API_INTEGRATIONS §3.7](NEW_API_INTEGRATIONS.md#37-inscripción-al-programa-de-referidos-prp)).

---

## B. Wellezy Hub — autenticación (personal)

| Método | Ruta | Auth | Propósito |
|---|---|---|---|
| POST | `/auth/login` | — (`throttle:api-auth-login`) | Login de personal con `company` + `line` |
| GET | `/auth/me` | Bearer + `api.context` | Usuario, permisos, token |
| POST | `/auth/logout` | Bearer | Revoca el token actual |
| POST | `/auth/password/change` | Bearer + `api.context` + `throttle:api-auth-password` | Cambio de contraseña propio |

Detalle completo en [03](03-autenticacion-y-tenancy.md).

---

## C. Wellezy Hub — administración (Bearer + permisos): `NO móvil / panel`

Usados por el panel web mediante Nitro (`wellezyRequest`). Rutas observadas en el código web: `/cms/procedures*`, `/cms/posts*`, `/cms/before-after-cases*` y afines (`utils/patients.ts`), `/cms/recommendation-pages*`, rutas de recomendaciones por árbol (`server/utils/recommendationAdmin.ts`), `/cms/line-users*`, `/prp-referrers*`. Requieren permisos de Hub (`cirugias.ver`, `blog.ver`, `pacientes_web.ver`, `recomendaciones.ver`, `prp_referrers.*`). Contratos de escritura: ver `docs/migration/INTEGRATION_BLOCKERS.md` B-07, B-08, B-09 (escrituras reales no probadas contra Hub).

Asesores (Hub: `routes/payments-api.php`, `auth:sanctum` + `api.context`, prefijo `/api/valoraciones`): `GET/PUT tarifa`, `GET/POST /`, `GET /{uuid}`, `POST /{uuid}/checkout`, `GET /{uuid}/payments`, `POST /{uuid}/payments/{paymentUuid}/refresh`. Son para **personal con permisos** (`valoraciones.*`, `pagos_online.*`), no para pacientes.

---

## D. Wellezy Hub — integración servidor a servidor (HMAC): `NO móvil`

Prefijo `/api/integrations/v1`, middleware `throttle:integration` + `VerifyIntegrationSignature` (Hub: `routes/integrations-api.php`, registrado por `PaymentsServiceProvider`).

| Método | Ruta | Propósito |
|---|---|---|
| POST | `/valoraciones/checkout` | Crea valoración + intento de pago y devuelve datos públicos del widget |
| POST | `/payments/{paymentUuid}/refresh` | Verifica el pago contra Wompi y devuelve el estado |

Contratos detallados en [NEW_API_INTEGRATIONS §3.1–3.3](NEW_API_INTEGRATIONS.md#31-checkout-de-valoración--hub-servidor-a-servidor).

## E. Hub — webhook (Interno)

`POST /api/webhooks/wompi/{webhookToken}` — lo llama Wompi; autenticado por checksum del evento (cabecera `X-Event-Checksum`). Ver [NEW_API_INTEGRATIONS §3.4](NEW_API_INTEGRATIONS.md#34-webhook-de-wompi-y-post-aprobación).

---

## F. Endpoints internos del servidor Nuxt (BFF): `NO móvil`

Todos bajo `https://crediestetica.com/api`. Las mutaciones llaman `assertSameOrigin` (403 `Origen no permitido` sin señal de origen válida). Respuestas con `Cache-Control: no-store`.

### F.1 Públicos (GET, sin sesión)

| Ruta | Fuente | Respuesta |
|---|---|---|
| `/api/public/procedures` | Hub `cirugias` (recorre hasta 20 páginas) | arreglo de `ProcedureDto` (lista) |
| `/api/public/procedures/{slug}` | Hub | `ProcedureDto` con detalle; `404 El procedimiento no existe.` |
| `/api/public/procedure-categories` | Hub | `[{slug, name, count}]` |
| `/api/public/news`, `/api/public/news-page`, `/api/public/news/{slug}` | Hub `posts` | lista / `{items,page,perPage,total,lastPage}` / detalle |
| `/api/public/recommendations`, `/{slug}` | Hub | páginas |
| `/api/public/recommendation-topics`, `/{topic}/{subtopic}` | Hub | árbol |
| `/api/public/patient-section` | Hub | sección |
| `/api/public/prp/{slug}` | Hub | `{name, slug, title}` |
| `/api/public/about`, `/api/public/about/media/{name}` | **Local** | contenido «Nosotros» / archivo |
| `/api/public/clinics`, `/api/public/clinics/media/{name}` | **Local** | `{clinics[], updatedAt}` (solo activas) |
| `/api/public/pages/{slug}` | **Local** | página informativa |
| `/api/public/financing-rate` | **Local** | `{rate, updatedAt}`; `503 rate_not_configured`/`rate_unavailable` si no hay tasa |

Fallos de Hub → `503` con `data.reason ∈ {hub_unavailable, tenant, rejected, invalid_response}` (`server/utils/publicErrors.ts`).
Técnicamente son `GET` accesibles sin origen, pero **no son contrato**: devuelven modelos pensados para la web y pueden cambiar con ella.

### F.2 Formularios públicos (POST, mismo origen)

| Ruta | Destino | Estado |
|---|---|---|
| `POST /api/forms/valuation` | CRM médico (`NUXT_CRM_VALUATION_URL`) o correo | ver [NEW_API_INTEGRATIONS §3.6](NEW_API_INTEGRATIONS.md#36-relación-valoración--paciente--solicitud--pago) |
| `POST /api/forms/valuation-payment/checkout` | Hub (HMAC) | ver [NEW_API_INTEGRATIONS §3.2–3.3](NEW_API_INTEGRATIONS.md#32-checkout-de-valoración--nuxt-bff-del-navegador) |
| `POST /api/forms/valuation-payment/confirm` | Hub (HMAC) | ver [NEW_API_INTEGRATIONS §3.2–3.3](NEW_API_INTEGRATIONS.md#32-checkout-de-valoración--nuxt-bff-del-navegador) |
| `POST /api/forms/credit-study` | Correo SMTP | `server/utils/creditStudy.ts`; `503 not_configured` sin SMTP |
| `POST /api/forms/lead` | Correo SMTP | `server/utils/leadForm.ts` |
| `POST /api/forms/referral` | Correo SMTP complementario | `server/utils/referral.ts` |
| `POST /api/forms/prp-enrollment` | Hub `/v1/web/prp-enrollments` | `server/utils/prpEnrollment.ts` |

### F.3 Sesión y panel

| Ruta | Descripción |
|---|---|
| `POST /api/auth/login` | Valida origen y llama a Hub; guarda el token **en cookie sellada** `crediestetica-admin` (nunca se devuelve); responde `{user}` |
| `GET /api/auth/me` | Revalida contra Hub |
| `POST /api/auth/logout` | Revoca el token en Hub y limpia la cookie |
| `POST /api/auth/password` | Cambio de contraseña (obligatorio con contraseña temporal) |
| `/api/admin/**` | CMS: `about`, `clinics`, `config/*` (tasa, usuarios de línea), `news*`, `pages`, `patient-section`, `procedures*`, `procedure-sections`, `prp*`, `recommendation*`. Bloqueados con `403 password_change_required` mientras haya contraseña temporal (`server/middleware/admin-password-change.ts`) |

Otros: `server/middleware/canonical-path-case.ts` (redirige rutas públicas con mayúsculas), `disabled-features.ts` (404 en `/api/public/prp` si `PRP_ENABLED` se apaga; hoy `true`).

---

## G. Dependencias externas por endpoint

| Dependencia | Endpoints |
|---|---|
| Wellezy Hub | casi todos los de §A–§D y F.1/F.3 |
| Wompi (vía Hub) | checkout, refresh, webhook |
| CRM médico externo | `POST /api/forms/valuation` |
| SMTP | `credit-study`, `lead`, `referral`, respaldo de `valuation` |
| Disco local | `about`, `clinics`, `pages`, `financing-rate` |

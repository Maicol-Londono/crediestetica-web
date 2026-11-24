# 07 · Guía de migración desde la app antigua (Cliniplanes)

> **Límite de la auditoría:** el repositorio de la app móvil no se revisó. La columna «Implementación antigua» no se afirma: salvo cuando se cite documentación heredada, es `NO VERIFICADO — comprobar en el repo móvil`. La columna «Implementación actual» sí está verificada ([02](02-api-contracts.md), [03](03-autenticacion-y-tenancy.md)).

Cómo usar esta guía con Claude: entrega el repo móvil + esta carpeta y pide, por cada fila, localizar en el código móvil el componente, comparar con «actual» y proponer el cambio.

## 1. Tabla de migración

| Componente móvil | Implementación antigua | Implementación actual | Acción requerida |
|---|---|---|---|
| URL base de la API | NO VERIFICADO | Hub `{HUB}/api` (prod: `https://wellezyhub.com/api`, a confirmar) | Reemplazar cualquier URL de Cliniplanes/Planmed por la de Hub; no usar rutas `/api` de `crediestetica.com` |
| Identificador de tenant | NO VERIFICADO (posible id de empresa/línea o dominio de Planmed/Cliniplanes) | Slug en header `X-Tenant-Linea: crediestetica` (lecturas); `company: legalmed` + `line: crediestetica` (login) | Eliminar ids y `X-Tenant-Domain`; usar slugs |
| Listado de procedimientos | NO VERIFICADO | `GET /v1/web/cirugias?page=` (15/página, campos en español) | Paginar completo; mapear `nombre`, `slug`, `descripcion_corta`, `imagen_destacada`, `categoria_slug` |
| Detalle de procedimiento | NO VERIFICADO | `GET /v1/web/cirugias/{slug}` (slug como id público; sin ids numéricos) | Usar `slug`; consumir `ficha_tecnica`, `datos_paciente`, `secciones`, `seo` |
| Categorías | NO VERIFICADO | `GET /v1/web/categorias-cirugias` (solo con procedimientos habilitados) | Cargar dinámicamente; no fijar categorías |
| Noticias | NO VERIFICADO | `GET /v1/web/posts`, `/{slug}`; `author_name` es `null` en Crediestética | No mostrar autor; paginar con `meta` |
| Recomendaciones/cuidados | NO VERIFICADO | `recommendation-topics`, `recommendation-pages`, y `recomendaciones` por procedimiento (`fuente`) | Respetar `fuente` (`pagina`, `pagina_oculta`, `historico`, `ninguna`) |
| Testimonios / antes y después | NO VERIFICADO | `GET /v1/web/patient-section` (con banderas `visibility`) | Respetar `visibility.videos/before_after` |
| Login | NO VERIFICADO | Solo personal: `POST /auth/login` con `company`+`line`; token Sanctum 480 min, sin refresh | Si la app tenía login de paciente: **sin equivalente verificado** → decidir con el equipo (ver [08](08-pendientes-y-validaciones.md)) |
| Sesión/token | NO VERIFICADO | Bearer; `403 No tienes acceso a esta aplicación.` si pierde contexto; logout revoca solo el token actual | Almacenar seguro; limpiar en 401/403; manejar `must_change_password` |
| Solicitud de valoración | NO VERIFICADO (posible envío directo al CRM de Planmed con ids 73/16, según documentación heredada) | Web: `POST /api/forms/valuation` → CRM propio o correo (BFF, no móvil). Hub **no** recibe esta solicitud | **Reimplementar**: no hay endpoint móvil. No enviar al CRM `pdtclientsolutions.com` (bloqueado por la web) |
| Pago de valoración (Wompi) | NO VERIFICADO | Web: checkout vía Hub HMAC; **sin contrato móvil** | No integrar Wompi con claves en la app; esperar contrato ([NEW_API_INTEGRATIONS §6](NEW_API_INTEGRATIONS.md#6-decisiones-pendientes-y-capacidades-por-exponer)) |
| Tasa/simulador de financiación | NO VERIFICADO | Tasa local de Nuxt (`/api/public/financing-rate`), sin respaldo si no está configurada; mensual, máx 5 % | Definir fuente móvil (no está en Hub) |
| Nosotros, clínicas aliadas, páginas | NO VERIFICADO | Archivos locales del servidor Nuxt; vacíos por decisión D-15 | Definir si la app los muestra y cómo se sirven |
| Formularios de crédito/lead/referidos | NO VERIFICADO | Envían **correo** desde Nuxt (`credit-study`, `lead`, `referral`); PRP-inscripción va a Hub | Reimplementar o definir contrato; no existe endpoint móvil |
| PRP / referidos | NO VERIFICADO | `GET /v1/web/prp/{slug}` y `POST /v1/web/prp-enrollments` con `Idempotency-Key`; el `external_code` lo resuelve el servidor (detalle en [NEW_API_INTEGRATIONS §3.7](NEW_API_INTEGRATIONS.md#37-inscripción-al-programa-de-referidos-prp)) | Decidir: el Hub entrega `external_code` en `GET /v1/web/prp/{slug}` (público); decidir si la app lo usa o si debe protegerse |
| Notificación y alta CRM tras el pago | NO VERIFICADO | En el árbol de trabajo la hace el **Hub** (post-aprobación), no la web ni la app ([§3.4](NEW_API_INTEGRATIONS.md#34-webhook-de-wompi-y-post-aprobación)) | La app no debe enviar correos ni altas de CRM por su cuenta |
| Identidad corporativa/legal | NO VERIFICADO | Textos y datos legales de Crediestética; varios **pendientes** (B-05, B-06) | No copiar textos de Planmed/Cliniplanes; usar los vigentes de `shared/utils/legal*.ts` |

## 2. Configuraciones heredadas que deben eliminarse (si existen en el repo móvil)

Verificado que **ya no existen o están bloqueados en la web actual** y por tanto no deben reutilizarse:
- Ids `73` / `16` del CRM heredado en valoración (`nuxt.config.ts`: ahora sin valor por defecto).
- Destino `pdtclientsolutions.com` para valoración (bloqueado: `shared/utils/crmDestination.ts`).
- Destinatarios/correos de Planmed.
- Ids de empresa/línea: `companies.id=16` y `lineas.id=4` son solo referencia de una copia local; **no** usarlos.
- `X-Tenant-Domain`: no se usa.
- Cookie/sesión de panel (`crediestetica-admin`): no aplica a móvil.

Búsquedas sugeridas en el repo móvil: `planmed`, `cliniplanes`, `X-Tenant`, `company_id`, `linea_id`, `pdtclientsolutions`, `crm-public`, `wompi`, `private_key`, `integrity`.

## 3. Cambios de modelo de datos

| Hub (actual) | Modelo de la web | Nota |
|---|---|---|
| `nombre` | `name` | Hub usa español |
| `descripcion_corta` | `shortDescription` | |
| `procedimiento` | `whatIsIt` | HTML saneado |
| `categoria_slug` / `categoria.slug` | `category` | |
| `imagen_destacada` | `image` | URL absoluta |
| `ficha_tecnica.*`, `datos_paciente.*`, `perfil_paciente` | `ficha_tecnica`, `perfil_paciente` | |
| `cover_url`, `published_at` | noticias | ISO-8601 |

Campos que no deben asumirse: `id` numérico de procedimiento (el id público es el `slug`); `company_id`/`linea_id` (Hub no los expone en la API pública).

## 4. Qué puede conservarse / qué reimplementar

| Conservar (si coincide con el contrato) | Reimplementar o decidir |
|---|---|
| Lectura de catálogo, noticias, recomendaciones, testimonios vía Hub público | Solicitud de valoración (sin endpoint móvil) |
| Paginación y estados vacíos/error | Pago con Wompi (sin contrato móvil) |
| Render de HTML (con visor seguro) | Login/cuenta de paciente (sin equivalente verificado) |
| | Simulador y tasa (fuente local de Nuxt) |
| | Contenidos locales (Nosotros, clínicas, páginas) |

## 5. Cambios en autenticación, procedimientos y pagos (síntesis)

- **Autenticación:** contexto por `company`+`line` en cuerpo; token con abilities; sin refresh; solo `Personnel`.
- **Procedimientos:** tenant por slug, solo los habilitados en `cirugia_linea`, paginación 15 fija, `slug` como id.
- **Valoraciones y pagos:** valoración ya no va a Hub; el pago es server-to-server con HMAC e idempotencia; la app no puede firmar.

# Arquitectura por módulos — Crediestética

> **Auditoría D9.5-D · 2026-11-11.** Se basa en la inspección del código de `crediestetica` y de `planmed-web` (solo lectura) en esa fecha. No es una especificación teórica: cada fila indica lo que el código hace hoy. Los documentos históricos (`ESTADO_ACTUAL_MIGRACION.md`, `INVENTARIO_FUNCIONAL.md`, `ESTADO_VISUAL.md`) se conservan sin cambios.

## 1. Regla general

Crediestética es una **réplica funcional de Planmed**, adaptada a su identidad, empresa y línea. La persistencia **se decide módulo por módulo**: no todos los módulos usan Wellezy Hub ni todos usan almacenamiento local.

- **Hub (tenant de línea):** las lecturas públicas van por Nitro a `…/v1/web/*` con la cabecera `X-Tenant-Linea` (valor de `runtimeConfig.wellezyLineSlug = crediestetica`, nunca del navegador; no se usa `X-Tenant-Domain`). La administración usa `…/cms/*` con el Bearer de la sesión del servidor; Hub deriva empresa y línea del token (empresa 16 Legalmed, línea `crediestetica`).
- **Local Nitro:** archivos JSON y de medios en `<NUXT_CONTENT_DIR>` (por defecto `.data/crediestetica-content/`, fuera de `.output/`). Sin `NUXT_CONTENT_DIR` definido en `.env` se usa el valor por defecto.

## 2. Clasificación

| Tipo | Módulos |
|---|---|
| **Consumen Hub** | Procedimientos, Categorías (solo lectura), Secciones de procedimiento, Noticias (y secciones), Recomendaciones (y árbol de temas), Nuestros Pacientes, PRP (referidos), Colaboradores de la línea, Autenticación |
| **Almacenan localmente** | Clínicas aliadas, Nosotros, Tasa de financiación (simulador), Orientación de imagen de procedimientos, Páginas informativas simples (`sitePages`) |
| **Combinan local + Hub** | Procedimientos (contenido en Hub; solo la orientación vertical/horizontal de la portada es local) |
| **Otros mecanismos** | Solicitud de valoración (POST al CRM médico), Inscripción PRP (POST a Hub con idempotencia), Recursos (datos estáticos del código), SEO (`@nuxtjs/sitemap` + `useSeoMeta`) |

## 3. Inventario

| Módulo | Planmed | Crediestética | Persistencia | Lectura | Escritura | Archivos | Aislamiento | Permisos | Estado | Diferencias |
|---|---|---|---|---|---|---|---|---|---|---|
| **Procedimientos** | Hub | Hub (igual) | Hub | `/api/public/procedures[/slug]` → `/v1/web/cirugias` | `/api/admin/procedures/*` → `/cms/procedures` | Imágenes en Hub; orientación de portada local (`procedure-image-orientation.json`) | `X-Tenant-Linea` / token | Sesión admin + permisos de Hub | Validado (mocks + lectura real) | Detalle con hero dividido (D9.3); orientación local |
| **Categorías** | Hub | Hub, solo lectura | Hub | `/api/public/procedure-categories` | No (se administran en Hub) | — | Línea | — | Validado | — |
| **Secciones de procedimiento** | Hub | Hub | Hub | Incluidas en el detalle | `/api/admin/procedure-sections/*` → `/cms/procedure-sections` | Subida vía Hub | Token / permiso `cirugia_secciones.*` | Hub | Validado (mocks) | — |
| **Noticias** | Hub | Hub | Hub | `/api/public/news`, `/news/[slug]`, `/news-page` (paginada, D9 noticias) → `/v1/web/posts` | `/api/admin/news/*` → `/cms/posts` | Portada: `/cms/posts/{id}/cover` | Línea | Hub | Validado (mocks + lectura real) | `news-page` es nuevo en esta etapa; `news` se conserva |
| **Recomendaciones** | Hub | Hub | Hub | `/api/public/recommendations*`, `recommendation-topics*` → recommendation-pages | `/api/admin/recommendations*`, `recommendation-tree/*` → `/cms/recommendation-*` | Vía Hub | Línea | Hub | Validado (mocks) | Regla R1: no hay respaldo histórico desde cirugías |
| **Nuestros Pacientes** | Hub | Hub | Hub | `/api/public/patient-section` → `/v1/web/patient-section` | `/api/admin/patient-section` → `/cms/patient-section` (+ embeds y casos antes/después) | Vía Hub | Línea | Hub | Validado (mocks + lectura real) | — |
| **Clínicas aliadas** | **JSON local** (`clinics.json` + `clinics-media/`) | **JSON local**, mismo patrón y mismos endpoints | Local Nitro | `GET /api/public/clinics` (solo clínicas activas) y `/media/[name]` | `PUT /api/admin/clinics`, `POST /api/admin/clinics/upload`, `GET /api/admin/clinics` | `<contentDir>/clinics-media/` (JPG/PNG/WebP ≤5 MB; PDF ≤10 MB como documento) | Directorio propio por sitio; **no pasa por Hub**, por lo que no interviene empresa/línea | Sesión + `requireAboutEditor` | Validado: mocks y persistencia real en disco (D9.5-C, sonda con sesión simulada; datos de prueba ya eliminados) | Añade `active`, sitio, teléfono, correo y dirección (Planmed no los tiene); Home y página pública comparten la misma fuente |
| **Nosotros** | Local (`about.json`, `media/`) | Local (igual) | Local Nitro | `/api/public/about`, `/about/media/[name]` | `/api/admin/about` | `<contentDir>/media/` | Directorio propio | `requireAboutEditor` | Validado (mocks) | Sin contenido heredado de Planmed |
| **Páginas informativas simples** | Local (`pages/<slug>.json`) | Local (igual; `sitePages`) | Local Nitro | `/api/public/pages/[slug]` | `/api/admin/pages/[slug]` | — | Directorio propio | `requireAboutEditor` | Validado por inspección: hoy lo usa `/clinicas-aliadas` (texto introductorio, slug `clinicas-aliadas`, `<contentDir>/pages/clinicas-aliadas.json`); `SITE_PAGES` define los slugs válidos | El texto introductorio es independiente de la lista de clínicas (`clinics.json`) |
| **Recursos** | Estático | Estático (`data/resources` + `shared/utils/legalDocuments`) | Código | Compilado | No hay edición | PDFs/Drive externos | — | — | Validado visualmente | Documentos de Crediestética |
| **Simulador** | Tasa fija / local | Tasa local `financing-rate.json` con historial, **sin valor por defecto** | Local Nitro | `/api/public/financing-rate` (503 `rate_not_configured` si no hay tasa) | `/api/admin/config/financing-rate` | — | Directorio propio | Sesión + perfil autorizado | Validado (mocks); en el entorno local **no hay tasa configurada**, por eso la simulación muestra «no disponible» | No cambia fórmulas |
| **Autenticación** | Hub | Hub (`/api/auth/login|logout|me|password`) | Hub | `auth/me` | `auth/login` envía slugs de empresa/línea | — | Slugs `legalmed` / `crediestetica` en configuración | Hub | Validado (mocks) | — |
| **Administración** | Panel Nitro/Vue | Igual | Mixto (ver filas) | — | — | — | — | Control de origen + sesión + rol antes de leer el cuerpo | Pantallas autenticadas **no inspeccionadas** en D9.5 (sin sesión) | — |
| **Formularios — valoración** | CRM médico | `POST /crm-public/api/clients/forms` desde `server/utils/valuation.ts` | CRM médico (externo a la web) | — | Servidor; límite por IP; sin reintentos; sin logs de datos personales | — | Cada solicitud validada antes de llamar | — | Mecanismo identificado; **no modificado** | — |
| **Formularios — PRP** | Hub | `POST /v1/web/prp-enrollments` (idempotencia HMAC) | Hub | — | Servidor | — | Hub resuelve empresa/línea por el tenant | — | Mecanismo identificado; no modificado | — |
| **Consentimientos** | — | Presentes en `LeadForm` y `ValuationRequest` | Pendiente de verificar el destino de la aceptación | — | — | — | — | — | **Pendiente de verificar** | No se modificaron |
| **CRM** | CRM médico | Solo vía formulario de valoración | Externo | — | — | — | — | — | Pendiente de verificar más allá del formulario | — |
| **SEO** | `useSeoMeta` | `useSeoMeta` + `@nuxtjs/sitemap`; `site.url = https://crediestetica.com` | Código | — | — | — | — | — | Validado por inspección | `canonical` por página en varias rutas |

## 4. Bloqueos y pendientes

- **Persistencia real de Clínicas aliadas:** validada en D9.5-C (crear, subir imagen, editar, ocultar/reactivar, reordenar y reinicio). La sonda simuló la sesión de administrador, por lo que el control de permisos real sigue pendiente (ver D9.6).
- **Administración autenticada:** no se inspeccionó la consola de las pantallas protegidas (no hay sesión; no se introducen credenciales).
- **Consentimientos, CRM y páginas `sitePages`:** destino/uso real pendientes de verificar.
- **Tasa de financiación:** no configurada en el entorno local; es un estado esperado, no un fallo de código.
- **Hub no expone** un endpoint público de clínicas; no se modifica Hub.

## 5. Historial

| Fecha | Etapa | Cambio |
|---|---|---|
| 2026-11-11 | D9.5-D | Documento creado a partir de la inspección del código. |
| 2026-11-11 | D9.6 | QA responsive de 7 vistas, corrección del título móvil y validación de permisos sin sesión. |
| 2026-11-11 | D9.7 | Validación con sesiones reales, estados de error en Noticias/Procedimientos e hidratación de Micrositios. |
| 2026-11-11 | D9.7-E | Visibilidad dinámica de menú y dashboard según permisos de Hub. |

## 6. D9.6 — QA responsive y permisos (2026-11-11)

**Rutas × viewports.** `/noticias`, `/servicios`, `/clinicas-aliadas`, `/estudio-de-creditos`, `/informacion-precontractual`, `/politica-datos-personales` y `/recursos`, a 375, 768, 1024 y 1440 px (28 combinaciones). El viewport se emuló con iframes del mismo origen, porque la ventana de Chrome no cambiaba de tamaño. En las 28: imagen cargada, sin desbordamiento horizontal de página, tarjeta y título dentro de su contenedor. Revisión visual: las 28 combinaciones (1440 en la etapa anterior). Menú móvil abierto a 375 px: correcto.

**Defecto encontrado y corregido.** A 375 px el título de `/informacion-precontractual` se partía a mitad de palabra («PRECONTRACTU / AL») porque el `h1` de `CommonImageHero` medía 30 px. Se ajustó a `text-[26px] sm:text-3xl` (solo afecta por debajo de 640 px). Verificado a 375 px tras el cambio.

**Observaciones sin cambio.** En `/estudio-de-creditos` los botones del selector de pasos sobresalen del contenedor, pero es un `overflow-x:auto` intencional (no desborda la página). Consola: sin errores de la aplicación (solo excepciones de la extensión de Chrome).

**Permisos.** `requireAboutEditor` revalida el token con Hub (`/auth/me`) y exige línea configurada o superadmin y un rol editor de contenido. Prueba real **sin sesión**: `GET/PUT/POST` de `/api/admin/clinics`, `/clinics/upload`, `/about`, `/pages/[slug]` y `/config/financing-rate` devuelven 401; los `PUT` sin `Origin` o con `Origin` ajeno devuelven 403; `/admin/nosotros` redirige a `/admin/login`; los endpoints públicos responden 200. **Bloqueado:** usuario autorizado y usuario autenticado sin permiso, porque no se dispone de credenciales reales proporcionadas para esta prueba y no se introducen contraseñas ni se simulan sesiones. Observación: `GET /api/admin/clinics` solo exige sesión de panel (`adminSession`), no el rol editor; la escritura sí lo exige.

**Regresión.** Suite 817 / 800 correctos / 0 fallidos / 17 omitidos (igual que la línea base D9.5); `npx nuxt typecheck` sin errores; `npm run build` correcto.

**Archivos modificados en D9.6.** `components/common/ImageHero.vue`, `documentacion/migracion/ARQUITECTURA_MODULOS.md`.

**Pendientes.** Probar con credenciales reales los casos autorizado y sin permiso; decidir si `GET /api/admin/clinics` debe exigir el rol editor; administración autenticada sin inspeccionar; consentimientos/CRM; tasa de financiación no configurada en local.

## 7. D9.7 — Sesiones reales, errores de lista e hidratación (2026-11-11)

**D9.7-A — sesión administrativa real (Diseñador gráfico).** Con una sesión real se validó el acceso a contenido local (Clínicas, Nosotros, páginas) y a los módulos de Hub. Se detectó que `GET /api/admin/clinics`, `/about` y `/pages/[slug]` solo exigían sesión de panel; ahora exigen rol editor de contenido (`requireAboutEditor`), igual que la escritura.

**D9.7-B — usuarios sin permiso.** Con «Visitador convenios» y con una Asesora financiera (Johanna) se comprobó que no acceden a contenido local, tasa de financiación ni configuración, y que Hub rechaza con 403 Noticias, Procedimientos, Nuestros Pacientes y Recomendaciones. La Asesora financiera consulta y crea micrositios PRP (`prp_referrers.ver`/`crear`) y no puede editar contenido ni administrar la tasa. Se añadió el botón de ver/ocultar contraseña en el cambio obligatorio de contraseña y se verificó el flujo de primer ingreso en el puerto 3000 (el sitio original en 3002 no aplica `must_change_password`).

**D9.7-C — estados de error en listas.** Noticias y Procedimientos ya no presentan un 403 (ni un 401 o 5xx) como lista vacía. `shared/utils/adminListState.ts` clasifica el estado (cargando, lista, vacío, sin sesión, sin permiso, error de carga) y `components/admin/ListNotice.vue` lo muestra: 403 → «No tienes permisos para consultar este módulo»; 401 → sesión vencida con enlace a login; 5xx o conexión → error con «Reintentar». «No se encontraron …» solo aparece con 200 vacío. Verificado en Chrome con la sesión de Johanna.

**D9.7-D — hidratación.** Causa: con `useAsyncData(..., { server: false })` el valor de `pending` difiere entre el servidor (falso) y la hidratación (verdadero), y el bloque «Cargando…» dependía de él. Corrección: «cargando» = `!mounted || pending` (igual en ambos lados), en `/admin/noticias` (D9.7-C) y `/admin/micrositios` (D9.7-D). No se tocó el CRUD, los permisos PRP ni los endpoints. En Chrome no aparece ningún aviso de hidratación en ninguna de las dos pantallas. Prueba de regresión en `tests/admin/list-state.test.ts`.

**Resultados de pruebas.** D9.7-C: 829 / 812 correctos / 0 fallidos / 17 omitidos; `nuxt typecheck` y `npm run build` correctos. D9.7-D: ver el reporte de la etapa.

**Pendientes de visibilidad y permisos (sin implementar; requiere aprobación).** El menú lateral y las tarjetas del dashboard muestran Procedimientos, Noticias, Nuestros Pacientes, Recomendaciones y Micrositios a todo usuario autenticado, aunque Hub rechace el acceso. Los permisos reales de Hub son `cirugias.ver`, `blog.ver`, `pacientes_web.ver`, `recomendaciones.ver` y `prp_referrers.ver`; el frontend recibe la lista `permissions` de `/auth/me`. Ocultar enlaces no sustituye la autorización de servidor, que se mantiene.

### D9.7-E — Visibilidad dinámica del menú y del dashboard (2026-11-11)

**Qué cambió.** `toPublicUser` (`server/utils/auth.ts`) deriva banderas de los permisos de Hub que vienen en `/auth/me` (arreglo de cadenas; cualquier otra forma se trata como «sin permisos»): `canViewProcedures` (`cirugias.ver`), `canViewNews` (`blog.ver`), `canViewPatients` (`pacientes_web.ver`), `canViewRecommendations` (`recomendaciones.ver`), `canViewMicrosites` (`prp_referrers.ver`), `canCreateMicrosites` (`prp_referrers.crear`, mismo valor que `canCreatePrp`, que se conserva) y `canAccessConfiguration` (`isAreaLeader || canEditRate`). El superadmin global tiene todas las `*.ver`, igual que en Hub (`User::hasPermission`). `canEditContent` no cambia. `layouts/admin.vue` y `pages/admin/index.vue` usan las mismas banderas; el botón «Nuevo micrositio» usa `canCreateMicrosites`. Tipos en `types/auth.ts`.

**Matriz final.**

| Módulo | Bandera / permiso | Asesora financiera (Johanna) | Sin permisos | Superadmin global |
|---|---|---|---|---|
| Procedimientos | `canViewProcedures` / `cirugias.ver` | Oculto | Oculto | Visible |
| Noticias | `canViewNews` / `blog.ver` | Oculto | Oculto | Visible |
| Nuestros Pacientes | `canViewPatients` / `pacientes_web.ver` | Oculto | Oculto | Visible |
| Recomendaciones | `canViewRecommendations` / `recomendaciones.ver` | Oculto | Oculto | Visible |
| Micrositios | `canViewMicrosites` / `prp_referrers.ver` | Visible | Oculto | Visible |
| Botón «Nuevo micrositio» | `canCreateMicrosites` / `prp_referrers.crear` | Visible | Oculto | Según permiso |
| Nosotros / páginas | `canEditContent` (regla existente) | Oculto | Oculto | Visible |
| Configuración | `canAccessConfiguration` | Oculto | Oculto | Según líder/tasa |

Para el Diseñador gráfico las banderas siguen los permisos que Hub le conceda; las pruebas usan permisos explícitos y no asumen los de ningún usuario real.

**Seguridad.** Es solo interfaz. No se modificaron endpoints, middleware, policies, roles ni permisos; Hub y los endpoints siguen devolviendo 403.

**Validación visual (sesión real de Johanna).** Dashboard y menú muestran únicamente Dashboard y Micrositios; la pantalla de Micrositios muestra «Nuevo Micrositio». No se guardó ni envió ningún formulario. La sesión del Diseñador gráfico no estaba disponible, por lo que su navegación no se comparó visualmente.

**Pruebas.** Suite 840 / 823 correctos / 0 fallidos / 17 omitidos (D9.7-D: 831 / 814); `nuxt typecheck` sin errores y `npm run build` correcto. Pruebas nuevas en `tests/security/authorization.test.ts` (Johanna, Diseñador, sin permisos, superadmin, consultar no concede crear/editar/eliminar, permisos mal formados, misma bandera en menú y dashboard, usuario nulo).

**Pendientes.** Comparar visualmente la navegación del Diseñador gráfico con su sesión real; el acceso directo por URL a un módulo oculto sigue mostrando el aviso de permisos de D9.7-C (Hub es la autoridad).

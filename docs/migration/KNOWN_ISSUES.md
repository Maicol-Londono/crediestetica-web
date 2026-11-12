# Defectos y limitaciones conocidas

Registro de hallazgos de las auditorías D4.6, D4.8-A y D5.0 (KI-10 a KI-14). **Ninguno se corrige en esta etapa** y ninguno bloquea la migración (ver `DECISIONS.md`). Todos están en estado **pendiente, no bloqueante**.

Salvo que se indique otra cosa, el comportamiento descrito se verificó leyendo el código de Crediestética. Donde se comparó con Planmed se dice expresamente.

## Resumen

| ID | Asunto | Prioridad |
|---|---|---|
| KI-01 | `LeadForm` y `MockLeadProvider` | Alta |
| KI-02 | `ValuationRequest` y destino CRM heredado | Alta |
| KI-03 | `PrpLeadForm` y destino CRM heredado | Alta |
| KI-04 | Consentimientos genéricos | Media |
| KI-05 | Autorización expresa no presentada en formularios | Media |
| KI-06 | Ausencia de evidencia de aceptación | Alta |
| KI-07 | Modal precontractual y `localStorage` | Media |
| KI-08 | `ReferralForm` y `accepted_contract` | Media |
| KI-09 | Mensajes de error provenientes de Hub | Baja |
| KI-10 | Prueba `hub-readonly` de procedimientos falla por el arnés | Baja |
| KI-11 | Carpeta `.data/planmed-content` y documentación de Planmed en el repositorio | Media |
| KI-12 | Listas vacías sin mensaje en Noticias y Clínicas aliadas | Baja |
| KI-13 | 503 transitorio observado una vez, posible límite de peticiones de Hub | Baja |
| KI-14 | Contenido local y tasa de financiación sin cargar | Alta |

---

## KI-01. `LeadForm` y `MockLeadProvider`

- **Descripción:** `LeadForm` envía la solicitud a través de `leadService`, que usa `MockLeadProvider`. Este proveedor solo escribe en la consola, espera 1,5 s y devuelve éxito.
- **Impacto:** el usuario ve la solicitud como enviada, con datos personales y financieros incluidos, y no llega a ningún sitio. El estado `accepted_habeas_data` tampoco se transmite.
- **Comportamiento actual:** simula el envío. **Debe mantenerse así**: no se desactiva ni se conecta a otro servicio. El mismo comportamiento existe en Planmed (`services/LeadService.ts` y `providers/MockLeadProvider.ts` usan el mismo proveedor; vive en `/financiacion`, dentro del simulador).
- **Corrección futura propuesta:** conectar `LeadForm` a un destino real y enviar el consentimiento; o dejar claro al usuario que es una simulación mientras no exista destino.
- **Dependencias:** destino acordado y contrato de envío (ver `INTEGRATION_BLOCKERS.md`, B-01 y B-02).
- **Prioridad:** alta.
- **Estado:** pendiente, no bloqueante.

## KI-02. `ValuationRequest` y destino CRM heredado

- **Descripción:** el formulario «Pide tu cita» envía al servidor de Crediestética (`/api/forms/valuation`), que reenvía a `crmValuationUrl`. Por defecto esa URL apunta al CRM de `pdtclientsolutions.com`.
- **Impacto:** `crmDestinationProblem` clasifica esa URL como heredada y el servidor responde 503 sin procesar nada. En `.env` y `.env.example` no hay variables `NUXT_CRM_*`, así que se usa el valor por defecto. Hoy el formulario no puede registrar solicitudes.
- **Comportamiento actual:** bloqueado a propósito para no enviar datos al CRM de otra marca. Campo de consentimiento: `accept = '1'` fijo.
- **Corrección futura propuesta:** definir la URL del CRM propio de Crediestética en la configuración del servidor.
- **Dependencias:** B-01.
- **Prioridad:** alta.
- **Estado:** pendiente, no bloqueante.

## KI-03. `PrpLeadForm` y destino CRM heredado

- **Descripción:** el formulario de los micrositios (`/prp/[slug]`) envía directamente desde el navegador a `crmPrpFormUrl`, por defecto también en `pdtclientsolutions.com`.
- **Impacto:** con el destino bloqueado, `/api/public/prp/[slug]` no sirve el micrositio (responde 404), así que el formulario no es alcanzable. Campo de consentimiento: `accept = '1'` fijo.
- **Comportamiento actual:** bloqueado a propósito.
- **Corrección futura propuesta:** configurar el CRM propio, igual que en KI-02.
- **Dependencias:** B-01.
- **Prioridad:** alta.
- **Estado:** pendiente, no bloqueante.

## KI-04. Consentimientos genéricos

- **Descripción:** cada formulario tiene una sola casilla obligatoria. En `PrpLeadForm` y `LeadForm` mezcla aceptar la política de datos con «autorizo ser contactado»; en `ValuationRequest` solo dice aceptar la política, aunque el mensaje de éxito promete que una asesora contactará al usuario.
- **Impacto:** un único booleano cubre finalidades distintas y no distingue qué documento se aceptó.
- **Comportamiento actual:** se conserva como está. Las casillas enlazan solo a la política de datos (`politicaDatos`).
- **Corrección futura propuesta:** separar visualmente política y contacto y decidir la correspondencia casilla-documento. Una casilla comercial opcional exigiría un campo propio en el destino.
- **Dependencias:** decisión del responsable sobre la redacción; B-03 para el campo separado.
- **Prioridad:** media.
- **Estado:** pendiente, no bloqueante.

## KI-05. Autorización expresa no presentada en formularios

- **Descripción:** el documento combinado de aviso de privacidad y autorización expresa (`autorizacionDatos`) está enlazado en la página de política de datos y en el contenido precontractual, pero ningún formulario lo presenta junto a su casilla.
- **Impacto:** si el destino interpreta el consentimiento como autorización, el usuario autoriza sin ver el documento que lo recoge.
- **Comportamiento actual:** sin cambios. Los documentos jurídicos están aprobados por el usuario; lo pendiente es dónde presentarlos, no su contenido.
- **Corrección futura propuesta:** enlazar el documento en las casillas que correspondan, sin cambiar campos ni payloads.
- **Dependencias:** decisión del responsable sobre qué cubre cada casilla.
- **Prioridad:** media.
- **Estado:** pendiente, no bloqueante.

## KI-06. Ausencia de evidencia de aceptación

- **Descripción:** ningún formulario envía fecha, versión ni identificador del documento aceptado. El rastreo de `LeadForm` (`trackPolicyView`) usa la versión fija `'v1.0'`, solo escribe en la consola y solo se dispara al hacer clic en el enlace, no al aceptar.
- **Impacto:** no hay forma de demostrar qué se aceptó, cuándo ni con qué versión del documento.
- **Comportamiento actual:** solo viaja el booleano (`accept`, `accepted_contract`) o nada (`LeadForm`).
- **Corrección futura propuesta:** registrar documento, versión y fecha cuando exista un destino que los admita.
- **Dependencias:** B-02.
- **Prioridad:** alta.
- **Estado:** pendiente, no bloqueante.

## KI-07. Modal precontractual y `localStorage`

- **Descripción:** el modal guarda `crediestetica_precontractual_v1 = 'accepted'` en `localStorage` y no registra nada más.
- **Impacto:** la aceptación solo existe en ese navegador, se puede borrar, no tiene fecha, versión ni identidad, el servidor no la puede comprobar y no se asocia a ningún envío posterior. La clave `v1` no cambia si los documentos cambian. `setItem` no está protegido con `try/catch`. «No acepto» solo redirige a Google.
- **Comportamiento actual:** se conserva. Desde D4.7 el modal no se monta en las páginas legales.
- **Corrección futura propuesta:** proteger el acceso a `localStorage` y guardar versión y fecha de forma local (endurecimiento, no evidencia legal).
- **Dependencias:** ninguna para el endurecimiento local; B-02 para evidencia real.
- **Prioridad:** media.
- **Estado:** pendiente, no bloqueante.

## KI-08. `ReferralForm` y `accepted_contract`

- **Descripción:** la casilla envía `accepted_contract: true` a Hub (`/v1/web/prp-enrollments`). Desde D4.2 el texto visible dice «Entiendo y acepto las condiciones del programa de referidos publicadas en esta página».
- **Impacto:** el campo se llama «contrato», pero no existe un contrato; la página es el único soporte de las condiciones. El formulario solo se muestra si Hub entrega contenido del programa. No se puede decir si Hub guarda el valor con fecha (ver B-04).
- **Comportamiento actual:** no se cambia el campo, su validación ni el payload.
- **Corrección futura propuesta:** mantener el campo y asegurar que la página siempre muestre las condiciones antes de pedir la aceptación.
- **Dependencias:** B-04.
- **Prioridad:** media.
- **Estado:** pendiente, no bloqueante.

## KI-09. Mensajes de error provenientes de Hub

- **Descripción:** ante un 422 de Hub, el servidor copia el mensaje de cada campo (hasta 200 caracteres) y el formulario lo muestra junto al campo. Para `accepted_contract`, el mensaje es el que Hub devuelva.
- **Impacto:** el usuario podría ver un texto que mencione un «contrato» inexistente. No se pudo comprobar qué texto devuelve Hub.
- **Comportamiento actual:** sin cambios; el mensaje propio del formulario («Debes aceptar las condiciones del programa de referidos para continuar.») solo aparece en la validación local.
- **Corrección futura propuesta:** mostrar un mensaje neutro propio de Crediestética para ese campo.
- **Dependencias:** ninguna.
- **Prioridad:** baja.
- **Estado:** pendiente, no bloqueante.

## KI-10. Prueba `hub-readonly` de procedimientos falla por el arnés (D5.0)

- **Descripción:** al ejecutar `tests/integration/hub-readonly.test.ts` contra un Hub que responde, la prueba «la lista de procedimientos trae la fuente efectiva por tipo…» falla con `ReferenceError: withOrientation is not defined`. `tests/recommendations/harness.ts` no registra `withOrientation` (utilidad de `server/utils/procedureOrientation.ts`) como auto-import de Nitro.
- **Impacto:** es un defecto de la prueba, no del producto: la aplicación real responde 200 en `/api/public/procedures`. Estaba oculto porque esas pruebas se omiten sin Hub. Con un Hub disponible, la suite falla en esa prueba.
- **Comportamiento actual:** 9 de 10 pruebas `hub-readonly` pasan; ésta falla.
- **Corrección futura propuesta:** registrar `withOrientation` en el arnés, con una versión que no consulte el almacenamiento local.
- **Dependencias:** ninguna.
- **Prioridad:** baja.
- **Estado:** pendiente, no bloqueante.

## KI-11. Carpeta `.data/planmed-content` y documentación de Planmed en el repositorio (D5.0)

- **Descripción:** en el espacio de trabajo existe `.data/planmed-content/` con archivos de Planmed (`about.json`, `clinics.json`, `financing-rate.json`, sus copias `.prev`, `clinics-media/` y `pages/`). Además, `documentacion/` conserva documentos de Planmed (por ejemplo `documentacion-maestra-planmed/`) con referencias a `.data/planmed-content`. `.data/` está en `.gitignore`.
- **Impacto:** el código de Crediestética no lee esa carpeta: busca en `.data/crediestetica-content/`. El riesgo es que alguien la copie por error y publique contenido o una tasa de Planmed.
- **Comportamiento actual:** sin efecto en el sitio. No se abrió el contenido de esos archivos ni se modificaron.
- **Corrección futura propuesta:** decidir si se archiva o se elimina fuera del repositorio, y revisar la documentación heredada de `documentacion/`.
- **Dependencias:** decisión del responsable.
- **Prioridad:** media.
- **Estado:** pendiente, no bloqueante.

## KI-12. Listas vacías sin mensaje en Noticias y Clínicas aliadas (D5.0)

- **Descripción:** con una lista vacía válida, `/noticias` y `/clinicas-aliadas` muestran solo el encabezado, sin un texto como «Pronto publicaremos…». El código lo define así a propósito («lista vacía válida => cuadrícula vacía») y es igual que en Planmed (se comprobó el manejo de la lista vacía en `pages/noticias/index.vue`; `clinicas-aliadas.vue` es idéntica salvo el nombre de la marca).
- **Impacto:** el visitante ve una página sin contenido y sin explicación. Otras secciones (procedimientos, recomendaciones, testimonios, nosotros) sí tienen mensaje.
- **Comportamiento actual:** se conserva como en Planmed.
- **Corrección futura propuesta:** añadir un mensaje de ausencia de contenido coherente con el de las demás secciones.
- **Dependencias:** ninguna.
- **Prioridad:** baja.
- **Estado:** pendiente, no bloqueante.

## KI-13. 503 transitorio observado una vez (D5.0)

- **Descripción:** durante la verificación, `/testimonios/antes-y-despues` se sirvió una vez con HTTP 503 mientras mostraba el estado vacío. No se reprodujo en cuatro intentos.
- **Impacto:** si se debe a un límite de peticiones de Hub, un usuario podría ver errores intermitentes con mucho tráfico. Es solo una hipótesis: Hub limita a 60 peticiones por minuto (`throttle:60,1`) y cada página llama a Hub varias veces (el menú pide `recommendation-topics` y `cirugias` en cada carga); esa sesión superó las 60 llamadas por minuto. No se confirmó.
- **Comportamiento actual:** sin cambios.
- **Corrección futura propuesta:** confirmar la causa con el registro de Hub y valorar si el menú debe cachearse en Crediestética.
- **Dependencias:** acceso a los registros de Hub (fuera del repositorio).
- **Prioridad:** baja.
- **Estado:** pendiente, no bloqueante.

## KI-14. Contenido local y tasa de financiación sin cargar (D5.0)

- **Descripción:** `Nosotros`, `Clínicas aliadas` y la tasa del simulador se guardan en archivos locales (`.data/crediestetica-content/`), que no existen. Sin ellos, `/nosotros` muestra «La información de esta sección aún no está disponible», `/clinicas-aliadas` queda vacía y el simulador muestra «Simulación no disponible» (`/api/public/financing-rate` responde 503 `rate_not_configured`).
- **Impacto:** el simulador de `/financiacion` no funciona hasta que se configure la tasa, y el sitio carece de esas secciones. Es el comportamiento diseñado (no se usa una tasa de respaldo), no un error.
- **Comportamiento actual:** correcto frente a la ausencia de datos.
- **Corrección futura propuesta:** cargar la tasa y el contenido desde el panel por una persona autorizada. No es un cambio de código.
- **Dependencias:** B-06 para los datos corporativos que aparecen en esas secciones; tasa e información que debe entregar el responsable.
- **Prioridad:** alta.
- **Estado:** pendiente, no bloqueante.

---

## Otros pendientes registrados en etapas anteriores

No forman parte de D4.6 ni de D4.8-A; se anotan aquí para tener un único lugar de consulta.

- **Datos legales sin confirmar:** razón social (hay una discrepancia entre «Legamled SAS» y «LEGALMED S.A.S.», no resuelta), NIT asociado con su dígito de verificación, correo de PQRS, domicilio, representante legal y entidad de vigilancia. Hoy los textos legales usan una referencia genérica a la sociedad responsable. Se centralizan en `shared/utils/legalIdentity.ts`.
- **Documentos legales pendientes de generar:** pagaré, autorización de consulta y reporte a centrales de riesgo, formato o canal de reclamaciones y documento oficial de advertencias (todos con `url: null` en `shared/utils/legalDocuments.ts`).
- **PDF heredados:** los dos PDF de Cliniplanes se conservan sin modificar en `archivo-legal-heredado/`, fuera de `public/`.
- **Direcciones del CRM heredado:** `nuxt.config.ts` aún contiene las URL heredadas de `pdtclientsolutions.com`; el servidor las bloquea.
- **Pruebas que fallan desde antes de las etapas D (14):** `tests/security/routes.test.ts` (5), `tests/site-error.test.ts` (4), `tests/recommendations/listings-and-source.test.ts` (2), `tests/about/pages.test.ts` (1), `tests/recommendations/errors-precedence.test.ts` (1) y `tests/recommendations/tree-static.test.ts` (1). Se comprobó con una copia de `HEAD` que ya fallaban. Las pruebas de `hub-readonly` y `error-pages` (15) se omiten sin sitio o Hub disponibles.
- **Redes sociales y logo:** no hay perfiles verificados de Crediestética (no se publican enlaces) y falta una versión del logo con fondo transparente.
- **`README.md` de la raíz:** todavía describe el proyecto de Planmed. No se modificó.
- **Hook de edición:** `.claude/hooks/check-mojibake.py` no existe y provoca un aviso tras cada escritura de archivos con la herramienta del agente.

---

## Hallazgos de D5.1 (2026-11-10)

## KI-15. Menú de Navbar con la recuperación anterior de Planmed

- **Descripción:** `components/layout/Navbar.vue` conserva `withRetry` y `ensureTopics`. Planmed ya los sustituyó por `recoverTopics` (cancelable al desmontar, sin reintento en el servidor).
- **Impacto:** con Hub lento o caído, el menú de Recomendaciones tarda más y se comporta distinto que en Planmed.
- **Corrección futura propuesta:** sincronizar esa función con la versión actual de Planmed.
- **Dependencias:** ninguna. **Prioridad:** baja. **Estado:** **resuelto en D5.3 (2026-11-10).** `Navbar.vue` usa `recoverTopics` como Planmed y ya no hay reintento en el servidor. Pruebas: `tests/navigation/*` (40 de 40), incluida la ejecución real de `recoverTopics` con un refresh simulado.

## KI-16. Residuos de identidad de Planmed en el repositorio

- **Descripción:** `package.json` tiene `name: planmed-web`; `README.md` describe Planmed; unos 20 archivos tienen comentarios con «Planmed»; existe el build ignorado `.output-uat-portable/` (47 MB, con la paleta de Planmed). Complementa KI-11.
- **Impacto:** sin efecto funcional ni visible para el visitante; confunde a quien mantiene el código. El build podría servirse por error si alguien lo despliega.
- **Corrección futura propuesta:** renombrar el paquete, reescribir el README y los comentarios. La carpeta del build y `.data/planmed-content/` solo se retiran con autorización expresa.
- **Dependencias:** ninguna. **Prioridad:** baja. **Estado:** **resuelto en parte en D5.4 (2026-11-10).**
  - Corregido: `name` de `package.json` y `package-lock.json` (`crediestetica-web`); `README.md` raíz reescrito para Crediestética; 25 comentarios que atribuían a Planmed la configuración, la línea o el tenant (providers y rutas/utilidades de `server/`).
  - Conservado a propósito: las referencias que son históricas o de bloqueo (`shared/utils/crmDestination.ts`, `legalDocuments.ts`, el comentario de `PageHero.vue` y los de «CRM heredado de Planmed» en `valuation.ts` y `prp/[slug].get.ts`); `.gitignore` (paquetes heredados); `documentacion/` (documentación de Planmed, referencia histórica); `scan-results.txt` (artefacto de diagnóstico).
  - Pendiente (requiere autorización): retirar `.output-uat-portable/` y `.data/planmed-content/`; decidir qué hacer con `documentacion/`, `scratch/` y `scripts/`.

## KI-17. Dominio y roles del panel sin definir

- **Descripción original:** `localDomain`, `site.url` y el `Sitemap` de `robots.txt` usaban un dominio sin confirmar; `adminRoleIds`, `rateEditorRoleIds` y `contentEditorRoleIds` estaban vacíos.
- **Estado: resuelto en parte (D5.5, 2026-11-10).**
- **Verificado (consulta de solo lectura a la copia local de PD, `wellezy_pd_copy`; no es producción):**
  - Empresa Legalmed: `companies.id = 16`, slug `legalmed`, activa.
  - Línea Crediestética: `lineas.id = 4`, `company_id = 16`, slug `crediestetica`, activa.
  - Dominio: `linea_domains` tiene `crediestetica.com` como dominio primario y activo de la línea 4 (creado el 2026-11-06). Coincide con `site.url`, `NUXT_PUBLIC_SITE_URL` y el `Sitemap` de `robots.txt`.
  - Catálogo de roles (globales): 19 «Diseñador gráfico», 20 «Administrador de contenido de línea». Personal de la línea 4 en esa copia: 2 personas, con los roles 4 «Coordinador financiación» (líder de área) y 12 «Visitador convenios». Nadie tiene los roles 19 ni 20.
- **Ámbito de cada valor (se conserva la separación):** `site.url` es la URL pública (canonical, sitemap, Open Graph); `wellezyApiBaseUrl` (`NUXT_WELLEZY_API_BASE_URL`) es la API de Hub y no tiene valor por defecto; `localDomain` es informativo y ningún código lo lee; el tenant se resuelve por slug (`X-Tenant-Linea: crediestetica`) y no se usa `X-Tenant-Domain`. Los ids 16 y 4 solo figuran como referencia documental en `nuxt.config.ts`: el código no los usa.
- **Roles, sin cambios de configuración (se mantienen vacíos), por estas razones:**
  - `adminRoleIds`: ninguna función lo consume para decidir acceso (`allowedRoleIds` no se invoca); el acceso depende de la pertenencia a empresa y línea.
  - `contentEditorRoleIds`: los perfiles «Diseñador gráfico» y «Administrador de contenido de línea» ya se reconocen por nombre; fijar ids ataría el acceso a un número que puede variar entre entornos.
  - `rateEditorRoleIds`: hoy editan la tasa el superadmin global y el líder de área. Falta una decisión de negocio: si algún rol adicional (por ejemplo 19 o 20) debe poder editarla. No hay evidencia en los datos que la responda.
- **Limitaciones:** la consulta fue sobre una copia local; no se verificó el Hub de producción ni el despliegue real de `crediestetica.com`. Los ids de rol pueden diferir allí.
- **Pendiente:** (1) decidir qué rol adicional edita la tasa y confirmar su id en producción; (2) confirmar que `crediestetica.com` es el dominio de producción y si hay un dominio de pruebas distinto.
- **Dependencias:** decisión del responsable (rol de la tasa) y confirmación de producción. **Prioridad:** baja.

## KI-18. Editor de páginas sin campo de video

- **Descripción:** Crediestética retiró `videoUrl` del editor de páginas administradas y de `shared/utils/sitePages.ts`. Hoy solo `/clinicas-aliadas` usa páginas administradas.
- **Impacto:** si se quieren videos propios en esas páginas, hay que reponer el campo.
- **Corrección futura propuesta:** reponerlo solo si Crediestética entrega videos propios.
- **Dependencias:** contenido del titular. **Prioridad:** baja. **Estado:** diferencia intencional, sin acción.

## KI-19. Nombre de categoría derivado del slug

- **Descripción:** `pages/procedimientos/index.vue` construye la etiqueta de categoría desde el slug (`corporal` → «Corporal»). El endpoint público `categorias-cirugias` entrega el nombre real. Un nombre con tildes o varias palabras (p. ej. «Cirugía facial») se mostraría degradado.
- **Estado:** pendiente, sin impacto hoy (el único slug coincide con el nombre).
- **Corrección propuesta:** ruta Nitro de lectura `/api/public/procedure-categories` con fallback al slug. No se implementó para no ampliar el alcance de D6.
- **Dependencias:** ninguna. **Prioridad:** baja.

## KI-20. 13 pruebas estáticas fallaban en la suite completa

- **Estado: resuelto en D6.1 (2026-11-10), solo con ajustes de pruebas; no se encontró ningún defecto de implementación.** Suite completa: 746 pruebas, 730 pasan, 0 fallan, 16 omitidas (antes 717 / 13 / 16). Typecheck correcto.
- **Causa y evidencia (Git: `HEAD 2e82615`; los archivos de implementación ya tenían ese comportamiento en `HEAD`, y el commit `67ec0e2` del 2026-10-23 dejó los tests fuera de la entrega):**
  - `error.vue` (4): la prueba describía una página independiente (logo propio, `<main id="contenido">`, `focus-visible:ring-2`, `font-sans`). Desde `dc195d8`/`2b54c98` la página usa `<NuxtLayout>`: `<main>`, tipografía, menú y pie vienen de `layouts/default.vue`. El foco usa `outline: 2px solid` en CSS. Pruebas ajustadas para exigir lo mismo en el layout.
  - Matriz de seguridad admin (5): la matriz esperaba 36 rutas y no cargaba `newsSections.ts` ni `procedureSections.ts`; hoy son 44 (se añadieron `news-sections` y `procedure-sections`, 4 métodos cada una). Ahora la matriz las audita (origen 403, sin sesión 401, Hub no se toca). Noticias sigue deshabilitada: solo se amplió la cobertura.
  - Referidos (1): la prueba esperaba un formulario sin envío (`referral-form-not-functional`). El formulario envía por `ReferralService` (D4.2). La prueba ahora verifica que el componente no llama a la red directamente y que tiene `role="alert"` y `role="status"`.
  - R2 de recomendaciones (1): la llamada a `getPage` va envuelta en `nuxtApp.runWithContext(...)`; el comportamiento (pedir página solo si la fuente es `page`) no cambió.
  - Mensajes vacíos con error (1): procedimientos y noticias usan `<template v-else>` tras el error en lugar de `<div v-else class="grid">`; el error sigue separado del estado vacío.
  - Módulo «puro» (1): `recommendationTree.ts` importa `contentBlocks.ts` desde `8a65274`. «Puro» se redefinió como: solo importa módulos hermanos de `shared/utils` por ruta relativa con `.ts`, recursivamente (sin alias de Nuxt ni paquetes).
- **Pendiente:** ninguno de estos 13. Las 16 pruebas omitidas no se revisaron.

## KI-19 (actualización D7.1)

Resuelto en D7.1: el filtro público de categorías usa el nombre real de `categorias-cirugias`, con respaldo en el slug. Prueba: `tests/procedures/admin-and-categories.test.ts` y lectura real en `hub-readonly`.

## KI-21. Orientación de portada guardada en archivo local

- **Descripción:** `imageOrientation` se guarda localmente (`server/utils/procedureOrientation.ts`), no en Hub (igual que en Planmed). Es el único dato de procedimientos que no vive en Hub.
- **Estado:** diferencia heredada, sin acción; conservar por paridad. Requeriría un campo en Hub para centralizarlo.
- **Prioridad:** baja.

## KI-22. Enlaces cortos de Crediestética desactivados en el Hub (D7.4)

- **Diagnóstico (solo lectura):** `config/short_links.php` del Hub declara `lines.crediestetica.enabled = false` a propósito, con una nota que dice que el catálogo de Crediestética era local y no tenía correspondencia con el Hub. Por eso `EnsureShortLink` no genera enlaces para la línea 4 (al evaluar el destino no hay línea habilitada). El hook de `Cirugia` funciona y no falla: la línea simplemente está deshabilitada.
- **Condiciones que sí se cumplen:** existe `SHORT_LINKS_DOMAIN` local (`go.localhost:8000`) y `linea_domains` tiene `crediestetica.com` como dominio primario activo de la línea 4.
- **Clasificación:** configuración del Hub (decisión previa que quedó desactualizada: Crediestética ya consume el catálogo del Hub). No es un problema de aislamiento ni un defecto de esta web.
- **Qué se necesita (fuera de este repositorio):** que el responsable del Hub active la línea (`enabled = true`) y, si se desean, añada plantillas para recomendaciones; luego `short-links:backfill`. No se tocó nada.
- **Efecto actual:** sin `short_url`, la web copia la URL larga (ver KI de enlaces cortos en `CLAUDE.md` del Hub).

## KI-23. Detalles visuales del catálogo público (D7.4)

Observaciones de bajo riesgo, sin acción: marcador «Imagen en producción» sin imagen, ausencia de distintivo de destacado en el listado y layouts de sección indistinguibles sin imágenes. Revisar al cargar contenido real.

## KI-24. Noticias provisionales cargadas en la copia local (D7.5)

- **Estado:** 4 noticias de demostración (ids 278 a 281) en `wellezy_pd_copy`; no existen en producción. **Deben sustituirse por contenido real antes de producción** y retirarse con autorización expresa.
- **Prioridad:** media (bloquea la puesta en producción del módulo).

## KI-25. Texto fijo del detalle de noticias heredado de Planmed (D7.5)

- **Descripción:** al pie de cada noticia, el bloque de cierre dice «Tu seguridad es lo más importante en cada etapa… con el respaldo de la entidad especializada en cirugía plástica». Es texto fijo de la plantilla (`pages/noticias/[slug].vue`), no del Hub, y afirma una descripción institucional de Crediestética que no está confirmada. Además, en móvil el botón flotante «Pide tu cita» se superpone al botón «Compartir por WhatsApp».
- **Estado:** pendiente de decisión (no se modificó). **Prioridad:** media.

## KI-26. Recomendaciones provisionales de demostración (D7.7)

- **Descripción:** los temas, subtemas, secciones y recomendaciones de la línea 4 son de demostración (slugs `demo-*`, aviso visible de «contenido provisional»). No son contenido oficial ni clínico.
- **Qué se necesita:** que Crediestética apruebe las recomendaciones oficiales (con validación médica e institucional) y sustituir o despublicar las provisionales desde el panel.
- **Registros a retirar o sustituir:** temas 4 a 6; subtemas 52 a 55 (el 54 y una sección oculta del 55 existen a propósito para probar la visibilidad).
- **Efecto actual:** sin imágenes ni videos. El bloque final de la página («entidad especializada en cirugía plástica») y el solape móvil del botón «Pide tu cita» siguen siendo KI-25.

## KI-25 (actualización): RESUELTO (2026-11-10)

- **A. Pie con afirmación no confirmada.** Causa: bloque «llamado a la acción» duplicado en dos archivos (`pages/noticias/[slug].vue` y `components/recommendations/RecommendationShell.vue`), heredado de la plantilla, con «con el respaldo de la entidad especializada en cirugía plástica». Corrección: título «Infórmate y resuelve tus dudas» y texto «Antes de tomar una decisión sobre tu procedimiento, conoce cómo funciona la financiación y resuelve tus dudas.» Enlaces sin cambios (`/financiacion#calculadora`, `/noticias` y `/procedimientos`). El contenido de las noticias no se tocó.
- **B. Superposición en móvil.** Causa: «Pide tu cita» (`components/forms/ValuationRequest.vue`, `fixed`, `z-40`) era una pastilla de unos 140 px de ancho a la derecha, y en 375 px cubría «Compartir por WhatsApp» y el texto de la introducción. Corrección: en móvil es un botón circular de 44 px (solo icono, texto en `sr-only` y `title`) alineado sobre el botón del chat; desde `md` conserva la pastilla y su posición actuales. El chat (`ChatLauncher.vue`) no cambió.
- **Validado:** en 375 px los rectángulos del botón y del chat no se cruzan con «Copiar enlace» ni «Compartir por WhatsApp»; no hay desbordamiento horizontal; en 768 y 1024 px el botón sigue siendo la pastilla con texto y no se cruza con el chat. «Pide tu cita» abre y cierra su ventana; los enlaces de WhatsApp (compartir y chat) no cambiaron. Pruebas: 748 de 748 sin la integración y 4 pruebas nuevas en `tests/config/floating-and-footer.test.ts`.
- **Límite conocido:** los botones flotantes, por naturaleza, pasan sobre el contenido al desplazarse; el botón circular reduce el área tapada de unos 140 px a 44 px.
- **Fuera de alcance, sin cambiar:** el rótulo «En Crediestética te acompañamos» (noticias, recomendaciones y procedimientos) y el texto de `pages/procedimientos/[slug].vue` («profesional certificado»…). Quedan para que Crediestética confirme si son aceptables.

# Paridad funcional con Planmed

Matriz de paridad entre el sitio de Planmed (`planmed-web`) y el de Crediestética. Fecha: 2026-11-09.

## Cómo se construyó

- Comparación de la lista de archivos de ambos repositorios (excluyendo `node_modules`, `.nuxt`, `.output`, `.git`, `.data`): `pages/`, `components/`, `server/`, `services/`, `providers/`.
- Comparación de contenido solo en los archivos que se mencionan explícitamente abajo.
- Resultados de las pruebas del repositorio de Crediestética.
- No se ejecutó Planmed ni se compararon respuestas reales de Hub. Donde no se inspeccionó algo, se indica «no verificado»: este documento no afirma que funcione.

Estados de paridad usados:

- **Estructural**: el archivo o la ruta existe igual que en Planmed; el comportamiento con datos reales no se ha verificado.
- **Adaptada**: existe y se adaptó a la identidad de Crediestética; el comportamiento heredado se conserva.
- **Parcial**: existe, pero con una diferencia deliberada o una limitación.
- **Heredada con defecto**: funciona igual que en Planmed, incluyendo un defecto documentado en `KNOWN_ISSUES.md`.

## Resultado de la comparación de archivos

- Las 45 páginas de `pages/` existen en ambos con la misma ruta (público, panel y micrositios PRP).
- `server/`, `services/` y `providers/` tienen los mismos archivos en ambos; no se detectó ningún endpoint ni proveedor exclusivo de uno de los dos.
- Archivos que existen solo en Planmed: `components/referral/ProgramContent.vue` (contenido estático del programa de referidos), `components/testimonials/TestimonialsSocial.vue` (enlaces a redes), los dos PDF de `public/documents/` y varios recursos de imagen y logos de Planmed. Su ausencia en Crediestética es deliberada, salvo los logos (ver pendientes).
- Archivos que existen solo en Crediestética: componentes y utilidades del módulo legal (`components/legal/`, `shared/utils/legalDocuments.ts`, `legalIdentity.ts`, `precontractualContent.ts`), `shared/utils/crmDestination.ts`, `archivo-legal-heredado/` (PDF heredados, fuera de `public/`), el logo y la imagen del equipo de Crediestética, y 9 archivos de pruebas adicionales.

## Matriz

| Módulo o funcionalidad | En Planmed | Estado en Crediestética | Adaptaciones realizadas | Pruebas | Paridad | Pendientes |
|---|---|---|---|---|---|---|
| Inicio (`/`) | Sí | Presente | Paleta, tipografías y textos de marca | `tests/config/visual-identity`, `contact-and-brand` | Adaptada | Comportamiento con datos de Hub no verificado |
| Financiación y simulador (`/financiacion`) | Sí | Presente | Textos de marca; botón de WhatsApp con enlace centralizado | `tests/financing/*`; D5.0 en navegador | Parcial | La tasa es local y no está configurada: el simulador muestra «Simulación no disponible» (KI-14). Sin tasa de respaldo, como se diseñó |
| Solicitud de financiación (`LeadForm`) | Sí, simulada | Igual que Planmed | Texto de consentimiento y enlace al documento | Pruebas de texto en `tests/config/legal-*` | Heredada con defecto | KI-01: usa `MockLeadProvider`, no transmite |
| Cita de valoración (`ValuationRequest`) | Sí | Presente | Consentimiento enlazado al registro de documentos | `tests/config/*`, `tests/security/crm-destination` | Heredada con defecto | KI-02: destino CRM heredado bloqueado |
| Estudio de créditos | Sí | Presente | Identidad visual | No específica | Estructural | No verificado |
| Nosotros y Quiénes somos | Sí | Presente | Textos, imagen del equipo | `tests/about/*`; D5.0 en navegador | Parcial | Contenido local sin cargar: «La información de esta sección aún no está disponible» (KI-14). No usa Hub |
| Servicios | Sí | Presente | Identidad visual | No específica | Estructural | No verificado |
| Clínicas aliadas | Sí | Presente | Identidad visual | `tests/about/clinics`; D5.0 en navegador | Parcial | Lista local vacía, sin mensaje (KI-12, KI-14). No usa Hub |
| Procedimientos (público y menú) | Sí | Presente | Menú y textos | `tests/navigation/procedures-menu`; D5.0 contra Hub local | Verificado parcialmente | Hub responde 200 con 0 procedimientos para la línea; con datos no verificado |
| Noticias | Sí | Presente | Identidad visual | D5.0 contra Hub local | Verificado parcialmente | Hub responde 200 con 0 noticias; lista vacía sin mensaje (KI-12); con datos no verificado |
| Recomendaciones (cuidados, revisión, árbol de temas) | Sí | Presente | Identidad visual | `tests/recommendations/*` (11 archivos); D5.0: 9 de 10 `hub-readonly` | Verificado parcialmente | Hub responde 200 con 0 páginas y 0 temas; hay 4 fallos heredados y KI-10 |
| Testimonios y antes y después | Sí | Parcial | Sin enlaces a redes de Planmed | `tests/about/pages`; D5.0 contra Hub local | Parcial | Hub responde 200 sin videos, casos ni publicaciones; `TestimonialsSocial` retirado hasta tener perfiles de Crediestética |
| Programa de referidos (página) | Sí, con texto estático de Planmed | Parcial | Sin el texto estático; muestra un aviso si Hub no entrega contenido | `tests/about/pages`; D5.0 contra Hub local | Parcial | Hub responde `referral.content` vacío: aviso «Pronto compartiremos…» y formulario oculto. Falta el contenido propio del programa |
| Formulario de referidos (`ReferralForm`) | Sí | Heredada con defecto | Texto de la casilla; solo se muestra con contenido del programa | `tests/config/legal-containment` | Heredada con defecto | KI-08 y KI-09 |
| Micrositios PRP (`/prp/[slug]`) y `PrpLeadForm` | Sí | Heredada con defecto | Consentimiento enlazado al registro de documentos | `tests/security/crm-destination` | Heredada con defecto | KI-03: destino CRM heredado bloqueado |
| Información precontractual (página y modal) | Sí | Adaptada | Fuente única de texto; identidad de la sociedad centralizada; páginas legales sin modal | `tests/config/legal-containment`, `legal-presentation` | Adaptada | KI-07; razón social pendiente |
| Política de datos personales | Sí | Parcial | Estructura provisional con tres documentos enlazados | `tests/config/legal-documents` | Parcial | Cinco documentos sin generar |
| Navbar, Footer y chat flotante | Sí | Adaptada | Menú CONÓCENOS, contacto y WhatsApp centralizados, sin Messenger ni redes de Planmed | `tests/navigation/menus`, `contact-and-brand` | Adaptada | Perfiles sociales sin definir; logo con fondo transparente pendiente |
| Identidad visual (paleta y tipografías) | Sí | Adaptada | Paleta de Crediestética, fuentes Libre Bodoni y Questrial | `tests/config/visual-identity` | Adaptada | Ninguno |
| Panel de administración (login, contraseña, configuración, contenido) | Sí | Presente | Textos y paleta | `tests/security/*`, `tests/about/*`, `tests/recommendations/admin-*` | Estructural | Ver fallos heredados en `tests/security/routes` |
| Seguridad de rutas y origen | Sí | Presente | Ninguna | `tests/security/*` | Estructural | 5 fallos heredados en `routes.test.ts` |
| Páginas de error | Sí | Presente | Paleta | `tests/site-error`, `tests/integration/error-pages` | Estructural | 4 fallos heredados; las pruebas de integración se omiten sin `PLANMED_SITE_URL` |
| Lecturas públicas contra Hub | Sí | Presente | Cabecera de línea configurada en servidor | `tests/integration/hub-readonly` (9 de 10 pasan contra Hub local) | Verificado parcialmente | La línea resuelve, pero no tiene contenido; ver `HUB_READ_VERIFICATION.md` |

## Resultados de la verificación D5.0 (2026-11-09)

Detalle técnico en `HUB_READ_VERIFICATION.md`. Resumen:

| Módulo | Origen de los datos | Estado |
|---|---|---|
| Noticias | Hub (`/v1/web/posts`) | Sin datos disponibles |
| Procedimientos | Hub (`/v1/web/cirugias`) | Sin datos disponibles |
| Recomendaciones | Hub (`recommendation-pages` y `recommendation-topics`) | Sin datos disponibles |
| Testimonios | Hub (`/v1/web/patient-section`) | Sin datos disponibles |
| Nosotros | Archivo local | Sin datos disponibles (no es Hub) |
| Clínicas aliadas | Archivo local | Sin datos disponibles (no es Hub) |
| Tasa de financiación | Archivo local | Sin datos disponibles (no es Hub) |
| Programa de referidos | Hub (`patient-section`, campo `referral`) | Sin datos disponibles; envío no verificable (es una escritura) |

- La línea `crediestetica` resuelve en Hub con `X-Tenant-Linea` (200) y no entrega contenido sin él o con un slug inexistente (404).
- Todos los estados vacíos y de error se muestran correctamente y no se confunden con contenido ni con un fallo de integración; no hay datos ni tasa de Planmed.
- No hay ningún módulo en estado «Verificado» porque ninguno tiene datos reales en la copia de Hub usada. No se crearon datos de prueba.
- Micrositios PRP: **bloqueados por dependencia externa** (destino CRM heredado, KI-03).

## Siguiente paso recomendado

Con los resultados de D5.0, la paridad ya no está limitada por el código sino por la falta de contenido:

1. **Cargar el contenido de la línea `crediestetica`** (procedimientos, noticias, recomendaciones, testimonios y contenido del programa de referidos en Hub, por quien administra Hub) y **la tasa, Nosotros y Clínicas desde el panel** (KI-14). Es una tarea operativa fuera del código.
2. Repetir entonces esta verificación con datos reales: es la única forma de pasar los módulos de «Sin datos disponibles» a «Verificado».
3. Dentro del código, la brecha menor es mostrar un mensaje en las listas vacías de Noticias y Clínicas (KI-12) y arreglar el arnés de la prueba `hub-readonly` (KI-10), con autorización.

Otras brechas menores: perfiles de redes sociales de Crediestética, logo con fondo transparente y contenido propio del programa de referidos.

---

# D5.1 — Diagnóstico de brechas y plan de cierre (2026-11-10)

Etapa de diagnóstico: no se modificó código, configuración, formularios, APIs ni documentos jurídicos. Método: comparación por contenido (hash y diff normalizado que ignora marca y colores) de 881 archivos comunes entre `planmed-web` y Crediestética. 743 son idénticos (530 son el build ignorado `.output-uat-portable/`); 138 difieren, de los cuales 63 solo cambian marca o color y el resto se revisó línea a línea.

## Clasificación

Clases: **A** migrada y verificada · **B** migrada, pendiente de datos · **C** pendiente de adaptación (conserva identidad, textos, recursos o configuración de Planmed) · **D** pendiente de implementación · **E** diferencia intencional · **F** bloqueada externamente.

| Funcionalidad | Clase | Fundamento (código real) |
|---|---|---|
| Paleta, tipografías, logo, contacto y WhatsApp centralizados | A | Pruebas `tests/config/*`; sin colores de Planmed en el código fuente |
| Páginas legales (precontractual, política de datos) y contención del modal | A | Pruebas `legal-*`; la política es una estructura provisional (ver F) |
| Tenancy (`X-Tenant-Linea` solo desde el servidor; línea vacía = sin petición) | A | D5.0 y `server/utils/wellezy.ts` |
| Menú CONÓCENOS, pie de página sin redes de Planmed, chat flotante | A | `tests/navigation/*` |
| Panel admin (estructura, login, páginas, recomendaciones) | A | `layouts/admin.vue` solo difiere en marca; `tests/security/*` salvo 5 fallos heredados |
| Noticias, Procedimientos, Recomendaciones, Testimonios (lecturas de Hub) | B | Hub responde 200 con 0 registros; código y estados de error verificados |
| Programa de referidos (página y formulario) | B | Sin `referral.content` en Hub; envío no verificado |
| Nosotros, Clínicas aliadas, Quiénes somos (contenido local) | B | `.data/crediestetica-content/` no existe; se carga desde el panel |
| Tasa de financiación y simulador | B | Sin tasa por diseño: «Simulación no disponible» hasta configurarla |
| Menú de Procedimientos y Recomendaciones (recuperación ante fallo de Hub) | C | `Navbar.vue` conserva la lógica anterior de Planmed (`withRetry` + `ensureTopics`); Planmed ya la reemplazó por `recoverTopics` (cancelable, sin reintento en servidor) |
| Identidad del repositorio | C | `package.json` con `name: planmed-web`; `README.md` raíz describe Planmed; comentarios «Planmed» en unos 20 archivos; `.data/planmed-content/` (KI-11); build ignorado `.output-uat-portable/` (47 MB) con la paleta de Planmed |
| Dominio del sitio | C | `nuxt.config.ts` (`localDomain`, `site.url`) y `public/robots.txt` (Sitemap) usan un dominio de la marca no confirmado |
| Roles del panel | C | `adminRoleIds`, `rateEditorRoleIds` y `contentEditorRoleIds` vacíos (Planmed: `19`); la tasa solo la edita el superadmin global o el líder de área |
| Estados vacíos de Noticias y Clínicas aliadas | D | KI-12: solo encabezado, sin mensaje |
| Arnés de la prueba `hub-readonly` de procedimientos | D | KI-10: `withOrientation` sin auto-import en `tests/recommendations/harness.ts` |
| Solicitud de financiación (`LeadForm`) | F | `MockLeadProvider` (KI-01); transmitir exige decidir destino y contrato |
| Cita de valoración (`ValuationRequest`) y micrositios PRP | F | Destinos CRM heredados bloqueados (B-01, KI-02, KI-03) |
| Consentimientos, autorización comercial y evidencia de aceptación | F | B-02, B-03, B-04 |
| Documentos legales sin generar y datos corporativos | F | B-05 y B-06 |
| Perfiles de redes sociales y logo con fondo transparente | F | Datos que debe entregar el titular |
| Videos de «¿Cómo financiamos?», «Servicios» y casa de recuperación | E | Eran contenido de Planmed; no se inventa contenido de Crediestética |
| Campo de video de YouTube en el editor de páginas (`videoUrl`) | E | Se retiró con los videos; reponer solo si Crediestética tiene videos propios |
| Textos de marketing de `/testimonios` y `/antes-y-despues` | E | Sustituidos por textos neutros; contenían cifras de Planmed |
| Contenido estático del programa de referidos y `TestimonialsSocial` | E | Retirados; aviso hasta que Hub entregue contenido |
| Enlace «Iniciar sesión» en la barra superior (Planmed lo tiene en el pie) | E | Decisión de la etapa D3; confirmar si se mantiene |
| Sin valor de arranque de la tasa (Planmed sembraba 2,0000 %) | E | No se inventan datos financieros |

Reutilización: las clases C y D se resuelven **sin código nuevo ni abstracciones**: ajustes de configuración, nombres y comentarios, un mensaje en dos listas y la sincronización de una función del menú. La clase B solo exige cargar datos. La clase F exige decisiones o datos externos.

## Diferencias solo de identidad

Marca, colores y tipografías en 63 archivos de `pages/` y `components/`; fuentes en `error.vue` y `app.vue` (Libre Bodoni y Questrial); `assets/css/theme.css` y `tailwind.css`; textos de `shared/utils/aboutContent.ts` y `contact.ts`; `public/robots.txt`; logos de `public/images/branding/`; texto alternativo de la imagen de inicio; títulos y descripciones SEO.

## Diferencias de configuración

- `nuxt.config.ts`: `wellezyCompanySlug` en `legalmed`; roles de administración, tasa y contenido vacíos (Planmed: `19`); variables de entorno sin prefijo de marca; `localDomain` y URL del sitio.
- `server/utils/wellezy.ts`: `tenantLine()` impide peticiones con la línea vacía.
- `server/utils/auth.ts`: la pertenencia a empresa y línea se compara con la configuración, no con un nombre de marca.
- `server/utils/financingRate.ts`: sin siembra de tasa y con vía de arranque para `is_global_admin`.
- `.env.example` y `.gitignore`.

## Pendientes reales de implementación (clases C y D)

Cuatro tareas pequeñas, todas dentro del repositorio de Crediestética (tareas 1 a 4 de la lista).

## Bloqueadas por datos o dependencias externas (clases B y F)

Contenido en Hub (procedimientos, noticias, recomendaciones, testimonios, referidos); carga de Nosotros, Clínicas y tasa desde el panel; destinos CRM (B-01); evidencia y autorización (B-02, B-03, B-04); documentos legales (B-05); datos corporativos (B-06); dominio real; perfiles de redes y logo transparente.

## Lista priorizada

Criterio: cerrar funcionalidades completas sin depender de contenido nuevo en Hub; no se repriorizan los problemas heredados.

| # | Tarea | Estado actual | Diferencia con Planmed | Archivos probables | Dependencias | Riesgos | Complejidad | Resultado esperado | Solo Crediestética |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Estados vacíos en Noticias y Clínicas aliadas, y arnés de `hub-readonly` | Páginas con solo el encabezado; 1 prueba falla por el arnés | Igual en Planmed (defecto heredado) | `pages/noticias/index.vue`, `components/site/ClinicsList.vue`, `tests/recommendations/harness.ts` y pruebas | Ninguna | Distinguir lista vacía de error (ya resuelto en otras secciones) | Baja | Todos los módulos públicos comunican su ausencia de contenido | Sí |
| 2 | Sincronizar la recuperación del menú con Planmed (`recoverTopics`) | Lógica anterior con reintento en servidor | Planmed la reemplazó | `components/layout/Navbar.vue` y prueba del menú | Ninguna | Cambia el comportamiento con Hub lento o caído: verificarlo | Baja | Menú con la recuperación vigente de Planmed | Sí |
| 3 | Cierre de identidad residual | Nombre de paquete, README, comentarios y carpetas heredadas | Conserva Planmed | `package.json`, `README.md`, comentarios en unos 20 archivos | No borrar `.output-uat-portable/` ni `.data/planmed-content/` sin autorización | Renombrar el paquete puede afectar `package-lock.json` | Baja | Sin referencias a Planmed salvo pruebas de bloqueo y documentación | Sí |
| 4 | Dominio real y roles del panel | Provisionales o vacíos | Planmed tenía los suyos | `nuxt.config.ts`, `public/robots.txt`, `.env.example` | **Datos del titular**: dominio y rol que edita la tasa | Un dominio equivocado afecta SEO y canónicos | Baja | Configuración de producción definida | Sí; requiere datos |
| 5 | Cargar contenido en Hub y panel (Nosotros, Clínicas, tasa) y repetir D5.0 | Sin datos | n/a | Ninguno (tarea operativa) | Quien administra Hub y el contenido | n/a | n/a | Módulos de clase B pasan a A | n/a |
| 6 | Decidir y habilitar el envío real de `LeadForm`, `ValuationRequest` y PRP | Simulado o bloqueado | Planmed: simulado o con CRM propio | `providers/*`, `server/utils/valuation.ts`, `shared/utils/crmDestination.ts` | B-01 a B-04 y autorización | Alto: toca datos de clientes | Alta | Embudo comercial operativo | Sí, pero no depende solo del código |

## Primera funcionalidad recomendada

**Tarea 1: estados vacíos en Noticias y Clínicas aliadas, más el arnés de `hub-readonly`.** Cierra por completo la funcionalidad «todo módulo público comunica su ausencia de contenido» (hoy lo hacen 6 de 8), no depende de datos ni de Hub, solo toca Crediestética y reutiliza el patrón de mensaje que ya existe en procedimientos, recomendaciones y testimonios.

Archivos a modificar: `pages/noticias/index.vue`, `components/site/ClinicsList.vue`, `tests/recommendations/harness.ts` y las pruebas correspondientes. Sin cambios de API, servidor ni Hub.

---

# D5.4 — Identidad residual y recursos públicos (2026-11-10)

- **KI-15:** resuelto en D5.3 (ver `KNOWN_ISSUES.md`).
- **KI-16:** resuelto en parte (ver `KNOWN_ISSUES.md`): nombre del paquete, README raíz y comentarios.
- **`/recursos`:** de «Próximamente» a cuatro documentos descargables, con «Descargar» (descarga directa de Drive) y «Abrir» (visor). Los enlaces están en un registro propio (`PUBLIC_RESOURCE_DOCUMENTS`, en `shared/utils/legalDocuments.ts`), **separado** de `LEGAL_DOCUMENTS`: el modal, los formularios y la página de política de datos siguen usando los enlaces de D4.4 y D4.5, sin cambios.
- **Diferencia a decidir:** los cuatro enlaces de `/recursos` no coinciden con los de `LEGAL_DOCUMENTS` (política de datos, aviso de privacidad y autorización combinada tienen otro archivo de Drive en el registro de formularios). Decidir si los formularios deben apuntar a los archivos de `/recursos` queda pendiente de autorización.
- **Nombre del 4.º documento:** se publica como «Formato de Reclamación de Tratamiento de Datos Personales» por indicación del responsable; el archivo de Drive (ID `17HFP_…`) se titula «02. Aviso de privacidad y autorización expresa para el tratamiento de datos personales». Confirmar que el enlace es el correcto. Por la misma razón no se asignó a `reclamaciones` en `LEGAL_DOCUMENTS` (B-05 sigue como estaba).

---

# D5.5 — KI-17: dominio, tenant y roles (2026-11-10)

- **Tenant verificado** en la copia local de PD (solo lectura): Legalmed `company_id = 16`, Crediestética `linea_id = 4`, slug `crediestetica`. El código sigue resolviendo por slug y por `X-Tenant-Linea`; los ids son solo referencia documental.
- **Dominio:** `crediestetica.com` es el dominio primario activo de la línea 4 en `linea_domains` y coincide con `site.url`. Se conserva separado de la API de Hub y de `localDomain`.
- **Roles:** sin cambios de configuración. 19 «Diseñador gráfico» y 20 «Administrador de contenido de línea» existen en la copia, pero ningún usuario de la línea los tiene; falta decidir qué rol adicional edita la tasa. Detalle en KI-17.
- **Documento de reclamaciones:** el responsable confirmó que el enlace `17HFP_Djmj9UFIC51BW_UCLWUexoMsC_g` es el documento de reclamaciones. Queda registrado en `LEGAL_DOCUMENTS.reclamaciones` (D5.5) y es el mismo archivo que publica `/recursos`. Esto **sustituye** la nota de D5.4 que lo dejaba sin asignar. Efecto: la página de política de datos pasa a enlazarlo en lugar de «(documento en actualización)». El texto legal que dice que el canal de reclamaciones «está pendiente» no se modificó.
- Siguen pendientes (`url: null`): pagaré, autorización a centrales de riesgo y documento oficial de advertencias.

---

# D6 — Catálogo y contenido real desde Hub (2026-11-10)

Lecturas contra el Hub local (`127.0.0.1:8000`, copia local de PD, no producción) con `X-Tenant-Linea: crediestetica`. Sin escrituras y sin cambios de código en D6.

| Módulo | Estado real en Hub | Frontend |
|---|---|---|
| Procedimientos | 1 procedimiento publicado de la línea (Mamoplastia, categoría Corporal) con imagen; galería vacía | Funciona: lista, detalle, filtro, estados vacío y error |
| Categorías | `categorias-cirugias` devuelve «Corporal» (1 cirugía) | La etiqueta se deriva del slug («Corporal»); coincide hoy, ver KI-19 |
| Recomendaciones | Menú y temas vacíos | Estados vacíos correctos; contrato verificado con `hub-readonly` |
| Nuestros Pacientes | `patient-section` vacía (videos, Instagram, antes/después, referidos sin contenido) | Muestra estados vacíos |
| Noticias | Vacía (sigue deshabilitada) | Estado vacío de D5.2 conservado |
| Nosotros y clínicas | Contenido local (`.data/crediestetica-content/`) inexistente; no vive en Hub | Estados vacíos; no se migró nada |
| Administración | Requiere permisos `cirugias.*`, `cirugia_secciones.*`, `pacientes_web.*`, `recomendaciones.*` | Pantallas presentes; no verificadas con login real (ver B-07) |

Los 85 procedimientos maestros **no** se habilitaron; no hay procedimientos habilitados para la línea salvo el existente.

---

# D6.1 — Fallos de pruebas (2026-11-10)

Los 13 fallos de KI-20 eran expectativas desactualizadas o demasiado rígidas; la funcionalidad (página de error con layout público, formulario de referidos que envía, estados de error distintos de vacío, rutas admin de noticias y secciones) no cambió. Suite: 730 pasan, 0 fallan, 16 omitidas.

---

# D7.1 — Administración de procedimientos y categorías (2026-11-10)

**Paridad con Planmed (comparación archivo por archivo, sin CRLF):** páginas `admin/procedimientos` (listado y formulario), `SectionsManager`, 9 rutas Nitro (`procedures` y `procedure-sections`), proveedores, `ProcedureService` y `types/procedure.ts` son **idénticos** salvo identidad (colores, textos «Crediestética», comentarios). No faltaba ninguna pantalla ni ruta.

**Funcionalidades presentes (contra contrato de Hub `cms/*`):** listar con búsqueda y filtros, ver detalle, crear, editar (nombre, slug, categoría, descripción, qué es, ficha técnica, perfil del paciente, SEO), imagen principal y galería, orientación de portada, visible/destacado, habilitar maestros en la línea, secciones de contenido (listar, crear, editar, ordenar, imagen, publicar, eliminar). Permisos: `cirugias.*` y `cirugia_secciones.*` los valida Hub en cada operación (403 se propaga al panel).

**Cambios de D7.1 (solo lectura de Hub):**
- Nueva ruta `GET /api/public/procedure-categories` (lee `categorias-cirugias`; nombre, slug y cantidad de la línea).
- Formulario admin: el campo «Categoría (Slug)» ofrece las categorías reales de Hub (datalist) y su ejemplo pasó de `cirugia-corporal` (slug inexistente heredado) a `corporal`. Sigue siendo texto: Hub valida que el slug exista y esté activo.
- Catálogo público: la etiqueta del filtro usa el nombre real de la categoría (cierra KI-19), con respaldo en el slug.

**No disponible por contrato:** crear, editar, ordenar u ocultar categorías (Hub no tiene endpoints CMS de categorías; ver B-08). Mamoplastia sigue asociada a «Corporal».

---

# D7.4 — Validación visual y funcional con datos de prueba (2026-11-10)

Frontend local (`nuxt dev`) contra el Hub local (`wellezy_pd_copy`), datos de D7.3 (procedimientos 189 a 192, secciones 39 a 49). Sin escrituras en esta etapa.

**Sitio público (navegador integrado, desktop 1366 y móvil 375): correcto.**
- `/procedimientos`: 4 tarjetas (Mamoplastia real y las 3 de prueba activas), categoría «Corporal», sin referencias a Planmed, sin desbordamiento horizontal. Blefaroplastia (inactiva) no aparece; su URL da 404 con la página de error del sitio.
- Detalles de Mamoplastia de aumento, Abdominoplastia y Liposucción: secciones visibles en el orden definido (Mamoplastia: Qué es, Cómo es el proceso, Recuperación); la sección oculta no se publica.
- Observaciones: (1) sin imagen, el detalle muestra el marcador «IMAGEN EN PRODUCCIÓN» y las tarjetas «Sin imagen»; (2) el destacado no tiene distintivo visible en el listado público, solo prioridad de orden (la destacada va primera); (3) las secciones sin imagen se muestran como tarjetas de texto, por lo que `media_left` y `media_right` no se distinguen hasta cargar imágenes; (4) el modal precontractual se acepta una vez por navegador (localStorage de pruebas).

**Administración: no verificada con sesión real.** El panel redirige a `/admin/login` sin sesión (acceso protegido correcto). No había una sesión ya autenticada y no se solicitan contraseñas. Pendiente que la titular pruebe listado, formularios, secciones e imágenes con su propia sesión (B-09). Los comportamientos de permisos y errores están cubiertos solo con Hub simulado.

**Flujo de imágenes (inspección de código, no ejecutado):** el formulario acepta PNG, JPEG y WebP; rechaza archivos de más de 10 MB; redimensiona a 1600 px y recomprime a JPEG (queda bajo el límite de 5 MB de Hub); vista previa antes de guardar; hasta 10 imágenes de galería (igual que Hub); los errores se muestran como notificación; Nitro responde 422 con mensaje si el archivo no es válido. Falta para probarlo: una sesión autorizada y un archivo de prueba.

---

# D7.5 — Noticias provisionales (2026-11-10)

**Corrección de estado:** Noticias **no está deshabilitada**. No existe ningún flag: menú, `/noticias`, detalle y administración están activos. Hasta D7.5 solo estaba **vacía** (las etapas anteriores usaron «deshabilitada» como sinónimo de «sin contenido»). Hub sirve las noticias de la línea 4 con `Post::cms()->forContext(16, 4)->publiclyVisible()`.

**Contenido PROVISIONAL (solo demostración, local):** 4 noticias cargadas en `wellezy_pd_copy` (empresa 16, línea 4), ids 278 a 281, `source = provisional-crediestetica`, `external_id = provisional-crediestetica-01..04`, slugs `provisional-…`, autor «Crediestética», sin imágenes. Cada una termina con la nota visible «Contenido provisional de demostración. Será reemplazado por las noticias oficiales de Crediestética».

| Id | Título | Origen de la idea (Planmed) |
|---|---|---|
| 278 | ¿Cómo funciona la financiación de un procedimiento estético? | noticia 268 |
| 279 | ¿Cómo saber si eres candidata para financiar tu procedimiento? | noticia 270 |
| 280 | Antes de financiar: qué conviene revisar | noticia 268 |
| 281 | ¿Un procedimiento es un gasto o una inversión? | noticia 267 |

Se conservó solo lo genérico respaldado por las fuentes (dividir el pago en el tiempo, evaluar capacidad de pago, revisar condiciones, cada caso se evalúa de forma personalizada, esperar tiene costo). Se eliminaron marca, porcentajes de financiación, plazos, requisitos de elegibilidad, proceso virtual, historias, cirujanos y palabras clave SEO. Dos frases de cautela son redacción propia (condiciones según el análisis de cada caso; no se puede asegurar de antemano el resultado de una solicitud).

**Validación:** API pública real del Hub: 5 noticias para `crediestetica` (la existente id 277 «Noticia de prueba», creada desde el panel, más las 4); ninguna menciona Planmed; con el tenant `planmed` no aparece ninguna provisional. Navegador: `/noticias` y detalles correctos en desktop (1366) y móvil (375), sin desbordamiento. Huellas de las noticias de Planmed, legadas y la id 277: sin cambios. `hub-readonly` y estados vacíos: pasan.

**Antes de producción:** estas noticias deben **sustituirse por las noticias reales** de Crediestética y retirarse (no se hizo limpieza). Para retirarlas: filtrar por `source = provisional-crediestetica` (decisión y autorización aparte).

---

# D7.7 — Recomendaciones: contenido provisional y validación visual (2026-11-10)

Frontend local contra el Hub local (`wellezy_pd_copy`). La línea 4 no tenía ninguna recomendación; se cargó contenido **provisional de demostración** (3 temas, 4 subtemas, 11 secciones, 5 recomendaciones; temas 4 a 6, subtemas 52 a 55).

**Cómo funciona el módulo (verificado en código del Hub):** Tema principal → Subtema → Sección → Recomendación. Los grupos `general`, `cuidados` y `revision` son una columna del subtema (los usan los endpoints de procedimientos), no temas. La visibilidad es jerárquica (tema publicado → subtema publicado → sección visible → recomendación publicada). Lectura pública: `v1/web/recommendation-topics*`; administración: `cms/recommendation-*`.

**Contenido de Planmed no trasladado:** cuidados postquirúrgicos por procedimiento, indicaciones prequirúrgicas y de preanestesia (requieren validación médica e institucional), bloques de financiación y contacto de Planmed, imágenes (procedencia sin verificar). Solo se reutilizó la estructura.

**Sitio público (desktop 1366 y móvil 375): correcto.**
- Menú y páginas de tema y subtema con los 3 temas, en su orden; sin referencias a Planmed; sin desbordamiento horizontal.
- La sección oculta no se muestra; el subtema en borrador responde 404; el tema de Planmed responde 404 en Crediestética.
- Se muestran recomendaciones individuales (lista de elementos) y listas en el contenido de la sección (formato de Planmed).
- No se probaron imágenes ni videos (ningún dato los incluye).

**API y aislamiento:** `recommendation-topics` con `X-Tenant-Linea: crediestetica` devuelve solo los 3 temas demo; con `planmed` devuelve solo sus 3 temas, sin ningún registro demo. Conteos de Planmed (3/22/51) y de enlaces cortos (27) sin cambios.

**Administración: no verificada con sesión real.** `/admin/recomendaciones/temas` redirige a `/admin/login` sin sesión (B-09).

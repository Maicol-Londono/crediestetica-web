# Inventario funcional actual

D9.0 · 2026-11-10. Estado por módulo, con el nivel de validación de la escala definida en `ESTADO_ACTUAL_MIGRACION.md` (Implementada / Probada con mocks / Lectura real / Escritura real). Lo que no se ha validado se dice expresamente.

| Módulo | Rutas | Qué hace hoy | Validación |
|---|---|---|---|
| **Home** | `/` | Hero con imagen y ejemplo de plan, bloque «No necesitas tenerlo todo hoy» (cifras de ejemplo fijas, con nota de tasa referencial), propuesta de valor, procedimientos destacados (4, desde el Hub), «Cómo funciona» y clínicas aliadas (solo si hay clínicas activas). El texto del titular y las cifras del ejemplo son contenido heredado de la base de Planmed que Crediestética aún debe confirmar. | Lectura real del Hub (procedimientos). Presentación visual medida en D9. |
| **Navegación** | Navbar, footer, `layouts/default.vue` | Menú Procedimientos (desplegable desde el Hub), Noticias, CONÓCENOS (8 entradas), Nuestros pacientes y Recomendaciones (desde el Hub), Simular financiación e Iniciar sesión. Menú móvil con `<details>`. | Pruebas estáticas (`tests/navigation`); lectura real. |
| **Catálogo** | `/procedimientos` | Lista desde el Hub, búsqueda por texto, filtro por categoría (aparece con 2 o más), error 503 con reintento, estado vacío. | Mocks + lectura real (4 procedimientos de prueba en la copia local). |
| **Categorías** | `/api/public/procedure-categories` | **Solo lectura** del endpoint público del Hub. Sin CRUD CMS. El panel sugiere las categorías reales y el Hub valida el slug. | Mocks + lectura real (una categoría: `corporal`). |
| **Detalle de procedimientos** | `/procedimientos/[slug]` | Imagen, «¿Qué es?», condiciones compatibles, galería en carrusel, secciones y bloques de la línea, CTA al simulador, 404 y 503. Nombre real de la categoría. | Mocks + lectura real. |
| **Noticias** | `/noticias`, `/noticias/[slug]`, panel | Lectura pública y administración desde el Hub (secciones, borradores). En el Hub, eliminar una noticia solo la despublica. | Mocks; escrituras reales en D7.5/D8.1-B2; lectura real. |
| **Recomendaciones** | `/recomendaciones/**`, panel | Jerarquía tema → subtema → sección, publicación y administración desde el Hub. | Mocks; escrituras reales en D7.7/D8.1-B2; lectura real. |
| **Nuestros Pacientes** | `/testimonios/**`, panel | Videos de YouTube, publicaciones de Instagram, antes y después y referidos desde el Hub. Sin casos de antes y después en la copia local; hay 2 reels de Instagram de la línea 4 sin autorización de uso verificada. | Mocks + lectura real. |
| **Nosotros** | `/nosotros`, `/admin/nosotros` | Contenido gestionado en el panel y guardado en archivo local. Sin contenido cargado muestra un mensaje de «aún no disponible». | Pruebas; almacenamiento local, sin contenido real. |
| **Clínicas aliadas** | `/clinicas-aliadas`, panel | Clínicas, imágenes y documentos gestionados en el panel y guardados en archivo local; campo «visible» y contacto opcional. Vacío por defecto. | Pruebas; almacenamiento local, sin contenido real. |
| **Simulador** | `/financiacion#calculadora` | Cuota fija amortizada (`shared/utils/financing.ts`), plazos 12–72 meses, monto $1M–$100M (paso $500.000). La tasa viene del panel (`financing-rate.json`); **sin tasa configurada muestra «Simulación no disponible»**. No hay ciudad de operación. | Pruebas unitarias de la fórmula y mocks. Sin tasa real configurada. |
| **Recursos y documentos** | `/recursos`, páginas legales | Documentos legales centralizados (`shared/utils/legalDocuments.ts`): tres oficiales enlazados y cinco pendientes. | Pruebas estáticas. |
| **Autenticación** | `/admin/login`, `/api/auth/*` | Inicio de sesión contra el Hub, cookie de sesión en el servidor, cambio de contraseña, control de origen. | Mocks; lectura real de `/auth/me` en etapas anteriores. |
| **Administración** | `/admin/**` | Procedimientos y secciones, noticias, recomendaciones, pacientes, Nosotros, clínicas, configuración (usuarios de línea y tasa), páginas, micrositios. Los permisos los decide el Hub; el panel no los modifica. | Mocks; escrituras reales parciales (ver arriba). Rol del personal sin verificar con login real (B-07). |
| **SEO** | `app.vue`, `useSeoMeta` por página, `shared/utils/financingSeo.ts`, `robots.txt` | Títulos y descripciones por página, regla de título obligatorio. | Pruebas estáticas. |
| **Formularios** | Modales de solicitud, valoración y referidos | Presentes pero **con destinos CRM heredados o simulados**. Los micrositios PRP están deshabilitados por ese motivo. El formulario de solicitud conserva ciudades de Planmed. | **No validados.** Fuera del alcance de D9. |
| **Consentimientos** | Modal precontractual, casillas | Persistencia solo en `localStorage`; sin evidencia de aceptación en el Hub. | **Pendiente** (KI-06, KI-07, B-02 a B-04). |
| **CRM** | `shared/utils/crmDestination.ts` | Se bloquea el envío si el destino es el CRM heredado de Planmed o no está configurado. No hay CRM propio verificado. | **Bloqueado** (B-01). |

## Notas

- «Probada con mocks» no es «validada». Las lecturas contra el Hub local usan datos de prueba provisionales (procedimientos, noticias y recomendaciones de demostración).
- Las rutas y los contratos no cambiaron en D9: la etapa fue solo visual.

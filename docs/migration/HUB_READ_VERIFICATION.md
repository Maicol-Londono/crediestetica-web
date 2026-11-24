# Verificación de lecturas públicas desde Hub (D5.0)

> **Documento histórico (D5.0, 2026-11-09).** Verificación contra una copia local, sin datos; no demuestra datos publicados en ningún entorno. Referencia vigente de la integración con el Hub: [docs/integrations/wellezy-hub/](../integrations/wellezy-hub/README.md) (ver §5 de `08-matriz-de-integracion.md`).

Fecha: 2026-11-09. Etapa de solo lectura: no se modificó código, datos, configuración ni el Hub.

## Resumen

La línea `crediestetica` de la empresa `legalmed` **resuelve en Hub** (HTTP 200 con `X-Tenant-Linea: crediestetica`) pero **no tiene contenido publicado** en la base usada: todas las lecturas devuelven listas vacías. Por eso ningún módulo pudo verificarse con datos reales: se comprobaron el contrato, la cabecera de tenancy, los estados vacíos y los estados de error. Un módulo sin datos no es un error de integración.

Tres de los ocho módulos pedidos (Nosotros, Clínicas y Tasa de financiación) **no leen de Hub**: usan archivos JSON locales. Se verificaron igualmente, pero no cuentan como lecturas de Hub.

## Entorno utilizado

| Elemento | Valor |
|---|---|
| Hub | Instancia local `http://127.0.0.1:8000` (`php artisan serve`, iniciada para la verificación y detenida al terminar) |
| Base del Hub | `APP_ENV=local`; `DB_DATABASE=wellezy_pd_copy` en `127.0.0.1` (una copia, no producción) |
| Crediestética | `nuxt dev` en el puerto 3997, también detenido |
| Configuración de Crediestética (`.env`) | `NUXT_WELLEZY_API_BASE_URL=http://localhost:8000/api`, `NUXT_WELLEZY_COMPANY_SLUG=legalmed`, `NUXT_WELLEZY_LINE_SLUG=crediestetica` |
| Variable `NUXT_CONTENT_DIR` | No definida: el contenido local se busca en `.data/crediestetica-content/` |

Las pruebas `hub-readonly` estaban omitidas porque exigen `NUXT_WELLEZY_API_BASE_URL` y un Hub que responda; sin ellas definidas se omiten por completo. Se ejecutaron con `NUXT_WELLEZY_API_BASE_URL=http://127.0.0.1:8000/api` y `NUXT_WELLEZY_LINE_SLUG=crediestetica`.

## Tenancy y aislamiento

- Todas las lecturas públicas pasan por `wellezyPublicGet` (`server/utils/wellezy.ts`), que envía `X-Tenant-Linea` con el valor de `wellezyLineSlug` configurado en el servidor, nunca del navegador. Con la línea vacía no se hace ninguna petición.
- `X-Tenant-Domain` no aparece en el código de `server/`, `shared/`, `services/`, `providers/`, `composables/`, `components/`, `pages/` ni `layouts/`.
- Con el header `crediestetica`, Hub responde 200 en todas las rutas probadas. Sin header, o con un slug inexistente, responde 404 `Tenant Linea not found or inactive`.
- Con el Hub caído, cada ruta pública de Crediestética responde 503 con `reason: hub_unavailable`. Con el tenant sin resolver, el código la clasifica como `tenant` (no se probó cambiando la configuración, porque está prohibido).
- No se consultó ninguna otra línea. No se hicieron escrituras: todas las llamadas a Hub fueron GET.
- Ninguna página ni respuesta de las rutas públicas contiene la palabra «Planmed» (12 páginas y 7 APIs revisadas).
- El Hub no cambió: `git status` del repositorio de Hub es idéntico antes y después. No se revisó su carpeta `storage/`, donde un servidor en ejecución puede escribir registros.

## Rutas de Hub que llama Crediestética

| Ruta | Quién la llama |
|---|---|
| `/v1/web/posts?per_page=50` y `/v1/web/posts/{slug}` | `server/api/public/news/*` |
| `/v1/web/cirugias?page=N` (hasta 20 páginas) y `/v1/web/cirugias/{slug}` | `server/api/public/procedures/*` |
| `/v1/web/recommendation-pages` y `/{slug}` | `server/api/public/recommendations/*` |
| `/v1/web/recommendation-topics` y subtemas | `server/api/public/recommendation-topics/*` |
| `/v1/web/patient-section` | `server/api/public/patient-section.get.ts` |
| `/v1/web/prp/{slug}` | `server/api/public/prp/[slug].get.ts`; **no se llegó a consultar**: se responde 404 antes por el destino CRM heredado (KI-03) |

## Matriz de resultados

| Módulo | Endpoint | Servicio consumidor | Header | HTTP | Estructura | Registros | Estado |
|---|---|---|---|---|---|---|---|
| Noticias | Hub `GET /v1/web/posts` | `server/api/public/news/index.get.ts`, páginas `/noticias` | `X-Tenant-Linea: crediestetica` | 200 | `{data:[], links, meta:{total:0,...}}` | 0 | Sin datos disponibles |
| Procedimientos | Hub `GET /v1/web/cirugias` | `server/api/public/procedures/*`, `/procedimientos` | igual | 200 | `{data:[], links, meta:{total:0,...}}` | 0 | Sin datos disponibles |
| Recomendaciones | Hub `recommendation-pages` y `recommendation-topics` | `server/api/public/recommendations/*` y `recommendation-topics/*` | igual | 200 | `{data:[]}` | 0 | Sin datos disponibles |
| Testimonios | Hub `GET /v1/web/patient-section` | `server/api/public/patient-section.get.ts` | igual | 200 | `data:{visibility, videos:[], instagram:[], before_after:[], referral}` | 0 videos, 0 casos, 0 publicaciones | Sin datos disponibles |
| Nosotros | **Local**: `about.json` | `server/api/public/about/index.get.ts` | no aplica | 200 | Contenido inicial vacío validado | no aplica | Sin datos disponibles (no es Hub) |
| Clínicas aliadas | **Local**: `clinics.json` | `server/api/public/clinics/index.get.ts` | no aplica | 200 | `{clinics:[], updatedAt:''}` | 0 | Sin datos disponibles (no es Hub) |
| Tasa de financiación | **Local**: `financing-rate.json` | `server/api/public/financing-rate.get.ts` | no aplica | 503 `rate_not_configured` | `{message, code}` | 0 (sin tasa) | Sin datos disponibles (no es Hub) |
| Programa de referidos | Hub `patient-section` → `referral` | `/testimonios/programa-de-referidos` | igual | 200 | `referral:{title:'Programa de referidos', content:''}` | contenido vacío | Sin datos disponibles |

Estados de error probados para los módulos de Hub (Hub detenido): las cinco rutas responden 503 con `hub_unavailable`. El estado «Verificado» exige datos reales, que no hay.

## Resultado en la interfaz (navegador integrado)

| Página | Con Hub arriba y sin datos | Con Hub caído |
|---|---|---|
| `/noticias` | Encabezado y nada más (sin mensaje de lista vacía; igual en Planmed) | «Esta sección no está disponible por ahora… No significa que no haya contenido» con botón REINTENTAR; página con HTTP 503 |
| `/procedimientos` | «0 procedimientos» | Mismo aviso con REINTENTAR |
| `/recomendaciones/cuidados` | «Pronto publicaremos estas recomendaciones.» | No probada |
| `/testimonios` | «Pronto compartiremos aquí los videos de nuestros pacientes.» | Aviso con REINTENTAR |
| `/testimonios/antes-y-despues` | «Pronto compartiremos aquí los resultados de nuestros pacientes.» | No probada |
| `/testimonios/programa-de-referidos` | «Pronto compartiremos aquí la información del programa de referidos.» (formulario oculto) | No probada |
| `/nosotros` | «La información de esta sección aún no está disponible.» | no aplica |
| `/clinicas-aliadas` | Encabezado y nada más | no aplica |
| `/financiacion` | Simulador: «SIMULACIÓN NO DISPONIBLE · La simulación no está disponible en este momento» | no aplica |
| `/noticias/no-existe` | Página 404 con HTTP 404 | — |

Los errores nunca se presentan como contenido vacío exitoso: con el Hub caído se muestra el aviso con reintento, no «sin noticias». No se muestran datos de Planmed y no hay tasa de respaldo.

## Pruebas

| Ejecución | Resultado |
|---|---|
| `hub-readonly` contra el Hub local | 10 pruebas: 9 pasan y 1 falla |
| La que falla | «la lista de procedimientos trae la fuente efectiva por tipo…»: `ReferenceError: withOrientation is not defined`. Es un defecto del arnés de pruebas (`tests/recommendations/harness.ts` no registra `withOrientation` como auto-import); la aplicación real responde bien (`/api/public/procedures` devuelve 200 y `[]`). Ver KI-10 |
| Suite completa sin variables de Hub | 719 pruebas: 690 pasan, 14 fallan (los mismos preexistentes) y 15 se omiten |

Las 9 pruebas que pasan cubren: menú de recomendaciones, detalle inexistente (404), sin tenant o con tenant inexistente (404), API administrativa sin token (401), cuerpo público sin identificadores de empresa o línea, y todo el árbol de temas y subtemas.

## Qué no se pudo verificar

- Presentación de **datos reales** en noticias, procedimientos, recomendaciones, testimonios y referidos: la línea no tiene contenido en la copia de Hub usada. No se crearon datos de prueba.
- Paginación de más de una página, detalles de noticias y procedimientos, recomendaciones por procedimiento (`cirugias/{slug}/recomendaciones/{tipo}`) e imágenes remotas.
- El envío del formulario de referidos (`POST`), por ser una escritura.
- Micrositios PRP: bloqueados por KI-03.
- Un Hub de producción u otro entorno distinto de esta copia local.
- Las pruebas `error-pages` (5): requieren `PLANMED_SITE_URL` y no se ejecutaron.

## Observaciones

- **503 transitorio.** En una primera carga en el navegador, `/testimonios/antes-y-despues` se sirvió una vez con HTTP 503 aunque mostraba el estado vacío. No se reprodujo en cuatro intentos posteriores. Hipótesis no confirmada: el límite de peticiones de Hub (`throttle:60,1`), porque cada página consulta Hub varias veces (por ejemplo, el menú pide `recommendation-topics` y `cirugias`) y esa sesión hizo más de 60 llamadas en un minuto. Ver KI-13.
- **Contenido local pendiente.** `Nosotros`, `Clínicas` y la tasa dependen de `.data/crediestetica-content/`, que no existe. Su carga se hace desde el panel por una persona autorizada; no es una tarea de código.
- **Carpeta heredada.** Existe `.data/planmed-content/`, con archivos de Planmed (entre ellos un `financing-rate.json`; su contenido no se abrió). El código no la lee. Ver KI-11.

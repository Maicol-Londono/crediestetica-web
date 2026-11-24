# 08 · Matriz de integración Hub ↔ Crediestética

Etiquetas: **I** IMPLEMENTADO · **P** PROBADO (pruebas que ejercitan la ruta; las del Hub no se ejecutaron aquí) · **C** CONSUMIDO · DESPLEGADO es `NO VERIFICADO` en todas las filas (sin evidencia de entorno). Referencias del contrato: Hub `docs/api/crediestetica/`.

## 1. Matriz

| Funcionalidad | Endpoint Hub (`/api`) | Implementación Hub | Consumidor Crediestética | Estado |
|---|---|---|---|---|
| Lista de procedimientos | `GET /v1/web/cirugias` | `CatalogoController::cirugias` | `server/utils/procedures.ts` → `HubPublicProcedureProvider` | I · P · C (Hub P en `ProcedureCmsTest` etc.; web P: `tests/procedures`) |
| Detalle de procedimiento | `GET /v1/web/cirugias/{slug}` | `CatalogoController::cirugiaShow` | `server/api/public/procedures/[slug].get.ts` | I · P · C (**mapper descarta ~12 campos**, ver §3) |
| Categorías | `GET /v1/web/categorias-cirugias` | `CatalogoController::categorias` | `server/api/public/procedure-categories.get.ts` | I · **sin prueba localizada en Hub** · C (web: solo nombres; filtra en cliente) |
| Recomendaciones de un procedimiento | `GET /v1/web/cirugias/{slug}/recomendaciones/{tipo}` | `CatalogoController::cirugiaRecomendaciones` | — | I · sin prueba localizada · **no consumido** |
| Noticias | `GET /v1/web/posts` | `Api\Web\PostController::index` | `news-page.get.ts`, `news/index.get.ts` | I · P · C |
| Noticia | `GET /v1/web/posts/{slug}` | `PostController::show` | `news/[slug].get.ts` | I · P · C |
| Recomendaciones (páginas) | `GET /v1/web/recommendation-pages[/{slug}]` | `RecommendationPageController` | `recommendations/index.get.ts`, `[slug].get.ts` | I · P · C |
| Recomendación individual | `GET /v1/web/recommendation-pages/{slug}/items/{itemSlug}` | `RecommendationPageController::item` | — | I · sin prueba localizada · **no consumido** |
| Árbol de recomendaciones | `GET /v1/web/recommendation-topics` y `/{topic}/{subtopic}` | `RecommendationTopicController` | `recommendation-topics/*` | I · P · C |
| Tema suelto | `GET /v1/web/recommendation-topics/{topic}` | `RecommendationTopicController::show` | — | I · sin prueba localizada · **no consumido** |
| Nuestros pacientes | `GET /v1/web/patient-section` | `PatientSectionController::show` | `patient-section.get.ts` | I · P · C |
| Micrositio PRP | `GET /v1/web/prp/{slug}` | `PublicPrpController::show` | `prp/[slug].get.ts`, `prpReferrer.ts` | I · P · C |
| Inscripción PRP | `POST /v1/web/prp-enrollments` | `Api\Web\PrpEnrollmentController::store` | `server/utils/prpEnrollment.ts` | I · P (49) · C · **envío al CRM BLOQUEADO** (`NullPrpCrmGateway`) |
| Login del panel | `POST /auth/login` | `AuthController::login` | `wellezyLogin` | I · P · C · login real `NO VERIFICADO` |
| Sesión del panel | `GET /auth/me`, `POST /auth/logout` | `AuthController` | `wellezyMe`, `wellezyLogout` | I · P · C |
| Cambio de contraseña | `POST /auth/password/change` | `PasswordController::change` | `server/utils/passwordChange.ts` | I · P · C |
| Administración (procedimientos, noticias, pacientes web, recomendaciones, colaboradores, PRP) | `/cms/*`, `/prp-referrers*` | `Api\Cms\*`, `PrpReferrerController` | `server/utils/*` (panel `/admin`) | I · P (`tests/Feature/Api/Cms`) · C · **escrituras reales contra Hub no probadas** (`docs/migration/INTEGRATION_BLOCKERS.md` B-07…B-09) |
| Checkout de valoración | `POST /integrations/v1/valoraciones/checkout` | `IntegrationValoracionController::checkout` | `server/utils/valuationPayment.ts` | I (parte sin confirmar) · P · C · Wompi real `NO VERIFICADO` |
| Confirmación de pago | `POST /integrations/v1/payments/{uuid}/refresh` | `IntegrationValoracionController::refresh` | `valuationPayment.ts` | I · P · C |
| Webhook Wompi | `POST /webhooks/wompi/{token}` | `WompiWebhookController` | — (lo llama Wompi) | I · P · sin webhook real |
| Post-aprobación (correo + CRM) | proceso interno | `RunValoracionPostApproval`, `CrmClientRegistrar` | — | I **sin confirmar** · P · contrato CRM **BLOQUEADO** |
| Valoraciones de asesores | `/valoraciones*` | `Api\Payments\*` | — | I · P · **no consumido** |
| Pacientes CRMEDIC | — (sin ruta) | `PatientService`, `CrmedicClient` | — | I (parte sin confirmar) · P (unitaria) · **no hay API** |
| Solicitud «Pide tu cita» | — (no usa Hub) | — | `/api/forms/valuation` → CRM externo/correo | CRM **BLOQUEADO**; correo I |

## 2. APIs disponibles que Crediestética no usa

`/v1/web/cirugias/{slug}/recomendaciones/{tipo}` · `/v1/web/recommendation-pages/{slug}/items/{itemSlug}` · `/v1/web/recommendation-topics/{topic}` · el filtro `?categoria=` de `/v1/web/cirugias` · `/valoraciones*` (asesores) · `/v1/leads` y `/v1/web-events` (captación web, **no auditadas**: `NO VERIFICADO`) · `GET /api/procedures` y `/api/posts` heredados (sin `linea.tenant`).

## 3. Diferencias entre el contrato y el consumo real

| Tema | Hub entrega | La web hace | Observación |
|---|---|---|---|
| Procedimiento: campos del detalle | `ficha_tecnica.hospitalizacion`, `visibilidad_resultados`, `adicionales_basicos`, `tecnicas`, `adicionales_complementarios`, `complicaciones`, `candidatos_ideales`, `candidatos_no_ideales`, `restricciones_medicas`, `clinicas_asociadas`, `galeria_antes_despues`, `tiene_datos_paciente`, `categoria.nombre` | No los mapea (`fromPublicDetail`) | Posible pérdida de contenido publicado en el CMS; decidir si la web debe mostrarlos |
| Clínicas aliadas | `clinicas_asociadas` (Hub) | Usa `clinics.json` **local** | Dos fuentes distintas con el mismo nombre de concepto |
| Nombres de campos | Español (`nombre`, `descripcion_corta`…) | Inglés (`name`, `shortDescription`…) | Traducción en el BFF; una app que lea la web recibe el modelo traducido |
| `author_name` | `null` para `crediestetica` (sin confirmar) | Acepta cadena o ausente | Compatible |
| Recomendaciones: `vinculada` | Presente | No se mapea | Sin efecto conocido |
| `PUT/POST` del CMS | Contratos de escritura | Probados con Hub simulado | Sin escritura real contra Hub |
| Tenant | `X-Tenant-Linea` o `X-Tenant-Domain` | Solo slug | Conforme |
| `external_code` PRP | Público en `GET /prp/{slug}` | Lo usa solo en el servidor y lo oculta al navegador | **Hallazgo del Hub**: el código es accesible sin autenticación (Hub `docs/api/crediestetica/06-prp-y-referidos.md` §1) |
| Límite 60/min de lecturas | Por IP | Todo el tráfico sale de la IP del servidor Nuxt, sin caché | Riesgo operativo `NO VERIFICADO` |

## 4. Endpoints heredados de Planmed/Cliniplanes y dependencias de configuración

- Rutas heredadas sin tenant: `GET /api/procedures`, `/api/posts` (no usadas).
- Heredado y bloqueado/retirado en la web: destino de CRM de Planmed (`pdtclientsolutions.com`) — bloqueado por `shared/utils/crmDestination.ts` (`tests/security/crm-destination.test.ts`); ids de CRM 73/16 sin valor por defecto; `PrpLeadForm`/`crmPrpFormUrl` (flujo anterior de PRP) sin uso en el micrositio.
- Dependen de configuración que no está en el repositorio: `NUXT_WELLEZY_API_BASE_URL`, `NUXT_HUB_INTEGRATION_KEY_ID/_SECRET`, `NUXT_SESSION_PASSWORD`, `NUXT_CRM_VALUATION_*`, SMTP; en el Hub: cuenta Wompi activa por línea, tarifa de valoración, `linea_domains` para `return_url`, `VALORACION_POST_APPROVAL_*`, `CRM_CLIENT_*`, worker y scheduler.

## 5. Documentación obsoleta o que contradice el código

| Documento | Afirmación | Realidad |
|---|---|---|
| Hub `docs/modules/pagos/03-api-y-autenticacion.md` (cabecera y §5.1) | No existe la superficie HMAC; cuerpo con campos y rutas (`GET /valoraciones/{uuid}`, `payment-links`, `expiration_time`) | Existen `routes/integrations-api.php` y `VerifyIntegrationSignature`; el cuerpo real es `patient{name,email,phone,document?}` + `return_url`; solo hay checkout y refresh |
| Hub `docs/crediestetica/valoraciones-pagos/12` | Rama `feat/integracion-pacientes-crm-medico` | La rama actual es `main` |
| `docs/migration/INTEGRATION_BLOCKERS.md` B-04 y `KNOWN_ISSUES.md` KI-08 | No se pudo comprobar el endpoint de aceptación del contrato PRP | Existe `/v1/web/prp-enrollments` (`da78eb6`) y guarda `contract_accepted_at` |
| `docs/migration/KNOWN_ISSUES.md` KI-03, `FUNCTIONAL_PARITY.md`, `HUB_READ_VERIFICATION.md` (PRP) | Micrositios PRP bloqueados por el destino del CRM | `/api/public/prp/[slug]` ya no depende del CRM; el micrositio usa `ReferralForm` → Hub |
| `docs/migration/INFORME_AVANCE_FUNCIONAL.md`, `FUNCTIONAL_PARITY.md` | Solicitud de valoración «bloqueada (503)» | Sin CRM, el correo es el canal (503 solo sin CRM ni SMTP) |
| `docs/migration/*` | No describen el pago de valoración con Wompi (`98154df`, posterior) | Ver [06](06-valoraciones-y-pagos.md) |
| `docs/mobile-integration/NEW_API_INTEGRATIONS.md` §3.7 y §6 (de este repositorio) | «Sin contrato para obtener `external_code`, la app no puede inscribir» | **Incorrecto**: `GET /v1/web/prp/{slug}` lo devuelve públicamente. Corregido en ese documento |

## 6. Riesgos y decisiones pendientes

1. **Orden de despliegue:** Hub (migraciones, worker, scheduler, variables) antes que esta web; si no, nadie notifica el pago aprobado.
2. **Confirmar en git** el trabajo local de ambos repositorios antes de documentarlo como vigente.
3. **Contrato del CRM** (alta tras el pago y envío de PRP): sin él, no hay integración CRM real.
4. **`external_code` público** en el Hub: decidir si debe protegerse.
5. **Campos del Hub no mostrados** por la web (§3): decidir.
6. **Validación real:** Wompi Sandbox/producción con webhook público, SMTP real y `tests/integration/hub-readonly.test.ts` contra un Hub real.

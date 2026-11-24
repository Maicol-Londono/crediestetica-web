# 08 · Pendientes y validaciones

Clasificación: `VERIFICADO` · `PARCIAL` · `PENDIENTE` · `BLOQUEADO` · `NO VERIFICADO`.

## 1. Funcionalidades

| # | Elemento | Estado | Evidencia / nota |
|---|---|---|---|
| F-01 | Lecturas públicas de Hub con `X-Tenant-Linea` (procedimientos, categorías, noticias, recomendaciones, pacientes, PRP) | VERIFICADO (contrato) | Hub `routes/api.php`; `docs/migration/HUB_READ_VERIFICATION.md` (contra copia local, sin datos) |
| F-02 | Datos reales publicados para la línea en el entorno de la app | NO VERIFICADO | La copia auditada devolvía listas vacías; D-15 |
| F-03 | Login de personal en Hub (`/auth/login`) | VERIFICADO (código) | `AuthController`; pruebas de la web `tests/security/panel-access.test.ts` |
| F-04 | Login con credenciales reales de Crediestética | NO VERIFICADO | Sin credenciales en la auditoría (B-07, B-09) |
| F-05 | Login/cuenta de paciente | PENDIENTE | No existe contrato verificado |
| F-06 | Refresh de token | PENDIENTE (no existe) | Solo login/me/logout/password.change |
| F-07 | Recuperación de contraseña por API | PENDIENTE (no existe para este login) | |
| F-08 | Solicitud de valoración al CRM propio | BLOQUEADO | `NUXT_CRM_VALUATION_*` sin definir (B-01) |
| F-09 | Solicitud de valoración por correo (canal principal si el CRM no está configurado) | PARCIAL | Requiere SMTP; los destinatarios son temporales según historial (`539e7a4`) |
| F-10 | Checkout de pago de valoración (web → Hub HMAC) | VERIFICADO (código y pruebas con dobles) | `tests/security/valuation-payment.test.ts` (95/95 con otros 3 archivos, ejecutadas 2026-11-24); Hub `IntegrationValoracionCheckoutTest` (no re-ejecutado). Parte del contrato (`patient.document`, observación de correo) **sin confirmar en git** |
| F-11 | Pago contra Wompi real (Sandbox/producción) de extremo a extremo | NO VERIFICADO | Solo dobles de prueba y un pago Sandbox local (webhook vs refresco sin confirmar) |
| F-12 | Webhook Wompi: checksum, consulta con llave privada | VERIFICADO (código) | `WompiWebhookController`, `WompiWebhookVerifier`; sin webhook real probado |
| F-13 | Post-aprobación (correo a Convenios, PDF, alta CRM, observación de email) | EN DESARROLLO — PARCIAL | Archivos del Hub sin confirmar en git; requiere migraciones, worker (cola `bmq-issuance` para el evento) y scheduler |
| F-14 | **Contrato móvil de pago (iniciar y consultar)** | PENDIENTE | [NEW_API_INTEGRATIONS §6](NEW_API_INTEGRATIONS.md#6-decisiones-pendientes-y-capacidades-por-exponer) |
| F-20 | Orden de despliegue Hub → web (la web del árbol de trabajo ya no notifica el pago aprobado) | PENDIENTE | Riesgo del [§1 de NEW_API_INTEGRATIONS](NEW_API_INTEGRATIONS.md#1-estado-del-código-qué-está-confirmado-en-git) |
| F-21 | Contrato del CRM del alta tras el pago (`CRM_CLIENT_URL`) | BLOQUEADO | Criterio de éxito provisional (`CrmClientRegistrar::confirmed`) |
| F-22 | Inscripción PRP en Hub | VERIFICADO (código, 49 pruebas del Hub no re-ejecutadas) | Envío al CRM: `NullPrpCrmGateway` (no envía) → estado `received` |
| F-23 | Lectura de pacientes CRMEDIC (`PatientService`) | EN DESARROLLO (interno, sin endpoint) | Sin rutas HTTP; `PatientService` sin confirmar en git |
| F-24 | ¿«CRM Médico» del alta y CRMEDIC son el mismo sistema? | NO VERIFICADO | — |
| F-15 | Tasa de financiación para móvil | PENDIENTE | Solo local en Nuxt |
| F-16 | Nosotros / clínicas / páginas para móvil | PENDIENTE | Solo local en Nuxt; vacíos |
| F-17 | Inscripción PRP desde móvil | PENDIENTE (decisión de producto) | El Hub entrega `external_code` públicamente en `GET /v1/web/prp/{slug}`; la web lo resuelve en el servidor |
| F-18 | Formularios de crédito/lead/referidos para móvil | PENDIENTE | Solo correo desde Nuxt |
| F-19 | Staging/UAT de Hub para pruebas móviles | NO VERIFICADO | Sin URL en el repo |

## 2. Dependencias externas

Hub (disponibilidad, línea activa, procedimientos habilitados, cuenta Wompi activa por línea, tarifa de valoración, `api_integrations`), Wompi (cuentas, webhook configurado), CRM médico, SMTP, `LineaDomain` activos para `return_url`, permisos/roles de personal (roles 19/20 y asignaciones: B-07).

## 3. Contratos no confirmados

- Respuestas de `recommendation-pages/{slug}/items/{itemSlug}` y `cirugias/{slug}/recomendaciones/{tipo}` (no consumidos por la web).
- Cuerpo de éxito de `POST /auth/password/change`.
- `config/cors.php` del Hub fuera de `api/auth/*`.
- `expiration_time` en el checkout (el doc de pagos del Hub lo menciona; el código de `StartValoracionCheckout` devuelve 6 campos: no existe hoy).
- Respuesta del endpoint de asesores `POST /api/valoraciones` y resto de `/api/valoraciones*` (no auditado en detalle; ver Hub `docs/modules/pagos/03`, pendiente de verificación contra código).
- Formato de las URLs de medios (dominio, caducidad).
- Valor de `forma_pago = contado` aceptado por el CRM.

## 4. Divergencias detectadas entre documentos y código

| Tema | Documento | Código |
|---|---|---|
| Superficie HMAC | Hub `docs/modules/pagos/03-api-y-autenticacion.md` (cabecera) dice que **no existe** | Existe: `routes/integrations-api.php`, `VerifyIntegrationSignature`, `IntegrationValoracionController` (con cambios sin confirmar) |
| Origen del repo web | `README.md`: Planmed | Hub doc de pagos: `cliniplanes-web` |
| Contenido de `05-valoraciones-y-pagos.md` (esta carpeta, versión previa) | Duplicaba y en parte contradecía el estado del post-pago | Fusionado y corregido en `NEW_API_INTEGRATIONS.md`; archivo retirado |

El resto de contradicciones (Hub `docs/modules/pagos/03`, Hub `docs/crediestetica/.../12`, web `docs/migration` B-04/KI-03/KI-08/FUNCTIONAL_PARITY) está en [NEW_API_INTEGRATIONS §8](NEW_API_INTEGRATIONS.md#8-documentación-anterior-que-quedó-obsoleta-o-contradice-el-código).

No se corrigió ninguno: se reportan. El repositorio móvil no se auditó, por lo que no hay divergencias registradas sobre él.

## 5. Pruebas a ejecutar

Repo web (`npm test` = `node --test "tests/**/*.test.ts"`; `npm run typecheck`):
- `tests/security/valuation-payment.test.ts`, `valuation.test.ts`, `crm-destination.test.ts`, `panel-access.test.ts`, `password-change.test.ts`, `routes.test.ts`.
- `tests/financing/valuation-pay.test.ts`, `quote.test.ts`.
- `tests/procedures/*`, `tests/news/*`, `tests/recommendations/*`, `tests/patients/*`.
- `tests/integration/hub-readonly.test.ts` (requiere `NUXT_WELLEZY_API_BASE_URL` y un Hub levantado; sin ellas se omite; el informe D5.0 reportó 9 de 10 pasando, 1 fallo: ver el informe).

Hub: `tests/Feature/Payments/IntegrationValoracionCheckoutTest.php` y las pruebas de `v1/web`.

Manuales con el móvil (checklist): 1) `GET categorias-cirugias` y `cirugias` con y sin header de tenant; 2) línea vacía vs fallo; 3) login de personal 200/401/403/429; 4) vencimiento del token; 5) navegación de páginas hasta `last_page`; 6) cuando exista contrato, checkout idempotente y `retry_window_active`.

## 6. Riesgos de integración

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Suponer que `/api` de la web es API móvil | Fallos 403 por origen | Usar Hub o definir contrato |
| Secretos HMAC/Wompi en la app | Fuga de credenciales | Backend propio o contrato público en Hub |
| Mostrar vacío cuando hay fallo | UX engañosa | Distinguir 200 `[]` de errores |
| Línea sin procedimientos habilitados | App vacía | Habilitar en Hub antes de probar |
| Token de 8 h sin refresh | Cierres de sesión inesperados | Reautenticar |
| Cambios de Hub/web sin confirmar | Contratos que cambian | Revalidar tras integrar; fijar versión |
| Mensaje genérico de pago | Diagnóstico difícil | Lista del Hub (NEW_API_INTEGRATIONS §3.5) |
| Límites 60/min y de login | 429 | Caché y backoff |

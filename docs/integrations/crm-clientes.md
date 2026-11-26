# Crediestética → CRM Médico: creación de clientes desde «Pide tu cita de valoración»

Replica el mecanismo de Planmed (referencia: `planmed-web`, commit `3478639`, y su documento `docs/integrations/crm-medico-clientes.md`). El CRM es un sistema externo: nada de lo que ocurre dentro de él está verificado.

## Flujo

1. `POST /api/forms/valuation` (navegador → servidor propio): origen, límite por IP, validación y control de duplicados.
2. `GET …/crm-public/forms/{id_user}/{id_line}`: cookies de sesión y campo oculto `_token`.
3. Un único `POST multipart/form-data` a `…/crm-public/api/clients/forms` con `Accept: application/json`, `Cookie`, `X-Requested-With`, `Origin` y `Referer`. Sin redirecciones, 15 s por solicitud, sin reintentos.
4. Éxito solo con un 2xx cuyo `mensagge` empiece por «los datos fueron registrados satisfactoriamente».
5. Después, y solo entonces, correo complementario (`NUXT_VALUATION_TO` / `CC`) en segundo plano.

No hay credenciales de integración: la autenticación es la sesión y el token del formulario público.

## Campos, en orden

`_token`, `_method=post`, `nombres`, `apellidos`, `identificacion`, `fecha_nacimiento`, `direccion` (ciudad), `telefono` (solo dígitos), `email`, `name_surgery`, `forma_pago` (`Contado` / `Financiacion`), `state=No Contactada`, `origen=Formulario Web`, `id_user`, `id_line`, `id_user_asesora`, `accept=1`.

**El identificador 30 viaja en `id_line`.** Es la línea de Crediestética en el CRM; no es el `linea_id` ni el `company_id` del Hub. `origen` sigue siendo el texto `Formulario Web`.

## Configuración (solo servidor)

| Variable | Obligatoria | Valor |
|---|---|---|
| `NUXT_CRM_FORM_URL` | Sí | `https://pdtclientsolutions.com/crm-public/api/clients/forms`. Vacía en local y pruebas |
| `NUXT_CRM_FORM_USER_ID` | Sí | `73` (acordado el 2026-11-26; el mismo de Planmed) |
| `NUXT_CRM_FORM_ADVISOR_ID` | Sí | `73` (acordado el 2026-11-26; el mismo de Planmed) |
| `NUXT_CRM_FORM_LINE_ID` | No | `30` (valor por defecto); no definirla vacía |

**Por confirmar con el administrador del CRM:** que el usuario `73` pueda registrar solicitudes en la línea `30` y que la asesora `73` sea quien deba recibirlas. No se puede comprobar desde el código: el CRM es externo y la combinación `73/30` no se ha probado contra él.

`NUXT_CRM_VALUATION_*` ya no se leen. Sin configuración completa la ruta responde `503 not_configured`: no hay CRM ni correo.

## Despliegue

`npm run check:deploy` termina con error si falta `NUXT_CRM_FORM_URL`, `NUXT_CRM_FORM_USER_ID` o `NUXT_CRM_FORM_ADVISOR_ID`, si el destino no es el de producción o si la línea no es `30`. `scripts/start-production.mjs` hace la misma comprobación y no levanta el servidor. La protección solo actúa si PM2 ejecuta ese script: `node .output/server/index.mjs` la omite.

## Resultados y duplicados

| Caso | Respuesta | Reenvío bloqueado |
|---|---|---|
| Confirmado | 200 `{ok:true}` | 2 min |
| Sesión no disponible | 503 `crm_session` (no se envían datos) | No |
| 422 del CRM | 422 `crm_validation` | No |
| Otros 4xx | 502 `crm_error` | No |
| 5xx | 502 `crm_error` | 24 h |
| 2xx sin confirmación, redirección | 502, incierto | 24 h |
| Tiempo agotado o conexión cortada | 504 / 503, incierto | 24 h |
| Sin conexión demostrable | 503 `network` | No |

La huella es cédula + teléfono, en memoria: se pierde al reiniciar y exige una sola instancia. No se sabe qué hace el CRM ante un cliente repetido.

## Límites conocidos

- Un segundo registro de la misma persona entre 2 minutos y 24 horas se envía al CRM pero no genera otro correo.
- La cirugía no se valida en servidor contra la lista del Hub.
- Un reinicio pierde correos pendientes de reintento.

## Pruebas

```powershell
node --test tests/security/valuation.test.ts tests/security/crm-client-log.test.ts tests/security/crm-destination.test.ts
```

CRM y SMTP simulados. Ninguna prueba usa el CRM real; la aceptación en producción requiere una prueba real autorizada.

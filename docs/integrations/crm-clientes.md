# Crediestética → CRM Médico: creación de clientes desde los formularios públicos

Formularios: «Pide tu cita de valoración», «Estudio de créditos» y «Solicitud de financiación». Replica el mecanismo de Planmed (referencia: `planmed-web`, commit `3478639`, y su documento `docs/integrations/crm-medico-clientes.md`). El CRM es un sistema externo: nada de lo que ocurre dentro de él está verificado.

## Flujo de la valoración

1. `POST /api/forms/valuation` (navegador → servidor propio): origen, límite por IP, validación y control de duplicados.
2. `GET …/crm-public/forms/{id_user}/{id_line}`: cookies de sesión y campo oculto `_token`.
3. Un único `POST multipart/form-data` a `…/crm-public/api/clients/forms` con `Accept: application/json`, `Cookie`, `X-Requested-With`, `Origin` y `Referer`. Sin redirecciones, 15 s por solicitud, sin reintentos.
4. Éxito solo con un 2xx cuyo `mensagge` empiece por «los datos fueron registrados satisfactoriamente».
5. Después, y solo entonces, correo complementario (`NUXT_VALUATION_TO` / `CC`) en segundo plano.

No hay credenciales de integración: la autenticación es la sesión y el token del formulario público.

## Flujo de «Estudio de créditos» y «Solicitud de financiación»

Rutas `POST /api/forms/credit-study` y `POST /api/forms/lead` (`server/utils/crmRegistration.ts`).

1. Origen, configuración de correo, límite por IP y validación (incluida la autorización de datos).
2. **Correo primero**, con el contenido, destinatarios, asunto y adjuntos de siempre. Si el SMTP no lo acepta, no se llama al CRM.
3. Registro en el CRM con el mismo cliente de la valoración (pasos 2 a 4 anteriores). Traza con la etiqueta `[credit-study]` o `[lead-form]`.
4. Éxito para la persona **solo si** el correo salió **y** el CRM confirmó. Si el CRM falla, el equipo ya tiene el correo y la persona ve un error.

Al reenviar el mismo contenido tras un rechazo, falta de sesión o falta de conexión, el correo no se repite (ventana de 10 min) y se intenta de nuevo el CRM. Tras un resultado incierto o un 5xx no se vuelve a llamar al CRM en 24 h. Tras confirmar, ese formulario no vuelve a registrar a la misma persona en 10 min. Guardas por formulario y por cédula + teléfono (sin cédula, además el nombre), en memoria.

| Campo CRM | Estudio de créditos | Solicitud de financiación |
|---|---|---|
| `nombres` | Primer + segundo nombre | «Nombres» |
| `apellidos` | Primer + segundo apellido | «Apellidos» |
| `identificacion` | N.º de documento, sin puntos, comas ni espacios | «Número documento» (opcional), igual |
| `fecha_nacimiento` | Fecha de nacimiento | Fecha de nacimiento (opcional) |
| `direccion` | «Barrio / ciudad» de residencia | «Ciudad residencia»; si no se informa, vacío (la «Ciudad» del formulario no la sustituye) |
| `telefono` | «Celular», solo dígitos | «Teléfono Celular», solo dígitos |
| `email` | E-mail | Correo (opcional) |
| `name_surgery` | Procedimientos marcados, separados por coma (puede ir vacío) | «Procedimiento de Interés» |
| `forma_pago` | `Financiacion` | `Financiacion` |
| `accept` | `1`: casilla de política de datos | `1`: casilla de política de datos |

El resto de campos (`_token`, `_method`, `state`, `origen`, identificadores, `city` y `clinic`) es igual al de la valoración. **Lo que no se informa viaja vacío; nunca se rellena.** No se envían al CRM los demás datos de estos formularios (financieros, referencias, cónyuge, archivos): llegan solo por correo.

Cambios en los formularios (2026-11-26): «Estudio de créditos» incorpora la casilla obligatoria de política de datos (mismo texto que la valoración) y «Solicitud de financiación» separa «Nombre completo» en «Nombres» y «Apellidos» (`first_name`, `last_name`, ambos obligatorios). El correo sigue mostrando «Nombre completo».

El resto de campos es opcional para el CRM. Conviene que legal confirme que la casilla de política de datos basta para un estudio de crédito.

## Campos, en orden

`_token`, `_method=post`, `nombres`, `apellidos`, `name`, `identificacion`, `fecha_nacimiento`, `direccion` (ciudad, texto), `city`, `clinic`, `telefono` (solo dígitos), `phone`, `email`, `name_surgery`, `forma_pago` (`Contado` / `Financiacion`), `state=No Contactada`, `origen=Formulario Web`, `id_user`, `id_line`, `id_user_asesora`, `advisor_email`, `accept=1`.

**Obligatorios del CRM para guardar un cliente** (confirmados por el programador líder, 2026-11-26): `name` (nombres y apellidos), `phone` (mismos dígitos que `telefono`, sin añadir ni quitar indicativo), `id_line` y `advisor_email`. Se envían **además** de los campos del formulario público, en el mismo multipart. Los tres primeros nombres y el correo vienen del envío JSON anterior (`/api/chat/create/client`): **no está verificado** que `clients/forms` los lea.

`advisor_email` no se deduce del ID: es configuración (`convenioscrediestetica@gmail.com`, indicado por el responsable para la asesora `403031`).

**Sede fija, en los tres formularios:** `city=3` (Medellín) y `clinic=6` (Clínica Especialista del Poblado). Son identificadores: en el multipart viajan como los textos `3` y `6`, nunca como nombres. No hay selectores y no sustituyen a `direccion`, que sigue llevando el texto de cada formulario. Los nombres de campo y los ID se tomaron de los datos aportados por el responsable (un registro existente del CRM); **no está verificado** que el formulario público `clients/forms` los reciba con esos nombres, los guarde o los exija.

**El identificador 30 viaja en `id_line`.** Es la línea de Crediestética en el CRM; no es el `linea_id` ni el `company_id` del Hub. `origen` sigue siendo el texto `Formulario Web`.

## Configuración (solo servidor)

| Variable | Obligatoria | Valor |
|---|---|---|
| `NUXT_CRM_FORM_URL` | Sí | `https://pdtclientsolutions.com/crm-public/api/clients/forms`. Vacía en local y pruebas |
| `NUXT_CRM_FORM_USER_ID` | Sí | `403031` |
| `NUXT_CRM_FORM_ADVISOR_ID` | Sí | `403031` |
| `NUXT_CRM_FORM_LINE_ID` | No | `30` (valor por defecto); no definirla vacía |
| `NUXT_CRM_FORM_ADVISOR_EMAIL` | No | `convenioscrediestetica@gmail.com` (valor por defecto); no definirla vacía |
| `NUXT_CRM_FORM_CITY_ID` | No | `3` (valor por defecto); no definirla vacía |
| `NUXT_CRM_FORM_CLINIC_ID` | No | `6` (valor por defecto); no definirla vacía |

La asignación es **fija**: los tres formularios usan los mismos identificadores; no hay rotación ni reparto entre asesoras. Sustituye a `73`/`73`, que respondió HTTP 500 en las pruebas del 2026-11-26. El CRM es externo: la combinación vigente no se puede comprobar desde el código.

`NUXT_CRM_VALUATION_*` ya no se leen. Sin configuración completa la valoración responde `503 not_configured` (no hay CRM ni correo); estudio de créditos y financiación envían el correo y responden `503 not_configured`.

## Despliegue

`npm run check:deploy` termina con error si falta `NUXT_CRM_FORM_URL`, `NUXT_CRM_FORM_USER_ID` o `NUXT_CRM_FORM_ADVISOR_ID`, si el destino no es el de producción o si la línea, la ciudad o la clínica se definen con un valor distinto de `30`, `3` y `6`. `scripts/start-production.mjs` hace la misma comprobación y no levanta el servidor. La protección solo actúa si PM2 ejecuta ese script: `node .output/server/index.mjs` la omite.

## Resultados y duplicados de la valoración

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
node --test tests/security/valuation.test.ts tests/security/crm-forms.test.ts tests/security/crm-client-log.test.ts tests/security/crm-destination.test.ts
```

CRM y SMTP simulados. Ninguna prueba usa el CRM real; la aceptación en producción requiere una prueba real autorizada.

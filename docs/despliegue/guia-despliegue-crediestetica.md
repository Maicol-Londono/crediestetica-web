# Guía de despliegue de Crediestética

Documento de trabajo para el despliegue. No describe el estado de producción: ningún valor de este documento se ha comprobado en el servidor.

## 1. Variables de entorno

Plantilla sin secretos: `.env.production.example`. Nitro lee estas variables del entorno del proceso al arrancar; cambiarlas exige reiniciar el proceso.

| Variable | ¿Obligatoria? | Por defecto en el código | Descripción | Valor requerido |
|---|---|---|---|---|
| `NUXT_WELLEZY_API_BASE_URL` | Sí | vacío (sin valor, el login y las lecturas públicas fallan) | URL de la API de Wellezy Hub | La de producción. **Pendiente de confirmar.** |
| `NUXT_WELLEZY_COMPANY_SLUG` | Sí | `legalmed` | Empresa del tenant (por slug) | `legalmed` (referencia verificada en la copia local del Hub; confirmar en producción) |
| `NUXT_WELLEZY_LINE_SLUG` | Sí | `crediestetica` | Línea del tenant; se envía al Hub como `X-Tenant-Linea` | `crediestetica` (igual: confirmar) |
| `NUXT_SESSION_PASSWORD` | Sí | vacío | Cifra la cookie `crediestetica-admin` y deriva la clave de idempotencia de inscripciones | Secreto nuevo, de al menos 32 caracteres aleatorios |
| `NUXT_PUBLIC_SITE_URL` | Sí | `https://crediestetica.com` (`site.url`) | Canonical, sitemap y Open Graph | `https://crediestetica.com` |
| `NUXT_CONTENT_DIR` | Sí | `<cwd>/.data/crediestetica-content` | Contenido local: Nosotros, Clínicas, páginas, orientación de imágenes y `financing-rate.json` | Ruta persistente fuera de `.output/`, con lectura y escritura. Sugerida: `/var/lib/crediestetica/content`. **Confirmar.** |
| `NUXT_CRM_VALUATION_URL` | Sí, para el formulario «Pide tu cita» | CRM heredado de Planmed (**bloqueado**) | Destino del CRM al que el servidor envía las valoraciones | El CRM **propio** de Crediestética. **Pendiente.** Sin él el formulario responde 503 y no envía nada. |
| `NUXT_CRM_VALUATION_USER_ID` | Sí, para la valoración | vacío (sin respaldo) | `id_user` que recibe el CRM | Entero positivo que confirma el **responsable del CRM**. **Pendiente.** |
| `NUXT_CRM_VALUATION_LINE_ID` | Sí, para la valoración | vacío (sin respaldo) | `id_line` que recibe el CRM | Entero positivo que confirma el responsable del CRM. **Pendiente.** |
| `NUXT_CRM_VALUATION_ADVISOR_ID` | Sí, para la valoración | vacío (sin respaldo) | `id_user_asesora` que recibe el CRM | Entero positivo que confirma el responsable del CRM. **Pendiente.** |
| `NUXT_CRM_VALUATION_STATE` | Sí, para la valoración | vacío (sin respaldo) | `state` inicial del registro en el CRM (texto, hasta 100 caracteres) | Lo confirma el responsable del CRM. **Pendiente.** |
| `NUXT_CRM_VALUATION_ORIGIN` | Sí, para la valoración | vacío (sin respaldo) | `origen` del registro en el CRM (texto, hasta 100 caracteres) | Lo confirma el responsable del CRM. **Pendiente.** |
| `NUXT_RATE_EDITOR_ROLE_IDS` | No | vacío | Roles adicionales que editan la tasa | **Vacía** |
| `NUXT_CONTENT_EDITOR_ROLE_IDS` | No | vacío | Roles adicionales que editan el contenido local | Vacía |
| `NUXT_ADMIN_ROLE_IDS` | No | vacío | No interviene en el acceso al panel | Vacía |
| `NUXT_TRUSTED_PROXY_HOPS` | No | `0` | Proxies de confianza para resolver la IP del cliente | `0`; `1` solo tras confirmar un único proxy |
| `NUXT_PUBLIC_CRM_PRP_FORM_URL` | No (PRP desactivado) | CRM de PRP compartido | Destino del formulario PRP | No definir mientras PRP siga desactivado |
| `NUXT_PUBLIC_APP_NAME`, `NUXT_PUBLIC_LOCAL_DOMAIN` | No | `Crediestética`, `crediestetica.com` | Valores informativos | No definir |
| `PORT` / `NITRO_PORT`, `HOST` / `NITRO_HOST` | Según el servidor | Nitro: 3000 | Puerto y dirección de escucha | Los que use el proxy |

**Valoración y CRM.** Los cinco valores `NUXT_CRM_VALUATION_*` (ids, estado y origen) sustituyen a los 73 y 16 que el clon heredó de Planmed y que ya no existen en el código. Son variables **solo del servidor** (no están en `runtimeConfig.public`) y no tienen valor por defecto. Si falta cualquiera, o no es válida, o el destino `NUXT_CRM_VALUATION_URL` está vacío o es el CRM de Planmed, `POST /api/forms/valuation` responde `503` con `reason: not_configured` **antes** de leer el cuerpo y de consumir el límite de intentos, y no sale ninguna petición al CRM. El formulario no debe habilitarse en producción hasta que el responsable del CRM confirme los valores (también `forma_pago=contado`, que el código marca como no confirmado).

**Variables de Planmed que ya no se usan** (retirarlas del servidor): `NUXT_PLANMED_ADMIN_ROLE_IDS`, `NUXT_PLANMED_CONTENT_EDITOR_ROLE_IDS`, `NUXT_PLANMED_CONTENT_DIR`, `NUXT_PLANMED_RATE_EDITOR_ROLE_IDS`. No hay alias: si el servidor conserva `NUXT_PLANMED_CONTENT_DIR`, el contenido parecerá haberse perdido porque ahora se lee de `NUXT_CONTENT_DIR`.

**Para comprobar en el servidor** (sin cambiarlo desde aquí):

1. Que `NUXT_CONTENT_DIR` apunte a la carpeta persistente prevista y que el usuario del proceso pueda escribir en ella.
2. Que los dos slugs coincidan con los de la empresa y la línea en el Hub de producción.
3. Que `NUXT_SESSION_PASSWORD` sea nuevo y tenga al menos 32 caracteres.
4. Que `NUXT_CRM_VALUATION_URL` sea el CRM propio y que los cinco `NUXT_CRM_VALUATION_*` estén confirmados por el responsable del CRM, o aceptar que el formulario de valoración permanezca bloqueado (503).
5. Que no queden variables `NUXT_PLANMED_*`.
6. Que `.env.example` y esta plantilla no contengan secretos.

Las sesiones abiertas antes del despliegue se cierran porque la cookie cambió de `planmed-admin` a `crediestetica-admin`.

## 2. Configuración inicial de la tasa de financiación (2 %)

Decisión del negocio: la tasa inicial de Crediestética es `2.0000` % mensual. El código **no** la crea ni la usa como respaldo: sin `financing-rate.json` la tasa está «no configurada» y `GET /api/public/financing-rate` responde `503` con `code: rate_not_configured`; el simulador muestra «no disponible».

Quién puede configurarla: el superadministrador global y el líder de área reconocidos por Wellezy Hub. Ningún otro rol, y `NUXT_RATE_EDITOR_ROLE_IDS` permanece vacía.

Pasos, después del despliegue y antes de abrir el simulador:

1. Confirmar que el simulador está cerrado: `GET /api/public/financing-rate` debe responder `503` con `rate_not_configured`.
2. Iniciar sesión en `/admin/login` con una cuenta de superadmin global o de líder de área.
3. Ir a **Configuración → Tasa de usura mensual**. Debe mostrar «Tasa no configurada».
4. Escribir `2.0000` (también se acepta `2`; se guarda como `2.0000`) y guardar. Confirmar el diálogo «¿Configurar la tasa de usura mensual?».
5. Verificar en el panel: tasa vigente `2.0000 % mensual`, con el nombre de quien la configuró y una entrada en el historial.
6. Verificar en público: `GET /api/public/financing-rate` responde `200` con `{ "rate": "2.0000", "updatedAt": "…" }`, sin el nombre del responsable.
7. Probar una cotización en `/financiacion#calculadora` y comprobar que usa el 2 %.
8. Comprobar que existe `financing-rate.json` dentro de `NUXT_CONTENT_DIR`.

Reglas de validación: punto decimal, máximo cuatro decimales, mayor que 0 y no superior a 5 %. Cada cambio posterior queda en el historial y exige la versión vigente (`expectedUpdatedAt`) para evitar ediciones simultáneas.

No se debe escribir `financing-rate.json` a mano en el servidor: así se omitiría la validación, el responsable y el historial.

## 3. Pendientes de negocio antes de abrir al público

- URL oficial de Messenger (el Footer no muestra el icono hasta tenerla).
- Documento de términos y condiciones (ver `docs/legal/terminos-y-condiciones-adaptacion.md`).
- Destino del CRM propio de Crediestética para la valoración.
- Configurar y verificar la tasa real.
- Ids, estado y origen del CRM para la valoración (`NUXT_CRM_VALUATION_USER_ID`, `_LINE_ID`, `_ADVISOR_ID`, `_STATE`, `_ORIGIN`) y valor de `forma_pago` para «Contado».
- Topología de red (ver la sección 5): número real de proxies, usuario de ejecución, puerto, ruta de contenido y política de copias.

## 4. Node, npm y dependencias

- **Node.js 24.12.0**, la versión usada y probada (`.nvmrc`). `package.json` declara `engines.node` como `>=24.11.0 <25`. **npm 11.6.2** es el entorno probado.
- **Instalar siempre con `npm ci`**: usa exactamente `package-lock.json`.
- **No ejecutar `npm install` ni `npm update` en producción**: podrían regenerar el lock y traer versiones que no se probaron.
- Los paquetes principales ya no usan `latest`: `nuxt` 4.4.7, `vue` 3.5.42, `vue-router` 5.1.0, `tailwindcss` y `@tailwindcss/vite` 4.3.0 (versiones exactas).

```bash
npm ci
npm run build
node .output/server/index.mjs
```

Las variables de entorno se leen al arrancar el proceso (el build no las incorpora): cambiarlas exige reiniciar.

## 5. Infraestructura (pendiente de confirmar)

Ninguno de estos puntos se ha comprobado en el servidor ni se asume una topología de red: son requisitos del código y propuestas a validar con infraestructura.

- **Una sola instancia de Node, en modo `fork`** (no cluster, no varias réplicas). Estos mecanismos viven en la memoria del proceso: la exclusión mutua de la tasa de financiación y de la orientación de imágenes, el límite de intentos de la valoración y de Referidos, y el bloqueo de envíos duplicados. Con varias instancias dejarían de proteger.
- **HTTPS obligatorio**: la cookie `crediestetica-admin` se emite con `Secure`.
- **Nginx como proxy inverso** (si esa es la topología confirmada): reenviar `Host`, `X-Forwarded-Host` y `X-Forwarded-Proto` con el dominio real (la comprobación de mismo origen los usa) y **sobrescribir** `X-Forwarded-For` con `$remote_addr` en lugar de concatenarlo.
- **`NUXT_TRUSTED_PROXY_HOPS`** debe reflejar la cadena real de proxies: `0` ignora `X-Forwarded-For` y usa la IP del socket (valor por defecto, seguro, pero detrás de un proxy todos comparten una sola IP); `1` solo con exactamente un proxy que sobrescribe la cabecera; `2` o más si hay otro delante (por ejemplo una CDN). **No está confirmado**; no asumir 1.
- **Node escuchando en `127.0.0.1`** o con el puerto protegido por firewall, para que nadie pueda saltarse el proxy y falsear la IP.
- **Directorio persistente** `NUXT_CONTENT_DIR` fuera de `.output/`, con lectura y escritura solo para el usuario del proceso.
- **Copias de seguridad** del directorio completo antes de cada despliegue y de forma periódica, con una prueba de restauración. Los `.prev` conservan una sola versión anterior: no sustituyen a una copia.
- Propuestas por confirmar: `client_max_body_size` de al menos 25 MB (las imágenes de 5 MB y las galerías de hasta 10 viajan en el cuerpo), `proxy_read_timeout` de al menos 60 s, y rotación de logs.

## 6. Vulnerabilidades de dependencias (`npm audit`)

Estado tras la actualización acotada: **siguen abiertos 28 avisos** (4 bajos, 11 moderados, 7 altos, 6 críticos), frente a 33 antes (5, 12, 10, 6). La auditoría **no está limpia**: solo se cerraron los avisos de los paquetes que se listan como «Resueltos»; el resto sigue pendiente, como se detalla abajo.

- **Resueltos** (los que llegan al servidor compilado): `vue` y `@vue/server-renderer` 3.5.35 → 3.5.42, `devalue` 5.8.1 → 5.9.4, `sanitize-html` 2.18.0 → 2.18.2 y `fast-xml-parser` 5.8.0 → 5.12.0. Cambiaron 23 paquetes del lock; ninguna versión mayor.
- **Servidor compilado:** ningún paquete con aviso abierto queda en `.output/server/node_modules`. Nuxt y Nitro van empaquetados dentro de los chunks, así que los avisos de `nuxt` siguen afectando a ese código; su exposición real se analiza abajo.
- **Pendiente `nuxt` 4.4.7:** los avisos de islas del servidor (ejecución remota, consumo de CPU y memoria, instanciación de componentes) no se pueden explotar: el proyecto no usa componentes `.server.vue` ni `NuxtIsland`. El aviso de la caché de payload (≤ 4.5.0) exige `cache`, `swr` o `isr` en rutas con datos por usuario: la única regla es `/blog/**` con `isr` y no existe esa página. Las reglas de ruta que se omiten con mayúsculas y minúsculas mezcladas (< 4.6.2) afectarían a la cabecera `noindex` del panel y a la redirección de `/simulador`; no se usa `appMiddleware` en las reglas de ruta. Los avisos de `vue` por atributos dinámicos exigen claves controladas por el usuario: el único `v-bind` de objeto usa la clave fija `to`.
- **Pendiente, herramientas de desarrollo y de compilación** (`@nuxt/devtools`, `simple-git`, `shell-quote`, `seroval`, `tar`, `vite`, `svgo`, `browserslist`, `node-forge`, `glob`, `minimatch` y similares): no están en el servidor compilado. No se instalan dependencias de desarrollo en producción ni se ejecuta el servidor de desarrollo; si el build se hace en el servidor, tratarlo como entorno de confianza.
- **Tarea pendiente (decisión de negocio): migrar a `nuxt` 4.5.2.** Se probó en una copia aislada: compila y pasa la suite (915 de 916 pruebas; la restante falló porque la copia excluyó la carpeta `archivo-legal-heredado/`; 17 omitidas). Pero obliga a regenerar `package-lock.json` completo (unos 690 paquetes) y cambia el empaquetador a Vite 8 y rolldown. Las versiones de Nuxt que cierran todos los avisos (≥ 4.6.3) exigen Node ≥ 24.15.0, incompatible con la versión probada (24.12.0). No se forzó el cambio ni se presenta como resuelto.

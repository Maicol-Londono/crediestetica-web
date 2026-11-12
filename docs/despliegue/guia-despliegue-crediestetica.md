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
| `NUXT_CRM_VALUATION_URL` | Sí, para el formulario «Pide tu cita» | vacío (el CRM de Planmed se retiró del código; si se define ese endpoint heredado, también se bloquea) | Destino del CRM al que el servidor envía las valoraciones | El CRM **propio** de Crediestética. **Pendiente.** Sin él el formulario responde 503 y no envía nada. |
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

## 4. Node, npm, build y arranque

Crediestética es una aplicación **Nuxt/Nitro con servidor**, no un sitio estático. **No usar `npm run generate` ni publicar archivos estáticos**: sin el servidor Nitro dejan de funcionar las APIs (`/api/**`), el panel, la sesión, el formulario de valoración, el middleware que redirige a minúsculas las rutas públicas (`server/middleware/canonical-path-case.ts`), el bloqueo de funcionalidades desactivadas y la cabecera `X-Robots-Tag` del panel.

- **Node.js 24.12.0**, la versión usada y probada (`.nvmrc`). `package.json` declara `engines.node` como `>=24.11.0 <25`. **npm 11.6.2** es el entorno probado.
- **Instalar siempre con `npm ci`**: usa exactamente `package-lock.json`.
- **No ejecutar `npm install` ni `npm update` en producción**: podrían regenerar el lock y traer versiones que no se probaron.
- Los paquetes principales ya no usan `latest`: `nuxt` 4.4.7, `vue` 3.5.42, `vue-router` 5.1.0, `tailwindcss` y `@tailwindcss/vite` 4.3.0 (versiones exactas).

```bash
npm ci
npm run build              # genera .output/ (servidor Nitro); no genera sitio estático
node .output/server/index.mjs
```

Las variables de entorno se leen al arrancar el proceso (el build no las incorpora): cambiarlas exige reiniciar. El build necesita las dependencias de desarrollo (`npm ci` las instala): si se compila en el servidor, ese entorno debe ser de confianza. Compilar en una máquina de build y desplegar `.output/` es preferible, pero **esa decisión es de infraestructura**.

## 5. Infraestructura

**Todo lo de esta sección son requisitos del código y propuestas para validar con infraestructura: nada se ha comprobado en el servidor ni se asume su topología.** Los datos entre `<…>` los completa el responsable del servidor; este documento no los inventa.

| Marcador | Qué es |
|---|---|
| `<RUTA_APP>` | Directorio de la versión desplegada de la aplicación (reemplazable en cada despliegue) |
| `<RUTA_CONTENIDO>` | Valor de `NUXT_CONTENT_DIR`: directorio persistente del contenido local |
| `<RUTA_BACKUPS>` | Destino de las copias de seguridad |
| `<USUARIO_PROCESO>` | Usuario del sistema que ejecuta Node (no `root`) |
| `<NOMBRE_PROCESO_PM2>` | Nombre del proceso en PM2, exclusivo de Crediestética |
| `<PUERTO>` | Puerto local en el que escucha Node (`PORT` / `NITRO_PORT`) |
| `<DOMINIO>` | Dominio público (`NUXT_PUBLIC_SITE_URL` indica `https://crediestetica.com`; confirmar `www` y redirecciones) |

### 5.1 Una sola instancia de Node, en modo `fork`
No usar `cluster`, ni `instances` distinto de 1, ni varias réplicas detrás de un balanceador. Estos mecanismos viven en la **memoria del proceso**: la exclusión mutua de escrituras de la tasa de financiación y de la orientación de imágenes, el límite de intentos de la valoración y de Referidos, y el bloqueo de envíos duplicados. Con varias instancias dejarían de proteger. Resolverlo (por ejemplo con un almacén compartido) es un cambio de arquitectura fuera de este cierre.

### 5.2 Proceso PM2 independiente
Un proceso exclusivo de Crediestética, separado de cualquier otro sitio (incluido Planmed). Ejemplo a adaptar (`ecosystem.config.cjs`; si se versiona, sin secretos):

```js
module.exports = {
  apps: [{
    name: '<NOMBRE_PROCESO_PM2>',
    cwd: '<RUTA_APP>',
    script: '.output/server/index.mjs',
    exec_mode: 'fork',          // NO cluster
    instances: 1,               // NO más de una
    autorestart: true,
    max_memory_restart: '<LÍMITE_A_DEFINIR>',
    env: {
      NODE_ENV: 'production',
      HOST: '127.0.0.1',        // solo accesible desde Nginx
      PORT: '<PUERTO>'
      // El resto de variables NUXT_* se definen como indica la sección 1; los secretos no se versionan.
    }
  }]
}
```

Comandos habituales (los ejecuta el responsable del servidor): `pm2 start ecosystem.config.cjs`, `pm2 save` y `pm2 startup` para que sobreviva a un reinicio de la máquina, `pm2 logs <NOMBRE_PROCESO_PM2>`, `pm2 describe <NOMBRE_PROCESO_PM2>`.

### 5.3 Node en `127.0.0.1`
Node debe escuchar solo en `127.0.0.1` (o su puerto estar protegido por firewall) para que nadie pueda saltarse Nginx: de lo contrario podría falsear `X-Forwarded-For` y `X-Forwarded-Host`, que la aplicación usa (límite por IP y comprobación de mismo origen).

### 5.4 Nginx como proxy inverso
Esqueleto a adaptar; **no sustituye** la configuración actual del servidor, que no se conoce:

```nginx
# Contexto http (una vez): zona del límite de login (ver 5.7)
limit_req_zone $binary_remote_addr zone=crediestetica_login:10m rate=5r/m;

server {
    listen 443 ssl;
    http2 on;
    server_name <DOMINIO>;

    ssl_certificate     <RUTA_CERTIFICADO_COMPLETO>;
    ssl_certificate_key <RUTA_CLAVE_PRIVADA>;

    client_max_body_size 25m;          # mínimo 25 MB: imágenes de 5 MB y galerías de hasta 10 viajan en el cuerpo (data URL)
    proxy_read_timeout   60s;          # mínimo 60 s
    proxy_send_timeout   60s;

    # Cabeceras de seguridad: ver 5.6
    proxy_hide_header X-Powered-By;

    # Login con límite propio: ver 5.7. Va ANTES de la ubicación general; repite la configuración del proxy
    location ~ ^/api/auth/login/?$ {
        limit_req zone=crediestetica_login burst=5 nodelay;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:<PUERTO>;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Forwarded-Host  $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For   $remote_addr;
        proxy_set_header X-Real-IP         $remote_addr;
    }

    location / {
        proxy_pass http://127.0.0.1:<PUERTO>;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Forwarded-Host  $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For   $remote_addr;   # SOBRESCRIBE: no concatenar con $proxy_add_x_forwarded_for si NUXT_TRUSTED_PROXY_HOPS=1
        proxy_set_header X-Real-IP         $remote_addr;
    }
}

server {
    listen 80;
    server_name <DOMINIO>;
    return 301 https://$host$request_uri;
}
```

**`NUXT_TRUSTED_PROXY_HOPS`**: debe reflejar la cadena real de proxies. `0` ignora `X-Forwarded-For` y usa la IP del socket (valor por defecto, seguro, pero tras un proxy **todos los visitantes comparten una sola IP** y el límite de la valoración, 8 envíos por 10 minutos, pasa a ser global). `1` solo con exactamente un proxy (Nginx) que **sobrescribe** la cabecera como arriba. Con otro proxy o una CDN delante, el número cambia y `$remote_addr` pasa a ser la IP de la CDN: hay que **confirmar la topología** antes de subirlo. **No habilitar el formulario de valoración mientras este valor no esté decidido.**

### 5.5 HTTPS y SSL
- **HTTPS obligatorio**: la cookie de sesión del panel (`crediestetica-admin`) se emite con `Secure`; sin HTTPS no se puede iniciar sesión.
- Certificado válido para `<DOMINIO>` (y `www` si se usa), con renovación automática y control de la fecha de vencimiento. **Emisor, tipo de certificado y mecanismo de renovación: datos del servidor por confirmar.**
- Redirección de HTTP a HTTPS (bloque `listen 80` de arriba).

### 5.6 Cabeceras de seguridad
**Decisión: se gestionan en Nginx, no en la aplicación**, para no duplicarlas (una cabecera repetida puede generar políticas conflictivas) y porque dependen del certificado y del dominio reales. La aplicación solo envía hoy `X-Robots-Tag: noindex, nofollow` en `/admin/**` y `X-Content-Type-Options: nosniff` en los endpoints de medios. Al configurarlas, usar `add_header … always;` y comprobar con `curl -I` que no queden repetidas.

| Cabecera | Valor propuesto | Notas |
|---|---|---|
| `Strict-Transport-Security` | `max-age=300` al principio, subiendo a `max-age=31536000` cuando todo funcione | **Solo cuando HTTPS esté correctamente habilitado y probado.** Evitar `includeSubDomains` y `preload` salvo decisión expresa: afectan a otros subdominios |
| `X-Content-Type-Options` | `nosniff` | Sin riesgo |
| `X-Frame-Options` | `DENY` | La web no se incrusta en otros sitios; coherente con `frame-ancestors 'none'` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Es la que ya usan los iframes del código |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | El código no usa estas capacidades (revisado por texto; confirmar en navegador) |
| `Content-Security-Policy` | **Sin política definitiva** (ver abajo) | Empezar con `Content-Security-Policy-Report-Only` |
| `X-Powered-By` | Eliminar con `proxy_hide_header X-Powered-By;` | Nuxt lo añade a las respuestas HTML |

**CSP: no se puede fijar una política segura solo desde el código.** Lo que sí se determinó leyendo el código es el inventario de recursos externos, para construir la política con `Report-Only` y ajustarla con las infracciones reales:

- Estilos y tipografías: `https://fonts.googleapis.com` y `https://fonts.gstatic.com` (`app.vue`).
- Marcos (`iframe`): `https://www.youtube-nocookie.com` (vídeos de Nosotros y de Noticias; el código menciona también `https://www.youtube.com`), `https://www.google.com` y `https://maps.google.com` (mapa de contacto).
- Script de terceros: `https://www.instagram.com/embed.js` (inserciones de Instagram) y los marcos que este carga.
- Enlaces (no recursos): `wa.me`, Facebook, TikTok y `drive.google.com` (documentos legales).
- Imágenes: del propio origen; las portadas que vienen del Hub dependen del dominio del Hub, **que no se conoce hasta confirmar `NUXT_WELLEZY_API_BASE_URL`**.
- Nuxt inserta un script en línea con los datos de la página (payload) y estilos en línea: una política sin `'unsafe-inline'` o sin nonces los bloquearía y rompería la hidratación. Resolverlo bien exige cambios en la aplicación.
- `frame-ancestors 'none'` es seguro y equivale a `X-Frame-Options: DENY`.

### 5.7 Límite de solicitudes de `/api/auth/login` (Nginx `limit_req`)
El login depende hoy del límite del propio Hub (responde 429); la aplicación no tiene uno propio. Propuesta para Nginx (zona y ubicación en el bloque de 5.4):

- **Zona**: `limit_req_zone $binary_remote_addr zone=crediestetica_login:10m rate=5r/m;` (clave por IP; 10 MB admiten decenas de miles de IP). Si hay una CDN o un proxy delante de Nginx, `$binary_remote_addr` sería la IP de ese proxy: en ese caso usar `realip` con la lista de proxies de confianza, **solo tras confirmar la topología**.
- **Umbral inicial recomendado**: 5 intentos por minuto por IP, con `burst=5 nodelay` (se absorben ráfagas cortas, como varios intentos seguidos al equivocarse de contraseña, y después se rechaza). Es un valor de partida a revisar con los logs: el personal de una misma oficina comparte IP.
- **Respuesta**: `limit_req_status 429;` (sin ello Nginx responde 503). Opcional: `limit_req_log_level warn;`.
- **Dónde aplicarlo**: solo en la ubicación `~ ^/api/auth/login/?$`. La barra final opcional es necesaria: **`/api/auth/login/` también llega al manejador** (comprobado con el build). No poner `limit_req` a nivel de `server` ni sobre todo `/api/auth/`: afectaría a `/api/auth/me` (se consulta en cada carga del panel) y a `/api/auth/logout`.
- **Cómo validar que no afecta a solicitudes legítimas** (lo ejecuta el responsable del servidor; no hacen falta credenciales reales):
  1. `nginx -t` y recarga controlada.
  2. Un inicio de sesión correcto desde el navegador: debe pasar.
  3. Con `curl`: `for i in $(seq 1 12); do curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'Origin: https://<DOMINIO>' -H 'Content-Type: application/json' -d '{}' https://<DOMINIO>/api/auth/login; done`. Deben salir primero respuestas de la aplicación (422) y después `429`.
  4. Comprobar que **no** se limita nada más: 20 peticiones seguidas a `/api/auth/me` y a una página pública no deben devolver 429.
  5. Revisar el `error.log` de Nginx (líneas «limiting requests») durante la primera semana para ajustar `rate` y `burst`.

### 5.8 Persistencia del contenido local
- `NUXT_CONTENT_DIR` (`<RUTA_CONTENIDO>`) **fuera de `.output/` y fuera de `<RUTA_APP>`**, para que reemplazar la carpeta de la aplicación no lo borre. Contiene Nosotros, Clínicas (y sus archivos), páginas informativas, la orientación de imágenes y `financing-rate.json` con sus copias `.prev`. Ruta sugerida por el proyecto, por confirmar: `/var/lib/crediestetica/content`.
- **Permisos**: lectura y escritura solo para `<USUARIO_PROCESO>` (por ejemplo propietario `<USUARIO_PROCESO>` y modo `750`), sin acceso para el resto. Nginx no debe servir este directorio.
- Con la variable vacía, la aplicación usa `<directorio de trabajo>/.data/crediestetica-content`, que **se pierde si el despliegue reemplaza la carpeta**: no dejarla vacía en producción.
- Un solo proceso escribe en este directorio (ver 5.1).

### 5.9 Copias de seguridad y prueba de restauración
- Copia **completa** de `<RUTA_CONTENIDO>` antes de cada despliegue y de forma periódica, en `<RUTA_BACKUPS>` (idealmente fuera del servidor). Los `.prev` conservan una sola versión anterior: **no sustituyen** a una copia.
- Frecuencia, retención y destino: **decisión del responsable del servidor**; no se asume ninguna.
- **Prueba de restauración**: restaurar una copia en un directorio distinto, arrancar una instancia de comprobación con `NUXT_CONTENT_DIR` apuntando a él (en otro puerto y sin exponerla) y comprobar que Nosotros, Clínicas y la tasa se leen. Hacerlo antes del lanzamiento y después de forma periódica.

### 5.10 Logs y rotación
- Salida de la aplicación: stdout/stderr de PM2 (`pm2 logs`). Rotación con `pm2-logrotate` o `logrotate` sobre los archivos de PM2 (tamaño máximo y retención: por definir).
- Nginx: `access.log` y `error.log` con su `logrotate`.
- La aplicación **no registra** tokens, contraseñas ni datos de las valoraciones (solo resultados y errores; ver `server/utils/valuation.ts`). Aun así, los logs no deben ser legibles por usuarios ajenos.
- Mensajes que indican configuración pendiente y conviene buscar tras el arranque: `NUXT_SESSION_PASSWORD no está configurada`, `NUXT_WELLEZY_API_BASE_URL no está configurada`, `[valuation] destino del CRM bloqueado`, `[valuation] configuración del CRM incompleta`.

### 5.11 Despliegue, reinicio controlado y rollback
Con una sola instancia hay un corte breve al reiniciar. Secuencia sugerida:

1. Copia de seguridad de `<RUTA_CONTENIDO>` (5.9).
2. Obtener la versión a desplegar en un directorio nuevo (por ejemplo `<RUTA_APP>_<versión>`), no sobre la que está en servicio; `npm ci` y `npm run build` con Node 24.12.0.
3. Conservar el directorio de la versión anterior con su `package-lock.json`.
4. Apuntar PM2 (`cwd`) a la versión nueva y reiniciar: `pm2 restart <NOMBRE_PROCESO_PM2> --update-env` (el entorno solo se recarga si cambió).
5. Ejecutar las validaciones de 5.12.

**Rollback**: volver el `cwd` (o el enlace) a la versión anterior y `pm2 restart <NOMBRE_PROCESO_PM2>`. Los datos de `<RUTA_CONTENIDO>` no se revierten con el código: si la versión nueva escribió datos con un formato distinto, restaurar la copia del paso 1. Probar el procedimiento de rollback antes del lanzamiento.

### 5.12 Validaciones posteriores al despliegue
Las ejecuta el responsable (sin credenciales de producción reales en terminales compartidas):

1. `pm2 describe <NOMBRE_PROCESO_PM2>`: un solo proceso, modo `fork`, sin reinicios en bucle. `curl -I http://127.0.0.1:<PUERTO>/` responde.
2. `curl -sI https://<DOMINIO>/` → 200 sin `X-Powered-By`, con las cabeceras de 5.6 y sin duplicados.
3. `curl -sI http://<DOMINIO>/` → 301 a HTTPS.
4. Rutas con mayúsculas: `curl -sI https://<DOMINIO>/NOTICIAS` → 301 a `/noticias`; `curl -sI 'https://<DOMINIO>/SIMULADOR?x=1'` → 301 a `/financiacion?x=1`; `/Admin/login` responde con `X-Robots-Tag: noindex, nofollow`.
5. `/admin/noticias` sin sesión redirige a `/admin/login`; `GET /api/admin/news` y `GET /api/auth/me` sin sesión → 401; `POST /api/auth/login` sin cabecera `Origin` → 403.
6. Lecturas públicas del Hub: `/noticias` y `/procedimientos` cargan contenido (un 503 con `reason` indica Hub no configurado o inaccesible; ver `server/utils/publicErrors.ts`).
7. Valoración **bloqueada** mientras falte configuración: `POST https://<DOMINIO>/api/forms/valuation` con `Origin` correcto → 503 `not_configured`.
8. `GET /api/public/financing-rate` → 503 `rate_not_configured` hasta configurar la tasa (sección 2), y 200 después.
9. `https://<DOMINIO>/robots.txt` y `/sitemap.xml` responden con el dominio correcto.
10. Guardar contenido de prueba en el panel y comprobar que aparece en `<RUTA_CONTENIDO>` con el usuario del proceso.
11. Inicio y cierre de sesión reales de un usuario autorizado de la línea.

### 5.13 Qué comprueba el repositorio y qué debes ejecutar tú
- **En el repositorio** (ya comprobado con pruebas): lógica de acceso y de rutas, bloqueo de la valoración sin configuración, resolución de IP, redirecciones de mayúsculas, escritura atómica de archivos.
- **Solo en el servidor** (te corresponde): Nginx, certificado, PM2, permisos, `NUXT_CONTENT_DIR`, copias de seguridad y su restauración, logs, cadena real de proxies, firewall, valores reales de las variables (sección 1).
- **Solo con el Hub o el CRM reales**: slugs, URL de la API, roles y permisos, destino y contrato de la valoración (ver la sección 3).

## 6. Vulnerabilidades de dependencias (`npm audit`)

Estado de la última auditoría documentada: **siguen abiertos 28 avisos** (4 bajos, 11 moderados, 7 altos, 6 críticos). La auditoría **no está limpia**. No se volvió a ejecutar `npm audit` en este cierre ni se actualizó ningún paquete: el lock no cambia.

- **Resueltos** (los que llegan al servidor compilado): `vue` y `@vue/server-renderer` 3.5.35 → 3.5.42, `devalue` 5.8.1 → 5.9.4, `sanitize-html` 2.18.0 → 2.18.2 y `fast-xml-parser` 5.8.0 → 5.12.0. Ninguna versión mayor.
- **Servidor compilado:** ningún paquete con aviso abierto queda en `.output/server/node_modules`. Nuxt y Nitro van empaquetados dentro de los chunks, así que los avisos de `nuxt` siguen afectando a ese código; su exposición real se analiza abajo.
- **Pendiente `nuxt` 4.4.7 (sin ruta de ejecución identificada en este proyecto):** los avisos de islas del servidor no se pueden explotar porque no se usan componentes `.server.vue` ni `NuxtIsland`. El aviso de la caché de payload exige `cache`, `swr` o `isr` en rutas con datos por usuario: la única regla es `/blog/**` con `isr` y no existe esa página. Los avisos de `vue` por atributos dinámicos exigen claves controladas por el usuario: el único `v-bind` de objeto usa la clave fija `to`.
- **Reglas de ruta que se omiten con mayúsculas** (Nuxt < 4.6.2): **ya no afectan a lo que se había identificado.** La guarda del panel normaliza la ruta antes de decidir (`middleware/admin-auth.global.ts`, `shared/utils/adminPasswordGate.ts`), la cabecera `X-Robots-Tag` se fija también para las variantes (`/Admin/...` verificado) y las páginas públicas con mayúsculas se redirigen con 301 antes de llegar al router (`server/middleware/canonical-path-case.ts`, incluida la redirección directa del antiguo simulador a `/financiacion`). El aviso del framework sigue abierto hasta actualizar Nuxt, pero no hay una exposición conocida en esta aplicación. Queda sin normalizar solo la codificación porcentual de segmentos estáticos (`/%4Eoticias`), que sirve la misma página pública sin redirigir.
- **Pendiente, herramientas de desarrollo y de compilación** (`@nuxt/devtools`, `simple-git`, `shell-quote`, `seroval`, `tar`, `vite`, `svgo`, `browserslist`, `node-forge`, `glob`, `minimatch` y similares): no están en el servidor compilado. No se instalan dependencias de desarrollo en producción ni se ejecuta el servidor de desarrollo.
- **Tarea pendiente (decisión de negocio): migrar a `nuxt` 4.5.2.** Se probó en una copia aislada: compila y pasa la suite (915 de 916 pruebas; la restante falló porque la copia excluyó la carpeta `archivo-legal-heredado/`; 17 omitidas). Pero obliga a regenerar `package-lock.json` completo (unos 690 paquetes) y cambia el empaquetador a Vite 8 y rolldown. Las versiones de Nuxt que cierran todos los avisos (≥ 4.6.3) exigen Node ≥ 24.15.0, incompatible con la versión probada (24.12.0). No se forzó el cambio ni se presenta como resuelto.

## 7. SEO: canonical y sitemap

- **Canonical**: todas las páginas públicas declaran `<link rel="canonical">` con el origen del sitio (`NUXT_PUBLIC_SITE_URL`) más la **ruta** de la petición, sin barra final (`composables/useCanonicalUrl.ts` y los canonical propios de algunas páginas). La cadena de consulta nunca se incluye: `?utm_source=…`, `?fbclid=…` o `?page=2` apuntan al canonical de la ruta sin parámetros. Consecuencia conocida: las páginas siguientes de un listado paginado (`/noticias?page=2`) declaran como canonical la primera página; es una decisión conservadora que se puede revisar.
- **Mayúsculas**: las variantes con mayúsculas de páginas públicas se redirigen con 301 antes de renderizar (ver la sección 4).
- **Sitemap** (`/sitemap.xml`, módulo `@nuxtjs/sitemap`): hoy lista solo las **páginas estáticas** (17 URL: inicio, financiación, nosotros, noticias, procedimientos, testimonios y sus subpáginas, recomendaciones de cuidados y revisión, y las páginas informativas). No incluye `/admin`, `/prp` ni la redirección `/simulador`.
- **Contenido dinámico del Hub no incluido** (artículos de Noticias, fichas de Procedimientos y páginas de Recomendaciones): el sitemap no puede listarlo porque ese contenido solo existe en el Hub y haría falta una **fuente de datos confirmada** (una consulta al Hub de producción al generar el sitemap, con su tenant y su caché). Esta aplicación ya expone listados públicos (`/api/public/news`, `/api/public/procedures`, `/api/public/recommendations`), pero usarlos como fuente del sitemap añade llamadas al Hub, exige confirmar el contrato de datos y los slugs en producción, y puede incluir contenido no publicado si el contrato cambia. **No se implementó ni se inventó ninguna URL.** Mientras tanto, esas páginas se descubren por los enlaces internos.

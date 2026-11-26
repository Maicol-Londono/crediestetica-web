import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  runtimeConfig: {
    // Solo servidor (nunca expuestos al cliente). Se sobrescriben con NUXT_WELLEZY_*, NUXT_ADMIN_ROLE_IDS
    // y NUXT_SESSION_PASSWORD (mínimo 32 caracteres aleatorios).
    // Autenticación contra Wellezy Hub: p. ej. https://wellezyhub.com/api (local: http://localhost:8000/api).
    wellezyApiBaseUrl: '',
    // Integración firmada con el Hub para el pago en línea de la valoración (Wompi). Se crea en el Hub con `php artisan integrations:create`.
    // Solo servidor (NUXT_HUB_INTEGRATION_KEY_ID / NUXT_HUB_INTEGRATION_SECRET); sin ellas el pago permanece bloqueado y se muestra el aviso con WhatsApp.
    hubIntegrationKeyId: '',
    hubIntegrationSecret: '',
    // Tenant por SLUG (nunca por id). Referencia verificada en la copia local de PD (D5.5): Legalmed = companies.id 16, Crediestética = lineas.id 4
    // (lineas.company_id 16). Esos ids NO se usan en el código: el login envía los slugs y las lecturas públicas envían X-Tenant-Linea.
    wellezyCompanySlug: 'legalmed',
    wellezyLineSlug: 'crediestetica',
    // IDs de rol (users.role.id de Wellezy) autorizados para el CMS, separados por coma. Hoy NO intervienen en el acceso (ver auth.ts) y no hay
    // ids verificados para Crediestética: se dejan vacíos.
    adminRoleIds: '',
    // IDs de rol que, además del superadmin global y del líder de la línea, pueden ver y modificar la tasa de interés del simulador. Separados por
    // coma. NUXT_RATE_EDITOR_ROLE_IDS. Vacío a propósito: falta que el responsable decida qué rol adicional la edita (en la copia de PD existen
    // «Diseñador gráfico» = 19 y «Administrador de contenido de línea» = 20, pero ningún usuario de la línea los tiene; los ids pueden variar por entorno).
    rateEditorRoleIds: '',
    // IDs de rol adicionales (opcional) que pueden ESCRIBIR el contenido local (Nosotros, Clínicas aliadas, páginas). Los perfiles se reconocen
    // también por nombre (ver auth.ts). NUXT_CONTENT_EDITOR_ROLE_IDS, separados por coma. Vacío = solo por nombre.
    contentEditorRoleIds: '',
    sessionPassword: '',
    // Proxies de confianza delante de la aplicación para resolver la IP del cliente (límite de peticiones del PRP). 0 = ignorar X-Forwarded-For
    // y usar la IP del socket (seguro, pero tras un proxy todos comparten una sola IP). NUXT_TRUSTED_PROXY_HOPS; subir a 1 SOLO tras confirmar la infraestructura.
    trustedProxyHops: 0,
    // Directorio persistente del contenido administrado localmente en la web (página «Nosotros»). NUXT_CONTENT_DIR.
    // Vacío => `<directorio de trabajo>/.data/crediestetica-content`. Debe quedar FUERA de `.output/` para sobrevivir a los despliegues.
    contentDir: '',
    // Formulario de valoración → CRM Médico: el SERVIDOR carga el formulario público del CRM (sesión y token) y envía los datos; el navegador nunca lo llama.
    // Destino: NUXT_CRM_FORM_URL (ver .env.example), SIN valor por defecto. Vacío => 503 `not_configured` y ninguna petición.
    crmFormUrl: '',
    // Identificadores del CRM (SOLO servidor). La línea de Crediestética en el CRM es la 30 (no es el linea_id del Hub). Usuario y asesora los confirma
    // el responsable del CRM y no tienen valor por defecto: NUXT_CRM_FORM_USER_ID / _LINE_ID / _ADVISOR_ID.
    crmFormUserId: '',
    crmFormLineId: '30',
    crmFormAdvisorId: '',
    // Correo SMTP (SOLO servidor, nunca en `public`) del formulario «Estudio de créditos» (POST /api/forms/credit-study). SIN credenciales por defecto:
    // las define el administrador por entorno con NUXT_MAIL_HOST / _PORT / _USERNAME / _PASSWORD / _FROM_ADDRESS / _FROM_NAME. Sin ellas el envío responde
    // 503 `not_configured`. Conexión cifrada obligatoria (puerto 465 = TLS; otros puertos exigen STARTTLS).
    mailHost: '',
    mailPort: '',
    mailUsername: '',
    mailPassword: '',
    mailFromAddress: '',
    mailFromName: 'Crediestética',
    // El CC definitivo de los cuatro formularios (estudio de crédito, financiación, valoración y referidos) es la diseñadora: disenadoraplanmed@gmail.com.
    // Destinatarios del estudio de crédito: definidos AQUÍ, en el servidor (el navegador no puede cambiarlos). Se pueden sustituir con NUXT_CREDIT_STUDY_TO /
    // NUXT_CREDIT_STUDY_CC (varias direcciones separadas por coma). Son los de Crediestética: no se comparten con Planmed.
    creditStudyTo: 'convenioscrediestetica@gmail.com',
    creditStudyCc: 'disenadoraplanmed@gmail.com',
    // Destinatarios de la solicitud de financiación (LeadForm → POST /api/forms/lead), definidos AQUÍ, solo en el servidor. Sustituibles con NUXT_LEAD_FORM_TO /
    // NUXT_LEAD_FORM_CC (varias direcciones separadas por coma). Son los de Crediestética: no se comparten con Planmed.
    leadFormTo: 'convenioscrediestetica@gmail.com',
    leadFormCc: 'disenadoraplanmed@gmail.com',
    // Destinatarios del correo de RESPALDO de la valoración y de la notificación complementaria del programa de referidos (Hub → correo): solo servidor,
    // sustituibles con NUXT_VALUATION_TO/CC y NUXT_REFERRAL_TO/CC. Son los de Crediestética: no se comparten con Planmed.
    // El correo NO sustituye al CRM ni a Hub: se envía después de que ellos confirmen (en valoración nunca reemplaza al CRM).
    valuationTo: 'convenioscrediestetica@gmail.com',
    valuationCc: 'disenadoraplanmed@gmail.com',
    referralTo: 'convenioscrediestetica@gmail.com',
    referralCc: 'disenadoraplanmed@gmail.com',
    // Confirmación del PAGO de valoración (comprobante PDF): destinatario propio y único, sin copia ni copia oculta. Es independiente de valuationTo/Cc
    // y de los demás formularios. A propósito NO existe una clave de CC para el pago.
    valuationPayTo: 'convenioscrediestetica@gmail.com',
    public: {
      appName: 'Crediestética',
      // Valor informativo del dominio público: ningún código lo lee hoy. No es dominio de la API ni se envía a Hub (no se usa X-Tenant-Domain).
      localDomain: 'crediestetica.com',
      // Formulario público de PRP del CRM médico externo (POST directo desde el navegador). Se sobrescribe con NUXT_PUBLIC_CRM_PRP_FORM_URL.
      crmPrpFormUrl: 'https://pdtclientsolutions.com/crm-public/api/forms-px-prp',
      // Wellezy Hub settings removed/disabled for now
      // apiBaseUrl: '',
      // tenantSlug: ''
    }
  },
  typescript: {
    tsConfig: {
      // Scripts sueltos de mantenimiento (no forman parte de la aplicación); el typecheck solo cubre el código de la app.
      exclude: ['../*.js', '../*.cjs', '../scratch', '../scripts']
    }
  },
  modules: [
    '@nuxtjs/sitemap'
  ],
  site: {
    // URL PÚBLICA del sitio (canonical, sitemap, Open Graph). Confirmada por el responsable y coincide con el dominio primario activo de la línea 4 en
    // `linea_domains` de la copia de PD (crediestetica.com). No es la URL de la API del Hub (wellezyApiBaseUrl) ni se usa para resolver el tenant.
    // Se puede sobrescribir por entorno con NUXT_PUBLIC_SITE_URL (nuxt-site-config); si el despliegue lo define, esa variable manda.
    url: 'https://crediestetica.com'
  },
  // El sitemap solo lista páginas públicas: el panel (/admin/**) no debe ofrecerse a los buscadores.
  sitemap: {
    exclude: ['/admin', '/admin/**', '/prp/**']
  },
  app: {
    head: {
      title: 'FINANCIACIÓN DE CIRUGÍAS PLÁSTICAS | CREDIESTÉTICA',
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/images/branding/logo-ico.ico' }
      ]
    }
  },
  compatibilityDate: '2024-11-01',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
  css: ['~/assets/css/tailwind.css'],
  vite: {
    plugins: [
      tailwindcss(),
    ]
  },
  routeRules: {
    // Estas páginas se renderizan en cada petición (SSR), NO en el build: el menú compartido (Navbar) trae datos del Hub
    // (recomendaciones, procedimientos, visibilidad de pacientes) y un prerenderizado los congelaría con lo que hubiera al compilar.
    // El panel nunca se indexa. NO se bloquea en robots.txt a propósito: un buscador que no puede rastrear la URL tampoco ve este encabezado.
    '/admin/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/': { ssr: true },
    '/nosotros': { ssr: true },
    // El simulador vive ahora dentro de /financiacion (sección #calculadora): la ruta anterior redirige.
    '/simulador': { redirect: { to: '/financiacion', statusCode: 301 } },
    '/recursos': { ssr: true },
    '/blog/**': { isr: 3600 },
    '/procedimientos/**': { ssr: true },
    '/prp/**': { ssr: true },
    '/casos-clinicos/**': { ssr: true },
    '/clinicas/**': { ssr: true }
  }
})

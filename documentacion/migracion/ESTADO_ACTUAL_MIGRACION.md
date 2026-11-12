# Estado actual de la migración a Crediestética

Documento consolidado (D9.0, 2026-11-10). Resume el estado real del proyecto sin repetir la historia de las conversaciones. No sustituye ni reemplaza los registros existentes, que siguen siendo la fuente del detalle:

- `docs/migration/` (README, DECISIONS, FUNCTIONAL_PARITY, INTEGRATION_BLOCKERS, KNOWN_ISSUES, HUB_READ_VERIFICATION, INFORME_AVANCE_FUNCIONAL, EDITORIAL_NOTICIAS_D7_6).
- `documentacion/maestra/` y `documentacion/documentacion-maestra-planmed/` (documentación histórica de la base de Planmed).

> Nota: `docs/migration/README.md` conserva cifras de pruebas y etapas de D4–D5 (719 pruebas, etapa D5.1). Son históricas y están superadas por este documento.

## 1. Escala de validación usada en este documento

| Nivel | Significado |
|---|---|
| **Implementada** | El código existe y compila. No implica que se haya probado. |
| **Probada con mocks** | Hay pruebas de Node con un Hub simulado (`FakeHub`) o análisis estático del código. |
| **Validada con lectura real** | Se consultó el Hub local (copia `wellezy_pd_copy`) en modo solo lectura y la web mostró el resultado. |
| **Validada con escritura real** | Se creó o modificó un dato real en el Hub. Solo ocurrió en etapas D7.x y D8.1-B2 (por ejemplo procedimientos, noticias y recomendaciones; el detalle por módulo está en `docs/migration/`); **no hubo escrituras en D8.2, D8.2.1, D8.3 ni D9**. |

Ninguna funcionalidad está validada contra producción. No se ha accedido a producción en ninguna etapa.

## 2. Base de la duplicación

- **Proyecto base:** Planmed (`planmed-web`, Nuxt 4 + Nitro + Tailwind 4), clonado para crear el sitio de Crediestética.
- **Proyecto original de Crediestética:** `Cliniplanes/cliniplanes-web` (HEAD `8a7594e`, Nuxt con i18n, `mysql2` y Tailwind). Es un sitio más pequeño: Home, Procedimientos (lista y detalle), Simulador, Recursos, Nosotros, Login y un panel mínimo (categorías, procedimientos, cuenta). Se usa solo como referencia de identidad visual y comportamiento.
- **Arquitectura heredada de Planmed:** frontend Nuxt que habla únicamente con rutas Nitro (`/api/public/*`, `/api/admin/*`); Nitro consulta Wellezy Hub con el tenant de la configuración del servidor (`X-Tenant-Linea: crediestetica`). Sesión administrativa en cookie del servidor; el token del Hub nunca llega al navegador.
- **Tenant:** empresa 16 (Legalmed), línea 4 (`crediestetica`). Los roles y permisos los define el Hub; este repositorio no los modifica.

## 3. Qué pasó con cada funcionalidad heredada

| Categoría | Funcionalidades |
|---|---|
| **Conservadas** | Estructura de rutas (las 45 páginas de Planmed existen con la misma ruta), sesión administrativa vía Hub, lectura pública de procedimientos, noticias, recomendaciones y pacientes, enlaces cortos, micrositios PRP (deshabilitados mientras el CRM sea el heredado). |
| **Adaptadas** | Identidad, contacto y WhatsApp centralizados; navegación (menú CONÓCENOS); textos legales y datos corporativos; catálogo con categorías reales del Hub; simulador sin ciudades heredadas y con tasa configurable; Nosotros y Clínicas aliadas con estados vacíos y campos de Crediestética. |
| **Reemplazadas** | Datos locales de clínicas aliadas de Planmed (`data/clinics.ts`, `data/allies.js` y los cinco logos) por contenido gestionado en el panel (D8.2 / D8.2.1). Tasa fija del simulador por tasa configurable sin valor por defecto. Paleta y tipografías de Planmed por las de Crediestética. |
| **Eliminadas** | Recursos exclusivos de Planmed (logos, portadas, equipo), redes y Messenger de Planmed, PDF de Cliniplanes en `public/` (se conservan en `archivo-legal-heredado/`), datos locales de clínicas aliadas de Planmed. |
| **Propias de Crediestética recuperadas** | Logos, favicon y portada originales (verificados por huella md5 en `tests/config/visual-identity.test.ts`), paleta, Libre Bodoni + Questrial, contenido legal propio. |

## 4. Dependencia con Wellezy Hub y almacenamiento local

**Con el Hub (lectura pública sin sesión; escritura con la sesión del administrador):**
procedimientos, secciones y bloques; categorías (solo lectura); noticias y secciones de noticias; recomendaciones (temas, subtemas, secciones); Nuestros Pacientes (videos, Instagram, antes y después, referidos); autenticación (`/auth/me`); enlaces cortos.

**Con almacenamiento local (`.data/crediestetica-content`, configurable con `NUXT_CONTENT_DIR`, fuera de Git y de `.output/`):**
Nosotros (`about.json`), Clínicas aliadas (clínicas y medios), tasa de financiación (`financing-rate.json`, con historial) y orientación de la imagen de procedimientos (`procedure-image-orientation.json`).

## 5. Último estado de pruebas conocido (histórico D8.3)

Estos resultados son del cierre de D8.3 y **no representan automáticamente el estado actual**. Los resultados de D9 están en el informe de la etapa y se resumen en `ESTADO_VISUAL.md`.

| Verificación | Resultado D8.3 |
|---|---|
| Suite | 800 pruebas: 783 aprobadas, 0 fallidas, 17 omitidas |
| Typecheck | 0 errores |
| Build | Exitoso |
| Validación visual | Escritorio 1280 px y móvil 375 px en las páginas evaluadas |
| Tablet 768 px | Pendiente en D8.3 (en D9 se midió solo la Home) |
| Escrituras reales en el Hub | Ninguna |
| Producción | Sin intervención |

## 6. Estado de Git

- Estado verificado al iniciar D9: rama `main`, HEAD `2e82615`, 216 entradas locales sin confirmar (modificadas, nuevas y eliminadas). Planmed `b17fda7` limpio; Hub `b951317` limpio.
- No se ha hecho ningún commit, push ni despliegue durante la migración. El trabajo acumulado vive solo en el árbol de trabajo local.
- El proyecto original (`8a7594e`) tiene 76 cambios locales propios; no se tocó.

## 7. Pendientes

Ver `ROADMAP_PENDIENTES.md` (pendientes consolidados) y `docs/migration/INTEGRATION_BLOCKERS.md` y `KNOWN_ISSUES.md` (detalle por bloqueo).

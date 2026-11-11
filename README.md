# Crediestética Web

Sitio web público y panel de administración de Crediestética (financiación de procedimientos estéticos). Se construyó a partir de la base de Planmed (`planmed-web`) y se está adaptando a la identidad, los datos y las integraciones de Crediestética.

## Stack

- Nuxt 4 (Vue 3) con Nitro.
- Tailwind CSS 4.
- Pruebas con `node --test` (`npm test`) y `nuxt typecheck` (`npm run typecheck`).

## Integración con Wellezy Hub

Las lecturas públicas (noticias, procedimientos, recomendaciones, testimonios) se piden a Wellezy Hub desde el servidor con la cabecera `X-Tenant-Linea` de la línea configurada (`crediestetica`, empresa `legalmed`). La configuración está en `nuxt.config.ts` y `.env.example` (variables `NUXT_WELLEZY_*`). Esta web se adapta a los contratos actuales de Hub; no los modifica.

## Estructura

- `pages/`, `components/`, `layouts/`: vistas públicas y panel de administración.
- `server/`: rutas de Nitro (lecturas públicas, panel, contenido local).
- `services/`, `providers/`: capa de acceso a datos de la interfaz.
- `shared/utils/`: lógica compartida entre navegador, servidor y pruebas (contacto, documentos legales, contenido de «Nosotros»).
- `tests/`: pruebas.

## Estado de la migración

El registro de la migración desde Planmed (paridad funcional, problemas conocidos, bloqueos y decisiones) está en [`docs/migration/`](docs/migration/README.md). Empieza por ahí para saber qué está hecho y qué está pendiente.

## Carpetas heredadas

- `documentacion/` conserva documentación del proyecto de Planmed. Es referencia histórica: no describe a Crediestética.
- `archivo-legal-heredado/` guarda PDF heredados que no se publican.
- `.data/planmed-content/` y `.output-uat-portable/` son restos locales de Planmed que el código no usa (ver KI-11 y KI-16 en `docs/migration/KNOWN_ISSUES.md`).

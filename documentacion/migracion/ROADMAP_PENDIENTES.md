# Pendientes consolidados

D9.0 · 2026-11-10. Lista de pendientes conocidos. **No se resolvió ninguno en D9.** El detalle de cada bloqueo está en `docs/migration/INTEGRATION_BLOCKERS.md` (B-01 a B-09) y `docs/migration/KNOWN_ISSUES.md` (KI-01 a KI-26).

## Decisiones o información que debe dar Crediestética

| Pendiente | Dependencia |
|---|---|
| Tasa oficial del simulador sin configurar (la tasa se carga desde el panel; hoy el simulador queda en «no disponible») | Responsable financiero |
| Montos mínimo y máximo ($1M y $100M) y paso del simulador pendientes de confirmación | Responsable comercial |
| Plazos financieros (12 a 72 meses) pendientes de confirmación | Responsable comercial |
| Información corporativa y legal sin confirmar; cinco documentos legales sin generar (B-05, B-06) | Responsable del proyecto y área jurídica |
| Dos reels de Instagram de Nuestros Pacientes sin autorización de uso verificada | Titular de la marca |
| Texto del titular y cifras de ejemplo de la Home heredados de la base de Planmed: confirmar o reemplazar el copy | Marca / comercial |
| Ciudades del formulario de solicitud heredadas de Planmed (Medellín, Cali, Barranquilla) | Comercial (etapa de formularios) |

## Dependencias del Wellezy Hub (fuera de este repositorio)

| Pendiente | Referencia |
|---|---|
| CRUD de categorías de procedimientos no disponible (solo hay lectura pública) | B-08 |
| Rol/permisos de contenido para el personal de la línea | B-07 |
| Verificar `accepted_contract` en el Hub | B-04 |
| Enlaces cortos de Crediestética desactivados (falta dominio primario) | KI-22 |
| Escrituras reales no probadas con la sesión de la persona titular | B-09 |
| Contenido provisional de pruebas en la copia local (procedimientos «PRUEBA —», noticias y recomendaciones de demostración, registros D8.1-B2 no eliminables) | KI-24, KI-26 |

## Formularios, consentimientos y CRM (última etapa de la migración)

Destinos CRM correctos (B-01), evidencia de aceptación (B-02), campo de autorización comercial (B-03), `LeadForm` y `MockLeadProvider` (KI-01), `ValuationRequest` (KI-02), `PrpLeadForm` (KI-03), consentimientos genéricos (KI-04, KI-05), modal precontractual en `localStorage` (KI-07), `ReferralForm` (KI-08).

## Validaciones pendientes

- Tablet 768 px de todas las páginas (en D9 solo la Home).
- Comparación visual con capturas de pantalla: en D9 la Home se verificó con métricas calculadas, porque el modal precontractual cubre la página y no se aceptó en nombre del usuario.
- Páginas internas todavía con la presentación anterior (ver `ESTADO_VISUAL.md`).
- Resultados reales del simulador con una tasa oficial.

## Documentación

- `docs/migration/README.md` tiene datos de D5 (719 pruebas) superados por `ESTADO_ACTUAL_MIGRACION.md`. No se editó para conservar el historial.
- `documentacion/identidad_visual.md` describe la paleta de **Planmed** (verde y Playfair/Inter) y declara «legacy» la de Crediestética. Contradice la identidad vigente de Crediestética. No se modificó: requiere decisión del responsable (ver `ESTADO_VISUAL.md`).

# 04 · Procedimientos y catálogos

> Documento de referencia del catálogo **base**. Lo que cambió o se incorporó recientemente (bloques de contenido, árbol de recomendaciones, `author_name`, etc.) está en [NEW_API_INTEGRATIONS §7](NEW_API_INTEGRATIONS.md#7-apis-públicas-de-catálogo-qué-cambió).

## 1. Origen de los datos

| Dato | Origen | Administración |
|---|---|---|
| Procedimientos (`cirugias` + `cirugia_linea`) | **Hub** | Panel de Crediestética vía `/cms/procedures` (permiso `cirugias.*`) |
| Categorías (`categorias_cirugias`) | **Hub** | **No hay** administración desde Crediestética (blocker B-08, `docs/migration/INTEGRATION_BLOCKERS.md`) |
| Secciones de detalle | Hub (`procedure-sections`) | Panel |
| Imágenes y galería | Hub (`mediaAssets`: `featured`, `gallery`) | Panel (subida multipart a Hub) |
| Clínicas aliadas | **Local** (`clinics.json`) — no es Hub | Panel (editores de contenido) |
| «Orientación» de procedimientos | **Local** (`server/utils/procedureOrientation.ts`, `withOrientation`) | Panel |

Dominio: los procedimientos de la tabla `cirugias` (Financieras: Planmed/Crediestética) son **independientes** de los de BMQ (`bmq_procedures`). No mezclar catálogos (regla §14.1 del CLAUDE.md del Hub).

## 2. Qué procedimientos ve la línea

Hub (`CatalogoController::cirugias`): `cirugias.activo = 1`, disponibles para la línea (`availableToLinea`: maestros habilitados + propios de la línea; nunca propios de otras líneas) **y** con fila activa en `cirugia_linea` para la línea. Orden: destacados primero (por `orden`), luego nombre ascendente. Paginado de **15** (fijo). Filtro opcional `?categoria={slug}`.

Estado en la base auditada (`docs/migration/HUB_READ_VERIFICATION.md`, 2026-11-09): línea resuelta pero **sin contenido publicado** (`data: []`); decisión D-15: «los 85 procedimientos maestros no se habilitan». Revalidar en el entorno real antes de probar el móvil: `NO VERIFICADO` para producción.

## 3. Consulta

### Lista (Hub)
```
GET {HUB}/api/v1/web/cirugias?page=1
X-Tenant-Linea: crediestetica
Accept: application/json
```
```json
{
  "data": [
    {
      "nombre": "…", "slug": "mamoplastia-de-aumento",
      "descripcion_corta": "…", "imagen_destacada": "https://…" ,
      "categoria_slug": "corporal",
      "tiene_recomendaciones_post": true, "tiene_recomendaciones_revision": false,
      "recomendaciones": {"cuidados": {"fuente": "pagina", "pagina_slug": "…"}},
      "destacado": false, "orden": 1
    }
  ],
  "links": {"first": "…", "last": "…", "prev": null, "next": null},
  "meta": {"current_page": 1, "last_page": 1, "per_page": 15, "total": 1}
}
```
(Forma: `CirugiaListResource` + paginador Laravel. Los valores son ilustrativos; el slug del ejemplo no proviene de datos reales.) Hay que **recorrer todas las páginas** (`meta.last_page`). La web lo hace hasta 20 páginas y falla con 503 `invalid_response` si `last_page` cambia entre páginas o supera 20 (`fetchPublicProcedureRows`).

### Detalle (Hub)
`GET /v1/web/cirugias/{slug}` → `{ "data": { … } }` con los campos de [02](02-api-contracts.md) §A. `404 {"message": …}` si el slug no existe o no está habilitado para la línea. Si el 404 trae «Tenant» en el mensaje es error de tenant, no «no existe» (`isTenantNotResolved`).

Slug válido en la web: `^[a-z0-9]+(?:-[a-z0-9]+)*$`.

### Categorías (Hub)
`GET /v1/web/categorias-cirugias` → `{"data":[{"nombre","slug","cirugias_count"}]}`. Solo categorías activas con al menos un procedimiento activo y habilitado en la línea.

## 4. Relación procedimiento ↔ categoría

Un procedimiento tiene a lo sumo una categoría (`categoria_slug`, `categoria{nombre,slug}`). Si no existe categoría activa con ese slug, Hub rechaza la escritura con 422. Con una sola categoría hoy en la copia local (`corporal`), el filtro `?categoria=` solo es útil si el entorno real tiene más.

## 5. Multimedia

- `imagen_destacada`: URL absoluta (`mediaAsset->url()`) o `null`.
- `galeria[]`: URLs absolutas.
- `galeria_antes_despues[].imagenes{antes, despues}`.
- `clinicas_asociadas[].logo`.
- En `secciones[].image.url`: la web solo acepta URLs `http(s)://` (`fromPublicSections`).
- Subida/borrado (panel): JPG/PNG/WebP, ≤5 MB, máx. 10 imágenes de galería por envío — solo panel, no móvil.
- No asumas dominios fijos de CDN: usa las URLs tal cual vienen. `NO VERIFICADO` si requieren cabeceras o están en el mismo dominio de la API.

## 6. Estados y disponibilidad

| Situación | Respuesta Hub | Qué hace la web |
|---|---|---|
| Sin procedimientos publicados | `200 {data: []}` | Muestra «0 procedimientos» (vacío válido) |
| Slug inexistente/no habilitado | `404` | 404 propio |
| Línea sin resolver | `404 Tenant Linea not found or inactive` | 503 `reason: tenant` |
| Hub caído / 5xx / timeout | — | 503 `hub_unavailable` con botón reintentar |
| 401/403 en lectura pública | — | 503 `rejected` |
| 200 con cuerpo no conforme | — | 503 `invalid_response` |

El móvil debe distinguir **vacío** (200 `[]`) de **fallo** (resto) igual que la web.

## 7. Recomendaciones asociadas

Cada procedimiento declara por tipo (`cuidados`, `revision`) la fuente efectiva: `pagina | pagina_oculta | historico | ninguna`. Con `pagina`, `pagina_slug` apunta a una página de `recommendation-pages`. El detalle trae además HTML histórico (`recomendaciones_post`, `recomendaciones_revision`). El HTML ya viene saneado (`RichTextSanitizer`); aun así renderízalo con un visor seguro.

## 8. Cambios respecto a la implementación anterior

La app antigua es `NO VERIFICADO`. Cambios verificados respecto a la web heredada de Planmed:
- Origen único en Hub con tenant por slug (`X-Tenant-Linea`), sin ids.
- Los nombres de campos de Hub están en español (`nombre`, `descripcion_corta`, `categoria_slug`…); la web los traduce a `name`, `shortDescription`, `category`. **Si la app antigua usaba nombres en inglés, son del modelo de la web, no de Hub.**
- Categoría: la web deriva la etiqueta del slug y ofrece nombres reales solo como sugerencia (D-14/D-17).
- La lista ya no incluye `whatIsIt`, galería ni secciones: solo el detalle.

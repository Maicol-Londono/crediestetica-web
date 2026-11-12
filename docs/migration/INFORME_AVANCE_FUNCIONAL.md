# D8.0 — Informe de avance funcional de Crediestética (2026-11-10)

Auditoría de solo lectura. Se contrastó la documentación de `docs/migration/` con el código, la copia local de la base (`wellezy_pd_copy`, solo lectura) y las respuestas del Hub local. No se volvieron a ejecutar las pruebas: las cifras son las de etapas anteriores. Git: HEAD `2e82615`, unos 203 cambios locales sin commit, preservados.

## 1. Resumen ejecutivo

- **Avance global ponderado: 73 %** (rango de 70 a 75 %, ver sección 4).
- **Implementación: 88 %. Validación real: 50 %.** El código está casi completo, pero la mitad de lo implementado no se ha comprobado de forma real.
- **Funciona y está validado:** sitio público con la identidad de Crediestética; catálogo de procedimientos, noticias y árbol de recomendaciones leídos del Hub local con aislamiento por línea comprobado; páginas de error y resolución del tenant.
- **Falta, en orden de impacto:**
  1. Ninguna escritura del panel se ha probado de forma controlada contra el Hub real; solo con un Hub simulado, y no hay login real probado.
  2. Los formularios de captación no tienen destino real (B-01).
  3. Faltan documentos legales y datos corporativos, la tasa del simulador y el contenido de Nosotros y Clínicas.
  4. Las categorías no se pueden administrar: el Hub no tiene endpoint (B-08).
  5. Todo el contenido de noticias, recomendaciones y procedimientos de prueba es provisional.
- **Lo que impide cerrar:** la asignación del rol 20 en producción, el destino de los formularios, los datos legales y el contenido oficial. Ninguno se resuelve dentro de este repositorio.

## 2. Tablero por módulo

| Módulo | Avance | Validación | Pendiente principal |
|---|---|---|---|
| A. Sitio público e identidad | 81 % | Alta | Legal incompleto (B-05, B-06) |
| B. Catálogo público de procedimientos | 84 % | Alta | Imágenes y galerías sin probar |
| C. Admin de procedimientos | 49 % | Baja (Hub simulado) | Escritura real (B-09) y categorías (B-08) |
| D. Noticias | 85 % | Pública alta, admin baja | Escritura real y contenido oficial |
| E. Recomendaciones | 79 % | Pública media-alta, admin baja | Admin, bloques e imágenes sin probar |
| F. Formularios y consentimientos | 31 % | Muy baja | Destinos CRM (B-01) y consentimiento (B-02) |
| G. Autenticación y permisos | 75 % | Media-baja | Login real y rol 20 en producción (B-07) |
| H. Integración y arquitectura | 83 % | Alta | Short links desactivados (KI-22) |

## 3. Inventario funcional

Peso: Crítica 3, Importante 2, Complementaria 1. I = implementación (0 a 1). V = validación (0 a 1).

| # | Funcionalidad | Estado | Peso | I | V | Evidencia | HUB |
|---|---|---|---|---|---|---|---|
| 1 | Inicio, navegación e identidad visual | Completa y validada | 2 | 1 | 1 | Pruebas de identidad y revisión visual desktop y móvil | n/a |
| 2 | Contacto, WhatsApp y chat | Completa y validada | 2 | 1 | 1 | Pruebas y medición de enlaces (KI-25) | n/a |
| 3 | SEO y metadatos | Implementada, pendiente de validación | 1 | 1 | 0.5 | Pruebas estáticas | n/a |
| 4 | Legales, precontractual y modal | Parcial | 3 | 0.6 | 0.5 | 3 de 8 documentos enlazados; datos corporativos sin confirmar | n/a |
| 5 | Catálogo público de procedimientos | Completa y validada | 3 | 1 | 1 | `hub-readonly` 12/12 (D7.1) y revisión visual (D7.4) | Real |
| 6 | Imágenes y galerías de procedimientos | Implementada, pendiente de validación | 2 | 1 | 0 | Sin imágenes en los datos | Real, sin datos |
| 7 | Admin de procedimientos y secciones | Implementada, pendiente de validación | 3 | 1 | 0.25 | Paridad con Planmed; Hub simulado | Escritura sin probar |
| 8 | Administración de categorías | Bloqueada | 2 | 0.3 | 0 | Solo lectura (B-08) | Sin endpoint |
| 9 | Noticias públicas | Completa y validada | 2 | 1 | 1 | Revisión visual y KI-25 | Real |
| 10 | Admin de noticias | Implementada, pendiente de validación | 2 | 1 | 0.25 | Hub simulado | Escritura sin probar |
| 11 | Recomendaciones públicas | Implementada, validada en parte | 2 | 1 | 0.7 | D7.7: API y visual con datos provisionales; bloques e imágenes sin probar | Real |
| 12 | Admin de recomendaciones | Implementada, pendiente de validación | 2 | 1 | 0.25 | Hub simulado, sin login | Escritura sin probar |
| 13 | Solicitud de valoración | Bloqueada | 3 | 0.5 | 0.25 | Destino heredado bloqueado, responde 503 (KI-02) | No usa Hub |
| 14 | Consentimientos y evidencia de aceptación | Bloqueada | 2 | 0.3 | 0 | Solo un booleano (KI-04 a KI-07, B-02) | n/a |
| 15 | Login, sesión, contraseña y protección de rutas | Implementada, pendiente de validación | 3 | 1 | 0.5 | Pruebas de seguridad; `/admin/login` sin sesión | Real |
| 16 | Roles, permisos y acceso por línea | Implementada, pendiente de validación | 3 | 1 | 0.3 | Permisos verificados en BD de solo lectura; sin login real | El Hub valida |
| 17 | Panel: configuración, tasa, Nosotros, clínicas, páginas | Implementada, pendiente de validación | 2 | 1 | 0.25 | Archivos locales, no el Hub | Parcial |
| 18 | Tenant y lecturas públicas | Completa y validada | 3 | 1 | 1 | `X-Tenant-Linea`; aislamiento por API (D7.7) | Real |
| 19 | Manejo de errores 401, 403, 404 y 503 | Implementada, validada en parte | 2 | 1 | 0.8 | Pruebas y revisión visual | Real |
| 20 | Simulador de financiación y tasa | Implementada, pendiente de validación | 3 | 1 | 0.5 | Sin tasa: «Simulación no disponible» | No usa Hub |
| 21 | Contenido de Nosotros y Clínicas aliadas | Implementada, pendiente de validación | 2 | 1 | 0.5 | Archivos locales inexistentes (KI-14) | No usa Hub |
| 22 | Testimonios y antes/después públicos | Implementada, validada en parte | 2 | 1 | 0.6 | Lectura real; hoy 2 Instagram | Real |
| 23 | Short links | Bloqueada | 1 | 0.5 | 0 | Línea 4 desactivada en el Hub (KI-22) | Config del Hub |

**Fuera del denominador:**
- Alcance no confirmado: `LeadForm` (`MockLeadProvider`, igual que Planmed), programa de referidos con `ReferralForm` (B-04) y micrositios PRP (CRM bloqueado, KI-03).
- No aplica o no es funcionalidad: contenido de demostración, tareas documentales y lo exclusivo de Planmed.
- Fuera de la migración funcional: el despliegue a producción.

## 4. Metodología del porcentaje

- Puntaje de cada funcionalidad = 0,6 × I + 0,4 × V. La implementación pesa más porque sin ella no hay nada que validar; la validación pesa mucho porque «existe una página» no es «funciona».
- Resultado: 38,04 de 52 puntos posibles = **73,2 %**.
- Solo implementación: 46 / 52 = 88,5 %. Solo validación: 26,1 / 52 = 50,2 %.
- Sin las 4 funcionalidades bloqueadas (8, 13, 14 y 23): 81 %.
- Solo las críticas (peso 3): 74,8 %.
- Con el alcance dudoso incluido (`LeadForm`, referidos y PRP): 70,0 %.
- Los valores de I y V son criterio razonado, no mediciones. El más sensible es la validación del panel (0,25): si se confirmara que las escrituras reales funcionan, el avance subiría unos 2 puntos.

## 5. Integración con el Hub

- **Lecturas reales (`v1/web/*`):** `cirugias`, `categorias-cirugias`, `posts`, `recommendation-topics`, `recommendation-pages`, `patient-section` y `prp`.
- **Aislamiento comprobado (D7.7, 2026-11-10):** cada línea solo ve lo suyo; Planmed no recibe datos de Crediestética; el borrador y la sección oculta no aparecen.
- **Escrituras (`cms/*`):** procedimientos, secciones, posts, imágenes, recomendaciones, usuarios de línea y contraseña. Existen en el código y se probaron solo con un Hub simulado, que no equivale a una integración real. No hay una escritura controlada contra el Hub real.
- **Fuera del Hub:** Nosotros, Clínicas, páginas y tasa (archivos locales `.data/crediestetica-content/`); la valoración va a un CRM heredado bloqueado. Mocks: `MockLeadProvider` y `MockQuotationProvider`.
- **Cambios en la base local posteriores a la documentación:** «Mamoplastia» (id 188) quedó inactiva el 2026-11-10 a las 12:04 y el sitio muestra «Implante Mamario» (id 182, maestro del catálogo, sin imágenes); `patient-section` tiene 2 Instagram. No fueron hechos por el agente. Si fueron pruebas en el panel, son evidencia incidental, no validación formal.

## 6. Pendientes y bloqueos

| Prioridad | Pendiente | Qué bloquea | Qué se necesita |
|---|---|---|---|
| Crítico | B-01, KI-02, KI-03: destinos de formularios | Captación de solicitudes | URL del CRM propio de Crediestética |
| Crítico | B-07, B-09: rol 20 en producción y escritura real | Validar el panel | Asignar el rol y que la titular pruebe con su sesión |
| Crítico | B-05, B-06: documentos y datos legales | Textos jurídicos finales | Documentos y confirmación societaria |
| Alto | KI-14: tasa y contenido de Nosotros y Clínicas | Simulador y secciones | Que los entregue el responsable |
| Alto | KI-24, KI-26, D7.6: contenido oficial | Producción de noticias y recomendaciones | Contenido aprobado y validación médica |
| Alto | B-08: categorías | Crear categorías | Endpoint en el Hub |
| Alto | B-02, KI-04 a KI-07: evidencia y consentimientos | Cumplimiento | Contrato de cada destino |
| Medio | B-04, KI-08: `accepted_contract` en el Hub | Referidos | Confirmación de quien administra el Hub |
| Medio | KI-22: short links | Enlaces cortos | Configuración del Hub |
| Medio | KI-11, KI-16: carpetas y restos de Planmed | Riesgo de publicar datos de Planmed | Autorización para retirarlos |
| Bajo | KI-12, KI-13, KI-18, KI-21, KI-23 y limpieza | Nada | Opcionales |

- **KI-25:** el código coincide con lo informado. No quedan «entidad especializada» ni «Tu seguridad es lo más importante». Sin tocar: el rótulo «En Crediestética te acompañamos» y «profesional certificado…» en procedimientos.
- **Inconsistencias de documentación:** `README.md` dice «Estado actual (2026-11-09)» con 719 pruebas (hoy 748); `KNOWN_ISSUES.md` tiene KI-25 como «pendiente» y como «resuelto»; varios documentos hablan de una «Mamoplastia» real que ya no es la visible.

## 7. Datos provisionales (nada llega a producción tal cual)

| Datos | Identificadores | Tratamiento |
|---|---|---|
| Procedimientos D7.3 | 189 a 192 y 11 secciones (ids 39 a 49) | Retirar y reemplazar por el catálogo oficial |
| Procedimientos reales | 188 «Mamoplastia» (inactivo) y 182 «Implante Mamario» (maestro) | Decidir cuál es el catálogo real |
| Noticia de prueba | 277 | Retirar |
| Noticias provisionales | 278 a 281 | Sustituir |
| Noticias adaptadas de Planmed | 282 (descartar: cita a un médico), 283 (validar y cambiar su `meta_title`) | Retirar 282; validar 283 |
| Recomendaciones D7.7 | 3 temas (ids 4 a 6), 4 subtemas (52 a 55), 11 secciones y 5 recomendaciones | Sustituir por las oficiales con validación médica |
| Patient-section | 2 Instagram de origen incierto | Verificar |

El contenido provisional lleva un aviso visible. Las propuestas D7.6 siguen sin cargar y pendientes de validación médica.

## 8. Pruebas y evidencia

| Evidencia | Resultado | Cuándo |
|---|---|---|
| Suite sin integración con Hub | 748 de 748 | 2026-11-10 (KI-25) |
| `hub-readonly` contra el Hub real local | 12 de 12 | D7.1 (no repetida en D8.0) |
| Hub simulado | Permisos y 401/403/422 | D7.1 |
| Visual desktop y móvil | Correcta | D7.4, D7.7 y KI-25 |
| Aislamiento por API | Comprobado | D7.7 |
| Permisos del personal | Solo lectura en BD | D6 |
| Persistencia real del panel | No validada | n/a |
| Login real | No validado | n/a |

## 9. Plan de trabajo recomendado

1. Asignar el rol 20 y probar el panel con la sesión de la titular (responsable del Hub y titular).
2. Definir y configurar los destinos de los formularios (B-01, B-02).
3. Cargar la tasa, Nosotros, Clínicas y los datos legales (KI-14, B-05, B-06).
4. Decidir el catálogo real (Mamoplastia o Implante Mamario) y pedir categorías en el Hub (B-08).
5. Producir el contenido oficial de noticias, recomendaciones y procedimientos, con validación médica.
6. Decidir el alcance de `LeadForm`, referidos y PRP.
7. Limpieza (KI-11, KI-16) y corrección de la documentación.

## 10. Conclusión

- **Porcentaje real:** ~73 % (rango de 70 a 75 %).
- **Para llegar al 100 %:** validación real del panel, destinos de formularios, contenido y datos legales oficiales, categorías en el Hub y decidir el alcance dudoso.
- **Las tres tareas que más acercan a la meta:** panel validado con sesión real; destinos de formularios; tasa, contenido institucional y datos legales.
- **Puede considerarse terminado:** sitio público, catálogo, noticias y recomendaciones públicas, lectura desde el Hub, aislamiento por línea, identidad y páginas de error.
- **No debe considerarse terminado:** el panel de administración, los formularios, el simulador sin tasa, los textos legales y todo el contenido provisional.

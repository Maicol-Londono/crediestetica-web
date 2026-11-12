# Migración de Planmed a Crediestética

Registro del estado de la migración del sitio web de Crediestética, construido a partir de la base de Planmed. Este directorio documenta lo que se hizo, lo que queda pendiente y las decisiones tomadas. No sustituye al `README.md` de la raíz, que todavía describe el proyecto de Planmed.

## Objetivo

Conseguir **paridad funcional con Planmed**, adaptando cada funcionalidad a la identidad y a los datos de Crediestética. La prioridad es la paridad; los defectos heredados se documentan y no bloquean el avance (ver `DECISIONS.md`).

## Estado actual (2026-11-09)

- Estructura de rutas: las 45 páginas de Planmed existen en Crediestética con la misma ruta (comparación de la lista de archivos de `pages/`).
- Identidad visual, contacto, navegación y pie de página adaptados a Crediestética.
- Estructura documental legal centralizada, con tres documentos oficiales enlazados (política de datos, aviso de privacidad y aviso con autorización expresa). Cinco documentos siguen pendientes.
- Presentación de las páginas legales corregida (consultables sin aceptar el modal).
- Hallazgos de formularios, consentimientos e integraciones documentados en `KNOWN_ISSUES.md`, sin corregir.
- Pruebas: 719 en total; 690 pasan, 14 fallan y 15 se omiten. Los 14 fallos ya existían antes de las etapas D (se verificó ejecutando la copia de `HEAD`) y no son regresiones.
- Repositorio: rama `main`, `HEAD` `2e82615e`, con muchos cambios locales sin commit. No se ha hecho ningún commit, push ni despliegue durante la migración.

## Etapas completadas

| Etapa | Contenido |
|---|---|
| Fases 0 a 3, A, B, C | Diagnóstico y primeras etapas de la migración (anteriores a las etapas D). |
| D1 | Primera etapa D (ajustes de contenido y de pruebas heredados de Planmed). El detalle no se reconstruye aquí porque no quedó registrado en el repositorio. |
| D2 | Contacto y WhatsApp centralizados, retiro de redes y Messenger de Planmed, contenido comercial, textos del panel, paleta y tipografías de Crediestética. |
| D2-QA | Auditoría de calidad posterior a D2. |
| D3 | Navbar y pruebas de navegación (menú CONÓCENOS). |
| D4 | Identidad legal y datos corporativos centralizados. |
| D4.1 | Auditoría jurídica y documental (solo lectura). |
| D4.2 | Retiro de los PDF de Cliniplanes de `public/` (conservados en `archivo-legal-heredado/`), retiro de enlaces a Planmed, texto de `ReferralForm`. |
| D4.3 | Registro central de documentos legales, fuente única del texto precontractual, página de datos provisional. |
| D4.4 y D4.5 | Integración de los enlaces de Drive de la política de datos, el aviso de privacidad y el aviso con autorización expresa. |
| D4.6 | Auditoría de integración documental y consentimientos (solo lectura). |
| D4.7 | Páginas legales sin modal, documentos en el modal, área táctil de enlaces, botones flotantes ocultos en móvil en páginas legales. |
| D4.8-A | Auditoría de correspondencia de consentimientos (solo lectura). |
| D4.9 | Cierre documental (esta documentación). |

## Etapa actual

D5.1: diagnóstico de brechas y plan de cierre (sin cambios de código). Antes: D4.9, cierre documental.

## Próximos pasos

Ver la recomendación de siguiente funcionalidad en `FUNCTIONAL_PARITY.md` (sección «Siguiente funcionalidad recomendada»). Ninguna etapa nueva comienza sin autorización explícita.

## Restricciones permanentes

- Modificar solo el repositorio de Crediestética.
- No modificar Wellezy Hub, Planmed ni el proyecto original de Crediestética.
- No modificar APIs, endpoints, payloads, servicios compartidos, middleware, tenancy, autenticación, permisos, modelos, migraciones, seeders ni datos del Hub.
- No modificar integraciones existentes.
- No hacer migraciones ni escrituras en bases de datos.
- No hacer commits, push ni despliegues.
- No usar `git reset`, `git clean` ni `git stash`; no descartar ni sobrescribir cambios locales.
- No inventar datos legales ni corporativos.

## Índice

- `FUNCTIONAL_PARITY.md`: matriz de paridad con Planmed.
- `KNOWN_ISSUES.md`: defectos y limitaciones conocidas.
- `INTEGRATION_BLOCKERS.md`: dependencias externas al repositorio.
- `DECISIONS.md`: decisiones de alcance y de criterio.

## D5.1 (2026-11-10)

Diagnóstico de brechas y plan de cierre en `FUNCTIONAL_PARITY.md` (clasificación A a F y lista priorizada) y nuevos hallazgos KI-15 a KI-18 en `KNOWN_ISSUES.md`. Sin cambios de código.

## D5.4 (2026-11-10)

KI-15 resuelto, KI-16 resuelto en parte y `/recursos` con cuatro documentos descargables. Detalle en `FUNCTIONAL_PARITY.md` (sección D5.4) y `KNOWN_ISSUES.md`.

## D5.5 (2026-11-10)

KI-17 resuelto en parte: tenant (empresa 16, línea 4) y dominio verificados en la copia local de PD; roles sin cambios por falta de evidencia y de decisión; documento de reclamaciones registrado. Detalle en `KNOWN_ISSUES.md` (KI-17), `FUNCTIONAL_PARITY.md` (D5.5) y `DECISIONS.md` (D-11 a D-13).

## D6 (2026-11-10)

Diagnóstico de lectura real contra el Hub local: 1 procedimiento (Corporal) funcionando; recomendaciones, pacientes y noticias vacíos con estados vacíos correctos; Nosotros/clínicas sin contenido. `hub-readonly`: 11 de 11 contra Hub real. Typecheck correcto; suite completa con 13 fallos previos (KI-20). Bloqueo de permisos del personal: B-07. Sin cambios de código.

## D6.1 (2026-11-10)

KI-20 resuelto: 13 pruebas actualizadas; suite 730 / 0 / 16 omitidas.

## D7.1 (2026-11-10)

Administración de procedimientos en paridad con Planmed (sin brechas de pantallas ni rutas). Nueva lectura de categorías y mejora del formulario. Categorías no administrables por contrato (B-08); escrituras reales no probadas (B-09). Suite: 758 pruebas, 741 pasan, 0 fallan, 17 omitidas (las integraciones sin Hub configurado). `hub-readonly` 12 de 12 contra Hub local.

## D7.6 (2026-11-10)

Propuesta editorial de noticias de procedimientos de Planmed: `EDITORIAL_NOTICIAS_D7_6.md`. Solo lectura; no se cargó ni se modificó ninguna noticia.

## D7.4 (2026-11-10)

Validación pública correcta en desktop y móvil con los datos de prueba; administración sin sesión real (no verificada); enlaces cortos explicados (KI-22, desactivados en la configuración del Hub). Sin cambios de código.

## D7.5 (2026-11-10)

Noticias no estaba deshabilitada, solo vacía. Se cargaron 4 noticias provisionales en la copia local (ids 278 a 281), aisladas en la línea 4 y consultadas desde el Hub; deben sustituirse por noticias reales antes de producción (KI-24). Texto fijo heredado en el detalle (KI-25).

## D7.7 (2026-11-10)

Recomendaciones provisionales cargadas y validadas en la línea 4 (23 registros nuevos, aislados). Sitio público correcto en desktop y móvil; aislamiento por API comprobado; administración sin sesión real (no verificada). Ver KI-26 y D-21. Sin cambios de código.

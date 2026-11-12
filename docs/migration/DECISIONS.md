# Decisiones de la migración

Decisiones de alcance y de criterio vigentes. Se registran con la fecha en que se fijaron o confirmaron.

## D-01. La prioridad es la paridad funcional con Planmed

La migración busca que Crediestética tenga las mismas funcionalidades que Planmed, adaptadas a su identidad. La paridad pesa más que corregir defectos heredados.

## D-02. Los defectos heredados se documentan y no bloquean la migración

Los defectos de formularios, consentimientos e integraciones hallados en D4.6 y D4.8-A se registran en `KNOWN_ISSUES.md`, con estado «pendiente, no bloqueante». No se corrigen mientras no haya autorización expresa. Fecha: 2026-11-09.

## D-03. Se mantienen los comportamientos existentes cuando no hay autorización para corregirlos

Si una funcionalidad existe en Planmed con una limitación, Crediestética conserva el comportamiento actual, siempre que respete las restricciones permanentes.

Ejemplo: `LeadForm` usa `MockLeadProvider`, simula el envío y no transmite la solicitud. Se deja como está: ni se desactiva ni se conecta a otro servicio (ver KI-01).

## D-04. Hub y Planmed permanecen intactos

No se modifican las APIs, endpoints, payloads, servicios compartidos, middleware, tenancy, autenticación, permisos, modelos, migraciones, seeders ni datos de Hub. Tampoco se modifica Planmed ni el proyecto original de Crediestética. Las integraciones existentes no se cambian.

## D-05. Los documentos jurídicos existentes están aprobados

Los documentos y textos jurídicos existentes fueron generados o revisados por el área jurídica y aprobados por el usuario. Se adaptan a la identidad de Crediestética sin alterar su sentido; no se tratan como pendientes de validación jurídica. Lo que sigue pendiente son los documentos aún sin generar y los datos corporativos sin confirmar (ver `INTEGRATION_BLOCKERS.md`, B-05 y B-06).

## D-06. Los datos legales no se infieren

No se publica ningún dato legal o corporativo que no esté confirmado. Mientras tanto, los textos usan una referencia genérica a la sociedad responsable. La discrepancia entre «Legamled SAS» y «LEGALMED S.A.S.» no se resuelve por inferencia.

## D-07. Los documentos legales se configuran en un solo lugar

Los enlaces se definen únicamente en `shared/utils/legalDocuments.ts`; los componentes no duplican URL. Un enlace solo se publica si pasa la validación (https, dominio de Google Drive o Docs, sin dominios heredados). Un documento sin URL se muestra como pendiente y no se simula como disponible.

## D-08. El texto precontractual tiene una sola fuente

El modal y la página `/informacion-precontractual` renderizan el mismo componente con el texto de `shared/utils/precontractualContent.ts`. Una prueba congela el texto aprobado para detectar cualquier cambio.

## D-09. Las páginas legales se consultan sin aceptar el modal

Desde D4.7, `/politica-datos-personales` y `/informacion-precontractual` no montan el modal. La lógica de aceptación del modal no cambió.

## D-10. Las etapas no se encadenan sin autorización

Cada etapa se ejecuta solo tras la autorización del responsable. No se hacen commits, push ni despliegues durante la migración, y no se descartan cambios locales.

## D-11. El tenant se resuelve por slug; los ids 16 y 4 son solo referencia

Legalmed (`company_id = 16`) y Crediestética (`linea_id = 4`) se verificaron en la copia local de PD. El código no los usa: el login envía los slugs y las lecturas públicas envían `X-Tenant-Linea: crediestetica`. No se usa `X-Tenant-Domain`.

## D-12. Los ids de rol no se fijan sin evidencia ni decisión

`adminRoleIds`, `rateEditorRoleIds` y `contentEditorRoleIds` permanecen vacíos. Los ids de rol son globales y pueden variar por entorno; los editores de contenido se reconocen por nombre y la tasa la editan el superadmin global y el líder de área. Cualquier rol adicional requiere una decisión del responsable.

## D-13. El enlace de reclamaciones lo confirma el responsable

El documento de reclamaciones es el archivo de Drive `17HFP_Djmj9UFIC51BW_UCLWUexoMsC_g`, por confirmación del responsable, aunque el archivo se titule distinto. Se registra en `LEGAL_DOCUMENTS.reclamaciones` y se publica en `/recursos` con un único enlace por archivo.

## D-14. Categorías: se mantiene la etiqueta derivada del slug

Hoy coincide con el nombre real de Hub. Mejorarlo con `categorias-cirugias` queda como KI-19, no se implementa en D6.

## D-15. No se migra contenido local ni se habilitan procedimientos

Nosotros y clínicas permanecen vacíos hasta que exista contenido real; los 85 procedimientos maestros no se habilitan; Noticias sigue deshabilitada.

## D-16. Las pruebas siguen a la implementación vigente, no al revés

En D6.1 se actualizaron 6 archivos de prueba porque describían diseños anteriores (página de error independiente, formulario sin envío, módulo sin imports). No se tocó código de la aplicación. La matriz de seguridad se amplió (36 → 44 rutas), no se redujo.

## D-17. Categorías: sugerencia de solo lectura, sin administración local

El campo de categoría sigue siendo el slug (contrato de Hub). Se añadió una lectura de `categorias-cirugias` para sugerir y para nombrar. No se creó ningún almacenamiento local de categorías ni un editor, porque Hub no ofrece el contrato (B-08).

## D-18. Paridad con Planmed sin copiar identidad

La administración de procedimientos ya era idéntica a la de Planmed salvo identidad; en D7.1 solo se corrigieron el ejemplo de slug y la etiqueta de categoría.

## D-19. La validación de administración se hace con sesión real de la titular

No se usan contraseñas ni se simula una identidad. Hasta entonces el panel se valida por código y Hub simulado (B-09).

## D-20. Noticias provisionales por script temporal, solo en la copia local

Se cargaron con un script de tinker en el directorio temporal de la sesión (no un seeder en el Hub ni en este repositorio), con claves propias (`source` y `external_id`) para poder retirarlas. Contenido genérico, sin cifras ni condiciones de Planmed, marcado como provisional.

## D-21. Recomendaciones: solo se reutiliza la estructura de Planmed

El contenido clínico, institucional y financiero de Planmed no se traslada. El texto provisional es demostrativo y su única indicación es seguir las de su equipo médico. Carga por script temporal con los modelos del Hub, solo en `wellezy_pd_copy`, abortando ante cualquier fila existente en la línea 4. Sin tocar seeders ni código del Hub o de Planmed.

## D-22. «Pide tu cita» es un botón compacto en móvil

Componente compartido (aparece en todas las páginas con el layout público). En móvil pasa a icono de 44 px para no tapar contenido; el texto se mantiene accesible (`sr-only`) y desde `md` no cambia. No se eliminó ningún botón ni se añadieron dependencias.

# Dependencias externas

Elementos que no se pueden resolver dentro del repositorio de Crediestética y requieren información, configuración o confirmación de terceros. **Ninguno bloquea la migración** (ver `DECISIONS.md`): el sitio conserva el comportamiento heredado hasta que se resuelvan.

Este documento no propone cambios en Wellezy Hub. Donde interviene Hub, solo se pide información o confirmación a quien lo administra.

| ID | Dependencia | Afecta a | Quién puede resolverlo |
|---|---|---|---|
| B-01 | Destinos CRM correctos | KI-01, KI-02, KI-03 | Responsable del proyecto y administradores del CRM |
| B-02 | Evidencia de aceptación documental | KI-01, KI-06, KI-07 | Responsable del proyecto y dueño de cada destino |
| B-03 | Campo separado de autorización comercial | KI-04 | Dueño de cada destino |
| B-04 | Almacenamiento de `accepted_contract` en Hub | KI-08, KI-09 | Equipo que administra Hub |
| B-05 | Documentos legales sin generar | Política de datos, precontractual | Responsable del proyecto y área jurídica |
| B-06 | Datos corporativos sin confirmar | Textos legales | Responsable del proyecto |

## B-01. Destinos CRM correctos

- **Situación:** `ValuationRequest` y `PrpLeadForm` apuntan por defecto al CRM de `pdtclientsolutions.com`, que el servidor bloquea. No hay `NUXT_CRM_*` definidas. `LeadForm` no tiene destino (usa `MockLeadProvider`).
- **Qué se necesita:** la URL del CRM propio de Crediestética para valoración y PRP, y decidir a qué destino debe enviar `LeadForm`.
- **Fuera del repositorio:** acceso a esos destinos y su contrato de envío. La configuración se hace en variables de entorno del servidor, no en código.

## B-02. Evidencia de aceptación documental

- **Situación:** los destinos reciben solo un booleano (`accept`, `accepted_contract`) o nada (`LeadForm`). No existe fecha, versión ni identificador del documento aceptado.
- **Qué se necesita:** confirmar si cada destino admite campos de evidencia (documento, versión, fecha) y cuáles. Sin esa confirmación, Crediestética solo puede conservar un registro local en el navegador, que no sirve como evidencia.
- **Fuera del repositorio:** el contrato de cada destino.

## B-03. Posible campo separado de autorización comercial

- **Situación:** en `PrpLeadForm` y `LeadForm` una sola casilla obligatoria mezcla la política de datos con la autorización de contacto.
- **Qué se necesita:** que el destino admita un campo propio, si el responsable decide hacer opcional la autorización comercial. Separar los textos visualmente es posible sin tocar el payload; separar el consentimiento registrado, no.
- **Fuera del repositorio:** el contrato de cada destino y la decisión del responsable.

## B-04. Verificación del almacenamiento de `accepted_contract` en Hub

- **Situación:** `ReferralForm` envía `accepted_contract: true` a `/v1/web/prp-enrollments`. No se pudo comprobar si Hub lo guarda con fecha, ni qué mensaje devuelve ante un 422: el checkout local de Hub en esta máquina no contiene ese endpoint ni ese campo, aunque puede estar en otra rama o repositorio.
- **Qué se necesita:** confirmación de quien administra Hub sobre cómo se almacena el valor y qué texto de error devuelve para ese campo.
- **Fuera del repositorio:** todo el lado servidor de Hub. No se propone ningún cambio allí.

## B-05. Documentos legales sin generar

- **Situación:** faltan el pagaré, la autorización de consulta y reporte a centrales de riesgo, el formato o canal de reclamaciones y el documento oficial de advertencias. Sus entradas en `shared/utils/legalDocuments.ts` tienen `url: null` y se muestran como «Pendiente de publicación».
- **Qué se necesita:** los PDF oficiales con su enlace público de Drive (el formato y el dominio se validan en el código; el permiso de acceso se comprueba al recibirlos).
- **Fuera del repositorio:** generación y aprobación de los documentos.

## B-06. Datos corporativos sin confirmar

- **Situación:** razón social (discrepancia entre «Legamled SAS» y «LEGALMED S.A.S.»), NIT asociado con su dígito de verificación, correo de PQRS, domicilio, representante legal y entidad de vigilancia.
- **Qué se necesita:** confirmación documental de cada dato. Se cargan en `shared/utils/legalIdentity.ts` y los textos legales los muestran sin más cambios.
- **Fuera del repositorio:** documentos societarios (por ejemplo, el certificado de existencia y representación).

## B-07. Permisos de contenido del personal administrador (D6)

- **Verificado (copia local de PD, solo lectura):** el personal con rol 19 «Diseñador gráfico» (líder de la línea) y cargo con el mismo rol solo aporta `blog.*`. No tiene `cirugias.*`, `cirugia_secciones.*`, `pacientes_web.*` ni `recomendaciones.*`; esos permisos están en el rol 20 «Administrador de contenido de línea».
- **Efecto:** con ese perfil, el panel de Crediestética no podría crear procedimientos, secciones, testimonios ni recomendaciones. No se verificó con un login real: no hay credenciales y no se solicitan.
- **Qué se necesita (fuera de este repositorio):** que el responsable del Hub asigne el rol 20 o los permisos directos al personal, y habilite procedimientos para la línea. No se modificó el Hub.
- **Sin bloqueo del frontend:** las lecturas públicas funcionan sin sesión.

## B-08. Hub no ofrece administración de categorías de procedimientos (D7.1)

- **Verificado** en `routes/api.php` del Hub local: bajo `cms` solo hay `procedures*`, `procedure-sections*` y `procedure-section-blocks*`. La única lectura de categorías es pública, `v1/web/categorias-cirugias`, y devuelve solo las categorías activas con al menos un procedimiento activo y habilitado en la línea. En la copia local existe una sola categoría (`corporal`).
- **Contrato de asociación:** `categoria_slug` (nullable) debe existir en `categorias_cirugias` con `activo = true`; si no, 422. Crear/editar categorías, ordenarlas o ocultarlas no es posible desde Crediestética.
- **Efecto:** con una sola categoría, el panel solo puede asociar `corporal`. Una categoría nueva (o una existente sin procedimientos habilitados en la línea) no aparece como sugerencia, aunque Hub la aceptaría si se escribe su slug.
- **Qué se necesita (fuera de este repositorio):** que el Hub cree las categorías (alta directa o endpoint CMS) y, si se quiere listar todas las activas en el panel, un `GET cms/procedure-categories`. No se modificó el Hub.

## B-09. Escrituras reales no probadas contra Hub (D7.1)

- Las pruebas de crear, editar, eliminar, subir imágenes y secciones usan un Hub simulado (qué se envía y cómo se traducen 401/403/422). Ninguna escritura real se ejecutó (restricción de la etapa y falta de una sesión autenticada de Estefania).
- Pendiente: que la persona titular pruebe con su propia sesión, tras la asignación del rol 20 en producción (pendiente).

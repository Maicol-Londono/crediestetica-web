# Términos y condiciones de Crediestética: estructura de adaptación

**Estado: documento original NO disponible. No se ha redactado ni se publicará ningún texto legal.**

## Qué se buscó

- No hay copia local ni enlace a los términos y condiciones de Planmed en este repositorio (`docs/`, `documentacion/`, `public/`, `archivo-legal-heredado/`) ni en el repositorio local de Planmed (`planmed-web`).
- `shared/utils/legalDocuments.ts` registra la política de datos, el aviso de privacidad, la autorización de datos y el formato de reclamaciones, pero **no** unos términos y condiciones.
- El Footer no enlaza a ellos: no hay documento ni enlace oficial.

## Qué se necesita para continuar

1. El documento original de Planmed (archivo o enlace de Google Drive con acceso de lectura).
2. Confirmación de que ese documento es la referencia que se adaptará.

Un documento genérico no sustituye al original.

## Datos que el titular debe confirmar

| Dato | Estado | Nota |
|---|---|---|
| NIT | **Suministrado: 901532790-1** | `LEGAL_NIT` en `shared/utils/legalIdentity.ts` guarda `901532790` (sin dígito de verificación). El NIT solo se muestra junto a una razón social confirmada. |
| Razón social | **Pendiente** | Hay dos candidatas sin confirmar («Legamled SAS» y «LEGALMED S.A.S.»). No se elige ninguna. |
| Domicilio legal | **Pendiente** | |
| Representante legal | **Pendiente** | |
| Entidad de inspección y vigilancia | **Pendiente** | Solo si corresponde. |
| Correo oficial de PQRS | **Pendiente** | El correo de contacto general no se asume como PQRS. |
| Políticas comerciales (tasas, plazos, desistimiento, mora, cobranza) | **Pendiente** | No inventar. Deben salir del documento aprobado. |
| Condiciones contractuales (financiación, pagaré, centrales de riesgo) | **Pendiente** | Deben salir del documento aprobado. |
| Ley aplicable y jurisdicción | **Pendiente** | |
| Fecha de vigencia y versión | **Pendiente** | |

## Datos de Planmed que deberán sustituirse al recibir el original

No se pueden listar con precisión sin el documento. Buscar y sustituir, como mínimo: nombre comercial y razón social de Planmed, NIT, domicilio, representante legal, correos y teléfonos, dominios y enlaces (incluidos los de Cliniplanes), nombres de productos y programas, tasas y plazos, referencias a otras empresas del grupo y a pagarés o autorizaciones de Cliniplanes.

## Estructura propuesta (los textos salen del documento aprobado, no de aquí)

1. Identificación del responsable (razón social, NIT, domicilio, canales de contacto).
2. Objeto y alcance del sitio web.
3. Uso del sitio y del simulador (carácter informativo de las cotizaciones).
4. Solicitud de financiación y estudio de crédito.
5. Información precontractual (remite a `/informacion-precontractual`).
6. Tratamiento de datos personales (remite a la política vigente de Drive).
7. Propiedad intelectual.
8. Responsabilidad y limitaciones.
9. Peticiones, quejas y reclamos.
10. Modificaciones de los términos y vigencia.
11. Ley aplicable y jurisdicción.

## Cómo se publicaría, una vez aprobado

1. Subir el documento aprobado a Google Drive con acceso público de lectura.
2. Añadir la clave `terminosCondiciones` a `LEGAL_DOCUMENTS` en `shared/utils/legalDocuments.ts`, con la URL oficial. Se aplica la misma validación de host y formato que a los demás documentos.
3. Añadir el enlace al Footer (`legalLinks` en `components/layout/Footer.vue`) y actualizar las pruebas de documentos legales.
4. No dirigirlo a `/recursos` ni a una página genérica.

Nada de esto se ha hecho: depende de recibir y aprobar el documento.

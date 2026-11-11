// FUENTE ÚNICA del contenido de la información precontractual: la usan el modal global y la página /informacion-precontractual
// (ambos renderizan components/legal/PrecontractualContent.vue). Cambiar el texto aquí lo cambia en los dos sitios.
//
// Las cláusulas son las del texto base ya existente, conservadas SIN modificar su redacción ni añadir obligaciones. Solo se
// agrupan bajo encabezados por tema. NO están validadas jurídicamente: requieren revisión del responsable antes de considerarse oficiales.
// El emisor (`issuer`) lo pasa el componente desde legalIdentity.ts. Pendiente de confirmación (ver legalIdentity.ts): razón social, NIT asociado a ella, correo de PQRS.

export interface PrecontractualSection {
  id: string
  /** Tema de la sección. */
  heading: string
  /** Párrafos de texto plano (sin HTML). */
  paragraphs: string[]
}

/** Texto de cierre/aceptación (se muestra destacado al final). */
export const PRECONTRACTUAL_ACCEPTANCE_CLOSING =
  'Si acepta continuar, manifiesta que conoce y acepta los términos, condiciones y advertencias aquí descritas.'

/**
 * Secciones del documento, SIN el bloque de identificación (razón social, NIT y canales), que se compone en el componente
 * a partir de legalIdentity.ts/contact.ts porque lleva enlaces y datos condicionados a su confirmación.
 */
export function precontractualSections(issuer: string): PrecontractualSection[] {
  return [
    {
      id: 'naturaleza-recursos',
      heading: 'Naturaleza de la actividad y origen de los recursos',
      paragraphs: [
        `Al continuar con este proceso, usted reconoce y acepta que ${issuer} es una sociedad comercial que otorga créditos exclusivamente con recursos propios y que su actividad no es la de una entidad financiera regulada, ni la de una Institución Prestadora de Servicios de Salud (IPS) o clínica.`,
      ],
    },
    {
      id: 'responsabilidad-procedimiento',
      heading: 'Responsabilidad frente al procedimiento médico',
      paragraphs: [
        'En consecuencia, la labor de la compañía se limita al financiamiento y no garantiza resultados médicos o quirúrgicos, los cuales son responsabilidad exclusiva del profesional que usted elija.',
      ],
    },
    {
      id: 'analisis-solicitudes',
      heading: 'Análisis de solicitudes',
      paragraphs: [
        'Asimismo, comprende que el envío de su solicitud no implica una aprobación automática, pues el otorgamiento del crédito está sujeto a un riguroso análisis de riesgo por parte de nuestro departamento de cartera, el cual se reserva el derecho de negar la financiación según sus políticas internas.',
      ],
    },
    {
      id: 'prepago',
      heading: 'Prepago',
      paragraphs: [
        'El consumidor tiene el derecho de realizar el pago total o parcial de su deuda en cualquier momento, abonando únicamente los intereses corrientes o de mora que se hayan causado efectivamente hasta la fecha en que se realice el abono. En ningún caso se impondrán penalidades, multas ni sanciones por concepto de pagos anticipados.',
      ],
    },
    {
      id: 'condiciones-intereses-centrales',
      heading: 'Condiciones de financiación, intereses y mora, y consulta y reporte a centrales',
      paragraphs: [
        'Asimismo, mediante la aceptación de estas condiciones, usted declara entender que esta operación de crédito genera obligaciones civiles de pago y la causación de intereses corrientes y de mora a la tasa máxima legal establecida por la Superintendencia Financiera de Colombia, lo que implica que el incumplimiento en el pago de las cuotas podrá derivar en reportes negativos ante centrales de riesgo como Datacrédito o CIFIN, así como en el inicio de gestiones de cobro administrativo o judicial para la recuperación de la obligación.',
      ],
    },
    {
      id: 'advertencias-publicidad',
      heading: 'Advertencias',
      paragraphs: [
        'De igual forma, acepta que toda la publicidad visualizada en redes sociales o canales de mensajería tiene un carácter meramente informativo y comercial, por lo que no constituye una promesa de aprobación ni una garantía sobre los resultados del procedimiento a financiar.',
      ],
    },
    {
      id: 'aceptacion',
      heading: 'Aceptación',
      paragraphs: [
        'Al hacer clic en el botón de aceptación o continuar con el formulario, usted confirma que ha recibido información suficiente, veraz y oportuna, y que acepta estas condiciones de manera voluntaria antes de cualquier desembolso, entendiendo que para la formalización final se requerirá su firma física o digital certificada en el documento oficial de advertencias.',
      ],
    },
  ]
}

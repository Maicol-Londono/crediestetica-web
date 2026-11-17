// Datos públicos de un micrositio PRP (Wellezy Hub: GET /api/v1/web/prp/{slug}).
// El código del referidor (`external_code`) NO se expone al navegador: la inscripción envía el slug y el servidor resuelve el código con Hub.
export interface PublicPrp {
  name: string;
  slug: string;
  title: string | null;
}

// Datos que captura el formulario del micrositio. El código PRP NO lo escribe la persona.
export interface PrpLeadInput {
  fullName: string;
  phone: string;
  city: string;
  surgery: string;
  codePrp: string;
}

export type PrpLeadErrorKind = 'validation' | 'network' | 'server' | 'unexpected';

export class PrpLeadError extends Error {
  kind: PrpLeadErrorKind;
  statusCode?: number;

  constructor(kind: PrpLeadErrorKind, message: string, statusCode?: number) {
    super(message);
    this.name = 'PrpLeadError';
    this.kind = kind;
    this.statusCode = statusCode;
  }
}

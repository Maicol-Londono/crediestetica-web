// Identidad legal de Crediestética para los textos legales públicos (modal precontractual, información precontractual, datos personales).
// Módulo PURO (sin imports). Regla: es preferible dejar un dato legal PENDIENTE que publicar uno incorrecto.
//
// PENDIENTE DE CONFIRMACIÓN POR EL TITULAR (no se publica nada de esto hasta que se confirme):
//  - Razón social exacta: «Legamled SAS» (dato recibido en la Etapa D4) o «LEGALMED S.A.S.» (texto del proyecto original). No se elige ninguna.
//  - Correo oficial de PQRS (el correo de contacto general NO se asume como PQRS).
//  - Domicilio legal, entidad de vigilancia (si corresponde) y representante legal.
// Para publicarlos: completar LEGAL_ENTITY_NAME y PQRS_EMAIL; los textos legales los muestran sin más cambios.

/** Razón social confirmada. `null` = pendiente: los textos usan una referencia genérica a la sociedad responsable. */
export const LEGAL_ENTITY_NAME: string | null = null
/** NIT suministrado por el responsable. Solo se muestra junto a una razón social confirmada (nunca de forma aislada). */
export const LEGAL_NIT = '901532790'
/** Correo oficial de PQRS confirmado. `null` = pendiente: no se publica ningún canal de PQRS. */
export const PQRS_EMAIL: string | null = null

/** Cómo se nombra a la sociedad en el texto legal: razón social confirmada o, mientras tanto, una referencia genérica. */
export const LEGAL_ISSUER_LABEL: string = LEGAL_ENTITY_NAME ?? 'la sociedad responsable de la financiación en Crediestética'
/** ¿Se puede mostrar la identificación completa (razón social + NIT)? */
export const LEGAL_IDENTITY_CONFIRMED: boolean = LEGAL_ENTITY_NAME !== null

export interface AdminUserRole {
  id: number;
  name: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: AdminUserRole;
  /** Líder de la línea (solo informativo para la UI; el servidor es la autoridad). */
  isAreaLeader: boolean;
  /** Puede ver y modificar la tasa de interés del simulador (solo informativo para la UI; el servidor es la autoridad). */
  canEditRate: boolean;
  /** Capacidades de micrositios y contenido local (solo informativas para la UI; el servidor/Hub es la autoridad). */
  canCreatePrp: boolean;
  canEditPrp: boolean;
  canDeletePrp: boolean;
  /** Visibilidad de módulos en menú y dashboard (solo informativa; Hub y el servidor imponen el acceso). */
  canViewProcedures: boolean;
  canViewNews: boolean;
  canViewPatients: boolean;
  canViewRecommendations: boolean;
  canViewMicrosites: boolean;
  canCreateMicrosites: boolean;
  canAccessConfiguration: boolean;
  canEditContent: boolean;
  /** Contraseña temporal pendiente de cambio: solo se permite /admin/cambiar-contrasena (la impone el servidor). */
  mustChangePassword: boolean;
}

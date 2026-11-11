import { publicResourceDocuments } from '#shared/utils/legalDocuments'

export interface Document {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'link' | 'form';
  url: string;
  /** Enlace de descarga directa cuando existe; `url` abre el documento en su visor. */
  downloadUrl?: string;
}

// Los documentos salen del registro central (shared/utils/legalDocuments.ts): un único lugar para sus enlaces.
export const documents: Document[] = publicResourceDocuments().map(d => ({
  id: d.id,
  title: d.title,
  description: 'Documento en PDF alojado en Google Drive.',
  type: 'pdf',
  url: d.viewUrl,
  downloadUrl: d.downloadUrl
}));

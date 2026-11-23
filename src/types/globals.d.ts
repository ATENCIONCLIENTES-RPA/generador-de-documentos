import type { AsistenteDocumentalApi, PersonNameApi, TaskController } from './ad';
import type { DataRepositoryApi } from './data-repository';
import type { DocStoreApi } from './doc-store';
declare global {
  interface Window {
    AsistenteDocumental?: AsistenteDocumentalApi; AD?: AsistenteDocumentalApi | null;
    DocStore?: DocStoreApi; DataRepository?: DataRepositoryApi; BackupStore?: DataRepositoryApi; PersonName?: PersonNameApi; XLSXLite?: unknown;
    JSZip?: unknown; PizZip?: unknown; docxtemplater?: unknown; Docxtemplater?: unknown; easyTemplateX?: unknown; EasyTemplateX?: unknown;
    docx?: unknown; docxRenderer?: unknown; mammoth?: unknown; ADDocxLocal?: unknown;
    __AD_ON_NAVIGATE?: (params: unknown, ctl: TaskController) => unknown;
  }
}
declare module '*.js' {
  const content: any;
  export default content;
  export const initCiiu: any;
  export const initCiiuTema: any;
}
declare module '*?raw' {
  const content: string;
  export default content;
}
export {};

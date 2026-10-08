/** Acceso tipado a la persistencia y a los documentos de trabajo (contrato público sobre la implementación legada). */
import type { DataRepositoryApi } from '../types/data-repository';
import type { DocStoreApi } from '../types/doc-store';
import { DataRepository as dataRepositoryImpl } from './data-repository';
import { DocStore as docStoreImpl } from './doc-store';
export const dataRepository = dataRepositoryImpl as unknown as DataRepositoryApi;
export const docStore = docStoreImpl as unknown as DocStoreApi;

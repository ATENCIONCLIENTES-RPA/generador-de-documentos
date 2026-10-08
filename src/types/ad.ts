import type { DataRepositoryApi } from './data-repository';
import type { DocStoreApi, ModuleId } from './doc-store';
export type ThemeMode = 'light' | 'dark';
export interface TaskController {
  readonly n: number; step(i: number, detail?: string | null): Promise<void>; progress(fraction: number): void;
  detail(text: string | null | undefined): void; finish(detail?: string): Promise<void>; fail(message?: string): Promise<void>;
}
export type TaskStep = string | { readonly label: string };
export interface NavigateOptions { readonly title?: string; readonly detail?: string; readonly steps?: readonly TaskStep[] }
export interface NavigateResult { ok: boolean; busy?: boolean; error?: string; origen?: ModuleId | null; [extra: string]: unknown }
export interface ThemeApi { get(): ThemeMode; set(mode: ThemeMode | string): void; toggle(): void }
export interface PersonNameApi {
  parse(input: Record<string, unknown>): { firstName: string; source: string }; firstGivenName(input: Record<string, unknown>): string;
  words(text: unknown): string[]; formatWord(word: unknown): string;
}
export interface AsistenteDocumentalApi {
  readonly store: DocStoreApi;
  readonly navigate: (id: ModuleId, params?: unknown, opts?: NavigateOptions) => Promise<NavigateResult>;
  readonly theme: ThemeApi; readonly data: DataRepositoryApi;
  /** Alias de compatibilidad: mismo DataRepository (no crea un segundo almacén). */
  readonly backup: DataRepositoryApi;
  readonly registerMaintenance: (fn: () => Promise<unknown> | unknown) => void;
  readonly runMaintenance: () => Promise<unknown>; readonly reloadModule: (id: ModuleId) => boolean; readonly names: PersonNameApi | null;
  readonly libs: Readonly<Record<'JSZip' | 'PizZip' | 'docxtemplater' | 'easyTemplateX' | 'docx' | 'docxRenderer' | 'mammoth', unknown>>;
  readonly version: string;
}

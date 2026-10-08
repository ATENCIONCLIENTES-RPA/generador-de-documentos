/** Contrato público de DocStore (fuente única de verdad de los documentos de trabajo). */
export type ModuleId = 'recursos' | 'cuadro' | 'documentos';
export type ResourceKey = 'sac' | 'plantillas' | 'mercurio';
export type ResourceStatusValue = 'empty' | 'loading' | 'processing' | 'ready' | 'error';
export interface ModuleMeta { readonly id: ModuleId; readonly index: number; readonly label: string; readonly title: string }
export interface TemplateMeta {
  readonly id: string; readonly fileName: string; readonly title: string; readonly ext: string; readonly size: number;
  readonly lastModified: number | null; readonly path: string; readonly folderId: string | null; readonly folderName: string | null;
}
export interface TemplateFolderMeta { readonly id: string; readonly name: string; readonly addedAt: number; readonly count: number }
export interface ResourceFile {
  readonly name?: string; readonly size?: number; readonly date?: string; readonly count?: number;
  readonly items?: readonly TemplateMeta[]; readonly folders?: readonly TemplateFolderMeta[]; readonly [extra: string]: unknown;
}
export interface ResourceState {
  readonly key: ResourceKey; readonly status: ResourceStatusValue; readonly file: ResourceFile | null; readonly rowCount: number;
  readonly error: string | null; readonly warnings: readonly string[]; readonly persisted: boolean | null; readonly origin: string | null; readonly updatedAt: number | null;
}
export interface ResourceConfig {
  readonly key: ResourceKey; readonly label: string; readonly short: string; readonly description: string; readonly kind: 'xlsx' | 'folder';
  readonly required: boolean; readonly extensions: readonly string[]; readonly columns?: readonly string[]; readonly keyColumns?: readonly string[];
  readonly consumers: readonly ModuleId[]; readonly note: string; readonly sourceUrl: string;
}
export type Profile = Readonly<Record<string, unknown>>;
export interface DocStoreSnapshot {
  readonly resources: Readonly<Record<ResourceKey, ResourceState>>; readonly order: readonly ResourceKey[]; readonly hydrated: boolean; readonly profile: Profile | null;
}
export interface DocStoreEvent { readonly type?: string; readonly key?: string; readonly origin?: string; readonly [extra: string]: unknown }
export interface LoadResult { readonly ok: boolean; readonly error?: string | null; readonly superseded?: boolean; readonly [extra: string]: unknown }
export interface DocStoreApi {
  readonly STATUS: Readonly<Record<'EMPTY' | 'LOADING' | 'PROCESSING' | 'READY' | 'ERROR', ResourceStatusValue>>;
  readonly config: Readonly<{ resources: Readonly<Record<ResourceKey, ResourceConfig>>; order: readonly ResourceKey[]; modules: Readonly<Record<ModuleId, ModuleMeta>> }>;
  getState(): DocStoreSnapshot; getProfile(): Profile | null; setProfile(value: Record<string, unknown> | null): Profile | null; refreshProfile(): Profile | null;
  getRows(key: ResourceKey): ReadonlyArray<Record<string, unknown>> | null; getTemplates(): readonly TemplateMeta[]; getTemplateBlob(id: string): Blob | null; isReady(key: ResourceKey): boolean;
  subscribe(fn: (snap: DocStoreSnapshot, evt: DocStoreEvent) => void, opts?: { immediate?: boolean }): () => boolean;
  load(key: ResourceKey, files: FileList | File[], opts?: Record<string, unknown>): Promise<LoadResult>;
  remove(key: ResourceKey, opts?: Record<string, unknown>): Promise<void>; clear(): Promise<void>; reprocess(key: ResourceKey): Promise<void>;
  hydrate(): Promise<void>; checkStorage(): Promise<boolean>;
  validate(key: ResourceKey, files: FileList | File[]): { ok: boolean; error?: string; files?: File[] };
  addFolder(files: FileList | File[], opts?: Record<string, unknown>): Promise<LoadResult>;
  addTemplates(files: FileList | File[], opts?: Record<string, unknown>): Promise<LoadResult>;
  removeTemplate(id: string, opts?: Record<string, unknown>): Promise<LoadResult>;
  removeFolder(folderId: string, opts?: Record<string, unknown>): Promise<LoadResult>;
}

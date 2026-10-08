/** Contrato público de DataRepository: IndexedDB «essa_cm» (copia persistente) + espejo localStorage + carpeta externa opcional. */
export interface DataRepositoryState {
  readonly status: 'initializing' | 'ready' | 'saving' | 'error'; readonly localReady: boolean; readonly persistent: boolean; readonly itemCount: number; readonly bytes: number;
  readonly folderStatus: 'none' | 'unsupported' | 'permission' | 'choosing' | 'saving' | 'connected' | 'error'; readonly folderSupported: boolean;
  readonly dirName: string | null; readonly lastSaved: number | null; readonly error: string | null; readonly folderError: string | null; readonly supported: boolean;
}
export interface ImportPreview { readonly ok: boolean; readonly error?: string; readonly count?: number; apply?(): Promise<{ ok: boolean }> }
export interface DataRepositoryApi {
  subscribe(fn: (state: DataRepositoryState) => void, opts?: { immediate?: boolean }): () => boolean;
  getState(): DataRepositoryState; getStats(): Readonly<{ itemCount: number; bytes: number }>; snapshot(): Readonly<Record<string, string>>;
  getItem(key: string): string | null; setItem(key: string, value: unknown): boolean; removeItem(key: string): boolean;
  getJSON<T = unknown>(key: string, fallback?: T): T; setJSON(key: string, value: unknown): boolean;
  elegir(): Promise<{ ok: boolean; error?: string; cancelled?: boolean }>; reconectar(): Promise<{ ok: boolean; error?: string; cancelled?: boolean }>;
  exportarJSON(): void; importarJSON(file: File): Promise<ImportPreview>; init(): Promise<boolean>; flush(): Promise<boolean>;
}

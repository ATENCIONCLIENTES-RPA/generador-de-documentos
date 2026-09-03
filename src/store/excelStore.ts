import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ExcelFileState {
  file: File | null;
  loading: boolean;
  progress: number;
  error: string | null;
  recordCount: number;
  stage?: string;
  bytesProcessed?: number;
  totalBytes?: number;
  processedRows?: number;
  totalRows?: number;
  folderPath?: string | null;
}

interface ExcelStore {
  sacFile: ExcelFileState | null;
  mercurioFile: ExcelFileState | null;
  templateFolder: ExcelFileState | null;
  templateFolderPath: string | null;
  allReady: boolean;
  setSacFile: (state: ExcelFileState | null) => void;
  setMercurioFile: (state: ExcelFileState | null) => void;
  setTemplateFolder: (state: ExcelFileState | null) => void;
  setTemplateFolderPath: (path: string | null) => void;
  clearAll: () => void;
}

function computeAllReady(
  sac: ExcelFileState | null,
  mercurio: ExcelFileState | null,
  folder: ExcelFileState | null
): boolean {
  if (!sac || !mercurio || !folder) return false;
  if (sac.loading || mercurio.loading || folder.loading) return false;
  if (sac.error || mercurio.error || folder.error) return false;
  if (!sac.file || !mercurio.file) return false;
  // templateFolder may store File or folder pseudo-file; consider presence of file or recordCount>0 as ready
  if (!folder.file && folder.recordCount === 0) return false;
  return true;
}

export const useExcelStore = create<ExcelStore>()(
  persist(
    (set) => ({
      sacFile: null,
      mercurioFile: null,
      templateFolder: null,
      templateFolderPath: null,
      allReady: false,

      setSacFile: (state) =>
        set((s) => ({
          sacFile: state,
          allReady: computeAllReady(state, s.mercurioFile, s.templateFolder),
        })),
      setMercurioFile: (state) =>
        set((s) => ({
          mercurioFile: state,
          allReady: computeAllReady(s.sacFile, state, s.templateFolder),
        })),
      setTemplateFolder: (state) =>
        set((s) => {
          // Conservar y actualizar la ruta: si el nuevo estado trae folderPath, usarlo; si es null, limpiar el path
          const nextPath =
            state === null ? null : (state.folderPath ?? s.templateFolderPath ?? null);
          const nextFolder = state
            ? { ...state, folderPath: nextPath ?? state.folderPath ?? null }
            : null;
          return {
            templateFolder: nextFolder,
            templateFolderPath: nextPath,
            allReady: computeAllReady(s.sacFile, s.mercurioFile, nextFolder),
          };
        }),
      setTemplateFolderPath: (path) =>
        set((s) => ({
          templateFolderPath: path,
          templateFolder: s.templateFolder
            ? { ...s.templateFolder, folderPath: path }
            : s.templateFolder,
        })),
      clearAll: () =>
        set({
          sacFile: null,
          mercurioFile: null,
          templateFolder: null,
          templateFolderPath: null,
          allReady: false,
        }),
    }),
    {
      name: 'essa-excel',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ templateFolderPath: state.templateFolderPath }),
      // Al hidratar, si hay templateFolderPath persistido pero templateFolder es null,
      // mantenemos el path para mostrarlo; el archivo File no es persistible.
      onRehydrateStorage: () => (state, error) => {
        if (error) console.error('[excelStore] rehydrate error', error);
        if (state && state.templateFolderPath && state.templateFolder) {
          state.templateFolder = {
            ...state.templateFolder,
            folderPath: state.templateFolderPath,
          };
        }
      },
    }
  )
);

// expose for e2e seeding in dev
if (typeof window !== 'undefined' && import.meta.env.DEV)
  (window as unknown as Record<string, unknown>).__excelStore = useExcelStore;

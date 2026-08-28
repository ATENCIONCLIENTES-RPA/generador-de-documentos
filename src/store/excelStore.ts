import { create } from 'zustand';

export interface ExcelFileState {
  file: File | null;
  loading: boolean;
  progress: number;
  error: string | null;
  recordCount: number;
}

interface ExcelStore {
  sacFile: ExcelFileState | null;
  mercurioFile: ExcelFileState | null;
  templateFolder: ExcelFileState | null;
  allReady: boolean;
  setSacFile: (state: ExcelFileState | null) => void;
  setMercurioFile: (state: ExcelFileState | null) => void;
  setTemplateFolder: (state: ExcelFileState | null) => void;
  clearAll: () => void;
}

function computeAllReady(
  sac: ExcelFileState | null,
  mercurio: ExcelFileState | null,
  folder: ExcelFileState | null,
): boolean {
  if (!sac || !mercurio || !folder) return false;
  if (sac.loading || mercurio.loading || folder.loading) return false;
  if (sac.error || mercurio.error || folder.error) return false;
  if (!sac.file || !mercurio.file) return false;
  // templateFolder may store File or folder pseudo-file; consider presence of file or recordCount>0 as ready
  if (!folder.file && folder.recordCount === 0) return false;
  return true;
}

export const useExcelStore = create<ExcelStore>((set) => ({
  sacFile: null,
  mercurioFile: null,
  templateFolder: null,
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
    set((s) => ({
      templateFolder: state,
      allReady: computeAllReady(s.sacFile, s.mercurioFile, state),
    })),
  clearAll: () => set({ sacFile: null, mercurioFile: null, templateFolder: null, allReady: false }),
}));

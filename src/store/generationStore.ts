import { create } from 'zustand';
import type { DocxGenerationResult } from '@/types/template';

export type GenerationStage = 'revision' | 'generando' | 'finalizado' | 'con_errores';
export type GenerationResult = DocxGenerationResult;

interface GenerationStore {
  stage: GenerationStage;
  progress: number;
  docResults: GenerationResult[];
  setStage: (stage: GenerationStage) => void;
  setProgress: (progress: number) => void;
  setDocResults: (results: GenerationResult[]) => void;
  startGeneration: (results?: GenerationResult[]) => void;
  retryFailed: () => void;
  downloadSingle: (id: string) => void;
  downloadAll: () => void;
}

export const useGenerationStore = create<GenerationStore>((set, get) => ({
  stage: 'revision',
  progress: 0,
  docResults: [],

  setStage: (stage) => set({ stage }),
  setProgress: (progress) => set({ progress: Math.max(0, Math.min(100, progress)) }),
  setDocResults: (docResults) => set({ docResults }),

  startGeneration: (results) => {
    if (results) {
      set({ docResults: results, stage: 'generando', progress: 0 });
    } else {
      // if no results provided, mark as generando with existing docResults
      set({ stage: 'generando', progress: 0 });
    }
  },

  retryFailed: () =>
    set((s) => {
      const next = s.docResults.map((r) =>
        r.status === 'error' ? { ...r, status: 'pending' as const, error: undefined } : r
      );
      const hasError = next.some((r) => r.status === 'error');
      return {
        docResults: next,
        stage: hasError ? 'con_errores' : 'revision',
        progress: 0,
      };
    }),

  downloadSingle: (id) => {
    const { docResults } = get();
    const item = docResults.find((r) => r.id === id);
    if (!item?.blob) {
      console.error(`[generationStore] downloadSingle: no blob for id ${id}`);
      return;
    }
    try {
      const url = URL.createObjectURL(item.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.fileName || `${id}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('[generationStore] downloadSingle failed', e);
    }
  },

  downloadAll: () => {
    const { docResults } = get();
    const success = docResults.filter((r) => r.blob);
    if (success.length === 0) {
      console.error('[generationStore] downloadAll: no blobs to download');
      return;
    }
    // If file-saver is available, create ZIP via PizZip; otherwise fallback to sequential downloads
    // For now, trigger sequential downloads to avoid adding heavy ZIP logic in store;
    // generation hook (useGeneration) handles ZIP creation.
    // Here we simply attempt to download each blob individually.
    for (const r of success) {
      try {
        const url = URL.createObjectURL(r.blob as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = r.fileName || `${r.id}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error(`[generationStore] downloadAll failed for ${r.id}`, e);
      }
    }
  },
}));

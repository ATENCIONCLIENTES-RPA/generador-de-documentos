import { useCallback, useRef, useState, useEffect } from 'react';
import { parseExcelFile } from '@/utils/excelParser';
import type { ParseProgressInfo } from '@/utils/excelParser';
import type { Record as EssaRecord } from '@/types/record';
import type { ExcelFileState } from '@/store/excelStore';

export interface UseExcelParserOptions {
  onProgress?: (progress: number) => void;
  onSuccess?: (records: EssaRecord[], file: File) => void;
  onError?: (message: string) => void;
}

export interface UseExcelParserReturn {
  state: ExcelFileState | null;
  loading: boolean;
  progress: number;
  error: string | null;
  recordCount: number;
  file: File | null;
  parse: (file: File) => Promise<EssaRecord[]>;
  parseWithProgress: (
    file: File,
    setState: (s: ExcelFileState | null) => void,
    onRecords?: (records: EssaRecord[]) => void
  ) => Promise<EssaRecord[]>;
  reset: () => void;
}

export function useExcelParser(options?: UseExcelParserOptions): UseExcelParserReturn {
  const [state, setInternal] = useState<ExcelFileState | null>(null);
  const activeTimers = useRef<Set<number>>(new Set());

  const clearAllTimers = useCallback(() => {
    activeTimers.current.forEach((t) => {
      window.clearInterval(t);
      window.clearTimeout(t);
    });
    activeTimers.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  const reset = useCallback(() => {
    clearAllTimers();
    setInternal(null);
  }, [clearAllTimers]);

  const parseWithProgress = useCallback(
    async (
      file: File,
      setState: (s: ExcelFileState | null) => void,
      onRecords?: (records: EssaRecord[]) => void
    ): Promise<EssaRecord[]> => {
      let currentProgress = 0;
      let targetProgress = 8;
      let currentStage = 'Iniciando lectura del archivo...';
      let currentBytes = 0;
      const totalBytes = file.size || 0;
      let processedRows = 0;
      let totalRows = 0;
      let isDone = false;

      const updateState = (overrideProgress?: number) => {
        const p = overrideProgress !== undefined ? overrideProgress : currentProgress;
        const boundedProgress = Math.min(100, Math.max(0, Math.round(p)));
        options?.onProgress?.(boundedProgress);
        setState({
          file,
          loading: !isDone,
          progress: boundedProgress,
          stage: currentStage,
          bytesProcessed: currentBytes,
          totalBytes,
          processedRows,
          totalRows,
          error: null,
          recordCount: isDone ? processedRows : 0,
        });
      };

      // Set initial loading state
      updateState(0);

      // Smooth progress stepper ticker (runs at ~40ms for fluid visual motion)
      const ticker = window.setInterval(() => {
        if (isDone) {
          window.clearInterval(ticker);
          activeTimers.current.delete(ticker);
          return;
        }

        if (currentProgress < targetProgress) {
          // Ease toward target
          const diff = targetProgress - currentProgress;
          const step = Math.max(0.5, Math.min(diff * 0.35, 6));
          currentProgress = Math.min(targetProgress, currentProgress + step);
          updateState();
        } else if (currentProgress < 94) {
          // Slow continuous crawl while waiting for parsing
          currentProgress = Math.min(94, currentProgress + 0.3);
          updateState();
        }
      }, 40);

      activeTimers.current.add(ticker);

      const progressCallback = (info: ParseProgressInfo) => {
        currentStage = info.stage || currentStage;
        if (info.loadedBytes !== undefined) currentBytes = info.loadedBytes;
        if (info.processedRows !== undefined) processedRows = info.processedRows;
        if (info.totalRows !== undefined) totalRows = info.totalRows;
        if (info.progress !== undefined) {
          targetProgress = Math.max(targetProgress, info.progress);
        }
      };

      try {
        const records = await parseExcelFile(file, progressCallback);

        isDone = true;
        window.clearInterval(ticker);
        activeTimers.current.delete(ticker);

        processedRows = records.length;
        currentStage = 'Archivo procesado correctamente';
        currentProgress = 100;
        targetProgress = 100;
        currentBytes = totalBytes;

        const doneState: ExcelFileState = {
          file,
          loading: false,
          progress: 100,
          stage: currentStage,
          bytesProcessed: totalBytes,
          totalBytes,
          processedRows: records.length,
          totalRows: records.length,
          error: null,
          recordCount: records.length,
        };

        setState(doneState);
        options?.onProgress?.(100);
        options?.onSuccess?.(records, file);
        onRecords?.(records);
        return records;
      } catch (err) {
        isDone = true;
        window.clearInterval(ticker);
        activeTimers.current.delete(ticker);

        const msg = err instanceof Error ? err.message : 'Error al procesar el archivo';
        console.error('[useExcelParser] parseWithProgress failed', {
          fileName: file.name,
          error: msg,
        });

        const failedState: ExcelFileState = {
          file,
          loading: false,
          progress: 0,
          stage: 'Error en el procesamiento',
          bytesProcessed: 0,
          totalBytes,
          error: msg,
          recordCount: 0,
        };

        setState(failedState);
        options?.onError?.(msg);
        throw err;
      }
    },
    [options]
  );

  const parse = useCallback(
    async (file: File): Promise<EssaRecord[]> => {
      return parseWithProgress(file, setInternal as (s: ExcelFileState | null) => void);
    },
    [parseWithProgress]
  );

  return {
    state,
    loading: state?.loading ?? false,
    progress: state?.progress ?? 0,
    error: state?.error ?? null,
    recordCount: state?.recordCount ?? 0,
    file: state?.file ?? null,
    parse,
    parseWithProgress,
    reset,
  };
}

export default useExcelParser;

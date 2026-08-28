import { useCallback, useRef, useState } from 'react';
import { parseExcelFile } from '@/utils/excelParser';
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
    onRecords?: (records: EssaRecord[]) => void,
  ) => Promise<EssaRecord[]>;
  reset: () => void;
}

export function useExcelParser(options?: UseExcelParserOptions): UseExcelParserReturn {
  const [state, setInternal] = useState<ExcelFileState | null>(null);
  const intervalRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setInternal(null);
  }, [clearTimer]);

  const simulateProgress = useCallback(
    (setter: (s: ExcelFileState | null) => void, file: File) => {
      let p = 0;
      // shimmer-like interval: 150ms
      intervalRef.current = window.setInterval(() => {
        p += Math.random() * 16 + 6;
        if (p >= 92) {
          p = 92;
          clearTimer();
        }
        options?.onProgress?.(Math.min(p, 92));
        const base: ExcelFileState = {
          file,
          loading: true,
          progress: Math.round(Math.min(p, 92)),
          error: null,
          recordCount: 0,
        };
        setter(base);
      }, 150);
    },
    [clearTimer, options],
  );

  const parse = useCallback(
    async (file: File): Promise<EssaRecord[]> => {
      setInternal({ file, loading: true, progress: 0, error: null, recordCount: 0 });
      simulateProgress(setInternal as unknown as (s: ExcelFileState | null) => void, file);
      try {
        const records = await parseExcelFile(file);
        clearTimer();
        const done: ExcelFileState = {
          file,
          loading: false,
          progress: 100,
          error: null,
          recordCount: records.length,
        };
        setInternal(done);
        options?.onProgress?.(100);
        options?.onSuccess?.(records, file);
        return records;
      } catch (err) {
        clearTimer();
        const msg = err instanceof Error ? err.message : 'Error al procesar el archivo';
        console.error('[useExcelParser] parse failed', { fileName: file.name, error: msg });
        const failed: ExcelFileState = {
          file,
          loading: false,
          progress: 0,
          error: msg,
          recordCount: 0,
        };
        setInternal(failed);
        options?.onError?.(msg);
        throw err;
      }
    },
    [clearTimer, options, simulateProgress],
  );

  const parseWithProgress = useCallback(
    async (
      file: File,
      setState: (s: ExcelFileState | null) => void,
      onRecords?: (records: EssaRecord[]) => void,
    ): Promise<EssaRecord[]> => {
      setState({ file, loading: true, progress: 0, error: null, recordCount: 0 });
      // isolated timer for external state
      let p = 0;
      let extTimer: number | null = window.setInterval(() => {
        p += Math.random() * 16 + 6;
        if (p >= 92) {
          p = 92;
          if (extTimer !== null) window.clearInterval(extTimer);
        }
        options?.onProgress?.(Math.min(p, 92));
        setState({ file, loading: true, progress: Math.round(Math.min(p, 92)), error: null, recordCount: 0 });
      }, 150);

      const clearExt = () => {
        if (extTimer !== null) {
          window.clearInterval(extTimer);
          extTimer = null;
        }
      };

      try {
        const records = await parseExcelFile(file);
        clearExt();
        const done: ExcelFileState = {
          file,
          loading: false,
          progress: 100,
          error: null,
          recordCount: records.length,
        };
        setState(done);
        options?.onProgress?.(100);
        options?.onSuccess?.(records, file);
        onRecords?.(records);
        return records;
      } catch (err) {
        clearExt();
        const msg = err instanceof Error ? err.message : 'Error al procesar el archivo';
        console.error('[useExcelParser] parseWithProgress failed', { fileName: file.name, error: msg });
        const failed: ExcelFileState = {
          file,
          loading: false,
          progress: 0,
          error: msg,
          recordCount: 0,
        };
        setState(failed);
        options?.onError?.(msg);
        throw err;
      }
    },
    [options],
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

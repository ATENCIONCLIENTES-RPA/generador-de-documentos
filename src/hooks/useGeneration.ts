import { useCallback, useMemo } from 'react';
import { useGenerationStore } from '@/store/generationStore';
import { useDataStore } from '@/store/dataStore';
import { useTemplateStore } from '@/store/templateStore';
import { useProfileStore } from '@/store/profileStore';
import { generateDocx, buildTemplateData } from '@/utils/templateEngine';
import { saveAs } from 'file-saver';
import PizZip from 'pizzip';
import type { Record as EssaRecord } from '@/types/record';
import type { DocxGenerationResult } from '@/types/template';

export interface UseGenerationOptions {
  onAddHistory?: (entry: {
    id: string;
    date: string;
    type: string;
    status: string;
    recordsCount: number;
    templateName: string;
  }) => void;
  excludedIds?: Set<string>;
}

export interface UseGenerationReturn {
  stage: string;
  progress: number;
  docResults: DocxGenerationResult[];
  selectedRecords: EssaRecord[];
  visibleRecords: EssaRecord[];
  selectedTemplate: ReturnType<typeof useTemplateStore.getState>['selectedTemplate'];
  canGenerate: boolean;
  generate: () => Promise<void>;
  retryFailed: () => Promise<void>;
  downloadSingle: (id: string) => void;
  downloadAll: () => Promise<void>;
}

function buildFileName(
  templateFileName: string | undefined,
  record: EssaRecord,
  fallbackId: string
): string {
  const base = (templateFileName ?? 'documento')
    .replace(/\.docx$/i, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const suffix = String(
    record.numeroCuenta ?? record.cuenta ?? record.radicadoEntrada ?? fallbackId
  ).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${base}_${suffix}.docx`;
}

function formatZipName(): string {
  return 'Documentos.zip';
}

async function getSignatureBlob(signatureUrl: string | null): Promise<Blob | undefined> {
  if (!signatureUrl) return undefined;
  try {
    // data URL -> fetch works in browsers, but jsdom may not; fallback to converting
    if (signatureUrl.startsWith('data:')) {
      const res = await fetch(signatureUrl);
      if (res.ok) return await res.blob();
      // manual base64 decode fallback
      const base64 = signatureUrl.split(',')[1];
      if (base64) {
        const bin = atob(base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const mimeMatch = signatureUrl.match(/^data:([^;]+);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
        return new Blob([bytes], { type: mime });
      }
      return undefined;
    }
    const res = await fetch(signatureUrl);
    if (res.ok) return await res.blob();
    return undefined;
  } catch (e) {
    console.error('[useGeneration] getSignatureBlob failed', e);
    return undefined;
  }
}

export function useGeneration(options?: UseGenerationOptions): UseGenerationReturn {
  const stage = useGenerationStore((s) => s.stage);
  const progress = useGenerationStore((s) => s.progress);
  const docResults = useGenerationStore((s) => s.docResults);
  const setStage = useGenerationStore((s) => s.setStage);
  const setProgress = useGenerationStore((s) => s.setProgress);
  const setDocResults = useGenerationStore((s) => s.setDocResults);

  const records = useDataStore((s) => s.records) as EssaRecord[];
  const selectedRows = useDataStore((s) => s.selectedRows);
  const templateAssignments = useDataStore((s) => s.templateAssignments);
  const allTemplates = useTemplateStore((s) => s.templates);
  const selectedTemplate = useTemplateStore((s) => s.selectedTemplate);
  const profile = useProfileStore((s) => s.profile);

  const selectedRecords: EssaRecord[] = useMemo(() => {
    if (!records || records.length === 0) return [];
    if (selectedRows.size === 0) return [];
    const out: EssaRecord[] = [];
    for (const r of records) {
      const rowId = (r as unknown as { rowId: string }).rowId;
      if (selectedRows.has(rowId)) out.push(r);
    }
    return out;
  }, [records, selectedRows]);

  // Records to actually generate (excludes removed docs from sidebar)
  const visibleRecords: EssaRecord[] = useMemo(() => {
    const excluded = options?.excludedIds;
    if (!excluded || excluded.size === 0) return selectedRecords;
    return selectedRecords.filter((r) => {
      const rowId = (r as unknown as { rowId: string }).rowId;
      return !excluded.has(rowId);
    });
  }, [selectedRecords, options?.excludedIds]);

  // Per-record template lookup helper
  const getTemplateForRecord = useCallback(
    (rec: EssaRecord) => {
      const rowId = (rec as unknown as { rowId: string }).rowId;
      const tid = templateAssignments[rowId];
      if (!tid) return null;
      return allTemplates.find((t) => t.id === tid) ?? null;
    },
    [templateAssignments, allTemplates]
  );

  // Fallback: use global selectedTemplate if no per-record assignment
  const resolveTemplate = useCallback(
    (rec: EssaRecord) => getTemplateForRecord(rec) ?? selectedTemplate,
    [getTemplateForRecord, selectedTemplate]
  );

  const canGenerate = visibleRecords.length > 0 && visibleRecords.every((r) => !!resolveTemplate(r));

  const processSequential = useCallback(
    async (
      indices: number[],
      existingResults: DocxGenerationResult[]
    ): Promise<DocxGenerationResult[]> => {
      const len = visibleRecords.length;
      if (len === 0) return existingResults;

      // fetch signature once
      const signatureBlob = await getSignatureBlob(profile.signatureUrl ?? null);

      // clone results for mutation
      const next: DocxGenerationResult[] = [...existingResults];

      // ensure all entries exist and are pending
      for (let i = 0; i < len; i++) {
        if (!next[i]) {
          const rec = visibleRecords[i];
          const rid = (rec as unknown as { rowId: string }).rowId ?? `rec-${i}`;
          const tpl = resolveTemplate(rec);
          next[i] = {
            id: rid,
            recordId: rid,
            templateId: tpl?.id,
            fileName: buildFileName(tpl?.fileName ?? 'doc', rec, rid),
            status: 'pending' as const,
          };
        }
      }

      // sets to trigger store updates per iteration
      for (const idx of indices) {
        const rec = visibleRecords[idx];
        const rid = (rec as unknown as { rowId: string }).rowId ?? `rec-${idx}`;
        const tpl = resolveTemplate(rec);
        const tplFile = tpl?.file as File | undefined;
        const tplFileName = tpl?.fileName ?? 'doc';
        // mark generating
        next[idx] = { ...next[idx], status: 'pending' as const, error: undefined, templateId: tpl?.id };
        setDocResults([...next]);
        setProgress(Math.round((idx / len) * 100));

        try {
          let blob: Blob;
          if (tplFile) {
            if (signatureBlob) {
              const templateData = buildTemplateData(rec, {
                name: profile.name,
                position: profile.position,
                email: profile.email,
              });
              blob = await generateDocx(tplFile as unknown as File, templateData, {
                signatureBlob,
              });
            } else {
              blob = await generateDocx(
                tplFile as unknown as File,
                rec as unknown as Record<string, unknown> as never,
                {
                  name: profile.name,
                  position: profile.position,
                  email: profile.email,
                } as unknown as never
              );
            }
          } else {
            const content = tpl?.sampleContent ?? '';
            const text = `ESSA - ${content} - ${rec.nombreSolicitante ?? ''}`;
            blob = new Blob([text], {
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });
          }
          const fileName = buildFileName(tplFileName, rec, rid);
          next[idx] = {
            ...next[idx],
            id: rid,
            status: 'success' as const,
            blob,
            fileName,
            error: undefined,
          };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`[useGeneration] generate error for ${rid}`, e);
          next[idx] = {
            ...next[idx],
            status: 'error' as const,
            error: msg,
          };
        }
        // progress after this doc
        setDocResults([...next]);
        setProgress(Math.round(((idx + 1) / len) * 100));
      }

      const hasError = next.some((r) => r.status === 'error');
      const hasPending = next.some((r) => r.status === 'pending');
      if (!hasPending) {
        setStage(hasError ? 'con_errores' : 'finalizado');
        setProgress(100);
      } else {
        setStage('generando');
      }
      setDocResults([...next]);

      if (options?.onAddHistory) {
        try {
          options.onAddHistory({
            id: `gen-${Date.now()}`,
            date: new Date().toLocaleDateString('es-CO'),
            type: next.length > 1 ? 'Masivo' : 'Individual',
            status: hasError ? 'Con errores' : 'Completado',
            recordsCount: next.length,
            templateName: visibleRecords.length === 1 ? (resolveTemplate(visibleRecords[0])?.title ?? resolveTemplate(visibleRecords[0])?.fileName ?? 'Plantilla') : 'Múltiples plantillas',
          });
        } catch (e) {
          console.error('[useGeneration] onAddHistory failed', e);
        }
      }

      return next;
    },
    [visibleRecords, resolveTemplate, profile, setStage, setProgress, setDocResults, options]
  );

  const generate = useCallback(async () => {
    if (!canGenerate) return;
    setStage('generando');
    setProgress(0);
    // init pending results for visible records only
    const initial: DocxGenerationResult[] = visibleRecords.map((rec, i) => {
      const rid = (rec as unknown as { rowId: string }).rowId ?? `rec-${i}`;
      const tpl = resolveTemplate(rec);
      return {
        id: rid,
        recordId: rid,
        templateId: tpl?.id,
        fileName: buildFileName(tpl?.fileName ?? 'doc', rec, rid),
        status: 'pending' as const,
      };
    });
    setDocResults(initial);
    const indices = initial.map((_, i) => i);
    await processSequential(indices, initial);
  }, [
    canGenerate,
    visibleRecords,
    resolveTemplate,
    setStage,
    setProgress,
    setDocResults,
    processSequential,
  ]);

  const retryFailed = useCallback(async () => {
    const current = useGenerationStore.getState().docResults;
    const failedIndices: number[] = [];
    current.forEach((r, i) => {
      if (r.status === 'error') failedIndices.push(i);
    });
    if (failedIndices.length === 0) return;
    setStage('generando');
    // reset failed to pending
    const reset = current.map((r) =>
      r.status === 'error' ? { ...r, status: 'pending' as const, error: undefined } : r
    );
    setDocResults(reset);
    await processSequential(failedIndices, reset);
  }, [setStage, setDocResults, processSequential]);

  const downloadSingle = useCallback((id: string) => {
    const item = useGenerationStore.getState().docResults.find((r) => r.id === id);
    if (!item?.blob) {
      console.error(`[useGeneration] downloadSingle: no blob for id ${id}`);
      return;
    }
    try {
      saveAs(item.blob as Blob, item.fileName || `${id}.docx`);
    } catch (e) {
      console.error('[useGeneration] downloadSingle failed', e);
    }
  }, []);

  const downloadAll = useCallback(async () => {
    const results = useGenerationStore.getState().docResults;
    const success = results.filter((r) => r.status === 'success' && r.blob);
    if (success.length === 0) {
      console.error('[useGeneration] downloadAll: no blobs to download');
      return;
    }
    if (success.length === 1) {
      try {
        saveAs(success[0].blob as Blob, success[0].fileName);
      } catch (e) {
        console.error('[useGeneration] downloadAll single failed', e);
      }
      return;
    }
    try {
      // Build ZIP with folder ESSA_Documentos_Generados
      const zip = new PizZip();
      // PizZip folder emulation: prefix path
      const folderPrefix = 'ESSA_Documentos_Generados/';
      for (const r of success) {
        const blob = r.blob as Blob;
        let buf: ArrayBuffer;
        const maybe = blob as unknown as { arrayBuffer?: () => Promise<ArrayBuffer> };
        if (typeof maybe.arrayBuffer === 'function') {
          buf = await maybe.arrayBuffer();
        } else {
          // Fallback via FileReader for jsdom / older Blob
          buf = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
            reader.readAsArrayBuffer(blob);
          });
        }
        // zip.file should accept Uint8Array
        zip.file(folderPrefix + (r.fileName || `${r.id}.docx`), new Uint8Array(buf));
      }
      const out = zip.generate({ type: 'arraybuffer' }) as ArrayBuffer;
      const zipBlob = new Blob([out], { type: 'application/zip' });
      saveAs(zipBlob, formatZipName());
    } catch (e) {
      console.error('[useGeneration] downloadAll ZIP failed, fallback to sequential', e);
      // fallback sequential
      for (const r of success) {
        try {
          saveAs(r.blob as Blob, r.fileName || `${r.id}.docx`);
        } catch (err) {
          console.error('[useGeneration] fallback download failed', err);
        }
      }
    }
  }, []);

  return {
    stage: stage as unknown as string,
    progress,
    docResults,
    selectedRecords,
    visibleRecords,
    selectedTemplate,
    canGenerate,
    generate,
    retryFailed,
    downloadSingle,
    downloadAll,
  };
}

export default useGeneration;

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import autoAnimate from '@formkit/auto-animate';
import * as docxPreview from 'docx-preview';
import { useGeneration } from '@/hooks/useGeneration';
import { useGenerationStore } from '@/store/generationStore';
import { useProfileStore } from '@/store/profileStore';
import { useDataStore } from '@/store/dataStore';
import { useTemplateStore } from '@/store/templateStore';
import { useNavigationStore } from '@/store/navigationStore';
import { useExcelStore } from '@/store/excelStore';
import { generateDocx, buildTemplateData, replaceTemplateVariables } from '@/utils/templateEngine';
import { formatDateToSpanish } from '@/utils/businessDays';
import { BuildTemplateGuideModal } from '@/components/features/BuildTemplateGuideModal';
import { DescriptionsCard } from '@/components/features/DescriptionsCard';
import { ApplicantCard } from '@/components/features/ApplicantCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import type { Record as EssaRecord } from '@/types/record';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegExpStr(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Helper: same logic used by useGeneration to retrieve signature blob
// ---------------------------------------------------------------------------
async function getSignatureBlob(signatureUrl: string | null): Promise<Blob | undefined> {
  if (!signatureUrl) return undefined;
  try {
    if (signatureUrl.startsWith('data:')) {
      const res = await fetch(signatureUrl);
      if (res.ok) return await res.blob();
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
    console.error('[GenerateView] getSignatureBlob failed', e);
    return undefined;
  }
}

interface GenerateViewProps {
  onAddHistory?: (entry: {
    id: string;
    date: string;
    type: string;
    status: string;
    recordsCount: number;
    templateName: string;
  }) => void;
}

type DocxPreviewModule = {
  renderAsync?: (buffer: ArrayBuffer, element: HTMLElement) => Promise<void>;
};

type PreviewMode = 'diseno' | 'documento';

const TEMPLATE_PAGE_SIZE = 8;

export function GenerateView({ onAddHistory }: GenerateViewProps) {
  const profile = useProfileStore((s) => s.profile);

  /* ── Stores: plantillas + registro único del Módulo 3 ── */
  const templates = useTemplateStore((s) => s.templates);
  const selectedTemplate = useTemplateStore((s) => s.selectedTemplate);
  const selectTemplate = useTemplateStore((s) => s.selectTemplate);
  const records = useDataStore((s) => s.records);
  const selectedRows = useDataStore((s) => s.selectedRows);
  const templateAssignments = useDataStore((s) => s.templateAssignments);
  const assignTemplate = useDataStore((s) => s.assignTemplate);
  const goTo = useNavigationStore((s) => s.goTo);
  const complete = useNavigationStore((s) => s.complete);
  const templateFolderPath = useExcelStore((s) => s.templateFolderPath);

  const selectedRecord: EssaRecord | null = useMemo(() => {
    if (!records || records.length === 0 || selectedRows.size === 0) return null;
    const firstId = Array.from(selectedRows)[0]!;
    return (
      ((records as EssaRecord[]).find(
        (r) => (r as unknown as { rowId: string }).rowId === firstId
      ) as EssaRecord) ?? null
    );
  }, [records, selectedRows]);

  const selectedRowId = selectedRecord
    ? (selectedRecord as unknown as { rowId: string }).rowId
    : null;
  const assignedTemplateId = selectedRowId ? (templateAssignments[selectedRowId] ?? null) : null;
  const hasSelectedRecord = selectedRecord !== null;

  /* ── Generation engine ── */
  const [isGenerating, setIsGenerating] = useState(false);
  const excludedIdsList = useGenerationStore((s) => s.excludedIds);
  const excludedIds = useMemo(() => new Set(excludedIdsList), [excludedIdsList]);

  const {
    stage,
    docResults,
    visibleRecords,
    selectedTemplate: engineTemplate,
    canGenerate,
    generate,
    retryFailed,
    downloadSingle,
    downloadAll,
  } = useGeneration({ onAddHistory, excludedIds });

  const activeRecord: EssaRecord | null =
    (visibleRecords[0] as EssaRecord | undefined) ?? selectedRecord;
  const activeRid = activeRecord
    ? ((activeRecord as unknown as { rowId: string }).rowId ?? null)
    : null;

  const errorCount = useMemo(
    () => docResults.filter((r) => r.status === 'error').length,
    [docResults]
  );
  const hasError = errorCount > 0;

  /* ── Template catalog state ── */
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [templatePage, setTemplatePage] = useState(1);
  const [guideOpen, setGuideOpen] = useState(false);
  const templateListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (templateListRef.current && typeof window !== 'undefined') {
      try {
        const disable = autoAnimate(templateListRef.current, { duration: 200 });
        return () => {
          try {
            (disable as unknown as () => void)?.();
          } catch {
            // Auto-animate teardown is best effort (jsdom/tests).
          }
        };
      } catch {
        // Auto-animate is progressive enhancement; ignore when unavailable.
      }
    }
    return undefined;
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    let out = templates;
    if (templateSearch.trim()) {
      const q = templateSearch.toLowerCase().trim();
      out = out.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.category && t.category.toLowerCase().includes(q)) ||
          (t.fileName && t.fileName.toLowerCase().includes(q))
      );
    }
    if (selectedCategory !== 'todas') out = out.filter((t) => t.category === selectedCategory);
    return out;
  }, [templates, templateSearch, selectedCategory]);

  const totalTemplatePages = Math.max(1, Math.ceil(filteredTemplates.length / TEMPLATE_PAGE_SIZE));
  const paginatedTemplates = useMemo(() => {
    const start = (templatePage - 1) * TEMPLATE_PAGE_SIZE;
    return filteredTemplates.slice(start, start + TEMPLATE_PAGE_SIZE);
  }, [filteredTemplates, templatePage]);

  useEffect(() => {
    setTemplatePage(1);
  }, [templateSearch, selectedCategory]);
  useEffect(() => {
    if (templatePage > totalTemplatePages) setTemplatePage(totalTemplatePages);
  }, [totalTemplatePages, templatePage]);

  /* ── Asociación automática registro ↔ plantilla ── */
  const handleSelectTemplate = useCallback(
    (templateId: string) => {
      selectTemplate(templateId);
      // La plantilla queda asociada al registro del Módulo 3 sin pasos manuales.
      Array.from(selectedRows).forEach((id) => assignTemplate(id, templateId));
    },
    [selectTemplate, selectedRows, assignTemplate]
  );

  // Si ya había plantilla elegida y el registro no tiene asignación
  // (p. ej. cambió la selección en el Módulo 3), asignarla automáticamente.
  useEffect(() => {
    if (selectedTemplate && selectedRowId && !templateAssignments[selectedRowId]) {
      assignTemplate(selectedRowId, selectedTemplate.id);
    }
  }, [selectedTemplate, selectedRowId, templateAssignments, assignTemplate]);

  const assignedTemplate = assignedTemplateId
    ? (templates.find((t) => t.id === assignedTemplateId) ?? selectedTemplate)
    : selectedTemplate;

  /* ── Preview modes ── */
  const [mode, setMode] = useState<PreviewMode>('documento');
  const [disenoRenderFailed, setDisenoRenderFailed] = useState(false);
  const [disenoRendering, setDisenoRendering] = useState(false);
  const [docRendering, setDocRendering] = useState(false);
  const [docxRenderFailed, setDocxRenderFailed] = useState(false);
  const disenoHiddenRef = useRef<HTMLDivElement>(null);
  const disenoWrapperRef = useRef<HTMLDivElement>(null);
  const docWrapperRef = useRef<HTMLDivElement>(null);

  const switchMode = useCallback((next: PreviewMode) => setMode(next), []);

  const handleModeKeyDown = useCallback((e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      setMode((m) => (m === 'diseno' ? 'documento' : 'diseno'));
    }
  }, []);

  /* ── Modo Diseño: renderiza la plantilla tal cual (sin datos).
     Usa el mismo pipeline que el modo Documento para garantizar idéntico ancho. ── */
  useEffect(() => {
    let cancelled = false;
    const wrapper = disenoWrapperRef.current;
    if (!wrapper) return;
    setDisenoRenderFailed(false);
    wrapper.innerHTML = '';
    if (disenoHiddenRef.current) disenoHiddenRef.current.innerHTML = '';
    if (!selectedTemplate?.file) return;
    setDisenoRendering(true);
    const file = selectedTemplate.file;
    (async () => {
      try {
        const renderAsync = (docxPreview as DocxPreviewModule).renderAsync;
        if (!renderAsync) throw new Error('docx-preview renderAsync not found');
        const buf = await (file as unknown as Blob).arrayBuffer();
        if (cancelled || !disenoWrapperRef.current) return;
        disenoWrapperRef.current.innerHTML = '';
        await renderAsync(buf, disenoWrapperRef.current);
        if (cancelled || !disenoWrapperRef.current) return;
        await new Promise((r) => requestAnimationFrame(r));
        if (cancelled || !disenoWrapperRef.current) return;
        {
          const container = disenoWrapperRef.current;
          const sections = container.querySelectorAll('section.docx, section[class*="docx"]');
          sections.forEach((sec) => {
            (sec as HTMLElement).style.display = 'block';
            (sec as HTMLElement).style.marginBottom = '18px';
          });
          const libWrapper = container.querySelector('.docx-wrapper');
          const wrapperEl = (libWrapper ?? container) as HTMLElement;
          wrapperEl.style.background = 'transparent';
          wrapperEl.style.padding = '0';
        }
        // Verificación: si no quedó contenido visible, se usa el respaldo con datos.
        await new Promise((r) => requestAnimationFrame(r));
        if (cancelled) return;
        const disenoHasContent =
          wrapper.querySelector('section') !== null ||
          (wrapper.textContent ?? '').trim().length > 0;
        if (!disenoHasContent) throw new Error('docx-preview produced no visible content');
      } catch (err) {
        console.error('docx-preview render failed (diseño)', err);
        if (!cancelled) {
          setDisenoRenderFailed(true);
          wrapper.innerHTML = '';
        }
      } finally {
        if (!cancelled) setDisenoRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTemplate]);

  const disenoFallback = useMemo(() => selectedTemplate?.sampleContent ?? '', [selectedTemplate]);
  const showDisenoFallback = !selectedTemplate?.file || disenoRenderFailed;

  /* Respaldo con datos reales: si no hay texto de muestra, se listan los
     valores que el motor de generación usa para el documento, de modo que
     la vista previa nunca quede vacía cuando hay registro y plantilla. */
  const fallbackDataRows = useMemo(() => {
    if (!activeRecord) return [];
    try {
      const data = buildTemplateData(activeRecord, {
        name: profile.name,
        position: profile.position,
        email: profile.email,
      });
      return Object.entries(data)
        .filter(([, v]) => typeof v === 'string' || typeof v === 'number')
        .map(([key, v]) => ({ key, value: String(v).trim() }))
        .filter((r) => r.value.length > 0 && r.value !== '—')
        .slice(0, 40);
    } catch (e) {
      console.error('buildTemplateData fallback failed', e);
      return [];
    }
  }, [activeRecord, profile.name, profile.position, profile.email]);

  const humanizeKey = (key: string) =>
    key
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/^\p{L}/u, (m) => m.toUpperCase());

  /* ── Modo Documento: genera el docx con datos + firma y lo renderiza ── */
  const previewContent = useMemo(() => {
    if (!engineTemplate) return '';
    const raw = engineTemplate.sampleContent ?? '';
    if (!raw) return '';
    if (activeRecord) {
      try {
        return replaceTemplateVariables(raw, activeRecord, {
          name: profile.name,
          position: profile.position,
          email: profile.email,
        });
      } catch (e) {
        console.error('replaceTemplateVariables failed', e);
        return raw;
      }
    }
    return raw;
  }, [engineTemplate, activeRecord, profile.name, profile.position, profile.email]);

  const previewHtml = useMemo(() => {
    if (!previewContent) return '';
    let html = escapeHtml(previewContent);
    const radicadoVal = String(
      (activeRecord?.['RADICADO_SALIDA'] as string) ??
        (activeRecord?.radicadoSalida as string) ??
        ''
    ).trim();
    const fechaVal = (formatDateToSpanish(new Date()) || '').trim();
    if (radicadoVal && radicadoVal !== '—') {
      const esc = escapeRegExpStr(escapeHtml(radicadoVal));
      html = html.replace(
        new RegExp(esc, 'g'),
        `<span style="font-family: Arial, sans-serif; font-size: 10pt;">${escapeHtml(radicadoVal)}</span>`
      );
    }
    if (fechaVal && fechaVal !== '—') {
      const esc = escapeRegExpStr(escapeHtml(fechaVal));
      html = html.replace(
        new RegExp(esc, 'g'),
        `<span style="font-family: Arial, sans-serif; font-size: 10pt;">${escapeHtml(fechaVal)}</span>`
      );
    }
    html = html.replace(
      /(7200|7280)/g,
      '<span style="font-family: Arial, sans-serif; font-size: 7pt;">$1</span>'
    );
    return html;
  }, [previewContent, activeRecord]);

  useEffect(() => {
    let cancelled = false;
    const container = docWrapperRef.current;
    if (!container) return;
    container.innerHTML = '';
    if (!engineTemplate?.file || !activeRecord) return;
    setDocRendering(true);
    const file = engineTemplate.file as File;

    const run = async () => {
      try {
        const signatureBlob = await getSignatureBlob(profile.signatureUrl ?? null);

        let generatedBlob: Blob;
        if (signatureBlob) {
          const templateData = buildTemplateData(activeRecord, {
            name: profile.name,
            position: profile.position,
            email: profile.email,
          });
          generatedBlob = await generateDocx(file, templateData, {
            signatureBlob,
            signatureScale: profile.signatureScale ?? 100,
          });
        } else {
          const templateData = buildTemplateData(activeRecord, profile);
          generatedBlob = await generateDocx(file, templateData);
        }

        let buf: ArrayBuffer;
        const maybe = generatedBlob as unknown as { arrayBuffer?: () => Promise<ArrayBuffer> };
        if (typeof maybe.arrayBuffer === 'function') {
          buf = await maybe.arrayBuffer();
        } else {
          buf = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
            reader.readAsArrayBuffer(generatedBlob as unknown as Blob);
          });
        }
        if (cancelled || !docWrapperRef.current) return;

        const renderAsync: (buf: ArrayBuffer, el: HTMLElement) => Promise<void> = (
          docxPreview as Record<string, unknown>
        ).renderAsync as (buf: ArrayBuffer, el: HTMLElement) => Promise<void>;
        if (!renderAsync) throw new Error('renderAsync not found');
        docWrapperRef.current.innerHTML = '';
        await renderAsync(buf, docWrapperRef.current);
        if (cancelled || !docWrapperRef.current) return;
        await new Promise((r) => requestAnimationFrame(r));
        if (cancelled || !docWrapperRef.current) return;
        {
          const container = docWrapperRef.current;
          const sections = container.querySelectorAll('section.docx, section[class*="docx"]');
          sections.forEach((sec) => {
            (sec as HTMLElement).style.display = 'block';
            (sec as HTMLElement).style.marginBottom = '18px';
          });
          // Neutralización a nivel DOM (además del CSS): el fondo gris propio
          // de docx-preview no debe aparecer aunque falle la hoja de estilos.
          const libWrapper = container.querySelector('.docx-wrapper');
          const wrapperEl = (libWrapper ?? container) as HTMLElement;
          wrapperEl.style.background = 'transparent';
          wrapperEl.style.padding = '0';
          // Verificación: si el render no dejó contenido visible, se usa el
          // respaldo con los datos del registro en lugar de un visor vacío.
          const hasContent = sections.length > 0 || (container.textContent ?? '').trim().length > 0;
          if (!hasContent) throw new Error('docx-preview produced no visible content');
        }
      } catch (e) {
        console.error('docx-preview render failed, fallback to text', e);
        if (!cancelled) {
          setDocxRenderFailed(true);
        }
      } finally {
        if (!cancelled) setDocRendering(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [engineTemplate?.file, activeRecord, profile]);

  useEffect(() => {
    setDocxRenderFailed(false);
  }, [activeRid]);

  /* ── Actions ── */
  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    try {
      await generate();
      complete('generacion');
      if (visibleRecords.length === 1) {
        const rec = visibleRecords[0];
        const singleId = (rec as unknown as { rowId: string }).rowId ?? 'rec-0';
        downloadSingle(singleId);
      } else if (visibleRecords.length > 1) {
        await downloadAll();
      }
    } catch (e) {
      console.error('[GenerateView] generate failed', e);
    } finally {
      setIsGenerating(false);
    }
  }, [canGenerate, generate, complete, visibleRecords, downloadSingle, downloadAll]);

  const handleRetry = useCallback(async () => {
    setIsGenerating(true);
    try {
      await retryFailed();
    } catch (e) {
      console.error('[GenerateView] retryFailed', e);
    } finally {
      setIsGenerating(false);
    }
  }, [retryFailed]);

  const generateTitle = !hasSelectedRecord
    ? 'Selecciona un registro en el Módulo 3'
    : !engineTemplate
      ? 'Selecciona una plantilla del catálogo'
      : 'Generar documento';

  /* Bloque de respaldo con los datos del registro: garantiza que la vista
     previa nunca quede vacía cuando hay registro y plantilla. */
  const fallbackDataBlock = (testId: string) => {
    if (fallbackDataRows.length === 0) {
      return (
        <div className="dg-fallback-text">
          <span className="dg-fallback-empty">Sin contenido disponible</span>
        </div>
      );
    }
    return (
      <div className="dg-fallback-text dg-fallback-data" data-testid={testId}>
        <div className="dg-fallback-data-title">
          Datos del registro ·{' '}
          {assignedTemplate?.title ?? assignedTemplate?.fileName ?? 'Documento'}
        </div>
        <dl className="dg-fallback-data-list">
          {fallbackDataRows.map((r) => (
            <div key={r.key} className="dg-fallback-data-row">
              <dt>{humanizeKey(r.key)}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  };

  /* ═══════════ EMPTY (sin plantillas) ═══════════ */
  if (!templates || templates.length === 0)
    return (
      <div data-testid="generate-view" className="dg-root">
        <style>{dgStyles}</style>
        <div className="dg-header">
          <span className="dg-header-icon" aria-hidden>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </span>
          <div>
            <h2 className="dg-header-title">Módulo 4: Generación Documental</h2>
            <p className="dg-header-sub">Selecciona la plantilla, revisa el diseño y genera</p>
          </div>
        </div>
        <div className="dg-empty" data-testid="dg-empty">
          <div className="dg-empty-title">No hay plantillas disponibles</div>
          <div className="dg-empty-sub">
            Carga plantillas .docx en el Módulo 1 para verlas aquí.
          </div>
          <Button
            variant="primary"
            onClick={() => goTo('configuracion')}
            data-testid="dg-go-config"
          >
            Ir a Cargar Plantillas
          </Button>
        </div>
      </div>
    );

  /* ═══════════ MAIN ═══════════ */
  return (
    <div data-testid="generate-view" className="dg-root">
      <style>{dgStyles}</style>

      {/* Contenedor oculto para render de diseño */}
      <div
        ref={disenoHiddenRef}
        aria-hidden
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '800px',
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      />

      {/* ════ HEADER ════ */}
      <div className="dg-header">
        <span className="dg-header-icon" aria-hidden>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </span>
        <div className="dg-header-text">
          <h2 className="dg-header-title">Módulo 4: Generación Documental</h2>
          <p className="dg-header-sub">Selecciona la plantilla, revisa el diseño y genera</p>
        </div>
        <div className="dg-header-right">
          <button
            type="button"
            disabled={!canGenerate || isGenerating || stage === 'generando'}
            onClick={handleGenerate}
            data-testid="dg-generate-btn"
            title={generateTitle}
            className="dg-generate-btn"
          >
            <span className="dg-generate-btn-shine" aria-hidden />
            {isGenerating || stage === 'generando' ? (
              <svg
                className="dg-spin-icon"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <polyline points="9 14 12 17 15 14" />
              </svg>
            )}
            <span>
              {isGenerating || stage === 'generando' ? 'Generando documento…' : 'Generar documento'}
            </span>
          </button>
          {hasError && (stage === 'con_errores' || stage === 'finalizado') && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={isGenerating}
              data-testid="dg-retry-btn"
              title={`Reintentar documentos con error (${errorCount})`}
              className="dg-retry-btn"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Reintentar ({errorCount})
            </button>
          )}
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            data-testid="dg-build-template-btn"
            title="Aprende a crear tu propia plantilla de Word"
            className="dg-build-btn"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Construir mi plantilla
          </button>
          <button
            type="button"
            onClick={() => goTo('datos')}
            data-testid="dg-volver"
            className="dg-back-btn"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Volver
          </button>
        </div>
      </div>

      {/* ════ SOLICITANTE: franja bajo el banner ════ */}
      <ApplicantCard />

      {/* ════ LAYOUT 3 COLUMNAS ════ */}
      <div className="dg-layout" data-testid="dg-layout">
        {/* ════ LEFT: catálogo de plantillas ════ */}
        <section className="dg-card dg-templates" aria-label="Catálogo de plantillas">
          <div className="dg-panel-hdr">
            <span className="dg-panel-title">Plantillas</span>
            <Badge variant="info" style={{ fontSize: '0.6rem' }} data-testid="dg-count">
              {filteredTemplates.length}
            </Badge>
          </div>
          <div className="dg-panel-search">
            <Input
              placeholder="Buscar plantilla..."
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              aria-label="Buscar plantilla"
              data-testid="dg-search-input"
            />
          </div>
          {categories.length > 0 && (
            <div className="dg-cats" data-testid="dg-categories">
              <button
                type="button"
                onClick={() => setSelectedCategory('todas')}
                data-testid="dg-cat-todas"
                className={`dg-chip ${selectedCategory === 'todas' ? 'active' : ''}`}
              >
                Todas
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  data-testid={`dg-cat-${cat}`}
                  className={`dg-chip ${selectedCategory === cat ? 'active' : ''}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
          <div
            className="dg-list"
            ref={templateListRef}
            data-testid="dg-list"
            role="listbox"
            aria-label="Plantillas disponibles"
          >
            {filteredTemplates.length === 0 ? (
              <div className="dg-list-empty" data-testid="dg-empty-search">
                No se encontraron plantillas
              </div>
            ) : (
              paginatedTemplates.map((tpl, idx) => {
                const isActive = selectedTemplate?.id === tpl.id;
                const isAssigned = assignedTemplateId === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSelectTemplate(tpl.id)}
                    data-testid={`dg-card-${tpl.id}`}
                    className={`dg-tpl ${isActive ? 'active' : ''}`}
                    style={{ animationDelay: `${Math.min(idx, 7) * 35}ms` }}
                  >
                    <span className="dg-tpl-icon" aria-hidden>
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </span>
                    <span className="dg-tpl-info">
                      <span
                        className="dg-tpl-name"
                        title={tpl.title || tpl.fileName}
                        data-testid={`dg-title-${tpl.id}`}
                      >
                        {tpl.title || tpl.fileName}
                      </span>
                      <span className="dg-tpl-meta">
                        {tpl.category && <span>{tpl.category}</span>}
                        {isAssigned && <span className="dg-tpl-assigned">Asignada</span>}
                      </span>
                    </span>
                    {isActive && (
                      <svg
                        className="dg-tpl-check"
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
          {filteredTemplates.length > TEMPLATE_PAGE_SIZE && (
            <div className="dg-pagination" data-testid="dg-pagination">
              <button
                type="button"
                className="dg-page-arrow"
                disabled={templatePage <= 1}
                onClick={() => setTemplatePage((p) => Math.max(1, p - 1))}
                data-testid="dg-prev-page"
                aria-label="Página anterior"
              >
                ‹
              </button>
              <span className="dg-page-text" data-testid="dg-page-indicator">
                {templatePage}/{totalTemplatePages}
              </span>
              <button
                type="button"
                className="dg-page-arrow"
                disabled={templatePage >= totalTemplatePages}
                onClick={() => setTemplatePage((p) => Math.min(totalTemplatePages, p + 1))}
                data-testid="dg-next-page"
                aria-label="Página siguiente"
              >
                ›
              </button>
            </div>
          )}
        </section>

        {/* ════ CENTER: vista previa con modos ════ */}
        <section className="dg-card dg-preview-card" aria-label="Vista previa">
          <div className="dg-preview-hdr">
            <div
              className="dg-modes"
              role="tablist"
              aria-label="Modo de vista previa"
              data-mode={mode}
              onKeyDown={handleModeKeyDown}
            >
              <span className="dg-modes-pill" aria-hidden />
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'diseno'}
                tabIndex={mode === 'diseno' ? 0 : -1}
                onClick={() => switchMode('diseno')}
                data-testid="dg-mode-diseno"
                className="dg-mode-btn"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M12 19l7-7 3 3-7 7-3-3z" />
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                  <circle cx="11" cy="11" r="2" />
                </svg>
                Diseño de plantilla
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'documento'}
                tabIndex={mode === 'documento' ? 0 : -1}
                onClick={() => switchMode('documento')}
                data-testid="dg-mode-documento"
                className="dg-mode-btn"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <polyline points="9 15 11 17 15 13" />
                </svg>
                Documento generado
              </button>
            </div>
          </div>

          <div className="dg-viewer" data-testid="dg-viewer">
            {!selectedTemplate ? (
              <div className="dg-viewer-empty" data-testid="dg-preview-empty">
                <svg
                  width="52"
                  height="52"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--neutral-300)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <div className="dg-viewer-empty-title">Selecciona una plantilla</div>
                <div className="dg-viewer-empty-sub">
                  Elígela del catálogo para ver su diseño y el documento generado
                </div>
              </div>
            ) : (
              <div className="dg-views" data-active={mode}>
                {/* ── Vista: Diseño ── */}
                <div
                  className="dg-view"
                  role="tabpanel"
                  aria-label="Diseño de plantilla"
                  data-testid="dg-preview-diseno"
                  data-visible={mode === 'diseno'}
                  aria-hidden={mode !== 'diseno'}
                >
                  {/* Contenedor persistente: nunca se desmonta para que los
                      efectos de render conserven siempre un objetivo válido. */}
                  <div className="dg-viewer-inner">
                    <div
                      ref={disenoWrapperRef}
                      data-testid="dg-diseno-document"
                      className="dg-doc-layer"
                      style={
                        disenoRendering || showDisenoFallback ? { display: 'none' } : undefined
                      }
                    />
                    {disenoRendering && (
                      <div
                        className="dg-loading"
                        data-testid="dg-diseno-loading"
                        aria-label="Cargando diseño"
                      >
                        <div className="dg-skeleton" />
                        <div className="dg-skeleton dg-skeleton--short" />
                        <div className="dg-skeleton" />
                      </div>
                    )}
                    {!disenoRendering && showDisenoFallback && (
                      <div className="dg-fallback">
                        {disenoFallback ? (
                          <div className="dg-fallback-text" data-testid="dg-diseno-fallback">
                            {disenoFallback}
                          </div>
                        ) : (
                          fallbackDataBlock('dg-diseno-fallback')
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {/* ── Vista: Documento ── */}
                <div
                  className="dg-view"
                  role="tabpanel"
                  aria-label="Documento generado"
                  data-testid="dg-preview-documento"
                  data-visible={mode === 'documento'}
                  aria-hidden={mode !== 'documento'}
                >
                  {!hasSelectedRecord ? (
                    <div className="dg-viewer-empty" data-testid="dg-preview-empty-records">
                      <div className="dg-viewer-empty-title">Sin registro seleccionado</div>
                      <div className="dg-viewer-empty-sub">
                        Ve al Módulo 3 y selecciona el registro para generar su documento
                      </div>
                      <Button
                        variant="primary"
                        onClick={() => goTo('datos')}
                        data-testid="dg-go-datos"
                        style={{ marginTop: 8, fontSize: '0.74rem', height: 32 }}
                      >
                        Ir a Revisión de Datos
                      </Button>
                    </div>
                  ) : (
                    <div className="dg-viewer-inner">
                      {/* Contenedor persistente: nunca se desmonta para que el
                        efecto de render conserve siempre un objetivo válido. */}
                      <div
                        ref={docWrapperRef}
                        data-testid="dg-doc-container"
                        className="dg-doc-layer"
                        style={
                          docRendering || !engineTemplate?.file || docxRenderFailed
                            ? { display: 'none' }
                            : undefined
                        }
                      />
                      {docRendering && (
                        <div
                          className="dg-loading"
                          data-testid="dg-doc-loading"
                          aria-label="Generando vista previa"
                        >
                          <div className="dg-skeleton" />
                          <div className="dg-skeleton dg-skeleton--short" />
                          <div className="dg-skeleton" />
                        </div>
                      )}
                      {!docRendering && (!engineTemplate?.file || docxRenderFailed) && (
                        <div className="dg-fallback">
                          {previewHtml ? (
                            <div
                              data-testid="dg-fallback-content"
                              className="dg-fallback-text"
                              dangerouslySetInnerHTML={{ __html: previewHtml }}
                            />
                          ) : (
                            fallbackDataBlock('dg-fallback-content')
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ════ RIGHT: descripciones del documento ════ */}
        <aside
          className="dg-side"
          data-testid="dg-actions"
          aria-label="Descripciones del documento"
        >
          {/* Descripciones del documento + Mejorar texto */}
          <DescriptionsCard />
        </aside>
      </div>

      <BuildTemplateGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        folderHint={templateFolderPath ?? undefined}
      />
    </div>
  );
}

export default GenerateView;

/* ═══════════════════════════════════════════════════════════════
   STYLES — Módulo 4: Generación Documental
   Tokens del sistema (var(--*)) + acento ESSA. Motion budget:
   hover 120-150ms · tabs/paneles 200-250ms · shimmer 1.6s.
   ═══════════════════════════════════════════════════════════════ */
const dgStyles = `
  @keyframes dg-cardIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes dg-shimmer { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }

  .dg-root { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 100%; }

  /* ── Header ── */
  .dg-header { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; background: rgba(255,255,255,.95); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border: 1px solid var(--border); border-radius: 14px; box-shadow: 0 4px 6px -1px rgba(0,0,0,.05), 0 2px 4px -2px rgba(0,0,0,.05); padding: 10px 16px; }
  .dg-header-icon { width: 36px; height: 36px; border-radius: 10px; background-color: #eff6ff; display: inline-flex; align-items: center; justify-content: center; color: #3b82f6; flex-shrink: 0; }
  .dg-header-icon svg { width: 17px; height: 17px; }
  .dg-header-text { min-width: 0; margin-right: auto; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 2px; }
  .dg-header-title { font-size: 0.95rem; font-weight: 700; letter-spacing: -0.01em; color: #0f172a; margin: 0; line-height: 1.2; }
  .dg-header-sub { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 400; color: #64748b; margin: 0; }
  .dg-header-sub::before { content: "•"; color: #94a3b8; font-size: 0.9rem; line-height: 1; }
  .dg-header-right { display: flex; gap: 10px; align-items: center; flex-shrink: 0; margin-left: auto; }
  .dg-build-btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; border: none; border-radius: 9999px; background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); box-shadow: 0 4px 15px rgba(37,99,235,.3); color: #fff; font-size: 0.78rem; font-weight: 600; font-family: inherit; cursor: pointer; white-space: nowrap; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
  .dg-build-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(37,99,235,.45); }
  .dg-build-btn:active { transform: translateY(0) scale(0.98); }
  .dg-build-btn:focus-visible { outline: 2px solid #93c5fd; outline-offset: 2px; }
  .dg-back-btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 9999px; background: transparent; color: #0f172a; border: 1px solid #cbd5e1; font-size: 0.78rem; font-weight: 600; font-family: inherit; cursor: pointer; white-space: nowrap; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
  .dg-back-btn svg { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); color: #64748b; }
  .dg-back-btn:hover { background: #fff; border-color: #94a3b8; box-shadow: 0 4px 12px rgba(0,0,0,.06); }
  .dg-back-btn:hover svg { color: #0f172a; transform: translateX(-4px); }
  .dg-back-btn:focus-visible { outline: 2px solid #93c5fd; outline-offset: 2px; }

  /* ── Layout ── */
  .dg-layout { display: grid; grid-template-columns: 264px minmax(0, 1fr) 300px; gap: 12px; align-items: stretch; }
  @media (max-width: 1100px) {
    .dg-layout { grid-template-columns: 240px minmax(0, 1fr); }
    .dg-side { grid-column: 1 / -1; }
  }
  @media (max-width: 860px) {
    .dg-layout { grid-template-columns: minmax(0, 1fr); }
    .dg-side { grid-column: auto; }
    .dg-header-right { width: 100%; justify-content: flex-start; }
  }

  /* ── Cards ── */
  .dg-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-sm); overflow: hidden; display: flex; flex-direction: column; min-height: 0; }
  .dg-panel-hdr { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--border); background: linear-gradient(180deg, var(--neutral-50) 0%, #f1f5f9 100%); flex-shrink: 0; }
  .dg-panel-title { font-size: 0.74rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--neutral-600); }
  .dg-panel-step { font-size: 0.6rem; font-weight: 700; color: var(--neutral-500); background: var(--bg-card); border: 1px solid var(--border); border-radius: 999px; padding: 2px 8px; white-space: nowrap; }

  /* ── Templates panel ── */
  .dg-templates { min-height: 0; }
  @media (max-width: 1100px) {
    .dg-templates { max-height: 640px; }
  }
  .dg-panel-search { padding: 8px 10px 4px; flex-shrink: 0; }
  .dg-cats { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; padding: 6px 10px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .dg-cats::-webkit-scrollbar { display: none; }
  .dg-chip { font-size: 0.62rem; font-weight: 700; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--neutral-200); background: var(--white); color: var(--neutral-600); white-space: nowrap; cursor: pointer; transition: border-color 150ms var(--ease), color 150ms var(--ease), background 150ms var(--ease), box-shadow 150ms var(--ease); }
  .dg-chip:hover { border-color: var(--essa-primary); color: var(--essa-primary); box-shadow: 0 1px 4px rgba(0,75,147,.1); }
  .dg-chip.active { background: var(--essa-primary); border-color: var(--essa-primary); color: #fff; box-shadow: 0 2px 6px rgba(0,75,147,.25); }
  .dg-chip:focus-visible { outline: 2px solid #93c5fd; outline-offset: 1px; }
  .dg-list { flex: 1 1 auto; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 5px; min-height: 120px; }
  .dg-list::-webkit-scrollbar { width: 5px; }
  .dg-list::-webkit-scrollbar-thumb { background: var(--neutral-300); border-radius: 999px; }
  .dg-list-empty { text-align: center; padding: 20px 8px; color: var(--neutral-400); font-size: 0.72rem; }
  .dg-tpl { display: flex; align-items: center; gap: 9px; padding: 9px 10px; border-radius: var(--radius-sm); border: 1.5px solid var(--border); background: var(--white); cursor: pointer; text-align: left; width: 100%; transition: border-color 150ms var(--ease), background 150ms var(--ease), transform 150ms var(--ease), box-shadow 150ms var(--ease); animation: dg-cardIn 260ms var(--ease) both; }
  .dg-tpl:hover { border-color: #93c5fd; background: linear-gradient(180deg, #ffffff 0%, var(--essa-primary-50) 100%); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,75,147,.1); }
  .dg-tpl:active { transform: translateY(0) scale(0.99); }
  .dg-tpl.active { border-color: var(--essa-primary); background: var(--essa-primary-50); box-shadow: 0 0 0 1px rgba(0,75,147,.14), 0 3px 10px rgba(0,75,147,.1); }
  .dg-tpl:focus-visible { outline: 2px solid #93c5fd; outline-offset: 1px; }
  .dg-tpl-icon { width: 26px; height: 26px; border-radius: 7px; background: var(--neutral-100); color: var(--neutral-500); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 150ms var(--ease), color 150ms var(--ease); }
  .dg-tpl.active .dg-tpl-icon { background: #dbeafe; color: var(--essa-primary); }
  .dg-tpl-info { flex: 1; min-width: 0; }
  .dg-tpl-name { display: block; font-size: 0.72rem; font-weight: 700; color: var(--neutral-900); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dg-tpl.active .dg-tpl-name { color: var(--essa-primary); }
  .dg-tpl-meta { display: flex; gap: 6px; align-items: center; font-size: 0.6rem; color: var(--neutral-500); margin-top: 2px; }
  .dg-tpl-assigned { color: var(--success); font-weight: 800; }
  .dg-tpl-check { color: var(--essa-primary); flex-shrink: 0; }
  .dg-pagination { display: flex; align-items: center; justify-content: space-between; padding: 7px 10px; border-top: 1px solid var(--border); background: var(--neutral-50); flex-shrink: 0; }
  .dg-page-arrow { width: 26px; height: 26px; border-radius: var(--radius-xs); border: 1px solid var(--border); background: var(--white); color: var(--neutral-600); cursor: pointer; font-size: 0.85rem; line-height: 1; transition: border-color 120ms var(--ease), color 120ms var(--ease), background 120ms var(--ease); }
  .dg-page-arrow:hover:not(:disabled) { border-color: var(--essa-primary); color: var(--essa-primary); background: var(--essa-primary-50); }
  .dg-page-arrow:disabled { opacity: 0.35; cursor: default; }
  .dg-page-arrow:focus-visible { outline: 2px solid #93c5fd; outline-offset: 1px; }
  .dg-page-text { font-size: 0.68rem; font-weight: 700; color: var(--neutral-600); }

  /* ── Preview card ── */
  .dg-preview-card { min-height: 560px; }
  .dg-preview-hdr { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 10px 12px; border-bottom: 1px solid var(--border); background: linear-gradient(180deg, var(--neutral-50) 0%, #f1f5f9 100%); flex-shrink: 0; flex-wrap: wrap; }
  .dg-modes { position: relative; display: inline-flex; align-items: stretch; width: auto; max-width: 100%; background: rgba(255,255,255,.7); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,1); outline: 1px solid var(--border); border-radius: 999px; padding: 4px; isolation: isolate; box-shadow: 0 10px 30px rgba(0,0,0,.05), inset 0 2px 5px rgba(255,255,255,.8); }
  .dg-modes-pill { position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc(50% - 4px); border-radius: 999px; pointer-events: none; z-index: 0; background: linear-gradient(135deg, #3b82f6, #2563eb); box-shadow: 0 6px 16px rgba(37,99,235,.35); will-change: transform; transition: transform 0.45s cubic-bezier(0.34, 1.3, 0.64, 1), opacity 0.3s ease, box-shadow 0.3s ease; }
  .dg-modes-pill::after { content: ""; position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(135deg, #10b981, #059669); opacity: 0; transition: opacity 0.3s ease; }
  .dg-modes[data-mode="diseno"] .dg-modes-pill { transform: translate3d(0, 0, 0); box-shadow: 0 6px 16px rgba(37,99,235,.35); }
  .dg-modes[data-mode="diseno"] .dg-modes-pill::after { opacity: 0; }
  .dg-modes[data-mode="documento"] .dg-modes-pill { transform: translate3d(100%, 0, 0); box-shadow: 0 6px 16px rgba(16,185,129,.35); }
  .dg-modes[data-mode="documento"] .dg-modes-pill::after { opacity: 1; }
  .dg-mode-btn { position: relative; z-index: 1; flex: 1 1 0; min-width: 0; display: inline-flex; align-items: center; justify-content: center; text-align: center; gap: 7px; border: none; background: transparent; padding: 8px 16px; border-radius: 999px; font-size: 0.72rem; font-weight: 600; line-height: 1.2; letter-spacing: 0.01em; color: #64748b; cursor: pointer; white-space: nowrap; user-select: none; transition: color 0.25s ease; font-family: inherit; }
  .dg-mode-btn svg { width: 13px; height: 13px; flex-shrink: 0; transition: transform 0.35s cubic-bezier(0.34, 1.3, 0.64, 1); }
  .dg-mode-btn:hover { color: #334155; }
  .dg-mode-btn[aria-selected="true"] { color: #fff; }
  .dg-mode-btn[data-testid="dg-mode-diseno"][aria-selected="true"] svg { transform: scale(1.15) rotate(-5deg); }
  .dg-mode-btn[data-testid="dg-mode-documento"][aria-selected="true"] svg { transform: scale(1.15) rotate(5deg); }
  .dg-mode-btn:active { transform: scale(0.97); }
  .dg-mode-btn:focus-visible { outline: 2px solid #93c5fd; outline-offset: 2px; }
  @media (max-width: 600px) {
    .dg-mode-btn { font-size: 0.68rem; padding: 7px 12px; gap: 6px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .dg-modes-pill, .dg-modes-pill::after, .dg-mode-btn, .dg-mode-btn svg { transition: none; }
  }

  .dg-viewer { position: relative; background: linear-gradient(180deg, #f7f9fc 0%, #edf1f6 100%); min-height: 500px; max-height: 640px; overflow-y: auto; overflow-x: auto; flex: 1 1 auto; border-top: 1px solid var(--neutral-100); }
  .dg-viewer::-webkit-scrollbar { width: 8px; height: 8px; }
  .dg-viewer::-webkit-scrollbar-thumb { background: var(--neutral-300); border-radius: 999px; }
  .dg-views { display: grid; min-height: 500px; }
  .dg-view { grid-area: 1 / 1; display: flex; flex-direction: column; align-items: stretch; opacity: 0; transform: translateY(10px); visibility: hidden; pointer-events: none; transition: opacity 220ms ease-out, transform 220ms ease-out, visibility 0ms linear 220ms; }
  .dg-view[data-visible="true"] { opacity: 1; transform: translateY(0); visibility: visible; pointer-events: auto; transition: opacity 220ms ease-out, transform 220ms ease-out, visibility 0ms; }
  .dg-viewer-inner { display: block; width: 100%; padding: 30px 24px 34px; }
  .dg-doc-layer { display: block; width: 100%; }
  /* ── Hojas de documento unificadas: ambos modos usan el mismo pipeline de
     docx-preview, por lo que las secciones conservan su ancho intrínseco
     (pageSize del Word) y se centran igual en los dos modos. ── */
  .dg-viewer-page { scroll-margin-top: 20px; margin: 0 auto 22px; background: #fff; border-radius: 5px; box-shadow: 0 8px 30px rgba(15,23,42,.14), 0 2px 8px rgba(15,23,42,.08); }
  .dg-viewer-page > section { margin: 0 !important; box-shadow: none !important; border-radius: 5px !important; }
  /* ── Normalización del contenedor propio de docx-preview (idéntica en ambos modos) ── */
  .dg-viewer-inner .docx-wrapper, .dg-doc-layer .docx-wrapper { display: block !important; width: 100% !important; background: transparent !important; padding: 0 !important; margin: 0 auto !important; box-shadow: none !important; border: none !important; }
  .dg-viewer-inner .docx-wrapper > section.docx, .dg-doc-layer .docx-wrapper > section.docx,
  .dg-viewer-inner .docx-wrapper > section[class*="docx"], .dg-doc-layer .docx-wrapper > section[class*="docx"] { display: block !important; margin: 0 auto 22px !important; box-shadow: 0 8px 30px rgba(15,23,42,.14), 0 2px 8px rgba(15,23,42,.08) !important; border-radius: 5px !important; background: #ffffff !important; overflow: hidden; }
  .dg-viewer-inner .docx-wrapper > section.docx:last-child, .dg-doc-layer .docx-wrapper > section.docx:last-child { margin-bottom: 0 !important; }
  .dg-fallback { display: flex; justify-content: center; padding: 26px 20px; width: 100%; }
  .dg-fallback .dg-fallback-text, .dg-fallback-text { background: var(--white); padding: 26px 30px; box-shadow: 0 4px 20px rgba(0,0,0,.08); border-radius: 4px; min-height: 220px; max-width: 600px; width: 100%; font-family: Georgia, "Times New Roman", serif; font-size: 11px; line-height: 1.75; color: var(--neutral-900); white-space: pre-wrap; word-break: break-word; }
  .dg-fallback-empty { color: var(--neutral-400); font-style: italic; font-family: inherit; }
  .dg-fallback-data { font-family: inherit; }
  .dg-fallback-data-title { font-size: 0.78rem; font-weight: 800; color: var(--essa-primary); margin-bottom: 10px; }
  .dg-fallback-data-list { display: flex; flex-direction: column; gap: 0; margin: 0; }
  .dg-fallback-data-row { display: grid; grid-template-columns: 170px minmax(0, 1fr); gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--neutral-100); font-size: 0.74rem; }
  .dg-fallback-data-row:last-child { border-bottom: none; }
  .dg-fallback-data-row dt { color: var(--neutral-500); font-weight: 600; }
  .dg-fallback-data-row dd { margin: 0; color: var(--neutral-900); font-weight: 600; word-break: break-word; }
  .dg-viewer-empty { margin: auto; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 24px; text-align: center; gap: 2px; }
  .dg-viewer-empty-title { font-size: 0.92rem; font-weight: 800; color: var(--neutral-600); margin-top: 10px; }
  .dg-viewer-empty-sub { font-size: 0.74rem; color: var(--neutral-400); margin-top: 4px; max-width: 320px; }
  .dg-loading { display: flex; flex-direction: column; gap: 12px; padding: 30px; max-width: 620px; width: 100%; margin: 0 auto; }
  .dg-skeleton { height: 14px; border-radius: 7px; background: var(--neutral-200); animation: dg-shimmer 1.6s ease-in-out infinite; }
  .dg-skeleton--short { width: 55%; }

  /* ── Right side ── */
  .dg-side { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
  /* ── Botón principal Generar documento ── */
  @keyframes dg-btn-shine { 0% { transform: translateX(-130%) skewX(-12deg); opacity: 0; } 12% { opacity: 1; } 55% { transform: translateX(130%) skewX(-12deg); opacity: 0; } 100% { transform: translateX(130%) skewX(-12deg); opacity: 0; } }
  @keyframes dg-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .dg-generate-btn { position: relative; overflow: hidden; isolation: isolate; display: flex; align-items: center; justify-content: center; gap: 9px; width: calc(100% - 28px); margin: 14px 14px 0; height: 48px; border-radius: 12px; border: 1px solid #1e3a8a; background: linear-gradient(135deg, #0b2a5b 0%, #004B93 48%, #0e6ad1 100%); color: #fff; font-size: 0.9rem; font-weight: 800; letter-spacing: 0.01em; cursor: pointer; font-family: inherit; box-shadow: 0 6px 16px rgba(0,75,147,.3), 0 0 0 1px rgba(255,255,255,.12) inset, 0 1px 0 rgba(255,255,255,.16) inset; transition: transform 180ms var(--ease), box-shadow 180ms var(--ease), filter 180ms var(--ease); }
  .dg-generate-btn-shine { position: absolute; inset: 0; background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,.28) 50%, transparent 65%); transform: translateX(-130%) skewX(-12deg); animation: dg-btn-shine 3.2s ease-in-out infinite; pointer-events: none; }
  .dg-generate-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.07); box-shadow: 0 10px 24px rgba(0,75,147,.36), 0 0 0 1px rgba(255,255,255,.14) inset, 0 0 16px rgba(59,130,246,.25); }
  .dg-generate-btn:active:not(:disabled) { transform: translateY(0) scale(0.98); box-shadow: 0 3px 10px rgba(0,75,147,.28); }
  .dg-generate-btn:disabled { opacity: 0.55; cursor: not-allowed; filter: grayscale(0.35); box-shadow: none; }
  .dg-generate-btn:disabled .dg-generate-btn-shine { display: none; }
  .dg-generate-btn:focus-visible { outline: 2px solid #93c5fd; outline-offset: 2px; }
  .dg-generate-btn svg { flex-shrink: 0; }
  .dg-header .dg-generate-btn { width: auto; margin: 0; height: auto; padding: 8px 16px; font-size: 0.78rem; font-weight: 600; border-radius: 9999px; flex-shrink: 0; border: none; background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); box-shadow: 0 4px 15px rgba(30,58,138,.25); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
  .dg-header .dg-generate-btn:hover:not(:disabled) { transform: translateY(-2px); filter: none; box-shadow: 0 6px 20px rgba(30,58,138,.4); }
  .dg-header .dg-generate-btn:active:not(:disabled) { transform: translateY(0) scale(0.98); }
  .dg-header .dg-retry-btn { display: inline-flex; align-items: center; gap: 6px; height: auto; padding: 8px 14px; border-radius: 9999px; border: 1px solid #fca5a5; background: #fef2f2; color: #991b1b; font-size: 0.75rem; font-weight: 700; font-family: inherit; cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: background 150ms var(--ease), transform 120ms var(--ease); }
  .dg-header .dg-retry-btn:hover:not(:disabled) { background: #fee2e2; transform: translateY(-1px); }
  .dg-header .dg-retry-btn:active:not(:disabled) { transform: scale(0.97); }
  .dg-header .dg-retry-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .dg-header .dg-retry-btn:focus-visible { outline: 2px solid #fca5a5; outline-offset: 2px; }
  .dg-spin-icon { animation: dg-rotate 0.9s linear infinite; }

  /* ── Empty state (sin plantillas) ── */
  .dg-empty { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 56px 28px; text-align: center; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .dg-empty-title { font-size: 1rem; font-weight: 800; color: var(--neutral-700); }
  .dg-empty-sub { font-size: 0.82rem; color: var(--neutral-500); margin-bottom: 12px; }

  @media (prefers-reduced-motion: reduce) {
    .dg-view { transition: none; opacity: 1; transform: none; }
    .dg-view:not([data-visible="true"]) { display: none; }
    .dg-tpl { animation: none; }
    .dg-tpl:hover { transform: none; }
    .dg-build-btn:hover { transform: none; }
    .dg-skeleton { animation: none; }
    .dg-modes-pill { transition: none; }
    .dg-generate-btn-shine, .dg-spin-icon { animation: none; }
    .dg-generate-btn:hover:not(:disabled) { transform: none; }
  }
`;

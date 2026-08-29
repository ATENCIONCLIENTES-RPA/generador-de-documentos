import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as docxPreview from 'docx-preview';
import { useGeneration } from '@/hooks/useGeneration';
import { GenerationStageIndicator } from '@/components/features/GenerationStageIndicator';
import { useProfileStore } from '@/store/profileStore';
import { generateDocx, buildTemplateData, replaceTemplateVariables } from '@/utils/templateEngine';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { Record as EssaRecord } from '@/types/record';

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

type DocStatus = 'pending' | 'success' | 'error' | 'generating';

function statusConfig(status: DocStatus, stage: string) {
  if (status === 'success')
    return {
      label: 'Completado',
      bg: 'var(--success-50)',
      color: '#065f46',
      border: '#a7f3d0',
      icon: (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
    };
  if (status === 'error')
    return {
      label: 'Error',
      bg: 'var(--danger-50)',
      color: '#991b1b',
      border: '#fecaca',
      icon: (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ),
    };
  if (status === 'generating' || (status === 'pending' && stage === 'generando')) {
    return {
      label: 'Generando',
      bg: '#eff6ff',
      color: '#1e40af',
      border: '#bfdbfe',
      icon: (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="gv-spin"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ),
    };
  }
  return {
    label: 'Pendiente',
    bg: 'var(--neutral-100)',
    color: '#475569',
    border: '#e2e8f0',
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  };
}

export function GenerateView({ onAddHistory }: GenerateViewProps) {
  const profile = useProfileStore((s) => s.profile);
  const [activeIdx, setActiveIdx] = useState(0);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [statusFilter] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [docxRenderFailed, setDocxRenderFailed] = useState(false);

  // zoom state for preview
  const [zoom, setZoom] = useState(100);

  // excluded documents (local to this session, does not modify dataStore)
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  // confirm modal state
  const [confirmRemove, setConfirmRemove] = useState<{
    open: boolean;
    rid: string;
    name: string;
  }>({ open: false, rid: '', name: '' });

  const {
    stage,
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
  } = useGeneration({ onAddHistory, excludedIds });

  const previewRef = useRef<HTMLDivElement>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  // items combined with status — exclude removed docs
  const combined = useMemo(() => {
    return selectedRecords
      .map((rec, i) => {
        const rid = (rec as unknown as { rowId: string }).rowId ?? `rec-${i}`;
        const found = docResults.find((r) => r.id === rid || r.recordId === rid);
        const st: DocStatus = found ? (found.status as DocStatus) : 'pending';
        return { rec, rid, status: st };
      })
      .filter((item) => !excludedIds.has(item.rid));
  }, [selectedRecords, docResults, excludedIds]);

  // counts
  const counts = useMemo(() => {
    let pending = 0;
    let completed = 0;
    let errores = 0;
    let generating = 0;
    for (const c of combined) {
      if (c.status === 'pending') pending++;
      else if (c.status === 'success') completed++;
      else if (c.status === 'error') errores++;
      else if (c.status === 'generating') generating++;
    }
    return { total: combined.length, pending, completed, errores, generating };
  }, [combined]);

  // filtered list
  const filtered = useMemo(() => {
    let out = combined;
    const q = sidebarSearch.trim().toLowerCase();
    if (q) {
      out = out.filter(({ rec }) => {
        const hay = [
          String(rec.numeroCuenta ?? rec.cuenta ?? ''),
          String(rec.radicadoEntrada ?? ''),
          String(rec.nombreSolicitante ?? ''),
          String(rec.numeroProceso ?? ''),
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    if (statusFilter !== 'all') {
      out = out.filter((c) => c.status === statusFilter);
    }
    return out;
  }, [combined, sidebarSearch, statusFilter]);

  // keep activeIdx within bounds
  useEffect(() => {
    if (filtered.length === 0) return;
    if (activeIdx >= filtered.length) setActiveIdx(Math.max(0, filtered.length - 1));
  }, [filtered.length, activeIdx]);

  const activeItem = filtered[activeIdx] ?? combined[activeIdx] ?? combined[0] ?? null;
  const activeRecord: EssaRecord | null = activeItem ? (activeItem.rec as EssaRecord) : null;

  const documentoIndicator = useMemo(() => {
    if (combined.length === 0) return '0 de 0';
    const list = filtered.length > 0 ? filtered : combined;
    const currentPos = Math.min(activeIdx + 1, list.length);
    return `${currentPos} de ${list.length}`;
  }, [activeIdx, filtered.length, combined.length]);

  const isSingle = visibleRecords.length === 1;

  // -- zoom controls --
  const zoomIn = useCallback(() => setZoom((z) => Math.min(z + 15, 200)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(z - 15, 40)), []);
  const zoomReset = useCallback(() => setZoom(100), []);

  // -- remove document --
  const requestRemove = useCallback((rid: string, name: string) => {
    setConfirmRemove({ open: true, rid, name });
  }, []);

  const confirmRemoveDoc = useCallback(() => {
    const { rid } = confirmRemove;
    if (!rid) return;

    const wasActive = activeItem?.rid === rid;
    setExcludedIds((prev) => {
      const next = new Set(prev);
      next.add(rid);
      return next;
    });

    // if the removed doc was the active one, the useEffect on filtered.length
    // will auto-adjust activeIdx. If it was the last item, we need to go back.
    if (wasActive && filtered.length <= 1) {
      setActiveIdx(0);
    } else if (wasActive) {
      setActiveIdx((i) => Math.max(0, i - 1));
    }

    setConfirmRemove({ open: false, rid: '', name: '' });
  }, [confirmRemove, activeItem, filtered.length]);

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    try {
      await generate();
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
  }, [canGenerate, generate, visibleRecords, downloadSingle, downloadAll]);

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

  // fallback preview rendering text
  const previewContent = useMemo(() => {
    if (!selectedTemplate) return '';
    const raw = selectedTemplate.sampleContent ?? '';
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
  }, [selectedTemplate, activeRecord, profile.name, profile.position, profile.email]);

  // docx-preview rendering
  useEffect(() => {
    let cancelled = false;
    const container = docxContainerRef.current;
    if (!container) return;
    container.innerHTML = '';
    if (!selectedTemplate?.file || !activeRecord) return;
    const file = selectedTemplate.file as File;

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
          generatedBlob = await generateDocx(file, templateData, { signatureBlob });
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
        if (cancelled || !docxContainerRef.current) return;

        const renderAsync: (buf: ArrayBuffer, el: HTMLElement) => Promise<void> = (
          docxPreview as Record<string, unknown>
        ).renderAsync as (buf: ArrayBuffer, el: HTMLElement) => Promise<void>;
        if (!renderAsync) throw new Error('renderAsync not found');
        docxContainerRef.current.innerHTML = '';
        await renderAsync(buf, docxContainerRef.current);
      } catch (e) {
        console.error('docx-preview render failed, fallback to text', e);
        if (!cancelled) setDocxRenderFailed(true);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [selectedTemplate?.file, activeRecord, profile]);

  // reset zoom on document change
  useEffect(() => {
    setZoom(100);
    setDocxRenderFailed(false);
  }, [activeItem?.rid]);

  const hasError = counts.errores > 0;

  const showEmptyRecords = selectedRecords.length === 0 || combined.length === 0;
  const showEmptyTemplate = !selectedTemplate;

  return (
    <div data-testid="generate-view" className="gv-root">
      <style>{`
        /* ── Global spin animation ── */
        @keyframes gv-spin-anim { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .gv-spin { animation: gv-spin-anim 0.8s linear infinite; }

        /* ── Root ── */
        .gv-root {
          display: flex;
          flex-direction: column;
          gap: 14px;
          width: 100%;
          max-width: 100%;
          overflow: hidden;
        }

        /* ── Header ── */
        .gv-header {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: space-between;
        }
        .gv-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .gv-header-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #eff6ff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--essa-primary);
          flex-shrink: 0;
        }
        .gv-header-title {
          font-size: 1.15rem;
          font-weight: 900;
          color: var(--neutral-900);
          margin: 0;
          line-height: 1.15;
          white-space: nowrap;
        }
        .gv-header-sub {
          font-size: 0.78rem;
          color: var(--neutral-500);
          margin: 0;
        }
        .gv-header-right {
          display: flex;
          gap: 6px;
          align-items: center;
          flex-shrink: 0;
        }
        .gv-doc-badge {
          font-size: 0.74rem;
          font-weight: 800;
          color: var(--neutral-600);
          background: var(--neutral-50);
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 5px 11px;
          white-space: nowrap;
        }

        /* ── Toolbar ── */
        .gv-toolbar {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 10px 14px;
          box-shadow: var(--shadow-xs);
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .gv-toolbar-search {
          flex: 1 1 300px;
          min-width: 200px;
        }
        .gv-toolbar-info {
          font-size: 0.74rem;
          color: var(--neutral-600);
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          flex-shrink: 0;
        }
        .gv-toolbar-label {
          font-weight: 800;
        }
        .gv-toolbar-tag {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 999px;
          padding: 3px 10px;
          font-weight: 700;
          color: #1e40af;
          font-size: 0.73rem;
          white-space: nowrap;
        }

        /* ── 3-panel layout ── */
        .gv-layout {
          display: grid;
          grid-template-columns: minmax(240px, 280px) 1fr minmax(220px, 270px);
          gap: 14px;
          align-items: start;
          min-height: 0;
        }
        @media (max-width: 1100px) {
          .gv-layout {
            grid-template-columns: 240px 1fr;
          }
          .gv-layout .gv-actions { grid-column: 1 / -1; }
        }
        @media (max-width: 860px) {
          .gv-layout {
            grid-template-columns: 1fr;
          }
        }

        /* ── Card ── */
        .gv-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        /* ── Card Header ── */
        .gv-card-header {
          padding: 11px 14px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          background: var(--neutral-50);
          flex-shrink: 0;
        }
        .gv-card-title {
          font-size: 0.8rem;
          font-weight: 800;
          color: var(--neutral-700);
          white-space: nowrap;
        }
        .gv-card-count {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--neutral-500);
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 2px 8px;
          white-space: nowrap;
        }

        /* ── Sidebar list ── */
        .gv-sidebar-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: calc(100vh - 320px);
          min-height: 400px;
        }
        .gv-sidebar-item {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 9px 10px;
          border-radius: var(--radius-sm);
          border: 1px solid transparent;
          border-left: 3px solid transparent;
          cursor: pointer;
          transition: all 150ms var(--ease);
          text-align: left;
          width: 100%;
          background: var(--bg-card);
          position: relative;
        }
        .gv-sidebar-item:hover {
          background: var(--neutral-50);
          border-color: var(--border);
          border-left-color: var(--neutral-300);
        }
        .gv-sidebar-item--active {
          background: #EBF5FF !important;
          border-color: #bfdbfe !important;
          border-left-color: var(--essa-primary) !important;
          box-shadow: 0 0 0 1px rgba(0,75,147,0.06);
        }
        .gv-sidebar-item-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-weight: 800;
        }
        .gv-sidebar-item-body {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .gv-sidebar-item-name {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--neutral-800);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .gv-sidebar-item-meta {
          font-size: 0.7rem;
          color: var(--neutral-500);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .gv-sidebar-item-status {
          display: inline-flex;
          margin-top: 3px;
          font-size: 0.63rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 2px 7px;
          border-radius: 999px;
          width: fit-content;
        }
        .gv-sidebar-remove {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: var(--neutral-400);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          opacity: 0;
          transition: all 150ms var(--ease);
        }
        .gv-sidebar-item:hover .gv-sidebar-remove {
          opacity: 1;
        }
        .gv-sidebar-remove:hover {
          background: var(--danger-50);
          color: var(--danger);
        }

        /* ── Sidebar footer ── */
        .gv-sidebar-footer {
          padding: 9px 12px;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .gv-sidebar-indicator {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--neutral-500);
        }
        .gv-nav-btn {
          width: 30px;
          height: 30px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: var(--bg-card);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--neutral-600);
          cursor: pointer;
          transition: all 150ms var(--ease);
        }
        .gv-nav-btn:hover:not(:disabled) {
          background: var(--neutral-50);
          border-color: var(--neutral-300);
        }
        .gv-nav-btn:disabled {
          opacity: 0.4;
          cursor: default;
        }

        /* ── Preview panel ── */
        .gv-preview {
          background: var(--neutral-100);
          overflow: hidden;
          padding: 16px;
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          min-height: 400px;
          position: relative;
        }
        .gv-preview-scroll {
          width: 100%;
          height: 100%;
          overflow: auto;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }
        .gv-preview-inner {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          transition: transform 200ms var(--ease);
          transform-origin: top center;
        }
        .gv-preview .docx-wrapper {
          background: transparent !important;
          padding: 0 !important;
        }
        .gv-preview .docx-wrapper > section.docx {
          margin: 0 auto !important;
          box-shadow: 0 4px 24px rgba(0,0,0,0.1) !important;
          border-radius: 4px !important;
          background: #ffffff !important;
          max-width: 100% !important;
        }

        /* ── Zoom controls ── */
        .gv-zoom-bar {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .gv-zoom-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: var(--bg-card);
          color: var(--neutral-600);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 150ms var(--ease);
          font-size: 0.85rem;
          font-weight: 700;
        }
        .gv-zoom-btn:hover {
          background: var(--neutral-50);
          border-color: var(--neutral-300);
        }
        .gv-zoom-label {
          font-size: 0.7rem;
          font-weight: 800;
          color: var(--neutral-500);
          min-width: 36px;
          text-align: center;
          user-select: none;
        }

        /* ── Progress ── */
        .gv-progress-track {
          width: 100%;
          height: 8px;
          background: var(--neutral-200);
          border-radius: 999px;
          overflow: hidden;
          border: 1px solid var(--neutral-200);
          padding: 1px;
        }
        .gv-progress-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.3s ease;
          background: linear-gradient(90deg, #3b82f6, var(--essa-primary));
        }
        .gv-progress-fill.done {
          background: linear-gradient(90deg, #10b981, #059669);
        }

        /* ── Summary card ── */
        .gv-summary {
          background: var(--neutral-50);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 12px 13px;
          font-size: 0.82rem;
          color: var(--neutral-700);
        }
        .gv-summary-title {
          font-weight: 800;
          margin-bottom: 4px;
          font-size: 0.82rem;
        }
        .gv-summary-detail {
          font-size: 0.74rem;
          color: var(--neutral-500);
          margin-top: 4px;
        }
        .gv-gate-warning {
          margin-top: 8px;
          font-size: 0.74rem;
          color: #b45309;
          background: var(--warning-50);
          border: 1px solid #fde68a;
          border-radius: var(--radius-sm);
          padding: 8px 10px;
        }

        /* ── Empty states ── */
        .gv-empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          text-align: center;
          color: var(--neutral-500);
          font-size: 0.88rem;
        }

        /* ── Fallback text preview ── */
        .gv-fallback {
          background: var(--bg-card);
          padding: 28px 32px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          border-radius: 4px;
          min-height: 320px;
        }
        .gv-fallback-text {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 11px;
          line-height: 1.7;
          color: #1e293b;
          white-space: pre-wrap;
          word-break: break-word;
        }

        /* ── Responsive ── */
        @media (max-width: 1100px) {
          .gv-sidebar-list { max-height: 350px; min-height: 300px; }
        }
        @media (max-width: 860px) {
          .gv-sidebar-list { max-height: 300px; min-height: 250px; }
          .gv-preview { min-height: 350px; }
        }

        /* ── Confirm modal ── */
        .gv-confirm-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .gv-confirm-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--warning-50);
          border: 1px solid #fde68a;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--warning);
          flex-shrink: 0;
        }
        .gv-confirm-text {
          font-size: 0.88rem;
          color: var(--neutral-700);
          line-height: 1.5;
        }
        .gv-confirm-text strong {
          color: var(--neutral-900);
        }
        .gv-confirm-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
      `}</style>

      {/* ── Header ── */}
      <div className="gv-header">
        <div className="gv-header-left">
          <span className="gv-header-icon" aria-hidden>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--essa-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </span>
          <div>
            <h2 className="gv-header-title">Módulo 5: Generación Documental</h2>
            <p className="gv-header-sub">Revisa, genera y descarga documentos ESSA</p>
          </div>
          <GenerationStageIndicator stage={stage as unknown as string} data-testid="gv-stage" />
        </div>
        <div className="gv-header-right">
          <span className="gv-doc-badge" data-testid="gv-documento-indicator">
            Documento {documentoIndicator}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
            disabled={activeIdx <= 0 || combined.length === 0}
            data-testid="gv-prev"
            aria-label="Anterior"
          >
            ‹ Ant.
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveIdx((i) => Math.min(combined.length - 1, i + 1))}
            disabled={activeIdx >= combined.length - 1 || combined.length === 0}
            data-testid="gv-next"
            aria-label="Siguiente"
          >
            Sig. ›
          </Button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="gv-toolbar" data-testid="gv-toolbar">
        <div className="gv-toolbar-search">
          <Input
            placeholder="Buscar por cuenta, radicado o nombre"
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            aria-label="Buscar por cuenta, radicado o nombre"
            data-testid="gv-search"
          />
        </div>
        {selectedTemplate && (
          <div className="gv-toolbar-info">
            <span className="gv-toolbar-label">Plantilla:</span>
            <span className="gv-toolbar-tag">{selectedTemplate.title}</span>
          </div>
        )}
      </div>

      {/* ── 3-panel layout ── */}
      <div className="gv-layout" data-testid="gv-layout">
        {/* ── Sidebar ── */}
        <div className="gv-card" data-testid="gv-sidebar">
          <div className="gv-card-header">
            <span className="gv-card-title">Documentos a generar</span>
            <span className="gv-card-count" data-testid="gv-sidebar-count">
              {filtered.length} / {combined.length}
            </span>
          </div>

          <div className="gv-sidebar-list" data-testid="gv-sidebar-list">
            {combined.length === 0 ? (
              <div
                data-testid="gv-sidebar-empty"
                className="gv-empty"
                style={{ padding: '20px 12px', fontSize: '0.82rem' }}
              >
                {showEmptyRecords
                  ? 'No hay registros seleccionados — ve al Módulo 3'
                  : 'Sin documentos para mostrar'}
              </div>
            ) : filtered.length === 0 ? (
              <div
                data-testid="gv-sidebar-no-results"
                className="gv-empty"
                style={{ padding: '16px 12px', fontSize: '0.82rem' }}
              >
                Sin resultados para el filtro
              </div>
            ) : (
              filtered.map((item) => {
                const isActive = activeItem && item.rid === activeItem.rid;
                const cfg = statusConfig(item.status, stage);
                return (
                  <div
                    key={item.rid}
                    data-testid={`gv-sidebar-item-${item.rid}`}
                    data-status={item.status}
                    data-active={isActive ? 'true' : 'false'}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isActive ? 'true' : 'false'}
                    className={`gv-sidebar-item ${isActive ? 'gv-sidebar-item--active' : ''}`}
                    onClick={() => {
                      const idxInFiltered = filtered.findIndex((f) => f.rid === item.rid);
                      if (idxInFiltered >= 0) setActiveIdx(idxInFiltered);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const idxInFiltered = filtered.findIndex((f) => f.rid === item.rid);
                        if (idxInFiltered >= 0) setActiveIdx(idxInFiltered);
                      }
                    }}
                  >
                    <span
                      className="gv-sidebar-item-icon"
                      style={{
                        background: cfg.bg,
                        border: `1px solid ${cfg.border}`,
                        color: cfg.color,
                      }}
                      aria-hidden
                    >
                      {cfg.icon}
                    </span>
                    <span className="gv-sidebar-item-body">
                      <span
                        className="gv-sidebar-item-name"
                        title={String(item.rec.nombreSolicitante ?? '')}
                      >
                        {String(item.rec.nombreSolicitante ?? '—')}
                      </span>
                      <span className="gv-sidebar-item-meta">
                        {String(item.rec.numeroCuenta ?? item.rec.cuenta ?? '—')} ·{' '}
                        {String(item.rec.radicadoEntrada ?? '—')}
                      </span>
                      <span
                        className="gv-sidebar-item-status"
                        style={{
                          background: cfg.bg,
                          color: cfg.color,
                          border: `1px solid ${cfg.border}`,
                        }}
                        data-testid={`gv-status-${item.rid}`}
                      >
                        {cfg.label}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="gv-sidebar-remove"
                      title="Quitar del listado"
                      aria-label={`Quitar ${item.rec.nombreSolicitante ?? 'documento'} del listado`}
                      onClick={(e) => {
                        e.stopPropagation();
                        requestRemove(
                          item.rid,
                          String(item.rec.nombreSolicitante ?? 'este documento')
                        );
                      }}
                      data-testid={`gv-remove-${item.rid}`}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="gv-sidebar-footer">
            <span className="gv-sidebar-indicator" data-testid="gv-sidebar-indicator">
              Documento {documentoIndicator}
            </span>
            <span style={{ display: 'flex', gap: 5 }}>
              <button
                className="gv-nav-btn"
                onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
                disabled={activeIdx <= 0}
                data-testid="gv-sidebar-prev"
                aria-label="Documento anterior"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                className="gv-nav-btn"
                onClick={() =>
                  setActiveIdx((i) => Math.min((filtered.length || combined.length) - 1, i + 1))
                }
                disabled={activeIdx >= (filtered.length || combined.length) - 1}
                data-testid="gv-sidebar-next"
                aria-label="Documento siguiente"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </span>
          </div>
        </div>

        {/* ── Center: Preview ── */}
        <div className="gv-card" data-testid="gv-center">
          <div className="gv-card-header">
            <span className="gv-card-title">Vista previa del documento generado</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {activeRecord && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: 'var(--neutral-500)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 999,
                    padding: '3px 8px',
                    whiteSpace: 'nowrap',
                  }}
                  data-testid="gv-preview-meta"
                >
                  {String(activeRecord.numeroCuenta ?? activeRecord.cuenta ?? '')} ·{' '}
                  {String(activeRecord.nombreSolicitante ?? '')}
                </span>
              )}
              {selectedTemplate?.file && (
                <div className="gv-zoom-bar">
                  <button
                    className="gv-zoom-btn"
                    onClick={zoomOut}
                    title="Reducir"
                    aria-label="Reducir zoom"
                  >
                    −
                  </button>
                  <span className="gv-zoom-label">{zoom}%</span>
                  <button
                    className="gv-zoom-btn"
                    onClick={zoomIn}
                    title="Ampliar"
                    aria-label="Ampliar zoom"
                  >
                    +
                  </button>
                  <button
                    className="gv-zoom-btn"
                    onClick={zoomReset}
                    title="Restablecer"
                    aria-label="Restablecer zoom"
                    style={{ fontSize: '0.7rem' }}
                  >
                    1:1
                  </button>
                </div>
              )}
            </div>
          </div>

          {showEmptyTemplate ? (
            <div data-testid="gv-preview-empty-template" className="gv-empty">
              Selecciona una plantilla en el Módulo 4 para previsualizar
            </div>
          ) : showEmptyRecords ? (
            <div data-testid="gv-preview-empty-records" className="gv-empty">
              No hay registros seleccionados
            </div>
          ) : (
            <div className="gv-preview" data-testid="gv-preview" ref={previewRef}>
              <div
                className="gv-preview-inner"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
              >
                {/* docx-preview mount point */}
                <div
                  ref={docxContainerRef}
                  data-testid="gv-docx-container"
                  style={{
                    display: selectedTemplate?.file ? 'block' : 'none',
                    minHeight: selectedTemplate?.file ? 200 : 0,
                  }}
                />
                {/* fallback text if no file */}
                {(!selectedTemplate?.file || docxRenderFailed) && (
                  <div className="gv-fallback">
                    <div data-testid="gv-fallback-content" className="gv-fallback-text">
                      {previewContent || (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                          Sin contenido disponible
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Actions + Summary ── */}
        <div
          className="gv-card gv-actions"
          data-testid="gv-actions"
          style={{ padding: '14px', gap: 12 }}
        >
          {/* summary pre-generation */}
          {stage === 'revision' && (
            <div className="gv-summary" data-testid="gv-summary">
              <div className="gv-summary-title">Resumen</div>
              <div>
                Se generarán <strong>{counts.total}</strong> documentos
              </div>
              <div className="gv-summary-detail">
                Plantilla: {selectedTemplate ? selectedTemplate.title : '—'} · Registros:{' '}
                {counts.total}
              </div>
              {(showEmptyRecords || showEmptyTemplate) && (
                <div className="gv-gate-warning" data-testid="gv-gate-warning">
                  {showEmptyRecords && showEmptyTemplate
                    ? 'Selecciona registros y plantilla para habilitar la generación.'
                    : showEmptyRecords
                      ? 'Selecciona al menos un registro en el Módulo 3.'
                      : 'Selecciona una plantilla en el Módulo 4.'}
                </div>
              )}
            </div>
          )}

          {/* progress */}
          {(stage === 'generando' ||
            stage === 'finalizado' ||
            stage === 'con_errores' ||
            progress > 0) && (
            <div
              data-testid="gv-progress-section"
              style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--neutral-700)' }}>
                  {stage === 'finalizado'
                    ? 'Generación completada'
                    : stage === 'con_errores'
                      ? 'Generación con errores'
                      : 'Generando documentos...'}
                </span>
                <span
                  data-testid="gv-progress-pct"
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    color:
                      stage === 'finalizado'
                        ? '#065f46'
                        : stage === 'con_errores'
                          ? '#991b1b'
                          : 'var(--essa-primary)',
                  }}
                >
                  {progress}%
                </span>
              </div>
              <div className="gv-progress-track" data-testid="gv-progress-track">
                <div
                  className={`gv-progress-fill ${stage === 'finalizado' ? 'done' : ''}`}
                  style={{ width: `${progress}%` }}
                  data-testid="gv-progress-fill"
                />
              </div>
            </div>
          )}

          {/* dynamic main action button */}
          <Button
            variant="primary"
            disabled={!canGenerate || isGenerating || stage === 'generando'}
            onClick={handleGenerate}
            data-testid="gv-generate-btn"
            title={
              !canGenerate
                ? 'Selecciona registros y plantilla'
                : isSingle
                  ? 'Generar documento'
                  : 'Generar todos'
            }
            style={{ width: '100%', height: 42, fontSize: '0.88rem' }}
          >
            {isGenerating || stage === 'generando'
              ? isSingle
                ? 'Generando documento…'
                : 'Generando todos…'
              : isSingle
                ? 'Generar documento'
                : 'Generar todos'}
          </Button>

          {hasError && (stage === 'con_errores' || stage === 'finalizado') && (
            <Button
              variant="secondary"
              onClick={handleRetry}
              disabled={isGenerating}
              data-testid="gv-retry-btn"
              style={{ width: '100%' }}
            >
              Reintentar documentos con error ({counts.errores})
            </Button>
          )}
        </div>
      </div>

      {/* ── Confirm remove modal ── */}
      <Modal
        open={confirmRemove.open}
        onClose={() => setConfirmRemove({ open: false, rid: '', name: '' })}
        title="Quitar documento del listado"
        width={420}
      >
        <div className="gv-confirm-body">
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div className="gv-confirm-icon">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="gv-confirm-text">
              ¿Estás seguro de excluir <strong>{confirmRemove.name}</strong> del proceso de
              generación actual?
              <br />
              <span style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>
                Esta acción solo exclude el documento de esta sesión. No se elimina el registro
                original.
              </span>
            </div>
          </div>
          <div className="gv-confirm-actions">
            <Button
              variant="ghost"
              onClick={() => setConfirmRemove({ open: false, rid: '', name: '' })}
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmRemoveDoc} data-testid="gv-confirm-remove-btn">
              Sí, quitar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default GenerateView;

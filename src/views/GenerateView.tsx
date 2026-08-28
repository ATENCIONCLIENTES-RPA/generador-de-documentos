import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useGeneration } from '@/hooks/useGeneration';
import { GenerationStageIndicator } from '@/components/features/GenerationStageIndicator';
import { useDataStore } from '@/store/dataStore';
import { useTemplateStore } from '@/store/templateStore';
import { useProfileStore } from '@/store/profileStore';
import { useGenerationStore } from '@/store/generationStore';
import { replaceTemplateVariables } from '@/utils/templateEngine';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { Record as EssaRecord } from '@/types/record';

interface GenerateViewProps {
  onAddHistory?: (entry: { id: string; date: string; type: string; status: string; recordsCount: number; templateName: string }) => void;
}

type DocStatus = 'pending' | 'success' | 'error' | 'generating';

function statusConfig(status: DocStatus, stage: string) {
  if (status === 'success') return { label: 'Completado', bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0', icon: '✓' };
  if (status === 'error') return { label: 'Error', bg: '#fef2f2', color: '#991b1b', border: '#fecaca', icon: '✕' };
  if (status === 'generating' || (status === 'pending' && stage === 'generando')) {
    return { label: 'Generando', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', icon: '⟳' };
  }
  return { label: 'Pendiente', bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', icon: '◷' };
}

export function GenerateView({ onAddHistory }: GenerateViewProps) {
  const { stage, progress, docResults, selectedRecords, selectedTemplate, canGenerate, generate, retryFailed, downloadSingle, downloadAll } = useGeneration({ onAddHistory });

  // sync stage to store for indicator; stage already from store
  const profile = useProfileStore((s) => s.profile);

  const [activeIdx, setActiveIdx] = useState(0);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'success' | 'error' | 'generating'>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  // derived combined list: selectedRecords + docResults status
  const combined = useMemo(() => {
    return selectedRecords.map((rec, i) => {
      const rid = (rec as unknown as { rowId: string }).rowId ?? `rec-${i}`;
      const res = docResults.find((r) => r.id === rid || r.recordId === rid);
      let status: DocStatus = 'pending';
      if (res) {
        if (res.status === 'success') status = 'success';
        else if (res.status === 'error') status = 'error';
        else status = stage === 'generando' ? 'generating' : 'pending';
      } else {
        status = stage === 'generando' ? 'generating' : 'pending';
      }
      return { rec, rid, status, res, idx: i };
    });
  }, [selectedRecords, docResults, stage]);

  const counts = useMemo(() => {
    const total = combined.length;
    const pending = combined.filter((c) => c.status === 'pending').length;
    const generating = combined.filter((c) => c.status === 'generating').length;
    const completed = combined.filter((c) => c.status === 'success').length;
    const errores = combined.filter((c) => c.status === 'error').length;
    // if no docResults yet and stage revision, treat all as pendientes
    return { total, pending, generating, completed, errores };
  }, [combined]);

  const filtered = useMemo(() => {
    let out = combined;
    const q = sidebarSearch.trim().toLowerCase();
    if (q) {
      out = out.filter(({ rec }) => {
        const hay = [String(rec.numeroCuenta ?? rec.cuenta ?? ''), String(rec.radicadoEntrada ?? ''), String(rec.nombreSolicitante ?? ''), String(rec.numeroProceso ?? '')].join(' ').toLowerCase();
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
  // compute Documento X de Y indicator based on overall combined (not filtered) or filtered?
  const documentoIndicator = useMemo(() => {
    if (combined.length === 0) return '0 de 0';
    // if filtered, show position within filtered, else overall
    const list = filtered.length > 0 ? filtered : combined;
    const currentPos = activeIdx + 1;
    return `${currentPos} de ${list.length}`;
  }, [activeIdx, filtered.length, combined.length]);

  const totalForBar = counts.total;

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    try {
      await generate();
    } catch (e) {
      console.error('[GenerateView] generate failed', e);
    } finally {
      setIsGenerating(false);
    }
  }, [canGenerate, generate]);

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

  // preview rendering
  const previewContent = useMemo(() => {
    if (!selectedTemplate) return '';
    const raw = selectedTemplate.sampleContent ?? '';
    if (!raw) return '';
    if (activeRecord) {
      try {
        return replaceTemplateVariables(raw, activeRecord, { name: profile.name, position: profile.position, email: profile.email });
      } catch (e) {
        console.error('replaceTemplateVariables failed', e);
        return raw;
      }
    }
    return raw;
  }, [selectedTemplate, activeRecord, profile.name, profile.position, profile.email]);

  // docx-preview attempt if file exists
  useEffect(() => {
    let cancelled = false;
    const container = docxContainerRef.current;
    if (!container) return;
    container.innerHTML = '';
    if (!selectedTemplate?.file || !activeRecord) return;
    const file = selectedTemplate.file as File;
    const run = async () => {
      try {
        const mod = await import('docx-preview');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderAsync: (buf: ArrayBuffer, el: HTMLElement) => Promise<void> = (mod as any).renderAsync ?? (mod as any).default?.renderAsync ?? (mod as any).default;
        if (!renderAsync) throw new Error('renderAsync not found');
        let buf: ArrayBuffer;
        const maybe = file as unknown as { arrayBuffer?: () => Promise<ArrayBuffer> };
        if (typeof maybe.arrayBuffer === 'function') {
          buf = await maybe.arrayBuffer();
        } else {
          buf = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
            reader.readAsArrayBuffer(file as unknown as Blob);
          });
        }
        if (cancelled || !docxContainerRef.current) return;
        docxContainerRef.current.innerHTML = '';
        await renderAsync(buf, docxContainerRef.current);
      } catch (e) {
        console.error('docx-preview render failed, fallback to text', e);
        // fallback already via previewContent
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [selectedTemplate?.file, activeRecord]);

  const hasError = counts.errores > 0;
  const hasSuccess = counts.completed > 0;

  // empty gates
  const showEmptyRecords = selectedRecords.length === 0;
  const showEmptyTemplate = !selectedTemplate;

  return (
    <div data-testid="generate-view" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`
        .gv-layout { display: grid; grid-template-columns: 25% 55% 20%; gap: 16px; align-items: start; }
        @media (max-width: 1100px) { .gv-layout { grid-template-columns: 1fr; } }
        .gv-card { background:#fff; border:1px solid var(--border); border-radius:12px; box-shadow:var(--shadow-sm); overflow:hidden; display:flex; flex-direction:column; }
        .gv-sidebar-item { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; border:1px solid transparent; cursor:pointer; transition: background 150ms var(--ease), border-color 150ms var(--ease); text-align:left; width:100%; }
        .gv-sidebar-item:hover { background:#f8fafc; border-color: var(--border); }
        .gv-sidebar-item--active { background:#EBF5FF !important; border-color:#bfdbfe !important; }
        .gv-progress-track { width:100%; height:10px; background:#e2e8f0; border-radius:999px; overflow:hidden; border:1px solid #e2e8f0; padding:2px; }
        .gv-progress-fill { height:100%; border-radius:999px; transition: width 0.3s ease; background: linear-gradient(90deg, #3b82f6, #004B93); }
        .gv-progress-fill.done { background: linear-gradient(90deg, #10b981, #059669); }
        .gv-status-bar { background:#fff; border:1px solid var(--border); border-radius:12px; padding:10px 14px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; box-shadow:var(--shadow-xs); }
        .gv-status-segment { cursor:pointer; font-size:0.78rem; font-weight:700; padding:4px 8px; border-radius:999px; border:1px solid transparent; transition: background 120ms var(--ease); }
        .gv-status-segment:hover { background:#f1f5f9; }
        .gv-status-segment.active { background:#EEF6DF; border-color:#c5e8a3; color:#1e3a5f; }
        .gv-preview { background:#F5F5F7; overflow-y:auto; padding:18px; flex:1; }
        .gv-preview-doc { margin:0 auto; max-width:560px; background:#fff; padding:28px; box-shadow:0 1px 10px rgba(15,23,42,0.08); border-radius:2px; min-height:360px; font-family: Georgia, "Times New Roman", serif; font-size:11px; line-height:1.7; color:#1e293b; white-space:pre-wrap; word-break:break-word; }
      `}</style>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: '#eff6ff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#004B93' }} aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#004B93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </span>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--neutral-900)', margin: 0, lineHeight: 1.1 }}>Módulo 5-6: Generación Documental</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', margin: 0 }}>Revisa, genera y descarga documentos ESSA</p>
          </div>
          <GenerationStageIndicator stage={stage as unknown as string} data-testid="gv-stage" />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span data-testid="gv-documento-indicator" style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--neutral-600)', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 999, padding: '6px 12px' }}>
            Documento {documentoIndicator}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setActiveIdx((i) => Math.max(0, i - 1))} disabled={activeIdx <= 0 || combined.length === 0} data-testid="gv-prev" aria-label="Anterior">
            ‹ Anterior
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setActiveIdx((i) => Math.min(combined.length - 1, i + 1))} disabled={activeIdx >= combined.length - 1 || combined.length === 0} data-testid="gv-next" aria-label="Siguiente">
            Siguiente ›
          </Button>
        </div>
      </div>

      {/* toolbar */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', boxShadow: 'var(--shadow-xs)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }} data-testid="gv-toolbar">
        <div style={{ flex: '1 1 320px', minWidth: 220 }}>
          <Input placeholder="Buscar por cuenta, radicado o nombre" value={sidebarSearch} onChange={(e) => setSidebarSearch(e.target.value)} aria-label="Buscar por cuenta, radicado o nombre" data-testid="gv-search" />
        </div>
        {selectedTemplate && (
          <div style={{ fontSize: '0.76rem', color: 'var(--neutral-600)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }} data-testid="gv-variable-groups">
            <span style={{ fontWeight: 800 }}>Plantilla:</span>
            <span style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 999, padding: '3px 8px', fontWeight: 700, color: '#1e40af' }}>{selectedTemplate.title}</span>
            <span style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 999, padding: '3px 8px' }}>{selectedTemplate.variables?.length ?? 0} variables</span>
            {selectedTemplate.variables?.length ? (
              <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {selectedTemplate.variables.slice(0, 4).map((v) => (
                  <span key={v.key} style={{ fontSize: '0.68rem', fontWeight: 700, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 999, padding: '2px 7px' }}>[{v.key}]</span>
                ))}
                {(selectedTemplate.variables.length ?? 0) > 4 && <span style={{ fontSize: '0.7rem', color: 'var(--neutral-500)' }}>+{selectedTemplate.variables.length - 4} más</span>}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* status bar compacta clicable */}
      <div data-testid="gv-status-bar" className="gv-status-bar">
        <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--neutral-700)' }}>
          {totalForBar} documentos: {counts.pending} pendientes · {counts.generating} generando · {counts.completed} completados · {counts.errores} con error
        </span>
        <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className={`gv-status-segment ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')} data-testid="gv-filter-all" aria-label="Filtrar todos">
            Todos
          </button>
          <button className={`gv-status-segment ${statusFilter === 'pending' ? 'active' : ''}`} onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')} data-testid="gv-filter-pending">
            {counts.pending} pendientes
          </button>
          <button className={`gv-status-segment ${statusFilter === 'generating' ? 'active' : ''}`} onClick={() => setStatusFilter(statusFilter === 'generating' ? 'all' : 'generating')} data-testid="gv-filter-generating">
            {counts.generating} generando
          </button>
          <button className={`gv-status-segment ${statusFilter === 'success' ? 'active' : ''}`} onClick={() => setStatusFilter(statusFilter === 'success' ? 'all' : 'success')} data-testid="gv-filter-success">
            {counts.completed} completados
          </button>
          <button className={`gv-status-segment ${statusFilter === 'error' ? 'active' : ''}`} onClick={() => setStatusFilter(statusFilter === 'error' ? 'all' : 'error')} data-testid="gv-filter-error">
            {counts.errores} con error
          </button>
        </span>
      </div>

      {/* 3 areas layout */}
      <div className="gv-layout" data-testid="gv-layout">
        {/* sidebar 25% */}
        <div className="gv-card" data-testid="gv-sidebar" style={{ minHeight: 520 }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: '#f8fafc' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--neutral-700)' }}>Documentos</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--neutral-500)', background: '#fff', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 8px' }} data-testid="gv-sidebar-count">
              {filtered.length} / {combined.length}
            </span>
          </div>

          {/* sidebar search small */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <Input placeholder="Buscar por cuenta, radicado o nombre" value={sidebarSearch} onChange={(e) => setSidebarSearch(e.target.value)} aria-label="Buscar en lista" data-testid="gv-sidebar-search" />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 440 }} data-testid="gv-sidebar-list">
            {combined.length === 0 ? (
              <div data-testid="gv-sidebar-empty" style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--neutral-400)', fontSize: '0.84rem' }}>
                {showEmptyRecords ? 'No hay registros seleccionados — ve al Módulo 3' : 'Sin documentos para mostrar'}
              </div>
            ) : filtered.length === 0 ? (
              <div data-testid="gv-sidebar-no-results" style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--neutral-500)', fontSize: '0.84rem' }}>Sin resultados para el filtro</div>
            ) : (
              filtered.map((item) => {
                const isActive = activeItem && item.rid === activeItem.rid;
                const cfg = statusConfig(item.status, stage);
                return (
                  <button
                    key={item.rid}
                    type="button"
                    onClick={() => {
                      const idxInFiltered = filtered.findIndex((f) => f.rid === item.rid);
                      if (idxInFiltered >= 0) setActiveIdx(idxInFiltered);
                    }}
                    data-testid={`gv-sidebar-item-${item.rid}`}
                    data-status={item.status}
                    data-active={isActive ? 'true' : 'false'}
                    aria-pressed={isActive ? 'true' : 'false'}
                    className={`gv-sidebar-item ${isActive ? 'gv-sidebar-item--active' : ''}`}
                    style={
                      isActive
                        ? { background: '#EBF5FF', borderColor: '#bfdbfe' }
                        : { background: '#fff', borderColor: 'transparent' }
                    }
                  >
                    <span style={{ width: 32, height: 32, borderRadius: 8, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: cfg.color, fontWeight: 800, flexShrink: 0 }} aria-hidden>
                      {cfg.icon}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: 'var(--neutral-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={String(item.rec.nombreSolicitante ?? '')}>
                        {String(item.rec.nombreSolicitante ?? '—')}
                      </span>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--neutral-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {String(item.rec.numeroCuenta ?? item.rec.cuenta ?? '—')} · {String(item.rec.radicadoEntrada ?? '—')}
                      </span>
                      <span style={{ display: 'inline-flex', marginTop: 4, fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 999, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }} data-testid={`gv-status-${item.rid}`}>
                        {cfg.label}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--neutral-500)' }} data-testid="gv-sidebar-indicator">
              Documento {documentoIndicator}
            </span>
            <span style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
                disabled={activeIdx <= 0}
                data-testid="gv-sidebar-prev"
                aria-label="Documento anterior"
                style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ‹
              </button>
              <button
                onClick={() => setActiveIdx((i) => Math.min((filtered.length || combined.length) - 1, i + 1))}
                disabled={activeIdx >= (filtered.length || combined.length) - 1}
                data-testid="gv-sidebar-next"
                aria-label="Documento siguiente"
                style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ›
              </button>
            </span>
          </div>
        </div>

        {/* center 55% preview */}
        <div className="gv-card" data-testid="gv-center" style={{ minHeight: 520 }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: '#f8fafc' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--neutral-700)' }}>Vista previa</span>
            {activeRecord && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--neutral-500)', background: '#fff', border: '1px solid var(--border)', borderRadius: 999, padding: '3px 8px' }} data-testid="gv-preview-meta">{String(activeRecord.numeroCuenta ?? activeRecord.cuenta ?? '')} · {String(activeRecord.nombreSolicitante ?? '')}</span>}
          </div>

          {showEmptyTemplate ? (
            <div data-testid="gv-preview-empty-template" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center', color: 'var(--neutral-500)' }}>
              Selecciona una plantilla en el Módulo 4 para previsualizar
            </div>
          ) : showEmptyRecords ? (
            <div data-testid="gv-preview-empty-records" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center', color: 'var(--neutral-500)' }}>
              No hay registros seleccionados
            </div>
          ) : (
            <div className="gv-preview" data-testid="gv-preview" ref={previewRef}>
              <div className="gv-preview-doc" data-testid="gv-preview-doc">
                {/* docx-preview mount */}
                <div ref={docxContainerRef} data-testid="gv-docx-container" style={{ display: selectedTemplate?.file ? 'block' : 'none', minHeight: selectedTemplate?.file ? 120 : 0 }} />
                {/* fallback text */}
                <div data-testid="gv-fallback-content" style={{ display: 'block' }}>
                  {previewContent || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin contenido disponible</span>}
                </div>
              </div>
            </div>
          )}

          {/* variable groups if needed already in toolbar, duplicate small tags here for extra spec coverage */}
          {selectedTemplate?.variables && selectedTemplate.variables.length > 0 && (
            <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', background: '#fff' }} data-testid="gv-variable-tags">
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--neutral-600)', marginBottom: 6 }}>Variables ({selectedTemplate.variables.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selectedTemplate.variables.map((v) => (
                  <span key={v.key} data-testid={`gv-var-${v.key}`} style={{ fontSize: '0.68rem', fontWeight: 700, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 999, padding: '3px 8px', color: 'var(--neutral-600)' }}>
                    [{v.key}]
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* right / bottom status + actions */}
        <div className="gv-card" data-testid="gv-actions" style={{ minHeight: 520, padding: '16px', gap: 14 }}>
          {/* summary pre-generation */}
          {stage === 'revision' && (
            <div data-testid="gv-summary" style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: '0.84rem', color: 'var(--neutral-700)' }}>
              <div style={{ fontWeight: 800, marginBottom: 4 }}>Resumen</div>
              <div>Se generarán {counts.total} documentos</div>
              <div style={{ fontSize: '0.76rem', color: 'var(--neutral-500)', marginTop: 4 }}>
                Plantilla: {selectedTemplate ? selectedTemplate.title : '—'} · Registros seleccionados: {selectedRecords.length}
              </div>
              {(showEmptyRecords || showEmptyTemplate) && (
                <div style={{ marginTop: 8, fontSize: '0.76rem', color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 10px' }} data-testid="gv-gate-warning">
                  {showEmptyRecords && showEmptyTemplate ? 'Selecciona registros y plantilla para habilitar la generación.' : showEmptyRecords ? 'Selecciona al menos un registro en el Módulo 3.' : 'Selecciona una plantilla en el Módulo 4.'}
                </div>
              )}
            </div>
          )}

          {/* progress */}
          {(stage === 'generando' || stage === 'finalizado' || stage === 'con_errores' || progress > 0) && (
            <div data-testid="gv-progress-section" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--neutral-700)' }}>{stage === 'finalizado' ? 'Generación completada' : stage === 'con_errores' ? 'Generación con errores' : 'Generando documentos...'}</span>
                <span data-testid="gv-progress-pct" style={{ fontSize: '0.84rem', fontWeight: 800, color: stage === 'finalizado' ? '#065f46' : stage === 'con_errores' ? '#991b1b' : '#004B93' }}>
                  {progress}%
                </span>
              </div>
              <div className="gv-progress-track" data-testid="gv-progress-track">
                <div className={`gv-progress-fill ${stage === 'finalizado' ? 'done' : ''}`} style={{ width: `${progress}%` }} data-testid="gv-progress-fill" />
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--neutral-500)' }} data-testid="gv-progress-label">
                {stage === 'finalizado' ? `${counts.completed} documentos generados` : stage === 'con_errores' ? `${counts.completed} completados · ${counts.errores} con error` : `Procesando ${counts.total} documentos...`}
              </div>
            </div>
          )}

          {/* main action button */}
          <Button
            variant="primary"
            disabled={!canGenerate || isGenerating || stage === 'generando'}
            onClick={handleGenerate}
            data-testid="gv-generate-btn"
            title={!canGenerate ? 'Selecciona registros y plantilla' : 'Generar documentos'}
            style={{ width: '100%', height: 44, fontSize: '0.9rem' }}
          >
            {isGenerating || stage === 'generando' ? 'Generando…' : 'Generar documentos'}
          </Button>

          {hasError && (stage === 'con_errores' || stage === 'finalizado') && (
            <Button variant="secondary" onClick={handleRetry} disabled={isGenerating} data-testid="gv-retry-btn" style={{ width: '100%' }}>
              Reintentar documentos con error ({counts.errores})
            </Button>
          )}

          {/* per-doc download + download all */}
          {hasSuccess && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="gv-download-section">
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--neutral-700)' }}>Descargas</div>
              {/* active doc download */}
              {activeItem && activeItem.status === 'success' && (
                <Button variant="secondary" onClick={() => downloadSingle(activeItem.rid)} data-testid={`gv-download-${activeItem.rid}`} style={{ width: '100%' }}>
                  Descargar {String(activeItem.rec.numeroCuenta ?? '') || 'documento'}
                </Button>
              )}
              {/* list all success download buttons for test visibility */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} data-testid="gv-download-list">
                {combined
                  .filter((c) => c.status === 'success')
                  .map((c) => (
                    <Button key={c.rid} variant="ghost" size="sm" onClick={() => downloadSingle(c.rid)} data-testid={`gv-download-item-${c.rid}`} style={{ justifyContent: 'flex-start' }}>
                      Descargar {String(c.rec.numeroCuenta ?? c.rid)}
                    </Button>
                  ))}
              </div>
              <Button variant="primary" onClick={() => void downloadAll()} data-testid="gv-download-all" style={{ width: '100%' }}>
                Descargar todos {combined.filter((c) => c.status === 'success').length > 1 ? 'como ZIP' : ''}
              </Button>
              <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', textAlign: 'center' }} data-testid="gv-zip-hint">
                ZIP: ESSA_Documentos_Generados / ESSA_Documentos_YYYY-MM-DD_HHMM.zip
              </div>
            </div>
          )}

          {/* template/registros gate info */}
          <div style={{ marginTop: 'auto', fontSize: '0.72rem', color: 'var(--neutral-500)', borderTop: '1px solid var(--border)', paddingTop: 10 }} data-testid="gv-footer-info">
            {selectedTemplate ? `Plantilla: ${selectedTemplate.fileName}` : 'Sin plantilla'} · {selectedRecords.length} seleccionados
          </div>
        </div>
      </div>
    </div>
  );
}

export default GenerateView;

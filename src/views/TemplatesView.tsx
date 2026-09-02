import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as docxPreview from 'docx-preview';
import { useTemplateStore } from '@/store/templateStore';
import { useDataStore } from '@/store/dataStore';
import { useNavigationStore } from '@/store/navigationStore';
import { replaceTemplateVariables } from '@/utils/templateEngine';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import type { Template } from '@/types/template';
import type { Record as EssaRecord } from '@/types/record';

interface TemplatesViewProps {
  loading?: boolean;
}

function getSourceStyle(source: string) {
  switch (source) {
    case 'Excel':
      return { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' };
    case 'Perfil':
      return { bg: '#faf5ff', border: '#e9d5ff', color: '#6b21a8' };
    case 'Firma':
      return { bg: '#ecfdf5', border: '#a7f3d0', color: '#047857' };
    case 'Calculado':
      return { bg: '#fffbeb', border: '#fde68a', color: '#92400e' };
    default:
      return { bg: '#f1f5f9', border: '#e2e8f0', color: '#475569' };
  }
}

export function TemplatesView({ loading = false }: TemplatesViewProps) {
  const templates = useTemplateStore((s) => s.templates);
  const selectedTemplate = useTemplateStore((s) => s.selectedTemplate);
  const selectTemplate = useTemplateStore((s) => s.selectTemplate);
  const records = useDataStore((s) => s.records);
  const selectedRows = useDataStore((s) => s.selectedRows);
  const templateAssignments = useDataStore((s) => s.templateAssignments);
  const assignTemplate = useDataStore((s) => s.assignTemplate);
  const goTo = useNavigationStore((s) => s.goTo);
  const complete = useNavigationStore((s) => s.complete);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const docWrapperRef = useRef<HTMLDivElement>(null);
  const lastCheckedRowIdRef = useRef<string | null>(null);

  const selectedRecords: EssaRecord[] = useMemo(() => {
    if (!records || records.length === 0 || selectedRows.size === 0) return [];
    return (records as EssaRecord[]).filter((r) => selectedRows.has((r as unknown as { rowId: string }).rowId));
  }, [records, selectedRows]);

  const previewRecord: EssaRecord | null = useMemo(() => {
    if (selectedRecords.length === 0) return null;
    if (lastCheckedRowIdRef.current) {
      const found = selectedRecords.find((r) => (r as unknown as { rowId: string }).rowId === lastCheckedRowIdRef.current);
      if (found) return found;
    }
    return selectedRecords[selectedRecords.length - 1] ?? null;
  }, [selectedRecords]);

  const [templateSearch, setTemplateSearch] = useState('');
  const [docxRenderFailed, setDocxRenderFailed] = useState(false);
  const [recordSearch, setRecordSearch] = useState('');
  const [recordStatusFilter, setRecordStatusFilter] = useState<'todos' | 'asignado' | 'sin_asignar'>('todos');
  const [recordCheckboxes, setRecordCheckboxes] = useState<Set<string>>(new Set());
  const [confirmOverwrite, setConfirmOverwrite] = useState<{ open: boolean; rowIds: string[]; templateId: string }>({ open: false, rowIds: [], templateId: '' });
  const [varsExpanded, setVarsExpanded] = useState(false);

  const [scale, setScale] = useState(1);
  const [docNaturalSize, setDocNaturalSize] = useState<{ w: number; h: number } | null>(null);

  const filteredTemplates = useMemo(() => {
    if (!templateSearch.trim()) return templates;
    const q = templateSearch.toLowerCase().trim();
    return templates.filter((t) => t.title.toLowerCase().includes(q) || (t.category && t.category.toLowerCase().includes(q)) || (t.fileName && t.fileName.toLowerCase().includes(q)));
  }, [templates, templateSearch]);

  const filteredRecords = useMemo(() => {
    let out = selectedRecords;
    if (recordSearch.trim()) {
      const q = recordSearch.toLowerCase().trim();
      out = out.filter((r) => {
        const rr = r as unknown as Record<string, unknown>;
        return String(rr.nombreSolicitante ?? '').toLowerCase().includes(q) || String(rr.numeroCuenta ?? rr.cuenta ?? '').toLowerCase().includes(q) || String(rr.radicadoEntrada ?? '').toLowerCase().includes(q);
      });
    }
    if (recordStatusFilter === 'asignado') out = out.filter((r) => !!templateAssignments[(r as unknown as { rowId: string }).rowId]);
    else if (recordStatusFilter === 'sin_asignar') out = out.filter((r) => !templateAssignments[(r as unknown as { rowId: string }).rowId]);
    return out;
  }, [selectedRecords, recordSearch, recordStatusFilter, templateAssignments]);

  const assignedCount = useMemo(() => selectedRecords.filter((r) => !!templateAssignments[(r as unknown as { rowId: string }).rowId]).length, [selectedRecords, templateAssignments]);
  const totalCount = selectedRecords.length;
  const pendingCount = totalCount - assignedCount;
  const allAssigned = totalCount > 0 && pendingCount === 0;
  const progressPct = totalCount > 0 ? Math.round((assignedCount / totalCount) * 100) : 0;

  const handleToggleRecord = (rowId: string) => {
    setRecordCheckboxes((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
        lastCheckedRowIdRef.current = rowId;
      }
      return next;
    });
  };

  const handleToggleAllRecords = () => {
    const allIds = filteredRecords.map((r) => (r as unknown as { rowId: string }).rowId);
    const allChecked = allIds.length > 0 && allIds.every((id) => recordCheckboxes.has(id));
    setRecordCheckboxes((prev) => {
      const next = new Set(prev);
      allIds.forEach((id) => allChecked ? next.delete(id) : next.add(id));
      if (!allChecked && allIds.length > 0) lastCheckedRowIdRef.current = allIds[allIds.length - 1];
      return next;
    });
  };

  const handleAssignTemplate = () => {
    if (!selectedTemplate || recordCheckboxes.size === 0) return;
    const idsToAssign = Array.from(recordCheckboxes);
    const conflicting = idsToAssign.filter((id) => templateAssignments[id] && templateAssignments[id] !== selectedTemplate.id);
    if (conflicting.length > 0) { setConfirmOverwrite({ open: true, rowIds: idsToAssign, templateId: selectedTemplate.id }); return; }
    idsToAssign.forEach((id) => assignTemplate(id, selectedTemplate.id));
    setRecordCheckboxes(new Set());
  };

  const handleConfirmOverwrite = () => {
    confirmOverwrite.rowIds.forEach((id) => assignTemplate(id, confirmOverwrite.templateId));
    setConfirmOverwrite({ open: false, rowIds: [], templateId: '' });
    setRecordCheckboxes(new Set());
  };

  const handleContinue = () => { if (!allAssigned) return; complete('plantillas'); goTo('generacion'); };

  const calcScale = useCallback(() => {
    const viewer = viewerRef.current;
    const wrapper = docWrapperRef.current;
    if (!viewer || !wrapper) return;
    const vw = viewer.clientWidth - 24;
    const vh = viewer.clientHeight - 24;
    if (vw <= 0 || vh <= 0) return;
    const dw = wrapper.scrollWidth || wrapper.offsetWidth;
    const dh = wrapper.scrollHeight || wrapper.offsetHeight;
    if (dw <= 0 || dh <= 0) return;
    setDocNaturalSize({ w: dw, h: dh });
    const isMultiPage = dh > vh * 1.3;
    const refH = isMultiPage ? vh : dh;
    const scaleW = vw / dw;
    const scaleH = vh / refH;
    setScale(Math.min(scaleW, scaleH, 3));
  }, []);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(+(s + 0.1).toFixed(2), 3));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(+(s - 0.1).toFixed(2), 0.1));
  }, []);

  const fitToPage = useCallback(() => calcScale(), [calcScale]);

  useEffect(() => {
    let cancelled = false;
    const container = previewContainerRef.current;
    if (!container) return;
    setDocxRenderFailed(false);
    container.innerHTML = '';
    setDocNaturalSize(null);
    setScale(1);
    if (!selectedTemplate?.file) return;
    const file = selectedTemplate.file;
    (async () => {
      try {
        const renderAsync: (buffer: ArrayBuffer, el: HTMLElement) => Promise<void> = (docxPreview as any).renderAsync;
        if (!renderAsync) throw new Error('docx-preview renderAsync not found');
        const buf = await (file as unknown as Blob).arrayBuffer();
        if (cancelled || !previewContainerRef.current) return;
        previewContainerRef.current.innerHTML = '';
        await renderAsync(buf, previewContainerRef.current);
        if (cancelled) return;
        previewContainerRef.current.querySelectorAll('[class*="toolbar"], [class*="header"]').forEach((el) => {
          const bg = (el as HTMLElement).style.background ?? (el as HTMLElement).style.backgroundColor ?? '';
          if (bg.includes('gray')) el.remove();
        });
        requestAnimationFrame(() => { if (!cancelled) calcScale(); });
      } catch (err) {
        console.error('docx-preview render failed', err);
        if (!cancelled) { setDocxRenderFailed(true); if (previewContainerRef.current) previewContainerRef.current.innerHTML = ''; }
      }
    })();
    return () => { cancelled = true; };
  }, [selectedTemplate, calcScale]);

  useEffect(() => {
    if (!docNaturalSize) return;
    const viewer = viewerRef.current;
    if (!viewer) return;
    const vw = viewer.clientWidth - 24;
    const vh = viewer.clientHeight - 24;
    if (vw <= 0 || vh <= 0) return;
    const isMultiPage = docNaturalSize.h > vh * 1.3;
    const refH = isMultiPage ? vh : docNaturalSize.h;
    const scaleW = vw / docNaturalSize.w;
    const scaleH = vh / refH;
    setScale(Math.min(scaleW, scaleH, 3));
  }, [docNaturalSize]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => { calcScale(); });
    ro.observe(viewer);
    return () => ro.disconnect();
  }, [calcScale]);

  const fallbackContent = useMemo(() => {
    if (!selectedTemplate) return '';
    const raw = selectedTemplate.sampleContent ?? '';
    if (!raw) return '';
    return previewRecord ? (replaceTemplateVariables(raw, previewRecord) || raw) : raw;
  }, [selectedTemplate, previewRecord]);

  const showFallback = !selectedTemplate?.file || docxRenderFailed;

  if (loading) return (
    <div data-testid="templates-view" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div data-testid="tv-loading" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Spinner size={28} />
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b' }}>Cargando plantillas…</div>
      </div>
    </div>
  );

  if (!templates || templates.length === 0) return (
    <div data-testid="templates-view" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div data-testid="tv-empty" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>No hay plantillas disponibles</div>
        <div style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: 16 }}>Carga plantillas .docx en el Módulo 2 para verlas aquí.</div>
        <Button variant="primary" onClick={() => goTo('configuracion')} data-testid="tv-go-config">Ir a Cargar Plantillas</Button>
      </div>
    </div>
  );

  return (
    <div data-testid="templates-view" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, gap: 8 }}>
      <style>{`
        .tv-root{display:flex;flex-direction:column;height:100%;min-height:0;gap:8px}
        .tv-header{flex-shrink:0;padding:2px 0 2px}
        .tv-summary{flex-shrink:0;padding:4px 0}
        .tv-layout{display:grid;grid-template-columns:250px 1fr 280px;gap:8px;flex:1;min-height:0;align-items:stretch}
        @media(max-width:1100px){.tv-layout{grid-template-columns:220px 1fr 260px}}
        @media(max-width:900px){.tv-layout{grid-template-columns:1fr}}
        .tv-panel{background:#fff;border:1px solid var(--border);border-radius:10px;overflow:hidden;box-shadow:var(--shadow-xs);display:flex;flex-direction:column;min-height:0;height:100%}
        .tv-panel-hdr{flex-shrink:0;padding:6px 10px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
        .tv-panel-search{flex-shrink:0;padding:5px 8px;border-bottom:1px solid var(--border)}
        .tv-panel-filters{flex-shrink:0;padding:4px 8px;border-bottom:1px solid var(--border);display:flex;gap:4px}
        .tv-panel-body{flex:1;overflow-y:auto;min-height:0;padding:6px 8px;scrollbar-width:thin}
        .tv-panel-footer{flex-shrink:0}
        .tv-card{transition:all 150ms ease}.tv-card:hover{transform:translateY(-1px);box-shadow:var(--shadow-sm)}
        .tv-preview-viewer{flex:1;min-height:180px;background:#f1f5f9;overflow:auto;display:flex;flex-direction:column;scrollbar-width:thin;scrollbar-gutter:stable}
        .tv-preview-viewer::-webkit-scrollbar{width:6px}.tv-preview-viewer::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:999px}
        .tv-preview-viewer .docx-wrapper{background:transparent!important;padding:0!important}
        .tv-preview-viewer .docx-wrapper>section.docx{margin:0 auto!important;box-shadow:0 4px 20px rgba(0,0,0,.08)!important;border-radius:4px!important;background:#fff!important}
        .tv-rr{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:8px;border:1px solid var(--border);border-left:3px solid transparent;background:#fff;transition:all 150ms ease;cursor:pointer}
        .tv-rr:hover{border-color:#93c5fd;background:#f8fafc;border-left-color:#93c5fd}
        .tv-rr.sel{border-color:#004B93;border-left-color:#004B93;background:#eff6ff}
        .tv-badge{display:inline-flex;align-items:center;gap:4px;font-size:.6rem;font-weight:700;padding:2px 6px;border-radius:999px}
        .tv-progress{height:4px;background:#e2e8f0;border-radius:999px;overflow:hidden;flex:1;max-width:140px}
        .tv-progress-fill{height:100%;background:#004B93;border-radius:999px;transition:width 300ms ease}
        .tv-actions{flex-shrink:0;padding-top:0}
        .tv-zoom-btn{width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;border:1px solid #e2e8f0;border-radius:6px;background:#fff;color:#475569;cursor:pointer;transition:all 120ms ease;font-size:0.6rem;font-weight:700;padding:0}
        .tv-zoom-btn:hover{background:#f1f5f9;border-color:#93c5fd;color:#004B93}
        .tv-zoom-btn.active{background:#004B93;border-color:#004B93;color:#fff}
        .tv-zoom-sep{width:1px;height:14px;background:#e2e8f0;margin:0 2px}
        .tv-vars{flex-shrink:0;border-top:1px solid var(--border);background:#fff;overflow:hidden;transition:max-height 200ms ease}
        .tv-vars-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:none;border:none;cursor:pointer;font-size:0.65rem;font-weight:800;color:#475569}
        .tv-vars-body{padding:2px 10px 8px;overflow-y:auto;max-height:64px}
      `}</style>

      <div className="tv-header" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 0, paddingBottom: 0 }}>
        <span style={{ width: 28, height: 28, borderRadius: 7, background: '#eff6ff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#004B93', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#004B93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        </span>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>Módulo 4: Selección de Plantilla</h2>
          <p style={{ fontSize: '0.65rem', color: '#64748b', margin: 0 }}>Selecciona una plantilla y asígnala a uno o varios registros.</p>
        </div>
      </div>

      <div className="tv-summary" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 12px', boxShadow: 'var(--shadow-xs)' }} data-testid="tv-summary">
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
          <strong style={{ color: '#004B93' }}>{totalCount}</strong> registros ·{' '}
          <strong style={{ color: '#047857' }}>{assignedCount}</strong> asignado{assignedCount !== 1 ? 's' : ''} ·{' '}
          <strong style={{ color: pendingCount > 0 ? '#92400e' : '#64748b' }}>{pendingCount}</strong> pendiente{pendingCount !== 1 ? 's' : ''}
        </span>
        <div className="tv-progress"><div className="tv-progress-fill" style={{ width: `${progressPct}%` }} /></div>
        {allAssigned ? (
          <span className="tv-badge" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', flexShrink: 0 }}>Todos asignados</span>
        ) : (
          <span style={{ fontSize: '0.62rem', color: '#94a3b8', flexShrink: 0 }}>Asignación: {assignedCount} de {totalCount}</span>
        )}
      </div>

      <div className="tv-layout" data-testid="tv-layout">
        <div className="tv-panel">
          <div className="tv-panel-hdr">
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155' }}>Plantillas</span>
            <Badge variant="info" style={{ fontSize: '0.6rem' }} data-testid="tv-count">{filteredTemplates.length}</Badge>
          </div>
          <div className="tv-panel-search">
            <Input placeholder="Buscar plantilla..." value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)} data-testid="tv-search-input" />
          </div>
          <div className="tv-panel-body" data-testid="tv-list">
            {filteredTemplates.length === 0 ? (
              <div data-testid="tv-empty-search" style={{ textAlign: 'center', padding: '20px 10px', color: '#94a3b8', fontSize: '0.75rem' }}>No se encontraron plantillas</div>
            ) : filteredTemplates.map((tpl) => {
              const isActive = selectedTemplate?.id === tpl.id;
              const count = Object.values(templateAssignments).filter((tid) => tid === tpl.id).length;
              return (
                <button key={tpl.id} type="button" onClick={() => selectTemplate(tpl.id)} data-testid={`tv-card-${tpl.id}`} aria-pressed={isActive} className="tv-card" style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: `2px solid ${isActive ? '#004B93' : '#e2e8f0'}`, background: isActive ? '#eff6ff' : '#fff', cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
                  <span style={{ width: 24, height: 24, borderRadius: 6, background: isActive ? '#dbeafe' : '#f1f5f9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: isActive ? '#004B93' : '#64748b' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: isActive ? 800 : 600, color: isActive ? '#004B93' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tpl.title || tpl.fileName} data-testid={`tv-title-${tpl.id}`}>{tpl.title || tpl.fileName}</span>
                    {count > 0 && <span style={{ fontSize: '0.58rem', color: '#047857', fontWeight: 600 }}>{count} registro{count !== 1 ? 's' : ''}</span>}
                  </span>
                  {isActive && <span style={{ color: '#004B93', flexShrink: 0 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="tv-panel" data-testid="tv-preview-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          {!selectedTemplate ? (
            <div data-testid="tv-preview-empty" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', textAlign: 'center', color: '#94a3b8' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Selecciona una plantilla</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 3 }}>Elige una plantilla de la izquierda para previsualizar</div>
            </div>
          ) : (
            <>
              <div style={{ flexShrink: 0, padding: '4px 12px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.68rem', color: '#1e40af', fontWeight: 600 }}>
                <span style={{ whiteSpace: 'nowrap' }}>Vista previa:</span>
                <span data-testid="tv-preview-record" style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewRecord ? String((previewRecord as unknown as Record<string, unknown>).nombreSolicitante ?? '—') : '—'}</span>
              </div>

              <div data-testid="tv-preview-viewer" ref={viewerRef} className="tv-preview-viewer" style={{ flex: 1, background: '#f1f5f9', overflow: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', flex: 1, padding: 12, minHeight: 0 }}>
                  <div ref={docWrapperRef} data-testid="tv-preview-document" data-centered="true" style={{ transformOrigin: 'top center', transform: `scale(${scale})`, transition: 'transform 200ms ease', flexShrink: 0 }}>
                    <div ref={previewContainerRef} style={{ minHeight: selectedTemplate.file ? 200 : 0, display: selectedTemplate.file ? 'block' : 'none' }} />
                    {showFallback && (
                      <div style={{ background: '#fff', padding: '24px 28px', boxShadow: '0 4px 20px rgba(0,0,0,.08)', borderRadius: 4, minHeight: 200, maxWidth: 560 }}>
                        <div data-testid="tv-fallback-content" ref={fallbackRef} style={{ fontSize: 11, lineHeight: 1.75, color: '#1e293b', whiteSpace: 'pre-wrap', fontFamily: 'Georgia, "Times New Roman", serif' }}>
                          {fallbackContent || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin contenido de vista previa</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ flexShrink: 0, padding: '3px 8px', borderTop: '1px solid var(--border)', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 3 }}>
                <button type="button" className="tv-zoom-btn" onClick={zoomOut} title="Reducir" data-testid="tv-zoom-out">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#475569', minWidth: 32, textAlign: 'center', userSelect: 'none' }} data-testid="tv-zoom-pct">{Math.round(scale * 100)}%</span>
                <button type="button" className="tv-zoom-btn" onClick={zoomIn} title="Aumentar" data-testid="tv-zoom-in">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                <div className="tv-zoom-sep" />
                <button type="button" className="tv-zoom-btn active" onClick={fitToPage} title="Ajustar página" data-testid="tv-zoom-fit-page" style={{ width: 'auto', padding: '0 5px', fontSize: '0.58rem', gap: 2 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                  Página
                </button>
              </div>

              <div className="tv-vars" style={{ maxHeight: varsExpanded ? 92 : 30 }} data-testid="tv-variables">
                <button type="button" className="tv-vars-toggle" onClick={() => setVarsExpanded(!varsExpanded)}>
                  <span>Variables ({selectedTemplate.variables?.length ?? 0})</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 200ms', transform: varsExpanded ? 'rotate(180deg)' : 'rotate(0deg)', color: '#94a3b8' }}><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div className="tv-vars-body">
                  {(!selectedTemplate.variables || selectedTemplate.variables.length === 0) ? (
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }} data-testid="tv-no-vars">Sin variables detectadas</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }} data-testid="tv-vars-list">
                      {selectedTemplate.variables.map((v) => {
                        const vs = getSourceStyle(v.source);
                        return <span key={v.key} data-testid={`tv-var-${v.key}`} title={`${v.label} — ${v.source}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.58rem', fontWeight: 700, padding: '2px 5px', borderRadius: 999, background: vs.bg, color: vs.color, border: `1px solid ${vs.border}` }}>[{v.key}] <span style={{ opacity: .75, fontSize: '.52rem', textTransform: 'uppercase' }}>{v.source}</span></span>;
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="tv-panel" data-testid="tv-records-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="tv-panel-hdr">
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155' }}>Registros</span>
            <Badge variant="info" style={{ fontSize: '0.6rem' }} data-testid="tv-record-count">{filteredRecords.length}/{totalCount}</Badge>
          </div>
          <div className="tv-panel-search">
            <Input placeholder="Buscar por nombre, cuenta..." value={recordSearch} onChange={(e) => setRecordSearch(e.target.value)} data-testid="tv-record-search" />
          </div>
          <div className="tv-panel-filters">
            {(['todos', 'asignado', 'sin_asignar'] as const).map((f) => (
              <button key={f} type="button" onClick={() => setRecordStatusFilter(f)} style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: 999, border: 'none', cursor: 'pointer', background: recordStatusFilter === f ? '#004B93' : '#f1f5f9', color: recordStatusFilter === f ? '#fff' : '#64748b', transition: 'all 150ms' }} data-testid={`tv-filter-${f}`}>
                {f === 'todos' ? 'Todos' : f === 'asignado' ? 'Asignados' : 'Sin asignar'}
              </button>
            ))}
          </div>
          <div className="tv-panel-body" data-testid="tv-record-list">
            {filteredRecords.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 10px', color: '#94a3b8', fontSize: '0.72rem' }} data-testid="tv-record-empty">
                {selectedRecords.length === 0 ? 'No hay registros seleccionados en Módulo 3' : 'No se encontraron registros'}
              </div>
            ) : (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px', fontSize: '0.65rem', color: '#64748b', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', marginBottom: 1 }}>
                  <input type="checkbox" checked={filteredRecords.length > 0 && filteredRecords.every((r) => recordCheckboxes.has((r as unknown as { rowId: string }).rowId))} onChange={handleToggleAllRecords} style={{ accentColor: '#004B93' }} />
                  Todos ({filteredRecords.length})
                </label>
                {filteredRecords.map((r) => {
                  const rr = r as unknown as Record<string, unknown>;
                  const rowId = (r as unknown as { rowId: string }).rowId;
                  const nombre = String(rr.nombreSolicitante ?? '—');
                  const cuenta = String(rr.numeroCuenta ?? rr.cuenta ?? '—');
                  const radicado = String(rr.radicadoEntrada ?? '—');
                  const assignedTid = templateAssignments[rowId];
                  const assignedTpl = assignedTid ? templates.find((t) => t.id === assignedTid) : null;
                  const isChecked = recordCheckboxes.has(rowId);
                  return (
                    <div key={rowId} className={`tv-rr ${isChecked ? 'sel' : ''}`} onClick={() => handleToggleRecord(rowId)} data-testid={`tv-record-${rowId}`}>
                      <input type="checkbox" checked={isChecked} onChange={() => handleToggleRecord(rowId)} onClick={(e) => e.stopPropagation()} style={{ accentColor: '#004B93', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={nombre}>{nombre}</div>
                        <div style={{ fontSize: '0.6rem', color: '#64748b', display: 'flex', gap: 5, marginTop: 1 }}><span>Cta: {cuenta}</span><span>Rad: {radicado}</span></div>
                        {assignedTpl ? (
                          <div style={{ marginTop: 1 }}><span className="tv-badge" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> {assignedTpl.title || assignedTpl.fileName}</span></div>
                        ) : (
                          <div style={{ marginTop: 1 }}><span className="tv-badge" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>Sin asignar</span></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
          <div className="tv-panel-footer" style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', background: '#f9fafb' }}>
            <Button variant="primary" disabled={!selectedTemplate || recordCheckboxes.size === 0} onClick={handleAssignTemplate} data-testid="tv-assign-btn" style={{ width: '100%', fontSize: '0.72rem' }}>
              {selectedTemplate && recordCheckboxes.size > 0 ? `Asignar a ${recordCheckboxes.size} registro${recordCheckboxes.size !== 1 ? 's' : ''}` : 'Selecciona plantilla y registros'}
            </Button>
          </div>
        </div>
      </div>

      <div className="tv-actions" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', boxShadow: 'var(--shadow-xs)', flexShrink: 0 }} data-testid="tv-actions">
        <Button variant="ghost" onClick={() => goTo('datos')} data-testid="tv-volver">Volver</Button>
        <Button variant="primary" disabled={!allAssigned} onClick={handleContinue} data-testid="tv-continuar" title={!allAssigned ? 'Asigna una plantilla a todos los registros para continuar' : 'Continuar'}>
          Continuar a Generación
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6 }}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </Button>
      </div>

      <span style={{ display: 'none' }} data-testid="tv-continuar-alias">Continuar a Vista Previa</span>

      {confirmOverwrite.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} data-testid="tv-confirm-overlay" onClick={() => setConfirmOverwrite({ open: false, rowIds: [], templateId: '' })}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '24px 28px', maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Reemplazar plantilla</div>
            <div style={{ fontSize: '0.84rem', color: '#475569', marginBottom: 20 }}>
              Algunos registros ya tienen una plantilla asignada diferente. ¿Deseas reemplazarla?
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setConfirmOverwrite({ open: false, rowIds: [], templateId: '' })}>Cancelar</Button>
              <Button variant="primary" onClick={handleConfirmOverwrite} data-testid="tv-confirm-overwrite">Reemplazar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplatesView;

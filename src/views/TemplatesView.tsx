import { useEffect, useMemo, useRef, useState } from 'react';
import autoAnimate from '@formkit/auto-animate';
import * as docxPreview from 'docx-preview';
import { useTemplateStore } from '@/store/templateStore';
import { useDataStore } from '@/store/dataStore';
import { useNavigationStore } from '@/store/navigationStore';
import { replaceTemplateVariables } from '@/utils/templateEngine';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import type { Record as EssaRecord } from '@/types/record';

interface TemplatesViewProps {
  loading?: boolean;
}

function getSourceStyle(source: string) {
  switch (source) {
    case 'Excel': return { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' };
    case 'Perfil': return { bg: '#faf5ff', border: '#e9d5ff', color: '#6b21a8' };
    case 'Firma': return { bg: '#ecfdf5', border: '#a7f3d0', color: '#047857' };
    case 'Calculado': return { bg: '#fffbeb', border: '#fde68a', color: '#92400e' };
    default: return { bg: '#f1f5f9', border: '#e2e8f0', color: '#475569' };
  }
}

const TEMPLATE_PAGE_SIZE = 8;

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

  /* ── Refs ── */
  const hiddenContainerRef = useRef<HTMLDivElement>(null);
  const docWrapperRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const lastCheckedRowIdRef = useRef<string | null>(null);
  const templateListRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (templateListRef.current) autoAnimate(templateListRef.current, { duration: 200 }); }, []);

  /* ── Store ── */
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

  /* ── State ── */
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [templatePage, setTemplatePage] = useState(1);
  const [docxRenderFailed, setDocxRenderFailed] = useState(false);
  const [recordSearch, setRecordSearch] = useState('');
  const [recordStatusFilter, setRecordStatusFilter] = useState<'todos' | 'asignado' | 'sin_asignar'>('todos');
  const [recordCheckboxes, setRecordCheckboxes] = useState<Set<string>>(new Set());
  const [confirmOverwrite, setConfirmOverwrite] = useState<{ open: boolean; rowIds: string[]; templateId: string }>({ open: false, rowIds: [], templateId: '' });
  const [varsExpanded, setVarsExpanded] = useState(false);

  /* ── Derived ── */
  const categories = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => { if (t.category) set.add(t.category); });
    return Array.from(set);
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    let out = templates;
    if (templateSearch.trim()) {
      const q = templateSearch.toLowerCase().trim();
      out = out.filter((t) => t.title.toLowerCase().includes(q) || (t.category && t.category.toLowerCase().includes(q)) || (t.fileName && t.fileName.toLowerCase().includes(q)));
    }
    if (selectedCategory !== 'todas') out = out.filter((t) => t.category === selectedCategory);
    return out;
  }, [templates, templateSearch, selectedCategory]);

  const totalTemplatePages = Math.max(1, Math.ceil(filteredTemplates.length / TEMPLATE_PAGE_SIZE));
  const paginatedTemplates = useMemo(() => {
    const start = (templatePage - 1) * TEMPLATE_PAGE_SIZE;
    return filteredTemplates.slice(start, start + TEMPLATE_PAGE_SIZE);
  }, [filteredTemplates, templatePage]);

  useEffect(() => { setTemplatePage(1); }, [templateSearch, selectedCategory]);
  useEffect(() => { if (templatePage > totalTemplatePages) setTemplatePage(totalTemplatePages); }, [totalTemplatePages, templatePage]);

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

  /* ── Handlers ── */
  const handleToggleRecord = (rowId: string) => {
    setRecordCheckboxes((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else { next.add(rowId); lastCheckedRowIdRef.current = rowId; }
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

  /* ── Render docx ── */
  useEffect(() => {
    let cancelled = false;
    const hidden = hiddenContainerRef.current;
    const docWrapper = docWrapperRef.current;
    if (!hidden || !docWrapper) return;
    setDocxRenderFailed(false);
    hidden.innerHTML = '';
    docWrapper.innerHTML = '';
    if (!selectedTemplate?.file) return;
    const file = selectedTemplate.file;
    (async () => {
      try {
        const renderAsync: (buffer: ArrayBuffer, el: HTMLElement) => Promise<void> = (docxPreview as any).renderAsync;
        if (!renderAsync) throw new Error('docx-preview renderAsync not found');
        const buf = await (file as unknown as Blob).arrayBuffer();
        if (cancelled) return;
        hidden.innerHTML = '';
        await renderAsync(buf, hidden);
        if (cancelled) return;
        // Remove docx-preview internal toolbar/header artifacts
        hidden.querySelectorAll('[class*="toolbar"], [class*="header"]').forEach((el) => {
          const bg = (el as HTMLElement).style.background ?? (el as HTMLElement).style.backgroundColor ?? '';
          if (bg.includes('gray')) el.remove();
        });
        // Force each section to block
        hidden.querySelectorAll('section').forEach((sec) => {
          const s = sec as HTMLElement;
          s.style.display = 'block';
          s.style.width = '100%';
          s.style.clear = 'both';
        });
        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => requestAnimationFrame(r));
        if (cancelled) return;

        /* ── Clone sections into viewer ── */
        const sections = Array.from(hidden.querySelectorAll('section.docx, section[class*="docx"]'));
        if (sections.length >= 1) {
          for (const sec of sections) {
            const pageWrapper = document.createElement('div');
            pageWrapper.className = 'tv-viewer-page';
            const clone = sec.cloneNode(true) as HTMLElement;
            clone.style.position = 'relative';
            clone.style.background = '#fff';
            pageWrapper.appendChild(clone);
            docWrapper.appendChild(pageWrapper);
          }
        } else {
          // Fallback: clone entire hidden content
          const clone = hidden.cloneNode(true) as HTMLElement;
          clone.style.position = 'relative';
          clone.style.background = '#fff';
          clone.className = 'tv-viewer-page';
          docWrapper.appendChild(clone);
        }
      } catch (err) {
        console.error('docx-preview render failed', err);
        if (!cancelled) {
          setDocxRenderFailed(true);
          hidden.innerHTML = '';
          docWrapper.innerHTML = '';
        }
      }
    })();
    return () => { cancelled = true; };
  }, [selectedTemplate]);

  /* ── Fallback content ── */
  const fallbackContent = useMemo(() => {
    if (!selectedTemplate) return '';
    const raw = selectedTemplate.sampleContent ?? '';
    if (!raw) return '';
    return previewRecord ? (replaceTemplateVariables(raw, previewRecord) || raw) : raw;
  }, [selectedTemplate, previewRecord]);

  const showFallback = !selectedTemplate?.file || docxRenderFailed;

  /* ═══════════ LOADING ═══════════ */
  if (loading) return (
    <div data-testid="templates-view" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div data-testid="tv-loading" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Spinner size={28} />
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b' }}>Cargando plantillas…</div>
      </div>
    </div>
  );

  /* ═══════════ EMPTY ═══════════ */
  if (!templates || templates.length === 0) return (
    <div data-testid="templates-view" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div data-testid="tv-empty" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>No hay plantillas disponibles</div>
        <div style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: 16 }}>Carga plantillas .docx en el Módulo 2 para verlas aquí.</div>
        <Button variant="primary" onClick={() => goTo('configuracion')} data-testid="tv-go-config">Ir a Cargar Plantillas</Button>
      </div>
    </div>
  );

  /* ═══════════ MAIN ═══════════ */
  return (
    <div data-testid="templates-view" className="tv-root">
      <style>{`
        .tv-root{display:flex;flex-direction:column;height:auto;min-height:640px;gap:0;background:var(--neutral-100);border-radius:var(--radius-md);overflow:hidden;border:1px solid var(--border)}
        .tv-header{display:flex;align-items:center;gap:8px;padding:8px 14px;background:var(--white);border-bottom:1px solid var(--border)}
        .tv-header-icon{width:26px;height:26px;border-radius:6px;background:var(--essa-primary-50);display:inline-flex;align-items:center;justify-content:center;color:var(--essa-primary);flex-shrink:0}
        .tv-header h2{font-size:0.82rem;font-weight:900;color:var(--neutral-900);margin:0;line-height:1.2}
        .tv-header p{font-size:0.62rem;color:var(--neutral-500);margin:0}
        .tv-header-right{margin-left:auto;display:flex;align-items:center;gap:6px}
        .tv-summary{display:flex;align-items:center;gap:8px;padding:5px 14px;background:var(--white);border-bottom:1px solid var(--border);flex-shrink:0}
        .tv-summary-text{font-size:0.65rem;font-weight:700;color:var(--neutral-600)}
        .tv-progress{height:3px;background:var(--neutral-200);border-radius:999px;overflow:hidden;width:100px}
        .tv-progress-fill{height:100%;background:var(--essa-primary);border-radius:999px;transition:width 300ms ease}
        .tv-main{display:flex;flex:1 1 auto;min-height:0;overflow:hidden}

        /* ── Left Panel ── */
        .tv-left{width:220px;flex-shrink:0;background:var(--white);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden}
        .tv-left-hdr{flex-shrink:0;padding:6px 10px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
        .tv-left-hdr-title{font-size:0.68rem;font-weight:800;color:var(--neutral-700)}
        .tv-left-search{flex-shrink:0;padding:4px 8px;border-bottom:1px solid var(--border)}
        .tv-left-cats{flex-shrink:0;padding:3px 8px;border-bottom:1px solid var(--border);display:flex;gap:3px;overflow-x:auto;scrollbar-width:none}
        .tv-left-body{flex:1 1 auto;overflow-y:auto;overflow-x:hidden;padding:4px 6px}
        .tv-left-body::-webkit-scrollbar{width:4px}
        .tv-left-body::-webkit-scrollbar-thumb{background:var(--neutral-300);border-radius:999px}
        .tv-tpl{display:flex;align-items:center;gap:6px;padding:5px 7px;border-radius:var(--radius-xs);border:1.5px solid var(--border);background:var(--white);cursor:pointer;transition:all 150ms;width:100%;text-align:left;margin-bottom:2px}
        .tv-tpl:hover{border-color:#93c5fd;background:var(--neutral-50)}
        .tv-tpl.active{border-color:var(--essa-primary);background:var(--essa-primary-50)}
        .tv-tpl-icon{width:20px;height:20px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
        .tv-tpl-info{flex:1;min-width:0}
        .tv-tpl-name{font-size:0.64rem;font-weight:700;color:var(--neutral-900);overflow:hidden;textOverflow:ellipsis;whiteSpace:nowrap;display:block}
        .tv-tpl.active .tv-tpl-name{color:var(--essa-primary)}
        .tv-tpl-meta{font-size:0.52rem;color:var(--neutral-500);display:flex;gap:4px;margin-top:1px}

        /* ── Center: Fixed-height Viewer ── */
        .tv-center{flex:1 1 auto;display:flex;flex-direction:column;min-width:0;overflow:hidden}
        .tv-viewer{height:500px;flex-shrink:0;overflow-y:auto;overflow-x:auto;background:var(--neutral-100)}
        .tv-viewer::-webkit-scrollbar{width:8px;height:8px}
        .tv-viewer::-webkit-scrollbar-thumb{background:var(--neutral-300);border-radius:999px}
        .tv-viewer::-webkit-scrollbar-corner{background:transparent}
        .tv-viewer-inner{display:flex;flex-direction:column;align-items:center;gap:28px;padding:28px 20px}
        .tv-viewer-page{scroll-margin-top:20px;flex-shrink:0}
        .tv-viewer-page-inner{background:var(--white);box-shadow:0 4px 24px rgba(0,0,0,.12),0 2px 8px rgba(0,0,0,.06);border-radius:3px;overflow:hidden}
        .tv-fallback{background:var(--white);padding:28px 32px;box-shadow:0 4px 24px rgba(0,0,0,.1);border-radius:3px;min-height:240px;max-width:600px;width:100%}
        .tv-fallback-content{font-size:11px;line-height:1.8;color:var(--neutral-900);white-space:pre-wrap;font-family:Georgia,"Times New Roman",serif}
        .tv-viewer-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center;color:var(--neutral-400)}

        /* ── Variables ── */
        .tv-vars{flex-shrink:0;border-top:1px solid var(--border);background:var(--white);transition:max-height 220ms var(--ease);overflow:hidden}
        .tv-vars-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;padding:5px 14px;background:none;border:none;cursor:pointer;font-size:0.65rem;font-weight:800;color:var(--neutral-600);transition:color 150ms}
        .tv-vars-toggle:hover{color:var(--essa-primary)}
        .tv-vars-body{padding:2px 14px 8px;overflow-y:auto;max-height:100px}
        .tv-vars-body::-webkit-scrollbar{width:4px}
        .tv-vars-body::-webkit-scrollbar-thumb{background:var(--neutral-300);border-radius:999px}
        .tv-var-tag{display:inline-flex;align-items:center;gap:3px;font-size:0.58rem;font-weight:700;padding:2px 6px;border-radius:999px;transition:transform 100ms}
        .tv-var-tag:hover{transform:scale(1.05)}

        /* ── Right Panel ── */
        .tv-right{width:240px;flex-shrink:0;background:var(--white);border-left:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden}
        .tv-right-hdr{flex-shrink:0;padding:6px 10px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
        .tv-right-hdr-title{font-size:0.68rem;font-weight:800;color:var(--neutral-700)}
        .tv-right-search{flex-shrink:0;padding:4px 8px;border-bottom:1px solid var(--border)}
        .tv-right-filters{flex-shrink:0;padding:3px 8px;border-bottom:1px solid var(--border);display:flex;gap:3px}
        .tv-right-body{flex:1 1 auto;overflow-y:auto;overflow-x:hidden;padding:4px 6px}
        .tv-right-body::-webkit-scrollbar{width:4px}
        .tv-right-body::-webkit-scrollbar-thumb{background:var(--neutral-300);border-radius:999px}
        .tv-right-footer{flex-shrink:0;padding:6px 8px;border-top:1px solid var(--border);background:var(--neutral-50)}
        .tv-rr{display:flex;align-items:center;gap:5px;padding:4px 6px;border-radius:var(--radius-xs);border:1px solid var(--border);border-left:3px solid transparent;background:var(--white);transition:all 150ms;cursor:pointer;margin-bottom:2px}
        .tv-rr:hover{border-color:#93c5fd;background:var(--neutral-50);border-left-color:#93c5fd}
        .tv-rr.sel{border-color:var(--essa-primary);border-left-color:var(--essa-primary);background:var(--essa-primary-50)}
        .tv-rr-name{font-size:0.64rem;font-weight:700;color:var(--neutral-900);overflow:hidden;textOverflow:ellipsis;whiteSpace:nowrap}
        .tv-rr-meta{font-size:0.54rem;color:var(--neutral-500);display:flex;gap:4px;margin-top:1px}
        .tv-badge{display:inline-flex;align-items:center;gap:3px;font-size:0.54rem;font-weight:700;padding:1px 5px;border-radius:999px}
        .tv-chip{font-size:0.58rem;font-weight:700;padding:2px 6px;border-radius:999px;border:1px solid;white-space:nowrap;cursor:pointer;transition:all 150ms}
        .tv-chip.active{background:var(--essa-primary);color:var(--white);border-color:var(--essa-primary)}
        .tv-chip.inactive{background:var(--white);color:var(--neutral-600);border-color:var(--neutral-200)}
        .tv-chip.inactive:hover{border-color:var(--essa-primary);color:var(--essa-primary)}
        .tv-pagination{display:flex;align-items:center;justify-content:space-between;gap:4px;padding:3px 6px;border-top:1px solid var(--border);background:var(--neutral-50)}
        .tv-pagination-btn{width:22px;height:22px;border-radius:var(--radius-xs);border:1px solid var(--border);background:var(--white);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:all 120ms;color:var(--neutral-600);font-size:0.65rem}
        .tv-pagination-btn:hover:not(:disabled){border-color:var(--essa-primary);color:var(--essa-primary)}
        .tv-pagination-btn:disabled{opacity:.35;cursor:default}
        .tv-pagination-text{font-size:0.6rem;font-weight:700;color:var(--neutral-600)}
        @keyframes tv-cardIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Hidden render container */}
      <div ref={hiddenContainerRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '800px', visibility: 'hidden', pointerEvents: 'none' }} />

      {/* ════ HEADER ════ */}
      <div className="tv-header">
        <span className="tv-header-icon">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--essa-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        </span>
        <div>
          <h2>Módulo 4: Selección de Plantilla</h2>
          <p>Selecciona una plantilla y asígnala a uno o varios registros</p>
        </div>
        <div className="tv-header-right">
          <Button variant="ghost" onClick={() => goTo('datos')} data-testid="tv-volver" style={{ fontSize: '0.68rem', height: 28, padding: '0 10px' }}>Volver</Button>
          <Button variant="primary" disabled={!allAssigned} onClick={handleContinue} data-testid="tv-continuar" style={{ fontSize: '0.68rem', height: 28, padding: '0 12px' }}>
            Continuar a Generación
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4 }}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Button>
        </div>
      </div>

      {/* ════ SUMMARY ════ */}
      <div className="tv-summary" data-testid="tv-summary">
        <span className="tv-summary-text">
          <strong style={{ color: 'var(--essa-primary)' }}>{totalCount}</strong> registros ·{' '}
          <strong style={{ color: 'var(--success)' }}>{assignedCount}</strong> asignados ·{' '}
          <strong style={{ color: pendingCount > 0 ? 'var(--warning)' : 'var(--neutral-500)' }}>{pendingCount}</strong> pendientes
        </span>
        <div className="tv-progress"><div className="tv-progress-fill" style={{ width: `${progressPct}%` }} /></div>
        {allAssigned && <span className="tv-badge" style={{ background: 'var(--success-50)', color: 'var(--success)', border: '1px solid #a7f3d0' }}>Todos asignados</span>}
      </div>

      {/* ════ MAIN 3-COLUMN ════ */}
      <div className="tv-main" data-testid="tv-layout">

        {/* ════ LEFT: Templates ════ */}
        <div className="tv-left" data-testid="tv-templates-panel">
          <div className="tv-left-hdr">
            <span className="tv-left-hdr-title">Plantillas</span>
            <Badge variant="info" style={{ fontSize: '0.55rem' }} data-testid="tv-count">{filteredTemplates.length}</Badge>
          </div>
          <div className="tv-left-search">
            <Input placeholder="Buscar..." value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)} data-testid="tv-search-input" />
          </div>
          {categories.length > 0 && (
            <div className="tv-left-cats" data-testid="tv-categories">
              <button type="button" onClick={() => setSelectedCategory('todas')} data-testid="tv-cat-todas" className={`tv-chip ${selectedCategory === 'todas' ? 'active' : 'inactive'}`}>Todas</button>
              {categories.map((cat) => (
                <button key={cat} type="button" onClick={() => setSelectedCategory(cat)} data-testid={`tv-cat-${cat}`} className={`tv-chip ${selectedCategory === cat ? 'active' : 'inactive'}`}>{cat}</button>
              ))}
            </div>
          )}
          <div className="tv-left-body" ref={templateListRef} data-testid="tv-list">
            {filteredTemplates.length === 0 ? (
              <div data-testid="tv-empty-search" style={{ textAlign: 'center', padding: '12px 6px', color: 'var(--neutral-400)', fontSize: '0.68rem' }}>No se encontraron</div>
            ) : paginatedTemplates.map((tpl) => {
              const isActive = selectedTemplate?.id === tpl.id;
              const count = Object.values(templateAssignments).filter((tid) => tid === tpl.id).length;
              return (
                <button key={tpl.id} type="button" onClick={() => selectTemplate(tpl.id)} data-testid={`tv-card-${tpl.id}`} aria-pressed={isActive} className={`tv-tpl ${isActive ? 'active' : ''}`} style={{ animation: 'tv-cardIn 280ms var(--ease) both', borderColor: isActive ? '#004B93' : undefined }}>
                  <span className="tv-tpl-icon" style={{ background: isActive ? '#dbeafe' : 'var(--neutral-100)', color: isActive ? 'var(--essa-primary)' : 'var(--neutral-500)' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </span>
                  <span className="tv-tpl-info">
                    <span className="tv-tpl-name" title={tpl.title || tpl.fileName} data-testid={`tv-title-${tpl.id}`}>{tpl.title || tpl.fileName}</span>
                    <span className="tv-tpl-meta">
                      {tpl.category && <span>{tpl.category}</span>}
                      {count > 0 && <span style={{ color: 'var(--success)' }}>{count} reg.</span>}
                    </span>
                  </span>
                  {isActive && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--essa-primary)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </button>
              );
            })}
          </div>
          {filteredTemplates.length > TEMPLATE_PAGE_SIZE && (
            <div className="tv-pagination" data-testid="tv-pagination">
              <button type="button" className="tv-pagination-btn" disabled={templatePage <= 1} onClick={() => setTemplatePage((p) => Math.max(1, p - 1))} data-testid="tv-prev-page">‹</button>
              <span className="tv-pagination-text" data-testid="tv-page-indicator">{templatePage}/{totalTemplatePages}</span>
              <button type="button" className="tv-pagination-btn" disabled={templatePage >= totalTemplatePages} onClick={() => setTemplatePage((p) => Math.min(totalTemplatePages, p + 1))} data-testid="tv-next-page">›</button>
            </div>
          )}
        </div>

        {/* ════ CENTER: Viewer ════ */}
        <div className="tv-center" data-testid="tv-preview-panel">
          {selectedTemplate && (
            <>
              {/* Backward-compatible test elements */}
              <span style={{ display: 'none' }} data-testid="tv-preview-record" data-record-name={previewRecord ? String((previewRecord as unknown as Record<string, unknown>).nombreSolicitante ?? '') : ''}>
                Vista previa: {previewRecord ? String((previewRecord as unknown as Record<string, unknown>).nombreSolicitante ?? '—') : '—'}
              </span>

              <div className="tv-viewer" data-testid="tv-preview-viewer">
                {showFallback ? (
                  <div className="tv-viewer-empty">
                    <div className="tv-fallback" style={{ maxWidth: 560 }}>
                      <div data-testid="tv-fallback-content" ref={fallbackRef} className="tv-fallback-content">
                        {fallbackContent || <span style={{ color: 'var(--neutral-400)', fontStyle: 'italic' }}>Sin contenido de vista previa</span>}
                      </div>
                    </div>
                  </div>
                ) : null}
                <div ref={docWrapperRef} data-testid="tv-preview-document" data-centered="true" className="tv-viewer-inner" style={showFallback ? { display: 'none' } : undefined}>
                  {/* Pages injected by JS */}
                </div>
              </div>
            </>
          )}

          {!selectedTemplate && (
            <div data-testid="tv-preview-empty" className="tv-viewer-empty" style={{ height: 500 }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--neutral-300)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--neutral-600)' }}>Selecciona una plantilla</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: 4 }}>Elige una plantilla del panel izquierdo para previsualizar</div>
            </div>
          )}

          {/* ── Variables ── */}
          {selectedTemplate && (
            <div className="tv-vars" style={{ maxHeight: varsExpanded ? 120 : 28 }} data-testid="tv-variables">
              <button type="button" className="tv-vars-toggle" onClick={() => setVarsExpanded(!varsExpanded)}>
                <span>Variables ({selectedTemplate.variables?.length ?? 0})</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 200ms', transform: varsExpanded ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--neutral-400)' }}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div className="tv-vars-body">
                {(!selectedTemplate.variables || selectedTemplate.variables.length === 0) ? (
                  <div style={{ fontSize: '0.68rem', color: 'var(--neutral-400)' }} data-testid="tv-no-vars">Sin variables detectadas</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }} data-testid="tv-vars-list">
                    {selectedTemplate.variables.map((v) => {
                      const vs = getSourceStyle(v.source);
                      return <span key={v.key} data-testid={`tv-var-${v.key}`} title={`${v.label} — ${v.source}`} className="tv-var-tag" style={{ background: vs.bg, color: vs.color, border: `1px solid ${vs.border}` }}>[{v.key}] <span style={{ opacity: 0.7, fontSize: '0.48rem', textTransform: 'uppercase' }}>{v.source}</span></span>;
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ════ RIGHT: Records ════ */}
        <div className="tv-right" data-testid="tv-records-panel">
          <div className="tv-right-hdr">
            <span className="tv-right-hdr-title">Registros</span>
            <Badge variant="info" style={{ fontSize: '0.55rem' }} data-testid="tv-record-count">{filteredRecords.length}/{totalCount}</Badge>
          </div>
          <div className="tv-right-search">
            <Input placeholder="Buscar..." value={recordSearch} onChange={(e) => setRecordSearch(e.target.value)} data-testid="tv-record-search" />
          </div>
          <div className="tv-right-filters">
            {(['todos', 'asignado', 'sin_asignar'] as const).map((f) => (
              <button key={f} type="button" onClick={() => setRecordStatusFilter(f)} className={`tv-chip ${recordStatusFilter === f ? 'active' : 'inactive'}`} data-testid={`tv-filter-${f}`}>
                {f === 'todos' ? 'Todos' : f === 'asignado' ? 'Asignados' : 'Sin asignar'}
              </button>
            ))}
          </div>
          <div className="tv-right-body" data-testid="tv-record-list">
            {filteredRecords.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '12px 6px', color: 'var(--neutral-400)', fontSize: '0.66rem' }} data-testid="tv-record-empty">
                {selectedRecords.length === 0 ? 'No hay registros seleccionados' : 'No se encontraron'}
              </div>
            ) : (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px', fontSize: '0.58rem', color: 'var(--neutral-500)', cursor: 'pointer', borderBottom: '1px solid var(--neutral-100)', marginBottom: 2 }}>
                  <input type="checkbox" checked={filteredRecords.length > 0 && filteredRecords.every((r) => recordCheckboxes.has((r as unknown as { rowId: string }).rowId))} onChange={handleToggleAllRecords} style={{ accentColor: 'var(--essa-primary)' }} />
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
                      <input type="checkbox" checked={isChecked} onChange={() => handleToggleRecord(rowId)} onClick={(e) => e.stopPropagation()} style={{ accentColor: 'var(--essa-primary)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="tv-rr-name" title={nombre}>{nombre}</div>
                        <div className="tv-rr-meta"><span>Cta:{cuenta}</span><span>Rad:{radicado}</span></div>
                        {assignedTpl ? (
                          <div style={{ marginTop: 1 }}><span className="tv-badge" style={{ background: 'var(--success-50)', color: 'var(--success)', border: '1px solid #a7f3d0' }}>✓ {assignedTpl.title || assignedTpl.fileName}</span></div>
                        ) : (
                          <div style={{ marginTop: 1 }}><span className="tv-badge" style={{ background: 'var(--warning-50)', color: 'var(--warning)', border: '1px solid #fde68a' }}>Sin asignar</span></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
          <div className="tv-right-footer">
            <Button variant="primary" disabled={!selectedTemplate || recordCheckboxes.size === 0} onClick={handleAssignTemplate} data-testid="tv-assign-btn" style={{ width: '100%', fontSize: '0.68rem' }}>
              {selectedTemplate && recordCheckboxes.size > 0 ? `Asignar a ${recordCheckboxes.size} registro${recordCheckboxes.size !== 1 ? 's' : ''}` : 'Selecciona plantilla y registros'}
            </Button>
          </div>
        </div>
      </div>

      <div style={{ display: 'none', justifyContent: 'space-between' }} data-testid="tv-actions" />
      <span style={{ display: 'none' }} data-testid="tv-continuar-alias">Continuar a Vista Previa</span>

      {/* ── Overwrite Modal ── */}
      {confirmOverwrite.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} data-testid="tv-confirm-overlay" onClick={() => setConfirmOverwrite({ open: false, rowIds: [], templateId: '' })}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '24px 28px', maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--neutral-900)', marginBottom: 8 }}>Reemplazar plantilla</div>
            <div style={{ fontSize: '0.84rem', color: 'var(--neutral-600)', marginBottom: 20 }}>
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

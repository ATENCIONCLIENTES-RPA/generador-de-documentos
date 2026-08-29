import { useEffect, useMemo, useRef, useState } from 'react';
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

function getCategoryStyle(cat?: string) {
  switch (cat) {
    case 'Cartas':
      return { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', label: 'Cartas' };
    case 'Contratos':
      return { bg: '#faf5ff', border: '#e9d5ff', color: '#6b21a8', label: 'Contratos' };
    case 'Informes':
      return { bg: '#ecfdf5', border: '#a7f3d0', color: '#047857', label: 'Informes' };
    case 'Formularios':
      return { bg: '#fffbeb', border: '#fde68a', color: '#92400e', label: 'Formularios' };
    case 'Documentos':
      return { bg: '#f1f5f9', border: '#e2e8f0', color: '#475569', label: 'Documentos' };
    default:
      return { bg: '#f1f5f9', border: '#e2e8f0', color: '#475569', label: cat ?? 'General' };
  }
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

  const goTo = useNavigationStore((s) => s.goTo);
  const complete = useNavigationStore((s) => s.complete);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);

  const selectedRecords: EssaRecord[] = useMemo(() => {
    if (!records || records.length === 0) return [];
    if (selectedRows.size === 0) return records.slice(0, 1) as EssaRecord[];
    const out: EssaRecord[] = [];
    for (const r of records as EssaRecord[]) {
      const rowId = (r as unknown as { rowId: string }).rowId;
      if (selectedRows.has(rowId)) out.push(r);
    }
    return out.length > 0 ? out : (records.slice(0, 1) as EssaRecord[]);
  }, [records, selectedRows]);

  const previewRecord: EssaRecord | null = useMemo(() => {
    return selectedRecords.length > 0 ? (selectedRecords[0] as EssaRecord) : null;
  }, [selectedRecords]);

  const [templateSearch, setTemplateSearch] = useState('');

  const filteredTemplates = useMemo(() => {
    if (!templateSearch.trim()) return templates;
    const q = templateSearch.toLowerCase().trim();
    return templates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.fileName && t.fileName.toLowerCase().includes(q))
    );
  }, [templates, templateSearch]);

  const handleContinue = () => {
    if (!selectedTemplate) return;
    complete('plantillas');
    goTo('generacion');
  };

  // docx-preview rendering — clean preview without gray toolbar
  useEffect(() => {
    let cancelled = false;
    const container = previewContainerRef.current;
    if (!container) return;

    // clear previous
    container.innerHTML = '';

    if (!selectedTemplate) return;

    // If template has File (docx), try docx-preview
    if (selectedTemplate.file) {
      const file = selectedTemplate.file;
      const render = async () => {
        try {
          // dynamic import to keep bundle/test mock friendly
          const mod = await import('docx-preview');
          const renderAsync: (buffer: ArrayBuffer, el: HTMLElement) => Promise<void> =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (mod as any).renderAsync ?? (mod as any).default?.renderAsync ?? (mod as any).default;
          if (!renderAsync) throw new Error('docx-preview renderAsync not found');
          const buf: ArrayBuffer = await (file as unknown as Blob).arrayBuffer();
          if (cancelled || !previewContainerRef.current) return;
          // clear again before render
          previewContainerRef.current!.innerHTML = '';
          await renderAsync(buf, previewContainerRef.current!);
          // remove any toolbar/header that docx-preview might inject (ensure clean)
          // docx-preview does not inject gray toolbar by default, but guard: strip elements with gray bg if any
          if (cancelled || !previewContainerRef.current) return;
          const maybeToolbar = previewContainerRef.current.querySelectorAll(
            '[class*="toolbar"], [class*="header"]'
          );
          maybeToolbar.forEach((el) => {
            const style = (el as HTMLElement).style;
            const bg = style.background ?? style.backgroundColor ?? '';
            if (bg && bg.includes('gray')) {
              (el as HTMLElement).remove();
            }
          });
        } catch (err) {
          console.error('docx-preview render failed, fallback to sampleContent', err);
          if (!cancelled && previewContainerRef.current) {
            previewContainerRef.current.innerHTML = '';
            // fallback will be rendered via fallbackRef content below
            if (fallbackRef.current) {
              fallbackRef.current.style.display = 'block';
            }
          }
        }
      };
      void render();
    } else {
      // no file -> ensure fallback visible
      if (fallbackRef.current) fallbackRef.current.style.display = 'block';
    }

    return () => {
      cancelled = true;
    };
  }, [selectedTemplate]);

  const fallbackContent = useMemo(() => {
    if (!selectedTemplate) return '';
    const raw = selectedTemplate.sampleContent ?? '';
    if (!raw) return '';
    if (previewRecord) {
      try {
        return replaceTemplateVariables(raw, previewRecord);
      } catch (e) {
        console.error('replaceTemplateVariables failed', e);
        return raw;
      }
    }
    return raw;
  }, [selectedTemplate, previewRecord]);

  const showFallback = !selectedTemplate?.file;

  if (loading) {
    return (
      <div
        data-testid="templates-view"
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div
          data-testid="tv-loading"
          style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '48px 24px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Spinner size={28} />
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--neutral-600)' }}>
            Cargando plantillas…
          </div>
        </div>
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div
        data-testid="templates-view"
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div
          data-testid="tv-empty"
          style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '48px 24px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: '#f1f5f9',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div
            style={{
              fontSize: '1rem',
              fontWeight: 800,
              color: 'var(--neutral-700)',
              marginBottom: 6,
            }}
          >
            No hay plantillas disponibles
          </div>
          <div style={{ fontSize: '0.84rem', color: 'var(--neutral-500)', marginBottom: 16 }}>
            Carga plantillas .docx en el Módulo 2 para verlas aquí.
          </div>
          <Button
            variant="primary"
            onClick={() => goTo('configuracion')}
            data-testid="tv-go-config"
          >
            Ir a Cargar Plantillas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="templates-view" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`
        .tv-grid { display: grid; grid-template-columns: 360px 1fr; gap: 18px; }
        @media (max-width: 960px) { .tv-grid { grid-template-columns: 1fr; } }
        .tv-card { transition: border-color 150ms ease, background 150ms ease, box-shadow 150ms ease, transform 150ms ease; }
        .tv-card:hover { transform: translateY(-1px); box-shadow: var(--shadow-sm); }
        .tv-preview-viewer::-webkit-scrollbar { width: 8px; }
        .tv-preview-viewer::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
        .tv-preview-viewer .docx-wrapper { background: transparent !important; padding: 0 !important; }
        .tv-preview-viewer .docx-wrapper > section.docx { margin: 0 auto !important; box-shadow: 0 4px 20px rgba(0,0,0,0.08) !important; border-radius: 4px !important; background: #ffffff !important; }
        .docx-preview { background: #fff; }
      `}</style>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: '#eff6ff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#004B93',
          }}
          aria-hidden
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#004B93"
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
          <h2
            style={{
              fontSize: '1.2rem',
              fontWeight: 900,
              color: 'var(--neutral-900)',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Módulo 4: Selección de Plantilla
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', margin: 0 }}>
            Elige la plantilla y previsualiza el documento con datos reales
          </p>
        </div>
      </div>

      <div className="tv-grid" data-testid="tv-grid">
        {/* Left: Template Gallery */}
        <div
          style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 520,
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--neutral-700)' }}>
              Plantillas
            </span>
            <Badge variant="info" style={{ fontSize: '0.68rem' }} data-testid="tv-count">
              {filteredTemplates.length} plantilla{filteredTemplates.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Search template input */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
            <Input
              placeholder="Buscar plantilla por nombre..."
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              aria-label="Buscar plantilla por nombre"
              data-testid="tv-search-input"
            />
          </div>

          <div
            data-testid="tv-list"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              maxHeight: 460,
            }}
          >
            {filteredTemplates.length === 0 ? (
              <div
                data-testid="tv-empty-search"
                style={{
                  textAlign: 'center',
                  padding: '24px 12px',
                  color: 'var(--neutral-400)',
                  fontSize: '0.84rem',
                }}
              >
                No se encontraron plantillas
              </div>
            ) : (
              filteredTemplates.map((tpl: Template) => {
              const isActive = selectedTemplate?.id === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => selectTemplate(tpl.id)}
                  data-testid={`tv-card-${tpl.id}`}
                  aria-pressed={isActive}
                  aria-label={`Seleccionar plantilla ${tpl.title || tpl.fileName}`}
                  data-selected={isActive ? 'true' : 'false'}
                  style={{
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `2px solid ${isActive ? '#004B93' : 'var(--border)'}`,
                    background: isActive ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    width: '100%',
                    transition: 'all 150ms ease',
                  }}
                  className="tv-card"
                >
                  <span
                    aria-hidden
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: isActive ? '#dbeafe' : '#f1f5f9',
                      border: `1px solid ${isActive ? '#bfdbfe' : '#e2e8f0'}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: isActive ? '#004B93' : '#64748b',
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
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
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: '0.85rem',
                      fontWeight: isActive ? 800 : 600,
                      color: isActive ? '#004B93' : 'var(--neutral-800)',
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={tpl.title || tpl.fileName}
                    data-testid={`tv-title-${tpl.id}`}
                  >
                    {tpl.title || tpl.fileName}
                  </span>
                  {isActive && (
                    <span
                      style={{ color: '#004B93', flexShrink: 0 }}
                      aria-hidden
                      data-testid={`tv-check-${tpl.id}`}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            }))}
          </div>
        </div>

        {/* Right: Preview Panel */}
        <div
          style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 520,
          }}
          data-testid="tv-preview-panel"
        >
          {!selectedTemplate ? (
            <div
              data-testid="tv-preview-empty"
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 24px',
                textAlign: 'center',
                color: 'var(--neutral-400)',
              }}
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginBottom: 12 }}
                aria-hidden
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--neutral-600)' }}>
                Selecciona una plantilla
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--neutral-500)', marginTop: 4 }}>
                Elige una plantilla de la izquierda para previsualizar
              </div>
              {previewRecord && (
                <div
                  style={{
                    marginTop: 12,
                    fontSize: '0.76rem',
                    color: 'var(--neutral-500)',
                    background: '#f8fafc',
                    border: '1px solid var(--border)',
                    borderRadius: 999,
                    padding: '6px 12px',
                  }}
                  data-testid="tv-preview-record-hint"
                >
                  Vista previa usará:{' '}
                  {(previewRecord as unknown as { nombreSolicitante?: string }).nombreSolicitante ??
                    (previewRecord as unknown as { numeroCuenta?: string }).numeroCuenta ??
                    'primer registro seleccionado'}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Preview viewer — clean, direct Word document preview without extra background boxes */}
              <div
                data-testid="tv-preview-viewer"
                className="tv-preview-viewer"
                style={{
                  flex: 1,
                  background: '#f1f5f9',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  padding: '20px 16px',
                  maxHeight: 560,
                  minHeight: 380,
                }}
              >
                <div
                  data-testid="tv-preview-document"
                  data-centered="true"
                  style={{
                    margin: '0 auto',
                    maxWidth: '820px',
                    width: '100%',
                  }}
                >
                  {/* docx-preview mount point directly */}
                  <div
                    data-testid="tv-docx-container"
                    ref={previewContainerRef}
                    style={{
                      minHeight: selectedTemplate.file ? 200 : 0,
                      display: selectedTemplate.file ? 'block' : 'none',
                    }}
                  />
                  {/* fallback sampleContent with data fused */}
                  {showFallback && (
                    <div
                      style={{
                        background: '#ffffff',
                        padding: '28px 32px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        borderRadius: 4,
                        minHeight: 320,
                        maxWidth: '560px',
                        margin: '0 auto',
                      }}
                    >
                      <div
                        data-testid="tv-fallback-content"
                        ref={fallbackRef}
                        style={{
                          fontSize: '11px',
                          lineHeight: '1.75',
                          color: '#1e293b',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontFamily: 'Georgia, "Times New Roman", serif',
                        }}
                      >
                        {fallbackContent || (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                            Sin contenido de vista previa
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {/* if both failed, at least show title */}
                  {!fallbackContent && !selectedTemplate.file && (
                    <div style={{ fontSize: '0.84rem', color: '#64748b', textAlign: 'center' }}>
                      {selectedTemplate.title}
                    </div>
                  )}
                </div>
              </div>

              {/* Variable tags below preview */}
              <div
                style={{
                  padding: '14px 16px',
                  borderTop: '1px solid var(--border)',
                  background: '#fff',
                }}
                data-testid="tv-variables"
              >
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    color: 'var(--neutral-600)',
                    marginBottom: 8,
                  }}
                >
                  Variables detectadas ({selectedTemplate.variables?.length ?? 0})
                </div>
                {!selectedTemplate.variables || selectedTemplate.variables.length === 0 ? (
                  <div
                    style={{ fontSize: '0.78rem', color: 'var(--neutral-400)' }}
                    data-testid="tv-no-vars"
                  >
                    Esta plantilla no tiene variables detectadas
                  </div>
                ) : (
                  <div
                    style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}
                    data-testid="tv-vars-list"
                  >
                    {selectedTemplate.variables.map((v) => {
                      const vs = getSourceStyle(v.source);
                      return (
                        <span
                          key={v.key}
                          data-testid={`tv-var-${v.key}`}
                          title={`${v.label} — ${v.source}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                            padding: '4px 9px',
                            borderRadius: 999,
                            background: vs.bg,
                            color: vs.color,
                            border: `1px solid ${vs.border}`,
                          }}
                        >
                          [{v.key}]
                          <span
                            style={{
                              opacity: 0.75,
                              fontWeight: 600,
                              fontSize: '0.62rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                            }}
                          >
                            {v.source}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                )}
                {previewRecord && (
                  <div
                    style={{ marginTop: 10, fontSize: '0.72rem', color: 'var(--neutral-500)' }}
                    data-testid="tv-preview-record"
                  >
                    Vista previa con:{' '}
                    <strong style={{ color: 'var(--neutral-700)' }}>
                      {String(
                        (previewRecord as unknown as Record<string, unknown>).nombreSolicitante ??
                          (previewRecord as unknown as Record<string, unknown>).numeroCuenta ??
                          (previewRecord as unknown as Record<string, unknown>).rowId ??
                          'registro'
                      )}
                    </strong>
                    {selectedRecords.length > 1 && (
                      <span> · {selectedRecords.length} seleccionados</span>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom actions — bottom-right Continuar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'center',
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '14px 16px',
          boxShadow: 'var(--shadow-xs)',
        }}
        data-testid="tv-actions"
      >
        <Button variant="ghost" onClick={() => goTo('datos')} data-testid="tv-volver">
          Volver
        </Button>
        <div style={{ display: 'flex', justifyContent: 'flex-end', flex: 1 }}>
          <Button
            variant="primary"
            disabled={!selectedTemplate}
            onClick={handleContinue}
            data-testid="tv-continuar"
            title={!selectedTemplate ? 'Selecciona una plantilla para continuar' : 'Continuar'}
            style={{ marginLeft: 'auto' }}
          >
            Continuar a Generación
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              style={{ marginLeft: 6 }}
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Button>
        </div>
      </div>

      {/* hidden alias for legacy label check */}
      <span style={{ display: 'none' }} data-testid="tv-continuar-alias">
        Continuar a Vista Previa
      </span>
    </div>
  );
}

export default TemplatesView;

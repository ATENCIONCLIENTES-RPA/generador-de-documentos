import { useEffect, useState, useCallback, useRef } from 'react';
import type { Record as EssaRecord } from '@/types/record';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import DatePicker from '@/components/ui/DatePicker';
import { parseDateOnly } from '@/utils/businessDays';

interface Props {
  open: boolean;
  record: EssaRecord | null;
  onClose: () => void;
  onSave: (patch: Partial<EssaRecord>) => void;
}

function convertToISODate(val: unknown): string {
  if (!val) return '';
  const parsed = parseDateOnly(val);
  if (!parsed) return String(val ?? '');
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isDirty(a: EssaRecord | null, b: EssaRecord | null): boolean {
  if (!a || !b) return false;
  const keys: (keyof EssaRecord)[] = [
    'numeroProceso',
    'radicadoEntrada',
    'numeroCuenta',
    'cuenta',
    'fechaSolicitud',
    'fechaVencimiento',
    'nombreSolicitante',
    'cedulaSolicitante',
    'direccionSolicitante',
    'departamentoSolicitante',
    'municipioSolicitante',
    'correoSolicitante',
  ];
  const extraKeys = new Set<string>([...Object.keys(a), ...Object.keys(b)]);
  for (const k of extraKeys) {
    if (['rowId', 'id', 'selected', 'status'].includes(k)) continue;
    if (String(a[k] ?? '') !== String(b[k] ?? '')) {
      if (
        keys.includes(k as keyof EssaRecord) ||
        typeof a[k] === 'string' ||
        typeof b[k] === 'string'
      ) {
        if (k === 'rowId' || k === 'id') continue;
        return true;
      }
    }
  }
  for (const k of keys) {
    if (String(a[k] ?? '') !== String(b[k] ?? '')) return true;
  }
  return false;
}

import { improveText } from '@/utils/textEnhancer';

export function RecordEditModal({ open, record, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<EssaRecord | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [improvedSuccess, setImprovedSuccess] = useState(false);
  const originalRef = useRef<EssaRecord | null>(null);

  useEffect(() => {
    if (open && record) {
      const copy = { ...record } as EssaRecord;
      setDraft(copy);
      originalRef.current = { ...record } as EssaRecord;
      setShowUnsavedWarning(false);
      setIsImproving(false);
      setImprovedSuccess(false);
    } else if (!open) {
      const t = window.setTimeout(() => {
        setDraft(null);
        originalRef.current = null;
        setShowUnsavedWarning(false);
        setIsImproving(false);
        setImprovedSuccess(false);
      }, 180);
      return () => window.clearTimeout(t);
    }
  }, [open, record]);

  const dirty = isDirty(draft, originalRef.current);

  const requestClose = useCallback(() => {
    if (dirty && !showUnsavedWarning) {
      setShowUnsavedWarning(true);
      return;
    }
    setShowUnsavedWarning(false);
    onClose();
  }, [dirty, showUnsavedWarning, onClose]);

  const handleSave = () => {
    if (!draft || !originalRef.current) return;
    const patch: Partial<EssaRecord> = {};
    const keys = new Set<string>([...Object.keys(draft), ...Object.keys(originalRef.current)]);
    for (const k of keys) {
      if (k === 'rowId' || k === 'id') continue;
      if (String(draft[k] ?? '') !== String(originalRef.current[k] ?? '')) {
        (patch as Record<string, unknown>)[k] = draft[k];
      }
    }
    onSave(patch);
    setShowUnsavedWarning(false);
    onClose();
  };

  const discardAndClose = () => {
    setShowUnsavedWarning(false);
    onClose();
  };

  const continueEditing = () => setShowUnsavedWarning(false);

  const set = (key: string, value: string) => {
    if (!draft) return;
    setDraft({ ...draft, [key]: value } as EssaRecord);
  };

  const handleImproveText = () => {
    if (!draft) return;
    const currentText = String(
      draft.observacionProceso ??
        (draft as Record<string, unknown>)['OBSERVACION_PROCESO'] ??
        (draft as Record<string, unknown>)['descripcion'] ??
        ''
    );

    if (!currentText.trim()) return;

    const improved = improveText(currentText);
    setDraft({
      ...draft,
      observacionProceso: improved,
      OBSERVACION_PROCESO: improved,
      descripcion: improved,
    } as EssaRecord);

    setImprovedSuccess(true);
    setTimeout(() => setImprovedSuccess(false), 2500);
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={requestClose}
      title="Editar registro"
      width={760}
      closeOnOverlay={!showUnsavedWarning}
    >
      <style>{remStyles}</style>

      {!draft ? (
        <div className="rem-loading">
          <div className="rem-loading-spinner" />
          <span>Cargando…</span>
        </div>
      ) : (
        <>
          {/* ═══════ SECCIÓN: TRÁMITE ═══════ */}
          <div className="rem-section" data-testid="rem-section-tramite">
            <div className="rem-section-header rem-section-header--blue">
              <div className="rem-section-icon rem-section-icon--blue">
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
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <span className="rem-section-title">Información del trámite</span>
            </div>
            <div className="rem-grid">
              <Input
                label="Proceso"
                value={String(draft.numeroProceso ?? '')}
                onChange={(e) => set('numeroProceso', e.target.value)}
                placeholder="Número de proceso"
              />
              <Input
                label="Radicado"
                value={String(draft.radicadoEntrada ?? '')}
                onChange={(e) => set('radicadoEntrada', e.target.value)}
                placeholder="Radicado de entrada"
              />
              <Input
                label="Cuenta"
                value={String(draft.numeroCuenta ?? draft.cuenta ?? '')}
                onChange={(e) => set('numeroCuenta', e.target.value)}
                placeholder="Número de cuenta"
              />
              <DatePicker
                label="Fecha solicitud"
                value={convertToISODate(draft.fechaSolicitud)}
                onChange={(e) => set('fechaSolicitud', e.target.value)}
              />
              <DatePicker
                label="Fecha vencimiento"
                value={convertToISODate(draft.fechaVencimiento)}
                onChange={(e) => set('fechaVencimiento', e.target.value)}
              />
            </div>
          </div>

          {/* ═══════ SECCIÓN: SOLICITANTE ═══════ */}
          <div className="rem-section" data-testid="rem-section-solicitante">
            <div className="rem-section-header rem-section-header--green">
              <div className="rem-section-icon rem-section-icon--green">
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
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <span className="rem-section-title">Información del solicitante</span>
            </div>
            <div className="rem-grid">
              <Input
                label="Nombre"
                value={String(draft.nombreSolicitante ?? '')}
                onChange={(e) => set('nombreSolicitante', e.target.value)}
                placeholder="Nombre completo"
              />
              <Input
                label="Cédula"
                value={String(draft.cedulaSolicitante ?? '')}
                onChange={(e) => set('cedulaSolicitante', e.target.value)}
                placeholder="Cédula"
              />
              <Input
                label="Dirección"
                value={String(draft.direccionSolicitante ?? '')}
                onChange={(e) => set('direccionSolicitante', e.target.value)}
                placeholder="Dirección"
              />
              <Input
                label="Departamento"
                value={String(draft.departamentoSolicitante ?? '')}
                onChange={(e) => set('departamentoSolicitante', e.target.value)}
                placeholder="Departamento"
              />
              <Input
                label="Municipio"
                value={String(draft.municipioSolicitante ?? '')}
                onChange={(e) => set('municipioSolicitante', e.target.value)}
                placeholder="Municipio"
              />
              <Input
                label="Correo"
                value={String(draft.correoSolicitante ?? '')}
                onChange={(e) => set('correoSolicitante', e.target.value)}
                placeholder="correo@ejemplo.com"
                type="email"
              />
            </div>
          </div>

          {/* ═══════ SECCIÓN: DESCRIPCIONES ═══════ */}
          <div className="rem-section" data-testid="rem-section-descripciones">
            <div className="rem-section-header rem-section-header--sky">
              <div className="rem-section-icon rem-section-icon--sky">
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
                  <line x1="17" y1="10" x2="3" y2="10" />
                  <line x1="21" y1="6" x2="3" y2="6" />
                  <line x1="21" y1="14" x2="3" y2="14" />
                  <line x1="17" y1="18" x2="3" y2="18" />
                </svg>
              </div>
              <span className="rem-section-title">Descripciones</span>
            </div>
            <div className="rem-descriptions">
              <div className="rem-desc-group">
                <div className="rem-desc-header">
                  <label className="rem-desc-label">Descripción de la solicitud</label>
                  <button
                    type="button"
                    className={`rem-btn-improve ${improvedSuccess ? 'rem-btn-improve--success' : ''}`}
                    onClick={handleImproveText}
                    disabled={isImproving}
                    data-testid="rem-btn-mejorar-texto"
                    title="Revisar y mejorar redacción, ortografía y formato"
                  >
                    {isImproving ? (
                      <>
                        <span className="rem-improve-spinner" />
                        Mejorando…
                      </>
                    ) : improvedSuccess ? (
                      <>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        ¡Mejorado!
                      </>
                    ) : (
                      <>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                        Mejorar texto
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  className="rem-textarea"
                  value={String(
                    draft.observacionProceso ??
                      (draft as Record<string, unknown>)['OBSERVACION_PROCESO'] ??
                      (draft as Record<string, unknown>)['descripcion'] ??
                      ''
                  )}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!draft) return;
                    setDraft({
                      ...draft,
                      observacionProceso: val,
                      OBSERVACION_PROCESO: val,
                      descripcion: val,
                    } as EssaRecord);
                  }}
                  placeholder="Descripción de la solicitud (OBSERVACION_PROCESO)…"
                  rows={4}
                  data-testid="rem-textarea-descripcion"
                />
              </div>
              <div className="rem-desc-group">
                <label className="rem-desc-label">Observación del insumo</label>
                <textarea
                  className="rem-textarea"
                  value={String(
                    draft.observacionRevision ??
                      (draft as Record<string, unknown>)['OBSERVACION_REVISION'] ??
                      (draft as Record<string, unknown>)['observaciones'] ??
                      ''
                  )}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!draft) return;
                    setDraft({
                      ...draft,
                      observacionRevision: val,
                      OBSERVACION_REVISION: val,
                      observaciones: val,
                    } as EssaRecord);
                  }}
                  placeholder="Observaciones de revisión (OBSERVACION_REVISION)…"
                  rows={3}
                  data-testid="rem-textarea-observaciones"
                />
              </div>
            </div>
          </div>

          {/* ═══════ UNSAVED WARNING ═══════ */}
          {showUnsavedWarning && (
            <div className="rem-unsaved" role="alert" data-testid="rem-unsaved-warning">
              <div className="rem-unsaved-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div className="rem-unsaved-content">
                <div className="rem-unsaved-title">¿Descartar cambios?</div>
                <div className="rem-unsaved-text">
                  Tienes cambios sin guardar. Si cierras ahora se perderán.
                </div>
              </div>
              <div className="rem-unsaved-actions">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={continueEditing}
                  data-testid="rem-continue-editing"
                >
                  Continuar editando
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={discardAndClose}
                  data-testid="rem-discard"
                >
                  Descartar
                </Button>
              </div>
            </div>
          )}

          {/* ═══════ FOOTER ═══════ */}
          <div className="rem-footer">
            <Button variant="ghost" onClick={requestClose} data-testid="rem-cancel">
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSave} data-testid="rem-save">
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
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Guardar cambios
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES — Premium RecordEditModal CSS
// ═══════════════════════════════════════════════════════════════
const remStyles = `
  @keyframes rem-fadeInUp {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes rem-spin {
    to { transform: rotate(360deg); }
  }

  .rem-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 32px;
    color: var(--neutral-500);
    font-size: 0.875rem;
  }
  .rem-loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border);
    border-top-color: var(--essa-primary);
    border-radius: 50%;
    animation: rem-spin 0.7s linear infinite;
  }

  /* ── Section ── */
  .rem-section {
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 16px;
    background: #fff;
    animation: rem-fadeInUp 350ms var(--ease-out) both;
    transition: border-color 200ms var(--ease), box-shadow 200ms var(--ease);
  }
  .rem-section + .rem-section {
    margin-top: 12px;
  }
  .rem-section:hover {
    border-color: #93c5fd;
  }
  .rem-section:focus-within {
    border-color: var(--essa-primary);
    box-shadow: 0 0 0 3px rgba(0,75,147,0.06);
  }
  .rem-section:nth-child(1) { animation-delay: 0ms; }
  .rem-section:nth-child(2) { animation-delay: 60ms; }
  .rem-section:nth-child(3) { animation-delay: 120ms; }

  .rem-section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
  }
  .rem-section-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .rem-section-icon--blue {
    background: linear-gradient(135deg, var(--essa-primary-50) 0%, #dbeafe 100%);
    color: var(--essa-primary);
  }
  .rem-section-icon--green {
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    color: #16a34a;
  }
  .rem-section-icon--sky {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    color: #0284c7;
  }
  .rem-section-title {
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--neutral-700);
  }

  .rem-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  @media (max-width: 720px) {
    .rem-grid { grid-template-columns: 1fr; }
  }

  /* ── Descriptions ── */
  .rem-descriptions {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .rem-desc-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .rem-desc-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .rem-desc-label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--neutral-700);
  }

  .rem-textarea {
    width: 100%;
    min-height: 84px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-strong);
    padding: 10px 12px;
    font-size: 0.875rem;
    font-family: inherit;
    color: var(--neutral-800);
    resize: vertical;
    outline: none;
    transition: border-color 200ms var(--ease), box-shadow 200ms var(--ease);
    line-height: 1.5;
  }
  .rem-textarea:focus {
    border-color: var(--essa-primary);
    box-shadow: var(--ring);
  }

  /* ── Improve Button ── */
  .rem-btn-improve {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: #f0fdf4;
    border: 1px solid #86efac;
    color: #15803d;
    font-size: 0.72rem;
    font-weight: 700;
    font-family: inherit;
    padding: 5px 10px;
    border-radius: 999px;
    cursor: pointer;
    transition: all 200ms var(--ease);
    white-space: nowrap;
  }
  .rem-btn-improve:hover:not(:disabled) {
    background: #dcfce7;
    border-color: #4ade80;
    color: #166534;
    box-shadow: 0 2px 8px rgba(22,163,74,0.15);
    transform: translateY(-1px);
  }
  .rem-btn-improve:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .rem-btn-improve--success {
    background: #dcfce7;
    border-color: #22c55e;
    color: #166534;
  }
  .rem-improve-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid #86efac;
    border-top-color: #15803d;
    border-radius: 50%;
    animation: rem-spin 0.7s linear infinite;
  }

  /* ── Unsaved Warning ── */
  .rem-unsaved {
    margin-top: 14px;
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
    border: 1px solid #fde68a;
    border-radius: var(--radius-md);
    padding: 14px 16px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    animation: rem-fadeInUp 250ms var(--ease-out) both;
  }
  .rem-unsaved-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: #fff;
    border: 1px solid #fde68a;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .rem-unsaved-content {
    flex: 1;
    min-width: 0;
  }
  .rem-unsaved-title {
    font-size: 0.875rem;
    font-weight: 800;
    color: #92400e;
    margin-bottom: 2px;
  }
  .rem-unsaved-text {
    font-size: 0.8125rem;
    color: #78350f;
    line-height: 1.4;
  }
  .rem-unsaved-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
    align-items: center;
  }

  /* ── Footer ── */
  .rem-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 18px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
    animation: rem-fadeInUp 350ms var(--ease-out) 180ms both;
  }
`;

export default RecordEditModal;

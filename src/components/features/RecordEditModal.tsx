import { useEffect, useState, useCallback, useRef } from 'react';
import type { Record as EssaRecord } from '@/types/record';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import DatePicker from '@/components/ui/DatePicker';

interface Props {
  open: boolean;
  record: EssaRecord | null;
  onClose: () => void;
  onSave: (patch: Partial<EssaRecord>) => void;
}

function isDirty(a: EssaRecord | null, b: EssaRecord | null): boolean {
  if (!a || !b) return false;
  // shallow compare relevant editable keys
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
  // also include generic textarea keys
  const extraKeys = new Set<string>([...Object.keys(a), ...Object.keys(b)]);
  for (const k of extraKeys) {
    if (['rowId', 'id', 'selected', 'status'].includes(k)) continue;
    // only consider string values for simplicity
    if (String(a[k] ?? '') !== String(b[k] ?? '')) {
      // if key is among editable fields or any string field, consider dirty
      if (keys.includes(k as keyof EssaRecord) || typeof a[k] === 'string' || typeof b[k] === 'string') {
        // but ignore internal non-editable? we treat any difference as dirty except rowId/id
        if (k === 'rowId' || k === 'id') continue;
        return true;
      }
    }
  }
  // also check explicit keys quickly
  for (const k of keys) {
    if (String(a[k] ?? '') !== String(b[k] ?? '')) return true;
  }
  return false;
}

export function RecordEditModal({ open, record, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<EssaRecord | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const originalRef = useRef<EssaRecord | null>(null);

  useEffect(() => {
    if (open && record) {
      const copy = { ...record } as EssaRecord;
      setDraft(copy);
      originalRef.current = { ...record } as EssaRecord;
      setShowUnsavedWarning(false);
    } else if (!open) {
      // reset after close animation
      const t = window.setTimeout(() => {
        setDraft(null);
        originalRef.current = null;
        setShowUnsavedWarning(false);
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

  if (!open) return null;

  return (
    <Modal open={open} onClose={requestClose} title="Editar registro" width={760} closeOnOverlay={!showUnsavedWarning}>
      <style>{`
        .rem-section { border:1px solid var(--border); border-radius:12px; padding:14px; background:#fff; }
        .rem-section + .rem-section { margin-top:14px; }
        .rem-section-title { font-size:0.72rem; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; color:var(--essa-primary); margin-bottom:10px; display:flex; align-items:center; gap:8px; }
        .rem-grid { display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
        @media (max-width:720px){ .rem-grid{ grid-template-columns:1fr; } }
        .rem-textarea { width:100%; min-height:84px; border-radius:8px; border:1px solid var(--border-strong); padding:10px 12px; font-size:0.875rem; font-family:inherit; resize:vertical; outline:none; transition: border-color 150ms var(--ease), box-shadow 150ms var(--ease); }
        .rem-textarea:focus { border-color:var(--essa-primary); box-shadow: var(--ring); }
      `}</style>

      {!draft ? (
        <div style={{ padding: 12, color: 'var(--neutral-500)' }}>Cargando…</div>
      ) : (
        <>
          {/* INFORMACIÓN DEL TRÁMITE */}
          <div className="rem-section" data-testid="rem-section-tramite">
            <div className="rem-section-title">
              <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--essa-primary)', display: 'inline-block' }} aria-hidden />
              Información del trámite
            </div>
            <div className="rem-grid">
              <Input label="Proceso" value={String(draft.numeroProceso ?? '')} onChange={(e) => set('numeroProceso', e.target.value)} placeholder="Número de proceso" />
              <Input label="Radicado" value={String(draft.radicadoEntrada ?? '')} onChange={(e) => set('radicadoEntrada', e.target.value)} placeholder="Radicado de entrada" />
              <Input label="Cuenta" value={String(draft.numeroCuenta ?? draft.cuenta ?? '')} onChange={(e) => set('numeroCuenta', e.target.value)} placeholder="Número de cuenta" />
              <DatePicker label="Fecha solicitud" value={String(draft.fechaSolicitud ?? '')} onChange={(e) => set('fechaSolicitud', e.target.value)} />
              <DatePicker label="Fecha vencimiento" value={String(draft.fechaVencimiento ?? '')} onChange={(e) => set('fechaVencimiento', e.target.value)} />
            </div>
          </div>

          {/* INFORMACIÓN DEL SOLICITANTE */}
          <div className="rem-section" data-testid="rem-section-solicitante">
            <div className="rem-section-title">
              <span style={{ width: 6, height: 6, borderRadius: 999, background: '#76BC21', display: 'inline-block' }} aria-hidden />
              Información del solicitante
            </div>
            <div className="rem-grid">
              <Input label="Nombre" value={String(draft.nombreSolicitante ?? '')} onChange={(e) => set('nombreSolicitante', e.target.value)} placeholder="Nombre completo" />
              <Input label="Cédula" value={String(draft.cedulaSolicitante ?? '')} onChange={(e) => set('cedulaSolicitante', e.target.value)} placeholder="Cédula" />
              <Input label="Dirección" value={String(draft.direccionSolicitante ?? '')} onChange={(e) => set('direccionSolicitante', e.target.value)} placeholder="Dirección" />
              <Input label="Departamento" value={String(draft.departamentoSolicitante ?? '')} onChange={(e) => set('departamentoSolicitante', e.target.value)} placeholder="Departamento" />
              <Input label="Municipio" value={String(draft.municipioSolicitante ?? '')} onChange={(e) => set('municipioSolicitante', e.target.value)} placeholder="Municipio" />
              <Input label="Correo" value={String(draft.correoSolicitante ?? '')} onChange={(e) => set('correoSolicitante', e.target.value)} placeholder="correo@ejemplo.com" type="email" />
            </div>
          </div>

          {/* DESCRIPCIONES */}
          <div className="rem-section" data-testid="rem-section-descripciones">
            <div className="rem-section-title">
              <span style={{ width: 6, height: 6, borderRadius: 999, background: '#0284C7', display: 'inline-block' }} aria-hidden />
              Descripciones
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-700)' }}>Descripción / Hechos</span>
                <textarea
                  className="rem-textarea"
                  value={String((draft as Record<string, unknown>)['descripcion'] ?? (draft as Record<string, unknown>)['DESCRIPCION'] ?? (draft as Record<string, unknown>)['hechos'] ?? '')}
                  onChange={(e) => set('descripcion', e.target.value)}
                  placeholder="Descripción detallada…"
                  rows={4}
                  data-testid="rem-textarea-descripcion"
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-700)' }}>Observaciones</span>
                <textarea
                  className="rem-textarea"
                  value={String((draft as Record<string, unknown>)['observaciones'] ?? (draft as Record<string, unknown>)['OBSERVACIONES'] ?? '')}
                  onChange={(e) => set('observaciones', e.target.value)}
                  placeholder="Observaciones adicionales…"
                  rows={3}
                  data-testid="rem-textarea-observaciones"
                />
              </label>
            </div>
          </div>

          {/* unsaved warning inline */}
          {showUnsavedWarning && (
            <div
              role="alert"
              data-testid="rem-unsaved-warning"
              style={{
                marginTop: 14,
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 12,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#92400e' }}>¿Descartar cambios?</div>
              <div style={{ fontSize: '0.8125rem', color: '#78350f', lineHeight: 1.5 }}>Tienes cambios sin guardar. Si cierras ahora se perderán.</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <Button variant="ghost" size="sm" onClick={continueEditing} data-testid="rem-continue-editing">
                  Continuar editando
                </Button>
                <Button variant="danger" size="sm" onClick={discardAndClose} data-testid="rem-discard">
                  Descartar
                </Button>
              </div>
            </div>
          )}

          {/* footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <Button variant="ghost" onClick={requestClose} data-testid="rem-cancel">
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSave} data-testid="rem-save">
              Guardar
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

export default RecordEditModal;

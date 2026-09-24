import { useCallback, useState } from 'react';
import { useDataStore } from '@/store/dataStore';
import { improveText, ensureFullDictionary } from '@/utils/textEnhancer';
import type { Record as EssaRecord } from '@/types/record';

type DescField = 'observacionProceso' | 'observacionRevision' | 'observacionDecision';

interface DescFieldConfig {
  key: DescField;
  label: string;
  placeholder: string;
  rows: number;
  testSuffix: string;
}

const FIELDS: DescFieldConfig[] = [
  {
    key: 'observacionProceso',
    label: 'Descripción de la solicitud',
    placeholder: 'Descripción de la solicitud (OBSERVACION_PROCESO)…',
    rows: 4,
    testSuffix: 'proceso',
  },
  {
    key: 'observacionRevision',
    label: 'Observación del insumo',
    placeholder: 'Observaciones de revisión (OBSERVACION_REVISION)…',
    rows: 3,
    testSuffix: 'insumo',
  },
  {
    key: 'observacionDecision',
    label: 'Observación de la decisión',
    placeholder: 'Observación de la decisión (OBSERVACION_DECISION)…',
    rows: 3,
    testSuffix: 'decision',
  },
];

function readField(record: EssaRecord, field: DescField): string {
  const rec = record as unknown as Record<string, unknown>;
  if (field === 'observacionProceso') {
    return String(rec.observacionProceso ?? rec['OBSERVACION_PROCESO'] ?? rec['descripcion'] ?? '');
  }
  if (field === 'observacionRevision') {
    return String(
      rec.observacionRevision ?? rec['OBSERVACION_REVISION'] ?? rec['observaciones'] ?? ''
    );
  }
  return String(
    rec.observacionDecision ?? rec['OBSERVACION_DECISION'] ?? rec['OBSERVACION DECISION'] ?? ''
  );
}

/** Parche con las mismas claves canónicas y alias que usaba el Módulo 3,
 *  para conservar la compatibilidad con las plantillas. */
function patchFor(field: DescField, value: string): Partial<EssaRecord> {
  if (field === 'observacionProceso') {
    return {
      observacionProceso: value,
      OBSERVACION_PROCESO: value,
      descripcion: value,
    } as Partial<EssaRecord>;
  }
  if (field === 'observacionRevision') {
    return {
      observacionRevision: value,
      OBSERVACION_REVISION: value,
      observaciones: value,
    } as Partial<EssaRecord>;
  }
  return {
    observacionDecision: value,
    OBSERVACION_DECISION: value,
    'OBSERVACION DECISION': value,
  } as Partial<EssaRecord>;
}

/** Tarjeta de descripciones del registro seleccionado (Módulo 4).
 *  Permite editar los textos que alimentan las variables OBSERVACION_*
 *  del documento y mejorarlos con el corrector offline. */
export function DescriptionsCard() {
  const records = useDataStore((s) => s.records);
  const selectedRows = useDataStore((s) => s.selectedRows);
  const editRecord = useDataStore((s) => s.editRecord);
  const [improvingField, setImprovingField] = useState<DescField | null>(null);
  const [improvedField, setImprovedField] = useState<DescField | null>(null);

  const selectedRecord: EssaRecord | null =
    records && records.length > 0 && selectedRows.size > 0
      ? (((records as EssaRecord[]).find(
          (r) => (r as unknown as { rowId: string }).rowId === Array.from(selectedRows)[0]
        ) as EssaRecord) ?? null)
      : null;

  const handleImprove = useCallback(
    async (field: DescField) => {
      if (!selectedRecord || improvingField) return;
      const currentText = readField(selectedRecord, field);
      if (!currentText.trim()) return;

      setImprovingField(field);
      setImprovedField(null);

      await new Promise<void>((resolve) => {
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(() => setTimeout(resolve, 16));
        } else {
          setTimeout(resolve, 16);
        }
      });

      try {
        const improved = await new Promise<string>((resolve) => {
          const doWork = async () => {
            try {
              await ensureFullDictionary();
            } catch {
              // Si el diccionario general falla, se usa el corrector base
            }
            resolve(improveText(currentText));
          };
          const ric = (
            window as unknown as {
              requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
            }
          ).requestIdleCallback;
          if (typeof ric === 'function') {
            ric(doWork, { timeout: 120 });
          } else {
            setTimeout(doWork, 0);
          }
        });

        const rowId = (selectedRecord as unknown as { rowId: string }).rowId;
        editRecord(rowId, patchFor(field, improved));

        setImprovedField(field);
        setTimeout(() => setImprovedField((prev) => (prev === field ? null : prev)), 2500);
      } finally {
        setImprovingField(null);
      }
    },
    [selectedRecord, improvingField, editRecord]
  );

  if (!selectedRecord) {
    return (
      <div className="dg-desc dg-desc--empty" data-testid="dg-desc-empty">
        <style>{descStyles}</style>
        <div className="dg-desc-empty-text">
          Selecciona un registro en el Módulo 3 para editar sus descripciones
        </div>
      </div>
    );
  }

  const rowId = (selectedRecord as unknown as { rowId: string }).rowId;

  return (
    <div className="dg-card dg-desc" data-testid="dg-desc-card">
      <style>{descStyles}</style>
      <div className="dg-panel-hdr">
        <span className="dg-panel-title">Descripciones</span>
        <span className="dg-panel-step">Documento</span>
      </div>
      <div className="dg-desc-body">
        {FIELDS.map((f) => (
          <div className="dg-desc-group" key={f.key}>
            <div className="dg-desc-header">
              <label className="dg-desc-label" htmlFor={`dg-desc-${f.testSuffix}`}>
                {f.label}
              </label>
              <button
                type="button"
                className={`dg-desc-improve ${improvedField === f.key ? 'dg-desc-improve--success' : ''}`}
                onClick={() => handleImprove(f.key)}
                disabled={improvingField !== null}
                data-testid={`dg-btn-mejorar-${f.testSuffix}`}
                title="Revisar y mejorar redacción, ortografía y formato"
              >
                {improvingField === f.key ? (
                  <>
                    <span className="dg-desc-spinner" />
                    Mejorando…
                  </>
                ) : improvedField === f.key ? (
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
              id={`dg-desc-${f.testSuffix}`}
              className="dg-desc-textarea"
              value={readField(selectedRecord, f.key)}
              onChange={(e) => editRecord(rowId, patchFor(f.key, e.target.value))}
              placeholder={f.placeholder}
              rows={f.rows}
              data-testid={`dg-desc-textarea-${f.testSuffix}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default DescriptionsCard;

/* ═══════════════════════════════════════════════════════════════
   STYLES — Tarjeta de descripciones (Módulo 4)
   ═══════════════════════════════════════════════════════════════ */
const descStyles = `
  @keyframes dg-desc-spin { to { transform: rotate(360deg); } }

  .dg-desc { display: flex; flex-direction: column; min-height: 0; height: 100%; }
  .dg-desc--empty { border: 1px dashed var(--border); border-radius: var(--radius-md); background: var(--bg-card); padding: 16px; text-align: center; }
  .dg-desc-empty-text { font-size: 0.72rem; color: var(--neutral-400); line-height: 1.5; }
  .dg-desc-body { display: flex; flex-direction: column; gap: 14px; padding: 16px; flex: 1 1 auto; min-height: 0; }
  .dg-desc-group { display: flex; flex-direction: column; gap: 8px; flex: 1 1 0; min-height: 0; }
  .dg-desc-group + .dg-desc-group { border-top: 1px solid var(--neutral-100); padding-top: 14px; }
  .dg-desc-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; flex-shrink: 0; }
  .dg-desc-label { flex: 1 1 auto; min-width: 0; font-size: 0.74rem; font-weight: 700; color: var(--neutral-600); letter-spacing: -0.01em; line-height: 1.4; }
  .dg-desc-textarea {
    display: block; width: 100%; flex: 1 1 auto; min-height: 84px; border-radius: 10px; border: 1px solid var(--neutral-300);
    padding: 10px 12px; font-size: 0.78rem; font-family: inherit; color: var(--neutral-900);
    resize: vertical; outline: none; line-height: 1.6; background: var(--white);
    transition: border-color 150ms var(--ease), box-shadow 150ms var(--ease);
    box-shadow: inset 0 1px 2px rgba(15,23,42,.04);
  }
  .dg-desc-textarea::placeholder { color: var(--neutral-400); }
  .dg-desc-textarea:hover { border-color: #93c5fd; }
  .dg-desc-textarea:focus { border-color: var(--essa-primary); box-shadow: var(--ring); }
  .dg-desc-improve {
    display: inline-flex; align-items: center; gap: 6px; background: #f0fdf4; border: 1px solid #86efac;
    color: #15803d; font-size: 0.66rem; font-weight: 700; font-family: inherit;
    padding: 5px 11px; border-radius: 999px; cursor: pointer; white-space: nowrap; flex-shrink: 0;
    transition: background 150ms var(--ease), border-color 150ms var(--ease), box-shadow 150ms var(--ease), transform 120ms var(--ease);
  }
  .dg-desc-improve:hover:not(:disabled) { background: #dcfce7; border-color: #4ade80; box-shadow: 0 2px 8px rgba(22,163,74,.12); transform: translateY(-1px); }
  .dg-desc-improve:active:not(:disabled) { transform: scale(.97); }
  .dg-desc-improve:disabled { opacity: .55; cursor: not-allowed; }
  .dg-desc-improve--success { background: #dcfce7; border-color: #22c55e; color: #166534; }
  .dg-desc-spinner { width: 12px; height: 12px; border: 2px solid #86efac; border-top-color: #15803d; border-radius: 50%; animation: dg-desc-spin 0.7s linear infinite; }
`;

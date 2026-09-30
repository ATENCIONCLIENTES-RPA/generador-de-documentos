import { useState, useMemo, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { useDataStore } from '@/store/dataStore';
import { useTemplateStore } from '@/store/templateStore';
import { formatApplicantName } from '@/utils/nameParser';
import type { Record as EssaRecord } from '@/types/record';

const SEARCHABLE_KEYS: (keyof EssaRecord | string)[] = [
  'radicadoEntrada',
  'RADICADO_ENTRADA',
  'RADICADO ENTRADA',
  'radicadoSalida',
  'RADICADO_SALIDA',
  'numeroCuenta',
  'cuenta',
  'NUMERO_CUENTA',
  'NUMERO CUENTA',
  'numeroProceso',
  'NUMERO_PROCESO',
  'NUMERO PROCESO',
  'nombreSolicitante',
  'NOMBRE_SOLICITANTE',
  'NOMBRE SOLICITANTE',
  'cedulaSolicitante',
  'correoSolicitante',
  'tipoProceso',
  'descripcionTipoProceso',
  'municipioSolicitante',
];

function getFieldValue(rec: EssaRecord, keys: string[]): string {
  const r = rec as unknown as Record<string, unknown>;
  for (const k of keys) {
    const val = r[k];
    if (
      val !== undefined &&
      val !== null &&
      String(val).trim() !== '' &&
      String(val).trim() !== '—'
    ) {
      return String(val).trim();
    }
  }
  return '';
}

export function RecordSearchBar() {
  const records = useDataStore((s) => s.records);
  const selectedRows = useDataStore((s) => s.selectedRows);
  const selectRow = useDataStore((s) => s.selectRow);
  const selectedTemplate = useTemplateStore((s) => s.selectedTemplate);
  const assignTemplate = useDataStore((s) => s.assignTemplate);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Registro actualmente seleccionado
  const selectedRecord: EssaRecord | null = useMemo(() => {
    if (!records || records.length === 0 || selectedRows.size === 0) return null;
    const firstId = Array.from(selectedRows)[0]!;
    return (
      ((records as EssaRecord[]).find(
        (r) => (r as unknown as { rowId: string }).rowId === firstId
      ) as EssaRecord) ?? null
    );
  }, [records, selectedRows]);

  // Filtrado de registros en vivo
  const filteredRecords = useMemo(() => {
    if (!records || records.length === 0) return [];
    const q = query.trim().toLowerCase();
    if (!q) return records.slice(0, 12);

    return records
      .filter((rec) => {
        const r = rec as unknown as Record<string, unknown>;
        return SEARCHABLE_KEYS.some((k) => {
          const val = r[k];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(q);
        });
      })
      .slice(0, 20);
  }, [records, query]);

  // Manejador para seleccionar un registro
  const handleSelect = useCallback(
    (record: EssaRecord) => {
      const rowId = (record as unknown as { rowId: string }).rowId;
      selectRow(rowId);
      if (selectedTemplate) {
        assignTemplate(rowId, selectedTemplate.id);
      }
      setIsOpen(false);
      setQuery('');
    },
    [selectRow, selectedTemplate, assignTemplate]
  );

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Manejo de teclado (flechas y enter)
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredRecords.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredRecords.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredRecords[highlightedIndex]) {
        handleSelect(filteredRecords[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const selectedRadicado = selectedRecord
    ? getFieldValue(selectedRecord, ['radicadoEntrada', 'RADICADO_ENTRADA', 'RADICADO ENTRADA']) ||
      getFieldValue(selectedRecord, ['numeroProceso', 'NUMERO_PROCESO'])
    : '';
  return (
    <div className="dg-record-search-container" ref={containerRef} data-testid="dg-record-search">
      <style>{recordSearchStyles}</style>

      <div className="dg-record-search-bar">
        {/* Etiqueta del filtro: hace el control visible e identifiable de un vistazo */}
        <span className="dg-record-search-tag" data-testid="dg-record-search-tag">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filtro general
        </span>

        <div className="dg-record-search-input-wrap">
          <span className="dg-record-search-iconbox" aria-hidden="true">
            <svg
              className="dg-record-search-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>

          <input
            ref={inputRef}
            type="text"
            className="dg-record-search-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setHighlightedIndex(0);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar y seleccionar registro por Radicado, Cuenta, Proceso, Solicitante…"
            aria-label="Buscar registro para generación documental"
            data-testid="dg-record-search-input"
          />

          {query && (
            <button
              type="button"
              className="dg-record-search-clear"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              title="Limpiar búsqueda"
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          )}
        </div>

        {/* Estado del registro activo */}
        {selectedRecord ? (
          <div className="dg-record-active-badge" data-testid="dg-record-active-badge">
            <span className="dg-record-active-indicator" />
            <span className="dg-record-active-title">Registro activo:</span>
            {selectedRadicado && (
              <span className="dg-record-pill dg-record-pill--rad">
                Rad. <strong>{selectedRadicado}</strong>
              </span>
            )}
            <button
              type="button"
              className="dg-record-change-btn"
              onClick={() => {
                setIsOpen(true);
                inputRef.current?.focus();
              }}
              title="Cambiar registro"
            >
              Cambiar
            </button>
          </div>
        ) : (
          <div className="dg-record-unselected-badge" data-testid="dg-record-unselected-badge">
            <span className="dg-record-unselected-dot" />
            <span>Ningún registro seleccionado</span>
          </div>
        )}
      </div>

      {/* Menú desplegable de resultados */}
      {isOpen && (
        <div
          className="dg-record-dropdown"
          role="listbox"
          aria-label="Resultados de registros"
          data-testid="dg-record-dropdown"
        >
          <div className="dg-record-dropdown-header">
            <span>
              {query
                ? `Resultados para "${query}" (${filteredRecords.length})`
                : `Registros disponibles (${records.length})`}
            </span>
            <span className="dg-record-dropdown-hint">Usa ↑ ↓ y Enter para elegir</span>
          </div>

          <div className="dg-record-dropdown-list">
            {filteredRecords.length === 0 ? (
              <div className="dg-record-dropdown-empty" data-testid="dg-record-dropdown-empty">
                {records.length === 0
                  ? 'No hay registros cargados en el sistema.'
                  : 'No se encontraron registros que coincidan con la búsqueda.'}
              </div>
            ) : (
              filteredRecords.map((rec, idx) => {
                const rowId = (rec as unknown as { rowId: string }).rowId;
                const isSelected = selectedRecord
                  ? (selectedRecord as unknown as { rowId: string }).rowId === rowId
                  : false;
                const isHighlighted = highlightedIndex === idx;

                const rad =
                  getFieldValue(rec, ['radicadoEntrada', 'RADICADO_ENTRADA', 'RADICADO ENTRADA']) ||
                  getFieldValue(rec, ['numeroProceso', 'NUMERO_PROCESO']) ||
                  'Sin radicado';
                const cta =
                  getFieldValue(rec, ['numeroCuenta', 'cuenta', 'NUMERO_CUENTA']) || 'Sin cuenta';
                const proc = getFieldValue(rec, ['numeroProceso', 'NUMERO_PROCESO']);
                const nom = formatApplicantName(
                  getFieldValue(rec, ['nombreSolicitante', 'NOMBRE_SOLICITANTE']) ||
                    'Sin solicitante'
                );
                const tramite =
                  getFieldValue(rec, ['tipoProceso', 'descripcionTipoProceso']) ||
                  getFieldValue(rec, ['TIPO_TRAMITE', 'PROCESO']) ||
                  '';
                const cedula = getFieldValue(rec, ['cedulaSolicitante', 'CEDULA_SOLICITANTE']);

                return (
                  <div
                    key={rowId || idx}
                    role="option"
                    aria-selected={isSelected}
                    className={`dg-record-item ${isSelected ? 'selected' : ''} ${
                      isHighlighted ? 'highlighted' : ''
                    }`}
                    onClick={() => handleSelect(rec)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    data-testid={`dg-record-item-${rowId}`}
                  >
                    <div className="dg-record-item-main">
                      <div className="dg-record-item-top">
                        <span className="dg-record-item-rad">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          {rad}
                        </span>
                        <span className="dg-record-item-cta">Cta: {cta}</span>
                        {proc && proc !== rad && (
                          <span className="dg-record-item-proc">Proc: {proc}</span>
                        )}
                        {isSelected && <span className="dg-record-item-current-badge">Activo</span>}
                      </div>

                      <div className="dg-record-item-bottom">
                        <span className="dg-record-item-nom">{nom}</span>
                        {cedula && <span className="dg-record-item-ced">C.C. {cedula}</span>}
                        {tramite && (
                          <span className="dg-record-item-tramite" title={tramite}>
                            {tramite}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="dg-record-item-select-btn"
                      tabIndex={-1}
                      aria-hidden
                    >
                      {isSelected ? 'Cargado' : 'Cargar'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RecordSearchBar;

/* ═══════════════════════════════════════════════════════════════
   STYLES — Buscador de Registros (Módulo 3: Generación Documental)
   ═══════════════════════════════════════════════════════════════ */
const recordSearchStyles = `
  /* ── Contenedor: anclado bajo el menú superior ──
     Queda fijo (sticky) justo debajo de la cabecera para que el filtro
     conserve una posición estable al desplazarse, y usa un z-index inferior al
     de la cabecera (z-header) para que nunca se superponga al menú: la
     cabecera siempre pinta por encima. */
  .dg-record-search-container {
    position: sticky;
    top: var(--header-h, 64px);
    z-index: calc(var(--z-header, 30) - 1);
    width: 100%;
    padding: 5px 0 7px;
    background: var(--bg-page, #f0f4f9);
  }

  .dg-record-search-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    border: 2px solid rgba(0, 75, 147, 0.24);
    border-left: 5px solid var(--essa-primary, #004b93);
    border-radius: 14px;
    padding: 8px 12px;
    box-shadow: 0 12px 24px -18px rgba(15, 23, 42, 0.6), 0 2px 4px rgba(15, 23, 42, 0.05);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    flex-wrap: wrap;
  }
  .dg-record-search-bar:focus-within {
    border-color: var(--essa-primary, #004b93);
    box-shadow: 0 0 0 4px rgba(0, 75, 147, 0.14), 0 14px 28px -18px rgba(15, 23, 42, 0.6);
  }

  /* Etiqueta «FILTRO GENERAL»: el filtro deja de pasar desapercibido */
  .dg-record-search-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    padding: 6px 11px;
    border-radius: 9px;
    background: linear-gradient(135deg, var(--essa-primary, #004b93) 0%, #0a6ab4 100%);
    color: #ffffff;
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    white-space: nowrap;
    box-shadow: 0 3px 8px -3px rgba(0, 75, 147, 0.55);
  }

  .dg-record-search-input-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1 1 320px;
    position: relative;
    min-width: 0;
  }
  .dg-record-search-iconbox {
    width: 30px;
    height: 30px;
    border-radius: 9px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: rgba(0, 75, 147, 0.1);
    color: var(--essa-primary, #004b93);
    transition: background 0.2s ease, color 0.2s ease;
  }
  .dg-record-search-bar:focus-within .dg-record-search-iconbox {
    background: var(--essa-primary, #004b93);
    color: #ffffff;
  }
  .dg-record-search-icon {
    color: inherit;
    flex-shrink: 0;
  }

  .dg-record-search-input {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--neutral-900, #0f172a);
    font-family: inherit;
    padding: 4px 0;
    min-width: 0;
  }
  .dg-record-search-input::placeholder {
    color: var(--neutral-500, #64748b);
    font-weight: 500;
  }

  .dg-record-search-clear {
    border: none;
    background: var(--neutral-100, #f1f5f9);
    color: var(--neutral-500, #64748b);
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    cursor: pointer;
    line-height: 1;
    transition: all 0.15s ease;
  }
  .dg-record-search-clear:hover {
    background: var(--neutral-200, #e2e8f0);
    color: var(--neutral-800, #1e293b);
  }

  /* ── Badges de estado del registro activo ── */
  .dg-record-active-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%);
    border: 1.5px solid #86efac;
    padding: 5px 11px;
    border-radius: 9999px;
    font-size: 0.74rem;
    color: #0369a1;
    flex-shrink: 0;
    max-width: 100%;
    overflow: hidden;
  }
  .dg-record-active-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
    flex-shrink: 0;
  }
  .dg-record-active-title {
    font-weight: 700;
    color: #0f172a;
    white-space: nowrap;
  }
  .dg-record-pill {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.68rem;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    max-width: 180px;
  }
  .dg-record-pill--rad {
    background: rgba(3, 105, 161, 0.1);
    color: #0369a1;
    font-family: var(--font-mono, monospace);
  }
  .dg-record-pill--cta {
    background: rgba(100, 116, 139, 0.1);
    color: #334155;
    font-family: var(--font-mono, monospace);
  }
  .dg-record-pill--nom {
    background: rgba(255, 255, 255, 0.7);
    color: #0f172a;
    font-weight: 600;
  }
  .dg-record-change-btn {
    border: none;
    background: #0284c7;
    color: #ffffff;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 9999px;
    cursor: pointer;
    margin-left: 2px;
    transition: all 0.15s ease;
  }
  .dg-record-change-btn:hover {
    background: #0369a1;
    transform: translateY(-1px);
  }

  .dg-record-unselected-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #fef2f2;
    border: 1.5px solid #fca5a5;
    padding: 5px 11px;
    border-radius: 9999px;
    font-size: 0.74rem;
    font-weight: 700;
    color: #b91c1c;
    flex-shrink: 0;
    white-space: nowrap;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6);
  }
  .dg-record-unselected-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.18);
  }

  /* ── Menú desplegable flotante ── */
  .dg-record-dropdown {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    background: #ffffff;
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 12px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    animation: dg-recordFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 50;
  }
  @keyframes dg-recordFadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .dg-record-dropdown-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    font-size: 0.68rem;
    font-weight: 700;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .dg-record-dropdown-hint {
    font-size: 0.62rem;
    font-weight: 500;
    color: #94a3b8;
    text-transform: none;
  }

  .dg-record-dropdown-list {
    max-height: 280px;
    overflow-y: auto;
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .dg-record-dropdown-list::-webkit-scrollbar { width: 5px; }
  .dg-record-dropdown-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }

  .dg-record-dropdown-empty {
    padding: 24px 16px;
    text-align: center;
    font-size: 0.75rem;
    color: #64748b;
  }

  .dg-record-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .dg-record-item:hover, .dg-record-item.highlighted {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }
  .dg-record-item.selected {
    background: #eff6ff;
    border-color: #bfdbfe;
  }

  .dg-record-item-main {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    flex: 1;
  }

  .dg-record-item-top {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .dg-record-item-rad {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    font-weight: 700;
    color: #0f172a;
    font-family: var(--font-mono, monospace);
  }
  .dg-record-item-rad svg {
    color: #004b93;
  }
  .dg-record-item-cta {
    font-size: 0.68rem;
    font-weight: 600;
    color: #475569;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 1px 5px;
    border-radius: 4px;
    font-family: var(--font-mono, monospace);
  }
  .dg-record-item-proc {
    font-size: 0.65rem;
    color: #64748b;
    font-family: var(--font-mono, monospace);
  }
  .dg-record-item-current-badge {
    font-size: 0.6rem;
    font-weight: 800;
    color: #15803d;
    background: #dcfce7;
    border: 1px solid #86efac;
    padding: 1px 6px;
    border-radius: 9999px;
  }

  .dg-record-item-bottom {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.68rem;
    color: #64748b;
    flex-wrap: wrap;
  }
  .dg-record-item-nom {
    font-weight: 600;
    color: #1e293b;
  }
  .dg-record-item-ced {
    color: #94a3b8;
  }
  .dg-record-item-tramite {
    background: #f1f5f9;
    padding: 1px 6px;
    border-radius: 4px;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #475569;
  }

  .dg-record-item-select-btn {
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #0f172a;
    font-size: 0.68rem;
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.15s ease;
  }
  .dg-record-item:hover .dg-record-item-select-btn,
  .dg-record-item.highlighted .dg-record-item-select-btn {
    background: #004b93;
    border-color: #004b93;
    color: #ffffff;
  }
  .dg-record-item.selected .dg-record-item-select-btn {
    background: #e0f2fe;
    border-color: #7dd3fc;
    color: #0369a1;
  }
`;

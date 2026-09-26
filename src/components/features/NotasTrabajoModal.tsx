import { useEffect, useMemo, useRef, useState } from 'react';
import { modalStyles } from './DashboardModals';
import { formatNotaFecha, type NotaInput, type NotaTrabajo } from '@/utils/dashboardNotas';

const notasStyles = `${modalStyles}
  /* ═══════════ NOTAS DEL TRABAJO DIARIO ═══════════ */
  .dnot-box { max-width: 720px; }
  .dnot-scroll { padding: 18px 24px 20px; display: flex; flex-direction: column; gap: 16px; }

  .dnot-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: linear-gradient(135deg, #f8fafc 0%, #ffffff 65%);
    padding: 14px;
  }
  .dnot-form-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .dnot-form-head b { font-size: 0.82rem; font-weight: 800; color: var(--neutral-900); }
  .dnot-form-head i {
    font-style: normal;
    font-size: 0.7rem;
    color: var(--neutral-500);
    margin-left: 6px;
    font-weight: 600;
  }

  .dnot-textarea {
    width: 100%;
    min-height: 96px;
    resize: vertical;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #ffffff;
    padding: 10px 12px;
    font-family: inherit;
    font-size: 0.82rem;
    line-height: 1.55;
    color: var(--neutral-900);
    outline: none;
    transition: border-color 150ms var(--ease), box-shadow 150ms var(--ease);
  }
  .dnot-textarea::placeholder { color: var(--neutral-400); }
  .dnot-textarea:focus { border-color: var(--essa-primary); box-shadow: 0 0 0 3px rgba(0, 75, 147, 0.12); }

  .dnot-row { display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap; }
  .dnot-field { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 220px; }
  .dnot-field span {
    font-size: 0.64rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--neutral-500);
  }
  .dnot-field input {
    height: 36px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #ffffff;
    padding: 0 12px;
    font-size: 0.78rem;
    font-family: inherit;
    color: var(--neutral-900);
    outline: none;
    transition: border-color 150ms var(--ease), box-shadow 150ms var(--ease);
  }
  .dnot-field input::placeholder { color: var(--neutral-400); }
  .dnot-field input:focus { border-color: var(--essa-primary); box-shadow: 0 0 0 3px rgba(0, 75, 147, 0.12); }

  .dnot-btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 36px;
    padding: 0 18px;
    border-radius: 999px;
    border: 1px solid #1e3a8a;
    background: linear-gradient(135deg, #0b2a5b 0%, #004B93 50%, #0e6ad1 100%);
    color: #ffffff;
    font-size: 0.76rem;
    font-weight: 700;
    font-family: inherit;
    white-space: nowrap;
    cursor: pointer;
    box-shadow: 0 3px 10px rgba(0, 75, 147, 0.25);
    transition: filter 150ms ease, box-shadow 150ms ease, transform 150ms ease;
  }
  .dnot-btn-primary:hover { filter: brightness(1.08); box-shadow: 0 5px 14px rgba(0, 75, 147, 0.3); }
  .dnot-btn-primary:active { transform: translateY(1px); }
  .dnot-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; filter: none; }
  .dnot-btn-primary:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(0, 75, 147, 0.3); }

  .dnot-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 28px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: #ffffff;
    color: var(--neutral-600);
    font-size: 0.7rem;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    transition: border-color 150ms ease, color 150ms ease, background 150ms ease;
  }
  .dnot-btn:hover { border-color: var(--essa-primary); color: var(--essa-primary); background: #f8fbff; }
  .dnot-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(0, 75, 147, 0.2); }
  .dnot-btn--del:hover { border-color: #fca5a5; color: var(--danger); background: var(--danger-50); }
  .dnot-btn--yes { border-color: var(--danger); background: var(--danger); color: #ffffff; }
  .dnot-btn--yes:hover { border-color: var(--danger-600); background: var(--danger-600); color: #ffffff; }

  .dnot-listhead { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .dnot-listhead b {
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--neutral-500);
  }
  .dnot-search {
    height: 34px;
    width: 260px;
    max-width: 100%;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #ffffff;
    padding: 0 12px;
    font-size: 0.76rem;
    font-family: inherit;
    color: var(--neutral-900);
    outline: none;
    transition: border-color 150ms var(--ease), box-shadow 150ms var(--ease);
  }
  .dnot-search::placeholder { color: var(--neutral-400); }
  .dnot-search:focus { border-color: var(--essa-primary); box-shadow: 0 0 0 3px rgba(0, 75, 147, 0.12); }

  .dnot-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .dnot-item {
    border: 1px solid var(--border);
    border-radius: 10px;
    background: #ffffff;
    padding: 12px 14px;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  }
  .dnot-item-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .dnot-chip {
    font-size: 0.66rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    padding: 3px 9px;
    border-radius: 999px;
    background: var(--essa-primary-50);
    border: 1px solid var(--essa-primary-100);
    color: var(--essa-primary);
  }
  .dnot-chip--gen {
    background: var(--neutral-100);
    border-color: var(--border);
    color: var(--neutral-600);
    font-weight: 700;
  }
  .dnot-fecha { font-size: 0.68rem; color: var(--neutral-400); font-variant-numeric: tabular-nums; }
  .dnot-item-actions { margin-left: auto; display: flex; gap: 6px; align-items: center; }
  .dnot-item p {
    margin: 8px 0 0;
    font-size: 0.82rem;
    line-height: 1.55;
    color: var(--neutral-700);
    white-space: pre-line;
    overflow-wrap: anywhere;
  }

  .dnot-empty {
    border: 1px dashed var(--border-strong);
    border-radius: 12px;
    background: var(--bg-muted);
    padding: 26px 16px;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: var(--neutral-500);
  }
  .dnot-empty b { color: var(--neutral-700); font-size: 0.85rem; }
  .dnot-empty span { font-size: 0.74rem; }

  @media (max-width: 640px) {
    .dnot-scroll { padding: 14px 16px 16px; }
    .dnot-search { width: 100%; }
    .dnot-row { flex-direction: column; align-items: stretch; }
    .dnot-field { min-width: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .dnot-box, .dmod-overlay { animation: none; }
  }
`;

interface NotasTrabajoModalProps {
  open: boolean;
  notas: NotaTrabajo[];
  /** Radicado preseleccionado (se abre desde el detalle de un radicado). */
  radicadoPrefill: string;
  /** Radicados sugeridos para el campo (los del día seleccionado). */
  sugerencias: string[];
  onGuardar: (nota: NotaInput) => void;
  onEliminar: (id: string) => void;
  onClose: () => void;
}

export function NotasTrabajoModal({
  open,
  notas,
  radicadoPrefill,
  sugerencias,
  onGuardar,
  onEliminar,
  onClose,
}: NotasTrabajoModalProps): JSX.Element | null {
  const [texto, setTexto] = useState('');
  const [radicado, setRadicado] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Bloquea el scroll del fondo mientras el modal está abierto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Al abrir: formulario limpio listo para crear (o con el radicado precargado).
  useEffect(() => {
    if (!open) return;
    setTexto('');
    setRadicado(radicadoPrefill);
    setEditId(null);
    setQ('');
    setConfirmId(null);
    const t = window.setTimeout(() => textareaRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [open, radicadoPrefill]);

  const visibles = useMemo(() => {
    const orden = [...notas].sort((a, b) => b.actualizadaEn.localeCompare(a.actualizadaEn));
    const term = q.trim().toLowerCase();
    if (!term) return orden;
    return orden.filter(
      (n) => n.texto.toLowerCase().includes(term) || n.radicado.toLowerCase().includes(term)
    );
  }, [notas, q]);

  if (!open) return null;

  const guardar = (): void => {
    const t = texto.trim();
    if (!t) return;
    onGuardar({ id: editId ?? undefined, texto: t, radicado: radicado.trim() });
    setTexto('');
    setEditId(null);
    textareaRef.current?.focus();
  };

  const editar = (n: NotaTrabajo): void => {
    setEditId(n.id);
    setTexto(n.texto);
    setRadicado(n.radicado);
    setConfirmId(null);
    textareaRef.current?.focus();
  };

  const cancelarEdicion = (): void => {
    setEditId(null);
    setTexto('');
  };

  return (
    <div
      className="dmod-overlay"
      data-testid="dash-notas-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Notas y observaciones del trabajo diario"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{notasStyles}</style>
      <div className="dmod-box dnot-box">
        {/* Cabecera fija */}
        <div className="dmod-head">
          <div className="dmod-head-text">
            <h3>
              <span>Notas y observaciones</span>
            </h3>
            <p>
              Registra comentarios o información adicional del trabajo diario. Se guardan en este
              equipo.
            </p>
          </div>
          <button
            type="button"
            className="dmod-close"
            onClick={onClose}
            aria-label="Cerrar ventana"
            title="Cerrar ventana (Esc)"
            data-testid="dash-notas-close"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Contenido con scroll interno */}
        <div className="dmod-scroll dnot-scroll">
          {/* ── Formulario crear / editar ── */}
          <form
            className="dnot-form"
            onSubmit={(e) => {
              e.preventDefault();
              guardar();
            }}
          >
            <div className="dnot-form-head">
              <b>
                {editId ? 'Editar nota' : 'Nueva nota'}
                <i>{editId ? 'estás modificando una nota guardada' : 'observación del día'}</i>
              </b>
              {editId && (
                <button type="button" className="dnot-btn" onClick={cancelarEdicion}>
                  Cancelar edición
                </button>
              )}
            </div>
            <textarea
              ref={textareaRef}
              className="dnot-textarea"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe la observación, comentario o información adicional…"
              aria-label="Texto de la nota"
              data-testid="dash-notas-texto"
            />
            <div className="dnot-row">
              <label className="dnot-field">
                <span>Radicado (opcional)</span>
                <input
                  list="dnot-radicados"
                  value={radicado}
                  onChange={(e) => setRadicado(e.target.value)}
                  placeholder="Vacío = nota general del trabajo diario"
                  aria-label="Radicado asociado a la nota"
                  data-testid="dash-notas-radicado"
                />
                <datalist id="dnot-radicados">
                  {sugerencias.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>
              <button
                type="submit"
                className="dnot-btn-primary"
                disabled={texto.trim() === ''}
                data-testid="dash-notas-guardar"
              >
                {editId ? 'Guardar cambios' : 'Crear nota'}
              </button>
            </div>
          </form>

          {/* ── Listado de notas guardadas ── */}
          <div className="dnot-listhead">
            <b>Notas guardadas</b>
            <input
              type="search"
              className="dnot-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por radicado o texto…"
              aria-label="Buscar notas"
              data-testid="dash-notas-buscar"
            />
          </div>

          {visibles.length === 0 ? (
            <div className="dnot-empty" data-testid="dash-notas-empty">
              <b>{notas.length === 0 ? 'Sin notas todavía' : 'Ninguna nota coincide'}</b>
              <span>
                {notas.length === 0
                  ? 'Crea la primera nota con el formulario de arriba.'
                  : 'Prueba con otro término de búsqueda.'}
              </span>
            </div>
          ) : (
            <ul className="dnot-list">
              {visibles.map((n) => (
                <li
                  className="dnot-item"
                  key={n.id}
                  data-testid={`dash-nota-${n.id}`}
                  data-radicado={n.radicado}
                >
                  <div className="dnot-item-head">
                    <span className={`dnot-chip${n.radicado ? '' : ' dnot-chip--gen'}`}>
                      {n.radicado || 'General'}
                    </span>
                    <span className="dnot-fecha">
                      {formatNotaFecha(n.actualizadaEn)}
                      {n.actualizadaEn !== n.creadaEn ? ' · editada' : ''}
                    </span>
                    <span className="dnot-item-actions">
                      <button
                        type="button"
                        className="dnot-btn"
                        onClick={() => editar(n)}
                        data-testid={`dash-nota-edit-${n.id}`}
                      >
                        Editar
                      </button>
                      {confirmId === n.id ? (
                        <>
                          <button
                            type="button"
                            className="dnot-btn dnot-btn--yes"
                            onClick={() => {
                              onEliminar(n.id);
                              setConfirmId(null);
                            }}
                            data-testid={`dash-nota-del-yes-${n.id}`}
                          >
                            Sí, eliminar
                          </button>
                          <button
                            type="button"
                            className="dnot-btn"
                            onClick={() => setConfirmId(null)}
                            data-testid={`dash-nota-del-no-${n.id}`}
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="dnot-btn dnot-btn--del"
                          onClick={() => setConfirmId(n.id)}
                          data-testid={`dash-nota-del-${n.id}`}
                        >
                          Eliminar
                        </button>
                      )}
                    </span>
                  </div>
                  <p>{n.texto}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pie fijo */}
        <div className="dmod-foot">
          <div className="dmod-foot-meta">
            {notas.length === 0
              ? 'Sin notas guardadas'
              : `${notas.length} nota${notas.length === 1 ? '' : 's'} en este equipo`}
          </div>
          <button
            type="button"
            className="dmod-btn-primary"
            onClick={onClose}
            data-testid="dash-notas-cerrar"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

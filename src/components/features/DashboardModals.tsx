import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  formatDMY,
  medioInfo,
  esCorreoMedio,
  type EstadoV,
  type RadicadoGroup,
} from '@/utils/dashboardGroups';
import { formatDateToSpanish } from '@/utils/businessDays';
import { toIsoDate, parseIsoDate } from '@/utils/dashboardAjustes';

const ESTADO_COLOR: Record<EstadoV, string> = {
  Vencido: '#d93025',
  Crítico: '#f29d38',
  Próximo: '#c9a100',
  'En plazo': '#2e9e5b',
  'Sin fecha': '#7d8ba1',
};

const ESTADO_BADGE: Record<EstadoV, string> = {
  Vencido: 'b-r',
  Crítico: 'b-n',
  Próximo: 'b-a',
  'En plazo': 'b-v',
  'Sin fecha': 'b-g',
};

function fmt(n: number): string {
  return n.toLocaleString('es-CO');
}

function fmtFecha(v: string): string {
  if (!v) return '—';
  try {
    return formatDateToSpanish(v) || v;
  } catch {
    return v;
  }
}

/** Bloquea el scroll del fondo mientras el modal está abierto.
 *  El cierre con Escape lo gestiona la vista (prioridad: detalle > listado > análisis). */
function useModalBehavior(open: boolean): void {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
}

interface ListModalProps {
  open: boolean;
  titulo: string;
  sub: string;
  groups: RadicadoGroup[];
  onClose: () => void;
  onSelect: (g: RadicadoGroup) => void;
}

const LIST_CAP = 200;

export function RadicadoListModal({
  open,
  titulo,
  sub,
  groups,
  onClose,
  onSelect,
}: ListModalProps): JSX.Element | null {
  useModalBehavior(open);
  const [listQuery, setListQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('todos');

  useEffect(() => {
    if (open) {
      setListQuery('');
      setFilterEstado('todos');
    }
  }, [open]);

  const sorted = useMemo(
    () =>
      [...groups].sort(
        (a, b) => (a.dia ?? 99) - (b.dia ?? 99) || (a.restan ?? 9999) - (b.restan ?? 9999)
      ),
    [groups]
  );

  const filtered = useMemo(() => {
    let res = sorted;
    if (filterEstado !== 'todos') {
      res = res.filter((g) => g.estadoV === filterEstado);
    }
    const q = listQuery.trim().toLowerCase();
    if (q) {
      res = res.filter(
        (g) =>
          g.radicado.toLowerCase().includes(q) ||
          g.responsable.toLowerCase().includes(q) ||
          (g.cuenta && g.cuenta.toLowerCase().includes(q)) ||
          g.tramites.some((t) => t.toLowerCase().includes(q)) ||
          g.procesos.some((p) => p.numero.toLowerCase().includes(q))
      );
    }
    return res;
  }, [sorted, listQuery, filterEstado]);

  if (!open) return null;
  const visible = filtered.slice(0, LIST_CAP);

  return (
    <div
      className="dmod-overlay"
      data-testid="dash-list-modal"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{modalStyles}</style>
      <div className="dmod-box dmod-box--wide">
        {/* Encabezado fijo */}
        <div className="dmod-head">
          <div className="dmod-head-text">
            <h3>
              <span>{titulo}</span>
              <span className="dmod-badge b-b">{fmt(groups.length)}</span>
            </h3>
            <p>
              {sub} · {fmt(groups.length)} radicado{groups.length === 1 ? '' : 's'} en total
            </p>
          </div>
          <button
            type="button"
            className="dmod-close"
            onClick={onClose}
            aria-label="Cerrar ventana"
            title="Cerrar ventana (Esc)"
            data-testid="dash-list-close"
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

        {/* Barra de herramientas / filtros internos del modal */}
        <div className="dmod-toolbar">
          <div className="dmod-search-wrap">
            <svg
              className="dmod-search-icon"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              className="dmod-search-input"
              value={listQuery}
              onChange={(e) => setListQuery(e.target.value)}
              placeholder="Buscar en el listado por radicado, cuenta, trámite, responsable…"
              aria-label="Buscar en el listado"
            />
            {listQuery && (
              <button
                type="button"
                className="dmod-search-clear"
                onClick={() => setListQuery('')}
                title="Limpiar búsqueda"
              >
                ×
              </button>
            )}
          </div>
          <div className="dmod-chips-wrap">
            <button
              type="button"
              className={`dmod-chip-btn ${filterEstado === 'todos' ? 'on' : ''}`}
              onClick={() => setFilterEstado('todos')}
            >
              Todos ({fmt(sorted.length)})
            </button>
            {(['Vencido', 'Crítico', 'Próximo', 'En plazo', 'Sin fecha'] as EstadoV[]).map(
              (est) => {
                const c = sorted.filter((g) => g.estadoV === est).length;
                if (c === 0 && filterEstado !== est) return null;
                return (
                  <button
                    key={est}
                    type="button"
                    className={`dmod-chip-btn ${filterEstado === est ? 'on' : ''}`}
                    onClick={() => setFilterEstado(filterEstado === est ? 'todos' : est)}
                  >
                    <i className="dmod-chip-dot" style={{ background: ESTADO_COLOR[est] }} />
                    {est} ({fmt(c)})
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Tabla con scroll interno y cabecera pegada */}
        <div className="dmod-scroll">
          <table className="dmod-table">
            <thead>
              <tr>
                <th>Radicado</th>
                <th>Procesos</th>
                <th>Cuenta</th>
                <th>Trámite</th>
                <th>F. radicación</th>
                <th>F. vencimiento</th>
                <th>Estado</th>
                <th>Responsable</th>
                <th>Origen</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={9} className="dmod-empty">
                    <div className="dmod-empty-state">
                      <div className="dmod-empty-icon">🔍</div>
                      <p>
                        {groups.length === 0
                          ? 'Sin registros en este criterio.'
                          : 'Ningún radicado coincide con los filtros de búsqueda.'}
                      </p>
                      {listQuery && (
                        <button
                          type="button"
                          className="dmod-btn-ghost"
                          onClick={() => {
                            setListQuery('');
                            setFilterEstado('todos');
                          }}
                        >
                          Restablecer búsqueda
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                visible.map((g) => (
                  <tr
                    key={g.key}
                    className="dmod-rowlink"
                    onClick={() => onSelect(g)}
                    title="Clic para abrir detalle del radicado"
                    data-testid={`dash-list-row-${g.key}`}
                  >
                    <td className="mono strong">
                      <div className="dmod-rad-cell">
                        <span>{g.radicado}</span>
                        <span className="dmod-row-arrow" aria-hidden="true">
                          →
                        </span>
                      </div>
                    </td>
                    <td>
                      {g.nProc === 0 ? (
                        <span className="dmod-muted">Sin proceso en SAC</span>
                      ) : (
                        <span className="dmod-proc-tags">
                          {g.procesos
                            .map((p) => p.numero)
                            .filter(Boolean)
                            .slice(0, 3)
                            .join(', ')}
                          {g.nProc > 3 && ` +${g.nProc - 3}`}
                        </span>
                      )}
                    </td>
                    <td className="mono">{g.cuenta || '—'}</td>
                    <td>
                      <span className="dmod-tramite-txt" title={g.tramites.join(' · ')}>
                        {g.tramites.join(' · ')}
                      </span>
                    </td>
                    <td className="mono">{formatDMY(g.fSol)}</td>
                    <td className="mono">{formatDMY(g.fVto)}</td>
                    <td>
                      <span className={`dmod-badge ${ESTADO_BADGE[g.estadoV]}`}>
                        <i
                          className="dmod-badge-dot"
                          style={{ background: ESTADO_COLOR[g.estadoV] }}
                        />
                        {g.estadoV}
                      </span>
                    </td>
                    <td>
                      <span className="dmod-resp-txt" title={g.responsable}>
                        {g.responsable}
                      </span>
                    </td>
                    <td>
                      <span className="dmod-badge b-g">{g.fuente}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pie fijo con contador y botón de cierre */}
        <div className="dmod-foot">
          <div className="dmod-foot-meta">
            {filtered.length > visible.length ? (
              <span className="dmod-cap">
                Mostrando {visible.length} de <b>{fmt(filtered.length)}</b> radicados filtrados
                (total: {fmt(groups.length)})
              </span>
            ) : (
              <span className="dmod-cap">
                Mostrando <b>{fmt(visible.length)}</b> de {fmt(groups.length)} radicado
                {groups.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <div className="dmod-foot-tip">
            <span>
              Presiona <kbd className="dmod-kbd">Esc</kbd> o el botón superior para cerrar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ Modal de detalle del radicado (como verDetalle del original) ═══════════ */

function revisionState(estadoRevision: string): { cls: string; label: string; color: string } {
  const er = estadoRevision.trim().toUpperCase();
  if (er === 'F') return { cls: 'f', label: 'Finalizada', color: '#2e9e5b' };
  if (er === 'T') return { cls: 't', label: 'En trámite', color: '#f29d38' };
  if (er) return { cls: 't', label: estadoRevision.trim(), color: '#f29d38' };
  return { cls: '', label: 'Sin estado', color: '#9aa6b8' };
}

export function RadicadoDetailModal({
  group,
  onClose,
  onAplicarAjuste,
  onQuitarAjuste,
}: {
  group: RadicadoGroup | null;
  onClose: () => void;
  onAplicarAjuste: (key: string, iso: string) => void;
  onQuitarAjuste: (key: string) => void;
}): JSX.Element | null {
  useModalBehavior(group !== null);
  const [obsOpen, setObsOpen] = useState<number | null>(null);
  const [procQuery, setProcQuery] = useState('');
  const [expandedProc, setExpandedProc] = useState<number | null>(null);
  const [fechaInput, setFechaInput] = useState('');

  useEffect(() => {
    setObsOpen(null);
    setProcQuery('');
    setExpandedProc(null);
    setFechaInput(
      group
        ? group.ajuste
          ? toIsoDate(group.ajuste)
          : group.fSol
            ? toIsoDate(group.fSol)
            : ''
        : ''
    );
  }, [group?.key]);

  const filteredProcs = useMemo(() => {
    if (!group) return [];
    const q = procQuery.trim().toLowerCase();
    if (!q) return group.procesos.map((p, i) => ({ p, i }));
    return group.procesos
      .map((p, i) => ({ p, i }))
      .filter(
        ({ p }) =>
          p.numero.toLowerCase().includes(q) ||
          p.tramite.toLowerCase().includes(q) ||
          p.cuenta.toLowerCase().includes(q)
      );
  }, [group, procQuery]);

  if (!group) return null;
  const g = group;
  const conRev = g.procesos.filter((p) => p.responsableRevision).length;
  const conObs = g.procesos.filter((p) => p.observacion).length;
  const medio = medioInfo(g.medio);
  const pctDia = g.dia !== null ? Math.min(100, Math.max(0, (g.dia / 15) * 100)) : 0;
  const revTxt =
    g.nProc === 0
      ? 'No aplica · sin proceso en SAC'
      : conRev > 0
        ? `Sí · ${conRev} de ${g.nProc} proceso(s)`
        : 'No tiene revisión asignada';

  const stat = (label: string, value: ReactNode, muted?: boolean): ReactNode => (
    <div className="ddet-stat">
      <div className="ddet-stat-l">{label}</div>
      <div className={`ddet-stat-v${muted ? ' muted' : ''}`}>{value}</div>
    </div>
  );
  const fila = (k: string, v: ReactNode, muted?: boolean): ReactNode => (
    <div className="ddet-fila">
      <span className="ddet-k">{k}</span>
      <span className={`ddet-v${muted ? ' muted' : ''}`}>{v}</span>
    </div>
  );

  return (
    <div
      className="dmod-overlay"
      data-testid="dash-detail-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle del radicado ${g.radicado}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{modalStyles}</style>
      <div className="dmod-box dmod-box--detail">
        {/* Cabecera superior fija con botón de cierre */}
        <div className="dmod-head">
          <div className="dmod-head-text">
            <h3>
              <span>Radicado {g.radicado}</span>
              <span className={`dmod-badge ${ESTADO_BADGE[g.estadoV]}`}>
                <i className="dmod-badge-dot" style={{ background: ESTADO_COLOR[g.estadoV] }} />
                {g.estadoV}
              </span>
            </h3>
            <p>Ficha de trazabilidad y estado de los procesos asociados en SAC</p>
          </div>
          <button
            type="button"
            className="dmod-close"
            onClick={onClose}
            aria-label="Cerrar ventana"
            title="Cerrar ventana (Esc)"
            data-testid="dash-detail-close"
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
        <div className="dmod-scroll dmod-scroll--detail">
          {/* ── Hero del radicado ── */}
          <div className="ddet-hero">
            <div className="ddet-head">
              <div className="ddet-head-main">
                <div className="ddet-eyebrow">Detalle del radicado</div>
                <h3 data-testid="dash-detail-radicado">{g.radicado}</h3>
                <div className="ddet-tramites">{g.tramites.join(' · ')}</div>
                <div className="ddet-chips">
                  <span
                    className="ddet-chip"
                    style={{
                      borderColor: ESTADO_COLOR[g.estadoV],
                      color: ESTADO_COLOR[g.estadoV],
                      fontWeight: 800,
                    }}
                  >
                    <i className="ddet-dot" style={{ background: ESTADO_COLOR[g.estadoV] }} />
                    {g.estadoV}
                  </span>
                  <span className="ddet-chip">Día {g.dia ?? '—'} de 15</span>
                  <span className="ddet-chip">
                    <i className="ddet-dot" style={{ background: medio.color }} />
                    {medio.etiqueta}
                  </span>
                  <span className="ddet-chip">{g.fuente}</span>
                  {g.vencida && (
                    <span className="ddet-chip ddet-chip--alert">Fuera de los 15 días</span>
                  )}
                </div>
              </div>
              <div className="ddet-reloj">
                {g.restan === null ? (
                  <>
                    <div className="ddet-reloj-n muted">—</div>
                    <div className="ddet-reloj-u">Sin fecha de vencimiento</div>
                  </>
                ) : (
                  <>
                    <div className="ddet-reloj-n" style={{ color: ESTADO_COLOR[g.estadoV] }}>
                      {Math.abs(g.restan)}
                    </div>
                    <div className="ddet-reloj-u">
                      {g.restan < 0
                        ? Math.abs(g.restan) === 1
                          ? 'día vencido'
                          : 'días vencidos'
                        : g.restan === 1
                          ? 'día restante'
                          : 'días restantes'}
                    </div>
                    <div className="ddet-reloj-f">
                      Vence <b>{formatDMY(g.fVto)}</b>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="ddet-linea">
              <div className="ddet-bar">
                <i style={{ width: `${pctDia}%` }} />
              </div>
              <span className="ddet-mark" style={{ left: `${pctDia}%` }} />
              <div className="ddet-legend">
                <span>Día 1 · recibido</span>
                <span>Día 15 · límite legal</span>
              </div>
            </div>
          </div>

          {/* ── Métricas clave ── */}
          <div className="ddet-stats">
            {stat(
              'F. radicación',
              <>
                {formatDMY(g.fSol)}
                {g.ajuste && <small> → {formatDMY(g.ajuste)}</small>}
              </>
            )}
            {g.fVto
              ? stat('F. vencimiento', formatDMY(g.fVto))
              : stat('F. vencimiento', 'Sin fecha', true)}
            {g.nProc > 0
              ? stat('Procesos en SAC', fmt(g.nProc))
              : stat('Procesos en SAC', 'Sin proceso', true)}
            {stat('Cuentas', g.nCuentas > 0 ? fmt(g.nCuentas) : 'Sin cuenta', g.nCuentas === 0)}
            {stat(
              'Revisiones',
              g.nProc > 0 ? `${conRev} de ${g.nProc}` : 'No aplica',
              g.nProc === 0
            )}
            {stat('Observaciones', conObs > 0 ? fmt(conObs) : 'Ninguna', conObs === 0)}
          </div>

          {/* ── Ajuste de fecha real (solo correo) ── */}
          {esCorreoMedio(medio.etiqueta) && (
            <div className="dmail-box" data-testid="dash-detail-mailbox">
              <div className="dmail-title">
                <span className="dmail-icon">✉</span>
                Recibido por correo electrónico
              </div>
              <p className="dmail-text">
                Fecha oficial del sistema: <b>{formatDMY(g.fSol)}</b>. Si el correo llegó antes,
                registra la fecha real para contar los días desde ahí. El ajuste queda guardado en
                este equipo.
              </p>
              <div className="dmail-row">
                <label className="dmail-field">
                  <span>Fecha de recepción</span>
                  <input
                    type="date"
                    value={fechaInput}
                    onChange={(e) => setFechaInput(e.target.value)}
                    aria-label="Fecha de recepción"
                    data-testid="dash-detail-fecha"
                  />
                </label>
                <button
                  type="button"
                  className="dmail-apply"
                  disabled={parseIsoDate(fechaInput) === null}
                  onClick={() => {
                    const d = parseIsoDate(fechaInput);
                    if (d) onAplicarAjuste(g.key, toIsoDate(d));
                  }}
                  data-testid="dash-detail-aplicar"
                >
                  Aplicar
                </button>
                {g.ajuste && (
                  <button
                    type="button"
                    className="dmail-clear"
                    onClick={() => onQuitarAjuste(g.key)}
                    data-testid="dash-detail-quitar"
                  >
                    Quitar ajuste
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Cuerpo: Ficha (izq) y Procesos (der) ── */}
          <div className="ddet-cuerpo">
            {/* Ficha técnica */}
            <div className="ddet-ficha">
              <div className="ddet-section-card">
                <div className="ddet-grupo">Identificación</div>
                {fila('Radicado', <span className="mono strong">{g.radicado}</span>)}
                {fila('Tipo de trámite', g.tramites.join(' · '))}
                {fila(
                  'Número de cuenta',
                  <>
                    {g.cuenta || '—'}
                    {g.nCuentas > 1 && <span className="dmod-badge b-b">{g.nCuentas} cuentas</span>}
                  </>,
                  !g.cuenta
                )}
              </div>

              <div className="ddet-section-card">
                <div className="ddet-grupo">Tiempos y Plazos</div>
                {fila(
                  'F. radicación',
                  <>
                    {formatDMY(g.fSol)}
                    {g.ajuste && (
                      <span className="dmod-badge b-a" title="Fecha real de recepción registrada">
                        → {formatDMY(g.ajuste)}
                      </span>
                    )}
                  </>
                )}
                {fila(
                  'F. vencimiento',
                  <>
                    {formatDMY(g.fVto)}{' '}
                    <span className={`dmod-badge ${ESTADO_BADGE[g.estadoV]}`}>{g.estadoV}</span>
                  </>
                )}
                {fila('Día en la bandeja', `Día ${g.dia ?? '—'} de 15`)}
              </div>

              <div className="ddet-section-card">
                <div className="ddet-grupo">Gestión y Asignación</div>
                {fila(
                  'Responsable',
                  <>
                    {g.responsable}
                    {g.respVariante &&
                      g.respVariante.toLowerCase() !== g.responsable.toLowerCase() && (
                        <span
                          className="dmod-badge b-g"
                          title="Nombre tal como figura en el archivo de origen"
                        >
                          {g.respVariante}
                        </span>
                      )}
                  </>
                )}
                {fila('Solicitante', g.solicitante || '—', !g.solicitante)}
                {fila('Municipio', g.municipio || '—', !g.municipio || g.municipio === '—')}
                {fila('¿Revisión asignada?', revTxt, g.nProc === 0)}
                {g.estadoMer
                  ? fila('Estado en Mercurio', g.estadoMer)
                  : fila('Estado en Mercurio', '—', true)}
                {fila('Origen', g.fuente)}
              </div>
            </div>

            {/* Procesos asociados */}
            <div className="ddet-procs">
              <div className="ddet-procs-header">
                <div className="ddet-grupo">
                  Procesos asociados <span className="dmod-badge b-b">{g.nProc}</span>
                </div>
              </div>

              {g.nProc === 0 ? (
                <div className="ddet-sinproc">
                  <div className="ddet-sinproc-icon">ℹ</div>
                  <div>
                    <b>Este radicado no tiene proceso creado en SAC</b>
                    <p>
                      Por este motivo aún no se registran números de proceso asociados, asignaciones
                      de revisión ni observaciones en SAC.
                    </p>
                  </div>
                </div>
              ) : g.nProc <= 2 ? (
                <div className="ddet-proc-lista">
                  {g.procesos.map((p, i) => {
                    const est = revisionState(p.estadoRevision);
                    const larga = p.observacion.length > 330;
                    const abierta = obsOpen === i;
                    return (
                      <div className="ddet-proc" key={`${p.numero}-${i}`}>
                        <div className="ddet-proc-head">
                          <span className="ddet-proc-num">{i + 1}</span>
                          <span className="mono strong">{p.numero || 'Sin número'}</span>
                          <span
                            className="ddet-pill"
                            style={{
                              color: est.color,
                              borderColor: `${est.color}66`,
                              background: `${est.color}14`,
                            }}
                          >
                            {est.label}
                          </span>
                        </div>
                        <div className="ddet-proc-grid">
                          <div>
                            <span>Trámite</span>
                            <p>{p.tramite}</p>
                          </div>
                          <div>
                            <span>Cuenta</span>
                            <p className="mono">{p.cuenta || 'Sin cuenta'}</p>
                          </div>
                          <div>
                            <span>Responsable revisión</span>
                            <p>{p.responsableRevision || '—'}</p>
                          </div>
                          <div>
                            <span>N.º de revisión</span>
                            <p className="mono">{p.numeroRevision || '—'}</p>
                          </div>
                          <div>
                            <span>Fecha de revisión</span>
                            <p>{fmtFecha(p.fechaRevision)}</p>
                          </div>
                          {p.motivo && (
                            <div>
                              <span>Motivo</span>
                              <p>{p.motivo}</p>
                            </div>
                          )}
                          {p.ultimaAccion && (
                            <div>
                              <span>Última acción</span>
                              <p>{p.ultimaAccion}</p>
                            </div>
                          )}
                        </div>
                        {p.observacion && (
                          <div className="ddet-obs">
                            <span>Observación de la revisión</span>
                            <p>
                              {larga && !abierta
                                ? `${p.observacion.slice(0, 330)}…`
                                : p.observacion}
                            </p>
                            {larga && (
                              <button
                                type="button"
                                className="ddet-link"
                                onClick={() => setObsOpen(abierta ? null : i)}
                              >
                                {abierta ? 'Ver menos' : 'Ver observación completa'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <input
                    type="search"
                    className="ddet-search"
                    placeholder="Buscar por número, trámite o cuenta…"
                    value={procQuery}
                    onChange={(e) => setProcQuery(e.target.value)}
                    aria-label="Buscar proceso"
                    data-testid="dash-detail-proc-search"
                  />
                  <div className="ddet-proc-lista ddet-proc-lista--compact">
                    {filteredProcs.length === 0 && (
                      <div className="ddet-sinproc">Ningún proceso coincide con la búsqueda.</div>
                    )}
                    {filteredProcs.map(({ p, i }) => {
                      const est = revisionState(p.estadoRevision);
                      const open = expandedProc === i;
                      return (
                        <div className="ddet-proc ddet-proc--compact" key={`${p.numero}-${i}`}>
                          <button
                            type="button"
                            className="ddet-proc-row"
                            onClick={() => setExpandedProc(open ? null : i)}
                            aria-expanded={open}
                          >
                            <span className="mono strong">{p.numero || 'Sin número'}</span>
                            <span
                              className="ddet-pill"
                              style={{
                                color: est.color,
                                borderColor: `${est.color}66`,
                                background: `${est.color}14`,
                              }}
                            >
                              {est.label}
                            </span>
                            <span className="ddet-proc-cuenta">{p.cuenta || 'Sin cuenta'}</span>
                            <span className="ddet-chev" aria-hidden="true">
                              {open ? '▾' : '▸'}
                            </span>
                          </button>
                          {open && (
                            <div className="ddet-proc-grid">
                              <div>
                                <span>Trámite</span>
                                <p>{p.tramite}</p>
                              </div>
                              <div>
                                <span>Responsable revisión</span>
                                <p>{p.responsableRevision || '—'}</p>
                              </div>
                              <div>
                                <span>N.º de revisión</span>
                                <p className="mono">{p.numeroRevision || '—'}</p>
                              </div>
                              <div>
                                <span>Fecha de revisión</span>
                                <p>{fmtFecha(p.fechaRevision)}</p>
                              </div>
                              {p.motivo && (
                                <div>
                                  <span>Motivo</span>
                                  <p>{p.motivo}</p>
                                </div>
                              )}
                              {p.ultimaAccion && (
                                <div>
                                  <span>Última acción</span>
                                  <p>{p.ultimaAccion}</p>
                                </div>
                              )}
                              {p.observacion && (
                                <div className="ddet-wide">
                                  <span>Observación</span>
                                  <p>{p.observacion}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pie fijo de cierre */}
        <div className="dmod-foot">
          <div className="dmod-foot-meta">
            <span className="dmod-cap">
              Radicado <b>{g.radicado}</b> · {g.tramites.join(' · ')}
            </span>
          </div>
          <button type="button" className="dmod-btn-primary" onClick={onClose}>
            Cerrar detalle
          </button>
        </div>
      </div>
    </div>
  );
}

export const modalStyles = `
  /* ═══════════════ MODAL OVERLAY & BOX ARCHITECTURE ═══════════════ */
  .dmod-overlay {
    position: fixed;
    inset: 0;
    z-index: 120;
    background: rgba(15, 23, 42, 0.68);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    overflow: hidden;
    animation: dmodFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes dmodFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .dmod-box {
    position: relative;
    background: #ffffff;
    border-radius: 18px;
    border: 1px solid rgba(226, 232, 240, 0.9);
    box-shadow: 0 25px 60px -15px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.04);
    width: 100%;
    max-height: calc(100vh - 48px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: dmodScaleUp 0.26s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes dmodScaleUp {
    from { opacity: 0; transform: translateY(12px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .dmod-box--wide { max-width: 1140px; }
  .dmod-box--anal { max-width: 1160px; }
  .dmod-box--detail { max-width: 1060px; }

  /* ═══════════════ STICKY HEADERS & FOOTERS ═══════════════ */
  .dmod-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 24px;
    border-bottom: 1px solid var(--border);
    background: #ffffff;
    flex-shrink: 0;
  }
  .dmod-head-text { min-width: 0; }
  .dmod-head-text h3 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--neutral-900);
    letter-spacing: -0.015em;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .dmod-head-text p {
    margin: 3px 0 0;
    font-size: 0.76rem;
    color: var(--neutral-500);
  }

  .dmod-close {
    width: 36px;
    height: 36px;
    border-radius: 999px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    color: #64748b;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 180ms cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
    outline: none;
  }
  .dmod-close svg {
    transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .dmod-close:hover {
    background: #fee2e2;
    color: #dc2626;
    border-color: #fca5a5;
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.16);
    transform: scale(1.08);
  }
  .dmod-close:hover svg {
    transform: rotate(90deg);
  }
  .dmod-close:active {
    transform: scale(0.95);
  }
  .dmod-close:focus-visible {
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.25);
  }
  .dmod-close--float {
    position: absolute;
    top: 14px;
    right: 18px;
    z-index: 10;
  }

  .dmod-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 12px 24px;
    border-top: 1px solid var(--border);
    background: #f8fafc;
    flex-shrink: 0;
  }
  .dmod-foot-meta { font-size: 0.74rem; color: var(--neutral-500); }
  .dmod-foot-tip {
    font-size: 0.74rem;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .dmod-kbd {
    display: inline-block;
    padding: 1px 6px;
    font-size: 0.68rem;
    font-family: inherit;
    font-weight: 700;
    color: #475569;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    box-shadow: 0 1px 0 #cbd5e1;
  }
  .dmod-btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 34px;
    padding: 0 18px;
    border-radius: 999px;
    border: 1px solid #1e3a8a;
    background: linear-gradient(135deg, #0b2a5b 0%, #004B93 50%, #0e6ad1 100%);
    color: #ffffff;
    font-size: 0.76rem;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 75, 147, 0.25);
    transition: transform 150ms ease, box-shadow 150ms ease;
  }
  .dmod-btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 75, 147, 0.35);
  }
  .dmod-btn-ghost {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 30px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: #ffffff;
    color: var(--neutral-600);
    font-size: 0.72rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 150ms ease;
  }
  .dmod-btn-ghost:hover {
    border-color: var(--essa-primary);
    color: var(--essa-primary);
  }

  /* ═══════════════ TOOLBAR & SEARCH ═══════════════ */
  .dmod-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 24px;
    background: #f8fafc;
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
    flex-shrink: 0;
  }
  .dmod-search-wrap {
    position: relative;
    flex: 1 1 280px;
    display: flex;
    align-items: center;
  }
  .dmod-search-icon {
    position: absolute;
    left: 12px;
    color: var(--neutral-400);
    pointer-events: none;
  }
  .dmod-search-input {
    width: 100%;
    height: 36px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: #ffffff;
    padding: 0 32px 0 36px;
    font-size: 0.76rem;
    font-family: inherit;
    color: var(--neutral-900);
    outline: none;
    transition: border-color 150ms ease, box-shadow 150ms ease;
  }
  .dmod-search-input:focus {
    border-color: var(--essa-primary);
    box-shadow: 0 0 0 3px rgba(0, 75, 147, 0.12);
  }
  .dmod-search-clear {
    position: absolute;
    right: 10px;
    background: none;
    border: none;
    color: var(--neutral-400);
    font-size: 1.1rem;
    cursor: pointer;
    line-height: 1;
  }
  .dmod-chips-wrap {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
  }
  .dmod-chip-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 11px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: #ffffff;
    color: var(--neutral-600);
    font-size: 0.68rem;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: all 150ms ease;
  }
  .dmod-chip-btn:hover {
    border-color: var(--neutral-400);
    color: var(--neutral-900);
  }
  .dmod-chip-btn.on {
    background: var(--essa-primary);
    border-color: var(--essa-primary);
    color: #ffffff;
  }
  .dmod-chip-dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
  }

  /* ═══════════════ SCROLLABLE CONTENT & TABLE ═══════════════ */
  .dmod-scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 0 24px 12px;
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 transparent;
  }
  .dmod-scroll::-webkit-scrollbar { width: 6px; }
  .dmod-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
  .dmod-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  .dmod-scroll--detail { padding: 0 0 16px; }

  .dmod-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.74rem;
    margin-top: 6px;
  }
  .dmod-table th {
    position: sticky;
    top: 0;
    background: #ffffff;
    text-align: left;
    font-size: 0.63rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--neutral-500);
    padding: 12px 10px;
    border-bottom: 2px solid var(--border);
    white-space: nowrap;
    z-index: 2;
  }
  .dmod-table td {
    padding: 9px 10px;
    border-bottom: 1px solid var(--neutral-100);
    color: var(--neutral-800);
    vertical-align: middle;
    transition: background 120ms ease;
  }
  .dmod-rowlink {
    cursor: pointer;
  }
  .dmod-rowlink:hover td {
    background: #f8fafc;
  }
  .dmod-rad-cell {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 800;
    color: var(--neutral-900);
  }
  .dmod-row-arrow {
    opacity: 0;
    color: var(--essa-primary);
    transform: translateX(-4px);
    transition: all 150ms ease;
  }
  .dmod-rowlink:hover .dmod-row-arrow {
    opacity: 1;
    transform: translateX(0);
  }
  .dmod-proc-tags {
    font-size: 0.72rem;
    color: var(--neutral-600);
  }
  .dmod-tramite-txt, .dmod-resp-txt {
    display: block;
    max-width: 170px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dmod-table .mono { font-variant-numeric: tabular-nums; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .dmod-table .strong { font-weight: 700; color: var(--neutral-900); }
  .dmod-muted { color: var(--neutral-400); font-style: italic; font-size: 0.7rem; }
  .dmod-empty { text-align: center; color: var(--neutral-400); padding: 48px 16px; }
  .dmod-empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .dmod-empty-icon { font-size: 1.8rem; }
  .dmod-cap { font-size: 0.72rem; color: var(--neutral-500); }

  /* ═══════════════ BADGES ═══════════════ */
  .dmod-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 0.66rem;
    font-weight: 800;
    border: 1px solid;
    white-space: nowrap;
    line-height: 1.2;
  }
  .dmod-badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
  }
  .dmod-badge.b-r { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
  .dmod-badge.b-n { background: #fffbeb; color: #b45309; border-color: #fde68a; }
  .dmod-badge.b-a { background: #fefce8; color: #a16207; border-color: #fde68a; }
  .dmod-badge.b-v { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
  .dmod-badge.b-g { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }
  .dmod-badge.b-b { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }

  /* ═══════════════ DETALLE RADICADO HERO & STATS ═══════════════ */
  .ddet-hero {
    background: linear-gradient(180deg, #f0f6ff 0%, #ffffff 88%);
    padding: 22px 28px 18px;
    border-bottom: 1px solid var(--border);
  }
  .ddet-head {
    display: flex;
    gap: 20px;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .ddet-head-main { min-width: 0; flex: 1 1 320px; }
  .ddet-eyebrow {
    font-size: 0.64rem;
    font-weight: 800;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--essa-primary);
  }
  .ddet-head h3 {
    margin: 3px 0 2px;
    font-size: 1.6rem;
    font-weight: 900;
    letter-spacing: -0.02em;
    color: var(--neutral-900);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .ddet-tramites {
    font-size: 0.78rem;
    color: var(--neutral-600);
    font-weight: 600;
  }
  .ddet-chips {
    display: flex;
    gap: 7px;
    flex-wrap: wrap;
    margin-top: 10px;
  }
  .ddet-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--neutral-600);
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 4px 11px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .ddet-chip--alert {
    color: #dc2626;
    border-color: #fecaca;
    background: #fef2f2;
    font-weight: 800;
  }
  .ddet-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
  }

  .ddet-reloj {
    min-width: 160px;
    text-align: center;
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px 20px;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
    flex-shrink: 0;
  }
  .ddet-reloj-n {
    font-size: 2.2rem;
    font-weight: 900;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .ddet-reloj-n.muted { color: var(--neutral-300); font-size: 1.5rem; }
  .ddet-reloj-u {
    font-size: 0.66rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--neutral-500);
    margin-top: 4px;
  }
  .ddet-reloj-f {
    font-size: 0.7rem;
    color: var(--neutral-500);
    margin-top: 5px;
  }

  .ddet-linea {
    margin-top: 16px;
    position: relative;
  }
  .ddet-bar {
    position: relative;
    height: 8px;
    border-radius: 999px;
    background: linear-gradient(90deg, #2e9e5b, #c9a100 55%, #f29d38 75%, #d93025);
    opacity: 0.85;
  }
  .ddet-bar i {
    position: absolute;
    inset: 0 auto 0 0;
    width: 0;
  }
  .ddet-mark {
    position: absolute;
    top: -4px;
    width: 16px;
    height: 16px;
    margin-left: -8px;
    border-radius: 999px;
    background: #ffffff;
    border: 3px solid var(--essa-primary);
    box-shadow: 0 1px 6px rgba(15, 23, 42, 0.28);
  }
  .ddet-legend {
    display: flex;
    justify-content: space-between;
    font-size: 0.66rem;
    color: var(--neutral-400);
    margin-top: 6px;
    font-weight: 600;
  }

  .ddet-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 1px;
    background: var(--neutral-100);
    border-bottom: 1px solid var(--border);
  }
  .ddet-stat {
    background: #ffffff;
    padding: 10px 18px;
  }
  .ddet-stat-l {
    font-size: 0.6rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--neutral-500);
  }
  .ddet-stat-v {
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--neutral-900);
    margin-top: 2px;
    font-variant-numeric: tabular-nums;
  }
  .ddet-stat-v.muted { color: var(--neutral-400); font-weight: 600; font-size: 0.78rem; }

  /* ═══════════════ DETALLE CUERPO (FICHA & PROCESOS) ═══════════════ */
  .ddet-cuerpo {
    display: grid;
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    gap: 0;
  }
  @media (max-width: 860px) {
    .ddet-cuerpo { grid-template-columns: minmax(0, 1fr); }
  }

  .ddet-ficha {
    padding: 18px 24px;
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 14px;
    background: #fafcff;
  }
  @media (max-width: 860px) {
    .ddet-ficha { border-right: none; border-bottom: 1px solid var(--border); }
  }
  .ddet-section-card {
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }
  .ddet-grupo {
    font-size: 0.64rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--essa-primary);
    margin: 0 0 8px;
  }
  .ddet-fila {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 0;
    border-bottom: 1px solid var(--neutral-100);
    font-size: 0.76rem;
  }
  .ddet-fila:last-child { border-bottom: none; }
  .ddet-k { color: var(--neutral-500); flex-shrink: 0; }
  .ddet-v { color: var(--neutral-900); font-weight: 600; text-align: right; }
  .ddet-v.muted { color: var(--neutral-400); font-weight: 400; }

  .ddet-procs {
    padding: 18px 24px;
    min-width: 0;
    background: #ffffff;
  }
  .ddet-procs-header {
    margin-bottom: 10px;
  }
  .ddet-sinproc {
    background: #f8fafc;
    border: 1px dashed var(--border);
    border-radius: 12px;
    padding: 16px 18px;
    font-size: 0.78rem;
    color: var(--neutral-600);
    line-height: 1.55;
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }
  .ddet-sinproc-icon {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    background: var(--neutral-200);
    color: var(--neutral-700);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    flex-shrink: 0;
  }
  .ddet-sinproc p { margin: 4px 0 0; color: var(--neutral-500); }

  .ddet-proc-lista {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .ddet-proc-lista--compact {
    max-height: 440px;
    overflow-y: auto;
    padding-right: 2px;
    gap: 8px;
  }
  .ddet-proc {
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px 16px;
    background: #ffffff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.03);
    transition: border-color 150ms ease;
  }
  .ddet-proc:hover { border-color: #cbd5e1; }
  .ddet-proc-head {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .ddet-proc-num {
    width: 22px;
    height: 22px;
    border-radius: 7px;
    background: var(--essa-primary);
    color: #ffffff;
    font-size: 0.7rem;
    font-weight: 800;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .ddet-pill {
    margin-left: auto;
    font-size: 0.66rem;
    font-weight: 800;
    border: 1px solid;
    border-radius: 999px;
    padding: 2px 10px;
    white-space: nowrap;
  }
  .ddet-proc-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 8px 14px;
    margin-top: 10px;
  }
  .ddet-proc-grid span {
    display: block;
    font-size: 0.6rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--neutral-400);
  }
  .ddet-proc-grid p {
    margin: 2px 0 0;
    font-size: 0.76rem;
    color: var(--neutral-900);
    font-weight: 600;
  }
  .ddet-wide { grid-column: 1 / -1; }
  .ddet-obs {
    margin-top: 10px;
    border-top: 1px solid var(--neutral-100);
    padding-top: 8px;
  }
  .ddet-obs span {
    display: block;
    font-size: 0.6rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--neutral-400);
  }
  .ddet-obs p {
    margin: 4px 0 0;
    font-size: 0.76rem;
    color: var(--neutral-800);
    line-height: 1.6;
  }
  .ddet-link {
    background: none;
    border: none;
    padding: 0;
    margin-top: 6px;
    color: var(--essa-primary);
    font-size: 0.72rem;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
  }
  .ddet-link:hover { text-decoration: underline; }

  .ddet-search {
    width: 100%;
    height: 36px;
    border-radius: 8px;
    border: 1px solid var(--border);
    padding: 0 12px;
    font-size: 0.78rem;
    font-family: inherit;
    margin: 0 0 10px;
    outline: none;
  }
  .ddet-search:focus {
    border-color: var(--essa-primary);
    box-shadow: 0 0 0 3px rgba(0, 75, 147, 0.12);
  }

  .ddet-proc--compact {
    padding: 10px 14px;
  }
  .ddet-proc-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    background: none;
    border: none;
    padding: 2px 0;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.8rem;
    text-align: left;
  }
  .ddet-proc-cuenta { color: var(--neutral-500); font-size: 0.74rem; }
  .ddet-chev { margin-left: auto; color: var(--neutral-400); font-weight: 800; }

  /* ═══════════════ MAILBOX ADJUSTMENT ═══════════════ */
  .dmail-box {
    margin: 14px 24px 4px;
    border: 1px solid #bfdbfe;
    background: #f0f7ff;
    border-radius: 14px;
    padding: 14px 18px;
  }
  .dmail-title {
    font-size: 0.8rem;
    font-weight: 800;
    color: #1e40af;
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 6px;
  }
  .dmail-icon { font-size: 1rem; }
  .dmail-text {
    font-size: 0.74rem;
    color: #334155;
    line-height: 1.55;
    margin: 0 0 10px;
  }
  .dmail-row {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  }
  .dmail-field {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 0.66rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #475569;
  }
  .dmail-field input {
    height: 36px;
    border-radius: 8px;
    border: 1px solid #cbd5e1;
    padding: 0 10px;
    font-size: 0.8rem;
    font-family: inherit;
    color: var(--neutral-900);
    outline: none;
    background: #ffffff;
  }
  .dmail-field input:focus {
    border-color: var(--essa-primary);
    box-shadow: 0 0 0 3px rgba(0, 75, 147, 0.15);
  }
  .dmail-apply {
    height: 36px;
    padding: 0 18px;
    border-radius: 999px;
    border: none;
    background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
    color: #ffffff;
    font-size: 0.76rem;
    font-weight: 800;
    font-family: inherit;
    cursor: pointer;
    box-shadow: 0 3px 10px rgba(37, 99, 235, 0.28);
    transition: transform 150ms ease;
  }
  .dmail-apply:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
  .dmail-apply:hover:not(:disabled) { transform: translateY(-1px); }
  .dmail-clear {
    height: 36px;
    padding: 0 16px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: #ffffff;
    color: var(--neutral-600);
    font-size: 0.74rem;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: all 150ms ease;
  }
  .dmail-clear:hover { border-color: var(--essa-primary); color: var(--essa-primary); }

  @media (prefers-reduced-motion: reduce) {
    .dmod-overlay, .dmod-box { animation: none; }
  }
`;

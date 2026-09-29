import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  formatDMY,
  medioInfo,
  esCorreoMedio,
  type EstadoV,
  type RadicadoGroup,
} from '@/utils/dashboardGroups';
import { formatDateToSpanish } from '@/utils/businessDays';
import { toIsoDate, parseIsoDate } from '@/utils/dashboardAjustes';
import { formatNotaFecha, notasDe, type NotaTrabajo } from '@/utils/dashboardNotas';

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
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={8} className="dmod-empty">
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
                    <td
                      className="mono"
                      title={
                        g.fVtoAuto
                          ? 'Calculada: 15 días hábiles después de la radicación'
                          : undefined
                      }
                    >
                      {formatDMY(g.fVtoEfe ?? g.fVto)}
                    </td>
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

/* ═══════════ Detalle del radicado: iconografía y pestañas ═══════════ */

type IcoName =
  | 'file'
  | 'cal'
  | 'tag'
  | 'user'
  | 'inbox'
  | 'clip'
  | 'shield'
  | 'clock'
  | 'share'
  | 'chat'
  | 'home'
  | 'edit'
  | 'alert'
  | 'bulb'
  | 'check'
  | 'arrow'
  | 'arrowr';

const ICO: Record<IcoName, string[]> = {
  file: [
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
    'M14 2v6h6',
    'M8 13h8',
    'M8 17h5',
  ],
  cal: [
    'M8 2v4',
    'M16 2v4',
    'M3 10h18',
    'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  ],
  tag: ['M20.59 13.41 12 22 2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z', 'M7 7h.01'],
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'],
  inbox: [
    'M22 12h-6l-2 3h-4l-2-3H2',
    'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
  ],
  clip: ['M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2', 'M9 2h6v4H9z'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 6v6l4 2'],
  share: [
    'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    'M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    'M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    'M8.59 13.51 15.42 17.49',
    'M15.41 6.51 8.59 10.49',
  ],
  chat: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  home: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  edit: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'],
  alert: [
    'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
    'M12 9v4',
    'M12 17h.01',
  ],
  bulb: ['M9 18h6', 'M10 22h4', 'M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z'],
  check: ['M20 6 9 17l-5-5'],
  arrow: ['M19 12H5', 'm12 19-7-7 7-7'],
  arrowr: ['M5 12h14', 'm12 5 7 7-7 7'],
};

/** Icono SVG ligero (trazo heredado) para las tarjetas y campos del detalle. */
function Ico({
  name,
  size = 16,
  w = 2,
}: {
  name: IcoName;
  size?: number;
  w?: number;
}): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICO[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** Pestañas del detalle: solo secciones con contenido real. */
const PESTANAS = [
  { id: 'resumen', label: 'Resumen', ico: 'home' },
  { id: 'procesos', label: 'Procesos asociados', ico: 'share' },
  { id: 'observaciones', label: 'Observaciones', ico: 'chat' },
] as const;

type DetTab = (typeof PESTANAS)[number]['id'];

/**
 * Ficha completa de un radicado: cabecera, cuerpo con scroll y pie.
 *
 * Es la misma pieza que usa `RadicadoDetailModal`; se exporta para que la
 * sección 04 (Trabajo diario) pueda mostrarla en un panel en línea debajo del
 * listado, sin abrir una ventana modal.
 */
export function RadicadoDetailContent({
  group,
  notas,
  onClose,
  onAplicarAjuste,
  onQuitarAjuste,
  onAbrirNotas,
}: {
  group: RadicadoGroup | null;
  /** Notas guardadas para este radicado. */
  notas?: NotaTrabajo[];
  onClose: () => void;
  onAplicarAjuste: (key: string, iso: string) => void;
  onQuitarAjuste: (key: string) => void;
  onAbrirNotas?: (radicado: string) => void;
}): JSX.Element | null {
  const [obsOpen, setObsOpen] = useState<number | null>(null);
  const [procQuery, setProcQuery] = useState('');
  const [expandedProc, setExpandedProc] = useState<number | null>(null);
  const [fechaInput, setFechaInput] = useState('');
  const [pestana, setPestana] = useState<DetTab>('resumen');
  const fechaRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setPestana('resumen');
  }, [group?.key]);

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
  }, [group?.key, group?.ajuste]);

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
  const notasRad = notasDe(notas ?? [], g.radicado);

  /** Tres tarjetas de observaciones, separadas por el archivo de origen. */
  const obsCards = [
    {
      id: 'mercurio',
      tono: 'mer',
      titulo: 'Observación Mercurio',
      vacio: 'Sin referencia de documento en Mercurio para este radicado.',
      icono: (
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
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      ),
      valores: g.obsMercurio ? [g.obsMercurio] : [],
    },
    {
      id: 'insumo',
      tono: 'sac',
      titulo: 'Observación del Insumo',
      vacio: 'Sin observación de revisión (insumo) en SAC.',
      icono: (
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
          <path d="M14 2v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h6" />
        </svg>
      ),
      valores: g.obsInsumo,
    },
    {
      id: 'decision',
      tono: 'dec',
      titulo: 'Observación de la Decisión',
      vacio: 'Sin observación de decisión en SAC.',
      icono: (
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
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="m9 11 3 3L22 4" />
        </svg>
      ),
      valores: g.obsDecision,
    },
  ];
  const pctDia = g.dia !== null ? Math.min(100, Math.max(0, (g.dia / 15) * 100)) : 0;
  const revTxt =
    g.nProc === 0
      ? 'No aplica · sin proceso en SAC'
      : conRev > 0
        ? `Sí · ${conRev} de ${g.nProc} proceso(s)`
        : 'No tiene revisión asignada';

  /** Campo apilado: icono + rótulo pequeño + valor (tarjetas de información). */
  const campo = (ico: IcoName, label: string, value: ReactNode, muted?: boolean): ReactNode => (
    <div className="ddet-campo">
      <span className="ddet-campo-ico">
        <Ico name={ico} size={14} />
      </span>
      <div className="ddet-campo-txt">
        <span className="ddet-campo-l">{label}</span>
        <div className={`ddet-campo-v${muted ? ' muted' : ''}`}>{value}</div>
      </div>
    </div>
  );
  const fila = (k: string, v: ReactNode, muted?: boolean): ReactNode => (
    <div className="ddet-fila">
      <span className="ddet-k">{k}</span>
      <span className={`ddet-v${muted ? ' muted' : ''}`}>{v}</span>
    </div>
  );
  /** Tarjeta de sección con encabezado: icono circular + título (+ badge o acción). */
  const scard = (
    titulo: string,
    icono: ReactNode,
    cuerpo: ReactNode,
    extra?: ReactNode
  ): ReactNode => (
    <section className="ddet-scard">
      <header className="ddet-scard-head">
        <span className="ddet-scard-ico">{icono}</span>
        <h4 className="ddet-scard-title">{titulo}</h4>
        {extra}
      </header>
      <div className="ddet-scard-body">{cuerpo}</div>
    </section>
  );

  /** Estado actual, traducido a un aviso con tono. */
  const diasAbs = g.restan === null ? 0 : Math.abs(g.restan);
  const alerta = g.vencida
    ? {
        tono: 'danger',
        titulo: 'Fuera de los 15 días',
        texto: 'El radicado se encuentra vencido según el tiempo establecido.',
      }
    : g.estadoV === 'Crítico'
      ? {
          tono: 'danger',
          titulo: 'Crítico',
          texto: `Quedan ${diasAbs} día(s) para el vencimiento. Conviene atenderlo antes de la fecha límite.`,
        }
      : g.estadoV === 'Próximo'
        ? {
            tono: 'warn',
            titulo: 'Próximo a vencer',
            texto: `Quedan ${diasAbs} día(s) para el vencimiento. Programe la gestión antes de la fecha límite.`,
          }
        : g.estadoV === 'En plazo'
          ? {
              tono: 'ok',
              titulo: 'En plazo',
              texto: 'El radicado se encuentra dentro del tiempo establecido para su gestión.',
            }
          : {
              tono: 'muted',
              titulo: 'Sin fecha de vencimiento',
              texto: 'No hay fecha de vencimiento registrada para calcular el tiempo de gestión.',
            };
  const consejo =
    g.vencida || g.estadoV === 'Crítico' ? (
      <>
        Este radicado se encuentra en <b>estado crítico</b>. Se recomienda gestionar la revisión y
        asignación de proceso lo antes posible.
      </>
    ) : g.estadoV === 'Próximo' ? (
      <>
        Este radicado está <b>próximo a vencer</b>. Se recomienda gestionar la revisión y asignación
        de proceso antes de la fecha límite.
      </>
    ) : g.estadoV === 'En plazo' ? (
      <>
        Este radicado se encuentra <b>en plazo</b>. Verifique el avance de la revisión antes de la
        fecha de vencimiento.
      </>
    ) : (
      <>
        Este radicado <b>no tiene fecha de vencimiento</b>. Verifique la fecha de radicación para
        poder calcular sus plazos.
      </>
    );

  return (
    <>
      {/* Cabecera superior fija con botón de cierre */}
      <div className="dmod-head">
        <button
          type="button"
          className="dmod-back"
          onClick={onClose}
          aria-label="Volver al listado"
          title="Volver al listado"
        >
          <Ico name="arrow" size={18} />
        </button>
        <div className="dmod-head-text">
          <h3>
            <span>Detalle del radicado</span>
            <span className={`dmod-badge ${ESTADO_BADGE[g.estadoV]}`}>
              <i className="dmod-badge-dot" style={{ background: ESTADO_COLOR[g.estadoV] }} />
              {g.estadoV}
            </span>
          </h3>
          <p>Radicado {g.radicado} · Ficha de trazabilidad y estado de los procesos en SAC</p>
        </div>
        <button
          type="button"
          className="dmod-close"
          onClick={onClose}
          aria-label="Cerrar detalle"
          title="Cerrar detalle (Esc)"
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
        {/* ── Cabecera del radicado + tarjeta de días restantes ── */}
        <div className="ddet-hero">
          <div className="ddet-herocard">
            <span className="ddet-head-ico">
              <Ico name="file" size={22} />
            </span>
            <div className="ddet-head-main">
              <div className="ddet-eyebrow">Radicado</div>
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
                {g.vencida && (
                  <span className="ddet-chip ddet-chip--alert">Fuera de los 15 días</span>
                )}
              </div>
            </div>
          </div>
          <div className="ddet-reloj">
            <div className="ddet-reloj-l">
              <Ico name="clock" size={13} />
              {g.restan !== null && g.restan < 0 ? 'Días vencidos' : 'Días restantes'}
            </div>
            {g.restan === null ? (
              <>
                <div className="ddet-reloj-n muted">—</div>
                <div className="ddet-reloj-u">Sin fecha de vencimiento</div>
              </>
            ) : (
              <>
                <div
                  className="ddet-reloj-n"
                  style={{ color: ESTADO_COLOR[g.estadoV] }}
                  data-testid="dash-detail-restan"
                >
                  {Math.abs(g.restan)}
                </div>
                {g.restan === 0 && <div className="ddet-reloj-u">vence hoy</div>}
                <div className="ddet-reloj-f" data-testid="dash-detail-vence">
                  Vence <b>{formatDMY(g.fVtoEfe ?? g.fVto)}</b>
                  {g.fVtoAuto && (
                    <span
                      className="muted"
                      title="Sin fecha en el origen: calculada con el plazo legal (15 días hábiles después de la radicación)"
                    >
                      {' '}
                      (calculada)
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Pestañas del detalle ── */}
        <div
          className="ddet-tabs"
          role="tablist"
          aria-label="Secciones del detalle"
          onKeyDown={(e) => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            const i = PESTANAS.findIndex((t) => t.id === pestana);
            const salto = e.key === 'ArrowRight' ? 1 : -1;
            e.preventDefault();
            setPestana(PESTANAS[(i + salto + PESTANAS.length) % PESTANAS.length].id);
          }}
        >
          {PESTANAS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`ddet-tab-${t.id}`}
              aria-selected={pestana === t.id}
              aria-controls={`ddet-cont-${t.id}`}
              tabIndex={pestana === t.id ? 0 : -1}
              className={`ddet-tab${pestana === t.id ? ' is-active' : ''}`}
              onClick={() => setPestana(t.id)}
              data-testid={`dash-detail-tab-${t.id}`}
            >
              <Ico name={t.ico} size={15} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── Pestaña: Resumen ── */}
        {pestana === 'resumen' && (
          <div
            className="ddet-tabpanel ddet-resumen"
            role="tabpanel"
            id="ddet-cont-resumen"
            aria-labelledby="ddet-tab-resumen"
            tabIndex={-1}
          >
            <div className="ddet-cols">
              {/* Columna 1 · información */}
              <div className="ddet-col">
                {scard(
                  'Información del radicado',
                  <Ico name="file" />,
                  <div className="ddet-fields">
                    {campo('file', 'Radicado', <span className="mono strong">{g.radicado}</span>)}
                    {campo(
                      'cal',
                      'F. radicación',
                      <>
                        {formatDMY(g.ajuste ?? g.fSol)}
                        {g.ajuste && (
                          <small className="ddet-campo-sub" title="Fecha oficial del sistema">
                            (sistema: {formatDMY(g.fSol)})
                          </small>
                        )}
                      </>
                    )}
                    {campo('tag', 'Tipo de trámite', g.tramites.join(' · '))}
                    {campo(
                      'cal',
                      'F. vencimiento',
                      g.fVto ? (
                        <>
                          {formatDMY(g.fVtoEfe ?? g.fVto)}
                          {g.ajuste && g.fVtoEfe && g.fVtoEfe.getTime() !== g.fVto.getTime() && (
                            <small
                              className="ddet-campo-sub"
                              title="Fecha oficial calculada por el sistema"
                            >
                              (sistema: {formatDMY(g.fVto)})
                            </small>
                          )}
                          {g.fVtoAuto && (
                            <span
                              className="dmod-badge b-a"
                              title="Sin fecha en el origen: calculada con el plazo legal (15 días hábiles después de la radicación)"
                              data-testid="dash-detail-vtocalc"
                            >
                              Calculada
                            </span>
                          )}
                          <span className={`dmod-badge ${ESTADO_BADGE[g.estadoV]}`}>
                            {g.estadoV}
                          </span>
                        </>
                      ) : (
                        'Sin fecha'
                      ),
                      !g.fVto
                    )}
                    {campo(
                      'user',
                      'Número de cuenta',
                      <>
                        {g.cuenta || '—'}
                        {g.nCuentas > 1 && (
                          <span className="dmod-badge b-b">{fmt(g.nCuentas)} cuentas</span>
                        )}
                      </>,
                      !g.cuenta
                    )}
                    {campo('inbox', 'Día en la bandeja', `Día ${g.dia ?? '—'} de 15`)}
                  </div>,
                  esCorreoMedio(medio.etiqueta) ? (
                    <button
                      type="button"
                      className="ddet-scard-edit"
                      onClick={() => {
                        fechaRef.current?.focus();
                        fechaRef.current?.scrollIntoView({ block: 'center' });
                      }}
                      data-testid="dash-detail-editar"
                    >
                      <Ico name="edit" size={13} />
                      Editar
                    </button>
                  ) : undefined
                )}

                {scard(
                  'Información del solicitante',
                  <Ico name="user" />,
                  <>
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
                    {fila('Estado en Mercurio', g.estadoMer || '—', !g.estadoMer)}
                  </>
                )}
              </div>

              {/* Columna 2 · procesos y plazos */}
              <div className="ddet-col">
                {scard(
                  'Procesos asociados',
                  <Ico name="share" />,
                  g.nProc === 0 ? (
                    <div className="ddet-sinproc">
                      <div className="ddet-sinproc-icon">ℹ</div>
                      <div>
                        <b>Este radicado no tiene proceso creado en SAC</b>
                        <p>
                          Por este motivo aún no se registran números de proceso asociados,
                          asignaciones de revisión ni observaciones en SAC.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="ddet-procmini-lista">
                      {g.procesos.slice(0, 3).map((p, i) => {
                        const est = revisionState(p.estadoRevision);
                        return (
                          <div className="ddet-procmini" key={`${p.numero}-${i}`}>
                            <span className="ddet-procmini-num">{i + 1}</span>
                            <div className="ddet-procmini-txt">
                              <b className="mono">{p.numero || 'Sin número'}</b>
                              <span>{p.tramite || '—'}</span>
                            </div>
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
                        );
                      })}
                      {g.nProc > 3 && (
                        <div className="ddet-procmini-mas">+ {g.nProc - 3} proceso(s) más</div>
                      )}
                      <button
                        type="button"
                        className="ddet-linkbtn"
                        onClick={() => setPestana('procesos')}
                        data-testid="dash-detail-verprocesos"
                      >
                        Ver los {fmt(g.nProc)} procesos <Ico name="arrowr" size={13} />
                      </button>
                    </div>
                  ),
                  <span className="ddet-scard-badge">{fmt(g.nProc)}</span>
                )}

                {scard(
                  'Tiempos y plazos',
                  <Ico name="clock" />,
                  <>
                    <div className="ddet-mini-row">
                      <div className="ddet-mini">
                        <span className="ddet-mini-ico">
                          <Ico name="cal" size={15} />
                        </span>
                        <div>
                          <span className="ddet-mini-l">F. radicación</span>
                          <div className="ddet-mini-v">{formatDMY(g.ajuste ?? g.fSol)}</div>
                        </div>
                      </div>
                      <div className="ddet-mini">
                        <span className="ddet-mini-ico">
                          <Ico name="cal" size={15} />
                        </span>
                        <div>
                          <span className="ddet-mini-l">F. vencimiento</span>
                          <div className="ddet-mini-v">
                            {g.fVto ? formatDMY(g.fVtoEfe ?? g.fVto) : 'Sin fecha'}
                            {g.fVtoAuto && (
                              <span className="dmod-badge b-a" title="Calculada por el sistema">
                                Calculada
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {fila('Día en la bandeja', `Día ${g.dia ?? '—'} de 15`)}
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
                  </>
                )}
              </div>

              {/* Columna 3 · estado y resumen */}
              <div className="ddet-col">
                {scard(
                  'Estado actual',
                  <Ico name="shield" />,
                  <div className={`ddet-alert ddet-alert--${alerta.tono}`}>
                    <span className="ddet-alert-ico">
                      <Ico name={alerta.tono === 'ok' ? 'check' : 'alert'} size={16} />
                    </span>
                    <div>
                      <b>{alerta.titulo}</b>
                      <p>{alerta.texto}</p>
                    </div>
                  </div>
                )}

                {scard(
                  'Resumen',
                  <Ico name="check" />,
                  <>
                    {fila('Trámite', g.tramites.join(' · '))}
                    {fila('Radicado', <span className="mono">{g.radicado}</span>)}
                    {fila('Fecha de radicación', formatDMY(g.ajuste ?? g.fSol))}
                    {fila(
                      'Fecha de vencimiento',
                      g.fVto ? formatDMY(g.fVtoEfe ?? g.fVto) : 'Sin fecha',
                      !g.fVto
                    )}
                    {fila(
                      'Días transcurridos',
                      <span
                        style={{
                          color: g.vencida ? '#dc2626' : undefined,
                          fontWeight: 800,
                        }}
                      >
                        {g.dia ?? '—'} de 15
                      </span>
                    )}
                    {fila('Estado en Mercurio', g.estadoMer || '—', !g.estadoMer)}
                  </>
                )}

                <div className="ddet-tip">
                  <span className="ddet-tip-ico">
                    <Ico name="bulb" size={16} />
                  </span>
                  <p>{consejo}</p>
                </div>
              </div>
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
                  registra la fecha real para contar los días desde ahí: la fecha de vencimiento y
                  los días restantes se recalculan con ella. El ajuste queda guardado en este
                  equipo.
                </p>
                <div className="dmail-row">
                  <label className="dmail-field">
                    <span>Fecha de recepción</span>
                    <input
                      type="date"
                      ref={fechaRef}
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

            {/* ── Notas y observaciones del trabajo diario ── */}
            <div className="ddet-notas" data-testid="dash-detail-notas">
              <div className="ddet-notas-head">
                <span className="ddet-notas-title">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                  Notas y observaciones
                </span>
                {onAbrirNotas && (
                  <button
                    type="button"
                    className="ddet-notas-btn"
                    onClick={() => onAbrirNotas(g.radicado)}
                    data-testid="dash-detail-notas-edit"
                  >
                    {notasRad.length > 0 ? 'Editar / añadir' : 'Añadir nota'}
                  </button>
                )}
              </div>
              {notasRad.length === 0 ? (
                <p className="ddet-notas-empty" data-testid="dash-detail-notas-empty">
                  Sin notas para este radicado. Registra una observación o información adicional del
                  trabajo diario.
                </p>
              ) : (
                <ul className="ddet-notas-list">
                  {notasRad.map((n) => (
                    <li key={n.id} data-testid={`dash-detail-nota-${n.id}`}>
                      <span className="ddet-notas-fecha">{formatNotaFecha(n.actualizadaEn)}</span>
                      <p>{n.texto}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ── Pestaña: procesos asociados ── */}
        {pestana === 'procesos' && (
          <div
            className="ddet-tabpanel"
            role="tabpanel"
            id="ddet-cont-procesos"
            aria-labelledby="ddet-tab-procesos"
            tabIndex={-1}
          >
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
        )}

        {/* ── Pestaña: observaciones ── */}
        {pestana === 'observaciones' && (
          <div
            className="ddet-tabpanel"
            role="tabpanel"
            id="ddet-cont-observaciones"
            aria-labelledby="ddet-tab-observaciones"
            tabIndex={-1}
          >
            {/* ── Observaciones por origen (Mercurio / SAC) ── */}
            <div className="ddet-srcobs" data-testid="dash-detail-obs">
              <div className="ddet-obs-head">
                <span className="ddet-obs-title">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Observaciones
                </span>
                <span className="ddet-obs-sub">
                  Según el archivo de donde proviene cada texto
                  {g.nProc > 0 && ` · ${conObs} de ${g.nProc} proceso(s) con observación en SAC`}
                </span>
              </div>

              <div className="ddet-obs-grid">
                {obsCards.map((c) => {
                  const vacia = c.valores.length === 0;
                  return (
                    <article
                      key={c.id}
                      className={`ddet-obs-card ddet-obs-card--${c.tono}${vacia ? ' is-empty' : ''}`}
                      data-testid={`dash-detail-obs-${c.id}`}
                    >
                      <header className="ddet-obs-card-head">
                        <span className="ddet-obs-ico" aria-hidden="true">
                          {c.icono}
                        </span>
                        <div className="ddet-obs-card-titles">
                          <b>{c.titulo}</b>
                        </div>
                        {!vacia && c.valores.length > 1 && (
                          <span className="ddet-obs-n">{c.valores.length}</span>
                        )}
                      </header>
                      {vacia ? (
                        <p className="ddet-obs-vacio" data-testid={`dash-detail-obs-${c.id}-empty`}>
                          {c.vacio}
                        </p>
                      ) : (
                        <div className="ddet-obs-cuerpo">
                          {c.valores.map((t, i) => (
                            <p className="ddet-obs-txt" key={`${c.id}-${i}`}>
                              {t}
                            </p>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        )}
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
    </>
  );
}

/**
 * Ventana modal con la ficha del radicado (usada desde «Vencidas» y desde el
 * listado del análisis). En el trabajo diario la misma ficha se muestra en un
 * panel en línea: ver `RadicadoDetailContent`.
 */
export function RadicadoDetailModal({
  group,
  notas,
  onClose,
  onAplicarAjuste,
  onQuitarAjuste,
  onAbrirNotas,
}: {
  group: RadicadoGroup | null;
  /** Notas guardadas para este radicado. */
  notas?: NotaTrabajo[];
  onClose: () => void;
  onAplicarAjuste: (key: string, iso: string) => void;
  onQuitarAjuste: (key: string) => void;
  onAbrirNotas?: (radicado: string) => void;
}): JSX.Element | null {
  useModalBehavior(group !== null);
  if (!group) return null;
  const nombre = group.radicado;
  return (
    <div
      className="dmod-overlay"
      data-testid="dash-detail-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle del radicado ${nombre}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{modalStyles}</style>
      <div className="dmod-box dmod-box--detail">
        <RadicadoDetailContent
          group={group}
          notas={notas}
          onClose={onClose}
          onAplicarAjuste={onAplicarAjuste}
          onQuitarAjuste={onQuitarAjuste}
          onAbrirNotas={onAbrirNotas}
        />
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
  .dmod-box--detail { max-width: 1240px; }

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
  .dmod-head-text { min-width: 0; flex: 1 1 auto; }
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
  .dmod-back {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: #ffffff;
    color: var(--neutral-700);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 180ms ease, border-color 180ms ease, color 180ms ease;
  }
  .dmod-back:hover {
    background: #eff6ff;
    border-color: #bfdbfe;
    color: var(--essa-primary);
  }
  .dmod-back:focus-visible {
    outline: 2px solid var(--essa-primary);
    outline-offset: 2px;
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

  /* ═══════════════ DETALLE: CABECERA, PESTAÑAS Y TARJETAS ═══════════════ */
  .ddet-hero {
    display: flex;
    gap: 14px;
    align-items: stretch;
    flex-wrap: wrap;
    padding: 18px 24px 0;
  }
  .ddet-herocard {
    flex: 1 1 340px;
    min-width: 0;
    display: flex;
    gap: 16px;
    align-items: flex-start;
    background: linear-gradient(180deg, #f0f6ff 0%, #ffffff 88%);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 16px 18px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  }
  .ddet-head-ico {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: var(--essa-primary);
    color: #ffffff;
    display: grid;
    place-items: center;
    box-shadow: 0 6px 16px rgba(0, 75, 147, 0.25);
  }
  .ddet-head-main { min-width: 0; flex: 1 1 auto; }
  .ddet-eyebrow {
    font-size: 0.64rem;
    font-weight: 800;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--essa-primary);
  }
  .ddet-head-main h3 {
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
    flex: 0 1 210px;
    min-width: 170px;
    text-align: center;
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 12px 16px;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .ddet-reloj-l {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 0.6rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--neutral-500);
    margin-bottom: 6px;
  }
  .ddet-reloj-l svg { color: var(--essa-primary); }
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

  /* ── Pestañas ── */
  .ddet-tabs {
    display: flex;
    gap: 2px;
    padding: 6px 24px 0;
    margin-top: 16px;
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
    background: #ffffff;
  }
  .ddet-tab {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: none;
    background: transparent;
    padding: 10px 14px;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--neutral-500);
    border-bottom: 2px solid transparent;
    cursor: pointer;
    white-space: nowrap;
  }
  .ddet-tab:hover { color: var(--essa-primary); background: #f6faff; }
  .ddet-tab.is-active {
    color: var(--essa-primary);
    border-bottom-color: var(--essa-primary);
  }
  .ddet-tab:focus-visible {
    outline: 2px solid var(--essa-primary);
    outline-offset: -3px;
    border-radius: 6px;
  }

  /* ── Paneles de pestaña ── */
  .ddet-tabpanel { padding: 18px 24px 4px; }
  .ddet-resumen { display: flex; flex-direction: column; gap: 16px; }
  .ddet-cols {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    align-items: start;
  }
  @media (max-width: 1080px) {
    .ddet-cols { grid-template-columns: minmax(0, 1fr); }
  }
  .ddet-col {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }

  /* ── Tarjetas de sección ── */
  .ddet-scard {
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 14px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    overflow: hidden;
    min-width: 0;
  }
  .ddet-scard-head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--neutral-100);
  }
  .ddet-scard-ico {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border-radius: 999px;
    background: var(--essa-primary);
    color: #ffffff;
    display: grid;
    place-items: center;
  }
  .ddet-scard-title {
    margin: 0;
    flex: 1 1 auto;
    min-width: 0;
    font-size: 0.88rem;
    font-weight: 800;
    color: var(--neutral-900);
    letter-spacing: -0.01em;
  }
  .ddet-scard-badge {
    flex-shrink: 0;
    font-size: 0.7rem;
    font-weight: 800;
    color: var(--essa-primary);
    background: #eef6ff;
    border: 1px solid #cfe3fb;
    border-radius: 999px;
    padding: 2px 9px;
    font-variant-numeric: tabular-nums;
  }
  .ddet-scard-edit {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 1px solid #bfdbfe;
    background: #eff6ff;
    color: #1d4ed8;
    font-size: 0.7rem;
    font-weight: 800;
    border-radius: 999px;
    padding: 4px 10px;
    cursor: pointer;
    flex-shrink: 0;
  }
  .ddet-scard-edit:hover { background: #dbeafe; }
  .ddet-scard-body { padding: 4px 14px 12px; }

  /* ── Campos apilados (icono + rótulo + valor) ── */
  .ddet-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 16px;
  }
  .ddet-campo {
    display: flex;
    gap: 9px;
    align-items: flex-start;
    padding: 9px 0;
    border-bottom: 1px solid var(--neutral-100);
    min-width: 0;
  }
  .ddet-fields > .ddet-campo:nth-last-child(-n + 2) { border-bottom: none; }
  .ddet-campo-ico {
    color: var(--essa-primary);
    opacity: 0.7;
    margin-top: 3px;
    flex-shrink: 0;
  }
  .ddet-campo-txt { min-width: 0; }
  .ddet-campo-l {
    display: block;
    font-size: 0.64rem;
    font-weight: 800;
    color: var(--neutral-500);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .ddet-campo-v {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-top: 3px;
    font-size: 0.84rem;
    font-weight: 700;
    color: var(--neutral-900);
    word-break: break-word;
  }
  .ddet-campo-v.muted { color: var(--neutral-400); font-weight: 500; }
  .ddet-campo-sub { color: var(--neutral-400); font-weight: 600; font-size: 0.7rem; }

  /* ── Mini tarjetas de fechas ── */
  .ddet-mini-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
    margin-top: 8px;
  }
  .ddet-mini {
    display: flex;
    gap: 9px;
    align-items: center;
    background: #f8fafc;
    border: 1px solid var(--neutral-100);
    border-radius: 10px;
    padding: 8px 10px;
    min-width: 0;
  }
  .ddet-mini-ico {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border-radius: 8px;
    background: #eef6ff;
    color: var(--essa-primary);
    display: grid;
    place-items: center;
  }
  .ddet-mini-l {
    display: block;
    font-size: 0.6rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--neutral-500);
  }
  .ddet-mini-v {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-top: 3px;
    font-size: 0.84rem;
    font-weight: 800;
    color: var(--neutral-900);
    overflow-wrap: anywhere;
  }

  /* ── Estado actual, consejo y procesos resumidos ── */
  .ddet-alert {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    border: 1px solid;
    border-radius: 12px;
    padding: 12px 14px;
    margin-top: 8px;
  }
  .ddet-alert-ico { flex-shrink: 0; margin-top: 1px; }
  .ddet-alert b { display: block; font-size: 0.85rem; font-weight: 900; }
  .ddet-alert p {
    margin: 3px 0 0;
    font-size: 0.78rem;
    line-height: 1.5;
    color: var(--neutral-600);
  }
  .ddet-alert--danger { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
  .ddet-alert--warn { background: #fffbeb; border-color: #fde68a; color: #b45309; }
  .ddet-alert--ok { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
  .ddet-alert--muted { background: #f8fafc; border-color: var(--border); color: var(--neutral-600); }

  .ddet-tip {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 12px;
    padding: 12px 14px;
  }
  .ddet-tip-ico { color: #1d4ed8; flex-shrink: 0; margin-top: 1px; }
  .ddet-tip p { margin: 0; font-size: 0.78rem; line-height: 1.55; color: #1e3a8a; }
  .ddet-tip b { color: #1d4ed8; }

  .ddet-procmini-lista {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
  }
  .ddet-procmini {
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid var(--neutral-100);
    background: #f8fafc;
    border-radius: 10px;
    padding: 8px 10px;
    min-width: 0;
  }
  .ddet-procmini-num {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    border-radius: 999px;
    background: var(--essa-primary);
    color: #ffffff;
    font-size: 0.66rem;
    font-weight: 800;
    display: grid;
    place-items: center;
  }
  .ddet-procmini-txt {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .ddet-procmini-txt b { font-size: 0.79rem; color: var(--neutral-900); }
  .ddet-procmini-txt span {
    font-size: 0.71rem;
    color: var(--neutral-500);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ddet-procmini-mas {
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--neutral-500);
    text-align: center;
  }
  .ddet-linkbtn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    border: 1px dashed #bfdbfe;
    background: #f8fbff;
    color: var(--essa-primary);
    font-size: 0.76rem;
    font-weight: 800;
    border-radius: 10px;
    padding: 8px 10px;
    cursor: pointer;
  }
  .ddet-linkbtn:hover { background: #eff6ff; }

  /* ═══════════════ NOTAS EN EL DETALLE ═══════════════ */
  .ddet-notas {
    margin: 0;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: #ffffff;
    padding: 14px 16px;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  }
  .ddet-notas-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }
  .ddet-notas-title {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--neutral-500);
  }
  .ddet-notas-title svg { color: var(--essa-primary); }
  .ddet-notas-btn {
    display: inline-flex;
    align-items: center;
    height: 28px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid var(--essa-primary-100);
    background: var(--essa-primary-50);
    color: var(--essa-primary);
    font-size: 0.7rem;
    font-weight: 700;
    font-family: inherit;
    white-space: nowrap;
    cursor: pointer;
    transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
  }
  .ddet-notas-btn:hover { background: var(--essa-primary); border-color: var(--essa-primary); color: #ffffff; }
  .ddet-notas-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(0, 75, 147, 0.25); }
  .ddet-notas-empty { margin: 10px 0 0; font-size: 0.76rem; line-height: 1.55; color: var(--neutral-500); }
  .ddet-notas-list { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .ddet-notas-list li {
    border-left: 3px solid var(--essa-primary-100);
    background: var(--bg-muted);
    border-radius: 0 8px 8px 0;
    padding: 8px 12px;
  }
  .ddet-notas-fecha { font-size: 0.64rem; font-weight: 700; color: var(--neutral-400); font-variant-numeric: tabular-nums; }
  .ddet-notas-list p {
    margin: 4px 0 0;
    font-size: 0.8rem;
    line-height: 1.55;
    color: var(--neutral-700);
    white-space: pre-line;
    overflow-wrap: anywhere;
  }

  /* ═══════════════ DETALLE: TARJETAS Y FILAS ═══════════════ */
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
    padding: 0;
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
    margin: 0;
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

  /* ═══════════════ OBSERVACIONES POR ORIGEN (DETALLE) ═══════════════
     Contenedor ddet-srcobs (no ddet-obs: esa clase ya existe para la
     observación individual de cada proceso). */
  .ddet-srcobs {
    padding: 0;
    border-top: none;
  }
  .ddet-obs-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }
  .ddet-obs-title {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--neutral-500);
  }
  .ddet-obs-title svg { color: var(--essa-primary); }
  .ddet-obs-sub { font-size: 0.7rem; font-weight: 600; color: var(--neutral-400); }
  .ddet-obs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 12px;
  }
  .ddet-obs-card {
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px 14px 14px 15px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
    overflow: hidden;
  }
  .ddet-obs-card::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 3px;
    background: var(--obs);
  }
  .ddet-obs-card--mer { --obs: #7b61d8; --obs-soft: rgba(123, 97, 216, 0.12); --obs-ink: #5f49b8; }
  .ddet-obs-card--sac { --obs: #1565d8; --obs-soft: rgba(21, 101, 216, 0.12); --obs-ink: #1154b7; }
  .ddet-obs-card--dec { --obs: #0d9488; --obs-soft: rgba(13, 148, 136, 0.12); --obs-ink: #0b7c72; }
  .ddet-obs-card.is-empty { background: #fbfcfe; }
  .ddet-obs-card-head { display: flex; align-items: center; gap: 10px; }
  .ddet-obs-ico {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 9px;
    background: var(--obs-soft);
    color: var(--obs-ink);
  }
  .ddet-obs-card-titles { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .ddet-obs-card-titles b { font-size: 0.83rem; font-weight: 800; color: var(--neutral-900); }
  .ddet-obs-n {
    margin-left: auto;
    flex: none;
    font-size: 0.62rem;
    font-weight: 800;
    color: var(--obs-ink);
    background: var(--obs-soft);
    border-radius: 999px;
    padding: 2px 8px;
    font-variant-numeric: tabular-nums;
  }
  .ddet-obs-cuerpo {
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 300px;
    overflow-y: auto;
    scrollbar-width: thin;
    overscroll-behavior: contain;
  }
  .ddet-obs-txt {
    margin: 0;
    font-size: 0.8rem;
    line-height: 1.6;
    color: var(--neutral-700);
    background: var(--bg-muted);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 10px;
    white-space: pre-line;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .ddet-obs-vacio {
    margin: 10px 0 0;
    font-size: 0.75rem;
    line-height: 1.55;
    color: var(--neutral-400);
    font-style: italic;
  }

  @media (prefers-reduced-motion: reduce) {
    .dmod-overlay, .dmod-box { animation: none; }
  }
`;

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useDataStore } from '@/store/dataStore';
import { useExcelStore } from '@/store/excelStore';
import { useNavigationStore } from '@/store/navigationStore';
import { useProfileStore } from '@/store/profileStore';
import {
  CRITICO_DIAS,
  DIAS_HABILES,
  DIAS_VENTANA,
  PROXIMO_DIAS,
  applyGroupFilters,
  buildBusinessWindow,
  canonNombre,
  computeGrupoKpis,
  estadoCounts,
  formatDMY,
  fuzzyMatchResponsable,
  groupFilterOptions,
  groupRadicados,
  isAtencionClientes,
  matrizRiesgo,
  medioInfo,
  perDiaCounts,
  rankResponsables,
  rankTramites,
  vencidasList,
  DEFAULT_GROUP_FILTERS,
  type EstadoV,
  type GroupFilters,
  type RadicadoGroup,
} from '@/utils/dashboardGroups';
import { loadAjustes, saveAjuste, removeAjuste } from '@/utils/dashboardAjustes';
import {
  deleteNota,
  loadNotas,
  upsertNota,
  type NotaInput,
  type NotaTrabajo,
} from '@/utils/dashboardNotas';
import {
  RadicadoDetailModal,
  RadicadoListModal,
  modalStyles,
} from '@/components/features/DashboardModals';
import { NotasTrabajoModal } from '@/components/features/NotasTrabajoModal';

const C_VERDE = '#2e9e5b';
const C_VIOLETA = '#7b61d8';
const C_ROJO = '#d93025';
const C_AZUL = '#1565d8';
const C_AMARILLO = '#c9a100';
const C_GRIS = '#7d8ba1';

const ESTADO_COLOR: Record<EstadoV, string> = {
  Vencido: C_ROJO,
  Crítico: '#f29d38',
  Próximo: C_AMARILLO,
  'En plazo': C_VERDE,
  'Sin fecha': C_GRIS,
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

function hexLerp(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa
    .map((v, i) =>
      Math.round(v + (pb[i]! - v) * t)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
}

/** Color por posición en el ranking de carga (verde el menor, rojo el mayor). */
function rankColor(value: number, values: number[]): string {
  const uniq = [...new Set(values)].sort((a, b) => a - b);
  if (uniq.length <= 1) return C_AZUL;
  const idx = uniq.indexOf(value);
  const t = idx / (uniq.length - 1);
  const stops = ['#2e9e5b', '#7bc043', '#f7c600', '#f29d38', '#d93025'];
  const pos = t * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(pos));
  return hexLerp(stops[i]!, stops[i + 1]!, pos - i);
}

function weekdayShort(d: Date): string {
  const days = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  return days[d.getDay()] ?? '';
}

function ddmm(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

interface ListState {
  titulo: string;
  sub: string;
  regs: RadicadoGroup[];
}

/* ═══════════ Encabezado de sección numerada ═══════════ */
function SectionHead({
  num,
  title,
  desc,
  action,
}: {
  num: string;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="dash-sec-head">
      <div>
        <div className="dash-sec-num">{num}</div>
        <h3 className="dash-sec-title">{title}</h3>
        {desc && <p className="dash-sec-desc">{desc}</p>}
      </div>
      {action && <div className="dash-sec-action">{action}</div>}
    </div>
  );
}

/* ═══════════ Modal de análisis (semáforo, responsables, trámites, matriz) ═══════════ */
function AnalysisModal({
  open,
  groups,
  sub,
  onClose,
  onPickResponsable,
  onOpenList,
}: {
  open: boolean;
  groups: RadicadoGroup[];
  sub: string;
  onClose: () => void;
  onPickResponsable: (name: string) => void;
  onOpenList: (titulo: string, regs: RadicadoGroup[]) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  if (!open) return null;

  const total = groups.length;
  const enRiesgo = groups.filter((g) => g.estadoV === 'Vencido' || g.estadoV === 'Crítico');
  const sinProc = groups.filter((g) => g.nProc === 0);
  const nResp = new Set(groups.map((g) => g.responsable)).size;
  const nTram = new Set(groups.flatMap((g) => g.tramites)).size;
  const pct = (n: number): number => (total > 0 ? Math.round((n / total) * 100) : 0);

  const counts = estadoCounts(groups);
  const R = 70;
  const C = 2 * Math.PI * R;
  let acc = 0;
  const RESPONSABLES = rankResponsables(groups);
  const TRAMITES = rankTramites(groups);
  const MATRIZ = matrizRiesgo(groups);
  const maxRank = Math.max(RESPONSABLES[0]?.value ?? 1, TRAMITES[0]?.value ?? 1);

  const rankRow = (
    key: string,
    name: string,
    value: number,
    i: number,
    onClick: () => void,
    testid: string
  ): ReactNode => (
    <button
      key={key}
      type="button"
      className="dash-rank-it"
      style={{ animationDelay: `${i * 45}ms` }}
      title={name}
      onClick={onClick}
      data-testid={testid}
    >
      <span className="dash-rank-top">
        <span className="dash-rank-name">{name}</span>
        <b>{fmt(value)}</b>
      </span>
      <span className="dash-rank-track">
        <i style={{ width: `${Math.max(4, Math.round((value / maxRank) * 100))}%` }} />
      </span>
    </button>
  );

  return (
    <div
      className="dmod-overlay"
      data-testid="dash-analysis-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Analítica de la bandeja"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{modalStyles}</style>
      <div className="dmod-box dmod-box--anal">
        <div className="dmod-head">
          <div className="dash-anal-head-left">
            <span className="dash-anal-hero-icon" aria-hidden="true">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
            <div className="dmod-head-text">
              <div className="ddet-eyebrow">Analítica de la bandeja</div>
              <h3
                style={{
                  margin: '2px 0 1px',
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  color: 'var(--neutral-900)',
                }}
              >
                Dónde está concentrada la carga
              </h3>
              <p data-testid="dash-analysis-sub">{sub}</p>
            </div>
          </div>
          <button
            type="button"
            className="dmod-close"
            onClick={onClose}
            aria-label="Cerrar ventana"
            title="Cerrar análisis (Esc)"
            data-testid="dash-analysis-close"
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

        <div className="dmod-scroll dash-anal-scroll">
          <div className="dash-anal-body">
            <div className="dash-anal-top">
              {[
                {
                  l: 'Radicados',
                  v: fmt(total),
                  h: 'Con los filtros activos',
                  c: C_AZUL,
                  regs: groups,
                },
                {
                  l: 'En riesgo',
                  v: `${fmt(enRiesgo.length)} · ${pct(enRiesgo.length)}%`,
                  h: 'Vencidos o críticos',
                  c: C_ROJO,
                  regs: enRiesgo,
                },
                {
                  l: 'Sin proceso en SAC',
                  v: `${fmt(sinProc.length)} · ${pct(sinProc.length)}%`,
                  h: 'Requieren creación',
                  c: '#b9721a',
                  regs: sinProc,
                },
                {
                  l: 'Responsables',
                  v: fmt(nResp),
                  h: 'Bandejas con carga',
                  c: C_VIOLETA,
                  regs: null,
                },
                {
                  l: 'Tipos de trámite',
                  v: fmt(nTram),
                  h: 'Distintos en el periodo',
                  c: C_VERDE,
                  regs: null,
                },
              ].map((t) =>
                t.regs ? (
                  <button
                    key={t.l}
                    type="button"
                    className="dash-anal-stat"
                    style={{ ['--ac' as string]: t.c }}
                    onClick={() => onOpenList(t.l, t.regs!)}
                    data-testid={`dash-anal-stat-${t.l}`}
                  >
                    <span className="l">{t.l}</span>
                    <span className="v">{t.v}</span>
                    <span className="h">{t.h}</span>
                  </button>
                ) : (
                  <div
                    key={t.l}
                    className="dash-anal-stat dash-anal-stat--static"
                    style={{ ['--ac' as string]: t.c }}
                  >
                    <span className="l">{t.l}</span>
                    <span className="v">{t.v}</span>
                    <span className="h">{t.h}</span>
                  </div>
                )
              )}
            </div>
            <div className="dash-anal-grid">
              <div className="dash-anal-card">
                <h4>Semáforo de vencimiento</h4>
                <span className="hint">Clic en un segmento para ver el listado</span>
                <div className="dash-donut-wrap">
                  <svg
                    viewBox="0 0 200 200"
                    className="dash-donut"
                    role="img"
                    aria-label="Semáforo"
                    data-testid="dash-anal-donut"
                  >
                    <circle cx={100} cy={100} r={R} fill="none" stroke="#eef2f7" strokeWidth={26} />
                    {counts.map((d) => {
                      if (total === 0 || d.value === 0) return null;
                      const frac = d.value / total;
                      const el = (
                        <g key={d.estado}>
                          <title>{`${d.estado}: ${d.value}`}</title>
                          <circle
                            cx={100}
                            cy={100}
                            r={R}
                            fill="none"
                            stroke={ESTADO_COLOR[d.estado]}
                            strokeWidth={26}
                            strokeDasharray={`${(frac * C).toFixed(1)} ${C.toFixed(1)}`}
                            strokeDashoffset={(-acc * C).toFixed(1)}
                            transform="rotate(-90 100 100)"
                            style={{ cursor: 'pointer' }}
                            onClick={() =>
                              onOpenList(
                                `Semáforo: ${d.estado}`,
                                groups.filter((g) => g.estadoV === d.estado)
                              )
                            }
                          />
                        </g>
                      );
                      acc += frac;
                      return el;
                    })}
                    <text x={100} y={98} textAnchor="middle" className="dash-donut-num">
                      {fmt(total)}
                    </text>
                    <text x={100} y={118} textAnchor="middle" className="dash-donut-lab">
                      radicados
                    </text>
                  </svg>
                  <ul className="dash-legend">
                    {counts
                      .filter((d) => d.value > 0)
                      .map((d) => (
                        <li key={d.estado}>
                          <button
                            type="button"
                            className="dash-legend-btn"
                            onClick={() =>
                              onOpenList(
                                `Semáforo: ${d.estado}`,
                                groups.filter((g) => g.estadoV === d.estado)
                              )
                            }
                          >
                            <span
                              className="dash-dot"
                              style={{ background: ESTADO_COLOR[d.estado] }}
                            />
                            <span className="dash-legend-name">{d.estado}</span>
                            <strong>
                              {fmt(d.value)} · {pct(d.value)}%
                            </strong>
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
                <div className="dash-stackbar" data-testid="dash-anal-stackbar">
                  {counts
                    .filter((d) => d.value > 0)
                    .map((d) => (
                      <i
                        key={d.estado}
                        style={{
                          width: `${total > 0 ? (d.value / total) * 100 : 0}%`,
                          background: ESTADO_COLOR[d.estado],
                        }}
                        title={`${d.estado}: ${fmt(d.value)} (${pct(d.value)}%)`}
                        onClick={() =>
                          onOpenList(
                            `Semáforo: ${d.estado}`,
                            groups.filter((g) => g.estadoV === d.estado)
                          )
                        }
                      />
                    ))}
                </div>
              </div>
              <div className="dash-anal-card">
                <h4>Carga por responsable</h4>
                <span className="hint">Clic para filtrar el tablero</span>
                <div className="dash-rank" data-testid="dash-anal-rank-resp">
                  {RESPONSABLES.length === 0 && <span className="dash-vacio">Sin datos.</span>}
                  {RESPONSABLES.map((r, i) =>
                    rankRow(
                      r.name,
                      r.name,
                      r.value,
                      i,
                      () => onPickResponsable(r.name),
                      `dash-anal-resp-${i}`
                    )
                  )}
                </div>
              </div>
              <div className="dash-anal-card">
                <h4>Trámites más frecuentes</h4>
                <span className="hint">Clic para ver sus radicados</span>
                <div className="dash-rank" data-testid="dash-anal-rank-tram">
                  {TRAMITES.length === 0 && <span className="dash-vacio">Sin datos.</span>}
                  {TRAMITES.map((t, i) =>
                    rankRow(
                      t.name,
                      t.name,
                      t.value,
                      i,
                      () =>
                        onOpenList(
                          `Trámite: ${t.name}`,
                          groups.filter((g) => g.tramites.includes(t.name))
                        ),
                      `dash-anal-tram-${i}`
                    )
                  )}
                </div>
              </div>
              <div className="dash-anal-card dash-anal-card--wide">
                <h4>Riesgo por responsable</h4>
                <span className="hint">Distribución del semáforo dentro de cada bandeja</span>
                <div className="dash-matriz" data-testid="dash-anal-matriz">
                  {MATRIZ.length === 0 && <span className="dash-vacio">Sin datos.</span>}
                  {MATRIZ.map((m) => (
                    <div className="dash-mfila" key={m.name}>
                      <span className="dash-mnom" title={m.name}>
                        {m.name}
                      </span>
                      <span className="dash-mbarras">
                        {m.segmentos.map((s) => (
                          <span
                            key={s.estado}
                            style={{
                              width: `${(s.value / m.total) * 100}%`,
                              background: ESTADO_COLOR[s.estado],
                            }}
                            title={`${m.name} · ${s.estado}: ${fmt(s.value)}`}
                            onClick={() =>
                              onOpenList(
                                `${m.name} · ${s.estado}`,
                                groups.filter(
                                  (g) => g.responsable === m.name && g.estadoV === s.estado
                                )
                              )
                            }
                          />
                        ))}
                      </span>
                      <span className="dash-mtot">{fmt(m.total)}</span>
                    </div>
                  ))}
                  <div className="dash-mleyenda">
                    {(Object.keys(ESTADO_COLOR) as EstadoV[]).map((e) => (
                      <span key={e}>
                        <i style={{ background: ESTADO_COLOR[e] }} />
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dmod-foot">
          <div className="dmod-foot-meta">
            <span className="dmod-cap">
              Total analizado: <b>{fmt(total)}</b> radicados · <b>{fmt(enRiesgo.length)}</b> en
              riesgo ({pct(enRiesgo.length)}%)
            </span>
          </div>
          <button type="button" className="dmod-btn-primary" onClick={onClose}>
            Cerrar análisis
          </button>
        </div>
      </div>
    </div>
  );
}

function VencCard({ g, onOpen }: { g: RadicadoGroup; onOpen: () => void }) {
  const nums = g.procesos.map((p) => p.numero).filter(Boolean);
  return (
    <button
      type="button"
      className="dash-vencit"
      onClick={onOpen}
      data-testid={`dash-venc-${g.key}`}
    >
      <span className="tx">
        <span className="r">{g.radicado}</span>
        <span className="m">
          {nums.length > 0 ? <>Proceso: {nums.join(', ')}</> : <i>sin proceso creado en SAC</i>}
          {' · '}
          {g.responsable}
        </span>
      </span>
      <span className="d">D{g.dia}</span>
    </button>
  );
}

/* ═══════════ Vista principal ═══════════ */

export function HomeView(): JSX.Element {
  const goTo = useNavigationStore((s) => s.goTo);
  const sacRecords = useDataStore((s) => s.sacRecords);
  const mercurioRecords = useDataStore((s) => s.mercurioRecords);
  const sacFile = useExcelStore((s) => s.sacFile);
  const mercurioFile = useExcelStore((s) => s.mercurioFile);

  const [filters, setFilters] = useState<GroupFilters>(DEFAULT_GROUP_FILTERS);
  const profileName = useProfileStore((s) => s.profile.name);
  const lastProfileRef = useRef<string | null>(null);
  const [selectedDia, setSelectedDia] = useState<number | null>(null);
  const [vencDia, setVencDia] = useState<number | null>(null);
  const [chartMode, setChartMode] = useState<'barras' | 'linea'>('barras');
  const [dayQuery, setDayQuery] = useState('');
  const [listState, setListState] = useState<ListState | null>(null);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [ajustes, setAjustes] = useState<Record<string, string>>(() => loadAjustes());
  // Notas / observaciones del trabajo diario (persisten en la caché del navegador)
  const [notas, setNotas] = useState<NotaTrabajo[]>(() => loadNotas());
  const [notasOpen, setNotasOpen] = useState(false);
  const [notasRadicado, setNotasRadicado] = useState('');
  const listadosRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const windowSlots = useMemo(() => buildBusinessWindow(today, 20), [today]);
  const fechaPorDia = useMemo(
    () => new Map(windowSlots.map((s) => [s.dia, s.fecha])),
    [windowSlots]
  );

  const groupsAll = useMemo(
    () => groupRadicados(sacRecords, mercurioRecords, today, ajustes),
    [sacRecords, mercurioRecords, today, ajustes]
  );
  const options = useMemo(
    () => groupFilterOptions(groupsAll, filters.incluirFuera),
    [groupsAll, filters.incluirFuera]
  );

  // Auto-filtrado por responsable según el perfil del usuario (Módulo 2 → Módulo 3) con fuzzy matching
  useEffect(() => {
    if (!options.responsables.length) return;
    if (lastProfileRef.current === profileName) return;

    const prev = lastProfileRef.current;
    lastProfileRef.current = profileName;

    if (!profileName.trim() || isAtencionClientes(profileName)) {
      if (prev !== null) {
        setFilters((f) => ({ ...f, responsable: 'todos' }));
      }
      return;
    }

    const matchedKey = fuzzyMatchResponsable(profileName, options.responsables);
    if (matchedKey) {
      setFilters((f) => ({ ...f, responsable: matchedKey }));
    }
  }, [profileName, options.responsables]);

  const isAtencion = isAtencionClientes(profileName);
  const isProfileConfigured = profileName.trim() !== '';
  // Únicamente el usuario "Atención Clientes" (o sin perfil configurado) puede ver y modificar el filtro de responsable
  const canFilterResponsable = isAtencion || !isProfileConfigured;

  const filtered = useMemo(() => applyGroupFilters(groupsAll, filters), [groupsAll, filters]);
  const kpis = useMemo(() => computeGrupoKpis(filtered), [filtered]);
  const perDia = useMemo(() => perDiaCounts(filtered), [filtered]);
  const venc = useMemo(() => vencidasList(filtered), [filtered]);

  const hasData = sacRecords.length > 0 || mercurioRecords.length > 0;
  const filtersActive =
    (canFilterResponsable && filters.responsable !== 'todos') ||
    filters.tipo !== 'todos' ||
    filters.q.trim() !== '' ||
    filters.incluirFuera ||
    !filters.soloMedios;

  const handleClearFilters = useCallback(() => {
    if (!canFilterResponsable) {
      const matchedKey = fuzzyMatchResponsable(profileName, options.responsables);
      setFilters({
        ...DEFAULT_GROUP_FILTERS,
        responsable: matchedKey || DEFAULT_GROUP_FILTERS.responsable,
      });
    } else {
      setFilters(DEFAULT_GROUP_FILTERS);
    }
  }, [canFilterResponsable, profileName, options.responsables]);

  const detail = detailKey ? (groupsAll.find((g) => g.key === detailKey) ?? null) : null;

  const handleAplicarAjuste = useCallback((key: string, iso: string) => {
    setAjustes(saveAjuste(key, iso));
  }, []);
  const handleQuitarAjuste = useCallback((key: string) => {
    setAjustes(removeAjuste(key));
  }, []);

  const handleGuardarNota = useCallback((nota: NotaInput) => setNotas(upsertNota(nota)), []);
  const handleEliminarNota = useCallback((id: string) => setNotas(deleteNota(id)), []);
  /** Abre el gestor de notas; `radicado` precarga el campo (desde el detalle). */
  const abrirNotas = useCallback((radicado = '') => {
    setNotasRadicado(radicado);
    setNotasOpen(true);
  }, []);

  // Escape con prioridad: notas > detalle > listado > análisis
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      if (notasOpen) setNotasOpen(false);
      else if (detailKey) setDetailKey(null);
      else if (listState) setListState(null);
      else if (analysisOpen) setAnalysisOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [notasOpen, detailKey, listState, analysisOpen]);

  const set = (patch: Partial<GroupFilters>): void => setFilters((f) => ({ ...f, ...patch }));

  const nombreRespFiltro =
    filters.responsable === 'todos'
      ? undefined
      : (options.responsables.find((r) => r.key === filters.responsable)?.nombre ??
        filters.responsable);

  const openList = (titulo: string, regs: RadicadoGroup[], sub?: string): void =>
    setListState({ titulo, sub: sub ?? etiquetaFiltros(filters, nombreRespFiltro), regs });

  const pickDay = (dia: number): void => {
    setSelectedDia(dia);
    setDayQuery('');
    requestAnimationFrame(() => {
      listadosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  /* ── KPIs panorámica ── */
  const kpiDefs: {
    id: string;
    label: string;
    value: number;
    hint: string;
    color: string;
    regs: RadicadoGroup[];
  }[] = [
    {
      id: 'total',
      label: 'Total en trámite',
      value: kpis.total,
      hint: 'Radicados únicos · 15 días hábiles',
      color: C_AZUL,
      regs: filtered,
    },
    {
      id: 'vencidos',
      label: 'Vencidos',
      value: kpis.vencidos,
      hint: 'Plazo legal superado',
      color: C_ROJO,
      regs: filtered.filter((g) => g.estadoV === 'Vencido'),
    },
    {
      id: 'criticos',
      label: 'Críticos',
      value: kpis.criticos,
      hint: `Vencen en ${CRITICO_DIAS} días o menos`,
      color: '#f29d38',
      regs: filtered.filter((g) => g.estadoV === 'Crítico'),
    },
    {
      id: 'proximos',
      label: 'Próximos',
      value: kpis.proximos,
      hint: `Vencen en ${PROXIMO_DIAS} días o menos`,
      color: '#b9721a',
      regs: filtered.filter((g) => g.estadoV === 'Próximo'),
    },
    {
      id: 'plazo',
      label: 'En plazo',
      value: kpis.enPlazo,
      hint: 'Con tiempo disponible',
      color: '#2e9e5b',
      regs: filtered.filter((g) => g.estadoV === 'En plazo'),
    },
    {
      id: 'sinproceso',
      label: 'Sin proceso',
      value: kpis.sinProceso,
      hint: 'Sin proceso creado en SAC',
      color: '#7d8ba1',
      regs: filtered.filter((g) => g.nProc === 0),
    },
  ];

  /* ── Gráfica de bandeja ── */
  const diaVals = perDia.map((d) => d.value);
  const maxDia = Math.max(...diaVals, 0);
  const totalPeriodo = diaVals.reduce((a, b) => a + b, 0);
  const conDatos = diaVals.filter((v) => v > 0).length;
  const promedio = conDatos > 0 ? Math.round(totalPeriodo / conDatos) : 0;
  const picoDia = perDia.find((d) => d.value === maxDia && maxDia > 0) ?? null;
  const minVal = conDatos > 0 ? Math.min(...diaVals.filter((v) => v > 0)) : 0;
  const valleDia = conDatos > 0 ? (perDia.find((d) => d.value === minVal) ?? null) : null;
  const ultimos3 = perDia.filter((d) => d.dia <= 3).reduce((a, b) => a + b.value, 0);

  /* ── Vencidas: chips por día ── */
  const vencPorDia = useMemo(() => {
    const map = new Map<number, number>();
    for (const g of venc) map.set(g.dia ?? 0, (map.get(g.dia ?? 0) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [venc]);
  const vencFiltradas = vencDia === null ? venc : venc.filter((g) => g.dia === vencDia);
  const VENC_TOPE = 60;
  const vencVisibles = vencFiltradas.slice(0, VENC_TOPE);

  /* ── Riel de días + panel del día ── */
  const railVencidos = useMemo(() => {
    const map = new Map<number, number>();
    for (const g of venc) map.set(g.dia ?? 0, (map.get(g.dia ?? 0) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [venc]);
  const maxRail = Math.max(1, ...perDia.map((d) => d.value), ...railVencidos.map(([, n]) => n));
  const diaEsVenc = selectedDia !== null && selectedDia > DIAS_HABILES;
  const diaBase = useMemo(() => {
    if (selectedDia === null) return [];
    const esVenc = selectedDia > DIAS_HABILES;
    const pool = esVenc ? venc : filtered;
    return pool
      .filter((g) => g.dia === selectedDia)
      .sort((a, b) => (a.restan ?? 9999) - (b.restan ?? 9999));
  }, [selectedDia, venc, filtered]);
  const diaQuery = dayQuery.trim().toLowerCase();
  const diaRegs = diaQuery
    ? diaBase.filter(
        (g) =>
          g.radicado.toLowerCase().includes(diaQuery) ||
          g.procesos.some((p) => p.numero.toLowerCase().includes(diaQuery))
      )
    : diaBase;
  const DIA_TOPE = 80;
  const diaVisibles = diaRegs.slice(0, DIA_TOPE);
  const diaEstados = useMemo(() => {
    const order: EstadoV[] = ['Vencido', 'Crítico', 'Próximo', 'En plazo', 'Sin fecha'];
    return order
      .map((e) => ({ e, n: diaBase.filter((g) => g.estadoV === e).length }))
      .filter((x) => x.n > 0);
  }, [diaBase]);
  const diaSinProc = diaBase.filter((g) => g.nProc === 0).length;
  const diaFecha = selectedDia !== null ? (fechaPorDia.get(selectedDia) ?? null) : null;

  // Sugerencias de radicado del gestor de notas: los del día + los ya usados
  const notasSugerencias = useMemo(() => {
    const set = new Set<string>();
    for (const g of diaBase) if (g.radicado && g.radicado !== '—') set.add(g.radicado);
    for (const n of notas) if (n.radicado) set.add(n.radicado);
    return [...set].sort();
  }, [diaBase, notas]);

  return (
    <div data-testid="home-view" className="dash-root">
      <style>{dashStyles}</style>

      {/* ═══ Encabezado Principal (Módulo 2) ═══ */}
      <div className="dash-head dash-anim">
        <div className="dash-head-left">
          <span className="dash-head-icon" aria-hidden>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3v18h18M8 17v-6m5 6V8m5 9v-3" />
            </svg>
          </span>
          <div className="dash-head-text">
            <div className="dash-head-badge-row">
              <span className="dash-head-tag">MÓDULO 2</span>
              <span className="dash-head-live-dot" title="Sincronizado" />
            </div>
            <h1 className="dash-head-title" data-testid="dash-title">
              Módulo 2: Cuadro de Mando
            </h1>
            <p className="dash-head-sub">
              Centro de seguimiento y control de la información procesada desde SAC y Mercurio
            </p>
          </div>
        </div>
        <div className="dash-head-right">
          <div className="dash-head-sources">
            <span
              className={`dash-source ${sacRecords.length > 0 ? 'ok' : 'empty'}`}
              data-testid="dash-coverage-sac"
              title={sacFile?.file?.name ?? 'Archivo SAC'}
            >
              <i className="dash-source-dot" />
              SAC · {sacRecords.length > 0 ? fmt(sacRecords.length) : 'sin cargar'}
            </span>
            <span
              className={`dash-source ${mercurioRecords.length > 0 ? 'ok' : 'empty'}`}
              data-testid="dash-coverage-mercurio"
              title={mercurioFile?.file?.name ?? 'Archivo Mercurio'}
            >
              <i className="dash-source-dot" />
              Mercurio · {mercurioRecords.length > 0 ? fmt(mercurioRecords.length) : 'sin cargar'}
            </span>
          </div>
          <button
            type="button"
            className="dash-btn-ghost dash-btn-ghost--config"
            onClick={() => goTo('configuracion')}
            data-testid="dash-go-config"
            title="Ir a Módulo 1: Configuración de Recursos"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>Ir a Configuración</span>
          </button>
        </div>
      </div>

      {!hasData ? (
        <div className="dash-card dash-empty dash-anim" data-testid="dashboard-empty">
          <span className="dash-empty-icon" aria-hidden>
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3v18h18M8 17v-6m5 6V8m5 9v-3" />
            </svg>
          </span>
          <div className="dash-empty-title">Sin datos para mostrar</div>
          <p className="dash-empty-sub">
            Carga los archivos SAC y Mercurio en el Módulo 1: Configuración de Recursos y los
            indicadores, gráficos y listados aparecerán aquí automáticamente.
          </p>
          <button
            type="button"
            className="dash-btn-primary"
            onClick={() => goTo('configuracion')}
            data-testid="dash-empty-config"
          >
            Cargar archivos en Configuración
          </button>
        </div>
      ) : (
        <>
          {/* ═══ 01 Filtros ═══ */}
          <section aria-label="Filtros del tablero">
            <SectionHead num="01 · Configuración" title="Filtros del tablero" />
            <div className="dash-card dash-anim" style={{ animationDelay: '60ms' }}>
              <div className="dash-filters">
                {canFilterResponsable && (
                  <label className="dash-field">
                    <span>Responsable</span>
                    <select
                      value={filters.responsable}
                      onChange={(e) => set({ responsable: e.target.value })}
                      data-testid="dash-filter-responsable"
                    >
                      <option value="todos">— Todos los responsables —</option>
                      {options.responsables.map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="dash-field">
                  <span>Tipo de trámite</span>
                  <select
                    value={filters.tipo}
                    onChange={(e) => set({ tipo: e.target.value })}
                    data-testid="dash-filter-tipo"
                  >
                    <option value="todos">— Todos los trámites —</option>
                    {options.tipos.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="dash-field">
                  <span>Búsqueda</span>
                  <input
                    type="search"
                    value={filters.q}
                    onChange={(e) => set({ q: e.target.value })}
                    placeholder="Radicado, proceso, cuenta, solicitante…"
                    data-testid="dash-filter-q"
                  />
                </label>
                <div className="dash-filters-side">
                  <label
                    className="dash-check"
                    title="Solo medios Escrito, Página Web y E-Mail (Mercurio cuenta como Escrito)"
                  >
                    <input
                      type="checkbox"
                      checked={filters.soloMedios}
                      onChange={(e) => set({ soloMedios: e.target.checked })}
                      data-testid="dash-filter-medios"
                    />
                    Solo medios principales
                  </label>
                  <label className="dash-check">
                    <input
                      type="checkbox"
                      checked={filters.incluirFuera}
                      onChange={(e) => set({ incluirFuera: e.target.checked })}
                      data-testid="dash-filter-fuera"
                    />
                    Incluir fuera de los 15 días hábiles
                  </label>
                  <span
                    className="dash-count"
                    data-testid="dash-count"
                    style={{
                      position: 'absolute',
                      width: 1,
                      height: 1,
                      overflow: 'hidden',
                      opacity: 0,
                      pointerEvents: 'none',
                    }}
                  >
                    Mostrando <b>{fmt(filtered.length)}</b> de {fmt(groupsAll.length)} radicados
                    cargados
                    {(() => {
                      const opt =
                        filters.responsable === 'todos'
                          ? undefined
                          : options.responsables.find((r) => r.key === filters.responsable);
                      return opt && opt.n > 1 ? (
                        <>
                          {' '}
                          · unificando <b>{opt.n}</b> variante{opt.n === 1 ? '' : 's'} del nombre
                        </>
                      ) : null;
                    })()}
                  </span>
                  {filtersActive && (
                    <button
                      type="button"
                      className="dash-btn-ghost"
                      onClick={handleClearFilters}
                      data-testid="dash-clear-filters"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ═══ 02 Panorámica ═══ */}
          <section aria-label="Indicadores clave">
            <SectionHead
              num="02 · Panorámica"
              title="Indicadores clave"
              desc="Haz clic en un indicador para abrir su listado completo."
            />
            <div
              className="dash-kpis dash-anim"
              style={{ animationDelay: '120ms' }}
              data-testid="dash-kpis"
            >
              {kpiDefs.map((d, i) => {
                const dias = [6, 5, 4, 3, 2, 1];
                const sp = dias.map((dia) => d.regs.filter((g) => g.dia === dia).length);
                const mx = Math.max(...sp, 1);
                return (
                  <button
                    key={d.id}
                    type="button"
                    className="dash-kpi"
                    style={{ ['--c' as string]: d.color, animationDelay: `${i * 55}ms` }}
                    title={`${d.label} · ${d.hint} — clic para ver el listado`}
                    onClick={() => openList(d.label, d.regs)}
                    data-testid={`kpi-${d.id}`}
                  >
                    <span className="dash-kpi-top">{d.label}</span>
                    <span className="dash-kpi-val">{fmt(d.value)}</span>
                    <span className="dash-kpi-hint">{d.hint}</span>
                    <span className="dash-spark" aria-hidden>
                      {sp.map((v, j) => (
                        <i
                          key={j}
                          style={{ height: `${Math.max(14, Math.round((v / mx) * 100))}%` }}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ═══ 03 Mi bandeja ═══ */}
          <section aria-label="Mi bandeja">
            <SectionHead
              num="03 · Distribución en el tiempo"
              title={`Mi bandeja · ${DIAS_HABILES} días hábiles`}
              desc="Cómo se reparte la carga día a día y qué radicados ya superaron el plazo legal."
              action={
                <button
                  type="button"
                  className="dash-anal-btn"
                  onClick={() => setAnalysisOpen(true)}
                  data-testid="dash-open-analysis"
                >
                  <span className="dash-anal-btn-tx">
                    <b>Dónde está concentrada la carga</b>
                    <i>
                      {fmt(kpis.vencidos + kpis.criticos)} en riesgo ·{' '}
                      {new Set(filtered.map((g) => g.responsable)).size} responsables
                    </i>
                  </span>
                  <span aria-hidden>→</span>
                </button>
              }
            />
            <div className="dash-bandeja">
              <div className="dash-card dash-anim" style={{ animationDelay: '180ms' }}>
                <div className="dash-chead">
                  <div>
                    <h3 className="dash-card-title">Carga por día hábil</h3>
                    <p className="dash-card-sub">
                      Cada barra es un día hábil. Rojo el día con más radicados, verde el de menos.
                      Haz clic en una barra para ver ese día.
                    </p>
                  </div>
                  <div className="dash-tabs" role="tablist" aria-label="Modo de gráfica">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={chartMode === 'barras'}
                      className={chartMode === 'barras' ? 'on' : ''}
                      onClick={() => setChartMode('barras')}
                      data-testid="dash-chartmode-barras"
                    >
                      Barras
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={chartMode === 'linea'}
                      className={chartMode === 'linea' ? 'on' : ''}
                      onClick={() => setChartMode('linea')}
                      data-testid="dash-chartmode-linea"
                    >
                      Tendencia
                    </button>
                  </div>
                </div>
                <div className="dash-gstats">
                  {[
                    { l: 'Total del periodo', v: fmt(totalPeriodo), c: C_AZUL },
                    { l: 'Promedio por día', v: `${fmt(promedio)} PQRS`, c: C_AZUL },
                    {
                      l: 'Día pico',
                      v: picoDia ? `${fmt(maxDia)} D${picoDia.dia}` : '—',
                      c: C_ROJO,
                    },
                    {
                      l: 'Día más liviano',
                      v: valleDia ? `${fmt(minVal)} D${valleDia.dia}` : '—',
                      c: C_VERDE,
                    },
                    { l: 'Últimos 3 días', v: `${fmt(ultimos3)} PQRS`, c: C_VERDE },
                  ].map((s) => (
                    <div className="dash-gstat" key={s.l} style={{ ['--gc' as string]: s.c }}>
                      <div className="l">{s.l}</div>
                      <div className="v">{s.v}</div>
                    </div>
                  ))}
                </div>
                <BandejaChart
                  perDia={perDia}
                  fechaPorDia={fechaPorDia}
                  promedio={promedio}
                  maxDia={maxDia}
                  selectedDia={selectedDia}
                  mode={chartMode}
                  onPick={pickDay}
                />
                <div className="dash-leyenda">
                  <span>Menos casos</span>
                  <span className="dash-rampa" aria-hidden />
                  <span>Más casos</span>
                  <span className="dash-nota" data-testid="dash-pico-nota">
                    {picoDia ? (
                      <>
                        Mayor carga: <b>Día {picoDia.dia}</b> ({ddmm(fechaPorDia.get(picoDia.dia)!)}
                        ) con {fmt(maxDia)} radicados
                      </>
                    ) : (
                      'Sin carga en el periodo'
                    )}
                  </span>
                </div>
              </div>
              <div className="dash-card dash-venc dash-anim" style={{ animationDelay: '240ms' }}>
                <div className="dash-chead">
                  <div>
                    <h3 className="dash-card-title dash-card-title--red">
                      <span>Vencidas</span>
                      {venc.length > 0 && (
                        <span className="dmod-badge b-r" style={{ marginLeft: 6 }}>
                          {fmt(venc.length)}
                        </span>
                      )}
                    </h3>
                    <p className="dash-card-sub">
                      Estado <b>P</b> en Mercurio y más de 15 días hábiles (días 16 a {DIAS_VENTANA}
                      ).
                    </p>
                  </div>
                </div>
                <div data-testid="dash-vencidas" className="dash-venc-body">
                  <div className="dash-venctot">
                    <span className="n">{fmt(venc.length)}</span>
                    <span className="t">radicado(s) vencidos con los filtros activos</span>
                  </div>
                  {venc.length === 0 ? (
                    <div className="dash-chart-empty dash-venc-empty">
                      <div className="dash-venc-empty-badge">✓</div>
                      <b>Sin radicados vencidos</b>
                      <p>Sin radicados vencidos con los filtros activos.</p>
                    </div>
                  ) : (
                    <>
                      <div className="dash-vencdias">
                        <button
                          type="button"
                          className={vencDia === null ? 'on' : ''}
                          onClick={() => setVencDia(null)}
                          data-testid="dash-venc-chip-todos"
                        >
                          Todos <b>{fmt(venc.length)}</b>
                        </button>
                        {vencPorDia.map(([d, n]) => (
                          <button
                            key={d}
                            type="button"
                            className={vencDia === d ? 'on' : ''}
                            onClick={() => setVencDia(d)}
                            data-testid={`dash-venc-chip-${d}`}
                          >
                            Día {d} <b>{fmt(n)}</b>
                          </button>
                        ))}
                      </div>
                      <div className="dash-venclist">
                        {vencVisibles.map((g) => (
                          <VencCard key={g.key} g={g} onOpen={() => setDetailKey(g.key)} />
                        ))}
                      </div>
                      <div className="dash-vencpie">
                        <span>
                          {vencFiltradas.length > VENC_TOPE
                            ? `Mostrando ${VENC_TOPE} de ${fmt(vencFiltradas.length)}`
                            : `Mostrando ${fmt(vencFiltradas.length)}${vencDia !== null ? ` del día ${vencDia}` : ''}`}
                        </span>
                        <button
                          type="button"
                          className="dash-btn-ghost"
                          onClick={() =>
                            openList(
                              vencDia === null ? 'Radicados vencidos' : `Vencidos · día ${vencDia}`,
                              vencFiltradas
                            )
                          }
                          data-testid="dash-venc-todos"
                        >
                          Ver listado completo
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ═══ 04 Listados operativos ═══ */}
          <section
            aria-label="Listados operativos"
            ref={listadosRef}
            className="dash-scroll-anchor"
          >
            <SectionHead
              num="04 · Trabajo diario"
              title="Listados operativos"
              desc="Selecciona un día a la izquierda para ver sus radicados a la derecha."
            />
            <div className="dash-diario">
              <div className="dash-card dash-anim" style={{ animationDelay: '300ms' }}>
                <h3 className="dash-card-title">PQRS por día de vencimiento</h3>
                <p className="dash-card-sub">
                  Del día 15 al día 1. Los vencidos aparecen arriba en rojo.
                </p>
                <div className="dash-dias" data-testid="dash-dayrail">
                  {railVencidos.length > 0 && (
                    <div className="dash-sepdias dash-sepdias--rojo">Fuera de plazo</div>
                  )}
                  {railVencidos.map(([d, n]) => (
                    <DayRailItem
                      key={`v${d}`}
                      dia={d}
                      fecha={fechaPorDia.get(d) ?? null}
                      n={n}
                      max={maxRail}
                      venc
                      selected={selectedDia === d}
                      onPick={n > 0 ? pickDay : undefined}
                    />
                  ))}
                  {railVencidos.length > 0 && (
                    <div className="dash-sepdias">Dentro de los 15 días</div>
                  )}
                  {perDia
                    .slice()
                    .reverse()
                    .map((d) => (
                      <DayRailItem
                        key={d.dia}
                        dia={d.dia}
                        fecha={fechaPorDia.get(d.dia) ?? null}
                        n={d.value}
                        max={maxRail}
                        selected={selectedDia === d.dia}
                        onPick={d.value > 0 ? pickDay : undefined}
                      />
                    ))}
                </div>
              </div>
              <div className="dash-card dash-anim" style={{ animationDelay: '360ms' }}>
                <div className="dash-notas-bar">
                  <div className="dash-notas-bar-txt">
                    <b>Notas y observaciones</b>
                    <span>Registra información adicional del trabajo diario</span>
                  </div>
                  <button
                    type="button"
                    className="dash-notas-btn"
                    onClick={() => abrirNotas()}
                    data-testid="dash-notas-open"
                  >
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
                    Añadir nota
                  </button>
                </div>
                {selectedDia === null ? (
                  <div className="dash-dayempty" data-testid="dash-day-empty">
                    <b>Ningún día seleccionado</b>
                    <span>
                      Elige un día en la lista de la izquierda o en la gráfica de la bandeja.
                    </span>
                  </div>
                ) : (
                  <div data-testid="dash-day-panel">
                    <div className={`dash-dayhero${diaEsVenc ? ' venc' : ''}`}>
                      <span className="dash-daymed">
                        <b>{selectedDia}</b>
                        <i>{diaEsVenc ? 'vencida' : 'día'}</i>
                      </span>
                      <div>
                        <h3 className="dash-card-title">Radicados del día {selectedDia}</h3>
                        <div className="dash-daymeta">
                          Recibidos el <b>{diaFecha ? formatDMY(diaFecha) : '—'}</b> ·{' '}
                          <b>{fmt(diaBase.length)}</b> radicado(s)
                          {diaRegs.length !== diaBase.length && (
                            <> · mostrando {fmt(diaRegs.length)}</>
                          )}
                        </div>
                      </div>
                      <div className="dash-daychips">
                        {diaEstados.map((x) => (
                          <span
                            key={x.e}
                            className="dash-rchip"
                            style={{ ['--cc' as string]: ESTADO_COLOR[x.e] }}
                          >
                            <i />
                            {x.e} <b>{fmt(x.n)}</b>
                          </span>
                        ))}
                        {diaSinProc > 0 && (
                          <span className="dash-rchip" style={{ ['--cc' as string]: '#b9721a' }}>
                            <i />
                            Sin proceso <b>{fmt(diaSinProc)}</b>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="dash-daytools">
                      <input
                        type="search"
                        value={dayQuery}
                        onChange={(e) => setDayQuery(e.target.value)}
                        placeholder="Filtrar por radicado o proceso…"
                        aria-label="Filtrar por radicado o proceso"
                        data-testid="dash-day-search"
                      />
                    </div>
                    <div className="dash-daylist">
                      {diaVisibles.length === 0 && (
                        <div className="dash-chart-empty">
                          {diaBase.length > 0
                            ? 'Ningún radicado coincide con la búsqueda.'
                            : 'Sin radicados para este día con los filtros activos.'}
                        </div>
                      )}
                      {diaVisibles.map((g) => {
                        const mi = medioInfo(g.medio);
                        return (
                          <div
                            className="dash-radcard"
                            key={g.key}
                            data-testid={`dash-daycard-${g.key}`}
                          >
                            <div className="dash-radmain">
                              <div className="dash-radln1">
                                <span className="dash-radnum">{g.radicado}</span>
                                <span className={`dmod-badge ${ESTADO_BADGE[g.estadoV]}`}>
                                  {g.estadoV}
                                </span>
                              </div>
                              <div className="dash-radln2">
                                <span
                                  className="dash-medio"
                                  style={{ color: mi.color, borderColor: `${mi.color}55` }}
                                >
                                  {mi.etiqueta}
                                </span>
                                {g.nProc === 0 ? (
                                  <span className="dmod-muted">Sin proceso creado en SAC</span>
                                ) : (
                                  <span>
                                    {g.procesos
                                      .map((p) => p.numero)
                                      .filter(Boolean)
                                      .slice(0, 3)
                                      .join(' · ')}
                                    {g.nProc > 3 && ` +${g.nProc - 3} más`}
                                  </span>
                                )}
                                <span className="dash-sep" aria-hidden>
                                  ·
                                </span>
                                <span title={g.responsable}>{g.responsable}</span>
                                {g.cuenta && (
                                  <>
                                    <span className="dash-sep" aria-hidden>
                                      ·
                                    </span>
                                    <span>Cuenta {g.cuenta}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="dash-btn-ghost"
                              onClick={() => setDetailKey(g.key)}
                              data-testid={`dash-daydetail-${g.key}`}
                            >
                              Detalles →
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {diaRegs.length > 0 && (
                      <p className="dash-dayfoot">
                        Mostrando <b>{fmt(diaVisibles.length)}</b>
                        {diaRegs.length > diaVisibles.length && <> de {fmt(diaRegs.length)}</>}{' '}
                        radicado(s) · Clic en una tarjeta para abrir su detalle
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ═══ Modales ═══ */}
      <AnalysisModal
        open={analysisOpen}
        groups={filtered}
        sub={`${etiquetaFiltros(filters, nombreRespFiltro)} · ${fmt(filtered.length)} radicado(s) en el periodo analizado`}
        onClose={() => setAnalysisOpen(false)}
        onPickResponsable={(name) => {
          if (!canFilterResponsable) {
            openList(
              `Responsable: ${name}`,
              groupsAll.filter(
                (g) => g.responsable === name || g.respCanon.includes(canonNombre(name))
              )
            );
          } else {
            const opt = options.responsables.find((r) => r.nombre === name);
            set({ responsable: opt ? opt.key : name });
          }
          setAnalysisOpen(false);
        }}
        onOpenList={(titulo, regs) => openList(titulo, regs)}
      />
      <RadicadoListModal
        open={listState !== null}
        titulo={listState?.titulo ?? ''}
        sub={listState?.sub ?? ''}
        groups={listState?.regs ?? []}
        onClose={() => setListState(null)}
        onSelect={(g) => setDetailKey(g.key)}
      />
      <RadicadoDetailModal
        group={detail}
        notas={notas}
        onClose={() => setDetailKey(null)}
        onAplicarAjuste={handleAplicarAjuste}
        onQuitarAjuste={handleQuitarAjuste}
        onAbrirNotas={(rad) => abrirNotas(rad)}
      />
      <NotasTrabajoModal
        open={notasOpen}
        notas={notas}
        radicadoPrefill={notasRadicado}
        sugerencias={notasSugerencias}
        onGuardar={handleGuardarNota}
        onEliminar={handleEliminarNota}
        onClose={() => setNotasOpen(false)}
      />
    </div>
  );
}

/* ── Gráfica de bandeja: barras D15..D1 + línea de tendencia ── */
function BandejaChart({
  perDia,
  fechaPorDia,
  promedio,
  maxDia,
  selectedDia,
  mode,
  onPick,
}: {
  perDia: { dia: number; value: number }[];
  fechaPorDia: Map<number, Date>;
  promedio: number;
  maxDia: number;
  selectedDia: number | null;
  mode: 'barras' | 'linea';
  onPick: (dia: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const orden = [...perDia].sort((a, b) => b.dia - a.dia);
  const W = 740;
  const H = 230;
  const padL = 42;
  const padR = 16;
  const padT = 28;
  const padB = 38;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const bruto = Math.max(maxDia, 1);
  const crudo = bruto / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(crudo)));
  const norm = crudo / mag;
  const paso = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const tope = Math.max(paso * 1.1, Math.ceil(bruto / paso) * paso * 1.05);
  const yOf = (v: number): number => padT + innerH - (v / tope) * innerH;
  const ticks: number[] = [];
  for (let v = 0; v <= bruto + 1e-6; v += paso) ticks.push(Math.round(v));

  const vals = orden.map((d) => d.value);
  const n = orden.length;
  const slot = innerW / Math.max(n, 1);
  const barW = Math.min(38, Math.max(16, slot * 0.62));

  const pts = orden.map((d, i) => ({
    x: padL + slot * (i + 0.5),
    y: yOf(d.value),
  }));

  function smoothPath(points: { x: number; y: number }[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M${points[0]!.x} ${points[0]!.y}`;
    let dp = `M${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)}`;
    for (let ii = 0; ii < points.length - 1; ii++) {
      const p0 = points[ii === 0 ? 0 : ii - 1]!;
      const p1 = points[ii]!;
      const p2 = points[ii + 1]!;
      const p3 = points[ii + 2 < points.length ? ii + 2 : ii + 1]!;
      const cp1x = p1.x + (p2.x - p0.x) / 5;
      const cp1y = p1.y + (p2.y - p0.y) / 5;
      const cp2x = p2.x - (p3.x - p1.x) / 5;
      const cp2y = p2.y - (p3.y - p1.y) / 5;
      dp += ` C${cp1x.toFixed(1)} ${cp1y.toFixed(1)},${cp2x.toFixed(1)} ${cp2y.toFixed(1)},${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return dp;
  }

  const linePath = smoothPath(pts);
  const areaPath =
    pts.length > 0
      ? `${linePath} L${pts[pts.length - 1]!.x.toFixed(1)} ${(padT + innerH).toFixed(1)} L${pts[0]!.x.toFixed(1)} ${(padT + innerH).toFixed(1)} Z`
      : '';

  const showTendencia = mode === 'linea';

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="dash-svg"
      role="img"
      aria-label="Carga por día hábil"
      data-testid="chart-carga"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="bandeja-area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1565d8" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#1565d8" stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="bandeja-bar-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.06" />
        </linearGradient>
      </defs>

      {/* Fondo del área de gráfica */}
      <rect x={padL} y={padT} width={innerW} height={innerH} fill="#f8fafc" rx={6} />

      {/* Cuadrícula */}
      {ticks.map((t, ti) => (
        <g key={`tick-${ti}`}>
          <line
            x1={padL}
            y1={yOf(t)}
            x2={W - padR}
            y2={yOf(t)}
            className={t === 0 ? 'dash-grid0' : 'dash-grid'}
          />
          <text x={padL - 8} y={yOf(t) + 4} textAnchor="end" className="dash-ax">
            {t}
          </text>
        </g>
      ))}

      {/* Línea de promedio */}
      {promedio > 0 && (
        <g>
          <line
            x1={padL}
            y1={yOf(promedio)}
            x2={W - padR}
            y2={yOf(promedio)}
            className="dash-prom"
          />
          <rect
            x={W - padR - 74}
            y={yOf(promedio) - 14}
            width={74}
            height={16}
            rx={8}
            fill="#1565d8"
            opacity="0.92"
          />
          <text
            x={W - padR - 37}
            y={yOf(promedio) - 3}
            textAnchor="middle"
            className="dash-prom-lab"
          >
            Promedio {fmt(promedio)}
          </text>
        </g>
      )}

      {/* Curva de tendencia */}
      {showTendencia && pts.length > 0 && (
        <g>
          <path d={areaPath} fill="url(#bandeja-area-grad)" />
          <path d={linePath} className="dash-linea" />
          {pts.map((p, i) => (
            <circle
              key={`dot-${i}`}
              cx={p.x}
              cy={p.y}
              r={orden[i]!.value > 0 ? 4 : 2.5}
              fill={orden[i]!.value > 0 ? '#1565d8' : '#cbd5e1'}
              stroke="#ffffff"
              strokeWidth="2"
              className="dash-dot"
            />
          ))}
        </g>
      )}

      {/* Barras */}
      {orden.map((d, i) => {
        const h = d.value > 0 ? Math.max(8, (d.value / tope) * innerH) : 4;
        const bx = padL + slot * i + (slot - barW) / 2;
        const by = padT + innerH - h;
        const c = rankColor(d.value, vals);
        const esPico = maxDia > 0 && d.value === maxDia && d.value > 0;
        const f = fechaPorDia.get(d.dia);
        const dif =
          promedio > 0 && d.value > 0 ? Math.round(((d.value - promedio) / promedio) * 100) : 0;
        const isHov = hover === d.dia;
        const isSel = selectedDia === d.dia;
        const barRx = Math.min(6, barW / 2);

        return (
          <g
            key={d.dia}
            className={`dash-bar${isSel ? ' sel' : ''}${d.value === 0 ? ' vacia' : ''}${isHov ? ' hov' : ''}`}
            onClick={() => onPick(d.dia)}
            onMouseEnter={() => setHover(d.dia)}
            onMouseLeave={() => setHover(null)}
            data-testid={`dash-bar-${d.dia}`}
            style={{ cursor: d.value > 0 ? 'pointer' : 'default' }}
          >
            <title>{`${d.value} radicados · Día ${d.dia}${f ? ` · ${formatDMY(f)}` : ''}${dif !== 0 ? ` · ${dif > 0 ? '+' : ''}${dif}% vs promedio` : ''}`}</title>

            {/* Glow de selección / hover */}
            {(isSel || isHov) && d.value > 0 && (
              <rect
                x={bx - 3}
                y={by - 3}
                width={barW + 6}
                height={h + 6}
                rx={barRx + 3}
                fill={c}
                opacity="0.15"
                style={{ filter: 'blur(5px)' }}
              />
            )}

            {d.value > 0 ? (
              <>
                <rect x={bx} y={by} width={barW} height={h} rx={barRx} fill={c} />
                <rect
                  x={bx}
                  y={by}
                  width={barW}
                  height={Math.min(h * 0.45, h)}
                  rx={barRx}
                  fill="url(#bandeja-bar-grad)"
                  style={{ pointerEvents: 'none' }}
                />
                {isSel && (
                  <rect
                    x={bx - 2}
                    y={by - 2}
                    width={barW + 4}
                    height={h + 4}
                    rx={barRx + 2}
                    fill="none"
                    stroke={c}
                    strokeWidth="2.5"
                    opacity="0.75"
                  />
                )}
              </>
            ) : (
              <rect
                x={bx + barW * 0.2}
                y={padT + innerH - 4}
                width={barW * 0.6}
                height={4}
                rx={2}
                fill="#e2e8f0"
              />
            )}

            {/* Valor sobre la barra */}
            <text
              x={bx + barW / 2}
              y={d.value > 0 ? by - 7 : padT + innerH - 9}
              textAnchor="middle"
              className="dash-val"
              fill={d.value > 0 ? c : '#c3ccdb'}
            >
              {d.value}
            </text>

            {/* Delta vs promedio (solo en hover) */}
            {dif !== 0 && d.value > 0 && isHov && (
              <text
                x={bx + barW / 2}
                y={by - 20}
                textAnchor="middle"
                className="dash-dif"
                fill={dif > 0 ? '#dc2626' : '#16a34a'}
              >
                {dif > 0 ? '+' : ''}
                {dif}%
              </text>
            )}

            {/* Estrella del pico */}
            {esPico && (
              <text
                x={bx + barW / 2}
                y={by - (isHov ? 33 : 22)}
                textAnchor="middle"
                className="dash-corona"
                aria-hidden
              >
                ★
              </text>
            )}

            {/* Etiquetas inferiores */}
            <text
              x={bx + barW / 2}
              y={H - padB + 13}
              textAnchor="middle"
              className={`dash-ax dash-ax--b${isSel ? ' dash-ax--sel' : ''}`}
            >
              D{d.dia}
            </text>
            <text
              x={bx + barW / 2}
              y={H - padB + 25}
              textAnchor="middle"
              className="dash-ax dash-ax--date"
            >
              {f ? ddmm(f) : ''}
            </text>
            <text
              x={bx + barW / 2}
              y={H - padB + 36}
              textAnchor="middle"
              className="dash-ax dash-ax--wd"
            >
              {f ? weekdayShort(f) : ''}
            </text>
          </g>
        );
      })}

      {/* Tooltip flotante */}
      {hover !== null &&
        (() => {
          const dh = orden.find((x) => x.dia === hover);
          if (!dh || dh.value === 0) return null;
          const ih = orden.findIndex((x) => x.dia === hover);
          const tcx = padL + slot * (ih + 0.5);
          const tf = fechaPorDia.get(dh.dia);
          const tc = rankColor(dh.value, vals);
          const tdif = promedio > 0 ? Math.round(((dh.value - promedio) / promedio) * 100) : 0;
          const tipW = 152;
          const tipH = tf ? 64 : 46;
          const tipX = Math.min(W - padR - tipW - 4, Math.max(padL, tcx - tipW / 2));
          const tipY = yOf(dh.value) - tipH - 16;
          return (
            <g style={{ pointerEvents: 'none' }}>
              <rect
                x={tipX}
                y={tipY}
                width={tipW}
                height={tipH}
                rx={9}
                fill="#1e293b"
                opacity="0.94"
              />
              <polygon
                points={`${(tcx - 7).toFixed(1)},${(tipY + tipH).toFixed(1)} ${(tcx + 7).toFixed(1)},${(tipY + tipH).toFixed(1)} ${tcx.toFixed(1)},${(tipY + tipH + 8).toFixed(1)}`}
                fill="#1e293b"
                opacity="0.94"
              />
              <circle cx={tcx} cy={yOf(dh.value)} r={5} fill={tc} stroke="#fff" strokeWidth="2" />
              <text x={tipX + 12} y={tipY + 18} className="dash-tip-title" fill={tc}>
                Día {dh.dia} · {dh.value} radicados
              </text>
              {tf && (
                <text x={tipX + 12} y={tipY + 32} className="dash-tip-sub" fill="#94a3b8">
                  {formatDMY(tf)} · {weekdayShort(tf)}
                </text>
              )}
              {tdif !== 0 && (
                <text
                  x={tipX + 12}
                  y={tipY + (tf ? 50 : 34)}
                  className="dash-tip-sub"
                  fill={tdif > 0 ? '#f87171' : '#4ade80'}
                >
                  {tdif > 0 ? '▲ +' : '▼ '}
                  {tdif}% vs promedio
                </text>
              )}
            </g>
          );
        })()}
    </svg>
  );
}

function DayRailItem({
  dia,
  fecha,
  n,
  max,
  venc,
  selected,
  onPick,
}: {
  dia: number;
  fecha: Date | null;
  n: number;
  max: number;
  venc?: boolean;
  selected: boolean;
  onPick?: (dia: number) => void;
}) {
  const pc = Math.max(n ? 6 : 0, (n / Math.max(max, 1)) * 100);
  return (
    <button
      type="button"
      className={`dash-dia${venc ? ' venc' : ''}${dia === 1 && !venc ? ' hoy' : ''}${n === 0 ? ' cero' : ''}${selected ? ' on' : ''}`}
      disabled={!onPick}
      onClick={() => onPick?.(dia)}
      data-testid={`dash-rail-${dia}`}
      title={n > 0 ? `Ver radicados del día ${dia}` : `Día ${dia} sin radicados`}
    >
      <span className="dash-dia-md">
        <b>{dia}</b>
        <i>{venc ? 'venc' : 'día'}</i>
      </span>
      <span className="dash-dia-inf">
        <span className="f">{fecha ? formatDMY(fecha) : '—'}</span>
        <span className="s">
          {fecha ? weekdayShort(fecha) : '—'}
          <span className="bar">
            <i style={{ width: `${pc.toFixed(1)}%` }} />
          </span>
        </span>
      </span>
      <span className="dash-dia-cf">
        <b>{fmt(n)}</b>
        <span>PQRS</span>
      </span>
    </button>
  );
}

function etiquetaFiltros(f: GroupFilters, nombreResp?: string): string {
  const parts: string[] = [];
  if (f.responsable !== 'todos') parts.push(`Responsable: ${nombreResp ?? f.responsable}`);
  if (f.tipo !== 'todos') parts.push(`Trámite: ${f.tipo}`);
  if (f.q.trim()) parts.push(`Búsqueda: ${f.q.trim()}`);
  return parts.length > 0 ? parts.join(' · ') : 'Todos los responsables';
}

export default HomeView;

const dashStyles = `
  @keyframes dashFadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
  .dash-root { display: flex; flex-direction: column; gap: 16px; width: 100%; }
  .dash-anim { animation: dashFadeUp .45s cubic-bezier(.16,1,.3,1) both; }

  /* ═══ Header principal (Módulo 3: Cuadro de Mando) ═══ */
  .dash-head {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 55%, #ffffff 100%);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: 0 1px 3px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02);
    padding: 14px 18px;
    overflow: hidden;
  }
  .dash-head::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 4px;
    background: linear-gradient(180deg, var(--essa-primary) 0%, #0e6ad1 100%);
  }
  .dash-head-left {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
    flex: 1 1 auto;
  }
  .dash-head-icon {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--essa-primary) 0%, #0e6ad1 100%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(0,75,147,.25);
  }
  .dash-head-text {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .dash-head-badge-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .dash-head-tag {
    font-size: 0.62rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--essa-primary);
    background: var(--essa-primary-50);
    border: 1px solid rgba(0,75,147,0.15);
    padding: 2px 7px;
    border-radius: 999px;
    line-height: 1.2;
    display: inline-block;
  }
  .dash-head-live-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: #16a34a;
    box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.2);
  }
  .dash-head-title {
    font-size: 1.18rem;
    font-weight: 900;
    letter-spacing: -0.02em;
    color: var(--neutral-900);
    margin: 0;
    line-height: 1.2;
  }
  .dash-head-sub {
    font-size: 0.74rem;
    color: var(--neutral-500);
    margin: 0;
  }
  .dash-head-right {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    flex-shrink: 0;
  }
  .dash-head-sources {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .dash-source {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.7rem;
    font-weight: 800;
    padding: 5px 12px;
    border-radius: 999px;
    border: 1px solid;
    white-space: nowrap;
    transition: all 150ms ease;
  }
  .dash-source-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: currentColor;
    display: inline-block;
  }
  .dash-source.ok {
    background: #f0fdf4;
    color: #16a34a;
    border-color: #bbf7d0;
  }
  .dash-source.empty {
    background: #f8fafc;
    color: #64748b;
    border-color: #e2e8f0;
  }
  .dash-btn-ghost--config {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 13px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: #ffffff;
    color: var(--neutral-700);
    font-size: 0.74rem;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    transition: all 150ms ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
  }
  .dash-btn-ghost--config:hover {
    border-color: var(--essa-primary);
    color: var(--essa-primary);
    background: var(--essa-primary-50);
    transform: translateY(-1px);
  }

  .dash-btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 36px; padding: 0 18px; border-radius: 999px; border: 1px solid #1e3a8a; background: linear-gradient(135deg, #0b2a5b 0%, #004B93 48%, #0e6ad1 100%); color: #fff; font-size: 0.76rem; font-weight: 800; font-family: inherit; cursor: pointer; white-space: nowrap; box-shadow: 0 3px 10px rgba(0,75,147,.25); transition: all 150ms ease; }
  .dash-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,75,147,.32); }
  .dash-btn-ghost { display: inline-flex; align-items: center; justify-content: center; height: 30px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--border); background: #ffffff; color: var(--neutral-600); font-size: 0.72rem; font-weight: 700; font-family: inherit; cursor: pointer; white-space: nowrap; transition: all 150ms ease; }
  .dash-btn-ghost:hover { border-color: var(--essa-primary); color: var(--essa-primary); background: #f8fafc; }

  .dash-sec-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin: 6px 2px 10px; flex-wrap: wrap; }
  .dash-sec-num { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase; color: var(--essa-primary); }
  .dash-sec-title { font-size: 1.05rem; font-weight: 900; letter-spacing: -0.015em; color: var(--neutral-900); margin: 2px 0 0; }
  .dash-sec-desc { font-size: 0.74rem; color: var(--neutral-500); margin: 3px 0 0; }
  .dash-sec-action { flex-shrink: 0; }

  .dash-card { background: #ffffff; border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: 0 1px 3px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02); padding: 16px 18px; min-width: 0; }
  .dash-card-title { font-size: 0.86rem; font-weight: 800; letter-spacing: -0.01em; color: var(--neutral-900); margin: 0; display: flex; align-items: center; gap: 8px; }
  .dash-card-title::before { content: ""; width: 4px; height: 15px; border-radius: 4px; background: linear-gradient(180deg, var(--essa-primary), #0e6ad1); }
  .dash-card-title--red::before { background: linear-gradient(180deg, #dc2626, #f97316); }
  .dash-card-sub { font-size: 0.7rem; color: var(--neutral-500); margin: 3px 0 10px; line-height: 1.45; }

  .dash-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 56px 24px; }
  .dash-empty-icon { width: 76px; height: 76px; border-radius: 22px; background: var(--essa-primary-50); color: var(--essa-primary); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 6px; }
  .dash-empty-title { font-size: 1.05rem; font-weight: 900; color: var(--neutral-900); }
  .dash-empty-sub { font-size: 0.8rem; color: var(--neutral-500); max-width: 520px; line-height: 1.55; margin-bottom: 12px; }

  /* ═══ 01 Filtros ═══ */
  .dash-filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px 14px; align-items: end; }
  .dash-field { display: flex; flex-direction: column; gap: 5px; font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--neutral-600); }
  .dash-field select, .dash-field input { height: 36px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: #ffffff; padding: 0 11px; font-size: 0.78rem; font-family: inherit; color: var(--neutral-900); outline: none; max-width: 100%; transition: border-color 150ms ease, box-shadow 150ms ease; }
  .dash-field select:focus, .dash-field input:focus { border-color: var(--essa-primary); box-shadow: 0 0 0 3px rgba(0,75,147,.12); }
  .dash-filters-side { display: flex; align-items: center; gap: 12px; justify-content: flex-end; flex-wrap: wrap; }
  .dash-check { display: inline-flex; align-items: center; gap: 7px; font-size: 0.72rem; font-weight: 600; color: var(--neutral-700); cursor: pointer; white-space: nowrap; }
  .dash-check input { width: 15px; height: 15px; accent-color: var(--essa-primary); cursor: pointer; }
  .dash-count { font-size: 0.74rem; color: var(--neutral-600); white-space: nowrap; }
  .dash-count b { color: var(--neutral-900); }

  /* ═══ 02 Panorámica / KPIs ═══ */
  .dash-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(155px, 1fr)); gap: 1px; background: #e2e8f0; border: 1px solid #cbd5e1; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
  .dash-kpi { position: relative; background: #ffffff; border: none; padding: 12px 16px 10px 52px; display: flex; flex-direction: column; gap: 2px; text-align: left; font-family: inherit; cursor: pointer; min-height: 88px; transition: background .18s ease; }
  .dash-kpi::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 3.5px; background: var(--c); transform: scaleX(0); transform-origin: left; transition: transform .25s ease; }
  .dash-kpi:hover { background: color-mix(in srgb, var(--c) 5%, #ffffff); }
  .dash-kpi:hover::before { transform: scaleX(1); }
  .dash-kpi-top { font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: var(--neutral-500); }
  .dash-kpi-val { font-size: 1.55rem; font-weight: 900; letter-spacing: -0.02em; color: var(--c); font-variant-numeric: tabular-nums; line-height: 1.1; }
  .dash-kpi-hint { font-size: 0.64rem; color: var(--neutral-400); font-weight: 500; }
  .dash-spark { position: absolute; left: 14px; bottom: 12px; display: flex; align-items: flex-end; gap: 2.5px; height: 22px; opacity: .45; }
  .dash-kpi:hover .dash-spark { opacity: .85; }
  .dash-spark i { width: 3.5px; border-radius: 2px; background: var(--c); }

  /* ═══ 03 Mi bandeja (Distribución en el tiempo) ═══ */
  .dash-bandeja {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
    gap: 16px;
    align-items: stretch;
  }
  @media (min-width: 1101px) {
    .dash-bandeja {
      height: 495px;
    }
    .dash-bandeja > .dash-card {
      height: 100%;
      min-height: 495px;
      max-height: 495px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
  }
  @media (max-width: 1100px) {
    .dash-bandeja {
      grid-template-columns: minmax(0, 1fr);
    }
    .dash-bandeja > .dash-card {
      min-height: 460px;
      display: flex;
      flex-direction: column;
    }
  }

  .dash-chead { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; flex-wrap: wrap; flex-shrink: 0; }
  .dash-tabs { display: inline-flex; background: var(--neutral-100); border-radius: 999px; padding: 3px; gap: 2px; }
  .dash-tabs button { border: none; background: transparent; font-size: 0.7rem; font-weight: 700; font-family: inherit; color: var(--neutral-500); padding: 5px 13px; border-radius: 999px; cursor: pointer; transition: all 150ms ease; }
  .dash-tabs button.on { background: #ffffff; color: var(--essa-primary); box-shadow: 0 1px 4px rgba(15,23,42,.12); }

  .dash-gstats {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
    margin: 8px 0 6px;
    flex-shrink: 0;
  }
  @media (max-width: 800px) {
    .dash-gstats { grid-template-columns: repeat(auto-fit, minmax(95px, 1fr)); }
  }
  .dash-gstat {
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 6px 10px;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    border-top: 2.5px solid var(--gc);
  }
  .dash-gstat .l { font-size: 0.56rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--neutral-500); }
  .dash-gstat .v { font-size: 0.96rem; font-weight: 900; color: var(--gc); font-variant-numeric: tabular-nums; }
  .dash-gstat .v small { font-size: 0.62rem; font-weight: 700; color: var(--neutral-400); }

  .dash-svg {
    width: 100%;
    max-height: 100%;
    height: auto;
    display: block;
    flex: 1 1 0;
    min-height: 0;
  }
  .dash-grid { stroke: #e8edf5; stroke-width: 1; }
  .dash-grid0 { stroke: #c7d0df; stroke-width: 1.2; stroke-dasharray: 3 3; }
  .dash-ax { font-size: 9.5px; fill: #94a3b8; font-family: inherit; }
  .dash-ax--b { font-weight: 800; fill: #475569; font-size: 10px; }
  .dash-ax--sel { fill: var(--essa-primary); }
  .dash-ax--date { font-size: 8.5px; fill: #94a3b8; }
  .dash-ax--wd { font-size: 8px; fill: #b4bfcf; }
  .dash-val { font-size: 11px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .dash-dif { font-size: 9px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .dash-corona { font-size: 12px; fill: #f59e0b; filter: drop-shadow(0 0 3px rgba(245, 158, 11, 0.5)); }
  .dash-bar { cursor: pointer; transition: opacity 0.12s ease; }
  .dash-bar rect { transition: filter 0.18s ease; }
  .dash-bar:hover rect:first-of-type { filter: brightness(1.08) saturate(1.15); }
  .dash-bar.vacia { cursor: default; opacity: 0.6; }
  .dash-bar.hov { opacity: 1; }
  .dash-dot { transition: r 0.15s ease; }
  .dash-prom { stroke: #1565d8; stroke-width: 1.5; stroke-dasharray: 5 3; opacity: 0.85; }
  .dash-prom-lab { font-size: 10px; font-weight: 800; fill: #ffffff; font-family: inherit; }
  .dash-linea { fill: none; stroke: #1565d8; stroke-width: 2.5; stroke-linejoin: round; stroke-linecap: round; }
  .dash-tip-title { font-size: 11px; font-weight: 800; font-family: inherit; }
  .dash-tip-sub { font-size: 10px; font-family: inherit; }

  .dash-leyenda {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.68rem;
    color: var(--neutral-500);
    margin-top: auto;
    padding-top: 8px;
    border-top: 1px solid var(--border);
    flex-wrap: wrap;
    flex-shrink: 0;
  }
  .dash-rampa { display: inline-block; width: 90px; height: 8px; border-radius: 999px; background: linear-gradient(90deg, #2e9e5b, #7bc043, #f7c600, #f29d38, #d93025); }
  .dash-nota { margin-left: auto; background: var(--neutral-50); border: 1px solid var(--border); border-radius: 999px; padding: 3px 12px; font-size: 0.68rem; }
  .dash-nota b { color: var(--essa-primary); }

  /* ═══ Vencidas (Tarjeta derecha de 03) ═══ */
  .dash-venc .dash-card-title--red { color: #dc2626; }
  .dash-venc { display: flex; flex-direction: column; height: 100%; min-height: 0; }
  .dash-venc-body { display: flex; flex-direction: column; flex: 1 1 0; min-height: 0; overflow: hidden; }

  .dash-venctot {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 10px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    margin-bottom: 8px;
    flex-shrink: 0;
  }
  .dash-venctot .n { font-size: 1.55rem; font-weight: 900; color: #dc2626; font-variant-numeric: tabular-nums; line-height: 1; }
  .dash-venctot .t { font-size: 0.72rem; color: #991b1b; font-weight: 600; line-height: 1.35; }

  .dash-vencdias {
    display: flex;
    gap: 6px;
    flex-wrap: nowrap;
    overflow-x: auto;
    margin-bottom: 8px;
    padding-bottom: 4px;
    flex-shrink: 0;
    scrollbar-width: thin;
    scrollbar-color: #fca5a5 transparent;
  }
  .dash-vencdias::-webkit-scrollbar { height: 4px; }
  .dash-vencdias::-webkit-scrollbar-thumb { background: #fca5a5; border-radius: 999px; }
  .dash-vencdias button {
    flex-shrink: 0;
    border: 1px solid var(--border);
    background: #ffffff;
    border-radius: 999px;
    font-size: 0.66rem;
    font-weight: 700;
    font-family: inherit;
    color: var(--neutral-600);
    padding: 3px 10px;
    cursor: pointer;
    transition: all 150ms ease;
  }
  .dash-vencdias button b { color: #dc2626; }
  .dash-vencdias button:hover { border-color: #f87171; color: var(--neutral-900); }
  .dash-vencdias button.on {
    background: #dc2626;
    border-color: #dc2626;
    color: #ffffff;
    box-shadow: 0 2px 6px rgba(220, 38, 38, 0.25);
  }
  .dash-vencdias button.on b { color: #ffffff; }

  .dash-venclist {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    padding-right: 4px;
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 transparent;
  }
  .dash-venclist::-webkit-scrollbar { width: 5px; }
  .dash-venclist::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
  .dash-venclist::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

  .dash-vencit {
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: #ffffff;
    padding: 7px 11px;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    width: 100%;
    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    transition: all 150ms ease;
  }
  .dash-vencit:hover {
    border-color: #fca5a5;
    box-shadow: 0 3px 10px rgba(220, 38, 38, 0.08);
    transform: translateY(-1px);
  }
  .dash-vencit .tx { flex: 1; min-width: 0; }
  .dash-vencit .r { font-size: 0.74rem; font-weight: 800; color: var(--neutral-900); font-variant-numeric: tabular-nums; }
  .dash-vencit .m { font-size: 0.67rem; color: var(--neutral-500); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
  .dash-vencit .m i { color: var(--neutral-400); font-style: italic; }
  .dash-vencit .d {
    font-size: 0.64rem;
    font-weight: 800;
    color: #ffffff;
    background: #dc2626;
    border-radius: 999px;
    padding: 3px 9px;
    flex-shrink: 0;
    box-shadow: 0 1px 3px rgba(220, 38, 38, 0.25);
  }

  .dash-venc-empty {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 24px 16px;
    background: #f0fdf4;
    border: 1px dashed #86efac;
    border-radius: 12px;
    margin: 4px 0 8px;
  }
  .dash-venc-empty-badge {
    width: 36px;
    height: 36px;
    border-radius: 999px;
    background: #dcfce7;
    color: #16a34a;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1.15rem;
    font-weight: 900;
    margin-bottom: 6px;
  }
  .dash-venc-empty b { color: #166534; font-size: 0.88rem; }
  .dash-venc-empty p { margin: 4px 0 0; color: #15803d; font-size: 0.72rem; }

  .dash-vencpie {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: auto;
    padding-top: 8px;
    border-top: 1px solid var(--border);
    font-size: 0.7rem;
    color: var(--neutral-500);
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  /* ═══ 04 Listados operativos ═══ */
  .dash-diario { display: grid; grid-template-columns: 310px minmax(0, 1fr); gap: 14px; align-items: start; }
  @media (max-width: 1024px) { .dash-diario { grid-template-columns: minmax(0, 1fr); } }

  /* Barra de notas del bloque derecho */
  .dash-notas-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px dashed var(--border); }
  .dash-notas-bar-txt { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .dash-notas-bar-txt b { font-size: 0.8rem; font-weight: 800; color: var(--neutral-900); }
  .dash-notas-bar-txt span { font-size: 0.7rem; color: var(--neutral-500); }
  .dash-notas-btn { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--essa-primary-100); background: var(--essa-primary-50); color: var(--essa-primary); font-size: 0.74rem; font-weight: 700; font-family: inherit; white-space: nowrap; cursor: pointer; transition: background 150ms ease, border-color 150ms ease, color 150ms ease, box-shadow 150ms ease; }
  .dash-notas-btn:hover { background: var(--essa-primary); border-color: var(--essa-primary); color: #ffffff; box-shadow: 0 4px 12px rgba(0, 75, 147, 0.25); }
  .dash-notas-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(0, 75, 147, 0.25); }
  .dash-dias { display: flex; flex-direction: column; gap: 5px; max-height: 540px; overflow-y: auto; padding-right: 4px; scrollbar-width: thin; }
  .dash-sepdias { font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: var(--neutral-400); margin: 8px 0 2px; }
  .dash-sepdias--rojo { color: #dc2626; }
  .dash-dia { display: flex; align-items: center; gap: 10px; border: 1px solid var(--border); border-radius: 10px; background: #ffffff; padding: 7px 10px; font-family: inherit; text-align: left; transition: all 150ms ease; }
  .dash-dia:not(:disabled) { cursor: pointer; }
  .dash-dia:not(:disabled):hover { border-color: var(--essa-primary); transform: translateX(2px); }
  .dash-dia:disabled { cursor: default; }
  .dash-dia.on { border-color: var(--essa-primary); box-shadow: 0 0 0 2px rgba(0,75,147,.16); background: #f8fbff; }
  .dash-dia.venc { border-color: #fecaca; background: #fffafa; }
  .dash-dia.cero { opacity: .55; }
  .dash-dia-md { display: flex; flex-direction: column; align-items: center; min-width: 30px; }
  .dash-dia-md b { font-size: 0.95rem; font-weight: 900; color: var(--neutral-900); }
  .dash-dia-md i { font-style: normal; font-size: 0.58rem; font-weight: 700; color: var(--neutral-400); }
  .dash-dia.venc .dash-dia-md b { color: #dc2626; }
  .dash-dia-inf { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .dash-dia-inf .f { font-size: 0.68rem; font-weight: 700; color: var(--neutral-700); font-variant-numeric: tabular-nums; }
  .dash-dia-inf .s { font-size: 0.62rem; color: var(--neutral-400); display: flex; align-items: center; gap: 6px; }
  .dash-dia-inf .bar { flex: 1; height: 4px; border-radius: 999px; background: var(--neutral-100); overflow: hidden; }
  .dash-dia-inf .bar i { display: block; height: 100%; background: var(--essa-primary); border-radius: 999px; }
  .dash-dia.venc .dash-dia-inf .bar i { background: #dc2626; }
  .dash-dia-cf { text-align: right; }
  .dash-dia-cf b { display: block; font-size: 0.9rem; font-weight: 900; color: var(--neutral-900); font-variant-numeric: tabular-nums; }
  .dash-dia-cf span { font-size: 0.58rem; font-weight: 700; color: var(--neutral-400); text-transform: uppercase; }

  .dash-dayempty { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 56px 20px; text-align: center; color: var(--neutral-500); }
  .dash-dayempty b { color: var(--neutral-800); }
  .dash-dayhero { display: flex; align-items: center; gap: 12px; background: linear-gradient(135deg, #eff6ff 0%, #ffffff 70%); border: 1px solid #dbeafe; border-radius: 12px; padding: 12px 16px; margin-bottom: 12px; flex-wrap: wrap; }
  .dash-dayhero.venc { background: linear-gradient(135deg, #fef2f2 0%, #ffffff 70%); border-color: #fecaca; }
  .dash-daymed { display: flex; flex-direction: column; align-items: center; background: var(--essa-primary); color: #fff; border-radius: 10px; padding: 6px 12px; }
  .dash-dayhero.venc .dash-daymed { background: #dc2626; }
  .dash-daymed b { font-size: 1.15rem; font-weight: 900; line-height: 1; }
  .dash-daymed i { font-style: normal; font-size: 0.58rem; font-weight: 700; }
  .dash-daymeta { font-size: 0.72rem; color: var(--neutral-500); }
  .dash-daymeta b { color: var(--neutral-900); }
  .dash-daychips { display: flex; gap: 6px; flex-wrap: wrap; margin-left: auto; }
  .dash-rchip { display: inline-flex; align-items: center; gap: 6px; font-size: 0.66rem; font-weight: 700; color: var(--neutral-600); background: #fff; border: 1px solid var(--border); border-radius: 999px; padding: 3px 10px; }
  .dash-rchip i { width: 8px; height: 8px; border-radius: 999px; background: var(--cc); }
  .dash-rchip b { color: var(--neutral-900); }
  .dash-daytools { display: flex; gap: 8px; margin-bottom: 10px; }
  .dash-daytools input { flex: 1; height: 36px; border-radius: 8px; border: 1px solid var(--border); padding: 0 12px; font-size: 0.78rem; font-family: inherit; outline: none; transition: all 150ms ease; }
  .dash-daytools input:focus { border-color: var(--essa-primary); box-shadow: 0 0 0 3px rgba(0,75,147,.12); }
  .dash-daylist { display: flex; flex-direction: column; gap: 8px; max-height: 460px; overflow-y: auto; padding-right: 4px; scrollbar-width: thin; }
  .dash-radcard { display: flex; align-items: center; gap: 10px; border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; background: #fff; transition: all 150ms ease; }
  .dash-radcard:hover { border-color: #93c5fd; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,75,147,.06); }
  .dash-radmain { flex: 1; min-width: 0; }
  .dash-radln1 { display: flex; align-items: center; gap: 8px; }
  .dash-radnum { font-size: 0.8rem; font-weight: 800; color: var(--neutral-900); font-variant-numeric: tabular-nums; }
  .dash-radln2 { display: flex; align-items: center; gap: 7px; font-size: 0.7rem; color: var(--neutral-500); margin-top: 3px; flex-wrap: wrap; }
  .dash-medio { font-size: 0.64rem; font-weight: 800; border: 1px solid; border-radius: 999px; padding: 1px 8px; }
  .dash-sep { color: var(--neutral-300); }
  .dash-dayfoot { font-size: 0.7rem; color: var(--neutral-500); margin: 10px 0 0; }
  .dash-chart-empty { padding: 24px 12px; text-align: center; color: var(--neutral-400); font-size: 0.78rem; }
  .dash-vacio { color: var(--neutral-400); font-size: 0.76rem; }

  /* ═══ Botón de Análisis & Modal de Análisis ═══ */
  .dash-anal-btn { display: inline-flex; align-items: center; gap: 12px; border: 1px solid #bfdbfe; background: linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%); border-radius: 14px; padding: 8px 16px; cursor: pointer; font-family: inherit; text-align: left; box-shadow: 0 1px 4px rgba(0,75,147,.08); transition: all 150ms ease; }
  .dash-anal-btn:hover { border-color: var(--essa-primary); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,75,147,.16); }
  .dash-anal-btn-tx { display: flex; flex-direction: column; }
  .dash-anal-btn-tx b { font-size: 0.76rem; color: var(--essa-primary); }
  .dash-anal-btn-tx i { font-style: normal; font-size: 0.66rem; color: var(--neutral-500); }

  .dash-anal-head-left { display: flex; align-items: center; gap: 14px; min-width: 0; }
  .dash-anal-hero-icon { width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, var(--essa-primary) 0%, #0e6ad1 100%); color: #fff; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 14px rgba(0,75,147,.28); }
  .dash-anal-scroll { max-height: calc(88vh - 120px); }
  .dash-anal-body { padding: 18px 24px 20px; display: flex; flex-direction: column; gap: 14px; }
  .dash-anal-top { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1px; background: var(--neutral-100); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
  .dash-anal-stat { position: relative; background: #fff; border: none; padding: 14px 16px 12px; display: flex; flex-direction: column; gap: 2px; text-align: left; font-family: inherit; transition: background .15s ease; }
  .dash-anal-stat::before { content: ""; position: absolute; inset: auto 0 0 0; height: 3px; background: var(--ac); transform: scaleX(0); transition: transform .25s ease; }
  button.dash-anal-stat { cursor: pointer; }
  button.dash-anal-stat:hover { background: color-mix(in srgb, var(--ac) 6%, #fff); }
  button.dash-anal-stat:hover::before { transform: scaleX(1); }
  .dash-anal-stat .l { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: var(--neutral-500); }
  .dash-anal-stat .v { font-size: 1.25rem; font-weight: 900; color: var(--ac); font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
  .dash-anal-stat .h { font-size: 0.64rem; color: var(--neutral-400); }
  .dash-anal-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 14px; }
  .dash-anal-card { grid-column: span 4; border: 1px solid var(--border); border-radius: 14px; padding: 16px 18px; min-width: 0; background: #fff; display: flex; flex-direction: column; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
  .dash-anal-card--wide { grid-column: span 12; }
  @media (max-width: 1180px) { .dash-anal-card { grid-column: span 6; } }
  @media (max-width: 900px) { .dash-anal-card, .dash-anal-card--wide { grid-column: span 12; } }
  .dash-anal-card h4 { margin: 0; font-size: 0.84rem; font-weight: 800; letter-spacing: -0.01em; color: var(--neutral-900); }
  .dash-anal-card .hint { display: block; font-size: 0.66rem; color: var(--neutral-400); margin: 3px 0 12px; }
  .dash-rank { display: flex; flex-direction: column; gap: 4px; max-height: 280px; overflow-y: auto; padding-right: 4px; scrollbar-width: thin; }
  .dash-rank-it { display: block; width: 100%; background: none; border: none; border-radius: 9px; padding: 6px 8px; cursor: pointer; font-family: inherit; text-align: left; transition: background .15s; }
  .dash-rank-it:hover { background: var(--neutral-50); }
  .dash-rank-top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; font-size: 0.74rem; }
  .dash-rank-name { color: var(--neutral-700); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dash-rank-top b { color: var(--neutral-900); font-variant-numeric: tabular-nums; }
  .dash-rank-track { display: block; height: 7px; border-radius: 999px; background: var(--neutral-100); margin-top: 5px; overflow: hidden; }
  .dash-rank-track i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--essa-primary), #0e6ad1); }
  .dash-donut-wrap { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
  .dash-donut { width: 172px; height: 172px; flex-shrink: 0; }
  .dash-donut-num { font-size: 30px; font-weight: 900; fill: #0f172a; font-variant-numeric: tabular-nums; }
  .dash-donut-lab { font-size: 12px; fill: #94a3b8; }
  .dash-legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 190px; }
  .dash-legend li { display: block; }
  .dash-legend-btn { display: flex; align-items: center; gap: 9px; width: 100%; background: none; border: none; border-radius: 9px; padding: 6px 8px; cursor: pointer; font-family: inherit; font-size: 0.74rem; color: var(--neutral-600); text-align: left; transition: background .15s; }
  .dash-legend-btn:hover { background: var(--neutral-50); }
  .dash-legend-btn strong { margin-left: auto; color: var(--neutral-900); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .dash-dot { width: 10px; height: 10px; border-radius: 999px; flex-shrink: 0; }
  .dash-legend-name { flex: 1; min-width: 0; }
  .dash-matriz { display: flex; flex-direction: column; gap: 5px; }
  .dash-mfila { display: flex; align-items: center; gap: 10px; border-radius: 8px; padding: 5px 6px; transition: background .15s; }
  .dash-mfila:hover { background: var(--neutral-50); }
  .dash-mnom { width: 180px; flex-shrink: 0; font-size: 0.72rem; font-weight: 600; color: var(--neutral-700); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dash-mbarras { flex: 1; display: flex; height: 16px; border-radius: 999px; overflow: hidden; background: var(--neutral-100); min-width: 0; }
  .dash-mbarras span { display: block; height: 100%; cursor: pointer; transition: filter .15s; }
  .dash-mbarras span:hover { filter: brightness(1.18); }
  .dash-mtot { font-size: 0.76rem; font-weight: 800; color: var(--neutral-900); min-width: 40px; text-align: right; font-variant-numeric: tabular-nums; background: var(--neutral-50); border-radius: 7px; padding: 2px 8px; }
  .dash-mleyenda { display: flex; gap: 14px; flex-wrap: wrap; font-size: 0.66rem; color: var(--neutral-500); margin-top: 6px; padding-top: 10px; border-top: 1px solid var(--neutral-100); }
  .dash-mleyenda i { display: inline-block; width: 9px; height: 9px; border-radius: 3px; margin-right: 5px; }
  .dash-scroll-anchor { scroll-margin-top: 90px; }

  @media (prefers-reduced-motion: reduce) {
    .dash-anim { animation: none; }
  }
`;

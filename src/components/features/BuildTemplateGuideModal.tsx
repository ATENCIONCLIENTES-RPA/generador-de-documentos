import { useMemo, useRef, useState } from 'react';
import type React from 'react';
import { Modal } from '@/components/ui/Modal';

type Category = 'Solicitante' | 'Trámite' | 'Observaciones';

interface FieldInfo {
  key: string;
  label: string;
  icon: string;
  category: Category;
  what: string;
  exampleIn: string;
  exampleOut: string;
}

const FIELDS: FieldInfo[] = [
  {
    key: 'NOMBRE_SOLICITANTE',
    label: 'Nombre del solicitante',
    icon: '👤',
    category: 'Solicitante',
    what: 'Trae el nombre del cliente o solicitante.',
    exampleIn: 'Estimado(a) [NOMBRE_SOLICITANTE]',
    exampleOut: 'Estimado(a) Juan Pérez',
  },
  {
    key: 'DIRECCION_SOLICITANTE',
    label: 'Dirección',
    icon: '📍',
    category: 'Solicitante',
    what: 'Trae la dirección registrada del solicitante.',
    exampleIn: 'Inmueble ubicado en: [DIRECCION_SOLICITANTE]',
    exampleOut: 'Inmueble ubicado en: Carrera 27 # 45-12, Bucaramanga',
  },
  {
    key: 'MUNICIPIO_SOLICITANTE',
    label: 'Municipio',
    icon: '🏘️',
    category: 'Solicitante',
    what: 'Trae el municipio del solicitante.',
    exampleIn: 'Ciudad de atención: [MUNICIPIO_SOLICITANTE]',
    exampleOut: 'Ciudad de atención: Bucaramanga',
  },
  {
    key: 'DEPARTAMENTO_SOLICITANTE',
    label: 'Departamento',
    icon: '🗺️',
    category: 'Solicitante',
    what: 'Trae el departamento del solicitante.',
    exampleIn: 'Departamento: [DEPARTAMENTO_SOLICITANTE]',
    exampleOut: 'Departamento: Santander',
  },
  {
    key: 'TELEFONO_SOLICITANTE',
    label: 'Teléfono',
    icon: '📞',
    category: 'Solicitante',
    what: 'Trae el número de teléfono registrado.',
    exampleIn: 'Línea de contacto: [TELEFONO_SOLICITANTE]',
    exampleOut: 'Línea de contacto: 3187459021',
  },
  {
    key: 'CORREO SOLICITANTE',
    label: 'Correo electrónico',
    icon: '✉️',
    category: 'Solicitante',
    what: 'Trae el correo electrónico registrado.',
    exampleIn: 'Notificación enviada a: [CORREO SOLICITANTE]',
    exampleOut: 'Notificación enviada a: carrillojc@correo.com',
  },
  {
    key: 'RADICADO_ENTRADA',
    label: 'Radicado de entrada',
    icon: '🔖',
    category: 'Trámite',
    what: 'Trae el número de radicado de entrada.',
    exampleIn: 'Radicado: [RADICADO_ENTRADA]',
    exampleOut: 'Radicado: RAD-2026-00125',
  },
  {
    key: 'FECHA_SOLICITUD',
    label: 'Fecha de solicitud',
    icon: '📅',
    category: 'Trámite',
    what: 'Trae la fecha en la que se realizó la solicitud.',
    exampleIn: 'Fecha: [FECHA_SOLICITUD]',
    exampleOut: 'Fecha: 27 de agosto de 2026',
  },
  {
    key: 'NUMERO_CUENTA',
    label: 'Número de cuenta',
    icon: '🏦',
    category: 'Trámite',
    what: 'Trae el número de cuenta asociado.',
    exampleIn: 'Cuenta: [NUMERO_CUENTA]',
    exampleOut: 'Cuenta: 3001458921',
  },
  {
    key: 'NUMERO_PROCESO',
    label: 'Número de proceso',
    icon: '📄',
    category: 'Trámite',
    what: 'Trae el número del proceso creado en SAC.',
    exampleIn: 'Número de proceso: [NUMERO_PROCESO]',
    exampleOut: 'Número de proceso: PROC-2026-00125',
  },
  {
    key: 'OBSERVACION_PROCESO',
    label: 'Descripción / observación',
    icon: '📝',
    category: 'Observaciones',
    what: 'Trae la descripción u observación registrada para la solicitud.',
    exampleIn: 'Asunto: [OBSERVACION_PROCESO]',
    exampleOut: 'Asunto: Solicitud de revisión de medidor',
  },
  {
    key: 'OBSERVACION_REVISION',
    label: 'Observación de revisión',
    icon: '🔍',
    category: 'Observaciones',
    what: 'Trae la observación registrada durante la revisión del insumo.',
    exampleIn: 'Revisión: [OBSERVACION_REVISION]',
    exampleOut: 'Revisión: Inspección realizada con éxito',
  },
  {
    key: 'OBSERVACION_DECISION',
    label: 'Observación de decisión',
    icon: '⚖️',
    category: 'Observaciones',
    what: 'Trae la observación asociada a la decisión tomada.',
    exampleIn: 'Decisión: [OBSERVACION_DECISION]',
    exampleOut: 'Decisión: Se aprueba el ajuste solicitado',
  },
];

const CATEGORIES: Array<'Todas' | Category> = ['Todas', 'Solicitante', 'Trámite', 'Observaciones'];

const CATEGORY_STYLE: Record<Category, { bg: string; border: string; color: string }> = {
  Solicitante: { bg: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8' },
  Trámite: { bg: '#F0FDF4', border: '#BBF7D0', color: '#15803D' },
  Observaciones: { bg: '#FFFBEB', border: '#FDE68A', color: '#92400E' },
};

const SAMPLE_VALUES: Record<string, string> = {
  NOMBRE_SOLICITANTE: 'Juan Carlos Carrillo Palacio',
  DIRECCION_SOLICITANTE: 'Carrera 27 # 45-12, Bucaramanga',
  MUNICIPIO_SOLICITANTE: 'Bucaramanga',
  DEPARTAMENTO_SOLICITANTE: 'Santander',
  TELEFONO_SOLICITANTE: '3187459021',
  'CORREO SOLICITANTE': 'carrillojc@correo.com',
  CORREO_SOLICITANTE: 'carrillojc@correo.com',
  RADICADO_ENTRADA: 'RAD-2025-01452',
  FECHA_SOLICITUD: '27 de agosto de 2026',
  NUMERO_CUENTA: '3001458921',
  NUMERO_PROCESO: 'PROC-2025-0891',
  OBSERVACION_PROCESO: 'Solicitud de revisión de medidor por cobro elevado',
  OBSERVACION_REVISION: 'Inspección realizada con éxito',
  OBSERVACION_DECISION: 'Se aprueba el ajuste solicitado',
};

const SIMULATOR_DEFAULT =
  'Estimado(a) [NOMBRE_SOLICITANTE],\n\nNos dirigimos a usted respecto a la solicitud con radicado [RADICADO_ENTRADA] y proceso [NUMERO_PROCESO], asociada a su cuenta [NUMERO_CUENTA].';

const DRAFT_EXAMPLE =
  'Bucaramanga, [FECHA_SOLICITUD]\n\nSeñor(a)\n[NOMBRE_SOLICITANTE]\n[DIRECCION_SOLICITANTE]\n[MUNICIPIO_SOLICITANTE] - [DEPARTAMENTO_SOLICITANTE]\n\nAsunto: Respuesta al radicado No. [RADICADO_ENTRADA]\n\nEstimado(a) [NOMBRE_SOLICITANTE]:\n\nEn atención a su solicitud, asociada a la cuenta [NUMERO_CUENTA] y proceso [NUMERO_PROCESO], nos permitimos informar: [OBSERVACION_DECISION]\n\nNotificación enviada a: [CORREO SOLICITANTE]';

const STEPS = [
  {
    n: '1',
    icon: '📝',
    kicker: 'PASO INICIAL',
    kickerColor: '#64748B',
    title: 'Crea o edita tu documento de Word',
    text: 'Abre Microsoft Word en tu equipo. Puedes diseñar tu documento como quieras: añade el membrete de ESSA, tablas, pies de página o párrafos estándar.',
    tip: '📄 Guarda el archivo en formato estándar .docx',
    tipBg: '#F8FAFC',
    tipBorder: '#E2E8F0',
  },
  {
    n: '2',
    icon: '✨',
    kicker: 'CAMPOS DINÁMICOS',
    kickerColor: '#D97706',
    title: 'Agrega los campos en tu texto',
    text: 'En los lugares donde quieras que aparezcan datos variables, escribe la etiqueta entre corchetes, por ejemplo: [NOMBRE_SOLICITANTE] o [NUMERO_PROCESO].',
    tip: '💡 Los campos actúan como espacios que SAC rellenará automáticamente.',
    tipBg: '#FFFBEB',
    tipBorder: '#FDE68A',
  },
  {
    n: '3',
    icon: '📁',
    kicker: 'ALMACENAMIENTO',
    kickerColor: '#7C3AED',
    title: 'Guarda tu plantilla en la carpeta configurada',
    text: 'Guarda el archivo en la carpeta oficial de plantillas seleccionada en el Módulo 2: Configuración.',
    tip: '📁 Puedes crear subcarpetas o tener varias versiones de cartas.',
    tipBg: '#FAF5FF',
    tipBorder: '#E9D5FF',
    showFolder: true,
  },
  {
    n: '4',
    icon: '✅',
    kicker: '¡LISTO PARA USAR!',
    kickerColor: '#059669',
    title: '¡Listo! 🎉 La plantilla quedará disponible en Word',
    text: 'Al entrar o refrescar el Módulo 4: Generación Documental, tu nuevo documento aparecerá en el catálogo listo para seleccionarse y generar el documento final.',
    tip: '✨ ¡Podrás previsualizarlo y fusionar cientos de registros en segundos!',
    tipBg: '#F0FDF4',
    tipBorder: '#BBF7D0',
  },
];

type TabId = 'pasos' | 'campos' | 'simulador';

interface Props {
  open: boolean;
  onClose: () => void;
  folderHint?: string;
}

export function BuildTemplateGuideModal({ open, onClose, folderHint }: Props) {
  const [tab, setTab] = useState<TabId>('pasos');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'Todas' | Category>('Todas');
  const [copied, setCopied] = useState<string | null>(null);
  const [draftCopied, setDraftCopied] = useState(false);
  const [simText, setSimText] = useState(SIMULATOR_DEFAULT);
  const [simView, setSimView] = useState<'word' | 'sac'>('sac');
  const simRef = useRef<HTMLTextAreaElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FIELDS.filter((f) => {
      const matchCat = category === 'Todas' || f.category === category;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        f.key.toLowerCase().includes(q) ||
        f.label.toLowerCase().includes(q) ||
        f.what.toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  const simTokens = useMemo(() => {
    const parts = simText.split(/(\[[A-Z0-9_ ]+\])/g);
    return parts.map((part, i) => {
      const m = part.match(/^\[([A-Z0-9_ ]+)\]$/);
      if (!m) return { i, raw: part, key: null as string | null };
      const key = m[1]!.trim().replace(/\s+/g, '_').toUpperCase();
      const canonical =
        key === 'CORREO_SOLICITANTE' && !(key in SAMPLE_VALUES) ? 'CORREO SOLICITANTE' : key;
      return { i, raw: part, key: canonical };
    });
  }, [simText]);

  const copyText = async (
    text: string,
    key: string,
    setCopiedFn: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopiedFn(key);
    setTimeout(() => setCopiedFn((c) => (c === key ? null : c)), 1500);
  };

  const insertField = (key: string) => {
    const token = `[${key}]`;
    const el = simRef.current;
    if (!el) {
      setSimText((t) => (t.endsWith(' ') || t.length === 0 ? `${t}${token}` : `${t} ${token}`));
      return;
    }
    const start = el.selectionStart ?? simText.length;
    const end = el.selectionEnd ?? simText.length;
    const next = `${simText.slice(0, start)}${token}${simText.slice(end)}`;
    setSimText(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const tabs: Array<{ id: TabId; n: string; label: string; icon: string }> = [
    { id: 'pasos', n: '1', label: '¿Cómo crear mi plantilla? (4 Pasos)', icon: '📖' },
    { id: 'campos', n: '2', label: `Campos Disponibles (${FIELDS.length})`, icon: '🧩' },
    { id: 'simulador', n: '3', label: 'Ejemplos Visuales & Simulador', icon: '▶' },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="¡Crea tu propia plantilla! 🎨"
      variant="brand"
      icon={
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
          <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
          <path d="M5 16l.7 1.8L7.5 18.5l-1.8.7L5 21l-.7-1.8L2.5 18.5l1.8-.7L5 16z" />
        </svg>
      }
      width={780}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <style>{`
          @keyframes tv-build-shine { 0% { transform: translateX(-140%) skewX(-12deg); opacity: 0 } 15% { opacity: 1 } 50% { transform: translateX(140%) skewX(-12deg); opacity: 0 } 100% { transform: translateX(140%) skewX(-12deg); opacity: 0 } }
          .tv-guide-tab { transition: color 150ms var(--ease), border-color 150ms var(--ease), background 150ms var(--ease); }
          .tv-guide-tab:hover { color: #004B93; }
          .tv-guide-step, .tv-guide-card { transition: transform 180ms var(--ease), box-shadow 180ms var(--ease), border-color 180ms var(--ease); }
          .tv-guide-step:hover, .tv-guide-card:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(0,75,147,.08); border-color: #bfdbfe !important; }
          .tv-guide-chip { transition: background 150ms var(--ease), border-color 150ms var(--ease), transform 120ms var(--ease); }
          .tv-guide-chip:hover { background: #EFF6FF !important; border-color: #93C5FD !important; transform: translateY(-1px); }
          .tv-guide-chip:active { transform: scale(.96); }
          @media (max-width: 640px) { .tv-guide-grid-2 { grid-template-columns: 1fr !important; } .tv-guide-steps { grid-template-columns: 1fr !important; } }
          @media (prefers-reduced-motion: reduce) { .tv-guide-step, .tv-guide-card, .tv-guide-chip, .tv-guide-tab { transition: none !important; } .tv-guide-step:hover, .tv-guide-card:hover { transform: none !important; } }
        `}</style>

        <div
          role="tablist"
          aria-label="Secciones de la guía"
          style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E2E8F0', overflowX: 'auto' }}
        >
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                data-testid={`tv-guide-tab-${t.id}`}
                className="tv-guide-tab"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 10px',
                  background: 'none',
                  border: 'none',
                  borderBottom: active ? '2px solid #004B93' : '2px solid transparent',
                  color: active ? '#004B93' : '#64748B',
                  fontSize: '0.76rem',
                  fontWeight: active ? 800 : 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <span aria-hidden>{t.icon}</span>
                {t.n}. {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'pasos' && (
          <div role="tabpanel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: '0.78rem', color: '#64748B', lineHeight: 1.5 }}>
              El sistema únicamente buscará las palabras encerradas en corchetes como{' '}
              <code
                style={{
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: 6,
                  padding: '0 5px',
                  fontSize: '0.74rem',
                  color: '#004B93',
                  fontWeight: 700,
                }}
              >
                [NOMBRE_SOLICITANTE]
              </code>{' '}
              y colocará allí la información real del caso.
            </div>
            <div
              className="tv-guide-steps"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}
              data-testid="tv-guide-steps"
            >
              {STEPS.map((s) => (
                <div
                  key={s.n}
                  className="tv-guide-step"
                  style={{
                    background: '#fff',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 999,
                        background: '#EFF6FF',
                        border: '1px solid #DBEAFE',
                        color: '#004B93',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {s.n}
                    </span>
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        letterSpacing: '0.05em',
                        color: s.kickerColor,
                      }}
                    >
                      {s.kicker}
                    </span>
                  </div>
                  <strong style={{ fontSize: '0.8rem', color: '#0f172a' }}>
                    {s.icon} {s.title}
                  </strong>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.5 }}>
                    {s.text}
                  </span>
                  <div
                    style={{
                      background: s.tipBg,
                      border: `1px solid ${s.tipBorder}`,
                      borderRadius: 8,
                      padding: '7px 9px',
                      fontSize: '0.72rem',
                      color: '#475569',
                      lineHeight: 1.45,
                    }}
                  >
                    {s.tip}
                    {s.showFolder && folderHint ? (
                      <span
                        style={{
                          display: 'block',
                          marginTop: 4,
                          fontFamily: 'monospace',
                          color: '#7C3AED',
                          wordBreak: 'break-all',
                        }}
                      >
                        {folderHint}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '10px 12px',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: '0.76rem', color: '#334155' }}>
                <strong>¿Qué etiquetas puedo escribir en mi Word?</strong>
                <br />
                Conoce los 13 campos disponibles con ejemplos y copia sus nombres con un solo clic.
              </span>
              <button
                type="button"
                onClick={() => setTab('campos')}
                data-testid="tv-guide-goto-campos"
                style={{
                  marginLeft: 'auto',
                  height: 34,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: '1px solid #004B93',
                  background: '#004B93',
                  color: '#fff',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Ver Campos Disponibles →
              </button>
            </div>
          </div>
        )}

        {tab === 'campos' && (
          <div role="tabpanel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '0.84rem', color: '#0f172a' }}>
                Campos Disponibles para Word
              </strong>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#004B93',
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: 999,
                  padding: '1px 8px',
                }}
              >
                {filtered.length} de {FIELDS.length}
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar campo…"
                aria-label="Buscar campo de plantilla"
                data-testid="tv-guide-search"
                style={{
                  flex: '1 1 160px',
                  height: 34,
                  borderRadius: 8,
                  border: '1px solid var(--border-strong)',
                  padding: '0 10px',
                  fontSize: '0.78rem',
                  outline: 'none',
                }}
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as 'Todas' | Category)}
                aria-label="Filtrar por categoría"
                data-testid="tv-guide-category"
                style={{
                  height: 34,
                  borderRadius: 8,
                  border: '1px solid var(--border-strong)',
                  padding: '0 8px',
                  fontSize: '0.76rem',
                  outline: 'none',
                  background: '#fff',
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c === 'Todas' ? 'Todas las categorías' : c}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
              Haz clic en “Copiar” para pegar la etiqueta directamente en tu archivo Word.
            </div>
            <div
              className="tv-guide-grid-2"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                maxHeight: 340,
                overflowY: 'auto',
                paddingRight: 2,
              }}
              data-testid="tv-guide-fields"
            >
              {filtered.length === 0 ? (
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: '#94a3b8',
                    textAlign: 'center',
                    padding: 12,
                    gridColumn: '1 / -1',
                  }}
                >
                  Sin resultados para “{query}”.
                </div>
              ) : (
                filtered.map((f) => {
                  const cs = CATEGORY_STYLE[f.category];
                  return (
                    <div
                      key={f.key}
                      className="tv-guide-card"
                      data-testid={`tv-guide-field-${f.key}`}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        background: '#fff',
                        padding: '9px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <span style={{ fontSize: '0.95rem', flexShrink: 0 }} aria-hidden>
                          {f.icon}
                        </span>
                        <code
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            color: '#004B93',
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            borderRadius: 6,
                            padding: '1px 6px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          [{f.key}]
                        </code>
                        <button
                          type="button"
                          onClick={() => copyText(`[${f.key}]`, f.key, setCopied)}
                          title={`Copiar [${f.key}]`}
                          data-testid={`tv-guide-copy-${f.key}`}
                          style={{
                            marginLeft: 'auto',
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            color: copied === f.key ? '#15803d' : '#475569',
                            background: copied === f.key ? '#DCFCE7' : '#F8FAFC',
                            border: `1px solid ${copied === f.key ? '#86EFAC' : '#E2E8F0'}`,
                            borderRadius: 999,
                            padding: '2px 8px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          {copied === f.key ? 'Copiado' : 'Copiar'}
                        </button>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#334155' }}>→ {f.what}</div>
                      <div
                        style={{
                          background: '#F8FAFC',
                          border: '1px dashed #CBD5E1',
                          borderRadius: 7,
                          padding: '5px 7px',
                          fontSize: '0.7rem',
                          color: '#475569',
                        }}
                      >
                        En tu Word:{' '}
                        <span style={{ fontFamily: 'Georgia, serif', color: '#0f172a' }}>
                          {f.exampleIn}
                        </span>
                      </div>
                      <div
                        style={{
                          background: '#F0FDF4',
                          border: '1px solid #BBF7D0',
                          borderRadius: 7,
                          padding: '5px 7px',
                          fontSize: '0.7rem',
                          color: '#475569',
                        }}
                      >
                        SAC genera:{' '}
                        <span
                          style={{
                            fontFamily: 'Georgia, serif',
                            color: '#0f172a',
                            background: '#DCFCE7',
                            borderRadius: 4,
                            padding: '0 4px',
                          }}
                        >
                          {f.exampleOut.replace(/^[^:]+:\s*/, '')}
                        </span>
                      </div>
                      <span
                        style={{
                          alignSelf: 'flex-start',
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          color: cs.color,
                          background: cs.bg,
                          border: `1px solid ${cs.border}`,
                          borderRadius: 999,
                          padding: '1px 7px',
                        }}
                      >
                        {f.category}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            <div
              style={{
                fontSize: '0.72rem',
                color: '#92400E',
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: 8,
                padding: '8px 10px',
                lineHeight: 1.5,
              }}
            >
              💡 <strong>Campos complementarios de perfil:</strong> También puedes usar{' '}
              <code>[NOMBRE_FIRMANTE]</code>, <code>[CARGO_FIRMANTE]</code> y{' '}
              <code>[FIRMA_DOCUMENTO]</code> para insertar automáticamente tu firma y cargo
              configurados en el Módulo 1.
            </div>
          </div>
        )}

        {tab === 'simulador' && (
          <div role="tabpanel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}
              className="tv-guide-grid-2"
            >
              {[
                {
                  campo: '[NOMBRE_SOLICITANTE]',
                  icon: '👤',
                  what: 'Trae automáticamente el nombre del cliente y lo coloca en el documento de Word.',
                  escribes: 'Estimado(a) [NOMBRE_SOLICITANTE]',
                  convierte: 'Estimado(a) Juan Pérez',
                  accent: '#004B93',
                  bg: '#EFF6FF',
                  border: '#BFDBFE',
                },
                {
                  campo: '[NUMERO_PROCESO]',
                  icon: '📄',
                  what: 'Trae automáticamente el número del proceso creado en SAC.',
                  escribes: 'Número de proceso: [NUMERO_PROCESO]',
                  convierte: 'Número de proceso: PROC-2026-00125',
                  accent: '#7C3AED',
                  bg: '#FAF5FF',
                  border: '#E9D5FF',
                },
              ].map((e) => (
                <div
                  key={e.campo}
                  className="tv-guide-card"
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    background: '#fff',
                    padding: '10px 11px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      color: '#0f172a',
                    }}
                  >
                    <span
                      style={{
                        background: e.bg,
                        border: `1px solid ${e.border}`,
                        color: e.accent,
                        borderRadius: 6,
                        padding: '1px 6px',
                        fontFamily: 'monospace',
                        fontSize: '0.7rem',
                      }}
                    >
                      Campo: {e.campo}
                    </span>
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '0.7rem',
                        color: '#64748B',
                        fontWeight: 600,
                      }}
                    >
                      {e.icon} ¿Qué hace?
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#475569' }}>{e.what}</div>
                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 8,
                      padding: '7px 8px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        color: '#64748B',
                        letterSpacing: '0.04em',
                        marginBottom: 3,
                      }}
                    >
                      EN TU WORD ESCRIBES:
                    </div>
                    <div
                      style={{
                        fontSize: '0.76rem',
                        background: '#fff',
                        border: '1px solid #E2E8F0',
                        borderRadius: 6,
                        padding: '5px 8px',
                        fontFamily: 'Georgia, serif',
                      }}
                    >
                      {e.escribes}
                    </div>
                    <div
                      style={{
                        textAlign: 'center',
                        color: '#059669',
                        fontWeight: 800,
                        margin: '4px 0 0',
                      }}
                    >
                      ↓
                    </div>
                    <div
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        color: '#059669',
                        letterSpacing: '0.04em',
                        marginBottom: 3,
                      }}
                    >
                      Y EL SISTEMA LO CONVIERTE EN:
                    </div>
                    <div
                      style={{
                        fontSize: '0.76rem',
                        background: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        borderRadius: 6,
                        padding: '5px 8px',
                        fontFamily: 'Georgia, serif',
                      }}
                    >
                      {e.convierte}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 12,
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>
                  🧪 Simulador Interactivo de Sustitución
                </strong>
                <div
                  style={{
                    marginLeft: 'auto',
                    display: 'flex',
                    gap: 4,
                    background: '#F1F5F9',
                    borderRadius: 999,
                    padding: 3,
                  }}
                >
                  {(['word', 'sac'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSimView(v)}
                      aria-pressed={simView === v}
                      data-testid={`tv-sim-view-${v}`}
                      style={{
                        border: 'none',
                        borderRadius: 999,
                        padding: '4px 10px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: simView === v ? '#fff' : 'transparent',
                        color: simView === v ? '#0f172a' : '#64748B',
                        boxShadow: simView === v ? '0 1px 3px rgba(0,0,0,.12)' : 'none',
                      }}
                    >
                      {v === 'word' ? '📄 Vista Word (Campos)' : '✨ Vista SAC (Convertido)'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                Escribe un fragmento de tu Word con campos entre corchetes y observa la
                transformación en vivo.
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>
                Insertar campo en el texto:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {[
                  'NOMBRE_SOLICITANTE',
                  'DIRECCION_SOLICITANTE',
                  'MUNICIPIO_SOLICITANTE',
                  'DEPARTAMENTO_SOLICITANTE',
                  'TELEFONO_SOLICITANTE',
                  'CORREO SOLICITANTE',
                  'RADICADO_ENTRADA',
                ].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => insertField(k)}
                    data-testid={`tv-sim-insert-${k}`}
                    className="tv-guide-chip"
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 600,
                      color: '#334155',
                      background: '#fff',
                      border: '1px solid #E2E8F0',
                      borderRadius: 999,
                      padding: '3px 8px',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                    }}
                  >
                    + [{k}]
                  </button>
                ))}
              </div>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}
                className="tv-guide-grid-2"
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      color: '#475569',
                      marginBottom: 4,
                    }}
                  >
                    Texto en Word (.docx):{' '}
                    <span style={{ fontWeight: 500, color: '#94A3B8' }}>Editable</span>
                  </div>
                  <textarea
                    ref={simRef}
                    value={simText}
                    onChange={(e) => setSimText(e.target.value)}
                    rows={6}
                    aria-label="Texto de ejemplo con campos"
                    data-testid="tv-sim-input"
                    style={{
                      width: '100%',
                      minHeight: 130,
                      borderRadius: 8,
                      border: '2px solid #F59E0B',
                      padding: '8px 10px',
                      fontSize: '0.76rem',
                      fontFamily: 'Georgia, serif',
                      lineHeight: 1.6,
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      color: '#D97706',
                      marginBottom: 4,
                    }}
                  >
                    ✨ Resultado generado por SAC:{' '}
                    <span
                      style={{
                        fontWeight: 500,
                        color: '#94A3B8',
                        background: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        borderRadius: 999,
                        padding: '0 6px',
                      }}
                    >
                      En tiempo real
                    </span>
                  </div>
                  <div
                    data-testid="tv-sim-output"
                    aria-live="polite"
                    style={{
                      minHeight: 130,
                      borderRadius: 8,
                      border: '1px solid #BBF7D0',
                      background: '#F0FDF4',
                      padding: '8px 10px',
                      fontSize: '0.76rem',
                      fontFamily: 'Georgia, serif',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {simView === 'word'
                      ? simTokens.map((t) =>
                          t.key === null ? (
                            <span key={t.i}>{t.raw}</span>
                          ) : (
                            <span
                              key={t.i}
                              style={{
                                background: '#DBEAFE',
                                color: '#1D4ED8',
                                borderRadius: 4,
                                padding: '0 3px',
                                fontWeight: 700,
                              }}
                            >
                              {t.raw}
                            </span>
                          )
                        )
                      : simTokens.map((t) => {
                          if (t.key === null) return <span key={t.i}>{t.raw}</span>;
                          const val =
                            SAMPLE_VALUES[t.key] ??
                            SAMPLE_VALUES[t.key.replace(/_/g, ' ')] ??
                            t.raw;
                          return (
                            <span
                              key={t.i}
                              style={{
                                background: '#DCFCE7',
                                color: '#166534',
                                borderRadius: 4,
                                padding: '0 3px',
                                fontWeight: 600,
                                textDecoration: 'underline',
                                textDecorationColor: '#86EFAC',
                              }}
                            >
                              {val}
                            </span>
                          );
                        })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            borderTop: '1px solid #F1F5F9',
            paddingTop: 10,
          }}
        >
          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
            Carpeta de destino:{' '}
            <strong style={{ fontFamily: 'monospace', color: '#004B93' }}>
              {folderHint ?? ' (configúrala en el Módulo 2)'}
            </strong>
          </span>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() =>
                copyText(DRAFT_EXAMPLE, '__draft__', (v) => setDraftCopied(v === '__draft__'))
              }
              data-testid="tv-guide-copy-draft"
              style={{
                height: 34,
                padding: '0 12px',
                borderRadius: 8,
                border: '1px solid var(--border-strong)',
                background: '#fff',
                color: '#334155',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
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
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {draftCopied ? '✓ Copiado' : 'Copiar borrador de ejemplo'}
            </button>
            <button
              type="button"
              onClick={onClose}
              data-testid="tv-guide-close"
              style={{
                height: 34,
                padding: '0 14px',
                borderRadius: 8,
                border: '1px solid #004B93',
                background: '#004B93',
                color: '#fff',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Entendido, volver a Plantillas
            </button>
          </span>
        </div>
      </div>
    </Modal>
  );
}

export default BuildTemplateGuideModal;

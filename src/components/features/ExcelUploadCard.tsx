import type { DragEvent, ChangeEvent, RefObject } from 'react';
import type { ExcelFileState } from '@/store/excelStore';

type Accent = 'sac' | 'mercurio' | 'folder';

interface Props {
  title: string;
  subtitle: string;
  fileState: ExcelFileState | null;
  setFileState: (s: ExcelFileState | null) => void;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  inputRef: RefObject<HTMLInputElement>;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  accent: Accent;
  iconBoxClass?: string;
}

const accentMap: Record<
  Accent,
  {
    border: string;
    lightBorder: string;
    iconBg: string;
    iconColor: string;
    badgeBg: string;
    badgeColor: string;
    progress: string;
    glow: string;
    gradientStop1: string;
    gradientStop2: string;
  }
> = {
  sac: {
    border: '#004B93',
    lightBorder: '#bfdbfe',
    iconBg: '#E6EEF6',
    iconColor: '#004B93',
    badgeBg: '#E6EEF6',
    badgeColor: '#004B93',
    progress: 'linear-gradient(90deg, #004B93 0%, #0284C7 50%, #38BDF8 100%)',
    glow: 'rgba(0, 75, 147, 0.25)',
    gradientStop1: '#004B93',
    gradientStop2: '#38BDF8',
  },
  mercurio: {
    border: '#0284C7',
    lightBorder: '#bae6fd',
    iconBg: '#EFF6FF',
    iconColor: '#0284C7',
    badgeBg: '#EFF6FF',
    badgeColor: '#0284C7',
    progress: 'linear-gradient(90deg, #0284C7 0%, #0ea5e9 50%, #7dd3fc 100%)',
    glow: 'rgba(2, 132, 199, 0.25)',
    gradientStop1: '#0284C7',
    gradientStop2: '#7dd3fc',
  },
  folder: {
    border: '#76BC21',
    lightBorder: '#d9f99d',
    iconBg: '#EEF6DF',
    iconColor: '#3B6B0A',
    badgeBg: '#EEF6DF',
    badgeColor: '#3B6B0A',
    progress: 'linear-gradient(90deg, #65a30d 0%, #76BC21 50%, #a3e635 100%)',
    glow: 'rgba(118, 188, 33, 0.25)',
    gradientStop1: '#65a30d',
    gradientStop2: '#a3e635',
  },
};

function formatBytes(bytes?: number): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function IconPlus({ color }: { color: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IconCheck({ color = '#16A34A' }: { color?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
function IconWarning() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#DC2626"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function IconUpload({ color }: { color: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function IconFolder({ color }: { color: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function ExcelUploadCard({
  title,
  subtitle,
  fileState,
  setFileState,
  dragOver,
  setDragOver,
  inputRef,
  onDrop,
  onSelect,
  accent,
  iconBoxClass,
}: Props) {
  const a = accentMap[accent];
  const isLoading = !!fileState?.loading;
  const isError = !!fileState?.error;
  const isCompleted = !!fileState?.file && !isLoading && !isError;

  const status: 'idle' | 'loading' | 'completed' | 'error' = isLoading
    ? 'loading'
    : isError
      ? 'error'
      : isCompleted
        ? 'completed'
        : 'idle';

  const progressVal = Math.min(100, Math.max(0, Math.round(fileState?.progress ?? 0)));
  const stageText =
    fileState?.stage ||
    (accent === 'folder' ? 'Analizando plantillas...' : 'Procesando archivo...');

  const formattedBytesProcessed = formatBytes(fileState?.bytesProcessed);
  const formattedTotalBytes = formatBytes(fileState?.totalBytes || fileState?.file?.size);
  const sizeSubtitle =
    formattedBytesProcessed &&
    formattedTotalBytes &&
    formattedBytesProcessed !== formattedTotalBytes
      ? `${formattedBytesProcessed} / ${formattedTotalBytes}`
      : formattedTotalBytes
        ? formattedTotalBytes
        : '';

  return (
    <div
      className="m2-card"
      data-accent={accent}
      data-status={status}
      style={{
        background: '#fff',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--border)',
        borderTop: `3px solid ${a.border}`,
        boxShadow: isLoading ? `0 8px 24px ${a.glow}` : 'var(--shadow-sm)',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        transition:
          'transform 180ms ease-out, box-shadow 180ms ease-out, border-color 180ms ease-out',
        animation: 'm2-enter 280ms cubic-bezier(0.16,1,0.3,1)',
      }}
      onMouseEnter={(e) => {
        if (!isLoading) {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isLoading) {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)';
        }
      }}
    >
      <style>{`
        @keyframes m2-enter { from { opacity:0; transform: translateY(8px) } to { opacity:1; transform: translateY(0) } }
        @keyframes m2-shimmer-wave { 0% { transform: translateX(-100%) } 100% { transform: translateX(250%) } }
        @keyframes m2-pulse-dot { 0%,100% { opacity:1; transform: scale(1) } 50% { opacity:0.4; transform: scale(0.8) } }
        @keyframes m2-spin-cw { 0% { transform: rotate(0deg) } 100% { transform: rotate(360deg) } }
        @keyframes m2-spin-ccw { 0% { transform: rotate(0deg) } 100% { transform: rotate(-360deg) } }
        @keyframes m2-pop-check { 0% { transform: scale(0.6); opacity:0 } 70% { transform: scale(1.15) } 100% { transform: scale(1); opacity:1 } }
        @keyframes m2-glow-ring { 0%,100% { opacity:0.55; transform: scale(1) } 50% { opacity:0.9; transform: scale(1.04) } }

        .m2-icon-box { width:42px; height:42px; border-radius:12px; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; transition: transform 200ms ease; }
        .m2-card:hover .m2-icon-box { transform: scale(1.05); }
        .m2-drop { border:2px dashed var(--border); border-radius:14px; padding:20px 18px; min-height:160px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; text-align:center; cursor:pointer; transition: border-color 180ms ease-out, background 180ms ease-out, transform 180ms ease-out, box-shadow 180ms ease-out; background:#fff; position:relative; overflow:hidden; }
        .m2-drop:hover { border-color:${a.border}; background: ${accent === 'folder' ? '#f7fee7' : accent === 'mercurio' ? '#f0f9ff' : '#f0f6ff'}; }
        .m2-drop--over { border-color:${a.border} !important; background: ${accent === 'folder' ? '#ecfccb' : '#e0f2fe'} !important; transform: scale(1.015); box-shadow: 0 0 16px ${a.glow}; }
        .m2-drop--loading { cursor: default; border-style: solid; border-color:${a.lightBorder}; background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%); box-shadow: inset 0 2px 6px rgba(0,0,0,0.02); }
        .m2-drop--completed { border-style:solid; border-color:#bbf7d0; background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%); cursor:default; }
        .m2-drop--error { border-color:#fecaca; background:#fef2f2; }

        .m2-badge { display:inline-flex; align-items:center; gap:6px; font-size:10px; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; padding:4px 9px; border-radius:999px; border:1px solid; }
        
        .m2-progress-track { width:100%; height:10px; background:#e2e8f0; border-radius:999px; overflow:hidden; padding:0; position:relative; box-shadow: inset 0 1px 3px rgba(15,23,42,0.08); }
        .m2-progress-fill { height:100%; border-radius:999px; transition: width 100ms linear; background: ${a.progress}; position:relative; overflow:hidden; }
        .m2-progress-shimmer { position:absolute; top:0; left:0; width:50%; height:100%; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.65) 50%, transparent 100%); animation: m2-shimmer-wave 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        
        .m2-pulse-dot { width:8px; height:8px; border-radius:999px; background: ${a.border}; display:inline-block; animation: m2-pulse-dot 1.1s ease infinite; flex-shrink:0; }
        .m2-spinner-wrap { position:relative; width:48px; height:48px; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }
        .m2-spinner-ring-outer { animation: m2-spin-cw 1.6s linear infinite; }
        .m2-spinner-ring-inner { animation: m2-spin-ccw 2.2s linear infinite; }
        .m2-pop-in { animation: m2-pop-check 400ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span
          className={`m2-icon-box ${iconBoxClass ?? ''}`}
          style={{ background: a.iconBg, color: a.iconColor }}
          aria-hidden
        >
          {accent === 'folder' ? (
            <IconFolder color={a.iconColor} />
          ) : (
            <IconUpload color={a.iconColor} />
          )}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: '0.9375rem',
              color: 'var(--neutral-900)',
              lineHeight: 1.2,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: '0.78rem',
              color: 'var(--neutral-500)',
              marginTop: 3,
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </div>
        </div>
        {isCompleted && (
          <span
            className="m2-badge m2-pop-in"
            style={{ background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }}
          >
            <IconCheck /> Listo
          </span>
        )}
        {isLoading && (
          <span
            className="m2-badge"
            style={{ background: a.badgeBg, color: a.badgeColor, borderColor: a.lightBorder }}
          >
            <span className="m2-pulse-dot" aria-hidden /> Procesando ({progressVal}%)
          </span>
        )}
        {isError && (
          <span
            className="m2-badge"
            style={{ background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}
          >
            <IconWarning /> Error
          </span>
        )}
      </div>

      {/* drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label={title}
        data-testid={`m2-drop-${accent}`}
        className={[
          'm2-drop',
          dragOver ? 'm2-drop--over' : '',
          isLoading ? 'm2-drop--loading' : '',
          isCompleted ? 'm2-drop--completed' : '',
          isError ? 'm2-drop--error' : '',
        ].join(' ')}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          setDragOver(false);
          onDrop(e);
        }}
        onClick={() => {
          if (isLoading) return;
          inputRef.current?.click();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!isLoading) inputRef.current?.click();
          }
        }}
      >
        {/* hidden input */}
        <input
          ref={inputRef}
          type="file"
          accept={accent === 'folder' ? undefined : '.xlsx,.xls,.csv'}
          {...(accent === 'folder'
            ? ({ webkitdirectory: '', directory: '' } as unknown as Record<string, string>)
            : {})}
          multiple={accent === 'folder'}
          style={{ display: 'none' }}
          onChange={onSelect}
          data-testid={`m2-input-${accent}`}
        />

        {status === 'idle' && (
          <>
            <span
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                background: '#f8fafc',
                border: '1px dashed var(--border)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-xs)',
              }}
              aria-hidden
            >
              <IconPlus color={a.iconColor} />
            </span>
            <div style={{ fontSize: '0.86rem', color: 'var(--neutral-700)', fontWeight: 600 }}>
              Arrastra tu archivo aquí o{' '}
              <span style={{ color: a.iconColor, fontWeight: 800 }}>haz clic para buscar</span>
            </div>
            <div style={{ fontSize: '0.73rem', color: 'var(--neutral-400)' }}>
              {accent === 'folder'
                ? 'Carpeta con plantillas .docx'
                : 'Formatos aceptados: .xlsx, .xls, .csv'}
            </div>
          </>
        )}

        {status === 'loading' && fileState && (
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              alignItems: 'center',
            }}
          >
            {/* Animated dual spinner with center percentage */}
            <div className="m2-spinner-wrap" aria-hidden>
              <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                style={{ position: 'absolute', inset: 0 }}
              >
                <circle cx="24" cy="24" r="20" stroke="#f1f5f9" strokeWidth="4" fill="none" />
                <circle
                  className="m2-spinner-ring-outer"
                  cx="24"
                  cy="24"
                  r="20"
                  stroke={a.border}
                  strokeWidth="4"
                  strokeDasharray="60 120"
                  strokeLinecap="round"
                  fill="none"
                  style={{ transformOrigin: '24px 24px' }}
                />
                <circle
                  className="m2-spinner-ring-inner"
                  cx="24"
                  cy="24"
                  r="14"
                  stroke={a.gradientStop2}
                  strokeWidth="2.5"
                  strokeDasharray="30 60"
                  strokeLinecap="round"
                  fill="none"
                  style={{ transformOrigin: '24px 24px', opacity: 0.8 }}
                />
              </svg>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  color: a.iconColor,
                  letterSpacing: '-0.02em',
                  zIndex: 2,
                }}
              >
                {progressVal}%
              </span>
            </div>

            {/* Stage description pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: a.iconBg,
                border: `1px solid ${a.lightBorder}`,
                borderRadius: 999,
                padding: '4px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: a.iconColor,
                maxWidth: '92%',
              }}
            >
              <span className="m2-pulse-dot" aria-hidden />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {stageText}
              </span>
            </div>

            {/* High-def progress bar */}
            <div
              style={{
                width: '100%',
                maxWidth: '340px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.72rem',
                }}
              >
                <span style={{ color: 'var(--neutral-500)', fontWeight: 600 }}>
                  Avance en tiempo real
                </span>
                <span style={{ fontWeight: 800, color: a.iconColor }}>{progressVal}%</span>
              </div>

              <div
                className="m2-progress-track"
                role="progressbar"
                aria-valuenow={progressVal}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progreso de carga"
              >
                <div className="m2-progress-fill" style={{ width: `${progressVal}%` }}>
                  <div className="m2-progress-shimmer" />
                </div>
              </div>
            </div>

            {/* File info footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.72rem',
                color: 'var(--neutral-400)',
                maxWidth: 280,
              }}
            >
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: 600,
                  color: 'var(--neutral-600)',
                }}
                title={fileState.file?.name}
              >
                {fileState.file?.name}
              </span>
              {sizeSubtitle && (
                <>
                  <span>•</span>
                  <span style={{ whiteSpace: 'nowrap' }}>{sizeSubtitle}</span>
                </>
              )}
            </div>
          </div>
        )}

        {status === 'completed' && fileState && (
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <span
              className="m2-pop-in"
              style={{
                color: '#16a34a',
                display: 'inline-flex',
                padding: 6,
                background: '#dcfce7',
                borderRadius: 999,
              }}
              aria-hidden
            >
              <IconCheck color="#16a34a" />
            </span>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#15803d' }}>
              Archivo cargado correctamente
            </div>
            <div
              style={{
                fontSize: '0.76rem',
                color: 'var(--neutral-700)',
                background: '#fff',
                border: '1px solid #bbf7d0',
                borderRadius: 999,
                padding: '5px 12px',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                fontWeight: 600,
              }}
              title={fileState.file?.name}
            >
              {fileState.file?.name} — {fileState.recordCount}{' '}
              {accent === 'folder' ? 'plantillas detectadas' : 'registros válidos'}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: a.iconColor,
                  background: '#fff',
                  border: `1px solid ${a.border}`,
                  borderRadius: 999,
                  padding: '5px 14px',
                  cursor: 'pointer',
                  transition: 'background 120ms, transform 120ms',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = a.iconBg;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#fff';
                }}
              >
                Cambiar
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFileState(null);
                  if (inputRef.current) inputRef.current.value = '';
                }}
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: 'var(--neutral-600)',
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 999,
                  padding: '5px 14px',
                  cursor: 'pointer',
                  transition: 'background 120ms',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#fff';
                }}
              >
                Quitar
              </button>
            </div>
          </div>
        )}

        {status === 'error' && fileState && (
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                padding: 6,
                background: '#fee2e2',
                borderRadius: 999,
              }}
              aria-hidden
            >
              <IconWarning />
            </span>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#dc2626' }}>
              Error al cargar
            </div>
            <div style={{ fontSize: '0.76rem', color: '#991b1b', maxWidth: 280, lineHeight: 1.4 }}>
              {fileState.error}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: '#dc2626',
                  background: '#fff',
                  border: '1px solid #fecaca',
                  borderRadius: 999,
                  padding: '5px 14px',
                  cursor: 'pointer',
                }}
              >
                Reintentar
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFileState(null);
                  if (inputRef.current) inputRef.current.value = '';
                }}
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: 'var(--neutral-600)',
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 999,
                  padding: '5px 14px',
                  cursor: 'pointer',
                }}
              >
                Quitar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExcelUploadCard;

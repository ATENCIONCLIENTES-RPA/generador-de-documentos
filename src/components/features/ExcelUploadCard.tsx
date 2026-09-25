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
  locationUrl?: string;
  locationLabel?: string;
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
    badgeBorder: string;
    badgeText: string;
    badgeDot: string;
    dropBg: string;
    dropBorder: string;
    dropHoverBg: string;
    dropHoverBorder: string;
    progress: string;
    glow: string;
    gradientStop1: string;
    gradientStop2: string;
    btnBg: string;
    btnBorder: string;
    btnColor: string;
    btnHoverBg: string;
  }
> = {
  sac: {
    border: '#0060AA',
    lightBorder: '#BAE6FD',
    iconBg: '#EBF4FA',
    iconColor: '#0060AA',
    badgeBg: '#EFF6FF',
    badgeColor: '#0060AA',
    badgeBorder: '#BFDBFE',
    badgeText: 'Obligatorio',
    badgeDot: '#0060AA',
    dropBg: 'linear-gradient(180deg, #FAFDFF 0%, #F0F7FC 100%)',
    dropBorder: '#BAE6FD',
    dropHoverBg: 'linear-gradient(180deg, #F0F8FF 0%, #E2EFFB 100%)',
    dropHoverBorder: '#0060AA',
    progress: 'linear-gradient(90deg, #0060AA 0%, #0284C7 50%, #38BDF8 100%)',
    glow: 'rgba(0, 96, 170, 0.22)',
    gradientStop1: '#0060AA',
    gradientStop2: '#38BDF8',
    btnBg: '#EBF4FA',
    btnBorder: '#0060AA',
    btnColor: '#0060AA',
    btnHoverBg: '#0060AA',
  },
  mercurio: {
    border: '#4EB2D4',
    lightBorder: '#BAE6FD',
    iconBg: '#F0F9FF',
    iconColor: '#0284C7',
    badgeBg: '#F8FAFC',
    badgeColor: '#64748B',
    badgeBorder: '#E2E8F0',
    badgeText: 'Opcional',
    badgeDot: '#94A3B8',
    dropBg: 'linear-gradient(180deg, #F8FCFE 0%, #EEF8FC 100%)',
    dropBorder: '#BAE6FD',
    dropHoverBg: 'linear-gradient(180deg, #EEF9FD 0%, #DCF1F9 100%)',
    dropHoverBorder: '#4EB2D4',
    progress: 'linear-gradient(90deg, #4EB2D4 0%, #0284C7 50%, #7DD3FC 100%)',
    glow: 'rgba(78, 178, 212, 0.25)',
    gradientStop1: '#4EB2D4',
    gradientStop2: '#7DD3FC',
    btnBg: '#F0F9FF',
    btnBorder: '#4EB2D4',
    btnColor: '#0284C7',
    btnHoverBg: '#4EB2D4',
  },
  folder: {
    border: '#54B032',
    lightBorder: '#BBF7D0',
    iconBg: '#F0FDF4',
    iconColor: '#2E7D32',
    badgeBg: '#F0FDF4',
    badgeColor: '#2E7D32',
    badgeBorder: '#BBF7D0',
    badgeText: 'Obligatorio',
    badgeDot: '#54B032',
    dropBg: 'linear-gradient(180deg, #FCFDFC 0%, #F3FAF0 100%)',
    dropBorder: '#BBF7D0',
    dropHoverBg: 'linear-gradient(180deg, #F3FAF0 0%, #E3F5DC 100%)',
    dropHoverBorder: '#54B032',
    progress: 'linear-gradient(90deg, #54B032 0%, #76BC21 50%, #A3E635 100%)',
    glow: 'rgba(84, 176, 50, 0.22)',
    gradientStop1: '#54B032',
    gradientStop2: '#A3E635',
    btnBg: '#F0FDF4',
    btnBorder: '#54B032',
    btnColor: '#2E7D32',
    btnHoverBg: '#54B032',
  },
};

function formatBytes(bytes?: number): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Icono representativo único para Archivo SAC: Hoja de cálculo / Base de datos matricial */
function IconSacTable({ color }: { color: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="3.5" />
      <path d="M3 9h18" strokeWidth="2.2" />
      <path d="M3 15h18" strokeDasharray="1 1" />
      <path d="M9 9v12" />
      <path d="M15 9v12" />
    </svg>
  );
}

/** Icono representativo único para Archivo Mercurio: Correspondencia / Radicado con expediente */
function IconMercurioDoc({ color }: { color: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2H6a2.5 2.5 0 0 0-2.5 2.5v15A2.5 2.5 0 0 0 6 22h12a2.5 2.5 0 0 0 2.5-2.5V8.5z" />
      <polyline points="14 2 14 8 20 8" strokeWidth="2" />
      <line x1="8" y1="12" x2="16" y2="12" strokeWidth="1.8" />
      <line x1="8" y1="16" x2="13" y2="16" strokeWidth="1.8" />
      <circle cx="16" cy="16" r="1.5" fill={color} />
    </svg>
  );
}

/** Icono representativo único para Carpeta de Plantillas: Carpeta abierta con documentos DOCX */
function IconFolderOpen({ color }: { color: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
      <path d="M2 10h20" strokeWidth="1.8" />
      <path d="m9 14.5 2 2 4.5-4.5" strokeWidth="2" />
    </svg>
  );
}

function IconPlus({ color }: { color: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconCheck({ color = '#15803D' }: { color?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconWarning() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#DC2626"
      strokeWidth="2.2"
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
  locationUrl,
  locationLabel,
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

  const renderCardIcon = () => {
    if (accent === 'sac') return <IconSacTable color={a.iconColor} />;
    if (accent === 'mercurio') return <IconMercurioDoc color={a.iconColor} />;
    return <IconFolderOpen color={a.iconColor} />;
  };

  return (
    <div
      className="m2-card"
      data-accent={accent}
      data-status={status}
      style={{
        background: '#ffffff',
        borderRadius: 14,
        border: '1px solid #e2e8f0',
        borderTop: `3.5px solid ${a.border}`,
        boxShadow: isLoading ? `0 8px 24px ${a.glow}` : '0 2px 8px rgba(15, 23, 42, 0.04)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        transition:
          'transform 200ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 200ms cubic-bezier(0.16, 1, 0.3, 1), border-color 200ms ease',
        animation: 'm2-enter 280ms cubic-bezier(0.16,1,0.3,1)',
      }}
      onMouseEnter={(e) => {
        if (!isLoading) {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            `0 8px 20px rgba(15, 23, 42, 0.07), 0 2px 6px ${a.glow}`;
        }
      }}
      onMouseLeave={(e) => {
        if (!isLoading) {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.04)';
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

        .m2-icon-box { width:40px; height:40px; border-radius:11px; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; transition: transform 220ms ease, box-shadow 220ms ease; }
        .m2-card:hover .m2-icon-box { transform: scale(1.06); }
        
        .m2-drop { 
          border: 1.5px dashed ${a.dropBorder}; 
          border-radius: 16px; 
          padding: 22px 18px; 
          min-height: 154px; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          gap: 10px; 
          text-align: center; 
          cursor: pointer; 
          transition: all 220ms cubic-bezier(0.16, 1, 0.3, 1); 
          background: ${a.dropBg}; 
          position: relative; 
          overflow: hidden; 
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02), inset 0 1px 1px rgba(255, 255, 255, 0.85);
        }
        .m2-drop:hover { 
          border-color: ${a.dropHoverBorder}; 
          background: ${a.dropHoverBg}; 
          transform: translateY(-2px); 
          box-shadow: 0 6px 16px ${a.glow}, inset 0 1px 1px rgba(255, 255, 255, 0.95);
        }
        .m2-drop--over { 
          border-color: ${a.border} !important; 
          background: ${a.dropHoverBg} !important; 
          transform: scale(1.015) !important; 
          box-shadow: 0 8px 24px ${a.glow} !important; 
        }
        .m2-drop--loading { 
          cursor: default; 
          border-style: solid; 
          border-color: ${a.lightBorder}; 
          background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%); 
          box-shadow: inset 0 2px 6px rgba(0,0,0,0.02); 
        }
        .m2-drop--completed { 
          border-style: solid; 
          border-color: #bbf7d0; 
          background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%); 
          cursor: default; 
          box-shadow: 0 2px 10px rgba(22, 163, 74, 0.08);
        }
        .m2-drop--error { 
          border-color: #fecaca; 
          background: #fef2f2; 
        }

        .m2-badge { 
          display: inline-flex; 
          align-items: center; 
          gap: 5px; 
          font-size: 0.68rem; 
          font-weight: 800; 
          letter-spacing: 0.04em; 
          text-transform: uppercase; 
          padding: 3px 9px; 
          border-radius: 999px; 
          border: 1px solid; 
          line-height: 1.2;
          white-space: nowrap;
        }
        
        .m2-progress-track { width:100%; height:10px; background:#e2e8f0; border-radius:999px; overflow:hidden; padding:0; position:relative; box-shadow: inset 0 1px 3px rgba(15,23,42,0.08); }
        .m2-progress-fill { height:100%; border-radius:999px; transition: width 100ms linear; background: ${a.progress}; position:relative; overflow:hidden; }
        .m2-progress-shimmer { position:absolute; top:0; left:0; width:50%; height:100%; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.65) 50%, transparent 100%); animation: m2-shimmer-wave 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        
        .m2-pulse-dot { width:7px; height:7px; border-radius:999px; background: ${a.border}; display:inline-block; animation: m2-pulse-dot 1.1s ease infinite; flex-shrink:0; }
        .m2-spinner-wrap { position:relative; width:48px; height:48px; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }
        .m2-spinner-ring-outer { animation: m2-spin-cw 1.6s linear infinite; }
        .m2-spinner-ring-inner { animation: m2-spin-ccw 2.2s linear infinite; }
        .m2-pop-in { animation: m2-pop-check 400ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>

      {/* header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, flex: 1, minWidth: 0 }}>
          <span
            className={`m2-icon-box ${iconBoxClass ?? ''}`}
            style={{
              background: a.iconBg,
              color: a.iconColor,
              border: `1px solid ${a.lightBorder}`,
              boxShadow: `0 2px 6px ${a.glow}`,
            }}
            aria-hidden
          >
            {renderCardIcon()}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: '0.96rem',
                color: '#0f172a',
                lineHeight: 1.25,
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: '0.76rem',
                color: '#64748b',
                marginTop: 3,
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </div>
          </div>
        </div>

        {/* Acciones y Badges en la esquina */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          {locationUrl && (
            <a
              href={locationUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={`Abrir ubicación oficial de ${title} en OneDrive`}
              data-testid={`m2-location-${accent}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 9,
                border: `1px solid ${a.btnBorder}`,
                background: a.btnBg,
                color: a.btnColor,
                fontSize: '0.74rem',
                fontWeight: 800,
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'all 180ms ease',
                whiteSpace: 'nowrap',
                letterSpacing: '-0.01em',
                boxShadow: `0 1px 3px ${a.glow}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = a.btnHoverBg;
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.boxShadow = `0 3px 10px ${a.glow}`;
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = a.btnBg;
                e.currentTarget.style.color = a.btnColor;
                e.currentTarget.style.boxShadow = `0 1px 3px ${a.glow}`;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              {locationLabel || 'Consultar'}
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                style={{ opacity: 0.7, marginLeft: -1 }}
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          )}

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

          {status === 'idle' && (
            <span
              className="m2-badge"
              style={{
                background: a.badgeBg,
                color: a.badgeColor,
                borderColor: a.badgeBorder,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: a.badgeDot,
                  display: 'inline-block',
                }}
                aria-hidden
              />
              {a.badgeText}
            </span>
          )}
        </div>
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
                width: 48,
                height: 48,
                borderRadius: 14,
                background: '#ffffff',
                border: `1.5px solid ${a.lightBorder}`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 3px 10px ${a.glow}`,
                position: 'relative',
              }}
              aria-hidden
            >
              <IconPlus color={a.iconColor} />
            </span>
            <div
              style={{ fontSize: '0.86rem', color: '#1e293b', fontWeight: 600, lineHeight: 1.3 }}
            >
              Arrastra tu archivo aquí o{' '}
              <span style={{ color: a.iconColor, fontWeight: 800 }}>haz clic para buscar</span>
            </div>
            <div style={{ fontSize: '0.73rem', color: '#64748b', lineHeight: 1.2 }}>
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

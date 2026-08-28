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

const accentMap: Record<Accent, { border: string; iconBg: string; iconColor: string; badgeBg: string; badgeColor: string; progress: string }> = {
  sac: {
    border: '#004B93',
    iconBg: '#E6EEF6',
    iconColor: '#004B93',
    badgeBg: '#E6EEF6',
    badgeColor: '#004B93',
    progress: 'linear-gradient(90deg, #004B93 0%, #0a6ad1 100%)',
  },
  mercurio: {
    border: '#0284C7',
    iconBg: '#EFF6FF',
    iconColor: '#0284C7',
    badgeBg: '#EFF6FF',
    badgeColor: '#0284C7',
    progress: 'linear-gradient(90deg, #0284C7 0%, #38bdf8 100%)',
  },
  folder: {
    border: '#76BC21',
    iconBg: '#EEF6DF',
    iconColor: '#3B6B0A',
    badgeBg: '#EEF6DF',
    badgeColor: '#3B6B0A',
    progress: 'linear-gradient(90deg, #76BC21 0%, #a3e635 100%)',
  },
};

function IconPlus({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IconCheck({ color = '#16A34A' }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
function IconWarning() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function IconUpload({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function IconFolder({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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

  const status: 'idle' | 'loading' | 'completed' | 'error' = isLoading ? 'loading' : isError ? 'error' : isCompleted ? 'completed' : 'idle';

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
        boxShadow: 'var(--shadow-sm)',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        transition: 'transform 150ms ease-out, box-shadow 150ms ease-out, border-color 150ms ease-out',
        animation: 'm2-enter 280ms cubic-bezier(0.16,1,0.3,1)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      <style>{`
        @keyframes m2-enter { from { opacity:0; transform: translateY(8px) } to { opacity:1; transform: translateY(0) } }
        @keyframes m2-shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        @keyframes m2-pulse-dot { 0%,100% { opacity:1; transform: scale(1) } 50% { opacity:0.55; transform: scale(0.85) } }
        .m2-icon-box { width:42px; height:42px; border-radius:12px; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }
        .m2-drop { border:2px dashed var(--border); border-radius:12px; padding:18px 16px; min-height:148px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; text-align:center; cursor:pointer; transition: border-color 150ms ease-out, background 150ms ease-out, transform 150ms ease-out; background:#fff; }
        .m2-drop:hover { border-color:${a.border}; background: ${accent === 'folder' ? '#f7fee7' : accent === 'mercurio' ? '#f0f9ff' : '#f0f6ff'}; }
        .m2-drop--over { border-color:${a.border} !important; background: ${accent === 'folder' ? '#ecfccb' : '#e0f2fe'} !important; transform: scale(1.01); }
        .m2-drop--loading { cursor: default; border-style: solid; border-color:#e2e8f0; background:#f8fafc; }
        .m2-drop--completed { border-style:solid; border-color:#bbf7d0; background:#f0fdf4; cursor:default; }
        .m2-drop--error { border-color:#fecaca; background:#fef2f2; }
        .m2-badge { display:inline-flex; align-items:center; gap:6px; font-size:10px; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; padding:4px 8px; border-radius:999px; border:1px solid; }
        .m2-progress-track { width:100%; height:8px; background:#e2e8f0; border-radius:999px; overflow:hidden; padding:0; }
        .m2-progress-fill { height:100%; border-radius:999px; transition: width 220ms ease-out; background: ${a.progress}; position:relative; overflow:hidden; }
        .m2-progress-fill::after { content:''; position:absolute; inset:0; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%); background-size:200% 100%; animation: m2-shimmer 1.2s ease infinite; }
        .m2-pulse-dot { width:8px; height:8px; border-radius:999px; background: ${a.border}; display:inline-block; animation: m2-pulse-dot 1.1s ease infinite; }
      `}</style>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span className={`m2-icon-box ${iconBoxClass ?? ''}`} style={{ background: a.iconBg, color: a.iconColor }} aria-hidden>
          {accent === 'folder' ? <IconFolder color={a.iconColor} /> : <IconUpload color={a.iconColor} />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--neutral-900)', lineHeight: 1.2 }}>{title}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', marginTop: 3, lineHeight: 1.4 }}>{subtitle}</div>
        </div>
        {isCompleted && (
          <span className="m2-badge" style={{ background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }}>
            <IconCheck /> Listo
          </span>
        )}
        {isLoading && (
          <span className="m2-badge" style={{ background: a.badgeBg, color: a.badgeColor, borderColor: 'var(--border)' }}>
            <span className="m2-pulse-dot" aria-hidden /> Procesando
          </span>
        )}
        {isError && (
          <span className="m2-badge" style={{ background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}>
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
          {...(accent === 'folder' ? ({ webkitdirectory: '', directory: '' } as unknown as Record<string, string>) : {})}
          multiple={accent === 'folder'}
          style={{ display: 'none' }}
          onChange={onSelect}
          data-testid={`m2-input-${accent}`}
        />

        {status === 'idle' && (
          <>
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#f8fafc',
                border: '1px dashed var(--border)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-hidden
            >
              <IconPlus color={a.iconColor} />
            </span>
            <div style={{ fontSize: '0.84rem', color: 'var(--neutral-600)', fontWeight: 600 }}>
              Arrastra tu archivo aquí o <span style={{ color: a.iconColor, fontWeight: 800 }}>haz clic para buscar</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--neutral-400)' }}>
              {accent === 'folder' ? 'Carpeta con plantillas .docx' : 'Formatos: .xlsx, .xls, .csv'}
            </div>
          </>
        )}

        {status === 'loading' && fileState && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--neutral-700)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="m2-pulse-dot" aria-hidden /> Procesando archivo…
            </div>
            <div className="m2-progress-track" aria-label="Progreso">
              <div className="m2-progress-fill" style={{ width: `${Math.round(fileState.progress)}%` }} />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', fontWeight: 600 }}>{Math.round(fileState.progress)}%</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--neutral-400)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fileState.file?.name}
            </div>
          </div>
        )}

        {status === 'completed' && fileState && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <span style={{ color: '#16a34a' }} aria-hidden>
              <IconCheck color="#16a34a" />
            </span>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#15803d' }}>Archivo cargado correctamente</div>
            <div
              style={{
                fontSize: '0.76rem',
                color: 'var(--neutral-600)',
                background: '#fff',
                border: '1px solid #bbf7d0',
                borderRadius: 999,
                padding: '4px 10px',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={fileState.file?.name}
            >
              {fileState.file?.name} — {fileState.recordCount} {accent === 'folder' ? 'plantillas' : 'registros'}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
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
                  padding: '5px 12px',
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
                  padding: '5px 12px',
                }}
              >
                Quitar
              </button>
            </div>
          </div>
        )}

        {status === 'error' && fileState && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            <IconWarning />
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#dc2626' }}>Error al cargar</div>
            <div style={{ fontSize: '0.76rem', color: '#991b1b', maxWidth: 260 }}>{fileState.error}</div>
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
                  padding: '5px 12px',
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
                  padding: '5px 12px',
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

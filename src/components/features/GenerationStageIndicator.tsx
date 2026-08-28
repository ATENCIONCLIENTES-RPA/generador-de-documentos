import type { GenerationStage } from '@/store/generationStore';

interface Props {
  stage: GenerationStage | string;
  className?: string;
  style?: React.CSSProperties;
}

const STAGE_MAP: Record<
  string,
  { label: string; bg: string; color: string; border: string; icon: string }
> = {
  revision: { label: 'Revisión', bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', icon: '◷' },
  generando: { label: 'Generando', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', icon: '⟳' },
  finalizado: {
    label: 'Finalizado',
    bg: '#ecfdf5',
    color: '#065f46',
    border: '#a7f3d0',
    icon: '✓',
  },
  con_errores: {
    label: 'Con errores',
    bg: '#fef2f2',
    color: '#991b1b',
    border: '#fecaca',
    icon: '✕',
  },
};

export function GenerationStageIndicator({ stage, className, style }: Props) {
  const key = String(stage ?? 'revision');
  const cfg = STAGE_MAP[key] ?? STAGE_MAP['revision'];
  return (
    <span
      data-testid="generation-stage-indicator"
      data-stage={key}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: '0.74rem',
        fontWeight: 800,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        padding: '4px 10px',
        borderRadius: 999,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        lineHeight: 1,
        ...style,
      }}
    >
      <span aria-hidden style={{ fontSize: '0.9em', lineHeight: 1 }}>
        {cfg.icon}
      </span>
      {cfg.label}
    </span>
  );
}

export default GenerationStageIndicator;

type StepStatus = 'pending' | 'active' | 'completed';

export interface StepDef {
  key: string;
  label: string;
  status: StepStatus;
}

interface Props {
  steps: StepDef[];
  onStepClick?: (key: string) => void;
}

function StepDot({ status }: { status: StepStatus }) {
  const base: React.CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 800,
    flexShrink: 0,
    border: '2px solid transparent',
    transition: 'all var(--duration-md) var(--ease)',
  };
  if (status === 'completed')
    return <span style={{ ...base, background: 'var(--essa-accent)', color: '#fff', borderColor: 'var(--essa-accent)' }}>✓</span>;
  if (status === 'active')
    return <span style={{ ...base, background: 'var(--essa-primary)', color: '#fff', boxShadow: '0 4px 14px rgba(0,75,147,.32)' }}>●</span>;
  return <span style={{ ...base, background: '#fff', color: 'var(--neutral-400)', borderColor: 'var(--border-strong)' }}>○</span>;
}

export function StepperBar({ steps, onStepClick }: Props) {
  return (
    <div
      role="navigation"
      aria-label="Progreso"
      style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-sm)',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        overflowX: 'auto',
      }}
    >
      {steps.map((s, idx) => (
        <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <button
            onClick={() => onStepClick?.(s.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'transparent',
              border: 0,
              cursor: onStepClick ? 'pointer' : 'default',
              minWidth: 0,
              textAlign: 'left',
            }}
          >
            <StepDot status={s.status} />
            <span
              style={{
                fontSize: '0.8125rem',
                fontWeight: s.status === 'active' ? 800 : 600,
                color: s.status === 'pending' ? 'var(--neutral-500)' : 'var(--neutral-900)',
                whiteSpace: 'nowrap',
              }}
            >
              {s.label}
            </span>
          </button>
          {idx < steps.length - 1 && (
            <span
              aria-hidden
              className="essa-stepper-line"
              style={{
                background:
                  s.status === 'completed' ? 'var(--essa-accent)' : s.status === 'active' ? 'var(--essa-primary-100)' : 'var(--neutral-200)',
                minWidth: 24,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
export default StepperBar;

type StepStatus = 'pending' | 'active' | 'completed';

export interface StepDef {
  key: string;
  label: string;
  status: StepStatus;
  icon: string;
}

interface Props {
  steps: StepDef[];
  onStepClick?: (key: string) => void;
}

function StepIcon({ icon, status }: { icon: string; status: StepStatus }) {
  return (
    <span className={`step-icon step-icon--${status}`} aria-hidden>
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={icon} />
      </svg>
      {status === 'active' && <span className="step-icon-pulse" />}
      {status === 'completed' && (
        <span className="step-check">
          <svg
            width="8"
            height="8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
    </span>
  );
}

export function StepperBar({ steps, onStepClick }: Props) {
  return (
    <>
      <style>{stepperStyles}</style>
      <div
        role="navigation"
        aria-label="Progreso del flujo"
        data-testid="stepper-bar"
        className="stepper-bar"
      >
        {steps.map((s, idx) => (
          <div key={s.key} className="stepper-item">
            <button
              onClick={() => onStepClick?.(s.key)}
              aria-label={`Ir a ${s.label}`}
              aria-current={s.status === 'active' ? 'step' : undefined}
              data-testid={`stepper-step-${s.key}`}
              data-status={s.status}
              className={`stepper-btn stepper-btn--${s.status}`}
            >
              <StepIcon icon={s.icon} status={s.status} />
              <span className="stepper-label">{s.label}</span>
            </button>
            {idx < steps.length - 1 && (
              <div className="stepper-line-wrapper">
                <span
                  aria-hidden
                  className={`stepper-line ${s.status === 'completed' ? 'stepper-line--completed' : ''}`}
                  data-testid={`stepper-line-${s.key}`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

const stepperStyles = `
  @keyframes stepPulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.8); opacity: 0; }
  }
  @keyframes stepSlideIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes stepCheckPop {
    0% { transform: scale(0); opacity: 0; }
    60% { transform: scale(1.3); }
    100% { transform: scale(1); opacity: 1; }
  }

  .stepper-bar {
    background: #fff;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    padding: 14px 20px;
    display: flex;
    align-items: center;
    gap: 0;
    overflow-x: auto;
    animation: stepSlideIn 400ms var(--ease-out) both;
  }

  .stepper-item {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
  }

  .stepper-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    background: transparent;
    border: 0;
    cursor: pointer;
    min-width: 0;
    text-align: left;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    transition: background 200ms var(--ease);
  }
  .stepper-btn:hover {
    background: var(--neutral-50);
  }

  .stepper-label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--neutral-500);
    white-space: nowrap;
    transition: color 200ms var(--ease);
  }
  .stepper-btn--active .stepper-label {
    color: var(--essa-primary);
    font-weight: 800;
  }
  .stepper-btn--completed .stepper-label {
    color: var(--neutral-700);
    font-weight: 700;
  }

  .step-icon {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: 2px solid transparent;
    transition: all 300ms var(--ease);
    position: relative;
  }
  .step-icon--pending {
    background: var(--neutral-50);
    color: var(--neutral-400);
    border-color: var(--border-strong);
  }
  .step-icon--active {
    background: var(--essa-primary);
    color: #fff;
    border-color: var(--essa-primary);
    box-shadow: 0 0 0 4px rgba(0,75,147,0.12), 0 4px 12px rgba(0,75,147,0.25);
  }
  .step-icon--completed {
    background: var(--essa-accent);
    color: #fff;
    border-color: var(--essa-accent);
  }

  .step-icon-pulse {
    position: absolute;
    inset: 0;
    border-radius: var(--radius-sm);
    border: 2px solid var(--essa-primary);
    animation: stepPulse 2s ease-in-out infinite;
    pointer-events: none;
  }

  .step-check {
    position: absolute;
    bottom: -3px;
    right: -3px;
    width: 16px;
    height: 16px;
    background: var(--essa-accent);
    border: 2px solid #fff;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    animation: stepCheckPop 300ms var(--ease-out) both;
  }

  .stepper-line-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 0 4px;
    min-width: 20px;
  }
  .stepper-line {
    width: 100%;
    height: 2px;
    border-radius: 999px;
    background: var(--neutral-200);
    transition: background 400ms var(--ease);
  }
  .stepper-line--completed {
    background: var(--essa-accent);
  }
`;

export default StepperBar;

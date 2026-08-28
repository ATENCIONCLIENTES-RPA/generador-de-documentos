type Variant = 'spinner' | 'shimmer' | 'pulse';

interface Props {
  variant?: Variant;
  size?: number;
  label?: string;
  fullPage?: boolean;
}

function SpinnerIcon({ size = 22 }: { size: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2.5px solid var(--neutral-200)',
        borderTopColor: 'var(--essa-primary)',
        display: 'inline-block',
        animation: 'essa-spin 0.7s linear infinite',
      }}
    />
  );
}

export function Spinner({ variant = 'spinner', size = 22, label, fullPage }: Props) {
  if (variant === 'shimmer') {
    const computedWidth = typeof size === 'number' ? `${size * 12}px` : '100%';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
        <div className="essa-skeleton" style={{ height: 14, width: '42%' }} />
        <div className="essa-skeleton" style={{ height: 14, width: computedWidth }} />
        <div className="essa-skeleton" style={{ height: 14, width: '78%' }} />
      </div>
    );
  }
  if (variant === 'pulse') {
    return (
      <div
        className="essa-pulse"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'var(--essa-primary)',
          opacity: 0.9,
        }}
        aria-label={label ?? 'Cargando'}
      />
    );
  }
  const inner = (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        color: 'var(--neutral-500)',
        fontSize: '0.8125rem',
        fontWeight: 600,
      }}
    >
      <SpinnerIcon size={size} />
      {label && <span>{label}</span>}
    </span>
  );
  if (fullPage) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
          minHeight: 200,
        }}
      >
        {inner}
        <style>{`@keyframes essa-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }
  return (
    <>
      <style>{`@keyframes essa-spin{to{transform:rotate(360deg)}}`}</style>
      {inner}
    </>
  );
}
export default Spinner;

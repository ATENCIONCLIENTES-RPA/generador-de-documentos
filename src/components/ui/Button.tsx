import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  fontWeight: 700,
  letterSpacing: '0.01em',
  borderRadius: 'var(--radius-input)',
  border: '1px solid transparent',
  transition:
    'background var(--duration) var(--ease), color var(--duration) var(--ease), border-color var(--duration) var(--ease), box-shadow var(--duration) var(--ease), transform var(--duration) var(--ease)',
  whiteSpace: 'nowrap',
  userSelect: 'none',
};

const sizes: Record<Size, React.CSSProperties> = {
  sm: { height: 32, padding: '0 12px', fontSize: '0.8125rem' },
  md: { height: 40, padding: '0 18px', fontSize: '0.875rem' },
  lg: { height: 48, padding: '0 22px', fontSize: '0.9375rem' },
};

function variantStyle(v: Variant, disabled: boolean | undefined): React.CSSProperties {
  if (disabled)
    return {
      background: 'var(--neutral-100)',
      color: 'var(--neutral-400)',
      borderColor: 'var(--border)',
      cursor: 'not-allowed',
    };
  switch (v) {
    case 'primary':
      return {
        background: 'var(--essa-primary)',
        color: '#fff',
        borderColor: 'var(--essa-primary)',
        boxShadow: '0 2px 8px rgba(0,75,147,.22)',
      };
    case 'secondary':
      return {
        background: '#fff',
        color: 'var(--essa-primary)',
        borderColor: 'var(--border-strong)',
      };
    case 'ghost':
      return { background: 'transparent', color: 'var(--neutral-700)', borderColor: 'transparent' };
    case 'danger':
      return { background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' };
  }
}

function SpinnerIcon({ size = 14 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2px solid currentColor',
        borderTopColor: 'transparent',
        display: 'inline-block',
        animation: 'essa-spin 0.7s linear infinite',
      }}
    />
  );
}

const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'primary', size = 'md', loading, disabled, children, style, ...rest }, ref) => {
    const isDisabled = disabled || loading;
    return (
      <>
        <style>{`@keyframes essa-spin{to{transform:rotate(360deg)}}`}</style>
        <button
          ref={ref}
          disabled={isDisabled}
          style={{
            ...base,
            ...sizes[size],
            ...variantStyle(variant, isDisabled),
            opacity: isDisabled && !loading ? 0.6 : 1,
            ...style,
          }}
          {...rest}
        >
          {loading && <SpinnerIcon size={size === 'sm' ? 12 : 14} />}
          {children}
        </button>
      </>
    );
  }
);
Button.displayName = 'Button';
export default Button;
export { Button };

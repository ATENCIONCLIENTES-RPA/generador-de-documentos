import type { HTMLAttributes } from 'react';

type Variant = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const map: Record<Variant, { bg: string; color: string; border: string }> = {
  neutral: { bg: 'var(--neutral-100)', color: 'var(--neutral-700)', border: 'var(--border)' },
  primary: { bg: 'var(--essa-primary-50)', color: 'var(--essa-primary)', border: '#bfd3ec' },
  accent: { bg: 'var(--essa-accent-50)', color: '#3b6b0a', border: '#cfe8ac' },
  success: { bg: 'var(--success-50)', color: 'var(--success)', border: '#bbf7d0' },
  warning: { bg: 'var(--warning-50)', color: 'var(--warning)', border: '#fde68a' },
  danger: { bg: 'var(--danger-50)', color: 'var(--danger)', border: '#fecaca' },
  info: { bg: '#eff6ff', color: 'var(--info)', border: '#bfdbfe' },
};

interface Props extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  dot?: boolean;
}

export function Badge({ variant = 'neutral', dot, style, children, ...rest }: Props) {
  const v = map[variant];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        padding: '3px 9px',
        borderRadius: 'var(--radius-badge)',
        background: v.bg,
        color: v.color,
        border: `1px solid ${v.border}`,
        lineHeight: 1,
        ...style,
      }}
      {...rest}
    >
      {dot && (
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: 'currentColor',
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}
export default Badge;

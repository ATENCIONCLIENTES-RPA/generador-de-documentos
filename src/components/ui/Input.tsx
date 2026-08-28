import { forwardRef, type InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, Props>(({ label, error, hint, id, style, ...rest }, ref) => {
  const inputId = id ?? (label ? `inp-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, ...(style as React.CSSProperties) }}>
      {label && <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-700)' }}>{label}</span>}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        style={{
          height: 40,
          borderRadius: 'var(--radius-input)',
          border: `1px solid ${error ? 'var(--danger)' : 'var(--border-strong)'}`,
          background: '#fff',
          padding: '0 12px',
          fontSize: '0.875rem',
          color: 'var(--neutral-900)',
          outline: 'none',
          transition: 'border-color var(--duration) var(--ease), box-shadow var(--duration) var(--ease)',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = error ? 'var(--danger)' : 'var(--essa-primary)';
          e.currentTarget.style.boxShadow = error ? '0 0 0 3px rgba(220,38,38,.14)' : 'var(--ring)';
          rest.onFocus?.(e as React.FocusEvent<HTMLInputElement>);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? 'var(--danger)' : 'var(--border-strong)';
          e.currentTarget.style.boxShadow = 'none';
          rest.onBlur?.(e as React.FocusEvent<HTMLInputElement>);
        }}
        {...rest}
      />
      {error ? (
        <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>{error}</span>
      ) : hint ? (
        <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>{hint}</span>
      ) : null}
    </label>
  );
});
Input.displayName = 'Input';
export default Input;

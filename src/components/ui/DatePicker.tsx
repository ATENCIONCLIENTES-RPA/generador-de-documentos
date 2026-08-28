import { forwardRef, type InputHTMLAttributes } from 'react';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

const DatePicker = forwardRef<HTMLInputElement, Props>(({ label, error, id, style, ...rest }, ref) => {
  const did = id ?? (label ? `dp-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, ...(style as React.CSSProperties) }}>
      {label && <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-700)' }}>{label}</span>}
      <input
        ref={ref}
        id={did}
        type="date"
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
        }}
        {...rest}
      />
      {error && <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>{error}</span>}
    </label>
  );
});
DatePicker.displayName = 'DatePicker';
export default DatePicker;

import { forwardRef, type SelectHTMLAttributes } from 'react';

interface Option {
  value: string;
  label: string;
}

interface Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  options: Option[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, Props>(
  ({ label, error, options, placeholder, id, style, ...rest }, ref) => {
    const sid = id ?? (label ? `sel-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
    return (
      <label
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          ...(style as React.CSSProperties),
        }}
      >
        {label && (
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-700)' }}>
            {label}
          </span>
        )}
        <div style={{ position: 'relative' }}>
          <select
            ref={ref}
            id={sid}
            aria-invalid={!!error}
            style={{
              width: '100%',
              height: 40,
              borderRadius: 'var(--radius-input)',
              border: `1px solid ${error ? 'var(--danger)' : 'var(--border-strong)'}`,
              background: '#fff',
              padding: '0 36px 0 12px',
              fontSize: '0.875rem',
              color: 'var(--neutral-900)',
              appearance: 'none',
              outline: 'none',
            }}
            {...rest}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span
            aria-hidden
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: 'var(--neutral-500)',
              fontSize: 12,
            }}
          >
            ▾
          </span>
        </div>
        {error && (
          <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>
            {error}
          </span>
        )}
      </label>
    );
  }
);
Select.displayName = 'Select';
export default Select;

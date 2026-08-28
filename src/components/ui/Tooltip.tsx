import { useState, type ReactNode } from 'react';

interface Props {
  content: ReactNode;
  children: ReactNode;
}

export function Tooltip({ content, children }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--neutral-900)',
            color: '#fff',
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '6px 10px',
            borderRadius: 8,
            whiteSpace: 'nowrap',
            boxShadow: 'var(--shadow-md)',
            zIndex: 'var(--z-tooltip)',
            pointerEvents: 'none',
          }}
        >
          {content}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid var(--neutral-900)',
            }}
          />
        </span>
      )}
    </span>
  );
}
export default Tooltip;

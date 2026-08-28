import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: number | string;
  closeOnOverlay?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 560,
  closeOnOverlay = true,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    // focus first
    queueMicrotask(() => {
      const f = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]'
      );
      f?.focus();
    });
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      onMouseDown={(e) => {
        if (closeOnOverlay && e.target === overlayRef.current) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'rgba(15,23,42,.42)',
        backdropFilter: 'blur(6px)',
      }}
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={dialogRef}
        style={{
          width: '100%',
          maxWidth: width,
          background: '#fff',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)',
          maxHeight: '85vh',
          overflow: 'auto',
        }}
      >
        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '18px 20px',
              borderBottom: '1px solid var(--border)',
              position: 'sticky',
              top: 0,
              background: '#fff',
              borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
            }}
          >
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--neutral-900)' }}>
              {title}
            </h2>
            <button
              aria-label="Cerrar"
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                border: '1px solid var(--border)',
                background: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--neutral-600)',
              }}
            >
              ×
            </button>
          </div>
        )}
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
export default Modal;

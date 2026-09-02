import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  width?: number | string;
  closeOnOverlay?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
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

  const defaultSubtitle =
    title === 'Editar registro' ? 'Revisa y actualiza la información del registro seleccionado' : subtitle;

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
        padding: '20px 16px',
        background: 'rgba(15,23,42,.48)',
        backdropFilter: 'blur(8px) saturate(120%)',
        WebkitBackdropFilter: 'blur(8px) saturate(120%)',
      }}
      aria-modal="true"
      role="dialog"
    >
      <style>{`
        @keyframes modalIn { from { opacity:0; transform: translateY(10px) scale(.98) } to { opacity:1; transform: translateY(0) scale(1) } }
        @keyframes overlayIn { from { opacity:0 } to { opacity:1 } }
        .essa-modal-overlay{ animation: overlayIn 180ms var(--ease) both }
        .essa-modal-dialog{ animation: modalIn 280ms var(--ease-out) both }
        .essa-modal-close{
          width:40px; height:40px; border-radius:10px; border:1px solid #e2e8f0; background:#fff;
          display:inline-flex; align-items:center; justify-content:center; color:#64748b;
          cursor:pointer; flex-shrink:0; transition: all 160ms var(--ease);
          box-shadow: 0 1px 2px rgba(15,23,42,.06);
        }
        .essa-modal-close:hover{ background:#f8fafc; border-color:#cbd5e1; color:#0f172a; box-shadow: 0 2px 8px rgba(15,23,42,.08); transform: translateY(-1px) }
        .essa-modal-close:active{ transform: scale(.96) }
        .essa-modal-close:focus-visible{ outline:none; box-shadow: var(--ring); border-color: var(--essa-primary) }
        .essa-modal-body{ scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent }
        .essa-modal-body::-webkit-scrollbar{ width:6px }
        .essa-modal-body::-webkit-scrollbar-thumb{ background:#cbd5e1; border-radius:999px }
      `}</style>
      <div
        ref={dialogRef}
        className="essa-modal-dialog"
        style={{
          width: '100%',
          maxWidth: width,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 24px 48px rgba(15,23,42,.18), 0 8px 16px rgba(15,23,42,.12), var(--shadow-lg)',
          border: '1px solid #e2e8f0',
          maxHeight: 'min(86vh, 760px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 16,
              padding: '18px 20px 16px',
              borderBottom: '1px solid #f1f5f9',
              background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', gap: 12, minWidth: 0, flex: 1 }}>
              <div
                aria-hidden
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  border: '1px solid #bfdbfe',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#004B93',
                  flexShrink: 0,
                  boxShadow: '0 1px 3px rgba(0,75,147,.08)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#004B93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2
                  id="essa-modal-title"
                  style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.25, letterSpacing: '-0.015em', margin: 0 }}
                >
                  {title}
                </h2>
                {defaultSubtitle && (
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0', lineHeight: 1.45, fontWeight: 500 }}>
                    {defaultSubtitle}
                  </p>
                )}
              </div>
            </div>
            <button
              aria-label="Cerrar modal"
              title="Cerrar (Esc)"
              onClick={onClose}
              className="essa-modal-close"
              data-testid="modal-close"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        <div className="essa-modal-body" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 20, display: 'flex', flexDirection: 'column', gap: 0, background: '#fff' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
export default Modal;

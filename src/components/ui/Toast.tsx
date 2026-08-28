import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

const ToastCtx = createContext<{ push: (msg: string, kind?: ToastKind) => void } | null>(null);

let idSeq = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = idSeq++;
    setItems((s) => [...s, { id, message, kind }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3200);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="essa-toast-stack" aria-live="polite">
            {items.map((t) => (
              <div
                key={t.id}
                role="status"
                style={{
                  pointerEvents: 'auto',
                  minWidth: 280,
                  maxWidth: 420,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: t.kind === 'error' ? '#0f172a' : '#0f172a',
                  color: '#fff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  boxShadow: 'var(--shadow-lg)',
                  borderLeft: `4px solid ${t.kind === 'success' ? 'var(--essa-accent)' : t.kind === 'error' ? 'var(--danger)' : 'var(--essa-primary)'}`,
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background:
                      t.kind === 'success'
                        ? 'var(--essa-accent)'
                        : t.kind === 'error'
                          ? 'var(--danger)'
                          : 'var(--essa-primary-100)',
                    flexShrink: 0,
                  }}
                />
                {t.message}
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export default ToastProvider;

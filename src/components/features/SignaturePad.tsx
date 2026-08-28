import { useRef, useState, useEffect, useCallback } from 'react';

interface SignaturePadProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
  initialSignature?: string | null;
}

type Point = { x: number; y: number };

export function SignaturePad({
  isOpen,
  onClose,
  onSave,
  initialSignature,
}: SignaturePadProps): JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#002f6c');
  const lastPoint = useRef<Point | null>(null);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.parentElement?.getBoundingClientRect();
    canvas.width = rect?.width ?? 480;
    canvas.height = 200;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.moveTo(20, canvas.height - 30);
    ctx.lineTo(canvas.width - 20, canvas.height - 30);
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = initialSignature;
    }
  }, [initialSignature]);

  useEffect(() => {
    if (!isOpen) return;
    // delay to ensure parentElement has dimensions
    const id = window.setTimeout(setupCanvas, 30);
    return () => window.clearTimeout(id);
  }, [isOpen, setupCanvas]);

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e);
    lastPoint.current = pos;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !lastPoint.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPoint.current = pos;
  };

  const stopDraw = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.preventDefault();
    setIsDrawing(false);
    lastPoint.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.moveTo(20, canvas.height - 30);
    ctx.lineTo(canvas.width - 20, canvas.height - 30);
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const penColors: { value: string; label: string }[] = [
    { value: '#002f6c', label: 'Azul marino' },
    { value: '#0f172a', label: 'Negro' },
    { value: '#1e40af', label: 'Azul' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Firma Digital"
      onClick={handleOverlayClick}
      data-testid="signature-pad-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        data-testid="signature-pad-modal"
        style={{
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          width: '100%',
          maxWidth: 540,
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' }}>
            Firma Digital
          </h3>
          <button
            onClick={onClose}
            aria-label="Cerrar modal de firma"
            data-testid="signature-close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ padding: 20 }}>
          <div
            style={{
              border: '2px solid #e5e7eb',
              borderRadius: 8,
              overflow: 'hidden',
              marginBottom: 16,
            }}
          >
            <canvas
              ref={canvasRef}
              data-testid="signature-canvas"
              aria-label="Área de firma"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
              style={{
                display: 'block',
                width: '100%',
                height: 200,
                cursor: 'crosshair',
                touchAction: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: '#6b7280', marginRight: 4 }}>Color de trazo:</span>
            {penColors.map((c) => (
              <button
                key={c.value}
                onClick={() => setPenColor(c.value)}
                aria-label={`Color ${c.label}`}
                aria-pressed={penColor === c.value}
                data-testid={`pen-color-${c.value}`}
                title={c.label}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: penColor === c.value ? '3px solid #004B93' : '2px solid #d1d5db',
                  background: c.value,
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={clearCanvas}
            data-testid="signature-clear"
            aria-label="Limpiar trazo"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              background: '#ffffff',
              color: '#374151',
              fontSize: 13,
              cursor: 'pointer',
              marginBottom: 16,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Limpiar trazo
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '14px 20px',
            borderTop: '1px solid #e5e7eb',
            background: '#f9fafb',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            data-testid="signature-cancel"
            aria-label="Cancelar firma"
            style={{
              padding: '8px 18px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              background: '#ffffff',
              color: '#374151',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            data-testid="signature-save"
            aria-label="Guardar firma"
            style={{
              padding: '8px 18px',
              border: 'none',
              borderRadius: 6,
              background: '#004B93',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            Guardar Firma
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignaturePad;
export const SignaturePadModal = SignaturePad;

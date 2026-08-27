import React, { useRef, useState, useEffect } from 'react';
import { X, Eraser, Check, PenTool } from 'lucide-react';

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
  initialSignature?: string;
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSignature,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [penColor, setPenColor] = useState('#002f6c'); // Navy ESSA blue or dark

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = penColor;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // If there's an initial signature or default, we can draw a baseline guide
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, canvas.height - 40);
        ctx.lineTo(canvas.width - 30, canvas.height - 40);
        ctx.stroke();

        ctx.strokeStyle = penColor;
        ctx.lineWidth = 2.5;
        setHasContent(false);
      }, 50);
    }
  }, [isOpen, penColor]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasContent(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw guide line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, canvas.height - 40);
    ctx.lineTo(canvas.width - 30, canvas.height - 40);
    ctx.stroke();

    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.5;
    setHasContent(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  };

  return (
    <div id="signature-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#f8fafc]">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-[#004b93] rounded-lg">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Panel de Firma Digital</h3>
              <p className="text-xs text-slate-500">Dibuja tu trazo con el ratón o dispositivo táctil</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="border-2 border-dashed border-blue-200 rounded-xl bg-[#fafcff] p-2 relative">
            <canvas
              ref={canvasRef}
              width={480}
              height={200}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-[200px] touch-none cursor-crosshair rounded-lg bg-transparent"
            />
            <span className="absolute bottom-3 left-6 text-[11px] text-slate-400 pointer-events-none select-none">
              Firma digital sobre la línea guía
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Tinta:</span>
              <button
                type="button"
                onClick={() => setPenColor('#002f6c')}
                className={`w-6 h-6 rounded-full bg-[#002f6c] border-2 transition-all ${penColor === '#002f6c' ? 'border-slate-800 scale-110 shadow-sm' : 'border-transparent'}`}
                title="Azul Institucional ESSA"
              />
              <button
                type="button"
                onClick={() => setPenColor('#0f172a')}
                className={`w-6 h-6 rounded-full bg-slate-900 border-2 transition-all ${penColor === '#0f172a' ? 'border-blue-500 scale-110 shadow-sm' : 'border-transparent'}`}
                title="Negro tinta"
              />
              <button
                type="button"
                onClick={() => setPenColor('#1e40af')}
                className={`w-6 h-6 rounded-full bg-blue-700 border-2 transition-all ${penColor === '#1e40af' ? 'border-slate-800 scale-110 shadow-sm' : 'border-transparent'}`}
                title="Azul clásico"
              />
            </div>

            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              <Eraser className="w-3.5 h-3.5" />
              Limpiar trazo
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#004b93] hover:bg-[#003870] rounded-lg shadow-sm transition-colors"
          >
            <Check className="w-4 h-4" />
            Guardar Firma
          </button>
        </div>
      </div>
    </div>
  );
};

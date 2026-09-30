import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import type { Record as EssaRecord } from '@/types/record';
import { buildReferencia, normalizeReferenciaEmails } from '@/utils/referencia';

interface Props {
  open: boolean;
  onClose: () => void;
  record: EssaRecord | null;
}

export function RadicarModal({ open, onClose, record }: Props) {
  const [referencia, setReferencia] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);
  const [radicarTouched, setRadicarTouched] = useState(false);
  const copyResetTimer = useRef<number | undefined>(undefined);

  const autoReferencia = useMemo(() => buildReferencia(record), [record]);

  useEffect(() => {
    if (open) {
      setReferencia(autoReferencia);
      setCopiedRef(false);
      setRadicarTouched(false);
    }
  }, [open, autoReferencia]);

  useEffect(() => {
    return () => {
      if (copyResetTimer.current !== undefined) window.clearTimeout(copyResetTimer.current);
    };
  }, []);

  const isRadicarValid = useMemo(() => referencia.trim().length > 0, [referencia]);

  const handleCopyReferencia = useCallback(async () => {
    const text = referencia;
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } finally {
        ta.remove();
      }
    }
    setCopiedRef(true);
    if (copyResetTimer.current !== undefined) window.clearTimeout(copyResetTimer.current);
    copyResetTimer.current = window.setTimeout(() => setCopiedRef(false), 1800);
  }, [referencia]);

  const handleConfirmRadicar = useCallback(() => {
    setRadicarTouched(true);
    const finalReferencia = normalizeReferenciaEmails(referencia);
    if (finalReferencia !== referencia) {
      setReferencia(finalReferencia);
    }
    if (!finalReferencia.trim()) return;
    window.open(
      'https://epmco-my.sharepoint.com.mcas.ms/personal/atencionclientes_essa_com_co/Lists/DATOS_RADICACION_EXTERNA/AllItems.aspx',
      '_blank',
      'noopener,noreferrer'
    );
    onClose();
    setRadicarTouched(false);
  }, [referencia, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Enviar a Radicar"
      subtitle="Completa la información para radicar en Mercurio. Los campos marcados con * son obligatorios."
      width={680}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Referencia — generada automáticamente con formato por campo, editable */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <style>{`@keyframes radicar-copy-pop{0%{transform:scale(1)}40%{transform:scale(1.12)}100%{transform:scale(1)}}`}</style>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
              Referencia <span style={{ color: '#dc2626' }}>*</span>{' '}
              <span style={{ fontWeight: 500, color: '#64748b', fontSize: '0.72rem' }}>
                (generada automáticamente, editable)
              </span>
            </label>
            <button
              type="button"
              onClick={handleCopyReferencia}
              disabled={!referencia.trim()}
              data-testid="radicar-copiar"
              title={copiedRef ? '¡Referencia copiada!' : 'Copiar referencia'}
              aria-label={copiedRef ? 'Referencia copiada' : 'Copiar referencia'}
              className="radicar-copy-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                fontSize: '0.74rem',
                fontWeight: 700,
                letterSpacing: '0.01em',
                cursor: referencia.trim() ? 'pointer' : 'not-allowed',
                border: `1px solid ${copiedRef ? '#6ee7b7' : '#bfdbfe'}`,
                background: copiedRef ? '#ecfdf5' : '#eff6ff',
                color: copiedRef ? '#065f46' : '#1d4ed8',
                boxShadow: copiedRef
                  ? '0 2px 10px rgba(16,185,129,0.25)'
                  : '0 1px 3px rgba(30,64,175,0.12)',
                opacity: referencia.trim() ? 1 : 0.55,
                transition:
                  'background 180ms ease, color 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 120ms ease',
                animation: copiedRef ? 'radicar-copy-pop 320ms ease' : undefined,
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (!referencia.trim()) return;
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = copiedRef
                  ? '0 4px 14px rgba(16,185,129,0.32)'
                  : '0 4px 12px rgba(30,64,175,0.20)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = copiedRef
                  ? '0 2px 10px rgba(16,185,129,0.25)'
                  : '0 1px 3px rgba(30,64,175,0.12)';
              }}
              onMouseDown={(e) => {
                if (!referencia.trim()) return;
                e.currentTarget.style.transform = 'scale(0.96)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
            >
              {copiedRef ? (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
              {copiedRef ? '¡Copiado!' : 'Copiar'}
            </button>
          </div>
          <span
            aria-live="polite"
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              overflow: 'hidden',
              clip: 'rect(0 0 0 0)',
            }}
          >
            {copiedRef ? 'Referencia copiada al portapapeles' : ''}
          </span>
          <textarea
            value={referencia}
            onChange={(e) => {
              setReferencia(e.target.value);
              setCopiedRef(false);
            }}
            onBlur={() => setReferencia((prev) => normalizeReferenciaEmails(prev))}
            placeholder="La referencia se genera automáticamente con los datos del registro. Puede editarla libremente: modificar, agregar o eliminar información."
            data-testid="radicar-referencia"
            rows={8}
            style={{
              minHeight: 170,
              borderRadius: 10,
              border: `1px solid ${radicarTouched && !referencia.trim() ? '#fca5a5' : '#cbd5e1'}`,
              background: radicarTouched && !referencia.trim() ? '#fef2f2' : '#fff',
              padding: '10px 12px',
              fontSize: '0.84rem',
              lineHeight: 1.5,
              color: '#0f172a',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              transition: 'all 150ms',
            }}
          />
          {radicarTouched && !referencia.trim() && (
            <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 600 }}>
              La referencia no puede estar vacía.
            </span>
          )}
        </div>

        {/* Footer buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            paddingTop: 8,
            borderTop: '1px solid #f1f5f9',
            marginTop: 4,
          }}
        >
          <Button variant="ghost" onClick={onClose} data-testid="radicar-cancelar">
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={!isRadicarValid}
            onClick={() => {
              setRadicarTouched(true);
              if (!isRadicarValid) return;
              handleConfirmRadicar();
            }}
            data-testid="radicar-enviar"
            title={!isRadicarValid ? 'Complete la referencia' : 'Enviar a Radicar'}
            style={{ minWidth: 148, opacity: !isRadicarValid ? 0.6 : 1 }}
          >
            Enviar a Radicar
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginLeft: 6 }}
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default RadicarModal;

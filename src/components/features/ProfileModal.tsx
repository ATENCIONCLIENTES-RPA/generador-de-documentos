import React, { useState, useRef, useEffect } from 'react';
import { useProfileStore } from '@/store/profileStore';
import { SignaturePad } from '@/components/features/SignaturePad';
import Input from '@/components/ui/Input';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps): JSX.Element | null {
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);

  const [form, setForm] = useState({
    name: profile.name ?? '',
    position: profile.position ?? '',
  });
  const [signature, setSignature] = useState<string | null>(profile.signatureUrl ?? null);
  const [scale, setScale] = useState<number>(profile.signatureScale ?? 100);
  const [showPad, setShowPad] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar estado cuando se abre el modal o cambia el perfil externo
  useEffect(() => {
    if (isOpen) {
      setForm({
        name: profile.name ?? '',
        position: profile.position ?? '',
      });
      setSignature(profile.signatureUrl ?? null);
      setScale(profile.signatureScale ?? 100);
      setErrors({});
    }
  }, [isOpen, profile.name, profile.position, profile.signatureUrl, profile.signatureScale]);

  // Manejo de Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showPad) {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, showPad, onClose]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'El nombre es obligatorio';
    if (form.position.trim() && form.position.trim().length < 2) next.position = 'Cargo muy corto';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = (field: 'name' | 'position', value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 2 * 1024 * 1024) {
        setErrors((p) => ({ ...p, signature: 'Imagen supera 2MB' }));
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => setSignature(ev.target?.result as string);
      reader.readAsDataURL(file);
      setErrors((p) => ({ ...p, signature: '' }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 2 * 1024 * 1024) {
        setErrors((p) => ({ ...p, signature: 'Imagen supera 2MB' }));
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => setSignature(ev.target?.result as string);
      reader.readAsDataURL(file);
      setErrors((p) => ({ ...p, signature: '' }));
    }
  };

  const handleSave = () => {
    if (!validate()) return;
    setProfile({
      name: form.name.trim(),
      position: form.position.trim(),
      email: profile.email ?? '',
      signatureUrl: signature,
      signatureScale: scale,
    });
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const handleClearDraft = () => {
    setForm({
      name: profile.name ?? '',
      position: profile.position ?? '',
    });
    setSignature(profile.signatureUrl ?? null);
    setScale(profile.signatureScale ?? 100);
    setErrors({});
  };

  const isDirty =
    form.name !== (profile.name ?? '') ||
    form.position !== (profile.position ?? '') ||
    signature !== (profile.signatureUrl ?? null) ||
    scale !== (profile.signatureScale ?? 100);

  return (
    <div
      className="pf-modal-overlay"
      data-testid="profile-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Configuración de Perfil y Firma"
      onClick={(e) => {
        if (e.target === e.currentTarget && !showPad) onClose();
      }}
    >
      <style>{`
        .pf-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: pfFadeIn 180ms ease-out;
        }
        @keyframes pfFadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .pf-modal-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 20px 45px -10px rgba(15, 23, 42, 0.25), 0 0 1px 1px rgba(15, 23, 42, 0.05);
          width: 100%;
          max-width: 680px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .pf-modal-head {
          padding: 16px 20px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .pf-modal-close {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: transparent;
          border: 1px solid transparent;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          cursor: pointer;
          transition: background 150ms, color 150ms;
        }
        .pf-modal-close:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .pf-modal-body {
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .pf-modal-foot {
          padding: 14px 20px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
        }
        .pf-btn-save {
          background: #004B93;
          color: #ffffff;
          border: none;
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: background 150ms, transform 100ms;
        }
        .pf-btn-save:hover {
          background: #003870;
          transform: translateY(-1px);
        }
        .pf-btn-save:active {
          transform: translateY(0);
        }
        .pf-btn-cancel {
          background: #ffffff;
          color: #475569;
          border: 1px solid #cbd5e1;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 150ms, border-color 150ms;
        }
        .pf-btn-cancel:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
          color: #0f172a;
        }
        .pf-btn-reset {
          background: transparent;
          color: #64748b;
          border: 1px solid transparent;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          margin-right: auto;
        }
        .pf-btn-reset:hover {
          background: #f1f5f9;
          color: #334155;
        }
      `}</style>

      <div className="pf-modal-card" data-testid="profile-card">
        {/* Header */}
        <div className="pf-modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#eff6ff',
                color: '#004B93',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-hidden
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
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Perfil del Funcionario Firmante
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                Configuración del nombre, cargo y firma para la generación documental
              </p>
            </div>
          </div>
          <button
            type="button"
            className="pf-modal-close"
            onClick={onClose}
            aria-label="Cerrar modal"
            data-testid="profile-modal-close"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="pf-modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Input
                label="Nombre completo"
                placeholder="Ej: Jaime Arley Rizo Morales"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                aria-label="Nombre completo"
                data-testid="profile-name"
              />
              {errors.name && (
                <span
                  data-testid="profile-error-name"
                  style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: 3, display: 'block' }}
                >
                  {errors.name}
                </span>
              )}
            </div>
            <div>
              <Input
                label="Cargo"
                placeholder="Ej: Profesional de Soporte"
                value={form.position}
                onChange={(e) => handleChange('position', e.target.value)}
                aria-label="Cargo"
                data-testid="profile-position"
              />
              {errors.position && (
                <span
                  data-testid="profile-error-position"
                  style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: 3, display: 'block' }}
                >
                  {errors.position}
                </span>
              )}
            </div>
          </div>

          <div>
            <label
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: 6,
                display: 'block',
              }}
            >
              Firma Digital
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
              data-testid="profile-file-input"
              aria-hidden
            />

            {!signature ? (
              <div
                data-testid="signature-dropzone"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Arrastra tu imagen de firma aquí o haz clic para buscar"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                style={{
                  minHeight: 120,
                  border: `2px dashed ${dragOver ? '#76BC21' : '#cbd5e1'}`,
                  borderRadius: 12,
                  padding: 16,
                  textAlign: 'center',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  background: dragOver ? 'rgba(118,188,33,0.06)' : '#f8fafc',
                  transition: 'border-color 150ms, background 150ms',
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                  Arrastra tu imagen de firma aquí o{' '}
                  <span style={{ color: '#004B93', fontWeight: 700 }}>haz clic para buscar</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  Formatos: PNG, JPG, SVG (máx. 2MB)
                </div>
                {errors.signature && (
                  <span style={{ fontSize: '0.72rem', color: '#dc2626' }}>{errors.signature}</span>
                )}
              </div>
            ) : (
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '14px',
                  background: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <img
                  src={signature}
                  alt="Firma digital"
                  data-testid="profile-signature-img"
                  style={{
                    height: Math.round(64 * (scale / 100)),
                    width: 'auto',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    borderRadius: 6,
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    padding: '4px 10px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#15803d',
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Firma cargada correctamente
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="profile-replace-signature"
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      color: '#004B93',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: 6,
                      padding: '4px 10px',
                      cursor: 'pointer',
                    }}
                  >
                    Reemplazar imagen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSignature(null);
                    }}
                    data-testid="profile-remove-signature"
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      color: '#dc2626',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 6,
                      padding: '4px 10px',
                      cursor: 'pointer',
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}

            {!signature && (
              <div style={{ textAlign: 'center', marginTop: 8, fontSize: '0.78rem' }}>
                <span style={{ color: '#94a3b8' }}>o </span>
                <button
                  type="button"
                  onClick={() => setShowPad(true)}
                  data-testid="profile-open-pad"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#004B93',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    textDecoration: 'underline',
                  }}
                >
                  dibuja tu firma en pantalla
                </button>
              </div>
            )}

            {signature && (
              <div
                data-testid="profile-signature-size"
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '10px 12px',
                  marginTop: 10,
                  background: '#ffffff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <label
                    htmlFor="signature-scale-input"
                    style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}
                  >
                    Escala de la firma en el documento
                  </label>
                  <span
                    data-testid="profile-signature-scale-value"
                    style={{ fontSize: '0.78rem', fontWeight: 800, color: '#004B93' }}
                  >
                    {scale}%
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    id="signature-scale-input"
                    type="range"
                    min={50}
                    max={200}
                    step={5}
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    data-testid="profile-signature-scale"
                    style={{ flex: 1, accentColor: '#004B93' }}
                  />
                  <button
                    type="button"
                    onClick={() => setScale(100)}
                    data-testid="profile-signature-scale-reset"
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: '#004B93',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: 6,
                      padding: '3px 8px',
                      cursor: 'pointer',
                    }}
                  >
                    100%
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pf-modal-foot">
          {isDirty && (
            <button
              type="button"
              className="pf-btn-reset"
              onClick={handleClearDraft}
              data-testid="profile-reset"
            >
              Restablecer
            </button>
          )}
          <button
            type="button"
            className="pf-btn-cancel"
            onClick={onClose}
            data-testid="profile-cancel"
          >
            Cancelar
          </button>
          <button
            type="button"
            className="pf-btn-save"
            onClick={handleSave}
            data-testid="profile-save"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Guardar perfil
          </button>
        </div>
      </div>

      {/* Canvas Drawing Pad */}
      <SignaturePad
        isOpen={showPad}
        onClose={() => setShowPad(false)}
        onSave={(dataUrl) => {
          setSignature(dataUrl);
          setShowPad(false);
          setErrors((p) => ({ ...p, signature: '' }));
        }}
        initialSignature={signature}
      />
    </div>
  );
}

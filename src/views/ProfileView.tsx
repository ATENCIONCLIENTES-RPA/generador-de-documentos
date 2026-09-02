import { useState, useRef, useEffect } from 'react';
import { animate } from 'animejs';
import { prefersReducedMotion } from '@/utils/motion';
import { useProfileStore } from '@/store/profileStore';
import { useNavigationStore } from '@/store/navigationStore';
import { SignaturePad } from '@/components/features/SignaturePad';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export function ProfileView(): JSX.Element {
  const profile = useProfileStore((s) => s.profile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const goTo = useNavigationStore((s) => s.goTo);
  const complete = useNavigationStore((s) => s.complete);

  const [form, setForm] = useState({
    name: profile.name ?? '',
    position: profile.position ?? '',
    email: profile.email ?? '',
  });
  const [signature, setSignature] = useState<string | null>(profile.signatureUrl ?? null);
  const [showPad, setShowPad] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Card entrance animation
  useEffect(() => {
    if (prefersReducedMotion() || !cardRef.current) return;
    animate(cardRef.current, {
      y: [16, 0],
      opacity: [0, 1],
      duration: 350,
      ease: 'power3.out',
    });
  }, []);

  // keep local form in sync if profile external changes (persist hydrate)
  useEffect(() => {
    setForm({
      name: profile.name ?? '',
      position: profile.position ?? '',
      email: profile.email ?? '',
    });
    setSignature(profile.signatureUrl ?? null);
  }, [profile.name, profile.position, profile.email, profile.signatureUrl]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'El nombre es obligatorio';
    if (!form.email.trim()) next.email = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Correo no válido';
    // position optional but if provided min 2 chars
    if (form.position.trim() && form.position.trim().length < 2) next.position = 'Cargo muy corto';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = (field: 'name' | 'position' | 'email', value: string) => {
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
      email: form.email.trim(),
      signatureUrl: signature,
    });
    complete('perfil');
    goTo('configuracion');
  };

  const handleCancel = () => {
    goTo('inicio');
  };

  const handleClearDraft = () => {
    // restore to stored profile
    setForm({
      name: profile.name ?? '',
      position: profile.position ?? '',
      email: profile.email ?? '',
    });
    setSignature(profile.signatureUrl ?? null);
    setErrors({});
  };

  return (
    <div data-testid="profile-view" style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, justifyContent: 'center', padding: '4px 0' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', width: '100%' }}>
        <div
          data-testid="profile-card"
          ref={cardRef}
          style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{ height: 4, background: 'linear-gradient(90deg, #004B93, #3b82f6)' }}
            aria-hidden
          />

          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span
                aria-hidden
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: '#eff6ff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#004B93',
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#004B93"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <div>
                <h2
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    color: 'var(--neutral-900)',
                    margin: 0,
                    lineHeight: 1.1,
                  }}
                >
                  Módulo 1: Configuración de Perfil
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', margin: 0 }}>
                  Información del funcionario firmante
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                marginBottom: 16,
              }}
            >
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
                    style={{ fontSize: '0.72rem', color: '#dc2626' }}
                  >
                    {errors.name}
                  </span>
                )}
              </div>
              <div>
                <Input
                  label="Cargo"
                  placeholder="Ej: Técnico"
                  value={form.position}
                  onChange={(e) => handleChange('position', e.target.value)}
                  aria-label="Cargo"
                  data-testid="profile-position"
                />
                {errors.position && (
                  <span
                    data-testid="profile-error-position"
                    style={{ fontSize: '0.72rem', color: '#dc2626' }}
                  >
                    {errors.position}
                  </span>
                )}
              </div>
              <div>
                <Input
                  label="Correo electrónico"
                  type="email"
                  placeholder="Ej: example@essa.com.co"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  aria-label="Correo electrónico"
                  data-testid="profile-email"
                />
                {errors.email && (
                  <span
                    data-testid="profile-error-email"
                    style={{ fontSize: '0.72rem', color: '#dc2626' }}
                  >
                    {errors.email}
                  </span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <h3
                style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}
              >
                Firma Digital
              </h3>

              <div
                style={{
                  position: 'relative',
                  minHeight: 132,
                  marginBottom: 8,
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                  data-testid="profile-file-input"
                  aria-hidden
                />

                {/* ── EMPTY STATE: dropzone + dibuja tu firma ── */}
                <div
                  data-testid="signature-dropzone"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => !signature && fileInputRef.current?.click()}
                  role="button"
                  tabIndex={signature ? -1 : 0}
                  aria-label="Arrastra tu imagen de firma aquí o haz clic para buscar"
                  onKeyDown={(e) => {
                    if (!signature && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    border: `2px dashed ${dragOver ? '#76BC21' : '#e2e8f0'}`,
                    borderRadius: 12,
                    padding: 16,
                    textAlign: 'center',
                    cursor: signature ? 'default' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: dragOver ? 'rgba(118,188,33,0.06)' : '#fff',
                    transition: 'opacity 320ms cubic-bezier(.4,0,.2,1), transform 320ms cubic-bezier(.4,0,.2,1), border-color 150ms var(--ease), background 150ms var(--ease)',
                    opacity: signature ? 0 : 1,
                    transform: signature ? 'scale(0.97)' : 'scale(1)',
                    pointerEvents: signature ? 'none' : 'auto',
                    zIndex: signature ? 0 : 1,
                  }}
                >
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Arrastra tu imagen de firma aquí o{' '}
                    <span style={{ color: '#004B93', fontWeight: 600 }}>haz clic para buscar</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    Formatos: PNG, JPG, SVG (max 2MB)
                  </div>
                  {errors.signature && (
                    <span style={{ fontSize: '0.72rem', color: '#dc2626' }}>{errors.signature}</span>
                  )}
                </div>

                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    textAlign: 'center',
                    cursor: 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'opacity 320ms cubic-bezier(.4,0,.2,1), transform 320ms cubic-bezier(.4,0,.2,1)',
                    opacity: signature ? 1 : 0,
                    transform: signature ? 'scale(1)' : 'scale(1.02)',
                    pointerEvents: signature ? 'auto' : 'none',
                    zIndex: signature ? 1 : 0,
                  }}
                >
                  <img
                    src={signature!}
                    alt="Firma digital"
                    data-testid="profile-signature-img"
                    style={{
                      height: 72,
                      maxWidth: '100%',
                      objectFit: 'contain',
                      borderRadius: 8,
                      background: '#fff',
                      border: '2px solid #e2e8f0',
                      padding: '6px 12px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    }}
                  />
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#76BC21"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }}
                      aria-hidden
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Firma cargada
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: 2 }}>
                    Se aplicará automáticamente en los documentos generados.
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="profile-replace-signature"
                      aria-label="Reemplazar firma"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: '#004B93',
                        background: '#f0f7ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: 6,
                        padding: '4px 10px',
                        cursor: 'pointer',
                        transition: 'background 150ms, border-color 150ms',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#e0efff';
                        e.currentTarget.style.borderColor = '#93c5fd';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f0f7ff';
                        e.currentTarget.style.borderColor = '#bfdbfe';
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                      </svg>
                      Reemplazar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSignature(null);
                        updateProfile({ signatureUrl: null });
                      }}
                      data-testid="profile-remove-signature"
                      aria-label="Eliminar firma"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: '#dc2626',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: 6,
                        padding: '4px 10px',
                        cursor: 'pointer',
                        transition: 'background 150ms, border-color 150ms',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fee2e2';
                        e.currentTarget.style.borderColor = '#fca5a5';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fef2f2';
                        e.currentTarget.style.borderColor = '#fecaca';
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>

              {!signature && (
                <div style={{ textAlign: 'center', marginBottom: 12, fontSize: '0.8rem' }}>
                  <span style={{ color: '#94a3b8' }}>o </span>
                  <button
                    type="button"
                    onClick={() => setShowPad(true)}
                    data-testid="profile-open-pad"
                    aria-label="Dibuja tu firma en pantalla"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#004B93',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      textDecoration: 'underline',
                    }}
                  >
                    dibuja tu firma en pantalla
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Button
                variant="ghost"
                onClick={handleCancel}
                data-testid="profile-cancel"
                aria-label="Cancelar perfil"
              >
                Cancelar
              </Button>
              <Button
                variant="ghost"
                onClick={handleClearDraft}
                data-testid="profile-clear-draft"
                aria-label="Restablecer perfil"
              >
                Restablecer
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!form.name.trim() || !form.email.trim()}
                data-testid="profile-save"
                aria-label="Guardar perfil"
              >
                <svg
                  width="16"
                  height="16"
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
                Guardar Perfil
              </Button>
            </div>
            {profile.signatureUrl && !signature && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: '0.72rem',
                  color: 'var(--neutral-500)',
                  textAlign: 'right',
                }}
              >
                Firma persistida actualmente: guardada en navegador
              </div>
            )}
          </div>
        </div>
      </div>

      <SignaturePad
        isOpen={showPad}
        onClose={() => setShowPad(false)}
        onSave={(dataUrl) => {
          setSignature(dataUrl);
          // persist inmediatamente
          updateProfile({ signatureUrl: dataUrl });
        }}
        initialSignature={signature}
      />
    </div>
  );
}

export default ProfileView;

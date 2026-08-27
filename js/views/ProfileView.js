const ProfileView = ({ profile, onSaveProfile, onNavigate }) => {
  const [form, setForm] = React.useState({
    name: profile?.name || '',
    position: profile?.position || '',
    email: profile?.email || '',
  });
  const [signature, setSignature] = React.useState(profile?.signatureUrl || null);
  const [showSignaturePad, setShowSignaturePad] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const fileInputRef = React.useRef(null);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setSignature(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setSignature(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSaveProfile({ ...form, signatureUrl: signature });
    onNavigate('config');
  };

  return (
    <div className="animate-fade-in">
      <div className="main-container">
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div className="card" style={{ overflow: 'hidden' }}>
            {/* Blue top accent */}
            <div style={{ height: '4px', background: 'linear-gradient(90deg, #004b93, #3b82f6)' }} />

            <div style={{ padding: '2rem' }}>
              <div className="flex items-center gap-3 mb-6">
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '0.75rem',
                    background: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#004b93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                    Módulo 1: Configuración de Perfil
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                    Información del funcionario firmante
                  </p>
                </div>
              </div>

              {/* Form Fields - 3 column grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="form-label">Nombre completo</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej: Jaime Arley Rizo Morales"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Cargo</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej: Técnico"
                    value={form.position}
                    onChange={(e) => handleChange('position', e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Correo electrónico</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="Ej: example@essa.com.co"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </div>
              </div>

              {/* Firma Digital Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem' }}>
                  Firma Digital
                </h3>

                {/* Drag/Drop upload */}
                <div
                  className={`drop-zone ${dragOver ? 'hover' : ''}`}
                  style={{ minHeight: '140px', marginBottom: '0.75rem' }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Arrastra tu imagen de firma aquí o{' '}
                    <span style={{ color: '#004b93', fontWeight: 600 }}>haz clic para buscar</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    Formatos: PNG, JPG, SVG (max 2MB)
                  </div>
                </div>

                <div className="text-center mb-3" style={{ fontSize: '0.8rem' }}>
                  <span style={{ color: '#94a3b8' }}>o </span>
                  <button
                    type="button"
                    onClick={() => setShowSignaturePad(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#004b93',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      textDecoration: 'underline',
                    }}
                  >
                    dibuja tu firma en pantalla
                  </button>
                </div>

                {/* Signature Preview */}
                {signature && (
                  <div
                    style={{
                      border: '2px solid #e2e8f0',
                      borderRadius: '0.75rem',
                      padding: '1rem',
                      background: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                    }}
                  >
                    <img
                      src={signature}
                      alt="Firma digital"
                      style={{ height: '60px', objectFit: 'contain', borderRadius: '0.375rem' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>
                        Firma cargada
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        La firma se aplicará automáticamente en los documentos generados.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSignature(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        padding: '4px',
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
                <button
                  className="btn-secondary"
                  onClick={() => onNavigate('home')}
                >
                  Cancelar
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSave}
                  disabled={!form.name || !form.email}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Guardar Perfil
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SignaturePadModal
        isOpen={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        onSave={(dataUrl) => setSignature(dataUrl)}
        initialSignature={signature}
      />
    </div>
  );
};

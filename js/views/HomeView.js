const HomeView = ({ onNavigate, selectedTemplate, selectedRecord, hasExcelLoaded, onLoadSampleData }) => {
  const features = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#004b93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
      title: 'Rápido',
      desc: 'Genera documentos en segundos con datos automatizados.',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#004b93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
      title: 'Seguro',
      desc: 'Tus datos permanecen seguros en tu navegador local.',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#004b93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
      title: 'Personalizado',
      desc: 'Adapta cada plantilla con variables específicas del caso.',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#004b93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        </svg>
      ),
      title: 'En la nube',
      desc: 'Accede desde cualquier navegador sin instalaciones.',
    },
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '0 0 2rem' }}>
      <div className="main-container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8" style={{ marginBottom: '3rem' }}>
          {/* Left text */}
          <div className="lg:col-span-7">
            <div
              className="badge"
              style={{
                backgroundColor: '#eff6ff',
                color: '#004b93',
                borderColor: '#bfdbfe',
                marginBottom: '1rem',
                fontSize: '11px',
                letterSpacing: '0.1em',
              }}
            >
              GENERADOR DE PLANTILLAS
            </div>
            <h1
              style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                color: '#1e293b',
                lineHeight: 1.15,
                marginBottom: '1rem',
                letterSpacing: '-0.025em',
              }}
            >
              Generación documental{' '}
              <span style={{ color: '#004b93' }}>con Word</span>
            </h1>
            <p
              style={{
                fontSize: '1.05rem',
                color: '#64748b',
                lineHeight: 1.65,
                maxWidth: '540px',
                marginBottom: '1.5rem',
              }}
            >
              Plataforma interna de ESSA para automatizar la generación de documentos
              oficiales a partir de plantillas Word y datos de clientes cargados
              desde archivos Excel.
            </p>
            <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={() => onNavigate('profile')} style={{ fontSize: '0.95rem', padding: '0.75rem 1.75rem' }}>
                Comenzar Flujo
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
              {!hasExcelLoaded && (
                <button className="btn-secondary" onClick={onLoadSampleData} style={{ fontSize: '0.95rem', padding: '0.75rem 1.75rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Cargar Datos de Ejemplo
                </button>
              )}
            </div>
          </div>

          {/* Right illustration */}
          <div className="lg:col-span-5" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <EnergyIllustration />
          </div>
        </div>

        {/* Welcome Card */}
        <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
            Bienvenido al Generador
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
            Herramienta de uso interno para la creación automatizada de documentos oficiales ESSA.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" style={{ marginBottom: '1.5rem' }}>
            {features.map((f, i) => (
              <div
                key={i}
                style={{
                  padding: '1.25rem',
                  borderRadius: '0.75rem',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '0.75rem',
                    background: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.75rem',
                  }}
                >
                  {f.icon}
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e293b', marginBottom: '0.25rem' }}>
                  {f.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.45 }}>
                  {f.desc}
                </div>
              </div>
            ))}
          </div>

          {/* Info Callout */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              padding: '1rem 1.25rem',
              borderRadius: '0.75rem',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#004b93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e40af', marginBottom: '0.25rem' }}>
                ¿Cómo funciona?
              </div>
              <div style={{ fontSize: '0.8rem', color: '#1e40af', lineHeight: 1.55 }}>
                1. Configura tu perfil y firma digital → 2. Carga el archivo Excel con datos de clientes →
                3. Revisa y selecciona registros → 4. Elige la plantilla Word → 5. Previsualiza y genera
                los documentos finales en formato DOCX.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

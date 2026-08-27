const PreviewView = ({ template, selectedRecords, profile, onNavigate }) => {
  const [zoom, setZoom] = React.useState(100);
  const [currentPage, setCurrentPage] = React.useState(1);

  const records = selectedRecords?.filter((r) => r.selected) || [];
  const record = records.length > 0 ? records[Math.min(currentPage - 1, records.length - 1)] : null;

  const totalPages = Math.max(1, records.length);

  const zoomIn = () => setZoom((z) => Math.min(z + 10, 150));
  const zoomOut = () => setZoom((z) => Math.max(z - 10, 60));

  const renderDocumentContent = () => {
    if (!template || !record) return null;
    const content = template.sampleContent || '';
    return replaceTemplateVariables(content, record, profile);
  };

  const today = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

  if (!template || records.length === 0) {
    return (
      <div className="animate-fade-in">
        <div className="main-container">
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 1rem' }}>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>
              Sin vista previa disponible
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
              Selecciona una plantilla y al menos un registro para previsualizar.
            </p>
            <button className="btn-primary" onClick={() => onNavigate('templates')}>
              Ir a Selección de Plantillas
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="main-container">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
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
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Módulo 5: Vista Previa del Documento
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Revisa el documento generado antes de descargar
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel (3 cols) */}
          <div className="lg:col-span-3">
            <div className="card" style={{ padding: '1.25rem', position: 'sticky', top: '100px' }}>
              {/* Zoom Controls */}
              <div className="flex items-center justify-between mb-4">
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Zoom</span>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-secondary"
                    onClick={zoomOut}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                    disabled={zoom <= 60}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', minWidth: '40px', textAlign: 'center' }}>
                    {zoom}%
                  </span>
                  <button
                    className="btn-secondary"
                    onClick={zoomIn}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                    disabled={zoom >= 150}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Page Navigation */}
              <div className="flex items-center justify-between mb-4" style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                <button
                  className="btn-secondary"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  style={{ padding: '0.25rem 0.5rem' }}
                >
                  ‹
                </button>
                <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                  Pág. <strong>{currentPage}</strong> / {totalPages}
                </span>
                <button
                  className="btn-secondary"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  style={{ padding: '0.25rem 0.5rem' }}
                >
                  ›
                </button>
              </div>

              {/* Summary Box */}
              <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.75rem' }}>
                <div className="flex justify-between mb-1">
                  <span style={{ color: '#64748b' }}>Plantilla:</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{template?.title?.substring(0, 20)}...</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span style={{ color: '#64748b' }}>Registros:</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{records.length}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#64748b' }}>Firmante:</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{profile?.name?.split(' ').slice(0, 2).join(' ')}</span>
                </div>
              </div>

              {/* Confirm Button */}
              <button
                className="btn-success w-full"
                onClick={() => onNavigate('generate')}
                style={{ justifyContent: 'center', padding: '0.75rem 1rem' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Confirmar y Generar
              </button>
            </div>
          </div>

          {/* Right Panel - Document Canvas (9 cols) */}
          <div className="lg:col-span-9">
            <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
              <div className="paper-document">
                {/* ESSA Letterhead */}
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #004b93' }}>
                    <EssaLogo variant="document" />
                  </div>

                  {/* Document Date */}
                  <div style={{ textAlign: 'right', fontSize: '11px', color: '#475569', marginBottom: '1.5rem' }}>
                    Bucaramanga, {today}
                  </div>

                  {/* Document Body */}
                  <div style={{ fontSize: '11px', lineHeight: 1.75, color: '#1e293b', marginBottom: '2rem', whiteSpace: 'pre-wrap' }}>
                    {renderDocumentContent()}
                  </div>
                </div>

                {/* Signature Block */}
                <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                  <div className="grid grid-cols-2 gap-8" style={{ marginBottom: '2rem' }}>
                    {/* ESSA Signature */}
                    <div style={{ textAlign: 'center' }}>
                      {profile?.signatureUrl && (
                        <img
                          src={profile.signatureUrl}
                          alt="Firma ESSA"
                          style={{ height: '50px', objectFit: 'contain', marginBottom: '0.5rem', opacity: 0.9 }}
                        />
                      )}
                      <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.5rem' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#1e293b' }}>
                          {profile?.name || 'Funcionario ESSA'}
                        </div>
                        <div style={{ fontSize: '9px', color: '#64748b' }}>
                          {profile?.position || 'Gestor ESSA'}
                        </div>
                        <div style={{ fontSize: '9px', color: '#64748b' }}>
                          Electrificadora de Santander S.A. E.S.P.
                        </div>
                      </div>
                    </div>

                    {/* Client Signature */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ height: '50px', marginBottom: '0.5rem' }} />
                      <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.5rem' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#1e293b' }}>
                          {record ? formatApplicantName(record.nombreSolicitante) : 'Cliente'}
                        </div>
                        <div style={{ fontSize: '9px', color: '#64748b' }}>
                          Titular de la cuenta {record?.numeroCuenta || ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Page Footer */}
                  <div
                    style={{
                      borderTop: '1px solid #e2e8f0',
                      paddingTop: '0.75rem',
                      textAlign: 'center',
                      fontSize: '8px',
                      color: '#94a3b8',
                      lineHeight: 1.5,
                    }}
                  >
                    <div>ESSA Generador Documental — Documento generado automáticamente</div>
                    <div>Electrificadora de Santander S.A. E.S.P. — Grupo EPM</div>
                    <div style={{ marginTop: '0.25rem' }}>
                      Página {currentPage} de {totalPages}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex gap-3 mt-4" style={{ justifyContent: 'space-between' }}>
          <button className="btn-secondary" onClick={() => onNavigate('templates')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Volver
          </button>
          <button
            className="btn-success"
            onClick={() => onNavigate('generate')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Confirmar y Generar Documentos
          </button>
        </div>
      </div>
    </div>
  );
};

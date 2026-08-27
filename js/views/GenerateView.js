const GenerateView = ({ template, records, profile, history, onAddHistory }) => {
  const [progress, setProgress] = React.useState(0);
  const [done, setDone] = React.useState(false);
  const [downloading, setDownloading] = React.useState(null);

  const selectedRecords = records?.filter((r) => r.selected) || [];

  React.useEffect(() => {
    if (done) return;
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 8 + 2;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setDone(true);
        if (onAddHistory) {
          onAddHistory({
            id: `gen-${Date.now()}`,
            date: new Date().toLocaleDateString('es-CO'),
            type: selectedRecords.length > 1 ? 'Masivo' : 'Individual',
            status: 'Completado',
            recordsCount: selectedRecords.length,
            templateName: template?.title || 'Plantilla',
          });
        }
      }
      setProgress(Math.min(Math.round(p), 100));
    }, 200);
    return () => clearInterval(interval);
  }, [done]);

  const generateDocContent = (record) => {
    if (!template) return '';
    const content = template.sampleContent || '';
    return replaceTemplateVariables(content, record, profile);
  };

  const downloadIndividual = (record) => {
    setDownloading('individual');
    const content = generateDocContent(record);
    const fileName = `${template?.fileName?.replace('.docx', '') || 'documento'}_${record.numeroCuenta || record.id}.txt`;
    const fullContent = `ELECTRIFICADORA DE SANTANDER S.A. E.S.P.\nESSA - GRUPO EPM\nNIT: 890.200.222-3\n\n${content}\n\n---\nDocumento generado por ESSA Generador Documental\nFecha: ${new Date().toLocaleDateString('es-CO')}\nFirmante: ${profile?.name || 'N/A'}`;
    const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, fileName);
    setTimeout(() => setDownloading(null), 1000);
  };

  const downloadZip = () => {
    setDownloading('zip');
    const zip = new JSZip();
    const folder = zip.folder('ESSA_Documentos_Generados');
    selectedRecords.forEach((record) => {
      const content = generateDocContent(record);
      const fileName = `${template?.fileName?.replace('.docx', '') || 'documento'}_${record.numeroCuenta || record.id}.txt`;
      const fullContent = `ELECTRIFICADORA DE SANTANDER S.A. E.S.P.\nESSA - GRUPO EPM\nNIT: 890.200.222-3\n\n${content}\n\n---\nDocumento generado por ESSA Generador Documental\nFecha: ${new Date().toLocaleDateString('es-CO')}\nFirmante: ${profile?.name || 'N/A'}`;
      folder.file(fileName, fullContent);
    });
    zip.generateAsync({ type: 'blob' }).then((blob) => {
      saveAs(blob, `ESSA_Documentos_${new Date().toISOString().slice(0, 10)}.zip`);
      setTimeout(() => setDownloading(null), 1000);
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="main-container">
        {/* Header */}
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Módulo 6: Generación de Documentos
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Descarga individual o masiva de documentos generados
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left/Center: Progress and Actions */}
          <div className="lg:col-span-8">
            <div className="card" style={{ padding: '2rem' }}>
              {/* Progress Section */}
              <div style={{ marginBottom: '2rem' }}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                    {done ? 'Generación completada' : 'Generando documentos...'}
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: done ? '#059669' : '#004b93' }}>
                    {progress}%
                  </span>
                </div>
                <div className="progress-bar" style={{ height: '10px' }}>
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: done ? '#10b981' : '#3b82f6',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                  {done
                    ? `${selectedRecords.length} documentos generados exitosamente`
                    : `Procesando ${selectedRecords.length} documentos...`}
                </div>
              </div>

              {/* Success Message */}
              {done && (
                <div
                  style={{
                    padding: '1rem 1.25rem',
                    borderRadius: '0.75rem',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '2rem',
                    animation: 'fade-in 0.3s ease',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <div>
                    <div style={{ fontWeight: 700, color: '#047857', fontSize: '0.9rem' }}>
                      Documentos generados correctamente
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#059669' }}>
                      {selectedRecords.length} archivo{selectedRecords.length !== 1 ? 's' : ''} listo{selectedRecords.length !== 1 ? 's' : ''} para descargar
                    </div>
                  </div>
                </div>
              )}

              {/* Download Buttons */}
              {done && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: '1.5rem' }}>
                  <button
                    className="btn-success"
                    onClick={() => downloadIndividual(selectedRecords[0])}
                    disabled={downloading === 'individual' || selectedRecords.length === 0}
                    style={{ padding: '1rem 1.5rem', justifyContent: 'center' }}
                  >
                    {downloading === 'individual' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                        <path d="M12 2 A10 10 0 0 1 22 12" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    )}
                    Descargar DOCX individual
                  </button>

                  <button
                    className="btn-primary"
                    onClick={downloadZip}
                    disabled={downloading === 'zip' || selectedRecords.length === 0}
                    style={{ padding: '1rem 1.5rem', justifyContent: 'center' }}
                  >
                    {downloading === 'zip' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                        <path d="M12 2 A10 10 0 0 1 22 12" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    )}
                    Descargar ZIP masivo
                  </button>
                </div>
              )}

              {/* Summary Info */}
              {done && (
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.8rem',
                  }}
                >
                  <div className="flex justify-between mb-1">
                    <span style={{ color: '#64748b' }}>Plantilla utilizada:</span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{template?.title || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span style={{ color: '#64748b' }}>Documentos generados:</span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedRecords.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: '#64748b' }}>Firmante:</span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{profile?.name || 'N/A'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Decorative Graphic */}
          <div className="lg:col-span-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{
                width: '100%',
                maxWidth: '280px',
                padding: '2rem',
                borderRadius: '1rem',
                background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
                border: '1px solid #e2e8f0',
                textAlign: 'center',
              }}
            >
              {/* Gear/Document Graphic */}
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none" style={{ margin: '0 auto' }}>
                {/* Background circle */}
                <circle cx="60" cy="60" r="55" fill="#fff" opacity="0.5" />
                {/* Gear */}
                <g transform="translate(60, 60)">
                  <circle cx="0" cy="0" r="20" stroke="#004b93" strokeWidth="3" fill="none" />
                  <circle cx="0" cy="0" r="8" fill="#004b93" opacity="0.2" />
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                    const rad = (angle * Math.PI) / 180;
                    const x1 = Math.cos(rad) * 20;
                    const y1 = Math.sin(rad) * 20;
                    const x2 = Math.cos(rad) * 28;
                    const y2 = Math.sin(rad) * 28;
                    return (
                      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#004b93" strokeWidth="4" strokeLinecap="round" />
                    );
                  })}
                </g>
                {/* Document icon overlapping */}
                <g transform="translate(72, 32)">
                  <rect x="0" y="0" width="28" height="36" rx="3" fill="#fff" stroke="#10b981" strokeWidth="2" />
                  <line x1="6" y1="10" x2="22" y2="10" stroke="#10b981" strokeWidth="1.5" opacity="0.5" />
                  <line x1="6" y1="16" x2="22" y2="16" stroke="#10b981" strokeWidth="1.5" opacity="0.5" />
                  <line x1="6" y1="22" x2="16" y2="22" stroke="#10b981" strokeWidth="1.5" opacity="0.5" />
                  <polyline points="18 26 22 22 26 28" stroke="#10b981" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              </svg>

              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
                  Generación Automatizada
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5 }}>
                  Documentos profesionales con datos reales de ESSA
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex gap-3 mt-4" style={{ justifyContent: 'space-between' }}>
          <button className="btn-secondary" onClick={() => onNavigate('preview')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Volver a Vista Previa
          </button>
          <button className="btn-secondary" onClick={() => onNavigate('home')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Volver al Inicio
          </button>
        </div>
      </div>
    </div>
  );
};

const ConfigView = ({ config, onSaveConfig, onNavigate, onExcelDataLoaded, onTemplatesLoaded }) => {
  const [excelState, setExcelState] = React.useState({
    loading: false,
    progress: 0,
    stage: '',
    loaded: false,
    fileName: '',
    recordCount: 0,
  });
  const [folderState, setFolderState] = React.useState({
    selected: false,
    folderName: '',
    templates: [],
  });
  const [dragOverExcel, setDragOverExcel] = React.useState(false);
  const [dragOverFolder, setDragOverFolder] = React.useState(false);
  const excelInputRef = React.useRef(null);
  const folderInputRef = React.useRef(null);

  const stages = [
    { threshold: 25, label: 'Lectura binaria del archivo' },
    { threshold: 50, label: 'Análisis de estructura y hojas' },
    { threshold: 85, label: 'Extracción y validación de datos' },
    { threshold: 100, label: 'Finalizando procesamiento' },
  ];

  const simulateProgress = (onComplete) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 4 + 2;
      if (progress >= 96) {
        progress = 96;
        clearInterval(interval);
        if (onComplete) onComplete();
      }
      const stageObj = stages.find((s) => progress <= s.threshold) || stages[stages.length - 1];
      setExcelState((prev) => ({
        ...prev,
        progress: Math.min(progress, 96),
        stage: stageObj.label,
      }));
    }, 50);
    return interval;
  };

  const handleExcelFile = (file) => {
    if (!file) return;
    setExcelState({ loading: true, progress: 0, stage: 'Iniciando lectura...', loaded: false, fileName: file.name, recordCount: 0 });
    const timer = simulateProgress(() => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          clearInterval(timer);
          const result = parseExcelFile(new Uint8Array(e.target.result));
          setExcelState({
            loading: false,
            progress: 100,
            stage: 'Listo',
            loaded: true,
            fileName: file.name,
            recordCount: result.records.length,
          });
          onExcelDataLoaded(result.records);
        };
        reader.readAsArrayBuffer(file);
      } catch (err) {
        clearInterval(timer);
        setExcelState({ loading: false, progress: 0, stage: '', loaded: false, fileName: '', recordCount: 0 });
      }
    });
  };

  const handleExcelDrop = (e) => {
    e.preventDefault();
    setDragOverExcel(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleExcelFile(file);
  };

  const handleExcelSelect = (e) => {
    const file = e.target?.files?.[0];
    if (file) handleExcelFile(file);
  };

  const handleFolderSelect = (e) => {
    const files = e.target?.files;
    if (files && files.length > 0) {
      const tplFiles = Array.from(files).filter((f) => f.name.endsWith('.docx'));
      setFolderState({
        selected: true,
        folderName: files[0].webkitRelativePath?.split('/')[0] || 'Plantillas',
        templates: tplFiles.map((f) => ({ name: f.name, size: f.size })),
      });
      onTemplatesLoaded(tplFiles);
    }
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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Módulo 2: Configuración de Recursos
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Carga de datos Excel y selección de plantillas Word
            </p>
          </div>
        </div>

        {/* Two Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left: Excel Upload */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>
              1. Carga de Archivo Excel
            </h3>

            <div
              className={`drop-zone ${excelState.loading ? 'processing' : ''} ${dragOverExcel ? 'hover' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverExcel(true); }}
              onDragLeave={() => setDragOverExcel(false)}
              onDrop={handleExcelDrop}
              onClick={() => !excelState.loading && excelInputRef.current?.click()}
              style={{ minHeight: '220px' }}
            >
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={handleExcelSelect}
              />

              {excelState.loading ? (
                <>
                  <div style={{ position: 'relative', width: '48px', height: '48px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="48" height="48" viewBox="0 0 48 48" style={{ position: 'absolute', inset: 0 }}>
                      <circle cx="24" cy="24" r="20" stroke="#f1f5f9" strokeWidth="4" fill="none" />
                      <circle cx="24" cy="24" r="20" stroke="#004b93" strokeWidth="4" strokeDasharray="60 120" strokeLinecap="round" fill="none" className="animate-spin" />
                    </svg>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#004b93' }}>{Math.round(excelState.progress)}%</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#004b93', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '3px 10px', borderRadius: 999, marginBottom: '0.4rem' }}>
                    {excelState.stage}
                  </div>
                  <div className="progress-bar" style={{ width: '220px', height: '8px', background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                    <div className="progress-bar-fill" style={{ width: `${excelState.progress}%`, height: '100%', background: 'linear-gradient(90deg, #004b93 0%, #0284c7 50%, #38bdf8 100%)', borderRadius: 999, transition: 'width 80ms linear' }} />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem', fontWeight: 600 }}>
                    {excelState.fileName} — {Math.round(excelState.progress)}%
                  </div>
                </>
              ) : excelState.loaded ? (
                <>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#059669' }}>
                    Archivo cargado correctamente
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {excelState.fileName} — {excelState.recordCount} registros detectados
                  </div>
                </>
              ) : (
                <>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Arrastra tu archivo Excel aquí o{' '}
                    <span style={{ color: '#004b93', fontWeight: 600 }}>haz clic para buscar</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    Formatos: .xlsx, .xls, .csv
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: Folder Selection */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>
              2. Selección de Carpeta de Plantillas
            </h3>

            <div
              className={`drop-zone ${dragOverFolder ? 'hover' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverFolder(true); }}
              onDragLeave={() => setDragOverFolder(false)}
              onClick={() => folderInputRef.current?.click()}
              style={{ minHeight: '220px' }}
            >
              <input
                ref={folderInputRef}
                type="file"
                webkitdirectory=""
                multiple
                style={{ display: 'none' }}
                onChange={handleFolderSelect}
              />

              {folderState.selected ? (
                <>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#059669' }}>
                    Carpeta seleccionada
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {folderState.folderName} — {folderState.templates.length} plantillas DOCX
                  </div>
                </>
              ) : (
                <>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Selecciona la carpeta que contiene las plantillas Word (.docx)
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    Haz clic para explorar carpetas
                  </div>
                </>
              )}
            </div>

            {/* Detected templates list */}
            {folderState.selected && folderState.templates.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                  Plantillas detectadas:
                </div>
                <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                  {folderState.templates.map((tpl, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2"
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #e2e8f0',
                        marginBottom: '0.375rem',
                        fontSize: '0.8rem',
                        background: '#f8fafc',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#004b93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span style={{ flex: 1, color: '#334155' }}>{tpl.name}</span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                        {(tpl.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex gap-3" style={{ justifyContent: 'space-between' }}>
          <button className="btn-secondary" onClick={() => onNavigate('profile')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Volver
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              onSaveConfig({ excelLoaded: excelState.loaded, folderSelected: folderState.selected });
              onNavigate('data');
            }}
            disabled={!excelState.loaded}
          >
            Continuar al Módulo 3
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

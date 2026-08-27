const TemplatesView = ({ templates, selectedTemplate, onSelectTemplate, onNavigate, profile, records }) => {
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState('Todas');
  const [previewRecord, setPreviewRecord] = React.useState(0);
  const [viewMode, setViewMode] = React.useState('live');

  const categories = ['Todas', 'Cartas', 'Contratos', 'Informes', 'Formularios'];

  const filtered = React.useMemo(() => {
    if (!templates) return [];
    return templates.filter((t) => {
      const matchCategory = category === 'Todas' || t.category === category;
      const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [templates, category, search]);

  const record = records && records.length > 0 ? records[Math.min(previewRecord, records.length - 1)] : null;

  const selected = templates?.find((t) => t.id === selectedTemplate);

  const renderContent = () => {
    if (!selected) return null;
    const content = selected.sampleContent || '';
    if (viewMode === 'live' && record) {
      return replaceTemplateVariables(content, record, profile);
    }
    // Variable tags mode
    return content;
  };

  const getCategoryBadgeColor = (cat) => {
    switch (cat) {
      case 'Cartas': return { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' };
      case 'Contratos': return { bg: '#faf5ff', border: '#e9d5ff', color: '#6b21a8' };
      case 'Informes': return { bg: '#ecfdf5', border: '#a7f3d0', color: '#047857' };
      case 'Formularios': return { bg: '#fffbeb', border: '#fde68a', color: '#92400e' };
      default: return { bg: '#f1f5f9', border: '#e2e8f0', color: '#475569' };
    }
  };

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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Módulo 4: Selección de Plantilla
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Elige la plantilla y previsualiza el documento con datos reales
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Template Gallery (5 cols) */}
          <div className="lg:col-span-5">
            <div className="card" style={{ overflow: 'hidden' }}>
              {/* Search */}
              <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                <div className="relative">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Buscar plantilla..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ paddingLeft: '2.25rem' }}
                  />
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex gap-2" style={{ padding: '0.75rem 1rem', flexWrap: 'wrap' }}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    style={{
                      padding: '0.375rem 0.875rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      border: '1px solid',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      ...(category === cat
                        ? { background: '#004b93', color: '#fff', borderColor: '#004b93' }
                        : { background: '#fff', color: '#475569', borderColor: '#e2e8f0' }),
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Template Cards */}
              <div style={{ maxHeight: '520px', overflowY: 'auto', padding: '0 1rem 1rem' }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    No se encontraron plantillas
                  </div>
                ) : (
                  filtered.map((tpl) => {
                    const isActive = selectedTemplate === tpl.id;
                    const badgeColor = getCategoryBadgeColor(tpl.category);
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => onSelectTemplate(tpl.id)}
                        style={{
                          padding: '1rem',
                          borderRadius: '0.75rem',
                          border: `2px solid ${isActive ? '#004b93' : '#e2e8f0'}`,
                          background: isActive ? '#eff6ff' : '#fff',
                          cursor: 'pointer',
                          marginBottom: '0.5rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {/* DOCX Icon */}
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '0.5rem',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#004b93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="badge"
                                style={{ background: badgeColor.bg, borderColor: badgeColor.border, color: badgeColor.color, fontSize: '9px' }}
                              >
                                {tpl.category}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }} className="line-clamp-2">
                              {tpl.title}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4, marginBottom: '0.375rem' }} className="line-clamp-2">
                              {tpl.description}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
                              {tpl.fileName}
                            </div>
                          </div>
                          {isActive && (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#004b93" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right: Preview Panel (7 cols) */}
          <div className="lg:col-span-7">
            <div className="card" style={{ overflow: 'hidden' }}>
              {/* Mode Switcher & Record Selector */}
              <div className="flex items-center justify-between" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                <div className="flex items-center gap-2">
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: 0, marginRight: '0.75rem' }}>
                    Vista Previa y Variables
                  </h3>
                  <div className="flex" style={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <button
                      onClick={() => setViewMode('live')}
                      style={{
                        padding: '0.375rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        background: viewMode === 'live' ? '#004b93' : '#fff',
                        color: viewMode === 'live' ? '#fff' : '#475569',
                      }}
                    >
                      Fusión en Vivo
                    </button>
                    <button
                      onClick={() => setViewMode('tags')}
                      style={{
                        padding: '0.375rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        background: viewMode === 'tags' ? '#004b93' : '#fff',
                        color: viewMode === 'tags' ? '#fff' : '#475569',
                      }}
                    >
                      Variables [TAGS]
                    </button>
                  </div>
                </div>

                {records && records.length > 0 && viewMode === 'live' && (
                  <select
                    className="input-field"
                    value={previewRecord}
                    onChange={(e) => setPreviewRecord(Number(e.target.value))}
                    style={{ width: 'auto', padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
                  >
                    {records.slice(0, 10).map((r, i) => (
                      <option key={r.id} value={i}>
                        #{r.id} — {r.numeroCuenta}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Document Canvas */}
              <div style={{ padding: '1.5rem' }}>
                {selected ? (
                  <div className="document-canvas" style={{ maxHeight: '500px' }}>
                    {/* ESSA Letterhead */}
                    <div style={{ textAlign: 'center', borderBottom: '2px solid #004b93', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                      <EssaLogo variant="document" />
                    </div>
                    {/* Rendered Content */}
                    <div style={{ fontSize: '11px', lineHeight: 1.7, color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                      {renderContent()}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 1rem' }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Selecciona una plantilla</div>
                    <div style={{ fontSize: '0.8rem' }}>Elige una plantilla de la izquierda para previsualizar</div>
                  </div>
                )}
              </div>

              {/* Variable Mapping List */}
              {selected && selected.variables && (
                <div style={{ padding: '0 1.5rem 1.5rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>
                    Variables detectadas ({selected.variables.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {selected.variables.map((v, i) => (
                      <div
                        key={i}
                        className="badge"
                        style={{
                          background: v.source === 'Excel' ? '#eff6ff' : v.source === 'Perfil' ? '#faf5ff' : v.source === 'Firma' ? '#ecfdf5' : '#fffbeb',
                          borderColor: v.source === 'Excel' ? '#bfdbfe' : v.source === 'Perfil' ? '#e9d5ff' : v.source === 'Firma' ? '#a7f3d0' : '#fde68a',
                          color: v.source === 'Excel' ? '#1e40af' : v.source === 'Perfil' ? '#6b21a8' : v.source === 'Firma' ? '#047857' : '#92400e',
                          fontSize: '9px',
                        }}
                      >
                        [{v.key}]
                        <span style={{ marginLeft: '2px', opacity: 0.7 }}>{v.source}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex gap-3 mt-4" style={{ justifyContent: 'space-between' }}>
          <button className="btn-secondary" onClick={() => onNavigate('data')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Volver
          </button>
          <button
            className="btn-primary"
            onClick={() => onNavigate('preview')}
            disabled={!selectedTemplate}
          >
            Continuar al Módulo 5: Vista Previa
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

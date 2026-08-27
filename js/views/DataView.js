const DataView = ({ records, onUpdateRecords, onNavigate }) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [jumpPage, setJumpPage] = React.useState('');
  const [filters, setFilters] = React.useState({
    numeroCuenta: '',
    proceso: '',
    radicado: '',
    fechaSolicitud: '',
    fechaVencimiento: '',
  });
  const PAGE_SIZE = 20;

  const filteredRecords = React.useMemo(() => {
    if (!records) return [];
    return records.filter((r) => {
      if (filters.numeroCuenta && !(r.numeroCuenta || '').toLowerCase().includes(filters.numeroCuenta.toLowerCase())) return false;
      if (filters.proceso && !(r.numeroProceso || '').toLowerCase().includes(filters.proceso.toLowerCase())) return false;
      if (filters.radicado && !(r.radicadoEntrada || '').toLowerCase().includes(filters.radicado.toLowerCase())) return false;
      if (filters.fechaSolicitud && !(r.fechaSolicitud || '').toLowerCase().includes(filters.fechaSolicitud.toLowerCase())) return false;
      if (filters.fechaVencimiento && !(r.fechaVencimiento || '').toLowerCase().includes(filters.fechaVencimiento.toLowerCase())) return false;
      return true;
    });
  }, [records, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, filteredRecords.length);
  const pageRecords = filteredRecords.slice(startIdx, endIdx);
  const selectedCount = filteredRecords.filter((r) => r.selected).length;

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const toggleRecord = (id) => {
    const updated = records.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r));
    onUpdateRecords(updated);
  };

  const toggleAll = () => {
    const allSelected = pageRecords.every((r) => r.selected);
    const updated = records.map((r) => {
      const onPage = pageRecords.some((p) => p.id === r.id);
      return onPage ? { ...r, selected: !allSelected } : r;
    });
    onUpdateRecords(updated);
  };

  const markPage = () => {
    const updated = records.map((r) => {
      const onPage = pageRecords.some((p) => p.id === r.id);
      return onPage ? { ...r, selected: true } : r;
    });
    onUpdateRecords(updated);
  };

  const handleJump = () => {
    const page = parseInt(jumpPage, 10);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setJumpPage('');
    }
  };

  const handleFilterKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  if (!records || records.length === 0) {
    return (
      <div className="animate-fade-in">
        <div className="main-container">
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 1rem' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>
              No hay registros cargados
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
              Carga un archivo Excel en el Módulo 2 para ver los datos aquí.
            </p>
            <button className="btn-primary" onClick={() => onNavigate('config')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Ir a Cargar Excel
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
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
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                Módulo 3: Revisión de Datos
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                {filteredRecords.length} registros — {selectedCount} seleccionados
              </p>
            </div>
          </div>
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          {/* Top Pagination Bar */}
          <div className="pagination-bar top">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                Mostrando <strong>{startIdx + 1}-{endIdx}</strong> de <strong>{filteredRecords.length}</strong> registros
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn-secondary"
                style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                onClick={markPage}
              >
                Marcar pág. ({PAGE_SIZE})
              </button>
              <button
                className="btn-secondary"
                style={{ padding: '0.375rem 0.5rem', fontSize: '0.75rem' }}
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ‹
              </button>
              <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                Pág. {safePage} / {totalPages}
              </span>
              <button
                className="btn-secondary"
                style={{ padding: '0.375rem 0.5rem', fontSize: '0.75rem' }}
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                ›
              </button>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={jumpPage}
                  onChange={(e) => setJumpPage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleJump(); }}
                  placeholder="Ir a..."
                  className="input-field"
                  style={{ width: '60px', padding: '0.25rem 0.5rem', fontSize: '0.75rem', textAlign: 'center' }}
                />
                <button
                  className="btn-secondary"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                  onClick={handleJump}
                >
                  Ir
                </button>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '0.5rem',
            }}
          >
            <input
              type="text"
              className="input-field"
              placeholder="Nro. Cuenta"
              value={filters.numeroCuenta}
              onChange={(e) => handleFilterChange('numeroCuenta', e.target.value)}
              onKeyDown={handleFilterKeyDown}
              style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Proceso"
              value={filters.proceso}
              onChange={(e) => handleFilterChange('proceso', e.target.value)}
              onKeyDown={handleFilterKeyDown}
              style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Radicado"
              value={filters.radicado}
              onChange={(e) => handleFilterChange('radicado', e.target.value)}
              onKeyDown={handleFilterKeyDown}
              style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Fecha Solicitud"
              value={filters.fechaSolicitud}
              onChange={(e) => handleFilterChange('fechaSolicitud', e.target.value)}
              onKeyDown={handleFilterKeyDown}
              style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Fecha Vencimiento"
              value={filters.fechaVencimiento}
              onChange={(e) => handleFilterChange('fechaVencimiento', e.target.value)}
              onKeyDown={handleFilterKeyDown}
              style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
            />
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={pageRecords.length > 0 && pageRecords.every((r) => r.selected)}
                      onChange={toggleAll}
                    />
                  </th>
                  <th>ID</th>
                  <th>Nro. Cuenta</th>
                  <th>Proceso</th>
                  <th>Radicado</th>
                  <th>Solicitante</th>
                  <th>F. Solicitud</th>
                  <th>F. Vencimiento</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pageRecords.map((record) => (
                  <tr key={record.id} className={record.selected ? 'selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={record.selected}
                        onChange={() => toggleRecord(record.id)}
                      />
                    </td>
                    <td style={{ fontWeight: 600, color: '#475569' }}>{record.id}</td>
                    <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.7rem' }}>{record.numeroCuenta}</td>
                    <td>{record.numeroProceso}</td>
                    <td>{record.radicadoEntrada}</td>
                    <td style={{ maxWidth: '160px' }}>
                      <div className="line-clamp-1">{formatApplicantName(record.nombreSolicitante)}</div>
                    </td>
                    <td className="whitespace-nowrap">{record.fechaSolicitud}</td>
                    <td className="whitespace-nowrap">{record.fechaVencimiento}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: record.selected ? '#eff6ff' : '#fffbeb',
                          borderColor: record.selected ? '#bfdbfe' : '#fde68a',
                          color: record.selected ? '#1e40af' : '#92400e',
                        }}
                      >
                        {record.selected ? 'Seleccionado' : 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Pagination Bar */}
          <div className="pagination-bar bottom">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                <strong>{selectedCount}</strong> seleccionados
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn-secondary"
                style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ‹ Anterior
              </button>
              <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                Pág. {safePage} de {totalPages}
              </span>
              <button
                className="btn-secondary"
                style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente ›
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex gap-3 mt-4" style={{ justifyContent: 'space-between' }}>
          <button className="btn-secondary" onClick={() => onNavigate('config')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Volver
          </button>
          <div className="flex gap-3">
            <button
              className="btn-outline"
              onClick={() => {
                const updated = records.map((r) => ({ ...r, selected: true }));
                onUpdateRecords(updated);
              }}
              disabled={selectedCount === filteredRecords.length}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              Validar Seleccionados
            </button>
            <button
              className="btn-primary"
              onClick={() => onNavigate('templates')}
              disabled={selectedCount === 0}
            >
              Continuar al Módulo 4: Selección de Plantillas
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

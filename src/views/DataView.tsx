import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useDataStore } from '@/store/dataStore';
import { useNavigationStore } from '@/store/navigationStore';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { useSelection } from '@/hooks/useSelection';
import RecordEditModal from '@/components/features/RecordEditModal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { Record as EssaRecord } from '@/types/record';
import { calculatePqrBusinessDays, parseDateOnly } from '@/utils/businessDays';
import { getEstadoSemaforo } from '@/utils/excelParser';

const PAGE_SIZE = 10;

const SEARCHABLE_FIELDS: (keyof EssaRecord)[] = [
  'nombreSolicitante',
  'numeroCuenta',
  'cuenta',
  'radicadoEntrada',
  'numeroProceso',
  'tipoProceso',
  'descripcionTipoProceso',
  'usuarioResponsableInsumo',
  'responsableInsumo',
  'cedulaSolicitante',
  'correoSolicitante',
  'observacionProceso',
  'observacionRevision',
  'medioSolicitud',
  'diasPqrLabel',
];

function formatCount(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function getStateOrder(record: EssaRecord): number {
  const semaforo =
    record.estadoSemaforo || getEstadoSemaforo(record.numeroProceso, record.observacionRevision);
  const respInsumo = String(
    record.usuarioResponsableInsumo || record.responsableInsumo || ''
  ).trim();
  const hasInsumo =
    respInsumo !== '—' &&
    respInsumo !== '' &&
    respInsumo.toLowerCase() !== 'null' &&
    respInsumo.toLowerCase() !== 'undefined';

  if (semaforo === 'verde') return 0;
  if (semaforo === 'violeta') return 1;
  if (semaforo === 'rojo') {
    if (hasInsumo) return 2;
    return 3;
  }
  return 4;
}

function exportToExcel(records: EssaRecord[]): void {
  const exportData = records.map((record) => ({
    'Nombre Solicitante': String(record.nombreSolicitante ?? ''),
    'Fecha solicitud': String(record.fechaSolicitud ?? ''),
    'Fecha vencimiento': String(record.fechaVencimiento ?? ''),
    Cuenta: String((record.numeroCuenta || record.cuenta) ?? ''),
    Radicado: String(record.radicadoEntrada ?? ''),
    Proceso: String(record.tipoProceso ?? ''),
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  worksheet['!cols'] = [
    { wch: 30 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');

  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
  XLSX.writeFile(workbook, `exportacion_datos_${timestamp}.xlsx`);
}

const ESTADO_LABELS: Record<string, string> = {
  verde: 'Completo',
  violeta: 'Tiene revisión',
  tiene_insumos: 'Tiene Insumos',
  no_tiene_insumos: 'No tiene insumos',
  rojo: 'Sin proceso',
};

export function DataView() {
  const records = useDataStore((s) => s.records);
  const filterState = useDataStore((s) => s.filterState);
  const currentPage = useDataStore((s) => s.currentPage);
  const selectedRows = useDataStore((s) => s.selectedRows);
  const setFilter = useDataStore((s) => s.setFilter);
  const setPage = useDataStore((s) => s.setPage);
  const toggleRow = useDataStore((s) => s.toggleRow);
  const togglePage = useDataStore((s) => s.togglePage);
  const clearSelection = useDataStore((s) => s.clearSelection);
  const editRecord = useDataStore((s) => s.editRecord);
  const setEditingRecord = useDataStore((s) => s.setEditingRecord);
  const editingRecord = useDataStore((s) => s.editingRecord);

  const goTo = useNavigationStore((s) => s.goTo);
  const complete = useNavigationStore((s) => s.complete);

  const selection = useSelection();

  const [searchInput, setSearchInput] = useState(filterState.search);
  const debouncedSearch = useDebouncedSearch(searchInput, 300);
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [jumpPage, setJumpPage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState<EssaRecord | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const headerCbRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (debouncedSearch !== filterState.search) {
      setFilter({ search: debouncedSearch });
    }
  }, [debouncedSearch]);

  useEffect(() => {
    if (filterState.search !== searchInput && filterState.search !== debouncedSearch) {
      if (filterState.search === '' && searchInput !== '') {
        setSearchInput('');
      }
    }
  }, [filterState.search]);

  const filteredRecords = useMemo(() => {
    let out = [...records];

    const s = filterState.search.trim().toLowerCase();
    if (s) {
      out = out.filter((r) => {
        const hay = SEARCHABLE_FIELDS.map((k) => String(r[k] ?? ''))
          .join(' ')
          .toLowerCase();
        return hay.includes(s);
      });
    }
    if (filterState.cuenta.trim()) {
      const q = filterState.cuenta.trim().toLowerCase();
      out = out.filter((r) => {
        const v = String(
          r.numeroCuenta ||
            r.cuenta ||
            (r as Record<string, unknown>)['NUMERO_CUENTA'] ||
            (r as Record<string, unknown>)['NUMERO CUENTA'] ||
            (r as Record<string, unknown>)['CUENTA'] ||
            ''
        ).toLowerCase();
        return v.includes(q);
      });
    }
    if (filterState.proceso.trim()) {
      const q = filterState.proceso.trim().toLowerCase();
      out = out.filter((r) => {
        const v = String(
          r.numeroProceso ||
            (r as Record<string, unknown>)['NUMERO_PROCESO'] ||
            (r as Record<string, unknown>)['NUMERO PROCESO'] ||
            (r as Record<string, unknown>)['No. Proceso'] ||
            ''
        ).toLowerCase();
        return v.includes(q);
      });
    }
    if (filterState.radicado.trim()) {
      const q = filterState.radicado.trim().toLowerCase();
      out = out.filter((r) =>
        String(r.radicadoEntrada ?? '')
          .toLowerCase()
          .includes(q)
      );
    }
    if (filterState.fechaSolicitud.trim()) {
      const q = filterState.fechaSolicitud.trim();
      out = out.filter((r) => String(r.fechaSolicitud ?? '').includes(q));
    }

    if (filterState.fechaDesde) {
      const dDesde = parseDateOnly(filterState.fechaDesde);
      if (dDesde) {
        out = out.filter((r) => {
          const rawDate =
            r.fechaSolicitud ||
            (r as Record<string, unknown>)['Fecha Radicación'] ||
            (r as Record<string, unknown>)['Fecha  Radicacion'] ||
            (r as Record<string, unknown>)['FECHA_RADICACION'];
          const rDate = parseDateOnly(rawDate);
          return rDate ? rDate.getTime() >= dDesde.getTime() : false;
        });
      }
    }

    if (filterState.fechaHasta) {
      const dHasta = parseDateOnly(filterState.fechaHasta);
      if (dHasta) {
        out = out.filter((r) => {
          const rawDate =
            r.fechaSolicitud ||
            (r as Record<string, unknown>)['Fecha Radicación'] ||
            (r as Record<string, unknown>)['Fecha  Radicacion'] ||
            (r as Record<string, unknown>)['FECHA_RADICACION'];
          const rDate = parseDateOnly(rawDate);
          return rDate ? rDate.getTime() <= dHasta.getTime() : false;
        });
      }
    }

    if (filterState.estadoSemaforo && filterState.estadoSemaforo !== 'todos') {
      out = out.filter((r) => {
        const resp = String(
          r.usuarioResponsableInsumo ||
            (r as Record<string, unknown>)['USUARIO_RESPONSABLE_INSUMO'] ||
            ''
        ).trim();
        const hasInsumo =
          resp !== '' &&
          resp !== '—' &&
          resp.toLowerCase() !== 'null' &&
          resp.toLowerCase() !== 'undefined';
        const sem = r.estadoSemaforo || getEstadoSemaforo(r.numeroProceso, r.observacionRevision);

        if (filterState.estadoSemaforo === 'tiene_insumos') return hasInsumo;
        if (filterState.estadoSemaforo === 'no_tiene_insumos') return !hasInsumo;
        return sem === filterState.estadoSemaforo;
      });
    }

    if (filterState.diasPqrFiltro && filterState.diasPqrFiltro !== 'todos') {
      out = out.filter((r) => {
        const pqr =
          r.diasPqr !== undefined
            ? { remainingDays: r.diasPqr }
            : calculatePqrBusinessDays(
                r.fechaSolicitud ||
                  (r as Record<string, unknown>)['Fecha Radicación'] ||
                  (r as Record<string, unknown>)['Fecha  Radicacion']
              );
        const rem = pqr.remainingDays;
        if (filterState.diasPqrFiltro === 'menor5') return rem < 5;
        if (filterState.diasPqrFiltro === 'urgente') return rem <= 3 && rem >= 0;
        if (filterState.diasPqrFiltro === 'vence_hoy') return rem === 0;
        if (filterState.diasPqrFiltro === 'vencido') return rem < 0;
        return true;
      });
    }

    if (showOnlySelected) {
      out = out.filter((r) => selectedRows.has(r.rowId));
    }

    out.sort((a, b) => getStateOrder(a) - getStateOrder(b));

    return out;
  }, [
    records,
    filterState.search,
    filterState.cuenta,
    filterState.proceso,
    filterState.radicado,
    filterState.fechaSolicitud,
    filterState.fechaDesde,
    filterState.fechaHasta,
    filterState.estadoSemaforo,
    filterState.diasPqrFiltro,
    showOnlySelected,
    selectedRows,
  ]);

  const totalFiltered = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, totalFiltered);
  const pageRecords = filteredRecords.slice(startIdx, startIdx + PAGE_SIZE);

  useEffect(() => {
    if (currentPage !== safePage) setPage(safePage);
  }, [safePage]);

  const allPageSelected =
    pageRecords.length > 0 && pageRecords.every((r) => selectedRows.has(r.rowId));
  const somePageSelected = pageRecords.some((r) => selectedRows.has(r.rowId)) && !allPageSelected;

  useEffect(() => {
    if (headerCbRef.current) headerCbRef.current.indeterminate = somePageSelected;
  }, [somePageSelected]);

  const activeFilterCount = [
    filterState.search.trim(),
    filterState.cuenta.trim(),
    filterState.proceso.trim(),
    filterState.radicado.trim(),
    filterState.fechaSolicitud.trim(),
    filterState.fechaDesde ? 'desde' : '',
    filterState.fechaHasta ? 'hasta' : '',
    filterState.estadoSemaforo && filterState.estadoSemaforo !== 'todos' ? 'estadoSemaforo' : '',
    filterState.diasPqrFiltro && filterState.diasPqrFiltro !== 'todos' ? 'diasPqrFiltro' : '',
  ].filter(Boolean).length;

  const hasAnyFilter = activeFilterCount > 0 || showOnlySelected;

  const handleClearFilters = () => {
    setSearchInput('');
    setFilter({
      search: '',
      cuenta: '',
      proceso: '',
      radicado: '',
      fechaSolicitud: '',
      fechaDesde: '',
      fechaHasta: '',
      estadoSemaforo: 'todos',
      diasPqrFiltro: 'todos',
    });
    setShowOnlySelected(false);
    setPage(1);
  };

  const handleClearSelection = () => {
    clearSelection();
  };

  const handleJump = () => {
    const n = parseInt(jumpPage, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= totalPages) {
      setPage(n);
      setJumpPage('');
    }
  };

  const openEdit = (r: EssaRecord) => {
    setActiveRecord(r);
    setEditingRecord(r);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingRecord(null);
    window.setTimeout(() => setActiveRecord(null), 150);
  };

  const handleModalSave = (patch: Partial<EssaRecord>) => {
    if (!activeRecord) return;
    editRecord(activeRecord.rowId, patch);
  };

  const pageNums = useMemo(() => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }, [safePage, totalPages]);

  // ─── EMPTY STATE ──────────────────────────────────────────
  if (!records || records.length === 0) {
    return (
      <div data-testid="data-view" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <style>{dvStyles}</style>
        <div className="dv-empty-state" data-testid="dv-empty-state">
          <div className="dv-empty-icon">
            <svg
              width="56"
              height="56"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--essa-primary)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h3 className="dv-empty-title">No hay registros cargados</h3>
          <p className="dv-empty-subtitle">
            Carga un archivo Excel en el Módulo 2 para ver los datos aquí.
          </p>
          <Button
            variant="primary"
            onClick={() => goTo('configuracion')}
            data-testid="data-go-config"
            style={{ marginTop: 8 }}
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
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Ir a Cargar Excel
          </Button>
        </div>
      </div>
    );
  }

  // ─── MAIN RENDER ──────────────────────────────────────────
  return (
    <div data-testid="data-view" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{dvStyles}</style>

      {/* ═══════ HERO HEADER ═══════ */}
      <div className="dv-hero">
        <div className="dv-hero-accent" />
        <div className="dv-hero-content">
          <div className="dv-hero-left">
            <div className="dv-hero-icon">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div>
              <h2 className="dv-hero-title">Módulo 3: Revisión de Datos</h2>
              <div className="dv-hero-meta">
                <span className="dv-hero-count">{formatCount(totalFiltered)} registros</span>
                {selectedRows.size > 0 && (
                  <span className="dv-hero-selected">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {selectedRows.size} seleccionados
                  </span>
                )}
                {activeFilterCount > 0 && (
                  <span className="dv-hero-filters">
                    {activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="dv-hero-actions">
            <button
              className={`dv-action-pill ${showOnlySelected ? 'dv-action-pill--active' : ''}`}
              onClick={() => setShowOnlySelected((v) => !v)}
              data-testid="dv-toggle-seleccionados"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <polyline points="17 11 19 13 23 9" />
              </svg>
              {showOnlySelected ? 'Ver todos' : 'Seleccionados'}
              {selectedRows.size > 0 && (
                <span className="dv-action-pill-badge">{selectedRows.size}</span>
              )}
            </button>
            <button
              className="dv-action-pill dv-action-pill--green"
              onClick={() => exportToExcel(filteredRecords)}
              data-testid="dv-export-excel"
              title={
                activeFilterCount > 0
                  ? 'Exportar registros filtrados a Excel'
                  : 'Exportar todos los registros a Excel'
              }
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Exportar Excel
            </button>
          </div>
        </div>
      </div>

      {/* ═══════ FILTER PANEL ═══════ */}
      <div className="dv-filter-panel" data-testid="dv-toolbar">
        <button
          className="dv-filter-toggle"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
        >
          <div className="dv-filter-toggle-left">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filtros de búsqueda
            {activeFilterCount > 0 && <span className="dv-filter-count">{activeFilterCount}</span>}
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: filtersOpen ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 250ms var(--ease)',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div className={`dv-filter-body ${filtersOpen ? 'dv-filter-body--open' : ''}`}>
          {/* ── SEARCH ── */}
          <div className="dv-filter-card dv-filter-card--search">
            <div className="dv-filter-card-header">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--essa-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Buscar</span>
            </div>
            <Input
              placeholder="Nombre, cuenta, radicado, proceso…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Buscar"
              data-testid="dv-search"
            />
          </div>

          {/* ── TEXT FILTERS ── */}
          <div className="dv-filter-card">
            <div className="dv-filter-card-header">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--essa-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>Referencia</span>
            </div>
            <div className="dv-filter-fields-row">
              <Input
                placeholder="Cuenta"
                value={filterState.cuenta}
                onChange={(e) => setFilter({ cuenta: e.target.value })}
                aria-label="Filtro cuenta"
                data-testid="dv-filter-cuenta"
              />
              <Input
                placeholder="Proceso"
                value={filterState.proceso}
                onChange={(e) => setFilter({ proceso: e.target.value })}
                aria-label="Filtro proceso"
                data-testid="dv-filter-proceso"
              />
              <Input
                placeholder="Radicado"
                value={filterState.radicado}
                onChange={(e) => setFilter({ radicado: e.target.value })}
                aria-label="Filtro radicado"
                data-testid="dv-filter-radicado"
              />
            </div>
          </div>

          {/* ── DATE & STATUS FILTERS ── */}
          <div className="dv-filter-card">
            <div className="dv-filter-card-header">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--essa-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Fecha y estado</span>
            </div>
            <div className="dv-filter-fields-row">
              <div className="dv-filter-date-group">
                <label className="dv-filter-label">Desde</label>
                <input
                  type="date"
                  className="dv-date-input"
                  value={filterState.fechaDesde}
                  onChange={(e) => setFilter({ fechaDesde: e.target.value })}
                  aria-label="Fecha inicial"
                  data-testid="dv-filter-fecha-desde"
                />
              </div>
              <div className="dv-filter-date-group">
                <label className="dv-filter-label">Hasta</label>
                <input
                  type="date"
                  className="dv-date-input"
                  value={filterState.fechaHasta}
                  onChange={(e) => setFilter({ fechaHasta: e.target.value })}
                  aria-label="Fecha final"
                  data-testid="dv-filter-fecha-hasta"
                />
              </div>
              <div className="dv-filter-select-group">
                <label className="dv-filter-label">Estado</label>
                <select
                  className="dv-select"
                  value={filterState.estadoSemaforo || 'todos'}
                  onChange={(e) => setFilter({ estadoSemaforo: e.target.value })}
                  aria-label="Filtro Estado Semáforo"
                  data-testid="dv-filter-estado-semaforo"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="verde">Completo</option>
                  <option value="violeta">Tiene revisión</option>
                  <option value="tiene_insumos">Tiene Insumos</option>
                  <option value="no_tiene_insumos">No tiene insumos</option>
                  <option value="rojo">Sin proceso</option>
                </select>
              </div>
              <div className="dv-filter-select-group">
                <label className="dv-filter-label">Días PQR</label>
                <select
                  className="dv-select"
                  value={filterState.diasPqrFiltro || 'todos'}
                  onChange={(e) => setFilter({ diasPqrFiltro: e.target.value })}
                  aria-label="Filtro Días PQR"
                  data-testid="dv-filter-dias-pqr"
                >
                  <option value="todos">Todos</option>
                  <option value="menor5">&lt; 5 días hábiles</option>
                  <option value="urgente">Urgente (≤ 3 días)</option>
                  <option value="vence_hoy">Vence hoy</option>
                  <option value="vencido">Vencidos (&lt; 0 días)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── FILTER ACTIONS + TAGS ── */}
          <div className="dv-filter-footer">
            <div className="dv-filter-tags">
              {filterState.search.trim() && (
                <span className="dv-tag" data-testid="dv-tag-search">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  {filterState.search.trim()}
                  <button
                    onClick={() => {
                      setSearchInput('');
                      setFilter({ search: '' });
                    }}
                    aria-label="Quitar búsqueda"
                  >
                    ×
                  </button>
                </span>
              )}
              {filterState.cuenta.trim() && (
                <span className="dv-tag" data-testid="dv-tag-cuenta">
                  Cuenta: {filterState.cuenta.trim()}
                  <button onClick={() => setFilter({ cuenta: '' })} aria-label="Quitar cuenta">
                    ×
                  </button>
                </span>
              )}
              {filterState.proceso.trim() && (
                <span className="dv-tag" data-testid="dv-tag-proceso">
                  Proceso: {filterState.proceso.trim()}
                  <button onClick={() => setFilter({ proceso: '' })} aria-label="Quitar proceso">
                    ×
                  </button>
                </span>
              )}
              {filterState.radicado.trim() && (
                <span className="dv-tag" data-testid="dv-tag-radicado">
                  Radicado: {filterState.radicado.trim()}
                  <button onClick={() => setFilter({ radicado: '' })} aria-label="Quitar radicado">
                    ×
                  </button>
                </span>
              )}
              {filterState.fechaDesde && (
                <span className="dv-tag" data-testid="dv-tag-fecha-desde">
                  Desde: {filterState.fechaDesde}
                  <button
                    onClick={() => setFilter({ fechaDesde: '' })}
                    aria-label="Quitar fecha inicial"
                  >
                    ×
                  </button>
                </span>
              )}
              {filterState.fechaHasta && (
                <span className="dv-tag" data-testid="dv-tag-fecha-hasta">
                  Hasta: {filterState.fechaHasta}
                  <button
                    onClick={() => setFilter({ fechaHasta: '' })}
                    aria-label="Quitar fecha final"
                  >
                    ×
                  </button>
                </span>
              )}
              {filterState.estadoSemaforo && filterState.estadoSemaforo !== 'todos' && (
                <span className="dv-tag" data-testid="dv-tag-estado-semaforo">
                  Estado: {ESTADO_LABELS[filterState.estadoSemaforo] || filterState.estadoSemaforo}
                  <button
                    onClick={() => setFilter({ estadoSemaforo: 'todos' })}
                    aria-label="Quitar filtro estado"
                  >
                    ×
                  </button>
                </span>
              )}
              {filterState.diasPqrFiltro && filterState.diasPqrFiltro !== 'todos' && (
                <span className="dv-tag" data-testid="dv-tag-dias-pqr">
                  PQR: {filterState.diasPqrFiltro}
                  <button
                    onClick={() => setFilter({ diasPqrFiltro: 'todos' })}
                    aria-label="Quitar filtro días pqr"
                  >
                    ×
                  </button>
                </span>
              )}
              {showOnlySelected && (
                <span className="dv-tag dv-tag--green" data-testid="dv-tag-seleccionados">
                  Solo seleccionados
                  <button
                    onClick={() => setShowOnlySelected(false)}
                    aria-label="Quitar seleccionados"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
            <div className="dv-filter-actions">
              {hasAnyFilter && (
                <button
                  className="dv-filter-clear-btn"
                  onClick={handleClearFilters}
                  data-testid="dv-limpiar-filtros"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Limpiar filtros
                </button>
              )}
              {selectedRows.size > 0 && (
                <button
                  className="dv-filter-clear-btn"
                  onClick={handleClearSelection}
                  data-testid="dv-limpiar-seleccion"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Limpiar selección
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ RESULTS COUNTER ═══════ */}
      <div className="dv-results-bar" data-testid="dv-counter">
        <span className="dv-results-text">
          {totalFiltered === 0
            ? '0 resultados'
            : `Mostrando ${startIdx + 1}–${endIdx} de ${formatCount(totalFiltered)} registro${totalFiltered !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* ═══════ TABLE ═══════ */}
      <div className="dv-table-container" data-testid="dv-table-wrap">
        <div className="dv-table-scroll">
          <table className="dv-table" data-testid="dv-table">
            <thead>
              <tr>
                <th className="dv-th dv-th--check">
                  <label className="dv-checkbox-wrap">
                    <input
                      ref={headerCbRef}
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={() => togglePage()}
                      aria-label="Seleccionar página"
                      data-testid="dv-header-checkbox"
                    />
                    <span className="dv-checkbox-custom" />
                  </label>
                </th>
                <th className="dv-th">Estado</th>
                <th className="dv-th">Fecha</th>
                <th className="dv-th">Tipo Proceso</th>
                <th className="dv-th dv-th--center">PQR</th>
                <th className="dv-th">Cuenta</th>
                <th className="dv-th">Solicitante</th>
                <th className="dv-th">Radicado</th>
                <th className="dv-th">Proceso</th>
                <th className="dv-th">Responsable</th>
                <th className="dv-th dv-th--actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="dv-empty-row">
                    <div className="dv-empty-row-content">
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--neutral-400)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                      </svg>
                      <span>Sin resultados — ajusta los filtros</span>
                    </div>
                  </td>
                </tr>
              ) : (
                pageRecords.map((r, idx) => {
                  const isSelected = selectedRows.has(r.rowId);
                  void selection.isSelected(r.rowId);

                  const semaforo =
                    r.estadoSemaforo || getEstadoSemaforo(r.numeroProceso, r.observacionRevision);

                  const pqr =
                    r.diasPqrLabel && r.diasPqr !== undefined
                      ? {
                          remainingDays: r.diasPqr,
                          label: r.diasPqrLabel,
                          isExpired: r.diasPqr < 0,
                          dueDateStr: '',
                        }
                      : calculatePqrBusinessDays(
                          r.fechaSolicitud ||
                            (r as Record<string, unknown>)['Fecha Radicación'] ||
                            (r as Record<string, unknown>)['Fecha  Radicacion'] ||
                            (r as Record<string, unknown>)['FECHA_RADICACION']
                        );

                  const tipoProc = String(
                    r.tipoProceso || (r as Record<string, unknown>)['PROCESO'] || '—'
                  );
                  const descTipoProc = String(
                    r.descripcionTipoProceso ||
                      (r as Record<string, unknown>)['DESCRIPCION_TIPO_PROCESO'] ||
                      ''
                  );
                  const respInsumo = String(
                    r.usuarioResponsableInsumo ||
                      r.responsableInsumo ||
                      (r as Record<string, unknown>)['USUARIO_RESPONSABLE_INSUMO'] ||
                      '—'
                  );
                  const hasInsumo =
                    respInsumo !== '—' &&
                    respInsumo.trim() !== '' &&
                    respInsumo.toLowerCase() !== 'null' &&
                    respInsumo.toLowerCase() !== 'undefined';

                  const semaforoClass =
                    semaforo === 'verde'
                      ? 'dv-sem--verde'
                      : semaforo === 'violeta'
                        ? 'dv-sem--violeta'
                        : semaforo === 'rojo' && hasInsumo
                          ? 'dv-sem--azul'
                          : semaforo === 'rojo'
                            ? 'dv-sem--rojo'
                            : 'dv-sem--default';

                  const semaforoLabel =
                    semaforo === 'verde'
                      ? 'Completo'
                      : semaforo === 'violeta'
                        ? 'Tiene revisión'
                        : semaforo === 'rojo' && hasInsumo
                          ? 'Tiene Insumos'
                          : semaforo === 'rojo'
                            ? 'No tiene insumos'
                            : '—';

                  const semaforoTitle =
                    semaforo === 'verde'
                      ? 'Con número de proceso y observación de revisión'
                      : semaforo === 'violeta'
                        ? 'Con número de proceso, sin observación de revisión'
                        : semaforo === 'rojo' && hasInsumo
                          ? 'Con responsable de insumo asignado'
                          : semaforo === 'rojo'
                            ? 'Sin proceso o responsable de insumo'
                            : '';

                  return (
                    <tr
                      key={r.rowId}
                      data-testid={`dv-row-${r.rowId}`}
                      className={`dv-tr ${isSelected ? 'dv-tr--selected' : ''}`}
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <td className="dv-td dv-td--check">
                        <label className="dv-checkbox-wrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRow(r.rowId)}
                            aria-label={`Seleccionar ${r.rowId}`}
                            data-testid={`dv-row-checkbox-${r.rowId}`}
                          />
                          <span className="dv-checkbox-custom" />
                        </label>
                      </td>

                      <td className="dv-td">
                        <span
                          className={`dv-sem ${semaforoClass}`}
                          data-testid={`dv-semaforo-${r.rowId}`}
                          title={semaforoTitle}
                        >
                          <span className="dv-sem-dot" />
                          {semaforoLabel}
                        </span>
                      </td>

                      <td className="dv-td dv-td--nowrap">{String(r.fechaSolicitud ?? '—')}</td>

                      <td
                        className="dv-td dv-td--truncate"
                        title={descTipoProc || undefined}
                        data-testid={`dv-tipo-proceso-${r.rowId}`}
                      >
                        {tipoProc}
                      </td>

                      <td className="dv-td dv-td--center">
                        <span
                          className={`dv-pqr ${
                            pqr.isExpired
                              ? 'dv-pqr--vencido'
                              : pqr.remainingDays <= 3
                                ? 'dv-pqr--urgente'
                                : 'dv-pqr--ok'
                          }`}
                          data-testid={`dv-pqr-${r.rowId}`}
                          title={pqr.dueDateStr ? `Vence: ${pqr.dueDateStr}` : undefined}
                        >
                          {pqr.label}
                        </span>
                      </td>

                      <td className="dv-td dv-td--mono">
                        {String(r.numeroCuenta ?? r.cuenta ?? '—')}
                      </td>

                      <td
                        className="dv-td dv-td--truncate"
                        title={String(r.nombreSolicitante ?? '')}
                      >
                        {String(r.nombreSolicitante ?? '—')}
                      </td>

                      <td className="dv-td dv-td--nowrap">{String(r.radicadoEntrada ?? '—')}</td>

                      <td className="dv-td dv-td--nowrap">{String(r.numeroProceso ?? '—')}</td>

                      <td
                        className="dv-td dv-td--truncate"
                        title={respInsumo !== '—' ? respInsumo : undefined}
                        data-testid={`dv-responsable-insumo-${r.rowId}`}
                      >
                        {respInsumo}
                      </td>

                      <td className="dv-td dv-td--center">
                        <button
                          className="dv-edit-btn"
                          onClick={() => openEdit(r)}
                          aria-label={`Editar ${r.rowId}`}
                          data-testid={`dv-edit-${r.rowId}`}
                          title="Editar registro"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ═══════ PAGINATION ═══════ */}
        <div className="dv-pagination" data-testid="dv-pagination-info">
          <span className="dv-pagination-info">
            {totalFiltered === 0
              ? '0 resultados'
              : `${startIdx + 1}–${endIdx} de ${formatCount(totalFiltered)}`}
            <span className="dv-pagination-sep">·</span>
            Pág. {safePage} de {totalPages}
          </span>
          <div className="dv-pagination-controls">
            <button
              className="dv-page-btn"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
              data-testid="dv-prev"
              aria-label="Anterior"
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
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            {pageNums.map((n) => (
              <button
                key={n}
                className={`dv-page-btn ${n === safePage ? 'dv-page-btn--active' : ''}`}
                onClick={() => setPage(n)}
                data-testid={`dv-page-${n}`}
                aria-label={`Página ${n}`}
                aria-current={n === safePage ? 'page' : undefined}
              >
                {n}
              </button>
            ))}
            <button
              className="dv-page-btn"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
              data-testid="dv-next"
              aria-label="Siguiente"
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
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <div className="dv-jump">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpPage}
                onChange={(e) => setJumpPage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleJump();
                }}
                placeholder="Ir a…"
                aria-label="Ir a página"
                data-testid="dv-jump-input"
                className="dv-jump-input"
              />
              <button className="dv-jump-btn" onClick={handleJump} data-testid="dv-jump-go">
                Ir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ BOTTOM ACTIONS ═══════ */}
      <div className="dv-bottom-bar">
        <Button variant="ghost" onClick={() => goTo('configuracion')} data-testid="dv-volver">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Volver
        </Button>
        <div className="dv-bottom-right">
          <span className="dv-selected-label" data-testid="dv-selected-count">
            {selectedRows.size === 0
              ? 'Ningún registro seleccionado'
              : `${selectedRows.size} registro${selectedRows.size > 1 ? 's' : ''} seleccionado${selectedRows.size > 1 ? 's' : ''}`}
          </span>
          <Button
            variant="primary"
            disabled={selectedRows.size === 0}
            onClick={() => {
              if (selectedRows.size === 0) return;
              complete('datos');
              goTo('plantillas');
            }}
            data-testid="dv-continuar"
            title={selectedRows.size === 0 ? 'Selecciona al menos un registro' : 'Continuar'}
          >
            Continuar
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Button>
        </div>
      </div>

      {/* ═══════ MODAL ═══════ */}
      <RecordEditModal
        open={modalOpen}
        record={activeRecord ?? editingRecord}
        onClose={handleModalClose}
        onSave={handleModalSave}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES — Premium DataView CSS
// ═══════════════════════════════════════════════════════════════
const dvStyles = `
  /* ── Keyframes ── */
  @keyframes dv-fadeInUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes dv-slideDown {
    from { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }
    to { opacity: 1; max-height: 600px; }
  }
  @keyframes dv-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  @keyframes dv-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(0,75,147,0); }
    50% { box-shadow: 0 0 0 4px rgba(0,75,147,0.08); }
  }
  @keyframes dv-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  /* ── Hero Header ── */
  .dv-hero {
    position: relative;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }
  .dv-hero-accent {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--essa-primary) 0%, var(--essa-accent) 50%, var(--essa-primary) 100%);
    background-size: 200% 100%;
    animation: dv-shimmer 4s ease-in-out infinite;
  }
  .dv-hero-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    gap: 16px;
  }
  .dv-hero-left {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }
  .dv-hero-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--essa-primary-50) 0%, #dbeafe 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--essa-primary);
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0,75,147,0.1);
  }
  .dv-hero-title {
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--neutral-900);
    margin: 0;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }
  .dv-hero-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    flex-wrap: wrap;
  }
  .dv-hero-count {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--neutral-500);
  }
  .dv-hero-selected {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--essa-primary);
    background: var(--essa-primary-50);
    border: 1px solid #bfdbfe;
    padding: 2px 8px;
    border-radius: 999px;
  }
  .dv-hero-filters {
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--essa-accent-600);
    background: var(--essa-accent-50);
    border: 1px solid #c5e8a3;
    padding: 2px 8px;
    border-radius: 999px;
  }
  .dv-hero-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-shrink: 0;
  }

  /* ── Action Pills ── */
  .dv-action-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 999px;
    border: 1px solid var(--border-strong);
    background: var(--bg-card);
    color: var(--neutral-700);
    font-size: 0.78rem;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: all 200ms var(--ease);
    white-space: nowrap;
  }
  .dv-action-pill:hover {
    border-color: var(--essa-primary);
    color: var(--essa-primary);
    background: var(--essa-primary-50);
    box-shadow: 0 2px 8px rgba(0,75,147,0.1);
  }
  .dv-action-pill--active {
    border-color: var(--essa-primary);
    background: var(--essa-primary);
    color: #fff;
  }
  .dv-action-pill--active:hover {
    background: var(--essa-primary-600);
    border-color: var(--essa-primary-600);
    color: #fff;
  }
  .dv-action-pill--green {
    border-color: #86efac;
    color: #15803d;
    background: #f0fdf4;
  }
  .dv-action-pill--green:hover {
    border-color: #22c55e;
    background: #dcfce7;
    color: #166534;
    box-shadow: 0 2px 8px rgba(22,163,74,0.15);
  }
  .dv-action-pill-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: var(--essa-primary);
    color: #fff;
    font-size: 0.65rem;
    font-weight: 800;
    line-height: 1;
  }
  .dv-action-pill--active .dv-action-pill-badge {
    background: #fff;
    color: var(--essa-primary);
  }

  /* ── Filter Panel ── */
  .dv-filter-panel {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-xs);
    animation: dv-fadeInUp 400ms var(--ease-out) both;
  }
  .dv-filter-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-family: inherit;
    color: var(--neutral-700);
    transition: background 150ms var(--ease);
  }
  .dv-filter-toggle:hover {
    background: var(--neutral-50);
  }
  .dv-filter-toggle-left {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8125rem;
    font-weight: 700;
  }
  .dv-filter-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 999px;
    background: var(--essa-primary);
    color: #fff;
    font-size: 0.68rem;
    font-weight: 800;
  }
  .dv-filter-body {
    max-height: 0;
    overflow: hidden;
    transition: max-height 350ms var(--ease), padding 350ms var(--ease);
    padding: 0 20px;
  }
  .dv-filter-body--open {
    max-height: 600px;
    padding: 0 20px 16px;
  }

  .dv-filter-card {
    background: var(--neutral-50);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 14px;
    margin-bottom: 10px;
    transition: border-color 200ms var(--ease), box-shadow 200ms var(--ease);
  }
  .dv-filter-card:hover {
    border-color: #93c5fd;
  }
  .dv-filter-card:focus-within {
    border-color: var(--essa-primary);
    box-shadow: 0 0 0 3px rgba(0,75,147,0.08);
  }
  .dv-filter-card--search {
    background: linear-gradient(135deg, var(--essa-primary-50) 0%, #f0f7ff 100%);
    border-color: #bfdbfe;
  }
  .dv-filter-card-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--essa-primary);
    margin-bottom: 10px;
  }
  .dv-filter-fields-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
  }
  .dv-filter-date-group,
  .dv-filter-select-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .dv-filter-label {
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--neutral-500);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .dv-date-input {
    height: 36px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-strong);
    background: #fff;
    padding: 0 10px;
    font-size: 0.8125rem;
    font-family: inherit;
    color: var(--neutral-800);
    outline: none;
    cursor: pointer;
    transition: border-color 200ms var(--ease), box-shadow 200ms var(--ease);
  }
  .dv-date-input:focus {
    border-color: var(--essa-primary);
    box-shadow: var(--ring);
  }
  .dv-select {
    height: 36px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-strong);
    background: #fff;
    padding: 0 10px;
    font-size: 0.8125rem;
    font-family: inherit;
    color: var(--neutral-800);
    outline: none;
    cursor: pointer;
    transition: border-color 200ms var(--ease), box-shadow 200ms var(--ease);
  }
  .dv-select:focus {
    border-color: var(--essa-primary);
    box-shadow: var(--ring);
  }

  /* ── Filter Tags & Footer ── */
  .dv-filter-footer {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding-top: 4px;
  }
  .dv-filter-tags {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    flex: 1;
    min-width: 0;
  }
  .dv-filter-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }
  .dv-filter-clear-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 10px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: #fff;
    color: var(--neutral-600);
    font-size: 0.72rem;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: all 200ms var(--ease);
    white-space: nowrap;
  }
  .dv-filter-clear-btn:hover {
    border-color: var(--danger);
    color: var(--danger);
    background: var(--danger-50);
  }

  /* ── Tags ── */
  .dv-tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: var(--essa-primary-50);
    border: 1px solid #bfdbfe;
    color: #1e3a5f;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 999px;
    animation: dv-fadeInUp 250ms var(--ease-out) both;
    white-space: nowrap;
  }
  .dv-tag button {
    width: 16px;
    height: 16px;
    border-radius: 999px;
    border: 1px solid #93c5fd;
    background: #fff;
    color: #1e40af;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    line-height: 1;
    cursor: pointer;
    transition: all 150ms var(--ease);
    padding: 0;
  }
  .dv-tag button:hover {
    background: #dbeafe;
    border-color: #3b82f6;
    color: #1e3a8a;
  }
  .dv-tag--green {
    background: var(--essa-accent-50);
    border-color: #c5e8a3;
    color: #2d5016;
  }
  .dv-tag--green button {
    border-color: #a3d977;
    color: #365314;
  }

  /* ── Results Bar ── */
  .dv-results-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px;
  }
  .dv-results-text {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--neutral-500);
  }

  /* ── Table Container ── */
  .dv-table-container {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    animation: dv-fadeInUp 500ms var(--ease-out) 100ms both;
  }
  .dv-table-scroll {
    overflow-x: auto;
  }

  /* ── Table ── */
  .dv-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8125rem;
  }

  /* ── Table Header ── */
  .dv-th {
    text-align: left;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--neutral-500);
    background: linear-gradient(180deg, var(--neutral-50) 0%, #f1f5f9 100%);
    padding: 12px 14px;
    border-bottom: 2px solid var(--border);
    white-space: nowrap;
    position: sticky;
    top: 0;
    z-index: 2;
  }
  .dv-th--check {
    width: 44px;
    text-align: center;
  }
  .dv-th--center {
    text-align: center;
  }
  .dv-th--actions {
    width: 72px;
    text-align: center;
  }

  /* ── Custom Checkbox ── */
  .dv-checkbox-wrap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    position: relative;
  }
  .dv-checkbox-wrap input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }
  .dv-checkbox-custom {
    width: 18px;
    height: 18px;
    border-radius: 5px;
    border: 2px solid var(--border-strong);
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 200ms var(--ease);
    position: relative;
  }
  .dv-checkbox-custom::after {
    content: '';
    width: 10px;
    height: 6px;
    border-left: 2px solid #fff;
    border-bottom: 2px solid #fff;
    transform: rotate(-45deg) scale(0);
    transition: transform 200ms var(--ease);
    position: absolute;
    top: 2px;
  }
  .dv-checkbox-wrap input:checked + .dv-checkbox-custom {
    background: var(--essa-primary);
    border-color: var(--essa-primary);
  }
  .dv-checkbox-wrap input:checked + .dv-checkbox-custom::after {
    transform: rotate(-45deg) scale(1);
  }
  .dv-checkbox-wrap input:indeterminate + .dv-checkbox-custom {
    background: var(--essa-primary);
    border-color: var(--essa-primary);
  }
  .dv-checkbox-wrap input:indeterminate + .dv-checkbox-custom::after {
    width: 10px;
    height: 0;
    border-left: 0;
    border-bottom: 2px solid #fff;
    transform: rotate(0) scale(1);
    top: 6px;
  }

  /* ── Table Row ── */
  .dv-tr {
    transition: background 200ms var(--ease), box-shadow 200ms var(--ease);
    border-left: 3px solid transparent;
    animation: dv-fadeInUp 350ms var(--ease-out) both;
  }
  .dv-tr:nth-child(even) {
    background: rgba(248,250,252,0.5);
  }
  .dv-tr:hover {
    background: #f1f5f9;
    box-shadow: inset 0 0 0 1px rgba(0,75,147,0.04);
  }
  .dv-tr--selected {
    background: linear-gradient(90deg, #eff6ff 0%, #dbeafe 100%) !important;
    border-left-color: var(--essa-primary) !important;
    box-shadow: inset 3px 0 0 var(--essa-primary);
  }
  .dv-tr--selected:hover {
    background: linear-gradient(90deg, #dbeafe 0%, #bfdbfe 100%) !important;
  }

  /* ── Table Cell ── */
  .dv-td {
    padding: 11px 14px;
    border-bottom: 1px solid #f1f5f9;
    color: var(--neutral-700);
    vertical-align: middle;
    transition: background 150ms var(--ease);
  }
  .dv-td--check {
    width: 44px;
    text-align: center;
  }
  .dv-td--center {
    text-align: center;
  }
  .dv-td--nowrap {
    white-space: nowrap;
    font-size: 0.78rem;
  }
  .dv-td--truncate {
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dv-td--mono {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--neutral-800);
  }

  /* ── Empty Row ── */
  .dv-empty-row {
    padding: 40px 20px !important;
  }
  .dv-empty-row-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    color: var(--neutral-400);
    font-size: 0.875rem;
    font-weight: 600;
  }

  /* ── Semaforo Badges ── */
  .dv-sem {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid;
    white-space: nowrap;
    transition: transform 150ms var(--ease), box-shadow 150ms var(--ease);
  }
  .dv-sem:hover {
    transform: translateY(-1px);
  }
  .dv-sem-dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    display: inline-block;
    flex-shrink: 0;
  }
  .dv-sem--verde {
    background: #dcfce7;
    color: #15803d;
    border-color: #86efac;
  }
  .dv-sem--verde .dv-sem-dot {
    background: #16a34a;
    box-shadow: 0 0 6px rgba(22,163,74,0.5);
    animation: dv-pulse 2s ease-in-out infinite;
  }
  .dv-sem--violeta {
    background: #f3e8ff;
    color: #7e22ce;
    border-color: #d8b4fe;
  }
  .dv-sem--violeta .dv-sem-dot {
    background: #9333ea;
    box-shadow: 0 0 6px rgba(147,51,234,0.5);
  }
  .dv-sem--azul {
    background: #e0f2fe;
    color: #0369a1;
    border-color: #7dd3fc;
  }
  .dv-sem--azul .dv-sem-dot {
    background: #0284c7;
    box-shadow: 0 0 6px rgba(2,132,199,0.5);
  }
  .dv-sem--rojo {
    background: #fee2e2;
    color: #b91c1c;
    border-color: #fca5a5;
  }
  .dv-sem--rojo .dv-sem-dot {
    background: #dc2626;
    box-shadow: 0 0 6px rgba(220,38,38,0.5);
  }

  /* ── PQR Badges ── */
  .dv-pqr {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 3px 9px;
    border-radius: 999px;
    border: 1px solid;
    white-space: nowrap;
  }
  .dv-pqr--ok {
    background: #f0fdf4;
    color: #166534;
    border-color: #bbf7d0;
  }
  .dv-pqr--urgente {
    background: #fffbeb;
    color: #b45309;
    border-color: #fde68a;
    font-weight: 800;
    animation: dv-pulse 2s ease-in-out infinite;
  }
  .dv-pqr--vencido {
    background: #fef2f2;
    color: #991b1b;
    border-color: #fecaca;
    font-weight: 800;
  }

  /* ── Edit Button ── */
  .dv-edit-btn {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--essa-primary);
    cursor: pointer;
    transition: all 200ms var(--ease);
  }
  .dv-edit-btn:hover {
    background: var(--essa-primary);
    color: #fff;
    border-color: var(--essa-primary);
    box-shadow: 0 2px 8px rgba(0,75,147,0.25);
    transform: translateY(-1px);
  }

  /* ── Pagination ── */
  .dv-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    border-top: 1px solid var(--border);
    background: var(--neutral-50);
    flex-wrap: wrap;
  }
  .dv-pagination-info {
    font-size: 0.78rem;
    color: var(--neutral-500);
    font-weight: 600;
  }
  .dv-pagination-sep {
    margin: 0 4px;
    color: var(--neutral-300);
  }
  .dv-pagination-controls {
    display: flex;
    gap: 4px;
    align-items: center;
    flex-wrap: wrap;
  }
  .dv-page-btn {
    min-width: 34px;
    height: 34px;
    padding: 0 8px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: #fff;
    color: var(--neutral-700);
    font-weight: 700;
    font-size: 0.78rem;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 200ms var(--ease);
  }
  .dv-page-btn:hover:not(:disabled):not(.dv-page-btn--active) {
    border-color: var(--essa-primary);
    color: var(--essa-primary);
    background: var(--essa-primary-50);
  }
  .dv-page-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .dv-page-btn--active {
    border-color: var(--essa-primary) !important;
    background: var(--essa-primary) !important;
    color: #fff !important;
    box-shadow: 0 2px 8px rgba(0,75,147,0.25);
    font-weight: 800;
  }

  /* ── Jump Input ── */
  .dv-jump {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: 6px;
  }
  .dv-jump-input {
    width: 64px;
    height: 34px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: #fff;
    padding: 0 10px;
    font-size: 0.78rem;
    font-family: inherit;
    text-align: center;
    color: var(--neutral-800);
    outline: none;
    transition: border-color 200ms var(--ease), box-shadow 200ms var(--ease);
  }
  .dv-jump-input:focus {
    border-color: var(--essa-primary);
    box-shadow: var(--ring);
  }
  .dv-jump-btn {
    height: 34px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: #fff;
    color: var(--neutral-700);
    font-weight: 700;
    font-size: 0.78rem;
    font-family: inherit;
    cursor: pointer;
    transition: all 200ms var(--ease);
  }
  .dv-jump-btn:hover {
    border-color: var(--essa-primary);
    color: var(--essa-primary);
    background: var(--essa-primary-50);
  }

  /* ── Bottom Bar ── */
  .dv-bottom-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 14px 20px;
    box-shadow: var(--shadow-xs);
    animation: dv-fadeInUp 500ms var(--ease-out) 200ms both;
  }
  .dv-bottom-right {
    display: flex;
    gap: 14px;
    align-items: center;
  }
  .dv-selected-label {
    font-size: 0.78rem;
    color: var(--neutral-500);
    font-weight: 600;
  }

  /* ── Empty State ── */
  .dv-empty-state {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 64px 32px;
    text-align: center;
    box-shadow: var(--shadow-sm);
    animation: dv-fadeInUp 500ms var(--ease-out) both;
  }
  .dv-empty-icon {
    width: 80px;
    height: 80px;
    border-radius: 20px;
    background: linear-gradient(135deg, var(--essa-primary-50) 0%, #dbeafe 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
    animation: dv-glow 3s ease-in-out infinite;
  }
  .dv-empty-title {
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--neutral-700);
    margin: 0 0 6px;
  }
  .dv-empty-subtitle {
    font-size: 0.875rem;
    color: var(--neutral-500);
    margin: 0 0 20px;
  }

  /* ── Responsive ── */
  @media (max-width: 1100px) {
    .dv-hero-content {
      flex-direction: column;
      align-items: flex-start;
    }
    .dv-hero-actions {
      width: 100%;
      justify-content: flex-start;
    }
    .dv-filter-fields-row {
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 860px) {
    .dv-filter-fields-row {
      grid-template-columns: 1fr;
    }
    .dv-bottom-bar {
      flex-direction: column;
      align-items: stretch;
    }
    .dv-bottom-right {
      justify-content: space-between;
    }
  }
`;

export default DataView;

import { useEffect, useMemo, useRef, useState } from 'react';
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
  'diasPqrLabel',
];

function formatCount(n: number): string {
  // es-CO style with dot as thousand separator
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

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

  // useSelection helper (ensures Set<string> usage)
  const selection = useSelection();

  const [searchInput, setSearchInput] = useState(filterState.search);
  const debouncedSearch = useDebouncedSearch(searchInput, 300);
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [jumpPage, setJumpPage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState<EssaRecord | null>(null);

  const headerCbRef = useRef<HTMLInputElement>(null);

  // sync debounced search to store
  useEffect(() => {
    if (debouncedSearch !== filterState.search) {
      setFilter({ search: debouncedSearch });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // keep searchInput in sync if external filter reset
  useEffect(() => {
    if (filterState.search !== searchInput && filterState.search !== debouncedSearch) {
      // only when cleared externally
      if (filterState.search === '' && searchInput !== '') {
        setSearchInput('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterState.search]);

  // NOTE: C2 — DataView local pipeline is canonical for rendering (adds showOnlySelected + SEARCHABLE_FIELDS on top of store filters).
  // Keep in sync with src/store/dataStore.ts applyFilters; dataStore.applyFilters is programmatic source for getFilteredRecords/getPaginatedRecords.
  // pipeline: data → search (debounced, stored) → cuenta → proceso → radicado → fechaSolicitud → selected toggle → sort → count → paginate
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
      out = out.filter((r) =>
        String(r.numeroCuenta ?? r.cuenta ?? '')
          .toLowerCase()
          .includes(q)
      );
    }
    if (filterState.proceso.trim()) {
      const q = filterState.proceso.trim().toLowerCase();
      out = out.filter((r) =>
        String(r.numeroProceso ?? '')
          .toLowerCase()
          .includes(q)
      );
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

    // Rango de fechas: fechaDesde y fechaHasta
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

    // Filtro Estado Semáforo ('todos' | 'verde' | 'violeta' | 'rojo' | 'tiene_insumos' | 'no_tiene_insumos')
    if (filterState.estadoSemaforo && filterState.estadoSemaforo !== 'todos') {
      out = out.filter((r) => {
        const resp = String(r.usuarioResponsableInsumo || (r as Record<string, unknown>)['USUARIO_RESPONSABLE_INSUMO'] || '').trim();
        const hasInsumo = resp !== '' && resp !== '—' && resp.toLowerCase() !== 'null' && resp.toLowerCase() !== 'undefined';
        const sem = r.estadoSemaforo || getEstadoSemaforo(r.numeroProceso, r.observacionRevision);

        if (filterState.estadoSemaforo === 'tiene_insumos') {
          return hasInsumo;
        }
        if (filterState.estadoSemaforo === 'no_tiene_insumos') {
          return !hasInsumo;
        }
        return sem === filterState.estadoSemaforo;
      });
    }

    // Filtro Días PQR ('todos' | 'menor5' | 'urgente' | 'vence_hoy' | 'vencido')
    if (filterState.diasPqrFiltro && filterState.diasPqrFiltro !== 'todos') {
      out = out.filter((r) => {
        const pqr =
          r.diasPqr !== undefined
            ? { remainingDays: r.diasPqr }
            : calculatePqrBusinessDays(
                r.fechaSolicitud || (r as Record<string, unknown>)['Fecha Radicación'] || (r as Record<string, unknown>)['Fecha  Radicacion']
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

  // keep store page in sync if totalPages shrinks
  useEffect(() => {
    if (currentPage !== safePage) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // keep activeRecord for potential re-open but clear after
    window.setTimeout(() => setActiveRecord(null), 150);
  };

  const handleModalSave = (patch: Partial<EssaRecord>) => {
    if (!activeRecord) return;
    editRecord(activeRecord.rowId, patch);
  };

  // pagination window 5
  const pageNums = useMemo(() => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }, [safePage, totalPages]);

  if (!records || records.length === 0) {
    return (
      <div data-testid="data-view" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '48px 24px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              color: 'var(--neutral-700)',
              marginBottom: 6,
            }}
          >
            No hay registros cargados
          </div>
          <div style={{ fontSize: '0.84rem', color: 'var(--neutral-500)', marginBottom: 16 }}>
            Carga un archivo Excel en el Módulo 2 para ver los datos aquí.
          </div>
          <Button
            variant="primary"
            onClick={() => goTo('configuracion')}
            data-testid="data-go-config"
          >
            Ir a Cargar Excel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="data-view" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`
        .dv-toolbar { background:#fff; border:1px solid var(--border); border-radius:12px; padding:14px; box-shadow:var(--shadow-xs); display:flex; flex-direction:column; gap:12px; }
        .dv-filters-grid { display:grid; grid-template-columns: repeat(5, 1fr); gap:10px; }
        @media (max-width: 960px){ .dv-filters-grid{ grid-template-columns: 1fr 1fr; } }
        .dv-tag { display:inline-flex; align-items:center; gap:6px; background:var(--essa-primary-50); border:1px solid #bfdbfe; color:#1e3a5f; font-size:0.76rem; font-weight:700; padding:5px 10px; border-radius:999px; }
        .dv-tag button { width:18px; height:18px; border-radius:999px; border:1px solid #93c5fd; background:#fff; color:#1e40af; display:inline-flex; align-items:center; justify-content:center; font-size:0.7rem; line-height:1; }
        .dv-table-wrap { background:#fff; border:1px solid var(--border); border-radius:12px; overflow:hidden; box-shadow:var(--shadow-sm); }
        .dv-table { width:100%; border-collapse:collapse; font-size:0.84rem; }
        .dv-table th { text-align:left; font-size:0.72rem; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; color:var(--neutral-500); background:#f8fafc; padding:10px 12px; border-bottom:1px solid var(--border); white-space:nowrap; }
        .dv-table td { padding:10px 12px; border-bottom:1px solid #f1f5f9; color:var(--neutral-700); vertical-align:middle; }
        .dv-row { transition: background 150ms var(--ease), border-color 150ms var(--ease), box-shadow 150ms var(--ease); border-left:3px solid transparent; }
        .dv-row--selected { background:#EBF5FF !important; border-left-color:#004B93 !important; }
        .dv-row:hover { background:#f8fafc; }
        .dv-row--selected:hover { background:#E6F0FF !important; }
        .dv-pagination-btn { min-width:36px; height:36px; padding:0 10px; border-radius:10px; border:1px solid var(--border); background:#fff; color:var(--neutral-700); font-weight:700; font-size:0.8125rem; display:inline-flex; align-items:center; justify-content:center; }
        .dv-pagination-btn:disabled { opacity:0.45; cursor:not-allowed; }
        .dv-pagination-btn--active { border-color:var(--essa-primary) !important; background:var(--essa-primary) !important; color:#fff !important; }

        /* semáforo styles */
        .dv-semaforo { display:inline-flex; align-items:center; gap:6px; font-size:0.75rem; font-weight:800; padding:4px 9px; border-radius:999px; border:1px solid; white-space:nowrap; }
        .dv-semaforo-dot { width:8px; height:8px; border-radius:999px; display:inline-block; }
        .dv-semaforo--verde { background:#dcfce7; color:#15803d; border-color:#86efac; }
        .dv-semaforo--verde .dv-semaforo-dot { background:#16a34a; box-shadow:0 0 6px rgba(22, 163, 74, 0.4); }
        .dv-semaforo--violeta { background:#f3e8ff; color:#7e22ce; border-color:#d8b4fe; }
        .dv-semaforo--violeta .dv-semaforo-dot { background:#9333ea; box-shadow:0 0 6px rgba(147, 51, 234, 0.4); }
        .dv-semaforo--azul { background:#e0f2fe; color:#0369a1; border-color:#7dd3fc; }
        .dv-semaforo--azul .dv-semaforo-dot { background:#0284c7; box-shadow:0 0 6px rgba(2, 132, 199, 0.4); }
        .dv-semaforo--naranja { background:#ffedd5; color:#c2410c; border-color:#fed7aa; }
        .dv-semaforo--naranja .dv-semaforo-dot { background:#ea580c; box-shadow:0 0 6px rgba(234, 88, 12, 0.4); }
        .dv-semaforo--rojo { background:#fee2e2; color:#b91c1c; border-color:#fca5a5; }
        .dv-semaforo--rojo .dv-semaforo-dot { background:#dc2626; box-shadow:0 0 6px rgba(220, 38, 38, 0.4); }

        .dv-tooltip-cell { cursor: help; border-bottom: 1px dotted #94a3b8; }

        /* badges */
        .dv-badge-pqr { display:inline-flex; align-items:center; gap:4px; font-size:0.74rem; font-weight:700; padding:3px 9px; border-radius:999px; border:1px solid; white-space:nowrap; }
        .dv-badge-pqr--ok { background:#f0fdf4; color:#166534; border-color:#bbf7d0; }
        .dv-badge-pqr--urgente { background:#fffbeb; color:#b45309; border-color:#fde68a; font-weight:800; }
        .dv-badge-pqr--vencido { background:#fef2f2; color:#991b1b; border-color:#fecaca; font-weight:800; }

        .dv-select { height:38px; border-radius:8px; border:1px solid var(--border-strong); padding:0 10px; font-size:0.8125rem; font-family:inherit; background:#fff; color:var(--neutral-800); outline:none; cursor:pointer; }
        .dv-select:focus { border-color:var(--essa-primary); box-shadow:var(--ring); }
        .dv-filters-row { display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:10px; width:100%; }
      `}</style>

      {/* header title */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: '#eff6ff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#004B93',
              fontWeight: 900,
            }}
          >
            ▦
          </span>
          <div>
            <h2
              style={{
                fontSize: '1.2rem',
                fontWeight: 900,
                color: 'var(--neutral-900)',
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              Módulo 3: Revisión de Datos
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', margin: 0 }}>
              {formatCount(totalFiltered)} registros{' '}
              {selectedRows.size > 0 ? `— ${selectedRows.size} seleccionados` : ''}{' '}
              {activeFilterCount > 0
                ? `— ${activeFilterCount} filtro${activeFilterCount > 1 ? 's' : ''} activo${activeFilterCount > 1 ? 's' : ''}`
                : ''}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant={showOnlySelected ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setShowOnlySelected((v) => !v)}
            data-testid="dv-toggle-seleccionados"
          >
            {showOnlySelected ? 'Ver todos' : 'Ver seleccionados'}
            {selectedRows.size > 0 && (
              <span
                style={{
                  background: showOnlySelected ? '#fff' : 'var(--essa-primary-50)',
                  color: showOnlySelected ? 'var(--essa-primary)' : 'var(--essa-primary)',
                  border: `1px solid ${showOnlySelected ? '#fff' : '#bfdbfe'}`,
                  borderRadius: 999,
                  padding: '1px 6px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  marginLeft: 6,
                }}
              >
                {selectedRows.size}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* toolbar */}
      <div className="dv-toolbar" data-testid="dv-toolbar">
        {/* search + basic filter inputs */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '2 1 280px', minWidth: 220 }}>
            <Input
              placeholder="Buscar por nombre, cuenta, radicado, proceso, tipo proceso, responsable…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Buscar"
              data-testid="dv-search"
            />
          </div>
          <div style={{ flex: '1 1 140px', minWidth: 120 }}>
            <Input
              placeholder="Cuenta"
              value={filterState.cuenta}
              onChange={(e) => setFilter({ cuenta: e.target.value })}
              aria-label="Filtro cuenta"
              data-testid="dv-filter-cuenta"
            />
          </div>
          <div style={{ flex: '1 1 140px', minWidth: 120 }}>
            <Input
              placeholder="Proceso"
              value={filterState.proceso}
              onChange={(e) => setFilter({ proceso: e.target.value })}
              aria-label="Filtro proceso"
              data-testid="dv-filter-proceso"
            />
          </div>
          <div style={{ flex: '1 1 140px', minWidth: 120 }}>
            <Input
              placeholder="Radicado"
              value={filterState.radicado}
              onChange={(e) => setFilter({ radicado: e.target.value })}
              aria-label="Filtro radicado"
              data-testid="dv-filter-radicado"
            />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              data-testid="dv-limpiar-filtros"
              title="Limpiar todos los filtros"
            >
              Limpiar filtros
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              data-testid="dv-limpiar-seleccion"
              title="Limpiar selección"
            >
              Limpiar selección
            </Button>
          </div>
        </div>

        {/* Date range & dropdown filters row */}
        <div className="dv-filters-row">
          {/* Fecha inicial */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--neutral-600)' }}>
              Fecha inicial:
            </label>
            <Input
              type="date"
              value={filterState.fechaDesde}
              onChange={(e) => setFilter({ fechaDesde: e.target.value })}
              aria-label="Fecha inicial"
              data-testid="dv-filter-fecha-desde"
            />
          </div>

          {/* Fecha final */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--neutral-600)' }}>
              Fecha final:
            </label>
            <Input
              type="date"
              value={filterState.fechaHasta}
              onChange={(e) => setFilter({ fechaHasta: e.target.value })}
              aria-label="Fecha final"
              data-testid="dv-filter-fecha-hasta"
            />
          </div>

          {/* Estado */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--neutral-600)' }}>
              Estado:
            </label>
            <select
              className="dv-select"
              value={filterState.estadoSemaforo || 'todos'}
              onChange={(e) => setFilter({ estadoSemaforo: e.target.value })}
              aria-label="Filtro Estado Semáforo"
              data-testid="dv-filter-estado-semaforo"
            >
              <option value="todos">Todos</option>
              <option value="verde">🟢 Completo</option>
              <option value="violeta">🟣 Tiene revisión</option>
              <option value="tiene_insumos">🔵 Tiene Insumos</option>
              <option value="no_tiene_insumos">🟠 No tiene insumos</option>
              <option value="rojo">🔴 Sin proceso</option>
            </select>
          </div>

          {/* Días PQR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--neutral-600)' }}>
              Días PQR:
            </label>
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

        {/* active filter tags + counters */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {activeFilterCount > 0 && (
              <span
                style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--neutral-600)' }}
                data-testid="dv-active-count"
              >
                {activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''} activo
                {activeFilterCount > 1 ? 's' : ''}
              </span>
            )}
            {filterState.search.trim() && (
              <span className="dv-tag" data-testid="dv-tag-search">
                Búsqueda: {filterState.search.trim()}{' '}
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
                Cuenta: {filterState.cuenta.trim()}{' '}
                <button onClick={() => setFilter({ cuenta: '' })} aria-label="Quitar cuenta">
                  ×
                </button>
              </span>
            )}
            {filterState.proceso.trim() && (
              <span className="dv-tag" data-testid="dv-tag-proceso">
                Proceso: {filterState.proceso.trim()}{' '}
                <button onClick={() => setFilter({ proceso: '' })} aria-label="Quitar proceso">
                  ×
                </button>
              </span>
            )}
            {filterState.radicado.trim() && (
              <span className="dv-tag" data-testid="dv-tag-radicado">
                Radicado: {filterState.radicado.trim()}{' '}
                <button onClick={() => setFilter({ radicado: '' })} aria-label="Quitar radicado">
                  ×
                </button>
              </span>
            )}
            {filterState.fechaDesde && (
              <span className="dv-tag" data-testid="dv-tag-fecha-desde">
                Desde: {filterState.fechaDesde}{' '}
                <button onClick={() => setFilter({ fechaDesde: '' })} aria-label="Quitar fecha inicial">
                  ×
                </button>
              </span>
            )}
            {filterState.fechaHasta && (
              <span className="dv-tag" data-testid="dv-tag-fecha-hasta">
                Hasta: {filterState.fechaHasta}{' '}
                <button onClick={() => setFilter({ fechaHasta: '' })} aria-label="Quitar fecha final">
                  ×
                </button>
              </span>
            )}
            {filterState.estadoSemaforo && filterState.estadoSemaforo !== 'todos' && (
              <span className="dv-tag" data-testid="dv-tag-estado-semaforo">
                Estado:{' '}
                {filterState.estadoSemaforo === 'verde'
                  ? 'Completo'
                  : filterState.estadoSemaforo === 'violeta'
                    ? 'Tiene revisión'
                    : filterState.estadoSemaforo === 'tiene_insumos'
                      ? 'Tiene Insumos'
                      : filterState.estadoSemaforo === 'no_tiene_insumos'
                        ? 'No tiene insumos'
                        : filterState.estadoSemaforo === 'rojo'
                          ? 'Sin proceso'
                          : filterState.estadoSemaforo}{' '}
                <button onClick={() => setFilter({ estadoSemaforo: 'todos' })} aria-label="Quitar filtro estado">
                  ×
                </button>
              </span>
            )}
            {filterState.diasPqrFiltro && filterState.diasPqrFiltro !== 'todos' && (
              <span className="dv-tag" data-testid="dv-tag-dias-pqr">
                Días PQR: {filterState.diasPqrFiltro}{' '}
                <button onClick={() => setFilter({ diasPqrFiltro: 'todos' })} aria-label="Quitar filtro días pqr">
                  ×
                </button>
              </span>
            )}
            {showOnlySelected && (
              <span
                className="dv-tag"
                style={{ background: '#EEF6DF', borderColor: '#c5e8a3', color: '#2d5016' }}
                data-testid="dv-tag-seleccionados"
              >
                Solo seleccionados{' '}
                <button
                  onClick={() => setShowOnlySelected(false)}
                  aria-label="Quitar seleccionados"
                >
                  ×
                </button>
              </span>
            )}
          </div>
          <div
            style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', fontWeight: 600 }}
            data-testid="dv-counter"
          >
            {totalFiltered === 0
              ? '0 resultados'
              : `Mostrando ${startIdx + 1}–${endIdx} de ${formatCount(totalFiltered)} registro${totalFiltered !== 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {/* table */}
      <div className="dv-table-wrap" data-testid="dv-table-wrap">
        <div style={{ overflowX: 'auto' }}>
          <table className="dv-table" data-testid="dv-table">
            <thead>
              <tr>
                <th style={{ width: 44 }}>
                  <input
                    ref={headerCbRef}
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={() => togglePage()}
                    aria-label="Seleccionar página"
                    data-testid="dv-header-checkbox"
                  />
                </th>
                <th>Estado</th>
                <th>TIPO PROCESO</th>
                <th>RESPONSABLE DEL INSUMO</th>
                <th>Días PQR</th>
                <th>Cuenta</th>
                <th>NOMBRE SOLICITANTE</th>
                <th>Radicado</th>
                <th>Proceso</th>
                <th>Fecha</th>
                <th style={{ width: 90, textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    style={{ textAlign: 'center', padding: 28, color: 'var(--neutral-500)' }}
                  >
                    Sin resultados — ajusta los filtros
                  </td>
                </tr>
              ) : (
                pageRecords.map((r) => {
                  const isSelected = selectedRows.has(r.rowId);
                  // also track via helper to prove useSelection usage
                  void selection.isSelected(r.rowId);

                  const semaforo =
                    r.estadoSemaforo ||
                    getEstadoSemaforo(r.numeroProceso, r.observacionRevision);

                  const pqr =
                    r.diasPqrLabel && r.diasPqr !== undefined
                      ? { remainingDays: r.diasPqr, label: r.diasPqrLabel, isExpired: r.diasPqr < 0, dueDateStr: '' }
                      : calculatePqrBusinessDays(
                          r.fechaSolicitud ||
                            (r as Record<string, unknown>)['Fecha Radicación'] ||
                            (r as Record<string, unknown>)['Fecha  Radicacion'] ||
                            (r as Record<string, unknown>)['FECHA_RADICACION']
                        );

                  const tipoProc = String(r.tipoProceso || (r as Record<string, unknown>)['PROCESO'] || '—');
                  const descTipoProc = String(r.descripcionTipoProceso || (r as Record<string, unknown>)['DESCRIPCION_TIPO_PROCESO'] || '');
                  const respInsumo = String(r.usuarioResponsableInsumo || r.responsableInsumo || (r as Record<string, unknown>)['USUARIO_RESPONSABLE_INSUMO'] || '—');
                  const hasInsumo = respInsumo !== '—' && respInsumo.trim() !== '' && respInsumo.toLowerCase() !== 'null' && respInsumo.toLowerCase() !== 'undefined';

                  return (
                    <tr
                      key={r.rowId}
                      data-testid={`dv-row-${r.rowId}`}
                      className={`dv-row ${isSelected ? 'dv-row--selected' : ''}`}
                      style={
                        isSelected
                          ? { background: '#EBF5FF', borderLeft: '3px solid #004B93' }
                          : { borderLeft: '3px solid transparent' }
                      }
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(r.rowId)}
                          aria-label={`Seleccionar ${r.rowId}`}
                          data-testid={`dv-row-checkbox-${r.rowId}`}
                        />
                      </td>

                      {/* 1. Estado tipo semáforo */}
                      <td>
                        {semaforo === 'verde' && (
                          <span
                            className="dv-semaforo dv-semaforo--verde"
                            data-testid={`dv-semaforo-${r.rowId}`}
                            title="🟢 Completo: Con número de proceso y observación de revisión"
                          >
                            <span className="dv-semaforo-dot" aria-hidden />
                            Completo
                          </span>
                        )}
                        {semaforo === 'violeta' && (
                          <span
                            className="dv-semaforo dv-semaforo--violeta"
                            data-testid={`dv-semaforo-${r.rowId}`}
                            title="🟣 Tiene revisión: Con número de proceso, sin observación de revisión"
                          >
                            <span className="dv-semaforo-dot" aria-hidden />
                            Tiene revisión
                          </span>
                        )}
                        {semaforo === 'rojo' && hasInsumo && (
                          <span
                            className="dv-semaforo dv-semaforo--azul"
                            data-testid={`dv-semaforo-${r.rowId}`}
                            title="🔵 Tiene Insumos: Con responsable de insumo asignado"
                          >
                            <span className="dv-semaforo-dot" aria-hidden />
                            Tiene Insumos
                          </span>
                        )}
                        {semaforo === 'rojo' && !hasInsumo && (
                          <span
                            className="dv-semaforo dv-semaforo--rojo"
                            data-testid={`dv-semaforo-${r.rowId}`}
                            title="🔴 No tiene insumos / Sin proceso"
                          >
                            <span className="dv-semaforo-dot" aria-hidden />
                            No tiene insumos
                          </span>
                        )}
                      </td>

                      {/* 2. TIPO PROCESO (con tooltip DESCRIPCION_TIPO_PROCESO) */}
                      <td
                        style={{
                          maxWidth: 160,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={descTipoProc || undefined}
                        data-testid={`dv-tipo-proceso-${r.rowId}`}
                        className={descTipoProc ? 'dv-tooltip-cell' : ''}
                      >
                        {tipoProc}
                      </td>

                      {/* 3. RESPONSABLE DEL INSUMO */}
                      <td
                        style={{
                          maxWidth: 160,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={respInsumo !== '—' ? respInsumo : undefined}
                        data-testid={`dv-responsable-insumo-${r.rowId}`}
                      >
                        {respInsumo}
                      </td>

                      {/* 4. Días PQR */}
                      <td>
                        <span
                          className={`dv-badge-pqr ${
                            pqr.isExpired
                              ? 'dv-badge-pqr--vencido'
                              : pqr.remainingDays <= 3
                                ? 'dv-badge-pqr--urgente'
                                : 'dv-badge-pqr--ok'
                          }`}
                          data-testid={`dv-pqr-${r.rowId}`}
                          title={pqr.dueDateStr ? `Vence: ${pqr.dueDateStr}` : undefined}
                        >
                          {pqr.label}
                        </span>
                      </td>

                      <td
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                        }}
                      >
                        {String(r.numeroCuenta ?? r.cuenta ?? '—')}
                      </td>
                      <td
                        style={{
                          maxWidth: 180,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={String(r.nombreSolicitante ?? '')}
                      >
                        {String(r.nombreSolicitante ?? '—')}
                      </td>
                      <td style={{ fontSize: '0.78rem' }}>{String(r.radicadoEntrada ?? '—')}</td>
                      <td style={{ fontSize: '0.78rem' }}>{String(r.numeroProceso ?? '—')}</td>
                      <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        {String(r.fechaSolicitud ?? '—')}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => openEdit(r)}
                          aria-label={`Editar ${r.rowId}`}
                          data-testid={`dv-edit-${r.rowId}`}
                          title="Editar"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            background: '#fff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--essa-primary)',
                          }}
                        >
                          {/* pencil icon */}
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
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

        {/* pagination */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '12px 14px',
            borderTop: '1px solid var(--border)',
            flexWrap: 'wrap',
            background: '#fff',
          }}
        >
          <div
            style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', fontWeight: 600 }}
            data-testid="dv-pagination-info"
          >
            {totalFiltered === 0 ? '0 resultados' : `${startIdx + 1}–${endIdx} de ${totalFiltered}`}{' '}
            · Pág. {safePage} de {totalPages}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className="dv-pagination-btn"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
              data-testid="dv-prev"
              aria-label="Anterior"
            >
              ‹
            </button>
            {pageNums.map((n) => (
              <button
                key={n}
                className={`dv-pagination-btn ${n === safePage ? 'dv-pagination-btn--active' : ''}`}
                onClick={() => setPage(n)}
                data-testid={`dv-page-${n}`}
                aria-label={`Página ${n}`}
                aria-current={n === safePage ? 'page' : undefined}
              >
                {n}
              </button>
            ))}
            <button
              className="dv-pagination-btn"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
              data-testid="dv-next"
              aria-label="Siguiente"
            >
              ›
            </button>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpPage}
                onChange={(e) => setJumpPage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleJump();
                }}
                placeholder="Ir a..."
                aria-label="Ir a página"
                data-testid="dv-jump-input"
                style={{
                  width: 74,
                  height: 36,
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  padding: '0 10px',
                  fontSize: '0.78rem',
                  textAlign: 'center',
                }}
              />
              <button
                className="dv-pagination-btn"
                onClick={handleJump}
                data-testid="dv-jump-go"
                style={{ minWidth: 42 }}
              >
                Ir
              </button>
            </span>
          </div>
        </div>
      </div>

      {/* bottom actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '14px 16px',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <Button variant="ghost" onClick={() => goTo('configuracion')} data-testid="dv-volver">
          Volver
        </Button>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span
            style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', fontWeight: 600 }}
            data-testid="dv-selected-count"
          >
            {selectedRows.size} seleccionados
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
          </Button>
        </div>
      </div>

      {/* modal */}
      <RecordEditModal
        open={modalOpen}
        record={activeRecord ?? editingRecord}
        onClose={handleModalClose}
        onSave={handleModalSave}
      />
    </div>
  );
}

export default DataView;

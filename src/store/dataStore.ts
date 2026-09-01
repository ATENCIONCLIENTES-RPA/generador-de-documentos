import { create } from 'zustand';
import type { Record } from '@/types/record';
import { crossReferenceSacAndMercurio, getEstadoSemaforo } from '@/utils/excelParser';
import { calculatePqrBusinessDays, parseDateOnly } from '@/utils/businessDays';

export interface FilterState {
  search: string;
  cuenta: string;
  proceso: string;
  radicado: string;
  fechaSolicitud: string;
  fechaDesde: string;
  fechaHasta: string;
  medioSolicitud: string; // 'todos' | 'Página Web' | 'Verbal' | 'Escrito' | 'E-Mail' | ...
  procesoCreado: string; // 'todos' | 'Sí' | 'No'
  estadoSemaforo: string; // 'todos' | 'verde' | 'violeta' | 'rojo' | 'tiene_insumos' | 'no_tiene_insumos'
  cantProcesos: string; // 'todos' | 'uno' | 'varios' | ...
  diasPqrFiltro: string; // 'todos' | 'menor5' | 'urgente' | 'vence_hoy' | 'vencido'
}

interface DataStore {
  records: Record[];
  sacRecords: Record[];
  mercurioRecords: Record[];
  selectedRows: Set<string>;
  filterState: FilterState;
  currentPage: number;
  pageSize: number;
  editingRecord: Record | null;

  // setters / helpers
  setRecords: (records: Record[]) => void;
  setSacRecords: (records: Record[]) => void;
  setMercurioRecords: (records: Record[]) => void;
  toggleRow: (id: string) => void;
  togglePage: () => void;
  clearSelection: () => void;
  setFilter: (patch: Partial<FilterState>) => void;
  setPage: (n: number) => void;
  setEditingRecord: (record: Record | null) => void;
  editRecord: (id: string, patch: Partial<Record>) => void;

  // derived helpers
  getFilteredRecords: () => Record[];
  getPaginatedRecords: () => Record[];
  getTotalPages: () => number;
  getTotalFilteredCount: () => number;
}

const defaultFilter: FilterState = {
  search: '',
  cuenta: '',
  proceso: '',
  radicado: '',
  fechaSolicitud: '',
  fechaDesde: '',
  fechaHasta: '',
  medioSolicitud: 'todos',
  procesoCreado: 'todos',
  estadoSemaforo: 'todos',
  cantProcesos: 'todos',
  diasPqrFiltro: 'todos',
};

// NOTE: C2 — DataView local pipeline is canonical for rendering (includes showOnlySelected + SEARCHABLE_FIELDS);
// dataStore.applyFilters is the programmatic source for getFilteredRecords/getPaginatedRecords.
// Keep both in sync when changing filter semantics — same fields, same case/trim logic.
function applyFilters(records: Record[], filter: FilterState): Record[] {
  let out = records;
  const search = filter.search.trim().toLowerCase();
  if (search) {
    out = out.filter((r) => {
      const hay = [
        r.nombreSolicitante,
        r.cedulaSolicitante,
        r.numeroCuenta,
        r.cuenta,
        r.numeroProceso,
        r.radicadoEntrada,
        r.correoSolicitante,
        r.municipioSolicitante,
        r.tipoProceso,
        r.descripcionTipoProceso,
        r.usuarioResponsableInsumo,
        r.responsableInsumo,
        r.observacionProceso,
        r.observacionRevision,
        r.medioSolicitud,
        r.diasPqrLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(search);
    });
  }
  if (filter.cuenta.trim()) {
    const q = filter.cuenta.trim().toLowerCase();
    out = out.filter((r) => {
      const v = String(
        r.numeroCuenta ||
          r.cuenta ||
          (r as globalThis.Record<string, unknown>)['NUMERO_CUENTA'] ||
          (r as globalThis.Record<string, unknown>)['NUMERO CUENTA'] ||
          (r as globalThis.Record<string, unknown>)['CUENTA'] ||
          ''
      ).toLowerCase();
      return v.includes(q);
    });
  }
  if (filter.proceso.trim()) {
    const q = filter.proceso.trim().toLowerCase();
    out = out.filter((r) => {
      const v = String(
        r.numeroProceso ||
          (r as globalThis.Record<string, unknown>)['NUMERO_PROCESO'] ||
          (r as globalThis.Record<string, unknown>)['NUMERO PROCESO'] ||
          (r as globalThis.Record<string, unknown>)['No. Proceso'] ||
          ''
      ).toLowerCase();
      return v.includes(q);
    });
  }
  if (filter.radicado.trim()) {
    const q = filter.radicado.trim().toLowerCase();
    out = out.filter((r) =>
      String(r.radicadoEntrada ?? '')
        .toLowerCase()
        .includes(q)
    );
  }
  if (filter.medioSolicitud && filter.medioSolicitud !== 'todos') {
    const q = filter.medioSolicitud.toLowerCase();
    out = out.filter((r) => {
      const v = String(
        r.medioSolicitud ||
          (r as globalThis.Record<string, unknown>)['MEDIO_SOLICITUD'] ||
          (r as globalThis.Record<string, unknown>)['MEDIO SOLICITUD'] ||
          ''
      )
        .trim()
        .toLowerCase();
      return v === q;
    });
  }
  if (filter.fechaSolicitud.trim()) {
    const q = filter.fechaSolicitud.trim();
    out = out.filter((r) => String(r.fechaSolicitud ?? '').includes(q));
  }

  // Rango de fechas: fechaDesde y fechaHasta
  if (filter.fechaDesde) {
    const dDesde = parseDateOnly(filter.fechaDesde);
    if (dDesde) {
      out = out.filter((r) => {
        const rawDate =
          r.fechaSolicitud ||
          (r as globalThis.Record<string, unknown>)['Fecha Radicación'] ||
          (r as globalThis.Record<string, unknown>)['Fecha  Radicacion'] ||
          (r as globalThis.Record<string, unknown>)['FECHA_RADICACION'];
        const rDate = parseDateOnly(rawDate);
        return rDate ? rDate.getTime() >= dDesde.getTime() : false;
      });
    }
  }

  if (filter.fechaHasta) {
    const dHasta = parseDateOnly(filter.fechaHasta);
    if (dHasta) {
      out = out.filter((r) => {
        const rawDate =
          r.fechaSolicitud ||
          (r as globalThis.Record<string, unknown>)['Fecha Radicación'] ||
          (r as globalThis.Record<string, unknown>)['Fecha  Radicacion'] ||
          (r as globalThis.Record<string, unknown>)['FECHA_RADICACION'];
        const rDate = parseDateOnly(rawDate);
        return rDate ? rDate.getTime() <= dHasta.getTime() : false;
      });
    }
  }

  // Filtro Estado Semáforo ('todos' | 'verde' | 'violeta' | 'rojo' | 'tiene_insumos' | 'no_tiene_insumos')
  if (filter.estadoSemaforo && filter.estadoSemaforo !== 'todos') {
    out = out.filter((r) => {
      const resp = String(
        r.usuarioResponsableInsumo ||
          (r as globalThis.Record<string, unknown>)['USUARIO_RESPONSABLE_INSUMO'] ||
          ''
      ).trim();
      const hasInsumo =
        resp !== '' &&
        resp !== '—' &&
        resp.toLowerCase() !== 'null' &&
        resp.toLowerCase() !== 'undefined';
      const sem = r.estadoSemaforo || getEstadoSemaforo(r.numeroProceso, r.observacionRevision);

      if (filter.estadoSemaforo === 'tiene_insumos') {
        return hasInsumo;
      }
      if (filter.estadoSemaforo === 'no_tiene_insumos') {
        return !hasInsumo;
      }
      return sem === filter.estadoSemaforo;
    });
  }

  // Filtro Días PQR ('todos' | 'menor5' | 'urgente' | 'vence_hoy' | 'vencido')
  if (filter.diasPqrFiltro && filter.diasPqrFiltro !== 'todos') {
    out = out.filter((r) => {
      const pqr =
        r.diasPqr !== undefined
          ? { remainingDays: r.diasPqr }
          : calculatePqrBusinessDays(
              r.fechaSolicitud ||
                (r as globalThis.Record<string, unknown>)['Fecha Radicación'] ||
                (r as globalThis.Record<string, unknown>)['Fecha  Radicacion']
            );
      const rem = pqr.remainingDays;
      if (filter.diasPqrFiltro === 'menor5') return rem < 5;
      if (filter.diasPqrFiltro === 'urgente') return rem <= 3 && rem >= 0;
      if (filter.diasPqrFiltro === 'vence_hoy') return rem === 0;
      if (filter.diasPqrFiltro === 'vencido') return rem < 0;
      return true;
    });
  }

  return out;
}

export const useDataStore = create<DataStore>((set, get) => ({
  records: [],
  sacRecords: [],
  mercurioRecords: [],
  selectedRows: new Set<string>(),
  filterState: { ...defaultFilter },
  currentPage: 1,
  pageSize: 10,
  editingRecord: null,

  setRecords: (records) =>
    set({
      records,
      currentPage: 1,
    }),

  setSacRecords: (sacRecords) =>
    set((s) => {
      let combined: Record[] = [];
      if (s.mercurioRecords.length > 0) {
        combined = crossReferenceSacAndMercurio(s.mercurioRecords, sacRecords);
      } else {
        combined = sacRecords;
      }
      return {
        sacRecords,
        records: combined,
        currentPage: 1,
      };
    }),

  setMercurioRecords: (mercurioRecords) =>
    set((s) => {
      const combined = crossReferenceSacAndMercurio(mercurioRecords, s.sacRecords);
      return {
        mercurioRecords,
        records: combined,
        currentPage: 1,
      };
    }),

  toggleRow: (id) =>
    set((s) => {
      const next = new Set(s.selectedRows);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedRows: next };
    }),

  togglePage: () =>
    set((s) => {
      const filtered = applyFilters(s.records, s.filterState);
      const totalPages = Math.max(1, Math.ceil(filtered.length / s.pageSize));
      const safePage = Math.min(s.currentPage, totalPages);
      const start = (safePage - 1) * s.pageSize;
      const pageRows = filtered.slice(start, start + s.pageSize);
      const ids = pageRows.map((r) => r.rowId);
      const allSelected = ids.length > 0 && ids.every((id) => s.selectedRows.has(id));
      const next = new Set(s.selectedRows);
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return { selectedRows: next };
    }),

  clearSelection: () => set({ selectedRows: new Set<string>() }),

  setFilter: (patch) =>
    set((s) => ({
      filterState: { ...s.filterState, ...patch },
      currentPage: 1,
    })),

  setPage: (n) =>
    set((s) => {
      const filtered = applyFilters(s.records, s.filterState);
      const totalPages = Math.max(1, Math.ceil(filtered.length / s.pageSize));
      const clamped = Math.max(1, Math.min(n, totalPages));
      return { currentPage: clamped };
    }),

  setEditingRecord: (record) => set({ editingRecord: record }),

  editRecord: (id, patch) =>
    set((s) => {
      const idx = s.records.findIndex((r) => r.rowId === id);
      if (idx === -1) return {};
      const base = s.records[idx]!;
      const updated = { ...base, ...patch } as Record;
      // Recalculate semáforo if numeroProceso or observacionRevision updated
      updated.estadoSemaforo = getEstadoSemaforo(
        updated.numeroProceso,
        updated.observacionRevision
      );
      if (patch.observacionProceso !== undefined) {
        (updated as globalThis.Record<string, unknown>)['OBSERVACION_PROCESO'] =
          patch.observacionProceso;
      }
      if (patch.observacionRevision !== undefined) {
        (updated as globalThis.Record<string, unknown>)['OBSERVACION_REVISION'] =
          patch.observacionRevision;
      }

      const nextRecords = [...s.records];
      nextRecords[idx] = updated;
      const editingRecord =
        s.editingRecord && s.editingRecord.rowId === id ? updated : s.editingRecord;
      return { records: nextRecords, editingRecord };
    }),

  getFilteredRecords: () => {
    const { records, filterState } = get();
    return applyFilters(records, filterState);
  },

  getPaginatedRecords: () => {
    const { filterState, records, currentPage, pageSize } = get();
    const filtered = applyFilters(records, filterState);
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  },

  getTotalPages: () => {
    const { records, filterState, pageSize } = get();
    const filtered = applyFilters(records, filterState);
    return Math.max(1, Math.ceil(filtered.length / pageSize));
  },

  getTotalFilteredCount: () => {
    const { records, filterState } = get();
    return applyFilters(records, filterState).length;
  },
}));

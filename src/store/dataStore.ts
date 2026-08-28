import { create } from 'zustand';
import type { Record } from '@/types/record';

export interface FilterState {
  search: string;
  cuenta: string;
  proceso: string;
  radicado: string;
  fechaSolicitud: string;
}

interface DataStore {
  records: Record[];
  selectedRows: Set<string>;
  filterState: FilterState;
  currentPage: number;
  pageSize: number;
  editingRecord: Record | null;

  // setters / helpers
  setRecords: (records: Record[]) => void;
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
      const v = String(r.numeroCuenta ?? r.cuenta ?? '').toLowerCase();
      return v.includes(q);
    });
  }
  if (filter.proceso.trim()) {
    const q = filter.proceso.trim().toLowerCase();
    out = out.filter((r) => String(r.numeroProceso ?? '').toLowerCase().includes(q));
  }
  if (filter.radicado.trim()) {
    const q = filter.radicado.trim().toLowerCase();
    out = out.filter((r) => String(r.radicadoEntrada ?? '').toLowerCase().includes(q));
  }
  if (filter.fechaSolicitud.trim()) {
    const q = filter.fechaSolicitud.trim();
    out = out.filter((r) => String(r.fechaSolicitud ?? '').includes(q));
  }
  return out;
}

export const useDataStore = create<DataStore>((set, get) => ({
  records: [],
  selectedRows: new Set<string>(),
  filterState: { ...defaultFilter },
  currentPage: 1,
  pageSize: 10,
  editingRecord: null,

  setRecords: (records) =>
    set({
      records,
      currentPage: 1,
      // keep selectedRows as is (persistence across reloads if needed)
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
      const updated = { ...s.records[idx], ...patch } as Record;
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

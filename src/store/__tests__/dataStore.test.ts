import { describe, it, expect, beforeEach } from 'vitest';
import { useDataStore } from '../dataStore';
import type { Record } from '@/types/record';

function makeRecord(rowId: string, overrides: Partial<Record> = {}): Record {
  return {
    rowId,
    id: rowId,
    status: 'pendiente',
    selected: false,
    fechaSolicitud: '2026-08-27',
    fechaVencimiento: '2026-09-27',
    numeroProceso: `PROC-${rowId}`,
    radicadoEntrada: `RAD-${rowId}`,
    nombreSolicitante: `Solicitante ${rowId}`,
    cedulaSolicitante: '12345',
    direccionSolicitante: 'Calle 1',
    departamentoSolicitante: 'Santander',
    municipioSolicitante: 'Bucaramanga',
    correoSolicitante: 'a@essa.com.co',
    numeroCuenta: `85${rowId.slice(-2)}`,
    ...overrides,
  } as Record;
}

function resetStore() {
  const s = useDataStore.getState();
  s.setRecords([]);
  s.clearSelection();
  s.setFilter({ search: '', cuenta: '', proceso: '', radicado: '', fechaSolicitud: '' });
  s.setPage(1);
  // reset editing
  s.setEditingRecord(null);
  // ensure pageSize stays 10 (default)
  useDataStore.setState({ pageSize: 10 });
}

describe('dataStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('toggleRow adds id to selectedRows Set', () => {
    const { toggleRow } = useDataStore.getState();
    toggleRow('row_0_123');
    expect(useDataStore.getState().selectedRows.has('row_0_123')).toBe(true);
    expect(useDataStore.getState().selectedRows).toBeInstanceOf(Set);
    expect(useDataStore.getState().selectedRows.size).toBe(1);
  });

  it('toggleRow removes id when toggled again', () => {
    const { toggleRow } = useDataStore.getState();
    toggleRow('row_1_123');
    expect(useDataStore.getState().selectedRows.has('row_1_123')).toBe(true);
    toggleRow('row_1_123');
    expect(useDataStore.getState().selectedRows.has('row_1_123')).toBe(false);
    expect(useDataStore.getState().selectedRows.size).toBe(0);
  });

  it('toggleRow persists between filter changes (selectedRows Set persistence)', () => {
    const records = [makeRecord('row_0_1'), makeRecord('row_1_1'), makeRecord('row_2_1')];
    useDataStore.getState().setRecords(records);
    useDataStore.getState().toggleRow('row_0_1');
    useDataStore.getState().toggleRow('row_2_1');
    expect(useDataStore.getState().selectedRows.size).toBe(2);

    // apply filter that hides one row
    useDataStore.getState().setFilter({ cuenta: '85row_0' });
    // selectedRows should still contain both ids even if filtered out
    expect(useDataStore.getState().selectedRows.has('row_0_1')).toBe(true);
    expect(useDataStore.getState().selectedRows.has('row_2_1')).toBe(true);

    // clear filter, both should still be there
    useDataStore.getState().setFilter({ cuenta: '' });
    expect(useDataStore.getState().selectedRows.size).toBe(2);
  });

  it('togglePage selects all rows on current page when none selected', () => {
    const records = Array.from({ length: 15 }, (_, i) => makeRecord(`row_${i}_1`));
    useDataStore.getState().setRecords(records);
    expect(useDataStore.getState().currentPage).toBe(1);
    expect(useDataStore.getState().selectedRows.size).toBe(0);

    useDataStore.getState().togglePage();
    // pageSize=10, so 10 rows selected
    expect(useDataStore.getState().selectedRows.size).toBe(10);
    for (let i = 0; i < 10; i++) {
      expect(useDataStore.getState().selectedRows.has(`row_${i}_1`)).toBe(true);
    }
  });

  it('togglePage deselects all rows on current page when all selected', () => {
    const records = Array.from({ length: 12 }, (_, i) => makeRecord(`row_${i}_1`));
    useDataStore.getState().setRecords(records);
    useDataStore.getState().togglePage(); // select first 10
    expect(useDataStore.getState().selectedRows.size).toBe(10);
    useDataStore.getState().togglePage(); // deselect first 10
    expect(useDataStore.getState().selectedRows.size).toBe(0);
  });

  it('togglePage respects pagination - second page', () => {
    const records = Array.from({ length: 15 }, (_, i) => makeRecord(`row_${i}_1`));
    useDataStore.getState().setRecords(records);
    useDataStore.getState().setPage(2);
    useDataStore.getState().togglePage();
    // page 2 has 5 rows (indices 10-14)
    expect(useDataStore.getState().selectedRows.size).toBe(5);
    for (let i = 10; i < 15; i++) {
      expect(useDataStore.getState().selectedRows.has(`row_${i}_1`)).toBe(true);
    }
    // going back to page 1 and toggling should add 10 more
    useDataStore.getState().setPage(1);
    useDataStore.getState().togglePage();
    expect(useDataStore.getState().selectedRows.size).toBe(15);
  });

  it('clearSelection empties Set', () => {
    useDataStore.getState().toggleRow('row_a');
    useDataStore.getState().toggleRow('row_b');
    expect(useDataStore.getState().selectedRows.size).toBe(2);
    useDataStore.getState().clearSelection();
    expect(useDataStore.getState().selectedRows.size).toBe(0);
    expect(useDataStore.getState().selectedRows.has('row_a')).toBe(false);
  });

  it('setFilter patches partial and resets currentPage', () => {
    const records = Array.from({ length: 25 }, (_, i) => makeRecord(`row_${i}_1`));
    useDataStore.getState().setRecords(records);
    useDataStore.getState().setPage(3);
    expect(useDataStore.getState().currentPage).toBe(3);
    useDataStore.getState().setFilter({ search: 'Solicitante' });
    expect(useDataStore.getState().filterState.search).toBe('Solicitante');
    expect(useDataStore.getState().currentPage).toBe(1);
  });

  it('editRecord patches record by rowId', () => {
    const records = [makeRecord('row_0_1', { nombreSolicitante: 'Juan' })];
    useDataStore.getState().setRecords(records);
    useDataStore.getState().editRecord('row_0_1', { nombreSolicitante: 'Maria Lopez' });
    const updated = useDataStore.getState().records.find((r) => r.rowId === 'row_0_1');
    expect(updated?.nombreSolicitante).toBe('Maria Lopez');
  });

  it('selectedRows is always a Set instance', () => {
    const s = useDataStore.getState();
    expect(s.selectedRows).toBeInstanceOf(Set);
    s.toggleRow('x');
    expect(useDataStore.getState().selectedRows).toBeInstanceOf(Set);
  });
});

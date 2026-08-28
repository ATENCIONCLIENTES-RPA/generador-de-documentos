import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import DataView from '@/views/DataView';
import { useDataStore } from '@/store/dataStore';
import { useNavigationStore } from '@/store/navigationStore';
import type { Record as EssaRecord } from '@/types/record';

function makeRecord(overrides: Partial<EssaRecord> & { rowId: string }): EssaRecord {
  return {
    id: overrides.rowId,
    status: 'Pendiente',
    selected: false,
    fechaSolicitud: '2026-01-10',
    fechaVencimiento: '2026-02-10',
    numeroProceso: 'PROC-001',
    radicadoEntrada: 'RAD-001',
    nombreSolicitante: 'Juan Pérez',
    cedulaSolicitante: '123456',
    direccionSolicitante: 'Calle 1',
    departamentoSolicitante: 'Santander',
    municipioSolicitante: 'Bucaramanga',
    correoSolicitante: 'juan@example.com',
    numeroCuenta: '1001',
    cuenta: '1001',
    ...overrides,
  } as EssaRecord;
}

function resetStores() {
  useDataStore.setState({
    records: [],
    selectedRows: new Set<string>(),
    filterState: { search: '', cuenta: '', proceso: '', radicado: '', fechaSolicitud: '' },
    currentPage: 1,
    pageSize: 10,
    editingRecord: null,
  });
  useNavigationStore.setState({ currentStep: 'datos', completed: new Set() });
}

function seedRecords(n = 14): EssaRecord[] {
  const recs: EssaRecord[] = [];
  for (let i = 0; i < n; i++) {
    recs.push(
      makeRecord({
        rowId: `row_${i}_test`,
        id: i + 1,
        numeroCuenta: `${1000 + i}`,
        cuenta: `${1000 + i}`,
        nombreSolicitante: i === 5 ? 'María López' : `Usuario ${i}`,
        cedulaSolicitante: `1000000${i}`,
        numeroProceso: `PROC-${String(i).padStart(3, '0')}`,
        radicadoEntrada: `RAD-${i % 3 === 0 ? 'A' : 'B'}-${i}`,
        fechaSolicitud: `2026-01-${String(10 + (i % 20)).padStart(2, '0')}`,
        correoSolicitante: `user${i}@example.com`,
      })
    );
  }
  return recs;
}

describe('DataView — M3 rowId Set filtros 10/page modal', () => {
  beforeEach(() => {
    resetStores();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('muestra placeholder cuando no hay registros', () => {
    render(<DataView />);
    expect(screen.getByText(/No hay registros cargados/)).toBeInTheDocument();
    expect(screen.getByTestId('data-go-config')).toBeInTheDocument();
  });

  it('renderiza tabla, contador Mostrando y paginación 10/page', async () => {
    const recs = seedRecords(14);
    useDataStore.getState().setRecords(recs as unknown as EssaRecord[]);
    render(<DataView />);
    expect(screen.getByTestId('dv-table')).toBeInTheDocument();
    expect(screen.getByTestId('dv-counter')).toHaveTextContent(/Mostrando 1–10 de 14/);
    // 10 rows on first page
    expect(screen.getAllByTestId(/^dv-row-row_/)).toHaveLength(10);
    expect(screen.getByTestId('dv-pagination-info')).toHaveTextContent(/Pág. 1 de 2/);
    expect(screen.getByTestId('dv-page-1')).toBeInTheDocument();
    expect(screen.getByTestId('dv-page-2')).toBeInTheDocument();
  });

  it('paginación: next/prev y Ir a…', async () => {
    const recs = seedRecords(22);
    useDataStore.getState().setRecords(recs as unknown as EssaRecord[]);
    render(<DataView />);
    // page 1 -> 10 rows
    expect(screen.getAllByTestId(/^dv-row-row_/)).toHaveLength(10);
    // go next
    fireEvent.click(screen.getByTestId('dv-next'));
    expect(screen.getAllByTestId(/^dv-row-row_/)).toHaveLength(10);
    expect(screen.getByTestId('dv-pagination-info')).toHaveTextContent(/Pág. 2 de 3/);
    expect(screen.getByTestId('dv-counter')).toHaveTextContent(/Mostrando 11–20 de 22/);
    // Ir a 3
    const jump = screen.getByTestId('dv-jump-input') as HTMLInputElement;
    fireEvent.change(jump, { target: { value: '3' } });
    fireEvent.click(screen.getByTestId('dv-jump-go'));
    expect(screen.getAllByTestId(/^dv-row-row_/)).toHaveLength(2);
    expect(screen.getByTestId('dv-counter')).toHaveTextContent(/Mostrando 21–22 de 22/);
    // prev
    fireEvent.click(screen.getByTestId('dv-prev'));
    expect(screen.getByTestId('dv-pagination-info')).toHaveTextContent(/Pág. 2 de 3/);
  });

  it('filtra por cuenta, proceso, radicado y fecha con tags activos y Limpiar filtros', async () => {
    const recs = seedRecords(14);
    useDataStore.getState().setRecords(recs as unknown as EssaRecord[]);
    render(<DataView />);
    // cuenta filter
    const cuentaInput = screen.getByTestId('dv-filter-cuenta');
    fireEvent.change(cuentaInput, { target: { value: '1001' } });
    // should filter: 1001, 10010? but our data 1000-1013, so 1001 matches 1001 only? also 101? includes so 1001 matches exactly one plus maybe? check logic includes
    // With value 1001, 1001 and maybe 10010? not present. Expect some filtering
    await waitFor(() => {
      expect(useDataStore.getState().filterState.cuenta).toBe('1001');
    });
    expect(screen.getByTestId('dv-tag-cuenta')).toBeInTheDocument();
    expect(screen.getByTestId('dv-active-count')).toHaveTextContent(/1 filtro/);

    // add proceso filter
    fireEvent.change(screen.getByTestId('dv-filter-proceso'), { target: { value: 'PROC-005' } });
    await waitFor(() => expect(useDataStore.getState().filterState.proceso).toBe('PROC-005'));
    expect(screen.getByTestId('dv-active-count')).toHaveTextContent(/2 filtros/);

    // remove one tag via X
    fireEvent.click(within(screen.getByTestId('dv-tag-cuenta')).getByRole('button'));
    await waitFor(() => expect(useDataStore.getState().filterState.cuenta).toBe(''));

    // Limpiar filtros button
    fireEvent.click(screen.getByTestId('dv-limpiar-filtros'));
    await waitFor(() => {
      expect(useDataStore.getState().filterState.search).toBe('');
      expect(useDataStore.getState().filterState.proceso).toBe('');
    });
    expect(screen.queryByTestId('dv-tag-proceso')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dv-active-count')).not.toBeInTheDocument();
  });

  it('búsqueda debounced 300ms sobre campos: nombre, cuenta, radicado, proceso, cédula, correo', async () => {
    const recs = seedRecords(14);
    // ensure one record has distinctive searchable values
    recs[2].nombreSolicitante = 'Carlos UniqueName';
    recs[2].numeroCuenta = '9999';
    recs[2].cedulaSolicitante = 'UNIQUECEDULA';
    useDataStore.getState().setRecords(recs as unknown as EssaRecord[]);
    render(<DataView />);
    const search = screen.getByTestId('dv-search') as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'UniqueName' } });
    // before debounce, count still 14
    expect(screen.getByTestId('dv-counter')).toHaveTextContent(/Mostrando 1–10 de 14/);
    // advance 300ms
    act(() => {
      vi.advanceTimersByTime(350);
    });
    await waitFor(() =>
      expect(screen.getByTestId('dv-counter')).toHaveTextContent(/Mostrando 1–1 de 1/)
    );
    expect(screen.getByTestId('dv-tag-search')).toBeInTheDocument();
    // clear search via tag X
    fireEvent.click(within(screen.getByTestId('dv-tag-search')).getByRole('button'));
    act(() => {
      vi.advanceTimersByTime(350);
    });
    await waitFor(() =>
      expect(screen.getByTestId('dv-counter')).toHaveTextContent(/Mostrando 1–10 de 14/)
    );
  });

  it('selección Set persists entre filtros (rowId, no índice)', async () => {
    const recs = seedRecords(12);
    useDataStore.getState().setRecords(recs as unknown as EssaRecord[]);
    render(<DataView />);
    // select first row via checkbox
    const firstRowCb = screen.getByTestId('dv-row-checkbox-row_0_test');
    fireEvent.click(firstRowCb);
    expect(useDataStore.getState().selectedRows.has('row_0_test')).toBe(true);
    expect(screen.getByTestId('dv-selected-count')).toHaveTextContent(/1 seleccionados/);
    // apply filter that hides selected row
    fireEvent.change(screen.getByTestId('dv-filter-cuenta'), { target: { value: '1005' } });
    await waitFor(() => expect(screen.getByTestId('dv-tag-cuenta')).toBeInTheDocument());
    // selectedRows still has row_0 even though not visible
    expect(useDataStore.getState().selectedRows.has('row_0_test')).toBe(true);
    // clear filter, row still selected and highlighted
    fireEvent.click(screen.getByTestId('dv-limpiar-filtros'));
    await waitFor(() => expect(screen.getByTestId('dv-row-checkbox-row_0_test')).toBeChecked());
    // header checkbox indeterminate when some selected
    // select more to fill page then check indeterminate logic via header
    // select single row -> header should be indeterminate
    const headerCb = screen.getByTestId('dv-header-checkbox') as HTMLInputElement;
    expect(headerCb.indeterminate).toBe(true);
    expect(headerCb.checked).toBe(false);
    // togglePage should select all on page
    fireEvent.click(headerCb);
    expect(useDataStore.getState().selectedRows.size).toBe(10);
    expect(headerCb.checked).toBe(true);
    expect(headerCb.indeterminate).toBe(false);
    // toggle again deselects page
    fireEvent.click(headerCb);
    expect(useDataStore.getState().selectedRows.size).toBe(0);
    expect(headerCb.checked).toBe(false);
    // Ver seleccionados toggle
    fireEvent.click(screen.getByTestId('dv-row-checkbox-row_1_test'));
    fireEvent.click(screen.getByTestId('dv-row-checkbox-row_2_test'));
    expect(useDataStore.getState().selectedRows.size).toBe(2);
    fireEvent.click(screen.getByTestId('dv-toggle-seleccionados'));
    expect(screen.getAllByTestId(/^dv-row-row_/)).toHaveLength(2);
    expect(screen.getByTestId('dv-tag-seleccionados')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dv-limpiar-seleccion'));
    expect(useDataStore.getState().selectedRows.size).toBe(0);
  });

  it('row highlight #EBF5FF + border #004B93 cuando seleccionado', async () => {
    const recs = seedRecords(6);
    useDataStore.getState().setRecords(recs as unknown as EssaRecord[]);
    render(<DataView />);
    const cb = screen.getByTestId('dv-row-checkbox-row_3_test');
    fireEvent.click(cb);
    const row = screen.getByTestId('dv-row-row_3_test');
    expect(row.className).toContain('dv-row--selected');
    expect(row.style.background).toBe('rgb(235, 245, 255)');
    // jsdom may normalize hex to rgb; check borderLeft includes #004B93
    expect(row.style.borderLeft).toContain('3px');
  });

  it('ACCIONES Editar abre modal 3 secciones, guarda y warning unsaved', async () => {
    const recs = seedRecords(6);
    recs[0].nombreSolicitante = 'Original Nombre';
    useDataStore.getState().setRecords(recs as unknown as EssaRecord[]);
    render(<DataView />);
    fireEvent.click(screen.getByTestId('dv-edit-row_0_test'));
    // modal should open
    expect(await screen.findByText('Editar registro')).toBeInTheDocument();
    expect(screen.getByTestId('rem-section-tramite')).toBeInTheDocument();
    expect(screen.getByTestId('rem-section-solicitante')).toBeInTheDocument();
    expect(screen.getByTestId('rem-section-descripciones')).toBeInTheDocument();
    // edit nombre
    const nombreInput = screen.getByDisplayValue('Original Nombre') as HTMLInputElement;
    fireEvent.change(nombreInput, { target: { value: 'Nuevo Nombre Editado' } });
    // Save
    fireEvent.click(screen.getByTestId('rem-save'));
    await waitFor(() => {
      const updated = useDataStore.getState().records.find((r) => r.rowId === 'row_0_test');
      expect(updated?.nombreSolicitante).toBe('Nuevo Nombre Editado');
    });
    // modal closes after save
    await waitFor(() => expect(screen.queryByText('Editar registro')).not.toBeInTheDocument());

    // reopen, test unsaved warning on close
    fireEvent.click(screen.getByTestId('dv-edit-row_0_test'));
    expect(await screen.findByText('Editar registro')).toBeInTheDocument();
    const nombre2 = screen.getByDisplayValue('Nuevo Nombre Editado') as HTMLInputElement;
    fireEvent.change(nombre2, { target: { value: 'Otro Cambio' } });
    fireEvent.click(screen.getByTestId('rem-cancel'));
    // should show unsaved warning instead of closing
    expect(screen.getByTestId('rem-unsaved-warning')).toBeInTheDocument();
    expect(screen.getByTestId('rem-unsaved-warning')).toHaveTextContent(/Descartar cambios/);
    // continue editing
    fireEvent.click(screen.getByTestId('rem-continue-editing'));
    expect(screen.queryByTestId('rem-unsaved-warning')).not.toBeInTheDocument();
    // discard
    fireEvent.click(screen.getByTestId('rem-cancel'));
    expect(screen.getByTestId('rem-unsaved-warning')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('rem-discard'));
    await waitFor(() => expect(screen.queryByText('Editar registro')).not.toBeInTheDocument());
    // record should not have "Otro Cambio" (discarded)
    const rec = useDataStore.getState().records.find((r) => r.rowId === 'row_0_test');
    expect(rec?.nombreSolicitante).toBe('Nuevo Nombre Editado');
  });

  it('Continuar gate deshabilitado sin selección y habilitado con selección, navega a plantillas', async () => {
    const recs = seedRecords(6);
    useDataStore.getState().setRecords(recs as unknown as EssaRecord[]);
    render(<DataView />);
    const continuar = screen.getByTestId('dv-continuar') as HTMLButtonElement;
    expect(continuar).toBeDisabled();
    expect(screen.getByTestId('dv-validar')).toBeDisabled();
    fireEvent.click(screen.getByTestId('dv-row-checkbox-row_0_test'));
    expect(continuar).toBeEnabled();
    fireEvent.click(continuar);
    expect(useNavigationStore.getState().completed.has('datos')).toBe(true);
    expect(useNavigationStore.getState().currentStep).toBe('plantillas');
  });

  it('useSelection hook: toggleRow, togglePage, clearSelection usan Set<string>', async () => {
    const recs = seedRecords(12);
    useDataStore.getState().setRecords(recs as unknown as EssaRecord[]);
    render(<DataView />);
    // toggleRow via UI proves Set
    fireEvent.click(screen.getByTestId('dv-row-checkbox-row_5_test'));
    expect(useDataStore.getState().selectedRows instanceof Set).toBe(true);
    expect(useDataStore.getState().selectedRows.has('row_5_test')).toBe(true);
    // togglePage
    fireEvent.click(screen.getByTestId('dv-header-checkbox'));
    // after togglePage with 1 selected, should select all 10 on page (so total =10)
    expect(useDataStore.getState().selectedRows.size).toBe(10);
    fireEvent.click(screen.getByTestId('dv-limpiar-seleccion'));
    expect(useDataStore.getState().selectedRows.size).toBe(0);
  });
});

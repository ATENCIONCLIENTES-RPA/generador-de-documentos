import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import DataView, { buildReferencia } from '@/views/DataView';
import { useDataStore } from '@/store/dataStore';
import { useExcelStore } from '@/store/excelStore';
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
    mercurioRecords: [
      {
        rowId: 'merc_0',
        id: 1,
        radicadoEntrada: 'RAD-M',
        fechaSolicitud: '2026-01-10',
      } as EssaRecord,
    ],
    selectedRows: new Set<string>(),
    filterState: {
      search: '',
      cuenta: '',
      proceso: '',
      radicado: '',
      fechaSolicitud: '',
      fechaDesde: '',
      fechaHasta: '',
      procesoCreado: 'todos',
      estadoSemaforo: 'todos',
      cantProcesos: 'todos',
      diasPqrFiltro: 'todos',
    },
    currentPage: 1,
    pageSize: 10,
    editingRecord: null,
  });
  useExcelStore.setState({
    mercurioFile: {
      file: new File(['a'], 'mercurio.xlsx'),
      loading: false,
      progress: 100,
      error: null,
      recordCount: 1,
    },
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

  it('genera Referencia con encabezados equivalentes del registro importado', () => {
    const record = makeRecord({
      rowId: 'row_reference_headers',
      nombreSolicitante: '',
      direccionSolicitante: '',
      departamentoSolicitante: '',
      municipioSolicitante: '',
      correoSolicitante: '',
      celularSolicitante: '',
      numeroCuenta: '',
      cuenta: '',
      numeroProceso: '',
      radicadoEntrada: '',
      fechaSolicitud: '',
      'Nombre Solicitante': 'Ana Gómez',
      'DIRECCION-SOLICITANTE': 'Carrera 10 # 20-30',
      'Municipio Solicitante': 'Bucaramanga',
      'DEPTO SOLICITANTE': 'Santander',
      'Correo Solicitante': 'ANA@EXAMPLE.COM',
      'Numero Cuenta': '12345',
      'Numero Proceso': 'PROC-99',
      'Radicado Entrada': 'RAD-99',
      'Fecha Solicitud': '2026-08-17',
    });

    expect(buildReferencia(record)).toContain('Ana Gómez');
    expect(buildReferencia(record)).toContain('Carrera 10 # 20-30');
    expect(buildReferencia(record)).toContain('ana@example.com');
    expect(buildReferencia(record)).toContain('Cuenta No. 12345');
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

  it('filtra por búsqueda general y estado con tags activos y Limpiar filtros', async () => {
    const recs = seedRecords(6);
    recs[0].estadoSemaforo = 'verde';
    recs[1].estadoSemaforo = 'verde';
    recs[2].estadoSemaforo = 'rojo';
    recs[3].estadoSemaforo = 'verde';
    recs[4].estadoSemaforo = 'violeta';
    useDataStore.getState().setRecords(recs as unknown as EssaRecord[]);
    render(<DataView />);
    // búsqueda general: 'Usuario' coincide con Usuario 0-4 (María López es el índice 5)
    const search = screen.getByTestId('dv-search') as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'Usuario' } });
    act(() => {
      vi.advanceTimersByTime(350);
    });
    await waitFor(() => {
      expect(useDataStore.getState().filterState.search).toBe('Usuario');
    });
    expect(screen.getByTestId('dv-tag-search')).toBeInTheDocument();
    expect(screen.getByText('1 filtro')).toBeInTheDocument();

    // añadir filtro estado = rojo -> solo Usuario 2
    fireEvent.change(screen.getByTestId('dv-filter-estado-semaforo'), {
      target: { value: 'rojo' },
    });
    await waitFor(() => expect(useDataStore.getState().filterState.estadoSemaforo).toBe('rojo'));
    expect(screen.getByText('2 filtros')).toBeInTheDocument();
    expect(screen.getByTestId('dv-counter')).toHaveTextContent(/Mostrando 1–1 de 1/);

    // quitar tag de estado vía X
    fireEvent.click(within(screen.getByTestId('dv-tag-estado-semaforo')).getByRole('button'));
    await waitFor(() => expect(useDataStore.getState().filterState.estadoSemaforo).toBe('todos'));

    // Limpiar filtros button
    fireEvent.click(screen.getByTestId('dv-limpiar-filtros'));
    await waitFor(() => {
      expect(useDataStore.getState().filterState.search).toBe('');
      expect(useDataStore.getState().filterState.estadoSemaforo).toBe('todos');
    });
    expect(screen.queryByTestId('dv-tag-search')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dv-tag-estado-semaforo')).not.toBeInTheDocument();
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

  it('selección única: solo un registro a la vez, persiste entre filtros (rowId)', async () => {
    const recs = seedRecords(12);
    useDataStore.getState().setRecords(recs as unknown as EssaRecord[]);
    render(<DataView />);
    // select first row via radio
    const firstRowCb = screen.getByTestId('dv-row-checkbox-row_0_test');
    fireEvent.click(firstRowCb);
    expect(useDataStore.getState().selectedRows.has('row_0_test')).toBe(true);
    expect(useDataStore.getState().selectedRows.size).toBe(1);
    expect(screen.getByTestId('dv-selected-count')).toHaveTextContent(/1 registro seleccionado/);
    // selecting another row replaces the previous one (single selection)
    const secondRowCb = screen.getByTestId('dv-row-checkbox-row_1_test');
    fireEvent.click(secondRowCb);
    expect(useDataStore.getState().selectedRows.size).toBe(1);
    expect(useDataStore.getState().selectedRows.has('row_1_test')).toBe(true);
    expect(useDataStore.getState().selectedRows.has('row_0_test')).toBe(false);
    // los radios nativos no se desmarcan al re-clic: la selección se mantiene
    fireEvent.click(secondRowCb);
    expect(useDataStore.getState().selectedRows.size).toBe(1);
    expect(useDataStore.getState().selectedRows.has('row_1_test')).toBe(true);
    // limpiar y re-seleccionar para verificar persistencia entre filtros
    fireEvent.click(screen.getByTestId('dv-limpiar-seleccion'));
    expect(useDataStore.getState().selectedRows.size).toBe(0);
    fireEvent.click(screen.getByTestId('dv-row-checkbox-row_0_test'));
    expect(useDataStore.getState().selectedRows.has('row_0_test')).toBe(true);
    // apply filter that hides selected row (búsqueda general con debounce)
    const search = screen.getByTestId('dv-search') as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'María López' } });
    act(() => {
      vi.advanceTimersByTime(350);
    });
    await waitFor(() => expect(screen.getByTestId('dv-tag-search')).toBeInTheDocument());
    // selectedRows still has row_0 even though not visible
    expect(useDataStore.getState().selectedRows.has('row_0_test')).toBe(true);
    // clear filter, row still selected and highlighted
    fireEvent.click(screen.getByTestId('dv-limpiar-filtros'));
    await waitFor(() => expect(screen.getByTestId('dv-row-checkbox-row_0_test')).toBeChecked());
    // header shows single-selection label (no select-all checkbox)
    expect(screen.getByTestId('dv-header-single-label')).toBeInTheDocument();
    expect(screen.queryByTestId('dv-header-checkbox')).not.toBeInTheDocument();
    // Ver seleccionados toggle shows only the single selected row
    fireEvent.click(screen.getByTestId('dv-toggle-seleccionados'));
    expect(screen.getAllByTestId(/^dv-row-row_/)).toHaveLength(1);
    expect(screen.getByTestId('dv-tag-seleccionados')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dv-limpiar-seleccion'));
    expect(useDataStore.getState().selectedRows.size).toBe(0);
  });

  it('al cargar registros ninguno viene seleccionado por defecto', async () => {
    const recs = seedRecords(6);
    useDataStore.getState().setRecords(recs as unknown as EssaRecord[]);
    render(<DataView />);
    // ningún radio marcado, continuar deshabilitado y etiqueta de vacío
    const radios = screen.queryAllByTestId(/^dv-row-checkbox-row_/);
    expect(radios.length).toBeGreaterThan(0);
    for (const el of radios) {
      expect((el as HTMLInputElement).checked).toBe(false);
      // ningún script debe marcarlos como indeterminados (el CSS :indeterminate
      // los pintaría como seleccionados al compartir `name` sin selección)
      expect((el as HTMLInputElement).indeterminate).toBe(false);
    }
    expect(screen.getByTestId('dv-continuar')).toBeDisabled();
    expect(screen.getByTestId('dv-selected-count')).toHaveTextContent(
      /Ningún registro seleccionado/
    );
    expect(screen.queryByTestId('dv-row-row_0_test')).not.toHaveClass('dv-tr--selected');
  });

  it('row highlight #EBF5FF + border #004B93 cuando seleccionado', async () => {
    const recs = seedRecords(6);
    useDataStore.getState().setRecords(recs as unknown as EssaRecord[]);
    render(<DataView />);
    const cb = screen.getByTestId('dv-row-checkbox-row_3_test');
    fireEvent.click(cb);
    const row = screen.getByTestId('dv-row-row_3_test');
    expect(row.className).toContain('dv-tr--selected');
    // CSS handles background via class; jsdom won't compute it but we verify class is present
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

  it('Continuar gate deshabilitado sin selección y habilitado con selección, navega a generación', async () => {
    const recs = seedRecords(6);
    useDataStore.getState().setRecords(recs as unknown as EssaRecord[]);
    render(<DataView />);
    const continuar = screen.getByTestId('dv-continuar') as HTMLButtonElement;
    expect(continuar).toBeDisabled();
    expect(screen.queryByTestId('dv-validar')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dv-row-checkbox-row_0_test'));
    expect(continuar).toBeEnabled();
    fireEvent.click(continuar);
    expect(useNavigationStore.getState().completed.has('datos')).toBe(true);
    expect(useNavigationStore.getState().currentStep).toBe('generacion');
  });

  it('filtra registros por Estado y combinable con búsqueda general', async () => {
    const recs = [
      makeRecord({
        rowId: 'row_1',
        nombreSolicitante: 'Ana Torres',
        estadoSemaforo: 'verde',
        numeroProceso: 'PROC-1',
        cantidadProcesos: 1,
      }),
      makeRecord({
        rowId: 'row_2',
        nombreSolicitante: 'Luis Gómez',
        estadoSemaforo: 'rojo',
        numeroProceso: '',
        cantidadProcesos: 0,
      }),
      makeRecord({
        rowId: 'row_3',
        nombreSolicitante: 'Ana Ruiz',
        estadoSemaforo: 'violeta',
        numeroProceso: 'PROC-3',
        cantidadProcesos: 2,
      }),
      makeRecord({
        rowId: 'row_4',
        nombreSolicitante: 'Pedro Díaz',
        estadoSemaforo: 'verde',
        numeroProceso: 'PROC-4',
        cantidadProcesos: 1,
      }),
    ];
    useDataStore.getState().setRecords(recs);
    render(<DataView />);

    // Estado = verde -> filas 1 y 4
    const selectEstado = screen.getByTestId('dv-filter-estado-semaforo');
    fireEvent.change(selectEstado, { target: { value: 'verde' } });

    expect(screen.getByTestId('dv-row-row_1')).toBeInTheDocument();
    expect(screen.getByTestId('dv-row-row_4')).toBeInTheDocument();
    expect(screen.queryByTestId('dv-row-row_2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dv-row-row_3')).not.toBeInTheDocument();
    expect(screen.getByTestId('dv-tag-estado-semaforo')).toBeInTheDocument();

    // Combinar con búsqueda general = 'Ana' -> solo fila 1
    const search = screen.getByTestId('dv-search') as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'Ana' } });
    act(() => {
      vi.advanceTimersByTime(350);
    });
    await waitFor(() => expect(useDataStore.getState().filterState.search).toBe('Ana'));
    expect(screen.getByTestId('dv-row-row_1')).toBeInTheDocument();
    expect(screen.queryByTestId('dv-row-row_4')).not.toBeInTheDocument();
  });

  it('useSelection hook: toggleRow single-selection, selectRow y clearSelection usan Set<string>', async () => {
    const recs = seedRecords(12);
    useDataStore.getState().setRecords(recs as unknown as EssaRecord[]);
    render(<DataView />);
    // toggleRow via UI proves Set + single selection
    fireEvent.click(screen.getByTestId('dv-row-checkbox-row_5_test'));
    expect(useDataStore.getState().selectedRows instanceof Set).toBe(true);
    expect(useDataStore.getState().selectedRows.has('row_5_test')).toBe(true);
    expect(useDataStore.getState().selectedRows.size).toBe(1);
    // selecting another replaces (single selection)
    fireEvent.click(screen.getByTestId('dv-row-checkbox-row_6_test'));
    expect(useDataStore.getState().selectedRows.size).toBe(1);
    expect(useDataStore.getState().selectedRows.has('row_6_test')).toBe(true);
    fireEvent.click(screen.getByTestId('dv-limpiar-seleccion'));
    expect(useDataStore.getState().selectedRows.size).toBe(0);
  });

  it('renderiza las nuevas columnas: Estado, TIPO PROCESO (con tooltip), RESPONSABLE DEL INSUMO y Días PQR', async () => {
    const recs = [
      makeRecord({
        rowId: 'row_test_verde',
        id: 1,
        numeroProceso: 'PRC-001',
        observacionRevision: 'Revisado OK',
        observacionProceso: 'Solicitud formal',
        radicadoEntrada: 'RAD-001',
        tipoProceso: 'RECLAMO FACTURACION',
        descripcionTipoProceso: 'Reclamación sobre cobro de consumo elevado',
        usuarioResponsableInsumo: 'ANA.PEREZ',
        fechaSolicitud: '07/05/2026 16:18:56.53',
      }),
      makeRecord({
        rowId: 'row_test_violeta',
        id: 2,
        numeroProceso: 'PRC-002',
        observacionRevision: '',
        radicadoEntrada: 'RAD-002',
        tipoProceso: 'REVISION MEDIDOR',
        descripcionTipoProceso: 'Revisión técnica de equipo de medida',
        usuarioResponsableInsumo: '',
        fechaSolicitud: '10/05/2026',
      }),
      makeRecord({
        rowId: 'row_test_insumo',
        id: 3,
        numeroProceso: '',
        observacionRevision: '',
        radicadoEntrada: 'RAD-003',
        tipoProceso: 'DANOS Y PERJUICIOS',
        descripcionTipoProceso: 'Indemnización por daños',
        usuarioResponsableInsumo: 'CARLOS.GOMEZ',
        fechaSolicitud: '12/05/2026',
      }),
      makeRecord({
        rowId: 'row_test_rojo',
        id: 4,
        numeroProceso: '',
        observacionRevision: '',
        radicadoEntrada: 'RAD-004',
        tipoProceso: '',
        descripcionTipoProceso: '',
        usuarioResponsableInsumo: '',
        fechaSolicitud: '15/05/2026',
      }),
    ];
    useDataStore.getState().setRecords(recs);
    render(<DataView />);

    // Headers
    expect(screen.getAllByText('Estado').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Tipo Proceso')).toBeInTheDocument();
    expect(screen.getByText('Responsable')).toBeInTheDocument();
    expect(screen.getByText('PQR')).toBeInTheDocument();

    // Estados
    expect(screen.getByTestId('dv-semaforo-row_test_verde')).toHaveTextContent('Completo');
    expect(screen.getByTestId('dv-semaforo-row_test_violeta')).toHaveTextContent('Tiene revisión');
    expect(screen.getByTestId('dv-semaforo-row_test_insumo')).toHaveTextContent('Tiene Insumos');
    expect(screen.getByTestId('dv-semaforo-row_test_rojo')).toHaveTextContent('No tiene insumos');

    // TIPO PROCESO con tooltips
    const tipoCell1 = screen.getByTestId('dv-tipo-proceso-row_test_verde');
    expect(tipoCell1).toHaveTextContent('RECLAMO FACTURACION');
    expect(tipoCell1).toHaveAttribute('title', 'Reclamación sobre cobro de consumo elevado');

    // RESPONSABLE DEL INSUMO
    expect(screen.getByTestId('dv-responsable-insumo-row_test_verde')).toHaveTextContent(
      'ANA.PEREZ'
    );
    expect(screen.getByTestId('dv-responsable-insumo-row_test_violeta')).toHaveTextContent('—');

    // Días PQR
    expect(screen.getByTestId('dv-pqr-row_test_verde')).toBeInTheDocument();
  });

  it('oculta columna PQR cuando Mercurio no está cargado', async () => {
    const recs = [
      makeRecord({
        rowId: 'row_test_sinmerc',
        id: 1,
        numeroProceso: 'PRC-001',
        radicadoEntrada: 'RAD-001',
      }),
    ];
    useDataStore.getState().setRecords(recs);
    // Simular ausencia de Mercurio
    useDataStore.setState({ mercurioRecords: [] });
    useExcelStore.setState({ mercurioFile: null });
    render(<DataView />);
    expect(screen.queryByText('PQR')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dv-pqr-row_test_sinmerc')).not.toBeInTheDocument();
    // resto de columnas siguen operando (usar getAllByText por labels duplicados)
    expect(screen.getAllByText('Estado').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Tipo Proceso')).toBeInTheDocument();
  });

  it('modal de edición: botón "Mejorar texto" mejora la redacción y guarda cambios', async () => {
    const recs = [
      makeRecord({
        rowId: 'row_test_modal',
        id: 1,
        observacionProceso:
          'el cliente solicita revision del medidor , no esta de acuerdo con el cobro .',
        observacionRevision: 'Revision inicial',
      }),
    ];
    useDataStore.getState().setRecords(recs);
    render(<DataView />);

    fireEvent.click(screen.getByTestId('dv-edit-row_test_modal'));
    expect(await screen.findByText('Descripción de la solicitud')).toBeInTheDocument();
    expect(screen.getAllByText(/Observaci/).length).toBeGreaterThanOrEqual(2);

    const descTextarea = screen.getByTestId('rem-textarea-descripcion') as HTMLTextAreaElement;
    expect(descTextarea.value).toBe(
      'el cliente solicita revision del medidor , no esta de acuerdo con el cobro .'
    );

    // Clic en botón "Mejorar texto" (async con rAF + idle, avanzar timers)
    const btnMejorar = screen.getByTestId('rem-btn-mejorar-texto');
    expect(btnMejorar).toBeInTheDocument();
    fireEvent.click(btnMejorar);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    // El texto mejorado debe haber capitalizado, acentuado y corregido puntuación
    await waitFor(() => {
      expect(descTextarea.value).toBe(
        'El cliente solicita revisión del medidor, no está de acuerdo con el cobro.'
      );
    });

    fireEvent.click(screen.getByTestId('rem-save'));
    await waitFor(() => {
      const updated = useDataStore.getState().records.find((r) => r.rowId === 'row_test_modal');
      expect(updated?.observacionProceso).toBe(
        'El cliente solicita revisión del medidor, no está de acuerdo con el cobro.'
      );
    });
  });
});

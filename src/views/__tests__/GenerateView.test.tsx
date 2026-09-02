import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import GenerateView from '@/views/GenerateView';
import { useDataStore } from '@/store/dataStore';
import { useTemplateStore } from '@/store/templateStore';
import { useProfileStore } from '@/store/profileStore';
import { useGenerationStore } from '@/store/generationStore';
import type { Template } from '@/types/template';
import type { Record as EssaRecord } from '@/types/record';

// mocks
vi.mock('@/utils/templateEngine', () => ({
  generateDocx: vi.fn(async () => {
    const buf = new Uint8Array([0x50, 0x4b]);
    return new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  }),
  buildTemplateData: vi.fn((rec: EssaRecord, profile: unknown) => ({
    NOMBRE_SOLICITANTE: String(rec.nombreSolicitante ?? ''),
    _profile: profile,
  })),
  replaceTemplateVariables: (s: string) => s,
}));

vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

vi.mock('pizzip', () => {
  return {
    default: class MockPizZip {
      files: Record<string, unknown> = {};
      file(name: string, data: unknown) {
        this.files[name] = data;
        return this;
      }
      generate() {
        return new ArrayBuffer(8);
      }
    },
  };
});

vi.mock('docx-preview', () => ({
  renderAsync: vi.fn(async () => {}),
}));

function makeTemplate(overrides: Partial<Template> & { id: string }): Template {
  return {
    id: overrides.id,
    title: overrides.title ?? `Plantilla ${overrides.id}`,
    category: overrides.category ?? 'Cartas',
    description: overrides.description ?? 'desc',
    fileName: overrides.fileName ?? `${overrides.id}.docx`,
    variables: overrides.variables ?? [
      { key: 'NOMBRE_SOLICITANTE', label: 'Nombre', type: 'Texto', source: 'Excel' },
      { key: 'NUMERO_CUENTA', label: 'Cuenta', type: 'Texto', source: 'Excel' },
    ],
    sampleContent: overrides.sampleContent ?? 'Hola [NOMBRE_SOLICITANTE] cuenta [NUMERO_CUENTA]',
    file:
      overrides.file ??
      (new File([new Uint8Array([1, 2, 3])], `${overrides.id}.docx`, {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }) as unknown as File),
  } as Template;
}

function makeRecord(overrides: Partial<EssaRecord> & { rowId: string }): EssaRecord {
  return {
    id: overrides.rowId,
    status: 'Pendiente',
    selected: false,
    fechaSolicitud: '2026-08-27',
    fechaVencimiento: '2026-09-27',
    numeroProceso: 'PROC-001',
    radicadoEntrada: 'RAD-123',
    nombreSolicitante: 'Juan Pérez',
    cedulaSolicitante: '12345',
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
  useTemplateStore.setState({ templates: [], selectedTemplate: null });
  useProfileStore.setState({
    profile: { name: 'Func EssA', position: 'Gestor', email: 'a@essa.com.co', signatureUrl: null },
  });
  useGenerationStore.setState({ stage: 'revision', progress: 0, docResults: [] });
}

describe('GenerateView — M5 unificado', () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sidebar renders: lista navegable + Documento X de Y + prev/next + status por doc', async () => {
    const rec1 = makeRecord({
      rowId: 'row_0_1',
      nombreSolicitante: 'Ana López',
      numeroCuenta: '1001',
      radicadoEntrada: 'RAD-001',
    });
    const rec2 = makeRecord({
      rowId: 'row_1_1',
      nombreSolicitante: 'Carlos Ruiz',
      numeroCuenta: '1002',
      radicadoEntrada: 'RAD-002',
    });
    const tpl = makeTemplate({ id: 'tpl-1', title: 'Tpl Test' });
    useDataStore.setState({
      records: [rec1, rec2] as unknown as EssaRecord[],
      selectedRows: new Set(['row_0_1', 'row_1_1']),
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
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });

    render(<GenerateView />);

    expect(screen.getByTestId('generate-view')).toBeInTheDocument();
    expect(screen.getByTestId('gv-layout')).toBeInTheDocument();
    expect(screen.getByTestId('gv-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('gv-center')).toBeInTheDocument();
    expect(screen.getByTestId('gv-search')).toHaveAttribute(
      'placeholder',
      'Buscar por cuenta, radicado o nombre'
    );
    expect(screen.getByTestId('gv-sidebar-list')).toBeInTheDocument();
    expect(screen.getByTestId('gv-sidebar-item-row_0_1')).toBeInTheDocument();
    expect(screen.getByTestId('gv-sidebar-item-row_1_1')).toBeInTheDocument();
    expect(screen.getByTestId('gv-status-row_0_1')).toHaveTextContent('Pendiente');
    expect(screen.getByTestId('gv-documento-indicator')).toHaveTextContent(/Documento 1 de 2/);
    expect(screen.getByTestId('gv-prev')).toBeInTheDocument();
    expect(screen.getByTestId('gv-next')).toBeInTheDocument();
    const activeItem = screen.getByTestId('gv-sidebar-item-row_0_1');
    expect(activeItem.getAttribute('data-active')).toBe('true');
    fireEvent.click(screen.getByTestId('gv-sidebar-item-row_1_1'));
    expect(screen.getByTestId('gv-sidebar-item-row_1_1').getAttribute('data-active')).toBe('true');
    expect(screen.getByTestId('gv-documento-indicator')).toHaveTextContent(/Documento 2 de 2/);
    fireEvent.click(screen.getByTestId('gv-prev'));
    expect(screen.getByTestId('gv-documento-indicator')).toHaveTextContent(/Documento 1 de 2/);
    const searchInput = screen.getByTestId('gv-search');
    fireEvent.change(searchInput, { target: { value: 'Ana' } });
    expect(screen.getByTestId('gv-sidebar-item-row_0_1')).toBeInTheDocument();
    expect(screen.queryByTestId('gv-sidebar-item-row_1_1')).not.toBeInTheDocument();
  });

  it('renderiza título Módulo 5: Generación Documental y vista previa con variables', async () => {
    const rec1 = makeRecord({
      rowId: 'row_0_1',
      numeroCuenta: '1001',
      nombreSolicitante: 'Ana Gómez',
    });
    const tpl = makeTemplate({ id: 'tpl-1', title: 'Plantilla Reclamación' });
    useDataStore.setState({
      records: [rec1] as unknown as EssaRecord[],
      selectedRows: new Set(['row_0_1']),
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
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });

    render(<GenerateView />);
    expect(screen.getByText('Módulo 5: Generación Documental')).toBeInTheDocument();
    expect(screen.getByTestId('gv-preview')).toBeInTheDocument();
  });

  it('comportamiento dinámico de botones: Generar documento (1 registro) vs Generar todos (múltiples registros)', async () => {
    const rec1 = makeRecord({ rowId: 'row_0_1', numeroCuenta: '1001' });
    const rec2 = makeRecord({ rowId: 'row_1_1', numeroCuenta: '1002' });
    const tpl = makeTemplate({ id: 'tpl-1' });

    useDataStore.setState({
      records: [rec1, rec2] as unknown as EssaRecord[],
      selectedRows: new Set(['row_0_1']),
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
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });

    const { rerender } = render(<GenerateView />);
    expect(screen.getByTestId('gv-generate-btn')).toHaveTextContent('Generar documento');

    useDataStore.setState({
      records: [rec1, rec2] as unknown as EssaRecord[],
      selectedRows: new Set(['row_0_1', 'row_1_1']),
    });
    rerender(<GenerateView />);
    expect(screen.getByTestId('gv-generate-btn')).toHaveTextContent('Generar todos');
  });

  it('generate button gate: deshabilitado hasta selectedRecords>0 && selectedTemplate', async () => {
    render(<GenerateView />);
    const btn = screen.getByTestId('gv-generate-btn') as HTMLButtonElement;
    expect(btn).toBeDisabled();
    expect(screen.getByTestId('gv-summary')).toHaveTextContent(/Se generarán 0 documentos/);

    const rec = makeRecord({ rowId: 'row_0_1' });
    useDataStore.setState({
      records: [rec] as unknown as EssaRecord[],
      selectedRows: new Set(['row_0_1']),
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
    expect(btn).toBeDisabled();

    const tpl = makeTemplate({ id: 'tpl-1' });
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });
    await waitFor(() => expect(screen.getByTestId('gv-generate-btn')).toBeEnabled());
    expect(screen.getByTestId('gv-summary')).toHaveTextContent(/Se generarán 1 documentos/);
  });

  it('generación progress real % + stage indicator + per-doc status + reintentar', async () => {
    const rec1 = makeRecord({ rowId: 'row_0_1', numeroCuenta: '1001' });
    const rec2 = makeRecord({ rowId: 'row_1_1', numeroCuenta: '1002' });
    const tpl = makeTemplate({ id: 'tpl-1' });
    useDataStore.setState({
      records: [rec1, rec2] as unknown as EssaRecord[],
      selectedRows: new Set(['row_0_1', 'row_1_1']),
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
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });

    const onAddHistory = vi.fn();
    render(<GenerateView onAddHistory={onAddHistory} />);

    expect(screen.getByTestId('generation-stage-indicator')).toHaveTextContent('Revisión');

    const btn = screen.getByTestId('gv-generate-btn');
    await act(async () => {
      fireEvent.click(btn);
    });

    await waitFor(() => expect(screen.getByTestId('gv-progress-pct')).toHaveTextContent('100%'), {
      timeout: 2000,
    });
    await waitFor(() =>
      expect(screen.getByTestId('generation-stage-indicator')).toHaveTextContent('Finalizado')
    );

    expect(screen.getByTestId('gv-status-row_0_1')).toHaveTextContent('Completado');
    expect(screen.getByTestId('gv-status-row_1_1')).toHaveTextContent('Completado');
    expect(screen.getByTestId('gv-progress-fill').style.width).toBe('100%');
    expect(onAddHistory).toHaveBeenCalledWith(expect.objectContaining({ recordsCount: 2 }));

    // download section no longer exists (generate auto-downloads)
    expect(screen.queryByTestId('gv-download-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('gv-download-all')).not.toBeInTheDocument();

    // retry flow
    const { generateDocx } = await import('@/utils/templateEngine');
    useGenerationStore.setState({
      stage: 'con_errores',
      progress: 100,
      docResults: [
        { id: 'row_0_1', recordId: 'row_0_1', fileName: 'a.docx', status: 'error', error: 'boom' },
        {
          id: 'row_1_1',
          recordId: 'row_1_1',
          fileName: 'b.docx',
          status: 'success',
          blob: new Blob(['ok']),
        },
      ],
    });
    expect(await screen.findByTestId('gv-retry-btn')).toBeInTheDocument();
    expect(screen.getByTestId('generation-stage-indicator')).toHaveTextContent('Con errores');

    vi.mocked(generateDocx).mockResolvedValueOnce(new Blob(['recovered']) as unknown as Blob);
    fireEvent.click(screen.getByTestId('gv-retry-btn'));
    await waitFor(
      () => expect(screen.getByTestId('gv-status-row_0_1')).toHaveTextContent('Completado'),
      { timeout: 2000 }
    );
  });

  it('GenerationStageIndicator shows stages with colors/icons', () => {
    const rec = makeRecord({ rowId: 'row_0_1' });
    const tpl = makeTemplate({ id: 'tpl-1' });
    useDataStore.setState({
      records: [rec] as unknown as EssaRecord[],
      selectedRows: new Set(['row_0_1']),
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
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });
    const { rerender } = render(<GenerateView />);
    expect(screen.getByTestId('generation-stage-indicator')).toHaveTextContent('Revisión');

    useGenerationStore.setState({ stage: 'generando', progress: 40, docResults: [] });
    rerender(<GenerateView />);
    expect(screen.getByTestId('generation-stage-indicator')).toHaveTextContent('Generando');

    useGenerationStore.setState({
      stage: 'finalizado',
      progress: 100,
      docResults: [{ id: 'row_0_1', fileName: 'a.docx', status: 'success', blob: new Blob(['x']) }],
    });
    rerender(<GenerateView />);
    expect(screen.getByTestId('generation-stage-indicator')).toHaveTextContent('Finalizado');

    useGenerationStore.setState({
      stage: 'con_errores',
      progress: 100,
      docResults: [{ id: 'row_0_1', fileName: 'a.docx', status: 'error', error: 'e' }],
    });
    rerender(<GenerateView />);
    expect(screen.getByTestId('generation-stage-indicator')).toHaveTextContent('Con errores');
  });

  it('quitar documento: botón × aparece en hover, abre modal de confirmación, excluye del listado', async () => {
    const rec1 = makeRecord({
      rowId: 'row_0_1',
      nombreSolicitante: 'Ana López',
      numeroCuenta: '1001',
    });
    const rec2 = makeRecord({
      rowId: 'row_1_1',
      nombreSolicitante: 'Carlos Ruiz',
      numeroCuenta: '1002',
    });
    const tpl = makeTemplate({ id: 'tpl-1', title: 'Tpl Test' });
    useDataStore.setState({
      records: [rec1, rec2] as unknown as EssaRecord[],
      selectedRows: new Set(['row_0_1', 'row_1_1']),
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
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });

    render(<GenerateView />);

    // both items visible
    expect(screen.getByTestId('gv-sidebar-item-row_0_1')).toBeInTheDocument();
    expect(screen.getByTestId('gv-sidebar-item-row_1_1')).toBeInTheDocument();
    expect(screen.getByTestId('gv-sidebar-count')).toHaveTextContent('2 / 2');

    // click remove button on first item
    const removeBtn = screen.getByTestId('gv-remove-row_0_1');
    fireEvent.click(removeBtn);

    // modal opens
    await waitFor(() => {
      expect(screen.getByText('Quitar documento del listado')).toBeInTheDocument();
    });
    // the name appears in the modal's strong tag
    const modalStrong = document.querySelector('.gv-confirm-body strong');
    expect(modalStrong?.textContent).toBe('Ana López');

    // confirm removal
    fireEvent.click(screen.getByTestId('gv-confirm-remove-btn'));

    // item removed, count updated
    await waitFor(() => {
      expect(screen.queryByTestId('gv-sidebar-item-row_0_1')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('gv-sidebar-count')).toHaveTextContent('1 / 1');
    expect(screen.getByTestId('gv-sidebar-item-row_1_1')).toBeInTheDocument();
  });

  it('zoom controls: ampliar, reducir y restablecer', async () => {
    const rec1 = makeRecord({ rowId: 'row_0_1', numeroCuenta: '1001' });
    const tpl = makeTemplate({ id: 'tpl-1' });
    useDataStore.setState({
      records: [rec1] as unknown as EssaRecord[],
      selectedRows: new Set(['row_0_1']),
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
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });

    render(<GenerateView />);

    // fixed-height viewer: no zoom controls present
    const preview = screen.getByTestId('gv-preview');
    expect(preview).toBeInTheDocument();
    expect(screen.queryByLabelText('Ampliar zoom')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Reducir zoom')).not.toBeInTheDocument();
  });

  it('documento excluido no se genera: al quitar un doc, "Generar todos" solo procesa los visibles', async () => {
    const rec1 = makeRecord({ rowId: 'row_0_1', nombreSolicitante: 'Ana', numeroCuenta: '1001' });
    const rec2 = makeRecord({
      rowId: 'row_1_1',
      nombreSolicitante: 'Carlos',
      numeroCuenta: '1002',
    });
    const tpl = makeTemplate({ id: 'tpl-1' });
    useDataStore.setState({
      records: [rec1, rec2] as unknown as EssaRecord[],
      selectedRows: new Set(['row_0_1', 'row_1_1']),
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
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });

    render(<GenerateView />);

    // 2 docs visible, button says "Generar todos"
    expect(screen.getByTestId('gv-generate-btn')).toHaveTextContent('Generar todos');
    expect(screen.getByTestId('gv-sidebar-count')).toHaveTextContent('2 / 2');

    // remove first doc
    fireEvent.click(screen.getByTestId('gv-remove-row_0_1'));
    await waitFor(() => {
      expect(screen.getByText('Quitar documento del listado')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('gv-confirm-remove-btn'));

    await waitFor(() => {
      expect(screen.queryByTestId('gv-sidebar-item-row_0_1')).not.toBeInTheDocument();
    });

    // now only 1 doc visible -> button says "Generar documento"
    expect(screen.getByTestId('gv-generate-btn')).toHaveTextContent('Generar documento');
    expect(screen.getByTestId('gv-sidebar-count')).toHaveTextContent('1 / 1');

    // generate and verify only 1 doc is processed
    await act(async () => {
      fireEvent.click(screen.getByTestId('gv-generate-btn'));
    });

    await waitFor(
      () => {
        // only row_1_1 should have a completed status (row_0_1 was excluded)
        expect(screen.queryByTestId('gv-status-row_0_1')).not.toBeInTheDocument();
        expect(screen.getByTestId('gv-status-row_1_1')).toHaveTextContent('Completado');
      },
      { timeout: 2000 }
    );

    // summary should show 1 document generated (not 2)
    expect(screen.getByTestId('gv-progress-pct')).toHaveTextContent('100%');
  });
});

import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react';
import GenerateView from '@/views/GenerateView';
import { useDataStore } from '@/store/dataStore';
import { useTemplateStore } from '@/store/templateStore';
import { useProfileStore } from '@/store/profileStore';
import { useGenerationStore } from '@/store/generationStore';
import type { Template } from '@/types/template';
import type { Record as EssaRecord } from '@/types/record';

// mocks
vi.mock('@/utils/templateEngine', () => ({
  generateDocx: vi.fn(async (file: File, _data: unknown) => {
    // simulate successful docx generation
    const buf = new Uint8Array([0x50, 0x4b]); // zip header
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
    filterState: { search: '', cuenta: '', proceso: '', radicado: '', fechaSolicitud: '', fechaDesde: '', fechaHasta: '', procesoCreado: 'todos', estadoSemaforo: 'todos', cantProcesos: 'todos', diasPqrFiltro: 'todos' },
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

describe('GenerateView — M5+6 unificado', () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sidebar renders: 25% lista navegable + Documento X de Y + prev/next + status por doc', async () => {
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
      filterState: { search: '', cuenta: '', proceso: '', radicado: '', fechaSolicitud: '', fechaDesde: '', fechaHasta: '', procesoCreado: 'todos', estadoSemaforo: 'todos', cantProcesos: 'todos', diasPqrFiltro: 'todos' },
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
    // toolbar search placeholder exact
    expect(screen.getByTestId('gv-search')).toHaveAttribute(
      'placeholder',
      'Buscar por cuenta, radicado o nombre'
    );
    // sidebar list items
    expect(screen.getByTestId('gv-sidebar-list')).toBeInTheDocument();
    expect(screen.getByTestId('gv-sidebar-item-row_0_1')).toBeInTheDocument();
    expect(screen.getByTestId('gv-sidebar-item-row_1_1')).toBeInTheDocument();
    // status per doc
    expect(screen.getByTestId('gv-status-row_0_1')).toHaveTextContent('Pendiente');
    // Documento X de Y indicator
    expect(screen.getByTestId('gv-documento-indicator')).toHaveTextContent(/Documento 1 de 2/);
    // prev/next
    expect(screen.getByTestId('gv-prev')).toBeInTheDocument();
    expect(screen.getByTestId('gv-next')).toBeInTheDocument();
    // highlight active bg #EBF5FF (jsdom normalizes to rgb)
    const activeItem = screen.getByTestId('gv-sidebar-item-row_0_1');
    expect(activeItem.getAttribute('data-active')).toBe('true');
    // click to switch
    fireEvent.click(screen.getByTestId('gv-sidebar-item-row_1_1'));
    expect(screen.getByTestId('gv-sidebar-item-row_1_1').getAttribute('data-active')).toBe('true');
    expect(screen.getByTestId('gv-documento-indicator')).toHaveTextContent(/Documento 2 de 2/);
    // navigation prev
    fireEvent.click(screen.getByTestId('gv-prev'));
    expect(screen.getByTestId('gv-documento-indicator')).toHaveTextContent(/Documento 1 de 2/);
    // search filter
    const searchInput = screen.getByTestId('gv-search');
    fireEvent.change(searchInput, { target: { value: 'Ana' } });
    expect(screen.getByTestId('gv-sidebar-item-row_0_1')).toBeInTheDocument();
    expect(screen.queryByTestId('gv-sidebar-item-row_1_1')).not.toBeInTheDocument();
  });

  it('renderiza título Módulo 5: Generación Documental y vista previa con variables', async () => {
    const rec1 = makeRecord({ rowId: 'row_0_1', numeroCuenta: '1001', nombreSolicitante: 'Ana Gómez' });
    const tpl = makeTemplate({ id: 'tpl-1', title: 'Plantilla Reclamación' });
    useDataStore.setState({
      records: [rec1] as unknown as EssaRecord[],
      selectedRows: new Set(['row_0_1']),
      filterState: { search: '', cuenta: '', proceso: '', radicado: '', fechaSolicitud: '', fechaDesde: '', fechaHasta: '', procesoCreado: 'todos', estadoSemaforo: 'todos', cantProcesos: 'todos', diasPqrFiltro: 'todos' },
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

    // 1 registro -> Generar documento
    useDataStore.setState({
      records: [rec1, rec2] as unknown as EssaRecord[],
      selectedRows: new Set(['row_0_1']),
      filterState: { search: '', cuenta: '', proceso: '', radicado: '', fechaSolicitud: '', fechaDesde: '', fechaHasta: '', procesoCreado: 'todos', estadoSemaforo: 'todos', cantProcesos: 'todos', diasPqrFiltro: 'todos' },
      currentPage: 1,
      pageSize: 10,
      editingRecord: null,
    });
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });

    const { rerender } = render(<GenerateView />);
    expect(screen.getByTestId('gv-generate-btn')).toHaveTextContent('Generar documento');

    // 2 registros -> Generar todos
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

    // add record but no template
    const rec = makeRecord({ rowId: 'row_0_1' });
    useDataStore.setState({
      records: [rec] as unknown as EssaRecord[],
      selectedRows: new Set(['row_0_1']),
      filterState: { search: '', cuenta: '', proceso: '', radicado: '', fechaSolicitud: '', fechaDesde: '', fechaHasta: '', procesoCreado: 'todos', estadoSemaforo: 'todos', cantProcesos: 'todos', diasPqrFiltro: 'todos' },
      currentPage: 1,
      pageSize: 10,
      editingRecord: null,
    });
    // re-render? Zustand will trigger
    expect(btn).toBeDisabled();

    // add template
    const tpl = makeTemplate({ id: 'tpl-1' });
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });
    await waitFor(() => expect(screen.getByTestId('gv-generate-btn')).toBeEnabled());
    expect(screen.getByTestId('gv-summary')).toHaveTextContent(/Se generarán 1 documentos/);
  });

  it('generación progress real % + stage indicator + per-doc status + reintentar + descargas', async () => {
    const rec1 = makeRecord({ rowId: 'row_0_1', numeroCuenta: '1001' });
    const rec2 = makeRecord({ rowId: 'row_1_1', numeroCuenta: '1002' });
    const tpl = makeTemplate({ id: 'tpl-1' });
    useDataStore.setState({
      records: [rec1, rec2] as unknown as EssaRecord[],
      selectedRows: new Set(['row_0_1', 'row_1_1']),
      filterState: { search: '', cuenta: '', proceso: '', radicado: '', fechaSolicitud: '', fechaDesde: '', fechaHasta: '', procesoCreado: 'todos', estadoSemaforo: 'todos', cantProcesos: 'todos', diasPqrFiltro: 'todos' },
      currentPage: 1,
      pageSize: 10,
      editingRecord: null,
    });
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });

    const onAddHistory = vi.fn();
    render(<GenerateView onAddHistory={onAddHistory} />);

    // initial stage Revisión
    expect(screen.getByTestId('generation-stage-indicator')).toHaveTextContent('Revisión');

    // trigger generate
    const btn = screen.getByTestId('gv-generate-btn');
    await act(async () => {
      fireEvent.click(btn);
    });

    // await progress 100 and stage Finalizado
    await waitFor(() => expect(screen.getByTestId('gv-progress-pct')).toHaveTextContent('100%'), {
      timeout: 2000,
    });
    await waitFor(() =>
      expect(screen.getByTestId('generation-stage-indicator')).toHaveTextContent('Finalizado')
    );

    // per-doc status updates to Completado
    expect(screen.getByTestId('gv-status-row_0_1')).toHaveTextContent('Completado');
    expect(screen.getByTestId('gv-status-row_1_1')).toHaveTextContent('Completado');

    // progress bar fill width
    expect(screen.getByTestId('gv-progress-fill').style.width).toBe('100%');

    // history callback called
    expect(onAddHistory).toHaveBeenCalledWith(expect.objectContaining({ recordsCount: 2 }));

    // download buttons appear
    expect(screen.getByTestId('gv-download-section')).toBeInTheDocument();
    expect(screen.getByTestId('gv-download-all')).toBeInTheDocument();

    const { saveAs } = await import('file-saver');

    // download all triggers Documentos.zip
    fireEvent.click(screen.getByTestId('gv-download-all'));
    await waitFor(() =>
      expect(vi.mocked(saveAs)).toHaveBeenCalled()
    );
    const lastCall = vi.mocked(saveAs).mock.calls[vi.mocked(saveAs).mock.calls.length - 1];
    expect(lastCall[1]).toBe('Documentos.zip');

    // simulate error case for retry
    const { generateDocx } = await import('@/utils/templateEngine');
    // reset to have one error (synthetic, no mock needed yet)
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

    // now mock success for retry
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
      filterState: { search: '', cuenta: '', proceso: '', radicado: '', fechaSolicitud: '', fechaDesde: '', fechaHasta: '', procesoCreado: 'todos', estadoSemaforo: 'todos', cantProcesos: 'todos', diasPqrFiltro: 'todos' },
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
});

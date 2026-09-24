import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import GenerateView from '@/views/GenerateView';
import { useDataStore } from '@/store/dataStore';
import { useTemplateStore } from '@/store/templateStore';
import { useProfileStore } from '@/store/profileStore';
import { useGenerationStore } from '@/store/generationStore';
import { useNavigationStore } from '@/store/navigationStore';
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

// auto-animate muta el DOM fuera de React: en jsdom choca con la
// reconciliación al alternar ramas del visor; se aísla en tests.
vi.mock('@formkit/auto-animate', () => ({
  default: vi.fn(),
}));

if (typeof globalThis.ResizeObserver === 'undefined') {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

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
    file: overrides.file,
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

const baseFilterState = {
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
};

function seedData(records: EssaRecord[], selectedRows: string[]) {
  useDataStore.setState({
    records: records as unknown as EssaRecord[],
    selectedRows: new Set(selectedRows),
    templateAssignments: {},
    filterState: { ...baseFilterState },
    currentPage: 1,
    pageSize: 10,
    editingRecord: null,
  });
}

function resetStores() {
  useDataStore.setState({
    records: [],
    selectedRows: new Set<string>(),
    templateAssignments: {},
    filterState: { ...baseFilterState },
    currentPage: 1,
    pageSize: 10,
    editingRecord: null,
  });
  useTemplateStore.setState({ templates: [], selectedTemplate: null });
  useProfileStore.setState({
    profile: { name: 'Func EssA', position: 'Gestor', email: 'a@essa.com.co', signatureUrl: null },
  });
  useGenerationStore.setState({ stage: 'revision', progress: 0, docResults: [], excludedIds: [] });
  useNavigationStore.setState({ currentStep: 'generacion', completed: new Set() });
  try {
    localStorage.removeItem('essa-generation');
  } catch {
    // Test cleanup is best effort.
  }
}

describe('GenerateView — Módulo 4: Generación Documental (unificado)', () => {
  beforeEach(async () => {
    resetStores();
    vi.clearAllMocks();
    const { renderAsync } = await import('docx-preview');
    vi.mocked(renderAsync).mockReset();
    vi.mocked(renderAsync).mockImplementation(async () => {});
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  function fakeFile(): File {
    return { arrayBuffer: async () => new ArrayBuffer(8) } as unknown as File;
  }

  it('muestra empty state cuando no hay plantillas', () => {
    render(<GenerateView />);
    expect(screen.getByTestId('dg-empty')).toBeInTheDocument();
    expect(screen.getByText(/No hay plantillas disponibles/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dg-go-config'));
    expect(useNavigationStore.getState().currentStep).toBe('configuracion');
  });

  it('renderiza encabezado Módulo 4: Generación Documental + layout 3 paneles', () => {
    const tpl = makeTemplate({ id: 'tpl-1' });
    const rec = makeRecord({ rowId: 'row_0_1' });
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: null });
    seedData([rec], ['row_0_1']);
    render(<GenerateView />);
    expect(screen.getByText('Módulo 4: Generación Documental')).toBeInTheDocument();
    expect(screen.getByTestId('dg-layout')).toBeInTheDocument();
    expect(screen.getByText('Plantillas')).toBeInTheDocument();
    expect(screen.getByTestId('dg-desc-card')).toBeInTheDocument();
    expect(screen.getAllByText('Documento').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId('generation-stage-indicator')).not.toBeInTheDocument();
  });

  it('el encabezado del visor centra los modos y no muestra etiqueta de registro', () => {
    const tpl = makeTemplate({ id: 'tpl-1' });
    const rec = makeRecord({ rowId: 'row_0_1', nombreSolicitante: 'María López' });
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });
    seedData([rec], ['row_0_1']);
    render(<GenerateView />);
    expect(screen.getByTestId('dg-mode-diseno')).toBeInTheDocument();
    expect(screen.getByTestId('dg-mode-documento')).toBeInTheDocument();
    expect(screen.queryByTestId('dg-preview-meta')).not.toBeInTheDocument();
    // el registro se gestiona en el Módulo 3; aquí se editan sus descripciones
    expect(screen.getByTestId('dg-desc-card')).toBeInTheDocument();
  });

  it('catálogo: lista plantillas con nombre y conteo', () => {
    const t1 = makeTemplate({ id: 'tpl-1', title: 'Bloqueo de Cuenta', category: 'Cartas' });
    const t2 = makeTemplate({ id: 'tpl-2', title: 'Contrato ESSA', category: 'Contratos' });
    useTemplateStore.setState({ templates: [t1, t2], selectedTemplate: null });
    seedData([], []);
    render(<GenerateView />);
    expect(screen.getByTestId('dg-list')).toBeInTheDocument();
    expect(screen.getByTestId('dg-count')).toHaveTextContent('2');
    expect(screen.getByTestId('dg-title-tpl-1')).toHaveTextContent('Bloqueo de Cuenta');
    expect(screen.getByTestId('dg-title-tpl-2')).toHaveTextContent('Contrato ESSA');
  });

  it('buscador y categorías filtran el catálogo', () => {
    const t1 = makeTemplate({ id: 'tpl-1', title: 'Carta Bloqueo', category: 'Cartas' });
    const t2 = makeTemplate({ id: 'tpl-2', title: 'Contrato Comercial', category: 'Contratos' });
    useTemplateStore.setState({ templates: [t1, t2], selectedTemplate: null });
    seedData([], []);
    render(<GenerateView />);

    fireEvent.change(screen.getByTestId('dg-search-input'), { target: { value: 'Bloqueo' } });
    expect(screen.getByTestId('dg-card-tpl-1')).toBeInTheDocument();
    expect(screen.queryByTestId('dg-card-tpl-2')).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId('dg-search-input'), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('dg-cat-Contratos'));
    expect(screen.queryByTestId('dg-card-tpl-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('dg-card-tpl-2')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('dg-search-input'), { target: { value: 'Inexistente' } });
    expect(screen.getByTestId('dg-empty-search')).toBeInTheDocument();
  });

  it('paginación del catálogo con más de 8 plantillas', () => {
    const templates = Array.from({ length: 9 }, (_, i) =>
      makeTemplate({ id: `tpl-${i}`, title: `Plantilla ${i}` })
    );
    useTemplateStore.setState({ templates, selectedTemplate: null });
    seedData([], []);
    render(<GenerateView />);
    expect(screen.getByTestId('dg-pagination')).toBeInTheDocument();
    expect(screen.getByTestId('dg-page-indicator')).toHaveTextContent('1/2');
    expect(screen.getAllByTestId(/^dg-card-tpl-/)).toHaveLength(8);
    fireEvent.click(screen.getByTestId('dg-next-page'));
    expect(screen.getByTestId('dg-page-indicator')).toHaveTextContent('2/2');
    expect(screen.getAllByTestId(/^dg-card-tpl-/)).toHaveLength(1);
    fireEvent.click(screen.getByTestId('dg-prev-page'));
    expect(screen.getByTestId('dg-page-indicator')).toHaveTextContent('1/2');
  });

  it('seleccionar plantilla la asigna automáticamente al registro del Módulo 3', () => {
    const tpl = makeTemplate({ id: 'tpl-1', title: 'Mi Plantilla' });
    const rec = makeRecord({ rowId: 'row_assign', nombreSolicitante: 'Pedro López' });
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: null });
    seedData([rec], ['row_assign']);
    render(<GenerateView />);

    expect(screen.getByTestId('dg-generate-btn')).toBeDisabled();
    fireEvent.click(screen.getByTestId('dg-card-tpl-1'));

    expect(useTemplateStore.getState().selectedTemplate?.id).toBe('tpl-1');
    expect(useDataStore.getState().templateAssignments['row_assign']).toBe('tpl-1');
    expect(screen.getByTestId('dg-card-tpl-1')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('dg-generate-btn')).toBeEnabled();
  });

  it('sin registro seleccionado muestra aviso para ir al Módulo 3', () => {
    const tpl = makeTemplate({ id: 'tpl-1' });
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });
    seedData([], []);
    render(<GenerateView />);
    expect(screen.getByTestId('dg-preview-empty-records')).toBeInTheDocument();
    expect(screen.getByTestId('dg-desc-empty')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dg-go-datos'));
    expect(useNavigationStore.getState().currentStep).toBe('datos');
    expect(screen.getByTestId('dg-generate-btn')).toBeDisabled();
  });

  it('modo Diseño muestra el contenido de la plantilla sin datos', () => {
    const tpl = makeTemplate({
      id: 'tpl-1',
      file: undefined,
      sampleContent: 'PLANTILLA BASE [NOMBRE_SOLICITANTE] fin',
    });
    const rec = makeRecord({ rowId: 'row_0_1', nombreSolicitante: 'María López' });
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });
    seedData([rec], ['row_0_1']);
    render(<GenerateView />);

    fireEvent.click(screen.getByTestId('dg-mode-diseno'));
    const diseno = screen.getByTestId('dg-preview-diseno');
    const documento = screen.getByTestId('dg-preview-documento');
    expect(diseno).toHaveAttribute('data-visible', 'true');
    expect(documento).toHaveAttribute('data-visible', 'false');
    expect(screen.getByTestId('dg-diseno-fallback')).toHaveTextContent('PLANTILLA BASE');
  });

  it('modo Documento muestra el contenido con datos y permite volver a Diseño', () => {
    const tpl = makeTemplate({
      id: 'tpl-1',
      file: undefined,
      sampleContent: 'Contenido generado de prueba',
    });
    const rec = makeRecord({ rowId: 'row_0_1', nombreSolicitante: 'María López' });
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });
    seedData([rec], ['row_0_1']);
    render(<GenerateView />);

    // Documento es el modo por defecto
    expect(screen.getByTestId('dg-mode-documento')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('dg-preview-documento')).toHaveAttribute('data-visible', 'true');
    expect(screen.getByTestId('dg-fallback-content')).toHaveTextContent(
      'Contenido generado de prueba'
    );
    // el registro se gestiona en el Módulo 3; aquí se editan sus descripciones
    expect(screen.queryByTestId('dg-preview-meta')).not.toBeInTheDocument();
    expect(screen.getByTestId('dg-desc-card')).toBeInTheDocument();

    // Cambiar a Diseño y volver con teclado
    fireEvent.click(screen.getByTestId('dg-mode-diseno'));
    expect(screen.getByTestId('dg-preview-diseno')).toHaveAttribute('data-visible', 'true');
    fireEvent.keyDown(screen.getByTestId('dg-mode-diseno'), { key: 'ArrowRight' });
    expect(screen.getByTestId('dg-preview-documento')).toHaveAttribute('data-visible', 'true');
    expect(screen.getByTestId('dg-mode-documento')).toHaveAttribute('aria-selected', 'true');
  });

  it('generate button gate: deshabilitado hasta registro + plantilla', async () => {
    const tpl = makeTemplate({ id: 'tpl-1' });
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: null });
    seedData([], []);
    const { rerender } = render(<GenerateView />);
    expect(screen.getByTestId('dg-generate-btn')).toBeDisabled();

    const rec = makeRecord({ rowId: 'row_0_1' });
    seedData([rec], ['row_0_1']);
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });
    rerender(<GenerateView />);
    await waitFor(() => expect(screen.getByTestId('dg-generate-btn')).toBeEnabled());
  });

  it('generación completa: descarga, historial y etapa completada', async () => {
    const rec = makeRecord({ rowId: 'row_0_1', numeroCuenta: '1001' });
    const tpl = makeTemplate({ id: 'tpl-1' });
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });
    seedData([rec], ['row_0_1']);

    const onAddHistory = vi.fn();
    render(<GenerateView onAddHistory={onAddHistory} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('dg-generate-btn'));
    });

    await waitFor(() => expect(useGenerationStore.getState().stage).toBe('finalizado'));
    expect(onAddHistory).toHaveBeenCalledWith(expect.objectContaining({ recordsCount: 1 }));
    expect(useNavigationStore.getState().completed.has('generacion')).toBe(true);
  });

  it('reintentar documentos con error recupera la generación', async () => {
    const rec = makeRecord({ rowId: 'row_0_1' });
    const tpl = makeTemplate({ id: 'tpl-1' });
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });
    seedData([rec], ['row_0_1']);
    render(<GenerateView />);

    const { generateDocx } = await import('@/utils/templateEngine');
    useGenerationStore.setState({
      stage: 'con_errores',
      progress: 100,
      docResults: [
        { id: 'row_0_1', recordId: 'row_0_1', fileName: 'a.docx', status: 'error', error: 'boom' },
      ],
    });
    expect(await screen.findByTestId('dg-retry-btn')).toBeInTheDocument();

    vi.mocked(generateDocx).mockResolvedValueOnce(new Blob(['recovered']) as unknown as Blob);
    fireEvent.click(screen.getByTestId('dg-retry-btn'));
    await waitFor(() => expect(useGenerationStore.getState().stage).toBe('finalizado'), {
      timeout: 2000,
    });
  });

  it('no existe botón Borrar documentos generados', async () => {
    const rec = makeRecord({ rowId: 'row_0_1', nombreSolicitante: 'Ana López' });
    const tpl = makeTemplate({ id: 'tpl-1', title: 'Tpl Test' });
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });
    seedData([rec], ['row_0_1']);
    useGenerationStore.setState({
      stage: 'finalizado',
      progress: 100,
      docResults: [
        {
          id: 'row_0_1',
          recordId: 'row_0_1',
          fileName: 'a.docx',
          status: 'success',
          blob: new Blob(['ok']),
        },
      ],
      excludedIds: [],
    });

    render(<GenerateView />);
    expect(screen.queryByTestId('dg-clear-generated')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dg-confirm-clear-btn')).not.toBeInTheDocument();
    // el botón Generar vive en el encabezado, siempre visible
    expect(screen.getByTestId('dg-generate-btn')).toBeInTheDocument();
  });

  it('botón Generar documento: diseño con icono, brillo y aviso solo si falta algo', () => {
    const tpl = makeTemplate({ id: 'tpl-1', title: 'Mi Plantilla' });
    const rec = makeRecord({ rowId: 'row_0_1', nombreSolicitante: 'Ana López' });
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });
    seedData([rec], ['row_0_1']);
    const { rerender } = render(<GenerateView />);

    const btn = screen.getByTestId('dg-generate-btn');
    expect(btn).toBeEnabled();
    expect(btn).toHaveTextContent('Generar documento');
    expect(btn.getAttribute('title')).toBe('Generar documento');

    // sin plantilla ni asignación: el botón se deshabilita con aviso en el título
    const rec2 = makeRecord({ rowId: 'row_sin_asignar', nombreSolicitante: 'Sin Asignar' });
    seedData([rec2], ['row_sin_asignar']);
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: null });
    rerender(<GenerateView />);
    expect(screen.getByTestId('dg-generate-btn')).toBeDisabled();
    expect(screen.getByTestId('dg-generate-btn').getAttribute('title')).toMatch(/plantilla/i);
  });

  it('volver regresa al Módulo 3', () => {
    const tpl = makeTemplate({ id: 'tpl-1' });
    const rec = makeRecord({ rowId: 'row_0_1' });
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });
    seedData([rec], ['row_0_1']);
    render(<GenerateView />);
    fireEvent.click(screen.getByTestId('dg-volver'));
    expect(useNavigationStore.getState().currentStep).toBe('datos');
  });

  it('modo Documento: render docx exitoso muestra las páginas generadas', async () => {
    const { renderAsync } = await import('docx-preview');
    vi.mocked(renderAsync).mockImplementation(async (_buf, el) => {
      el.innerHTML = '<section class="docx"><p>Documento final OK</p></section>';
    });
    const tpl = makeTemplate({ id: 'tpl-1', file: fakeFile() });
    const rec = makeRecord({ rowId: 'row_0_1', nombreSolicitante: 'María López' });
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });
    seedData([rec], ['row_0_1']);
    render(<GenerateView />);

    expect(await screen.findByText('Documento final OK')).toBeInTheDocument();
    expect(screen.queryByTestId('dg-fallback-content')).not.toBeInTheDocument();
  });

  it('modo Documento: neutraliza el fondo gris propio de docx-preview', async () => {
    const { renderAsync } = await import('docx-preview');
    vi.mocked(renderAsync).mockImplementation(async (_buf, el) => {
      el.innerHTML =
        '<div class="docx-wrapper" style="background: gray; padding: 30px;">' +
        '<section class="docx"><p>Con formato</p></section></div>';
    });
    const tpl = makeTemplate({ id: 'tpl-1', file: fakeFile() });
    const rec = makeRecord({ rowId: 'row_0_1' });
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });
    seedData([rec], ['row_0_1']);
    render(<GenerateView />);

    expect(await screen.findByText('Con formato')).toBeInTheDocument();
    const container = screen.getByTestId('dg-doc-container');
    await waitFor(() => {
      const w = container.querySelector('.docx-wrapper') as HTMLElement | null;
      expect(w?.style.background).toBe('transparent');
    });
    const wrapper = container.querySelector('.docx-wrapper') as HTMLElement;
    expect(wrapper.style.padding).toBe('0px');
  });

  it('Módulo 4: franja del solicitante bajo el banner con los datos del registro', () => {
    const tpl = makeTemplate({ id: 'tpl-1' });
    const rec = makeRecord({ rowId: 'row_0_1', nombreSolicitante: 'María López' });
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });
    seedData([rec], ['row_0_1']);
    render(<GenerateView />);

    expect(screen.getByTestId('dg-applicant-card')).toBeInTheDocument();
    expect(screen.getByTestId('dg-applicant-nombre')).toHaveValue('María López');
  });

  it('Módulo 4: tarjeta Descripciones con Mejorar texto para el registro', async () => {
    const tpl = makeTemplate({ id: 'tpl-1', file: fakeFile() });
    const rec = makeRecord({
      rowId: 'row_0_1',
      observacionProceso: 'Texto de la solicitud.',
      observacionRevision: 'Texto del insumo.',
      observacionDecision: 'Texto de la decisión.',
    });
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });
    seedData([rec], ['row_0_1']);
    render(<GenerateView />);

    expect(screen.getByTestId('dg-desc-card')).toBeInTheDocument();
    expect(screen.getByTestId('dg-desc-textarea-proceso')).toHaveValue('Texto de la solicitud.');
    expect(screen.getByTestId('dg-desc-textarea-insumo')).toHaveValue('Texto del insumo.');
    expect(screen.getByTestId('dg-desc-textarea-decision')).toHaveValue('Texto de la decisión.');
    expect(screen.getByTestId('dg-btn-mejorar-proceso')).toBeInTheDocument();
  });

  it('modo Documento: render vacío usa el respaldo con los datos del registro', async () => {
    const tpl = makeTemplate({
      id: 'tpl-1',
      file: fakeFile(),
      sampleContent: 'Texto de respaldo 456',
    });
    const rec = makeRecord({ rowId: 'row_0_1' });
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });
    seedData([rec], ['row_0_1']);
    render(<GenerateView />);

    const fallback = await screen.findByTestId('dg-fallback-content');
    expect(fallback).toHaveTextContent('Texto de respaldo 456');
    // el contenedor docx persiste pero queda oculto al mostrar el respaldo
    expect(screen.getByTestId('dg-doc-container')).not.toBeVisible();
  });

  it('modo Diseño: render exitoso usa el mismo pipeline que Documento (mismo ancho)', async () => {
    const { renderAsync } = await import('docx-preview');
    vi.mocked(renderAsync).mockImplementation(async (_buf, el) => {
      el.innerHTML =
        '<div class="docx-wrapper">' +
        '<section class="docx"><p>Diseño OK mismo ancho</p></section></div>';
    });
    const tpl = makeTemplate({ id: 'tpl-1', file: fakeFile() });
    const rec = makeRecord({ rowId: 'row_0_1' });
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });
    seedData([rec], ['row_0_1']);
    render(<GenerateView />);

    fireEvent.click(screen.getByTestId('dg-mode-diseno'));
    expect(await screen.findByText('Diseño OK mismo ancho')).toBeInTheDocument();
    const disenoDoc = screen.getByTestId('dg-diseno-document');
    // Sin clonación intermedia: el render va directo al contenedor visible,
    // igual que en el modo Documento, para conservar el ancho intrínseco.
    expect(disenoDoc.querySelector('.dg-viewer-page')).toBeNull();
    const sec = disenoDoc.querySelector('section.docx') as HTMLElement;
    expect(sec).not.toBeNull();
    // Sin override de ancho: la sección conserva el ancho de página del Word.
    expect(sec.style.width).toBe('');
    expect(disenoDoc.querySelector('.docx-wrapper')).not.toBeNull();
  });

  it('modo Diseño: render vacío usa el respaldo con el contenido de la plantilla', async () => {
    const tpl = makeTemplate({
      id: 'tpl-1',
      file: fakeFile(),
      sampleContent: 'BASE DE PLANTILLA 789',
    });
    const rec = makeRecord({ rowId: 'row_0_1' });
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });
    seedData([rec], ['row_0_1']);
    render(<GenerateView />);

    fireEvent.click(screen.getByTestId('dg-mode-diseno'));
    const fallback = await screen.findByTestId('dg-diseno-fallback');
    expect(fallback).toHaveTextContent('BASE DE PLANTILLA 789');
  });

  it('respaldo sin texto de muestra lista los datos del registro', async () => {
    const tpl = makeTemplate({ id: 'tpl-1', file: fakeFile(), sampleContent: '' });
    const rec = makeRecord({ rowId: 'row_0_1', nombreSolicitante: 'Carlos Ruiz' });
    useTemplateStore.setState({ templates: [tpl], selectedTemplate: tpl });
    seedData([rec], ['row_0_1']);
    render(<GenerateView />);

    const fallback = await screen.findByTestId('dg-fallback-content');
    expect(fallback).toHaveTextContent('Datos del registro');
    expect(fallback).toHaveTextContent('Carlos Ruiz');
  });
});

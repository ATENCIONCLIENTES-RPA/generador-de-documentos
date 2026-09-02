import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import TemplatesView from '@/views/TemplatesView';
import { useTemplateStore } from '@/store/templateStore';
import { useDataStore } from '@/store/dataStore';
import { useNavigationStore } from '@/store/navigationStore';
import type { Template } from '@/types/template';
import type { Record as EssaRecord } from '@/types/record';

vi.mock('docx-preview', () => ({
  renderAsync: vi.fn(async () => {}),
}));

if (typeof globalThis.ResizeObserver === 'undefined') {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

function makeTemplate(overrides: Partial<Template> & { id: string }): Template {
  return {
    id: overrides.id,
    title: overrides.title ?? `Plantilla ${overrides.id}`,
    category: overrides.category ?? 'Documentos',
    description: overrides.description ?? 'Descripción de prueba',
    fileName: overrides.fileName ?? `${overrides.id}.docx`,
    variables: overrides.variables ?? [
      { key: 'NOMBRE_SOLICITANTE', label: 'Nombre Solicitante', type: 'Texto', source: 'Excel' },
      { key: 'RADICADO_ENTRADA', label: 'Radicado', type: 'Texto', source: 'Excel' },
    ],
    sampleContent:
      overrides.sampleContent ?? 'Estimado [NOMBRE_SOLICITANTE] radicado [RADICADO_ENTRADA]',
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
  useTemplateStore.setState({ templates: [], selectedTemplate: null });
  useDataStore.setState({
    records: [],
    selectedRows: new Set<string>(),
    templateAssignments: {},
    filterState: { search: '', cuenta: '', proceso: '', radicado: '', fechaSolicitud: '', fechaDesde: '', fechaHasta: '', procesoCreado: 'todos', estadoSemaforo: 'todos', cantProcesos: 'todos', diasPqrFiltro: 'todos' },
    currentPage: 1,
    pageSize: 10,
    editingRecord: null,
  });
  useNavigationStore.setState({ currentStep: 'plantillas', completed: new Set() });
}

describe('TemplatesView — M4 3-panel layout', () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  it('muestra empty state cuando no hay plantillas', () => {
    render(<TemplatesView />);
    expect(screen.getByTestId('tv-empty')).toBeInTheDocument();
    expect(screen.getByText(/No hay plantillas disponibles/)).toBeInTheDocument();
    expect(screen.getByTestId('tv-go-config')).toBeInTheDocument();
  });

  it('muestra loading state cuando loading=true', () => {
    render(<TemplatesView loading />);
    expect(screen.getByTestId('tv-loading')).toBeInTheDocument();
    expect(screen.getByText(/Cargando plantillas/)).toBeInTheDocument();
  });

  it('muestra contenido alternativo cuando docx-preview falla', async () => {
    const t1 = makeTemplate({
      id: 'tpl-preview-fallback',
      title: 'Plantilla con falla de render',
      file: new File(['docx'], 'plantilla.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
      sampleContent: 'Estimado [NOMBRE_SOLICITANTE] radicado [RADICADO_ENTRADA]',
    });
    const rec = makeRecord({ rowId: 'row_fallback', nombreSolicitante: 'Laura Gómez', radicadoEntrada: 'RAD-777' });

    useTemplateStore.setState({ templates: [t1], selectedTemplate: t1 });
    useDataStore.setState({
      records: [rec] as unknown as EssaRecord[],
      selectedRows: new Set(['row_fallback']),
      templateAssignments: {},
      filterState: { search: '', cuenta: '', proceso: '', radicado: '', fechaSolicitud: '', fechaDesde: '', fechaHasta: '', procesoCreado: 'todos', estadoSemaforo: 'todos', cantProcesos: 'todos', diasPqrFiltro: 'todos' },
      currentPage: 1,
      pageSize: 10,
      editingRecord: null,
    });

    const { renderAsync } = await import('docx-preview');
    vi.mocked(renderAsync).mockRejectedValueOnce(new Error('preview fail'));

    render(<TemplatesView />);

    await waitFor(() => expect(screen.getByTestId('tv-fallback-content')).toHaveTextContent('Laura Gómez'));
    expect(screen.getByTestId('tv-fallback-content')).toHaveTextContent('RAD-777');
  });

  it('renderiza lista de plantillas mostrando nombre y conteo', () => {
    const t1 = makeTemplate({
      id: 'tpl-1',
      title: 'Bloqueo de Cuenta',
      category: 'Cartas',
      sampleContent: 'Hola [NOMBRE_SOLICITANTE] contenido largo de ejemplo para preview truncation',
    });
    const t2 = makeTemplate({
      id: 'tpl-2',
      title: 'Contrato ESSA',
      category: 'Contratos',
      variables: [{ key: 'NUMERO_CUENTA', label: 'Cuenta', type: 'Texto', source: 'Excel' }],
      sampleContent: 'Contrato [NUMERO_CUENTA]',
    });
    useTemplateStore.setState({ templates: [t1, t2], selectedTemplate: null });
    render(<TemplatesView />);

    expect(screen.getByTestId('tv-list')).toBeInTheDocument();
    expect(screen.getByTestId('tv-count')).toHaveTextContent('2');
    expect(screen.getByTestId('tv-title-tpl-1')).toHaveTextContent('Bloqueo de Cuenta');
    expect(screen.getByTestId('tv-title-tpl-2')).toHaveTextContent('Contrato ESSA');
    expect(screen.getByTestId('tv-card-tpl-1')).toBeInTheDocument();
    expect(screen.getByTestId('tv-card-tpl-2')).toBeInTheDocument();
  });

  it('click seleccionar plantilla → preview panel y variable tags', async () => {
    const t1 = makeTemplate({
      id: 'tpl-1',
      title: 'Bloqueo',
      sampleContent: 'Hola [NOMBRE_SOLICITANTE] radicado [RADICADO_ENTRADA]',
    });
    useTemplateStore.setState({ templates: [t1], selectedTemplate: null });
    const rec = makeRecord({
      rowId: 'row_0_1',
      nombreSolicitante: 'María López',
      radicadoEntrada: 'RAD-999',
    });
    useDataStore.setState({
      records: [rec] as unknown as EssaRecord[],
      selectedRows: new Set(['row_0_1']),
      templateAssignments: {},
      filterState: { search: '', cuenta: '', proceso: '', radicado: '', fechaSolicitud: '', fechaDesde: '', fechaHasta: '', procesoCreado: 'todos', estadoSemaforo: 'todos', cantProcesos: 'todos', diasPqrFiltro: 'todos' },
      currentPage: 1,
      pageSize: 10,
      editingRecord: null,
    });

    render(<TemplatesView />);

    expect(screen.getByTestId('tv-preview-empty')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tv-card-tpl-1'));
    expect(useTemplateStore.getState().selectedTemplate?.id).toBe('tpl-1');

    expect(screen.getByTestId('tv-preview-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('tv-preview-document')).toBeInTheDocument();
    expect(screen.getByTestId('tv-variables')).toBeInTheDocument();
    expect(screen.getByTestId('tv-var-NOMBRE_SOLICITANTE')).toBeInTheDocument();
    expect(screen.getByTestId('tv-var-RADICADO_ENTRADA')).toBeInTheDocument();
    expect(screen.getByTestId('tv-fallback-content')).toHaveTextContent('María López');
    expect(screen.getByTestId('tv-fallback-content')).toHaveTextContent('RAD-999');
    expect(screen.queryByTestId('tv-preview-empty')).not.toBeInTheDocument();
  });

  it('filtra plantillas por buscador de nombre', async () => {
    const t1 = makeTemplate({ id: 'tpl-1', title: 'Carta Bloqueo' });
    const t2 = makeTemplate({ id: 'tpl-2', title: 'Contrato Comercial' });
    useTemplateStore.setState({ templates: [t1, t2], selectedTemplate: null });
    render(<TemplatesView />);

    const searchInput = screen.getByTestId('tv-search-input');
    fireEvent.change(searchInput, { target: { value: 'Bloqueo' } });
    expect(screen.getByTestId('tv-card-tpl-1')).toBeInTheDocument();
    expect(screen.queryByTestId('tv-card-tpl-2')).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'Inexistente' } });
    expect(screen.getByTestId('tv-empty-search')).toBeInTheDocument();
  });

  it('preview centrado: scroll interno y centrado flexbox', async () => {
    const t1 = makeTemplate({ id: 'tpl-1', title: 'Tpl A' });
    useTemplateStore.setState({ templates: [t1], selectedTemplate: t1 });
    render(<TemplatesView />);

    const viewer = screen.getByTestId('tv-preview-viewer');
    const doc = screen.getByTestId('tv-preview-document');

    expect(viewer).toBeInTheDocument();

    expect(doc.getAttribute('data-centered')).toBe('true');

    expect(screen.queryByText(/toolbar/i)).not.toBeInTheDocument();
  });

  it('usa datos reales seleccionados para vista previa (selectedRecords)', async () => {
    const t1 = makeTemplate({
      id: 'tpl-1',
      sampleContent: 'Cliente [NOMBRE_SOLICITANTE] cuenta [NUMERO_CUENTA]',
    });
    const rec1 = makeRecord({
      rowId: 'row_0_1',
      nombreSolicitante: 'Ana Torres',
      numeroCuenta: '111',
    });
    const rec2 = makeRecord({
      rowId: 'row_1_1',
      nombreSolicitante: 'Carlos Ruiz',
      numeroCuenta: '222',
    });
    useTemplateStore.setState({ templates: [t1], selectedTemplate: t1 });
    useDataStore.setState({
      records: [rec1, rec2] as unknown as EssaRecord[],
      selectedRows: new Set(['row_1_1']),
      templateAssignments: {},
      filterState: { search: '', cuenta: '', proceso: '', radicado: '', fechaSolicitud: '', fechaDesde: '', fechaHasta: '', procesoCreado: 'todos', estadoSemaforo: 'todos', cantProcesos: 'todos', diasPqrFiltro: 'todos' },
      currentPage: 1,
      pageSize: 10,
      editingRecord: null,
    });
    render(<TemplatesView />);
    expect(screen.getByTestId('tv-fallback-content')).toHaveTextContent('Carlos Ruiz');
    expect(screen.getByTestId('tv-fallback-content')).toHaveTextContent('222');
    expect(screen.getByTestId('tv-preview-record')).toHaveTextContent('Carlos Ruiz');
  });

  it('botón Continuar deshabilitado hasta que todos los registros tengan plantilla asignada', async () => {
    const t1 = makeTemplate({ id: 'tpl-1', title: 'Mi Plantilla' });
    const rec = makeRecord({ rowId: 'row_assign', nombreSolicitante: 'Pedro López' });
    useTemplateStore.setState({ templates: [t1], selectedTemplate: null });
    useDataStore.setState({
      records: [rec] as unknown as EssaRecord[],
      selectedRows: new Set(['row_assign']),
      templateAssignments: {},
      filterState: { search: '', cuenta: '', proceso: '', radicado: '', fechaSolicitud: '', fechaDesde: '', fechaHasta: '', procesoCreado: 'todos', estadoSemaforo: 'todos', cantProcesos: 'todos', diasPqrFiltro: 'todos' },
      currentPage: 1,
      pageSize: 10,
      editingRecord: null,
    });

    render(<TemplatesView />);

    const btn = screen.getByTestId('tv-continuar') as HTMLButtonElement;
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent(/Continuar a Generación/);
    fireEvent.click(btn);
    expect(useNavigationStore.getState().currentStep).toBe('plantillas');

    fireEvent.click(screen.getByTestId('tv-card-tpl-1'));

    fireEvent.click(screen.getByTestId('tv-record-row_assign'));

    fireEvent.click(screen.getByTestId('tv-assign-btn'));

    const btn2 = screen.getByTestId('tv-continuar') as HTMLButtonElement;
    expect(btn2).toBeEnabled();

    const actions = screen.getByTestId('tv-actions');
    expect(actions.style.justifyContent).toBe('space-between');

    fireEvent.click(btn2);
    expect(useNavigationStore.getState().completed.has('plantillas')).toBe(true);
    expect(useNavigationStore.getState().currentStep).toBe('generacion');
  });

  it('selección de plantilla muestra check visual y aria-pressed', () => {
    const t1 = makeTemplate({ id: 'tpl-1' });
    const t2 = makeTemplate({ id: 'tpl-2' });
    useTemplateStore.setState({ templates: [t1, t2], selectedTemplate: null });
    render(<TemplatesView />);

    fireEvent.click(screen.getByTestId('tv-card-tpl-1'));
    const card1 = screen.getByTestId('tv-card-tpl-1');
    expect(card1.getAttribute('aria-pressed')).toBe('true');
    expect(card1.style.borderColor).toMatch(/004b93|rgb\(0,\s*75,\s*147\)/);

    fireEvent.click(screen.getByTestId('tv-card-tpl-2'));
    expect(screen.getByTestId('tv-card-tpl-2').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('tv-card-tpl-1').getAttribute('aria-pressed')).toBe('false');
  });

  it('muestra layout 3 paneles y estructura de preview', () => {
    const t1 = makeTemplate({ id: 'tpl-1' });
    useTemplateStore.setState({ templates: [t1], selectedTemplate: null });
    render(<TemplatesView />);
    expect(screen.getByTestId('tv-layout')).toBeInTheDocument();
    expect(screen.getByTestId('tv-preview-panel')).toBeInTheDocument();
    expect(screen.getByTestId('tv-records-panel')).toBeInTheDocument();
    expect(screen.getByTestId('tv-volver')).toBeInTheDocument();
  });
});

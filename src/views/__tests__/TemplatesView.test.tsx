import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import TemplatesView from '@/views/TemplatesView';
import { useTemplateStore } from '@/store/templateStore';
import { useDataStore } from '@/store/dataStore';
import { useNavigationStore } from '@/store/navigationStore';
import type { Template } from '@/types/template';
import type { Record as EssaRecord } from '@/types/record';

vi.mock('docx-preview', () => ({
  renderAsync: vi.fn(async () => {}),
}));

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
    filterState: { search: '', cuenta: '', proceso: '', radicado: '', fechaSolicitud: '' },
    currentPage: 1,
    pageSize: 10,
    editingRecord: null,
  });
  useNavigationStore.setState({ currentStep: 'plantillas', completed: new Set() });
}

describe('TemplatesView — M4 preview fixes', () => {
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

  it('renderiza lista de plantillas con título, categoría, variable count y sampleContent preview', () => {
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
    expect(screen.getByTestId('tv-count')).toHaveTextContent(/2 plantillas/);
    // title
    expect(screen.getByTestId('tv-title-tpl-1')).toHaveTextContent('Bloqueo de Cuenta');
    expect(screen.getByTestId('tv-title-tpl-2')).toHaveTextContent('Contrato ESSA');
    // category
    expect(screen.getByTestId('tv-category-tpl-1')).toHaveTextContent('Cartas');
    expect(screen.getByTestId('tv-varcount-tpl-1')).toHaveTextContent('2 var');
    expect(screen.getByTestId('tv-varcount-tpl-2')).toHaveTextContent('1 var');
    // sample preview truncated
    expect(screen.getByTestId('tv-sample-tpl-1')).toBeInTheDocument();
    // cards present
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
    // seed a record and select it
    const rec = makeRecord({
      rowId: 'row_0_1',
      nombreSolicitante: 'María López',
      radicadoEntrada: 'RAD-999',
    });
    useDataStore.setState({
      records: [rec] as unknown as EssaRecord[],
      selectedRows: new Set(['row_0_1']),
      filterState: { search: '', cuenta: '', proceso: '', radicado: '', fechaSolicitud: '' },
      currentPage: 1,
      pageSize: 10,
      editingRecord: null,
    });

    render(<TemplatesView />);

    // initially no preview, empty placeholder
    expect(screen.getByTestId('tv-preview-empty')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tv-card-tpl-1'));
    // store updated
    expect(useTemplateStore.getState().selectedTemplate?.id).toBe('tpl-1');

    // preview viewer appears
    expect(screen.getByTestId('tv-preview-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('tv-preview-document')).toBeInTheDocument();
    // variable tags
    expect(screen.getByTestId('tv-variables')).toBeInTheDocument();
    expect(screen.getByTestId('tv-var-NOMBRE_SOLICITANTE')).toBeInTheDocument();
    expect(screen.getByTestId('tv-var-RADICADO_ENTRADA')).toBeInTheDocument();
    // fallback content contains fused data (replaceTemplateVariables)
    expect(screen.getByTestId('tv-fallback-content')).toHaveTextContent('María López');
    expect(screen.getByTestId('tv-fallback-content')).toHaveTextContent('RAD-999');
    // no longer empty placeholder
    expect(screen.queryByTestId('tv-preview-empty')).not.toBeInTheDocument();
  });

  it('preview centrado: margin 0 auto, max-width 560px, background #F5F5F7, scroll vertical interno', async () => {
    const t1 = makeTemplate({ id: 'tpl-1', title: 'Tpl A' });
    useTemplateStore.setState({ templates: [t1], selectedTemplate: t1 });
    render(<TemplatesView />);

    const viewer = screen.getByTestId('tv-preview-viewer');
    const doc = screen.getByTestId('tv-preview-document');

    // viewer scroll vertical only, background #F5F5F7
    expect(viewer).toBeInTheDocument();
    const viewerStyle = viewer.style;
    // background must be #F5F5F7 (either hex or rgb)
    const viewerBg = viewerStyle.background || viewerStyle.backgroundColor;
    expect(viewerBg.toLowerCase()).toContain('245'); // 245 from #F5
    // overflowY auto
    expect(viewerStyle.overflowY).toBe('auto');
    expect(viewerStyle.overflowX).toBe('hidden');

    // document centered
    const docStyle = doc.style;
    expect(docStyle.margin).toBe('0px auto');
    // maxWidth 560px
    expect(docStyle.maxWidth).toBe('560px');
    // background #F5F5F7 on document wrapper (per spec)
    const docBg = docStyle.background || docStyle.backgroundColor;
    // allow either #F5F5F7 rgb 245,245,247
    expect(docBg.replace(/\s/g, '').toLowerCase()).toMatch(/245,245,247|#f5f5f7|rgb\(245/);
    // verify centered attribute
    expect(doc.getAttribute('data-centered')).toBe('true');

    // sin toolbar gris — ensure no element with gray toolbar text in preview
    expect(screen.queryByText(/toolbar/i)).not.toBeInTheDocument();
    // ensure no gray header bar element (we removed)
    const grayHeaders = viewer.querySelectorAll(
      '[style*="background: #e5e7eb"], [style*="background:#e5e7eb"]'
    );
    expect(grayHeaders.length).toBe(0);
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
      filterState: { search: '', cuenta: '', proceso: '', radicado: '', fechaSolicitud: '' },
      currentPage: 1,
      pageSize: 10,
      editingRecord: null,
    });
    render(<TemplatesView />);
    // preview should use row_1_1 (Carlos Ruiz) because selectedRows
    expect(screen.getByTestId('tv-fallback-content')).toHaveTextContent('Carlos Ruiz');
    expect(screen.getByTestId('tv-fallback-content')).toHaveTextContent('222');
    expect(screen.getByTestId('tv-preview-record')).toHaveTextContent('Carlos Ruiz');
  });

  it('botón Continuar bottom-right deshabilitado sin selección y navega correctamente', async () => {
    const t1 = makeTemplate({ id: 'tpl-1' });
    useTemplateStore.setState({ templates: [t1], selectedTemplate: null });
    render(<TemplatesView />);
    const btn = screen.getByTestId('tv-continuar') as HTMLButtonElement;
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent(/Continuar a Generación/);
    // clicking disabled should not navigate
    fireEvent.click(btn);
    expect(useNavigationStore.getState().currentStep).toBe('plantillas');

    // select and click
    fireEvent.click(screen.getByTestId('tv-card-tpl-1'));
    const btn2 = screen.getByTestId('tv-continuar') as HTMLButtonElement;
    expect(btn2).toBeEnabled();
    // ensure bottom-right alignment via marginLeft auto
    expect(btn2.style.marginLeft).toBe('auto');
    // actions container should be flex justify space-between / end
    const actions = screen.getByTestId('tv-actions');
    expect(actions.style.display).toBe('flex');
    expect(actions.style.justifyContent).toBe('space-between');

    fireEvent.click(btn2);
    expect(useNavigationStore.getState().completed.has('plantillas')).toBe(true);
    expect(useNavigationStore.getState().currentStep).toBe('generacion');
    // alias label also contains Vista Previa
    expect(screen.getByTestId('tv-continuar-alias')).toHaveTextContent(/Continuar a Vista Previa/);
  });

  it('selección cambia border y check', () => {
    const t1 = makeTemplate({ id: 'tpl-1' });
    const t2 = makeTemplate({ id: 'tpl-2' });
    useTemplateStore.setState({ templates: [t1, t2], selectedTemplate: null });
    render(<TemplatesView />);
    fireEvent.click(screen.getByTestId('tv-card-tpl-1'));
    const card1 = screen.getByTestId('tv-card-tpl-1');
    expect(card1.getAttribute('data-selected')).toBe('true');
    expect(card1.style.border.toLowerCase()).toMatch(/004b93|rgb\(0,\s*75,\s*147\)/);
    expect(screen.getByTestId('tv-check-tpl-1')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tv-card-tpl-2'));
    expect(screen.getByTestId('tv-card-tpl-2').getAttribute('data-selected')).toBe('true');
    expect(screen.getByTestId('tv-card-tpl-1').getAttribute('data-selected')).toBe('false');
  });

  it('muestra grid 5/7 y preview panel structure', () => {
    const t1 = makeTemplate({ id: 'tpl-1' });
    useTemplateStore.setState({ templates: [t1], selectedTemplate: null });
    render(<TemplatesView />);
    expect(screen.getByTestId('tv-grid')).toBeInTheDocument();
    expect(screen.getByTestId('tv-preview-panel')).toBeInTheDocument();
    // Volver button exists
    expect(screen.getByTestId('tv-volver')).toBeInTheDocument();
  });
});

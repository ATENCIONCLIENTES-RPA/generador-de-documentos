import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ConfigView from '@/views/ConfigView';
import { useExcelStore } from '@/store/excelStore';
import { useNavigationStore } from '@/store/navigationStore';
import { useTemplateStore } from '@/store/templateStore';

// Mock excelParser to avoid real xlsx parsing in unit test
vi.mock('@/utils/excelParser', () => ({
  parseExcelFile: vi.fn(async () => [{ rowId: 'row_0_1', id: 1, numeroCuenta: '123' }]),
  getExcelCellValue: vi.fn(() => ''),
  formatExcelDate: vi.fn((v) => String(v ?? '')),
  buildRecord: vi.fn((row, i) => ({ rowId: `row_${i}_1`, id: i + 1, ...row })),
}));

vi.mock('@/utils/docxHelpers', () => ({
  parseDocxFile: vi.fn(async () => 'contenido [NOMBRE_SOLICITANTE]'),
  extractTemplateVariables: vi.fn(() => [
    { key: 'NOMBRE_SOLICITANTE', label: 'Nombre Solicitante', type: 'Texto', source: 'Excel' },
  ]),
  fileToTemplate: vi.fn(async (file: File, i: number) => ({
    id: `tpl-file-${i}-${file.name}`,
    title: file.name.replace(/\.docx$/i, ''),
    category: 'Documentos',
    description: 'mock template',
    fileName: file.name,
    variables: [
      { key: 'NOMBRE_SOLICITANTE', label: 'Nombre Solicitante', type: 'Texto', source: 'Excel' },
    ],
    sampleContent: 'contenido [NOMBRE_SOLICITANTE]',
    file,
  })),
}));

function resetStores() {
  useExcelStore.getState().clearAll();
  useNavigationStore.getState().reset();
  useTemplateStore.getState().clearTemplates();
  // ensure allReady false initially
}

describe('ConfigView allReady gate', () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  it('deshabilita Continuar hasta allReady (estado inicial)', () => {
    render(<ConfigView />);
    const btn = screen.getByTestId('m2-continuar');
    expect(btn).toBeDisabled();
    expect(screen.getByText(/Faltan recursos por cargar/)).toBeInTheDocument();
  });

  it('muestra hero y grid genial', () => {
    render(<ConfigView />);
    expect(screen.getByTestId('m2-hero')).toBeInTheDocument();
    expect(screen.getByTestId('m2-grid')).toBeInTheDocument();
    expect(screen.getByText(/MÓDULO 2: CONFIGURACIÓN DE RECURSOS/)).toBeInTheDocument();
    expect(screen.getByText('Archivo SAC')).toBeInTheDocument();
    expect(screen.getByText('Archivo Mercurio')).toBeInTheDocument();
    expect(screen.getByText('Carpeta de Plantillas')).toBeInTheDocument();
    expect(screen.getByTestId('m2-progress-track')).toBeInTheDocument();
    // 3 segments
    expect(screen.getByTestId('m2-segment-0')).toBeInTheDocument();
    expect(screen.getByTestId('m2-segment-1')).toBeInTheDocument();
    expect(screen.getByTestId('m2-segment-2')).toBeInTheDocument();
  });

  it('habilita Continuar cuando allReady es true', () => {
    // set all three resources ready via store directly
    const sac = {
      file: new File(['a'], 'sac.xlsx'),
      loading: false,
      progress: 100,
      error: null,
      recordCount: 5,
    };
    const mercurio = {
      file: new File(['b'], 'mercurio.xlsx'),
      loading: false,
      progress: 100,
      error: null,
      recordCount: 3,
    };
    const folder = {
      file: new File(['c'], 'Plantillas'),
      loading: false,
      progress: 100,
      error: null,
      recordCount: 4,
    };

    useExcelStore.getState().setSacFile(sac);
    useExcelStore.getState().setMercurioFile(mercurio);
    useExcelStore.getState().setTemplateFolder(folder);

    render(<ConfigView />);
    const btn = screen.getByTestId('m2-continuar');
    expect(btn).toBeEnabled();
    expect(screen.queryByText(/Faltan recursos por cargar/)).not.toBeInTheDocument();
  });

  it('deshabilita Continuar si algún recurso tiene error o loading', () => {
    const sac = {
      file: new File(['a'], 'sac.xlsx'),
      loading: false,
      progress: 100,
      error: null,
      recordCount: 5,
    };
    const mercurio = {
      file: new File(['b'], 'mercurio.xlsx'),
      loading: true,
      progress: 42,
      error: null,
      recordCount: 0,
    };
    const folder = {
      file: new File(['c'], 'Plantillas'),
      loading: false,
      progress: 100,
      error: null,
      recordCount: 2,
    };

    useExcelStore.getState().setSacFile(sac);
    useExcelStore.getState().setMercurioFile(mercurio);
    useExcelStore.getState().setTemplateFolder(folder);

    render(<ConfigView />);
    expect(screen.getByTestId('m2-continuar')).toBeDisabled();
  });

  it('Cancelar limpia y navega a inicio', async () => {
    const sac = {
      file: new File(['a'], 'sac.xlsx'),
      loading: false,
      progress: 100,
      error: null,
      recordCount: 5,
    };
    useExcelStore.getState().setSacFile(sac);
    render(<ConfigView />);
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.click(screen.getByTestId('m2-cancelar'));
    expect(useExcelStore.getState().sacFile).toBeNull();
    expect(useNavigationStore.getState().currentStep).toBe('inicio');
  });

  it('C1: hidrata templateStore tras seleccionar carpeta con .docx (M2 -> M4 wiring)', async () => {
    const { fireEvent } = await import('@testing-library/react');
    render(<ConfigView />);
    const input = screen.getByTestId('m2-input-folder') as HTMLInputElement;

    const docx1 = new File(['docx1'], 'plantilla1.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const docx2 = new File(['docx2'], 'plantilla2.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const txt = new File(['txt'], 'readme.txt', { type: 'text/plain' });
    // Simulate webkitRelativePath for folder name
    Object.defineProperty(docx1, 'webkitRelativePath', { value: 'Plantillas/plantilla1.docx' });
    Object.defineProperty(docx2, 'webkitRelativePath', { value: 'Plantillas/plantilla2.docx' });
    Object.defineProperty(txt, 'webkitRelativePath', { value: 'Plantillas/readme.txt' });

    // JSDOM FileList mock: define files property and dispatch change
    Object.defineProperty(input, 'files', { value: [docx1, docx2, txt], writable: false });
    fireEvent.change(input);

    await waitFor(() => {
      expect(useTemplateStore.getState().templates.length).toBe(2);
    });
    expect(useTemplateStore.getState().templates[0].fileName).toBe('plantilla1.docx');
    expect(useTemplateStore.getState().templates[1].fileName).toBe('plantilla2.docx');
    // first is selected
    expect(useTemplateStore.getState().selectedTemplate?.id).toBe(
      useTemplateStore.getState().templates[0].id
    );
    // excelStore folder recordCount reflects docx count
    expect(useExcelStore.getState().templateFolder?.recordCount).toBe(2);
    // M2 ya no renderiza la lista detallada — solo la tarjeta de carpeta en estado LISTO (verificada en M4)
    expect(screen.queryByTestId('m2-templates-list')).not.toBeInTheDocument();
    expect(screen.getByText('Carpeta de Plantillas')).toBeInTheDocument();
  });

  it('C1: no hidrata templateStore si carpeta no tiene .docx', async () => {
    const { fireEvent } = await import('@testing-library/react');
    render(<ConfigView />);
    const input = screen.getByTestId('m2-input-folder') as HTMLInputElement;
    const txt = new File(['txt'], 'readme.txt', { type: 'text/plain' });
    Object.defineProperty(txt, 'webkitRelativePath', { value: 'Plantillas/readme.txt' });
    Object.defineProperty(input, 'files', { value: [txt], writable: false });
    fireEvent.change(input);
    // wait a tick for async handler to clear
    await waitFor(() => {
      expect(useTemplateStore.getState().templates.length).toBe(0);
    });
    expect(useExcelStore.getState().templateFolder?.error).toEqual(
      expect.stringContaining('No se encontraron plantillas')
    );
  });
});

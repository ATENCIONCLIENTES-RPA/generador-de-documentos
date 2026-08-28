import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConfigView from '@/views/ConfigView';
import { useExcelStore } from '@/store/excelStore';
import { useNavigationStore } from '@/store/navigationStore';

// Mock excelParser to avoid real xlsx parsing in unit test
vi.mock('@/utils/excelParser', () => ({
  parseExcelFile: vi.fn(async () => [{ rowId: 'row_0_1', id: 1, numeroCuenta: '123' }]),
  getExcelCellValue: vi.fn(() => ''),
  formatExcelDate: vi.fn((v) => String(v ?? '')),
  buildRecord: vi.fn((row, i) => ({ rowId: `row_${i}_1`, id: i + 1, ...row })),
}));

function resetStores() {
  useExcelStore.getState().clearAll();
  useNavigationStore.getState().reset();
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
    const sac = { file: new File(['a'], 'sac.xlsx'), loading: false, progress: 100, error: null, recordCount: 5 };
    const mercurio = { file: new File(['b'], 'mercurio.xlsx'), loading: false, progress: 100, error: null, recordCount: 3 };
    const folder = { file: new File(['c'], 'Plantillas'), loading: false, progress: 100, error: null, recordCount: 4 };

    useExcelStore.getState().setSacFile(sac);
    useExcelStore.getState().setMercurioFile(mercurio);
    useExcelStore.getState().setTemplateFolder(folder);

    render(<ConfigView />);
    const btn = screen.getByTestId('m2-continuar');
    expect(btn).toBeEnabled();
    expect(screen.queryByText(/Faltan recursos por cargar/)).not.toBeInTheDocument();
  });

  it('deshabilita Continuar si algún recurso tiene error o loading', () => {
    const sac = { file: new File(['a'], 'sac.xlsx'), loading: false, progress: 100, error: null, recordCount: 5 };
    const mercurio = { file: new File(['b'], 'mercurio.xlsx'), loading: true, progress: 42, error: null, recordCount: 0 };
    const folder = { file: new File(['c'], 'Plantillas'), loading: false, progress: 100, error: null, recordCount: 2 };

    useExcelStore.getState().setSacFile(sac);
    useExcelStore.getState().setMercurioFile(mercurio);
    useExcelStore.getState().setTemplateFolder(folder);

    render(<ConfigView />);
    expect(screen.getByTestId('m2-continuar')).toBeDisabled();
  });

  it('Cancelar limpia y navega a inicio', async () => {
    const sac = { file: new File(['a'], 'sac.xlsx'), loading: false, progress: 100, error: null, recordCount: 5 };
    useExcelStore.getState().setSacFile(sac);
    render(<ConfigView />);
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.click(screen.getByTestId('m2-cancelar'));
    expect(useExcelStore.getState().sacFile).toBeNull();
    expect(useNavigationStore.getState().currentStep).toBe('inicio');
  });
});

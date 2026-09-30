import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecordSearchBar } from '@/components/features/RecordSearchBar';
import { useDataStore } from '@/store/dataStore';
import { useTemplateStore } from '@/store/templateStore';
import type { Record as EssaRecord } from '@/types/record';
import type { Template } from '@/types/template';

function makeRecord(overrides: Partial<EssaRecord> & { rowId: string }): EssaRecord {
  return {
    id: overrides.rowId,
    status: 'Pendiente',
    selected: false,
    fechaSolicitud: '2026-08-27',
    fechaVencimiento: '2026-09-27',
    numeroProceso: 'PROC-100',
    radicadoEntrada: 'RAD-999',
    nombreSolicitante: 'Carlos Mendoza',
    cedulaSolicitante: '1098765432',
    direccionSolicitante: 'Carrera 15 # 45-20',
    departamentoSolicitante: 'Santander',
    municipioSolicitante: 'Bucaramanga',
    correoSolicitante: 'carlos@example.com',
    numeroCuenta: '400500',
    cuenta: '400500',
    tipoProceso: 'Reclamación Facturación',
    RADICADO_SALIDA: 'SAL-001',
    ...overrides,
  } as EssaRecord;
}

function seed(records: EssaRecord[], selectedRows: string[] = []) {
  useDataStore.setState({
    records: records as unknown as EssaRecord[],
    selectedRows: new Set(selectedRows),
    templateAssignments: {},
  });
}

describe('RecordSearchBar — Buscador de Registros en Módulo 3', () => {
  beforeEach(() => {
    seed([]);
    useTemplateStore.setState({ templates: [], selectedTemplate: null });
  });

  it('renderiza la barra de búsqueda y el aviso de ningún registro seleccionado si no hay selección', () => {
    seed([makeRecord({ rowId: 'row_1' })], []);
    render(<RecordSearchBar />);

    expect(screen.getByTestId('dg-record-search')).toBeInTheDocument();
    expect(screen.getByTestId('dg-record-search-input')).toBeInTheDocument();
    expect(screen.getByTestId('dg-record-unselected-badge')).toBeInTheDocument();
    expect(screen.getByText('Ningún registro seleccionado')).toBeInTheDocument();
  });

  it('muestra el badge con datos del registro activo cuando hay uno seleccionado', () => {
    seed(
      [
        makeRecord({
          rowId: 'row_1',
          radicadoEntrada: '20260320045286',
          numeroCuenta: '778899',
          nombreSolicitante: 'MARIA PAULA GOMEZ',
        }),
      ],
      ['row_1']
    );
    render(<RecordSearchBar />);

    expect(screen.getByTestId('dg-record-active-badge')).toBeInTheDocument();
    expect(screen.getByText('20260320045286')).toBeInTheDocument();
    expect(screen.getByText('Registro activo:')).toBeInTheDocument();
  });

  it('al escribir filtra por radicado, cuenta o solicitante y al hacer clic selecciona el registro', () => {
    const r1 = makeRecord({
      rowId: 'row_1',
      radicadoEntrada: 'RAD-111',
      numeroCuenta: '1001',
      nombreSolicitante: 'Ana Martínez',
    });
    const r2 = makeRecord({
      rowId: 'row_2',
      radicadoEntrada: 'RAD-222',
      numeroCuenta: '2002',
      nombreSolicitante: 'Bernardo Silva',
    });
    seed([r1, r2], []);
    render(<RecordSearchBar />);

    const input = screen.getByTestId('dg-record-search-input');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Bernardo' } });

    expect(screen.getByTestId('dg-record-dropdown')).toBeInTheDocument();
    expect(screen.getByTestId('dg-record-item-row_2')).toBeInTheDocument();
    expect(screen.queryByTestId('dg-record-item-row_1')).not.toBeInTheDocument();

    // Seleccionar el registro encontrado
    fireEvent.click(screen.getByTestId('dg-record-item-row_2'));

    // Verifica que el registro quedó seleccionado en el store
    expect(useDataStore.getState().selectedRows.has('row_2')).toBe(true);
    expect(useDataStore.getState().selectedRows.size).toBe(1);
    expect(screen.getByTestId('dg-record-active-badge')).toBeInTheDocument();
  });

  it('asigna automáticamente la plantilla seleccionada al elegir un registro', () => {
    const template: Template = {
      id: 'tpl-100',
      title: 'Plantilla Reclamaciones',
      category: 'PQR',
      fileName: 'reclamaciones.docx',
      variables: [],
      sampleContent: '',
    };
    useTemplateStore.setState({ templates: [template], selectedTemplate: template });

    const r1 = makeRecord({ rowId: 'row_1', radicadoEntrada: 'RAD-777' });
    seed([r1], []);
    render(<RecordSearchBar />);

    fireEvent.focus(screen.getByTestId('dg-record-search-input'));
    fireEvent.click(screen.getByTestId('dg-record-item-row_1'));

    expect(useDataStore.getState().selectedRows.has('row_1')).toBe(true);
    expect(useDataStore.getState().templateAssignments['row_1']).toBe('tpl-100');
  });

  it('soporta seleccionar con teclado (Enter)', () => {
    const r1 = makeRecord({ rowId: 'row_1', radicadoEntrada: 'RAD-ENTER' });
    seed([r1], []);
    render(<RecordSearchBar />);

    const input = screen.getByTestId('dg-record-search-input');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(useDataStore.getState().selectedRows.has('row_1')).toBe(true);
  });
});

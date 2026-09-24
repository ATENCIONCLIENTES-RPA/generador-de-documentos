import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { DescriptionsCard } from '@/components/features/DescriptionsCard';
import { useDataStore } from '@/store/dataStore';
import type { Record as EssaRecord } from '@/types/record';

vi.mock('@/utils/textEnhancer', () => ({
  improveText: vi.fn((s: string) => `MEJORADO: ${s}`),
  ensureFullDictionary: vi.fn(async () => {}),
}));

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
    numeroCuenta: '1001',
    cuenta: '1001',
    ...overrides,
  } as EssaRecord;
}

function seed(records: EssaRecord[], selectedRows: string[]) {
  useDataStore.setState({
    records: records as unknown as EssaRecord[],
    selectedRows: new Set(selectedRows),
    templateAssignments: {},
    editingRecord: null,
  });
}

describe('DescriptionsCard — Módulo 4: descripciones + Mejorar texto', () => {
  beforeEach(() => {
    seed([], []);
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra aviso cuando no hay registro seleccionado', () => {
    render(<DescriptionsCard />);
    expect(screen.getByTestId('dg-desc-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('dg-desc-card')).not.toBeInTheDocument();
  });

  it('renderiza los tres campos con los valores del registro', () => {
    seed(
      [
        makeRecord({
          rowId: 'row_1',
          observacionProceso: 'Texto solicitud.',
          observacionRevision: 'Texto insumo.',
          observacionDecision: 'Texto decision.',
        }),
      ],
      ['row_1']
    );
    render(<DescriptionsCard />);

    expect(screen.getByTestId('dg-desc-card')).toBeInTheDocument();
    expect(screen.getByTestId('dg-desc-textarea-proceso')).toHaveValue('Texto solicitud.');
    expect(screen.getByTestId('dg-desc-textarea-insumo')).toHaveValue('Texto insumo.');
    expect(screen.getByTestId('dg-desc-textarea-decision')).toHaveValue('Texto decision.');
    expect(screen.getByTestId('dg-btn-mejorar-proceso')).toBeInTheDocument();
    expect(screen.getByTestId('dg-btn-mejorar-insumo')).toBeInTheDocument();
    expect(screen.getByTestId('dg-btn-mejorar-decision')).toBeInTheDocument();
  });

  it('editar un campo persiste en el store con claves y alias', () => {
    seed([makeRecord({ rowId: 'row_1', observacionProceso: 'Original.' })], ['row_1']);
    render(<DescriptionsCard />);

    fireEvent.change(screen.getByTestId('dg-desc-textarea-proceso'), {
      target: { value: 'Editado en M4.' },
    });

    const updated = useDataStore.getState().records.find((r) => r.rowId === 'row_1');
    expect(updated?.observacionProceso).toBe('Editado en M4.');
    expect((updated as unknown as Record<string, unknown>)['OBSERVACION_PROCESO']).toBe(
      'Editado en M4.'
    );
  });

  it('Mejorar texto mejora la redacción y guarda en el store', async () => {
    const { improveText } = await import('@/utils/textEnhancer');
    seed([makeRecord({ rowId: 'row_1', observacionProceso: 'texto sin formato' })], ['row_1']);
    render(<DescriptionsCard />);

    fireEvent.click(screen.getByTestId('dg-btn-mejorar-proceso'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(vi.mocked(improveText)).toHaveBeenCalledWith('texto sin formato');
    await waitFor(() => {
      expect(screen.getByTestId('dg-desc-textarea-proceso')).toHaveValue(
        'MEJORADO: texto sin formato'
      );
    });
    const updated = useDataStore.getState().records.find((r) => r.rowId === 'row_1');
    expect(updated?.observacionProceso).toBe('MEJORADO: texto sin formato');
    expect(screen.getByText('¡Mejorado!')).toBeInTheDocument();
  });
});

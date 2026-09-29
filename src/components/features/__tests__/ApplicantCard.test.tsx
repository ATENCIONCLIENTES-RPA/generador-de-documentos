import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ApplicantCard } from '@/components/features/ApplicantCard';
import { useDataStore } from '@/store/dataStore';
import type { Record as EssaRecord } from '@/types/record';

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
    RADICADO_SALIDA: 'RAD-SAL-001',
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

describe('ApplicantCard — Módulo 4: información del solicitante', () => {
  beforeEach(() => {
    seed([], []);
  });

  it('muestra aviso cuando no hay registro seleccionado', () => {
    render(<ApplicantCard />);
    expect(screen.getByTestId('dg-applicant-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('dg-applicant-card')).not.toBeInTheDocument();
  });

  it('renderiza los seis campos con los valores del registro', () => {
    seed([makeRecord({ rowId: 'row_1' })], ['row_1']);
    render(<ApplicantCard />);

    expect(screen.getByTestId('dg-applicant-card')).toBeInTheDocument();
    expect(screen.getByTestId('dg-applicant-nombre')).toHaveValue('Juan Pérez');
    expect(screen.getByTestId('dg-applicant-radicado-salida')).toHaveValue('RAD-SAL-001');
    expect(screen.getByTestId('dg-applicant-direccion')).toHaveValue('Calle 1');
    expect(screen.getByTestId('dg-applicant-departamento')).toHaveValue('Santander');
    expect(screen.getByTestId('dg-applicant-municipio')).toHaveValue('Bucaramanga');
    expect(screen.getByTestId('dg-applicant-correo')).toHaveValue('juan@example.com');
  });

  it('editar un campo persiste en el store', () => {
    seed([makeRecord({ rowId: 'row_1' })], ['row_1']);
    render(<ApplicantCard />);

    fireEvent.change(screen.getByTestId('dg-applicant-nombre'), {
      target: { value: 'María López' },
    });
    fireEvent.change(screen.getByTestId('dg-applicant-correo'), {
      target: { value: 'maria@example.com' },
    });

    const updated = useDataStore.getState().records.find((r) => r.rowId === 'row_1');
    expect(updated?.nombreSolicitante).toBe('María López');
    expect(updated?.correoSolicitante).toBe('maria@example.com');
  });

  it('muestra el nombre con la primera letra de cada palabra en mayúscula (persona natural)', () => {
    seed(
      [makeRecord({ rowId: 'row_1', nombreSolicitante: 'TATIANA SUAREZ CALA LEIBY' })],
      ['row_1']
    );
    render(<ApplicantCard />);

    expect(screen.getByTestId('dg-applicant-nombre')).toHaveValue('Tatiana Suarez Cala Leiby');
    // El store conserva el valor original: el formato es de presentación.
    expect(useDataStore.getState().records[0]?.nombreSolicitante).toBe('TATIANA SUAREZ CALA LEIBY');
  });

  it('muestra el nombre formateado aunque el solicitante sea persona jurídica', () => {
    seed([makeRecord({ rowId: 'row_1', nombreSolicitante: 'CONSTRUCTORA XYZ SAS' })], ['row_1']);
    render(<ApplicantCard />);

    expect(screen.getByTestId('dg-applicant-nombre')).toHaveValue('Constructora Xyz');
  });

  it('mientras se escribe solo cambia la caja y al salir conserva el formato completo', () => {
    seed([makeRecord({ rowId: 'row_1', nombreSolicitante: 'SUAREZ CALA TATIANA' })], ['row_1']);
    render(<ApplicantCard />);
    const input = screen.getByTestId('dg-applicant-nombre');

    // Fuera del foco: formato completo, igual que el documento Word.
    expect(input).toHaveValue('Tatiana Suarez Cala');

    // Al enfocar no hay salto: se parte del mismo valor normalizado.
    fireEvent.focus(input);
    expect(input).toHaveValue('Tatiana Suarez Cala');

    // Mientras se escribe, la caja se normaliza en vivo…
    fireEvent.change(input, { target: { value: 'tatiana suarez' } });
    expect(input).toHaveValue('Tatiana Suarez');
    // …y lo que se ve es lo que queda guardado en el registro.
    expect(useDataStore.getState().records[0]?.nombreSolicitante).toBe('Tatiana Suarez');

    // Al salir del foco se mantiene el formato completo.
    fireEvent.blur(input);
    expect(input).toHaveValue('Tatiana Suarez');
  });
});

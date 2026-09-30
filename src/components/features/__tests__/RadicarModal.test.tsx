import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RadicarModal } from '@/components/features/RadicarModal';
import type { Record as EssaRecord } from '@/types/record';

function makeRecord(): EssaRecord {
  return {
    id: 'row_1',
    status: 'Pendiente',
    selected: false,
    fechaSolicitud: '2026-08-27',
    fechaVencimiento: '2026-09-27',
    numeroProceso: 'PROC-001',
    radicadoEntrada: 'RAD-123',
    nombreSolicitante: 'Juan Pérez',
    cedulaSolicitante: '12345',
    direccionSolicitante: 'Calle 1 # 2-3',
    departamentoSolicitante: 'Santander',
    municipioSolicitante: 'Bucaramanga',
    correoSolicitante: 'juan@example.com',
    numeroCuenta: '1001',
    cuenta: '1001',
  } as EssaRecord;
}

describe('RadicarModal — Modal Enviar a Radicar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no se renderiza cuando open es false', () => {
    render(<RadicarModal open={false} onClose={vi.fn()} record={makeRecord()} />);
    expect(screen.queryByTestId('radicar-referencia')).not.toBeInTheDocument();
  });

  it('se abre y carga la referencia generada con los datos del registro', () => {
    render(<RadicarModal open={true} onClose={vi.fn()} record={makeRecord()} />);

    expect(screen.getAllByText('Enviar a Radicar').length).toBeGreaterThanOrEqual(1);
    const textarea = screen.getByTestId('radicar-referencia') as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toContain('Juan Pérez');
    expect(textarea.value).toContain('Calle 1 # 2-3');
    expect(textarea.value).toContain('Bucaramanga');
    expect(textarea.value).toContain('Cuenta No. 1001');
    expect(textarea.value).toContain('Radicado número RAD-123');
  });

  it('permite editar la referencia libremente', () => {
    render(<RadicarModal open={true} onClose={vi.fn()} record={makeRecord()} />);

    const textarea = screen.getByTestId('radicar-referencia');
    fireEvent.change(textarea, { target: { value: 'Texto de referencia modificado manualmente' } });
    expect(textarea).toHaveValue('Texto de referencia modificado manualmente');
  });

  it('el botón Enviar a Radicar abre la URL de SharePoint', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const onClose = vi.fn();
    render(<RadicarModal open={true} onClose={onClose} record={makeRecord()} />);

    const btnEnviar = screen.getByTestId('radicar-enviar');
    fireEvent.click(btnEnviar);

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('sharepoint.com'),
      '_blank',
      'noopener,noreferrer'
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('el botón Cancelar cierra el modal', () => {
    const onClose = vi.fn();
    render(<RadicarModal open={true} onClose={onClose} record={makeRecord()} />);

    fireEvent.click(screen.getByTestId('radicar-cancelar'));
    expect(onClose).toHaveBeenCalled();
  });
});

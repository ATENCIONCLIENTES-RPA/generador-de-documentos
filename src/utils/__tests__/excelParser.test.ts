import { describe, it, expect, vi } from 'vitest';
import * as XLSX from 'xlsx';
import { parseExcelFile, buildRecord } from '../excelParser';

function makeFile(rows: Record<string, unknown>[], fileName = 'test.xlsx'): File {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new File([out], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('excelParser', () => {
  it('buildRecord genera rowId con patrón row_<index>_<timestamp>', () => {
    const rec = buildRecord({ NOMBRE_SOLICITANTE: 'Juan Pérez', NUMERO_CUENTA: '123' }, 0);
    expect(rec.rowId).toMatch(/^row_0_\d+$/);
    expect(rec.nombreSolicitante).toBe('Juan Pérez');
    expect(rec.numeroCuenta).toBe('123');
  });

  it('parseExcelFile filtra NUMERO_CUENTA 0/null', async () => {
    const file = makeFile([
      { NOMBRE_SOLICITANTE: 'A', NUMERO_CUENTA: '123', RADICADO_ENTRADA: 'R1' },
      { NOMBRE_SOLICITANTE: 'B', NUMERO_CUENTA: 0, RADICADO_ENTRADA: 'R2' },
      { NOMBRE_SOLICITANTE: 'C', NUMERO_CUENTA: '', RADICADO_ENTRADA: 'R3' },
      { NOMBRE_SOLICITANTE: 'D', NUMERO_CUENTA: null, RADICADO_ENTRADA: 'R4' },
      { NOMBRE_SOLICITANTE: 'E', NUMERO_CUENTA: '456', RADICADO_ENTRADA: 'R5' },
    ]);
    const records = await parseExcelFile(file);
    expect(records).toHaveLength(2);
    expect(records[0]!.numeroCuenta).toBe('123');
    expect(records[1]!.numeroCuenta).toBe('456');
  });

  it('parseExcelFile genera rowId único por fila y mapea fechas', async () => {
    const file = makeFile([
      {
        NOMBRE_SOLICITANTE: 'Juan Pérez',
        NUMERO_CUENTA: '3001',
        FECHA_SOLICITUD: '2025-05-12',
        FECHA_VENCIMIENTO: '2025-05-27',
        NUMERO_PROCESO: 'PRC-1',
        RADICADO_ENTRADA: 'RAD-1',
      },
    ]);
    const records = await parseExcelFile(file);
    expect(records).toHaveLength(1);
    expect(records[0]!.rowId).toMatch(/^row_0_\d+$/);
    expect(records[0]!.fechaSolicitud).toBe('12/05/2025');
    expect(records[0]!.fechaVencimiento).toBe('27/05/2025');
  });

  it('parseExcelFile maneja vacío', async () => {
    const file = makeFile([]);
    const records = await parseExcelFile(file);
    expect(records).toHaveLength(0);
  });

  it('parseExcelFile normaliza keys case-insensitive', async () => {
    const file = makeFile([{ numero_cuenta: '999', nombre_solicitante: 'Ana' }]);
    const records = await parseExcelFile(file);
    expect(records).toHaveLength(1);
    expect(records[0]!.numeroCuenta).toBe('999');
    expect(records[0]!.nombreSolicitante).toBe('Ana');
  });

  it('parseExcelFile invoca el callback de progreso con etapas y bytes', async () => {
    const progressReports: Array<{ stage: string; progress: number }> = [];
    const file = makeFile([{ NOMBRE_SOLICITANTE: 'Carlos', NUMERO_CUENTA: '101' }]);
    const records = await parseExcelFile(file, (info) => {
      progressReports.push({ stage: info.stage, progress: info.progress });
    });
    expect(records).toHaveLength(1);
    expect(progressReports.length).toBeGreaterThan(0);
    expect(progressReports[0]!.stage).toContain('Iniciando lectura');
    expect(progressReports[progressReports.length - 1]!.progress).toBe(100);
  });
});

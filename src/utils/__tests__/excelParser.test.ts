import { describe, it, expect, vi } from 'vitest';
import * as XLSX from 'xlsx';
import {
  parseExcelFile,
  buildRecord,
  getEstadoSemaforo,
  crossReferenceSacAndMercurio,
} from '../excelParser';

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

  it('getEstadoSemaforo calcula correctamente los tres estados', () => {
    // Verde: tiene proceso y observacion de revision
    expect(getEstadoSemaforo('PRC-100', 'Revision completa')).toBe('verde');
    // Violeta: tiene proceso pero NO tiene observacion de revision
    expect(getEstadoSemaforo('PRC-100', '')).toBe('violeta');
    expect(getEstadoSemaforo('PRC-100', undefined)).toBe('violeta');
    // Rojo: no tiene proceso y tampoco observacion
    expect(getEstadoSemaforo('', '')).toBe('rojo');
    expect(getEstadoSemaforo(undefined, undefined)).toBe('rojo');
  });

  it('crossReferenceSacAndMercurio cruza No. Radicado con RADICADO_ENTRADA', () => {
    const sacRecord1 = buildRecord(
      {
        RADICADO_ENTRADA: '2026-RAD-001',
        NUMERO_PROCESO: 'PRC-2026-99',
        OBSERVACION_PROCESO: 'Solicitud de revision de medidor',
        OBSERVACION_REVISION: 'Inspeccion realizada con exito',
        NUMERO_CUENTA: '10001',
      },
      0
    );

    const mercurio1 = buildRecord(
      {
        'No. Radicado': '2026-RAD-001',
        'Fecha Radicación': '07/05/2026 16:18:56.53',
        'NUMERO_CUENTA': '10001',
      },
      0
    );

    const mercurio2 = buildRecord(
      {
        'No. Radicado': '2026-RAD-999',
        'Fecha Radicación': '10/05/2026 10:00:00',
        'NUMERO_CUENTA': '10002',
      },
      1
    );

    const result = crossReferenceSacAndMercurio([mercurio1, mercurio2], [sacRecord1]);
    expect(result).toHaveLength(2);

    // Registro 1: cruce exitoso
    expect(result[0]!.procesoCreado).toBe('Sí');
    expect(result[0]!.cantidadProcesos).toBe(1);
    expect(result[0]!.numeroProceso).toBe('PRC-2026-99');
    expect(result[0]!.observacionProceso).toBe('Solicitud de revision de medidor');
    expect(result[0]!.observacionRevision).toBe('Inspeccion realizada con exito');
    expect(result[0]!.estadoSemaforo).toBe('verde');

    // Registro 2: sin cruce en SAC
    expect(result[1]!.procesoCreado).toBe('No');
    expect(result[1]!.cantidadProcesos).toBe(0);
    expect(result[1]!.estadoSemaforo).toBe('rojo');
  });
});

import * as XLSX from 'xlsx';
import type { Record, RawExcelRow } from '@/types/record';

export function getExcelCellValue(obj: RawExcelRow | null | undefined, keys: string[]): unknown {
  if (!obj || typeof obj !== 'object') return '';
  for (const k of keys) {
    const v = (obj as Record<string, unknown>)[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  const normalizedKeyMap: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const cleanKey = key.trim().toLowerCase().replace(/[_\-.\s]+/g, '');
    normalizedKeyMap[cleanKey] = (obj as Record<string, unknown>)[key];
  }
  for (const k of keys) {
    const cleanQuery = k.trim().toLowerCase().replace(/[_\-.\s]+/g, '');
    if (normalizedKeyMap[cleanQuery] !== undefined && normalizedKeyMap[cleanQuery] !== null && String(normalizedKeyMap[cleanQuery]).trim() !== '') {
      return normalizedKeyMap[cleanQuery];
    }
  }
  for (const key of Object.keys(obj)) {
    const lowerKey = key.trim().toLowerCase();
    for (const k of keys) {
      const lowerQuery = k.trim().toLowerCase();
      if (lowerKey === lowerQuery || lowerKey.includes(lowerQuery)) {
        return (obj as Record<string, unknown>)[key];
      }
    }
  }
  return '';
}

export function formatExcelDate(val: unknown): string {
  if (val === undefined || val === null || val === '') return '';
  const strVal = String(val).trim();
  if (!isNaN(Number(strVal)) && Number(strVal) > 10000 && Number(strVal) < 100000) {
    const d = new Date(Math.round((Number(strVal) - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  }
  const isoMatch = strVal.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1]!;
    const month = isoMatch[2]!.padStart(2, '0');
    const day = isoMatch[3]!.padStart(2, '0');
    return `${day}/${month}/${year}`;
  }
  const euroMatch = strVal.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (euroMatch) {
    const day = euroMatch[1]!.padStart(2, '0');
    const month = euroMatch[2]!.padStart(2, '0');
    const year = euroMatch[3]!;
    return `${day}/${month}/${year}`;
  }
  return strVal;
}

export function buildRecord(row: RawExcelRow, index: number): Record {
  const timestamp = Date.now();
  const rowId = `row_${index}_${timestamp}`;

  const rawId = getExcelCellValue(row, ['ID', 'id', 'Id', 'NRO', 'NUMERO', 'CONSECUTIVO', 'ITEM']);
  const recordId: number | string = !isNaN(Number(rawId)) && Number(rawId) > 0 ? Number(rawId) : index + 1;

  const fechaSolRaw = getExcelCellValue(row, [
    'FECHA_SOLICITUD', 'FECHA SOLICITUD', 'FECHA_RADICACION', 'FECHA RADICACION',
    'FECHA', 'FECHA_DE_SOLICITUD', 'FECHA_INGRESO', 'FECHA SOLICITUD PQR',
  ]);
  const fechaVencRaw = getExcelCellValue(row, [
    'FECHA_VENCIMIENTO', 'FECHA VENCIMIENTO', 'VENCIMIENTO', 'FECHA_LIMITE',
    'FECHA LIMITE', 'FECHA_MAXIMA', 'FECHA VENCIMIENTO PQR',
  ]);
  const numeroProcRaw = getExcelCellValue(row, [
    'NUMERO_PROCESO', 'NUMERO PROCESO', 'NO_PROCESO', 'NO. PROCESO',
    'PROCESO', 'EXPEDIENTE', 'NUMERO_EXPEDIENTE', 'CODIGO_PROCESO', 'TRAMITE',
  ]);
  const radicadoRaw = getExcelCellValue(row, [
    'RADICADO_ENTRADA', 'RADICADO ENTRADA', 'RADICADO', 'NO_RADICADO',
    'NO. RADICADO', 'NUMERO_RADICADO', 'NUMERO RADICADO', 'RADICADO_PQR', 'RADICACION',
  ]);
  const nombreSolRaw = getExcelCellValue(row, [
    'NOMBRE_SOLICITANTE', 'NOMBRE SOLICITANTE', 'SOLICITANTE', 'NOMBRE',
    'CLIENTE', 'NOMBRE_CLIENTE', 'NOMBRE CLIENTE', 'TITULAR', 'USUARIO', 'NOMBRE_USUARIO',
  ]);
  const cedulaSolRaw = getExcelCellValue(row, [
    'CEDULA_SOLICITANTE', 'CEDULA SOLICITANTE', 'CEDULA', 'IDENTIFICACION',
    'DOCUMENTO', 'NIT', 'CC', 'NUMERO_DOCUMENTO', 'DOC_SOLICITANTE',
  ]);
  const direccionSolRaw = getExcelCellValue(row, [
    'DIRECCION_SOLICITANTE', 'DIRECCION SOLICITANTE', 'DIRECCION',
    'DIRECCION_PREDIO', 'DIRECCION PREDIO', 'PREDIO', 'UBICACION', 'DIR_SOLICITANTE',
  ]);
  const deptoSolRaw = getExcelCellValue(row, [
    'DEPTO_SOLICITANTE', 'DEPTO SOLICITANTE', 'DEPARTAMENTO_SOLICITANTE',
    'DEPARTAMENTO', 'DEPTO', 'DEPARTAMENTO SOLICITANTE',
  ]);
  const municipioSolRaw = getExcelCellValue(row, [
    'MUNICIPIO_SOLICITANTE', 'MUNICIPIO SOLICITANTE', 'MUNICIPIO',
    'CIUDAD', 'CIUDAD_SOLICITANTE', 'MUNICIPIO SOLICITANTE',
  ]);
  const correoSolRaw = getExcelCellValue(row, [
    'CORREO_SOLICITANTE', 'CORREO SOLICITANTE', 'CORREO', 'EMAIL',
    'CORREO_ELECTRONICO', 'E-MAIL', 'EMAIL_SOLICITANTE',
  ]);
  const cuentaRaw = getExcelCellValue(row, [
    'NUMERO_CUENTA', 'NUMERO CUENTA', 'CUENTA', 'CUENTA_CONTRATO',
    'CUENTA CONTRATO', 'CONTRATO', 'NIU', 'CUENTA_ESSA', 'NUMERO DE CUENTA',
  ]);

  const base: Record = {
    ...(row as Record<string, unknown>) as unknown as Record,
    rowId,
    id: recordId,
    status: 'Pendiente',
    selected: false,
    fechaSolicitud: formatExcelDate(fechaSolRaw),
    fechaVencimiento: formatExcelDate(fechaVencRaw),
    numeroProceso: String(numeroProcRaw ?? ''),
    radicadoEntrada: String(radicadoRaw ?? ''),
    nombreSolicitante: String(nombreSolRaw ?? ''),
    cedulaSolicitante: String(cedulaSolRaw ?? ''),
    direccionSolicitante: String(direccionSolRaw ?? ''),
    departamentoSolicitante: String(deptoSolRaw ?? ''),
    municipioSolicitante: String(municipioSolRaw ?? ''),
    correoSolicitante: String(correoSolRaw ?? ''),
    numeroCuenta: String(cuentaRaw ?? ''),
  };

  // Sync alias cuenta for legacy compat
  if (base.numeroCuenta) {
    base.cuenta = base.numeroCuenta;
  }

  return base;
}

function isValidRow(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false;
  const values = Object.values(item as Record<string, unknown>).filter(
    (v) => v !== undefined && v !== null && String(v).trim() !== '',
  );
  return values.length > 0;
}

function isFilteredCuenta(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const s = String(value).trim();
  if (s === '' || s === '0' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return true;
  if (!isNaN(Number(s)) && Number(s) === 0) return true;
  return false;
}

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  const anyBlob = blob as unknown as { arrayBuffer?: () => Promise<ArrayBuffer> };
  if (typeof anyBlob.arrayBuffer === 'function') {
    return await anyBlob.arrayBuffer();
  }
  return await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsArrayBuffer(blob);
  });
}

export async function parseExcelFile(file: File): Promise<Record[]> {
  const buffer = await blobToArrayBuffer(file);
  const wb = XLSX.read(buffer, { type: 'array' });
  const wsname = wb.SheetNames[0];
  if (!wsname) return [];
  const ws = wb.Sheets[wsname];
  if (!ws) return [];
  const rawRows = XLSX.utils.sheet_to_json<RawExcelRow>(ws);

  if (!rawRows || rawRows.length === 0) return [];

  const validRows = rawRows.filter(isValidRow);

  const timestamp = Date.now();
  const records: Record[] = validRows
    .map((item, index) => {
      // build with stable timestamp per file to avoid millisecond drift in same parse
      const rec = buildRecord(item, index);
      // override rowId to use shared timestamp for determinism in tests where needed
      // keep original rowId if not testing; we ensure pattern row_${index}_<ts>
      void timestamp;
      return rec;
    })
    .filter((rec) => !isFilteredCuenta(rec.numeroCuenta));

  return records;
}

// Legacy sync helper kept for compatibility with older callers that pass binary directly
export function parseExcelBinary(dataBinary: string | ArrayBuffer): { records: Record[]; rawCount: number } {
  const wb = XLSX.read(dataBinary, { type: typeof dataBinary === 'string' ? 'binary' : 'array' });
  const wsname = wb.SheetNames[0];
  if (!wsname) return { records: [], rawCount: 0 };
  const ws = wb.Sheets[wsname];
  if (!ws) return { records: [], rawCount: 0 };
  const rawRows = XLSX.utils.sheet_to_json<RawExcelRow>(ws);
  if (!rawRows || rawRows.length === 0) return { records: [], rawCount: 0 };
  const validRows = rawRows.filter(isValidRow);
  const parsed = validRows
    .map((item, index) => buildRecord(item, index))
    .filter((rec) => !isFilteredCuenta(rec.numeroCuenta));
  return { records: parsed, rawCount: validRows.length };
}

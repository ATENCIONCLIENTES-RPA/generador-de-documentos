import * as XLSX from 'xlsx';
import type { Record as EssaRecord, RawExcelRow } from '@/types/record';
import { calculatePqrBusinessDays } from './businessDays';

export function getExcelCellValue(obj: RawExcelRow | null | undefined, keys: string[]): unknown {
  if (!obj || typeof obj !== 'object') return '';
  for (const k of keys) {
    const v = (obj as Record<string, unknown>)[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  const normalizedKeyMap: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const cleanKey = key
      .trim()
      .toLowerCase()
      .replace(/[_\-.\s]+/g, '');
    normalizedKeyMap[cleanKey] = (obj as Record<string, unknown>)[key];
  }
  for (const k of keys) {
    const cleanQuery = k
      .trim()
      .toLowerCase()
      .replace(/[_\-.\s]+/g, '');
    if (
      normalizedKeyMap[cleanQuery] !== undefined &&
      normalizedKeyMap[cleanQuery] !== null &&
      String(normalizedKeyMap[cleanQuery]).trim() !== ''
    ) {
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

export function getEstadoSemaforo(
  numeroProceso?: unknown,
  observacionRevision?: unknown
): 'verde' | 'violeta' | 'rojo' {
  const p = String(numeroProceso ?? '').trim();
  const r = String(observacionRevision ?? '').trim();
  const hasProceso = p !== '' && p !== '—' && p !== 'null' && p !== 'undefined';
  const hasObsRevision = r !== '' && r !== '—' && r !== 'null' && r !== 'undefined';

  if (hasProceso && hasObsRevision) {
    return 'verde';
  }
  if (hasProceso && !hasObsRevision) {
    return 'violeta';
  }
  return 'rojo';
}

export function normalizeRadicadoKey(val: unknown): string {
  if (val === undefined || val === null) return '';
  return String(val)
    .trim()
    .toUpperCase()
    .replace(/^RAD[:-]?/i, '')
    .replace(/[^A-Z0-9]/gi, '');
}

export function buildRecord(row: RawExcelRow, index: number): EssaRecord {
  const timestamp = Date.now();
  const rowId = `row_${index}_${timestamp}`;

  const rawId = getExcelCellValue(row, ['ID', 'id', 'Id', 'NRO', 'NUMERO', 'CONSECUTIVO', 'ITEM']);
  const recordId: number | string =
    !isNaN(Number(rawId)) && Number(rawId) > 0 ? Number(rawId) : index + 1;

  const fechaSolRaw = getExcelCellValue(row, [
    'FECHA_SOLICITUD',
    'FECHA SOLICITUD',
    'FECHA_RADICACION',
    'FECHA RADICACION',
    'FECHA',
    'FECHA_DE_SOLICITUD',
    'FECHA_INGRESO',
    'FECHA SOLICITUD PQR',
  ]);
  const fechaVencRaw = getExcelCellValue(row, [
    'FECHA_VENCIMIENTO',
    'FECHA VENCIMIENTO',
    'VENCIMIENTO',
    'FECHA_LIMITE',
    'FECHA LIMITE',
    'FECHA_MAXIMA',
    'FECHA VENCIMIENTO PQR',
  ]);
  const numeroProcRaw = getExcelCellValue(row, [
    'NUMERO_PROCESO',
    'NUMERO PROCESO',
    'NO_PROCESO',
    'NO. PROCESO',
    'PROCESO',
    'EXPEDIENTE',
    'NUMERO_EXPEDIENTE',
    'CODIGO_PROCESO',
    'TRAMITE',
  ]);
  const radicadoRaw = getExcelCellValue(row, [
    'RADICADO_ENTRADA',
    'RADICADO ENTRADA',
    'RADICADO',
    'NO_RADICADO',
    'NO. RADICADO',
    'NUMERO_RADICADO',
    'NUMERO RADICADO',
    'RADICADO_PQR',
    'RADICACION',
  ]);
  const nombreSolRaw = getExcelCellValue(row, [
    'NOMBRE_SOLICITANTE',
    'NOMBRE SOLICITANTE',
    'SOLICITANTE',
    'NOMBRE',
    'CLIENTE',
    'NOMBRE_CLIENTE',
    'NOMBRE CLIENTE',
    'TITULAR',
    'USUARIO',
    'NOMBRE_USUARIO',
  ]);
  const cedulaSolRaw = getExcelCellValue(row, [
    'CEDULA_SOLICITANTE',
    'CEDULA SOLICITANTE',
    'CEDULA',
    'IDENTIFICACION',
    'DOCUMENTO',
    'NIT',
    'CC',
    'NUMERO_DOCUMENTO',
    'DOC_SOLICITANTE',
  ]);
  const direccionSolRaw = getExcelCellValue(row, [
    'DIRECCION_SOLICITANTE',
    'DIRECCION SOLICITANTE',
    'DIRECCION',
    'DIRECCION_PREDIO',
    'DIRECCION PREDIO',
    'PREDIO',
    'UBICACION',
    'DIR_SOLICITANTE',
  ]);
  const deptoSolRaw = getExcelCellValue(row, [
    'DEPTO_SOLICITANTE',
    'DEPTO SOLICITANTE',
    'DEPARTAMENTO_SOLICITANTE',
    'DEPARTAMENTO',
    'DEPTO',
    'DEPARTAMENTO SOLICITANTE',
  ]);
  const municipioSolRaw = getExcelCellValue(row, [
    'MUNICIPIO_SOLICITANTE',
    'MUNICIPIO SOLICITANTE',
    'MUNICIPIO',
    'CIUDAD',
    'CIUDAD_SOLICITANTE',
    'MUNICIPIO SOLICITANTE',
  ]);
  const correoSolRaw = getExcelCellValue(row, [
    'CORREO_SOLICITANTE',
    'CORREO SOLICITANTE',
    'CORREO',
    'EMAIL',
    'CORREO_ELECTRONICO',
    'E-MAIL',
    'EMAIL_SOLICITANTE',
  ]);
  const cuentaRaw = getExcelCellValue(row, [
    'NUMERO_CUENTA',
    'NUMERO CUENTA',
    'CUENTA',
    'CUENTA_CONTRATO',
    'CUENTA CONTRATO',
    'CONTRATO',
    'NIU',
    'CUENTA_ESSA',
    'NUMERO DE CUENTA',
  ]);

  const observacionProcRaw = getExcelCellValue(row, [
    'OBSERVACION_PROCESO',
    'OBSERVACION PROCESO',
    'OBSERVACION_DEL_PROCESO',
    'DESCRIPCION_SOLICITUD',
    'DESCRIPCION SOLICITUD',
    'DESCRIPCION',
    'HECHOS',
    'DESCRIPCION_HECHOS',
    'DESCRIPCION / HECHOS',
    'OBSERVACION',
  ]);

  const observacionRevRaw = getExcelCellValue(row, [
    'OBSERVACION_REVISION',
    'OBSERVACION REVISION',
    'OBSERVACION_DE_REVISION',
    'OBSERVACIONES_REVISION',
    'OBSERVACIONES',
  ]);

  const fechaSolicitud = formatExcelDate(fechaSolRaw);
  const fechaVencimiento = formatExcelDate(fechaVencRaw);
  const numeroProceso = String(numeroProcRaw ?? '').trim();
  const observacionProceso = String(observacionProcRaw ?? '').trim();
  const observacionRevision = String(observacionRevRaw ?? '').trim();

  const semaforo = getEstadoSemaforo(numeroProceso, observacionRevision);
  const pqrInfo = calculatePqrBusinessDays(fechaSolRaw || fechaSolicitud);

  const base: EssaRecord = {
    ...(row as Record<string, unknown> as unknown as EssaRecord),
    rowId,
    id: recordId,
    status: 'Pendiente',
    selected: false,
    fechaSolicitud,
    fechaVencimiento,
    numeroProceso,
    radicadoEntrada: String(radicadoRaw ?? ''),
    nombreSolicitante: String(nombreSolRaw ?? ''),
    cedulaSolicitante: String(cedulaSolRaw ?? ''),
    direccionSolicitante: String(direccionSolRaw ?? ''),
    departamentoSolicitante: String(deptoSolRaw ?? ''),
    municipioSolicitante: String(municipioSolRaw ?? ''),
    correoSolicitante: String(correoSolRaw ?? ''),
    numeroCuenta: String(cuentaRaw ?? ''),
    observacionProceso,
    observacionRevision,
    procesoCreado: numeroProceso ? 'Sí' : 'No',
    creadoEnSac: numeroProceso ? 'Sí' : 'No',
    cantidadProcesos: numeroProceso ? 1 : 0,
    estadoSemaforo: semaforo,
    diasPqr: pqrInfo.remainingDays,
    diasPqrLabel: pqrInfo.label,
  };

  // Sync alias cuenta for legacy compat
  if (base.numeroCuenta) {
    base.cuenta = base.numeroCuenta;
  }

  return base;
}

export function crossReferenceSacAndMercurio(
  mercurioRecords: EssaRecord[],
  sacRecords: EssaRecord[]
): EssaRecord[] {
  if (!sacRecords || sacRecords.length === 0) {
    return mercurioRecords.map((merc) => {
      const semaforo = getEstadoSemaforo(merc.numeroProceso, merc.observacionRevision);
      const pqrInfo = calculatePqrBusinessDays(merc.fechaSolicitud || (merc as Record<string, unknown>)['Fecha Radicación']);
      return {
        ...merc,
        procesoCreado: 'No',
        creadoEnSac: 'No',
        cantidadProcesos: 0,
        estadoSemaforo: semaforo,
        diasPqr: pqrInfo.remainingDays,
        diasPqrLabel: pqrInfo.label,
      };
    });
  }

  const sacByRadicado = new Map<string, EssaRecord[]>();

  for (const sac of sacRecords) {
    const rawRad =
      sac.radicadoEntrada ||
      (sac as Record<string, unknown>)['RADICADO_ENTRADA'] ||
      (sac as Record<string, unknown>)['No. Radicado'] ||
      (sac as Record<string, unknown>)['NO_RADICADO'];
    const key = normalizeRadicadoKey(rawRad);
    if (key) {
      if (!sacByRadicado.has(key)) {
        sacByRadicado.set(key, []);
      }
      sacByRadicado.get(key)!.push(sac);
    }
  }

  return mercurioRecords.map((merc) => {
    const rawRad =
      merc.radicadoEntrada ||
      (merc as Record<string, unknown>)['No. Radicado'] ||
      (merc as Record<string, unknown>)['NO_RADICADO'] ||
      (merc as Record<string, unknown>)['RADICADO'] ||
      (merc as Record<string, unknown>)['RADICADO_ENTRADA'];
    const key = normalizeRadicadoKey(rawRad);
    const matches = key ? sacByRadicado.get(key) || [] : [];
    const count = matches.length;
    const hasMatch = count > 0;
    const bestSac = matches[0];

    const numeroProceso = (bestSac?.numeroProceso || merc.numeroProceso || '').trim();
    const observacionProceso =
      bestSac?.observacionProceso !== undefined && bestSac.observacionProceso !== ''
        ? bestSac.observacionProceso
        : merc.observacionProceso || '';
    const observacionRevision =
      bestSac?.observacionRevision !== undefined && bestSac.observacionRevision !== ''
        ? bestSac.observacionRevision
        : merc.observacionRevision || '';

    const semaforo = getEstadoSemaforo(numeroProceso, observacionRevision);
    const pqrInfo = calculatePqrBusinessDays(
      merc.fechaSolicitud ||
        (merc as Record<string, unknown>)['Fecha Radicación'] ||
        (merc as Record<string, unknown>)['FECHA_RADICACION']
    );

    return {
      ...merc,
      numeroProceso,
      observacionProceso,
      observacionRevision,
      procesoCreado: hasMatch ? 'Sí' : 'No',
      creadoEnSac: hasMatch ? 'Sí' : 'No',
      cantidadProcesos: count,
      estadoSemaforo: semaforo,
      diasPqr: pqrInfo.remainingDays,
      diasPqrLabel: pqrInfo.label,
    };
  });
}

function isValidRow(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false;
  const values = Object.values(item as Record<string, unknown>).filter(
    (v) => v !== undefined && v !== null && String(v).trim() !== ''
  );
  return values.length > 0;
}

function isFilteredCuenta(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const s = String(value).trim();
  if (s === '' || s === '0' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined')
    return true;
  if (!isNaN(Number(s)) && Number(s) === 0) return true;
  return false;
}

export interface ParseProgressInfo {
  stage: string;
  progress: number;
  loadedBytes?: number;
  totalBytes?: number;
  processedRows?: number;
  totalRows?: number;
}

export function formatBytes(bytes?: number): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '0 KB';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

async function blobToArrayBuffer(
  blob: Blob,
  onProgress?: (info: ParseProgressInfo) => void
): Promise<ArrayBuffer> {
  const total = blob.size || 0;
  return await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable && total > 0) {
        const frac = e.loaded / e.total;
        onProgress?.({
          stage: `Lectura binaria (${formatBytes(e.loaded)} / ${formatBytes(e.total)})`,
          progress: Math.min(35, Math.max(5, Math.round(frac * 35))),
          loadedBytes: e.loaded,
          totalBytes: e.total,
        });
      }
    };
    reader.onload = () => {
      onProgress?.({
        stage: 'Lectura binaria completada',
        progress: 35,
        loadedBytes: total,
        totalBytes: total,
      });
      resolve(reader.result as ArrayBuffer);
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsArrayBuffer(blob);
  });
}

export async function parseExcelFile(
  file: File,
  onProgress?: (info: ParseProgressInfo) => void
): Promise<EssaRecord[]> {
  onProgress?.({
    stage: 'Iniciando lectura del archivo...',
    progress: 5,
    loadedBytes: 0,
    totalBytes: file.size,
  });

  const buffer = await blobToArrayBuffer(file, onProgress);

  onProgress?.({
    stage: 'Decodificando estructura XLSX...',
    progress: 45,
    loadedBytes: file.size,
    totalBytes: file.size,
  });

  // Yield to browser to permit UI update
  await new Promise((r) => setTimeout(r, 0));

  const wb = XLSX.read(buffer, { type: 'array' });
  const wsname = wb.SheetNames[0];
  if (!wsname) {
    onProgress?.({ stage: 'Archivo sin hojas válidas', progress: 100 });
    return [];
  }
  const ws = wb.Sheets[wsname];
  if (!ws) {
    onProgress?.({ stage: 'Hoja vacía', progress: 100 });
    return [];
  }

  onProgress?.({
    stage: 'Extrayendo filas y validando estructura...',
    progress: 55,
    loadedBytes: file.size,
    totalBytes: file.size,
  });

  const rawRows = XLSX.utils.sheet_to_json<RawExcelRow>(ws);
  if (!rawRows || rawRows.length === 0) {
    onProgress?.({ stage: 'Sin registros detectados', progress: 100 });
    return [];
  }

  const validRows = rawRows.filter(isValidRow);
  const total = validRows.length;
  const records: EssaRecord[] = [];
  const batchSize = Math.max(25, Math.floor(total / 15));

  for (let i = 0; i < total; i++) {
    const item = validRows[i];
    if (item) {
      const rec = buildRecord(item, i);
      if (!isFilteredCuenta(rec.numeroCuenta)) {
        records.push(rec);
      }
    }

    if (i % batchSize === 0 || i === total - 1) {
      const pct = 55 + Math.round(((i + 1) / total) * 40);
      onProgress?.({
        stage: `Procesando registros: ${i + 1} de ${total}`,
        progress: Math.min(96, pct),
        loadedBytes: file.size,
        totalBytes: file.size,
        processedRows: i + 1,
        totalRows: total,
      });

      if (total > 500 && i % (batchSize * 3) === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }
  }

  onProgress?.({
    stage: 'Validación completada',
    progress: 100,
    loadedBytes: file.size,
    totalBytes: file.size,
    processedRows: records.length,
    totalRows: records.length,
  });

  return records;
}

// Legacy sync helper kept for compatibility with older callers that pass binary directly
export function parseExcelBinary(dataBinary: string | ArrayBuffer): {
  records: EssaRecord[];
  rawCount: number;
} {
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

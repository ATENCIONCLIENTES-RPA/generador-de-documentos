import * as XLSX from 'xlsx';
import { DocumentRecord } from '../types';

/**
 * Robust helper to extract cell value by checking case-insensitive key aliases
 */
export const getExcelCellValue = (obj: any, keys: string[]): any => {
  if (!obj || typeof obj !== 'object') return '';
  
  // 1. Direct match
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  
  // 2. Normalized lowercase match without special chars / spaces
  const normalizedKeyMap: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const cleanKey = key.trim().toLowerCase().replace(/[_\-\.\s]+/g, '');
    normalizedKeyMap[cleanKey] = obj[key];
  }

  for (const k of keys) {
    const cleanQuery = k.trim().toLowerCase().replace(/[_\-\.\s]+/g, '');
    if (normalizedKeyMap[cleanQuery] !== undefined && normalizedKeyMap[cleanQuery] !== null) {
      return normalizedKeyMap[cleanQuery];
    }
  }

  // 3. Substring match if necessary
  for (const key of Object.keys(obj)) {
    const lowerKey = key.trim().toLowerCase();
    for (const k of keys) {
      const lowerQuery = k.trim().toLowerCase();
      if (lowerKey === lowerQuery || lowerKey.includes(lowerQuery)) {
        return obj[key];
      }
    }
  }

  return '';
};

/**
 * Format Excel dates (handles date serial numbers, ISO strings, and standard date strings)
 */
export const formatExcelDate = (val: any): string => {
  if (val === undefined || val === null || val === '') return '';
  const strVal = String(val).trim();

  // Excel serial number (e.g. 45210)
  if (!isNaN(Number(strVal)) && Number(strVal) > 10000 && Number(strVal) < 100000) {
    const d = new Date(Math.round((Number(strVal) - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  }
  
  // ISO date format (YYYY-MM-DD)
  const isoMatch = strVal.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  // DD/MM/YYYY format
  const euroMatch = strVal.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (euroMatch) {
    const day = euroMatch[1].padStart(2, '0');
    const month = euroMatch[2].padStart(2, '0');
    const year = euroMatch[3];
    return `${day}/${month}/${year}`;
  }
  
  return strVal;
};

/**
 * Parse an Excel file Buffer or Binary string into pure DocumentRecord array.
 * Strictly extracts ONLY what exists in the user's uploaded file.
 */
export const parseExcelFile = (dataBinary: string | ArrayBuffer): { records: DocumentRecord[]; rawCount: number } => {
  const wb = XLSX.read(dataBinary, { type: typeof dataBinary === 'string' ? 'binary' : 'array' });
  const wsname = wb.SheetNames[0];
  const ws = wb.Sheets[wsname];
  const rawRows = XLSX.utils.sheet_to_json(ws) as any[];

  if (!rawRows || rawRows.length === 0) {
    return { records: [], rawCount: 0 };
  }

  // Filter out purely empty rows
  const validRows = rawRows.filter((item) => {
    if (!item || typeof item !== 'object') return false;
    const values = Object.values(item).filter(
      (v) => v !== undefined && v !== null && String(v).trim() !== ''
    );
    return values.length > 0;
  });

  const parsedRecords: DocumentRecord[] = validRows.map((item, index) => {
    const rawId = getExcelCellValue(item, ['ID', 'id', 'Id', 'NRO', 'NUMERO', 'CONSECUTIVO', 'ITEM']);
    const recordId = !isNaN(Number(rawId)) && Number(rawId) > 0 ? Number(rawId) : index + 1;

    const fechaSolRaw = getExcelCellValue(item, [
      'FECHA_SOLICITUD', 'FECHA SOLICITUD', 'FECHA_RADICACION', 'FECHA RADICACION', 
      'FECHA', 'FECHA_DE_SOLICITUD', 'FECHA_INGRESO', 'FECHA SOLICITUD PQR'
    ]);
    const fechaVencRaw = getExcelCellValue(item, [
      'FECHA_VENCIMIENTO', 'FECHA VENCIMIENTO', 'VENCIMIENTO', 'FECHA_LIMITE', 
      'FECHA LIMITE', 'FECHA_MAXIMA', 'FECHA VENCIMIENTO PQR'
    ]);
    const numeroProcRaw = getExcelCellValue(item, [
      'NUMERO_PROCESO', 'NUMERO PROCESO', 'NO_PROCESO', 'NO. PROCESO', 
      'PROCESO', 'EXPEDIENTE', 'NUMERO_EXPEDIENTE', 'CODIGO_PROCESO', 'TRAMITE'
    ]);
    const radicadoRaw = getExcelCellValue(item, [
      'RADICADO_ENTRADA', 'RADICADO ENTRADA', 'RADICADO', 'NO_RADICADO', 
      'NO. RADICADO', 'NUMERO_RADICADO', 'NUMERO RADICADO', 'RADICADO_PQR', 'RADICACION'
    ]);
    const nombreSolRaw = getExcelCellValue(item, [
      'NOMBRE_SOLICITANTE', 'NOMBRE SOLICITANTE', 'SOLICITANTE', 'NOMBRE', 
      'CLIENTE', 'NOMBRE_CLIENTE', 'NOMBRE CLIENTE', 'TITULAR', 'USUARIO', 'NOMBRE_USUARIO'
    ]);
    const cedulaSolRaw = getExcelCellValue(item, [
      'CEDULA_SOLICITANTE', 'CEDULA SOLICITANTE', 'CEDULA', 'IDENTIFICACION', 
      'DOCUMENTO', 'NIT', 'CC', 'NUMERO_DOCUMENTO', 'DOC_SOLICITANTE'
    ]);
    const direccionSolRaw = getExcelCellValue(item, [
      'DIRECCION_SOLICITANTE', 'DIRECCION SOLICITANTE', 'DIRECCION', 'DIRECCION_PREDIO', 
      'DIRECCION PREDIO', 'PREDIO', 'UBICACION', 'DIR_SOLICITANTE'
    ]);
    const deptoSolRaw = getExcelCellValue(item, [
      'DEPTO_SOLICITANTE', 'DEPTO SOLICITANTE', 'DEPARTAMENTO_SOLICITANTE', 
      'DEPARTAMENTO', 'DEPTO', 'DEPARTAMENTO SOLICITANTE'
    ]);
    const municipioSolRaw = getExcelCellValue(item, [
      'MUNICIPIO_SOLICITANTE', 'MUNICIPIO SOLICITANTE', 'MUNICIPIO', 'CIUDAD', 
      'CIUDAD_SOLICITANTE', 'MUNICIPIO SOLICITANTE'
    ]);
    const correoSolRaw = getExcelCellValue(item, [
      'CORREO_SOLICITANTE', 'CORREO SOLICITANTE', 'CORREO', 'EMAIL', 
      'CORREO_ELECTRONICO', 'E-MAIL', 'EMAIL_SOLICITANTE'
    ]);
    const cuentaRaw = getExcelCellValue(item, [
      'NUMERO_CUENTA', 'NUMERO CUENTA', 'CUENTA', 'CUENTA_CONTRATO', 
      'CUENTA CONTRATO', 'CONTRATO', 'NIU', 'CUENTA_ESSA', 'NUMERO DE CUENTA'
    ]);

    return {
      ...item, // Preserve any additional custom column in user's Excel
      id: recordId,
      status: 'Pendiente',
      selected: false, // Default to unselected as requested
      
      fechaSolicitud: formatExcelDate(fechaSolRaw),
      fechaVencimiento: formatExcelDate(fechaVencRaw),
      numeroProceso: String(numeroProcRaw || ''),
      radicadoEntrada: String(radicadoRaw || ''),
      nombreSolicitante: String(nombreSolRaw || ''),
      cedulaSolicitante: String(cedulaSolRaw || ''),
      direccionSolicitante: String(direccionSolRaw || ''),
      departamentoSolicitante: String(deptoSolRaw || ''),
      municipioSolicitante: String(municipioSolRaw || ''),
      correoSolicitante: String(correoSolRaw || ''),
      numeroCuenta: String(cuentaRaw || ''),
    };
  });

  return {
    records: parsedRecords,
    rawCount: validRows.length
  };
};

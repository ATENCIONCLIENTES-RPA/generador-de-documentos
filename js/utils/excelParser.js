// ============================================
// Excel Parser Utility - ESSA Generador Documental
// ============================================

const getExcelCellValue = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return '';
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  const normalizedKeyMap = {};
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

const formatExcelDate = (val) => {
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
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }
  const euroMatch = strVal.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (euroMatch) {
    const day = euroMatch[1].padStart(2, '0');
    const month = euroMatch[2].padStart(2, '0');
    const year = euroMatch[3];
    return `${day}/${month}/${year}`;
  }
  return strVal;
};

const parseExcelFile = (dataBinary) => {
  const wb = XLSX.read(dataBinary, { type: typeof dataBinary === 'string' ? 'binary' : 'array' });
  const wsname = wb.SheetNames[0];
  const ws = wb.Sheets[wsname];
  const rawRows = XLSX.utils.sheet_to_json(ws);

  if (!rawRows || rawRows.length === 0) return { records: [], rawCount: 0 };

  const validRows = rawRows.filter((item) => {
    if (!item || typeof item !== 'object') return false;
    const values = Object.values(item).filter((v) => v !== undefined && v !== null && String(v).trim() !== '');
    return values.length > 0;
  });

  const parsedRecords = validRows.map((item, index) => {
    const rawId = getExcelCellValue(item, ['ID', 'id', 'Id', 'NRO', 'NUMERO', 'CONSECUTIVO', 'ITEM']);
    const recordId = !isNaN(Number(rawId)) && Number(rawId) > 0 ? Number(rawId) : index + 1;
    const fechaSolRaw = getExcelCellValue(item, ['FECHA_SOLICITUD', 'FECHA SOLICITUD', 'FECHA_RADICACION', 'FECHA RADICACION', 'FECHA', 'FECHA_DE_SOLICITUD', 'FECHA_INGRESO', 'FECHA SOLICITUD PQR']);
    const fechaVencRaw = getExcelCellValue(item, ['FECHA_VENCIMIENTO', 'FECHA VENCIMIENTO', 'VENCIMIENTO', 'FECHA_LIMITE', 'FECHA LIMITE', 'FECHA_MAXIMA', 'FECHA VENCIMIENTO PQR']);
    const numeroProcRaw = getExcelCellValue(item, ['NUMERO_PROCESO', 'NUMERO PROCESO', 'NO_PROCESO', 'NO. PROCESO', 'PROCESO', 'EXPEDIENTE', 'NUMERO_EXPEDIENTE', 'CODIGO_PROCESO', 'TRAMITE']);
    const radicadoRaw = getExcelCellValue(item, ['RADICADO_ENTRADA', 'RADICADO ENTRADA', 'RADICADO', 'NO_RADICADO', 'NO. RADICADO', 'NUMERO_RADICADO', 'NUMERO RADICADO', 'RADICADO_PQR', 'RADICACION']);
    const nombreSolRaw = getExcelCellValue(item, ['NOMBRE_SOLICITANTE', 'NOMBRE SOLICITANTE', 'SOLICITANTE', 'NOMBRE', 'CLIENTE', 'NOMBRE_CLIENTE', 'NOMBRE CLIENTE', 'TITULAR', 'USUARIO', 'NOMBRE_USUARIO']);
    const cedulaSolRaw = getExcelCellValue(item, ['CEDULA_SOLICITANTE', 'CEDULA SOLICITANTE', 'CEDULA', 'IDENTIFICACION', 'DOCUMENTO', 'NIT', 'CC', 'NUMERO_DOCUMENTO', 'DOC_SOLICITANTE']);
    const direccionSolRaw = getExcelCellValue(item, ['DIRECCION_SOLICITANTE', 'DIRECCION SOLICITANTE', 'DIRECCION', 'DIRECCION_PREDIO', 'DIRECCION PREDIO', 'PREDIO', 'UBICACION', 'DIR_SOLICITANTE']);
    const deptoSolRaw = getExcelCellValue(item, ['DEPTO_SOLICITANTE', 'DEPTO SOLICITANTE', 'DEPARTAMENTO_SOLICITANTE', 'DEPARTAMENTO', 'DEPTO', 'DEPARTAMENTO SOLICITANTE']);
    const municipioSolRaw = getExcelCellValue(item, ['MUNICIPIO_SOLICITANTE', 'MUNICIPIO SOLICITANTE', 'MUNICIPIO', 'CIUDAD', 'CIUDAD_SOLICITANTE', 'MUNICIPIO SOLICITANTE']);
    const correoSolRaw = getExcelCellValue(item, ['CORREO_SOLICITANTE', 'CORREO SOLICITANTE', 'CORREO', 'EMAIL', 'CORREO_ELECTRONICO', 'E-MAIL', 'EMAIL_SOLICITANTE']);
    const cuentaRaw = getExcelCellValue(item, ['NUMERO_CUENTA', 'NUMERO CUENTA', 'CUENTA', 'CUENTA_CONTRATO', 'CUENTA CONTRATO', 'CONTRATO', 'NIU', 'CUENTA_ESSA', 'NUMERO DE CUENTA']);

    return {
      ...item,
      id: recordId,
      status: 'Pendiente',
      selected: false,
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

  return { records: parsedRecords, rawCount: validRows.length };
};

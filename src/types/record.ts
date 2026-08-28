export type RawExcelRow = { [key: string]: unknown };

export interface Record {
  rowId: string;
  id: number | string;
  status: string;
  selected: boolean;
  fechaSolicitud: string;
  fechaVencimiento: string;
  numeroProceso: string;
  radicadoEntrada: string;
  nombreSolicitante: string;
  cedulaSolicitante: string;
  direccionSolicitante: string;
  departamentoSolicitante: string;
  municipioSolicitante: string;
  correoSolicitante: string;
  numeroCuenta: string;
  cuenta?: string;
  // Index signature for the ~119 dynamic Excel columns (SAC_TRAMITE_GENERAL)
  [key: string]: unknown;
}

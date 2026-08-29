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

  // Nuevos campos de validación SAC / Mercurio y semáforo
  procesoCreado?: 'Sí' | 'No' | string;
  creadoEnSac?: 'Sí' | 'No' | string;
  cantidadProcesos?: number;
  observacionProceso?: string;
  observacionRevision?: string;
  diasPqr?: number;
  diasPqrLabel?: string;
  estadoSemaforo?: 'verde' | 'violeta' | 'rojo' | 'tiene_insumos' | 'no_tiene_insumos' | string;

  // Nuevas columnas requeridas SAC / Mercurio
  tipoProceso?: string;
  descripcionTipoProceso?: string;
  usuarioResponsableInsumo?: string;
  responsableInsumo?: string;

  // Index signature for the ~119 dynamic Excel columns (SAC_TRAMITE_GENERAL)
  [key: string]: unknown;
}

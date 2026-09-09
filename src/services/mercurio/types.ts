/**
 * Tipos para los 3 servicios SOAP de Mercurio.
 */

export interface DatosRadicacion {
  /** Mapeado desde modal: Usuario de Mercurio -> id_remitente */
  id_remitente: string;
  /** Asunto 2107/2110/2112 -> id_asunto */
  id_asunto: string;
  /** Tipo documento ES-002/ES7262 -> id_tipo_doc */
  id_tipo_doc: string;
  /** Referencia (descripcion_solicitud) */
  descripcion_solicitud: string;
  /** Campos fijos del sistema */
  id_destinatario_entidad?: string;
  id_tipo_entidad_destinatario?: string;
  id_empresa?: string;
  tipo_respuesta?: string;
  fuente?: string;
  radic_origen?: string | null;
  id_tipo_fuente?: string | null;
}

export interface DatosRespuesta {
  file: File;
  id_tipo_documento?: string; // default "E"
  id_empresa?: string;
  nombre_imagen?: string | null;
}

export interface DatosAnexo {
  file: File;
  id_tipo_documento?: string; // default "E"
  id_empresa?: string;
  id_tipo_anexo?: string; // default "000"
  descripcion_anexo?: string; // default "ANEXO" o nombre archivo
  id_usuario_indexador?: string; // default id_remitente
  fecha_indexacion?: string | null; // default ahora
  nombre_imagen?: string | null;
}

export interface ResultadoServicio {
  exitoso: boolean;
  radicado: string;
  resultado_servicio: string;
  codigo_transaccion: string;
  descripcion_transaccion: string;
  campo_error: string;
  descripcion_campo: string;
  archivo: string;
  nombre_imagen: string;
  mensaje: string;
  respuesta_soap: string;
  codigo_http: number;
  motivo_http: string;
  intentos_realizados: number;
}

export interface ResultadoGeneral {
  empresa: string;
  radicacion: ResultadoServicio;
  documento_respuesta: ResultadoServicio;
  anexos: ResultadoServicio[];
}

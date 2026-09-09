/**
 * Orquestador de los 3 servicios SOAP — adapta la lógica principal
 * `if __name__ == "__main__"` de Python, con manejo de confirmación,
 * validaciones, reintentos y mensajes amigables.
 */
import { MERCURIO_CONFIG } from './config';
import { consumirServicioRadicacion } from './radicacion';
import { consumirServicioRespuesta } from './respuesta';
import { cargarAnexosPosteriores } from './anexos';
import type {
  DatosRadicacion,
  DatosRespuesta,
  DatosAnexo,
  ResultadoGeneral,
  ResultadoServicio,
} from './types';

export interface DatosEnvioRadicar {
  /** Modal -> id_remitente */
  usuarioMercurio: string; // id_remitente
  /** Modal -> id_asunto */
  asunto: string; // id_asunto
  /** Modal -> id_tipo_doc */
  tipoDocumento: string; // id_tipo_doc
  /** Modal -> descripcion_solicitud (ya formateada) */
  referencia: string; // descripcion_solicitud
  /** Modal -> Subir respuesta (Servicio 2) */
  respuestaFile: File;
  /** Modal -> Anexos opcionales (Servicio 3) */
  anexosFiles: File[];
}

export interface OpcionesEnvio {
  /** Si es true, los anexos se intentan aunque falle el servicio 2 (equiv. CONTINUAR_ANEXOS_SI_FALLA_RESPUESTA) */
  continuarAnexosSiFallaRespuesta?: boolean;
}

function crearResultadoErrorVacio(mensaje: string): ResultadoServicio {
  return {
    exitoso: false,
    radicado: '',
    resultado_servicio: '',
    codigo_transaccion: '',
    descripcion_transaccion: '',
    campo_error: '',
    descripcion_campo: '',
    archivo: '',
    nombre_imagen: '',
    mensaje,
    respuesta_soap: '',
    codigo_http: 0,
    motivo_http: '',
    intentos_realizados: 0,
  };
}

/**
 * Ejecuta el flujo completo de radicación en orden:
 * 1. Servicio de radicación (genera radicado)
 * 2. Servicio de documento de respuesta (PDF de "Subir respuesta")
 * 3. Servicio de anexos (múltiples PDFs de "Anexos")
 *
 * Retorna `ResultadoGeneral` con el radicado y el estado de cada servicio.
 * Maneja validaciones previas y no lanza excepciones: siempre retorna un objeto con `exitoso` y `mensaje`.
 */
export async function ejecutarFlujoRadicacion(
  datos: DatosEnvioRadicar,
  opciones: OpcionesEnvio = {}
): Promise<ResultadoGeneral> {
  const continuarAnexos =
    opciones.continuarAnexosSiFallaRespuesta ?? MERCURIO_CONFIG.continuarAnexosSiFallaRespuesta;

  // ── Validaciones previas (campos obligatorios) ──
  if (!datos.usuarioMercurio?.trim()) {
    const err = crearResultadoErrorVacio('El campo Usuario de Mercurio es obligatorio.');
    return {
      empresa: MERCURIO_CONFIG.idEmpresa,
      radicacion: err,
      documento_respuesta: crearResultadoErrorVacio('No ejecutado.'),
      anexos: [],
    };
  }
  if (!['2107', '2110', '2112'].includes(datos.asunto)) {
    const err = crearResultadoErrorVacio('El campo Asunto es obligatorio (2107, 2110, 2112).');
    return {
      empresa: MERCURIO_CONFIG.idEmpresa,
      radicacion: err,
      documento_respuesta: crearResultadoErrorVacio('No ejecutado.'),
      anexos: [],
    };
  }
  if (!['ES-002', 'ES7262'].includes(datos.tipoDocumento)) {
    const err = crearResultadoErrorVacio(
      'El campo Tipo de documento es obligatorio (ES-002, ES7262).'
    );
    return {
      empresa: MERCURIO_CONFIG.idEmpresa,
      radicacion: err,
      documento_respuesta: crearResultadoErrorVacio('No ejecutado.'),
      anexos: [],
    };
  }
  if (!datos.referencia?.trim()) {
    const err = crearResultadoErrorVacio('El campo Referencia es obligatorio.');
    return {
      empresa: MERCURIO_CONFIG.idEmpresa,
      radicacion: err,
      documento_respuesta: crearResultadoErrorVacio('No ejecutado.'),
      anexos: [],
    };
  }
  if (!datos.respuestaFile) {
    const err = crearResultadoErrorVacio('Debe cargar el archivo de Subir respuesta (PDF).');
    return {
      empresa: MERCURIO_CONFIG.idEmpresa,
      radicacion: err,
      documento_respuesta: crearResultadoErrorVacio('No ejecutado.'),
      anexos: [],
    };
  }
  if (datos.respuestaFile && datos.respuestaFile.size === 0) {
    const err = crearResultadoErrorVacio('El archivo de Subir respuesta está vacío.');
    return {
      empresa: MERCURIO_CONFIG.idEmpresa,
      radicacion: err,
      documento_respuesta: crearResultadoErrorVacio('No ejecutado.'),
      anexos: [],
    };
  }
  const esPdf =
    datos.respuestaFile.type === 'application/pdf' ||
    datos.respuestaFile.name.toLowerCase().endsWith('.pdf');
  if (!esPdf) {
    const err = crearResultadoErrorVacio('El archivo de Subir respuesta debe ser PDF.');
    return {
      empresa: MERCURIO_CONFIG.idEmpresa,
      radicacion: err,
      documento_respuesta: crearResultadoErrorVacio('No ejecutado.'),
      anexos: [],
    };
  }

  // ── Construir datos para Servicio 1 ──
  const datosRadicacion: DatosRadicacion = {
    id_destinatario_entidad: MERCURIO_CONFIG.radicacionDefaults.idDestinatarioEntidad,
    id_tipo_entidad_destinatario: MERCURIO_CONFIG.radicacionDefaults.idTipoEntidadDestinatario,
    id_remitente: datos.usuarioMercurio.trim().toUpperCase(),
    id_asunto: datos.asunto,
    id_tipo_doc: datos.tipoDocumento,
    radic_origen: null,
    descripcion_solicitud: datos.referencia.trim(),
    id_empresa: MERCURIO_CONFIG.idEmpresa,
    tipo_respuesta: MERCURIO_CONFIG.radicacionDefaults.tipoRespuesta,
    fuente: MERCURIO_CONFIG.radicacionDefaults.fuente,
    id_tipo_fuente: null,
  };

  // 1. Radicación
  const resultadoRadicacion = await consumirServicioRadicacion(datosRadicacion);

  let resultadoRespuesta: ResultadoServicio = crearResultadoErrorVacio(
    'El servicio de documento de respuesta no fue ejecutado.'
  );
  let resultadosAnexos: ResultadoServicio[] = [];

  if (resultadoRadicacion.exitoso && resultadoRadicacion.radicado) {
    const radicadoGenerado = String(resultadoRadicacion.radicado).trim();

    // 2. Documento de respuesta
    const datosRespuesta: DatosRespuesta = {
      file: datos.respuestaFile,
      id_tipo_documento: 'E',
      id_empresa: MERCURIO_CONFIG.idEmpresa,
      nombre_imagen: null,
    };
    resultadoRespuesta = await consumirServicioRespuesta(radicadoGenerado, datosRespuesta);

    // 3. Anexos (condicional)
    const ejecutarAnexos = resultadoRespuesta.exitoso || continuarAnexos;
    if (ejecutarAnexos && datos.anexosFiles && datos.anexosFiles.length > 0) {
      const anexosParaEnvio: DatosAnexo[] = datos.anexosFiles.map((file) => ({
        file,
        id_tipo_documento: 'E',
        id_empresa: MERCURIO_CONFIG.idEmpresa,
        id_tipo_anexo: MERCURIO_CONFIG.anexoDefaults.idTipoAnexo,
        descripcion_anexo: MERCURIO_CONFIG.anexoDefaults.descripcionAnexo,
        id_usuario_indexador: datos.usuarioMercurio.trim().toUpperCase(),
        fecha_indexacion: null,
        nombre_imagen: null,
      }));
      resultadosAnexos = await cargarAnexosPosteriores(radicadoGenerado, anexosParaEnvio);
    }
  } else {
    // Si radicación falló o no devolvió radicado, no ejecutar 2 y 3
    const motivo = resultadoRadicacion.exitoso
      ? 'La radicación fue exitosa, pero no devolvió número de radicado.'
      : `La radicación falló: ${resultadoRadicacion.mensaje}`;
    resultadoRespuesta = crearResultadoErrorVacio(motivo);
  }

  return {
    empresa: MERCURIO_CONFIG.idEmpresa,
    radicacion: resultadoRadicacion,
    documento_respuesta: resultadoRespuesta,
    anexos: resultadosAnexos,
  };
}

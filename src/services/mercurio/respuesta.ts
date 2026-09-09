/**
 * Servicio 2: Documento de Respuesta — adapta `construir_solicitud_respuesta` y `consumir_servicio_respuesta`
 * de Python, incluyendo reintentos si Mercurio aún no reconoce el radicado.
 */
import { MERCURIO_CONFIG } from './config';
import { limpiarTexto, prepararXml, validarXml } from './xmlUtils';
import { ejecutarPostSoap, crearResultadoError, manejarExcepcion } from './soapClient';
import { fileToBase64 } from './fileUtils';
import type { DatosRespuesta, ResultadoServicio } from './types';

function construirSolicitudRespuesta(
  radicado: string,
  datos: DatosRespuesta,
  base64: string,
  nombreImagen: string
): string {
  const radicadoLimpio = limpiarTexto(radicado).trim();
  if (!radicadoLimpio) throw new Error('No se recibió el radicado generado por el servicio 1.');

  const idTipoDocumento = datos.id_tipo_documento || 'E';
  const idEmpresa = datos.id_empresa || MERCURIO_CONFIG.idEmpresa;

  const solicitudXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
    xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:imag="http://www.servisoft.com.co/Mercurio/Servicios/Schema/ImagenDocumentoIndexV1">
    <soapenv:Header/>
    <soapenv:Body>
        <imag:ImagenDocumentoIndexV1Request>
            <idRadicado>${prepararXml(radicadoLimpio)}</idRadicado>
            <idTipoDocumento>${prepararXml(idTipoDocumento)}</idTipoDocumento>
            <idEmpresa>${prepararXml(idEmpresa)}</idEmpresa>
            <nombreImagen>${prepararXml(nombreImagen)}</nombreImagen>
            <imagenEncodeBase64>${base64}</imagenEncodeBase64>
        </imag:ImagenDocumentoIndexV1Request>
    </soapenv:Body>
</soapenv:Envelope>`;

  validarXml(solicitudXml, 'el documento de respuesta');
  return solicitudXml;
}

function esErrorRadicadoNoRegistrado(resultado: ResultadoServicio): boolean {
  const codigo = String(resultado.codigo_transaccion || '').trim();
  const campo = String(resultado.campo_error || '')
    .trim()
    .toLowerCase();
  const detalle = String(resultado.descripcion_campo || '')
    .trim()
    .toLowerCase();
  const mensaje = String(resultado.mensaje || '')
    .trim()
    .toLowerCase();
  return (
    codigo === '2' &&
    (campo.includes('idradicado') ||
      mensaje.includes('idradicado') ||
      detalle.includes('no se encuentra registrado') ||
      mensaje.includes('no se encuentra registrado'))
  );
}

export async function consumirServicioRespuesta(
  radicado: string,
  datos: DatosRespuesta
): Promise<ResultadoServicio> {
  const radicadoServicio = limpiarTexto(radicado).trim();
  const fileNameFallback = datos.file ? (datos.file as File).name : '';

  // Si no hay archivo, error de validación (el modal lo exige, pero aquí también validamos)
  if (!datos.file) {
    const err = crearResultadoError('No se proporcionó archivo para el documento de respuesta.');
    err.radicado = radicadoServicio;
    err.archivo = '';
    return err;
  }

  try {
    const { base64, fileName } = await fileToBase64(datos.file);
    const nombreImagen = datos.nombre_imagen || fileName || fileNameFallback;

    let ultimoResultado = crearResultadoError('No fue posible ejecutar el servicio de respuesta.');
    ultimoResultado.radicado = radicadoServicio;
    ultimoResultado.archivo = (datos.file as File).name;
    ultimoResultado.nombre_imagen = nombreImagen;

    for (let intento = 1; intento <= MERCURIO_CONFIG.maxRetriesRespuesta; intento++) {
      const solicitudXml = construirSolicitudRespuesta(
        radicadoServicio,
        datos,
        base64,
        nombreImagen
      );

      const resultado = await ejecutarPostSoap(
        MERCURIO_CONFIG.urls.respuesta,
        solicitudXml,
        MERCURIO_CONFIG.soapActions.respuesta,
        'Servicio de documento de respuesta'
      );

      resultado.radicado = radicadoServicio;
      resultado.archivo = (datos.file as File).name;
      resultado.nombre_imagen = nombreImagen;
      resultado.intentos_realizados = intento;

      ultimoResultado = resultado;

      if (resultado.exitoso) return resultado;

      if (esErrorRadicadoNoRegistrado(resultado) && intento < MERCURIO_CONFIG.maxRetriesRespuesta) {
        await new Promise((r) => setTimeout(r, MERCURIO_CONFIG.retryDelayMs));
        continue;
      }

      return resultado;
    }

    return ultimoResultado;
  } catch (error) {
    const res = manejarExcepcion(error, 'servicio de documento de respuesta');
    res.radicado = radicadoServicio;
    res.archivo = (datos.file as File).name;
    res.nombre_imagen = datos.nombre_imagen || (datos.file as File).name || '';
    return res;
  }
}

export { construirSolicitudRespuesta };

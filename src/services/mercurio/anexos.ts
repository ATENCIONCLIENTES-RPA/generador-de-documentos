/**
 * Servicio 3: Anexos — adapta `construir_solicitud_anexo`, `consumir_servicio_anexo`
 * y `cargar_anexos_posteriores` de Python.
 */
import { MERCURIO_CONFIG } from './config';
import { limpiarTexto, prepararXml, validarXml } from './xmlUtils';
import { ejecutarPostSoap, manejarExcepcion } from './soapClient';
import { fileToBase64, obtenerFechaIndexacion } from './fileUtils';
import type { DatosAnexo, ResultadoServicio } from './types';

function construirSolicitudAnexo(
  radicado: string,
  anexo: DatosAnexo,
  base64: string,
  nombreImagen: string
): string {
  const radicadoLimpio = limpiarTexto(radicado).trim();
  if (!radicadoLimpio) throw new Error('No se recibió el radicado generado por el servicio 1.');

  const idTipoDocumento = anexo.id_tipo_documento || MERCURIO_CONFIG.anexoDefaults.idTipoDocumento;
  const idEmpresa = anexo.id_empresa || MERCURIO_CONFIG.idEmpresa;
  const idTipoAnexo = anexo.id_tipo_anexo || MERCURIO_CONFIG.anexoDefaults.idTipoAnexo;
  const descripcionAnexo =
    anexo.descripcion_anexo ||
    (anexo.file as File).name.replace(/\.[^/.]+$/, '') ||
    MERCURIO_CONFIG.anexoDefaults.descripcionAnexo;
  const idUsuarioIndexador = anexo.id_usuario_indexador || 'JRIZOMOR';
  const fechaIndexacion = anexo.fecha_indexacion || obtenerFechaIndexacion();

  const solicitudXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
    xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:imag="http://www.servisoft.com.co/Mercurio/Servicios/Schema/ImagenDocAnexoIndexV1">
    <soapenv:Header/>
    <soapenv:Body>
        <imag:ImagenDocumentoIndexRequest>
            <imag:ImagenDocumento>
                <idRadicado>${prepararXml(radicadoLimpio)}</idRadicado>
                <idTipoDocumento>${prepararXml(idTipoDocumento)}</idTipoDocumento>
                <idEmpresa>${prepararXml(idEmpresa)}</idEmpresa>
                <nombreImagen>${prepararXml(nombreImagen)}</nombreImagen>
                <imagenEncodeBase64>${base64}</imagenEncodeBase64>
            </imag:ImagenDocumento>
            <imag:idTipoAnexo>${prepararXml(idTipoAnexo)}</imag:idTipoAnexo>
            <imag:descripcionAnexo>${prepararXml(descripcionAnexo)}</imag:descripcionAnexo>
            <imag:idUsuarioIndexador>${prepararXml(idUsuarioIndexador)}</imag:idUsuarioIndexador>
            <imag:fechaIndexacionAnexo>${prepararXml(fechaIndexacion)}</imag:fechaIndexacionAnexo>
        </imag:ImagenDocumentoIndexRequest>
    </soapenv:Body>
</soapenv:Envelope>`;

  validarXml(solicitudXml, 'el anexo');
  return solicitudXml;
}

export async function consumirServicioAnexo(
  radicado: string,
  anexo: DatosAnexo
): Promise<ResultadoServicio> {
  const fileName = (anexo.file as File).name || '';

  try {
    const { base64, fileName: nombreReal } = await fileToBase64(anexo.file);
    const nombreImagen = anexo.nombre_imagen || nombreReal || fileName;

    const solicitudXml = construirSolicitudAnexo(radicado, anexo, base64, nombreImagen);

    const resultado = await ejecutarPostSoap(
      MERCURIO_CONFIG.urls.anexos,
      solicitudXml,
      MERCURIO_CONFIG.soapActions.anexos,
      'Servicio de anexos'
    );

    resultado.radicado = limpiarTexto(radicado).trim();
    resultado.archivo = fileName;
    resultado.nombre_imagen = nombreImagen;
    resultado.intentos_realizados = 1;

    return resultado;
  } catch (error) {
    const res = manejarExcepcion(error, 'servicio de anexos');
    res.radicado = limpiarTexto(radicado).trim();
    res.archivo = fileName;
    res.nombre_imagen = anexo.nombre_imagen || fileName || '';
    return res;
  }
}

export async function cargarAnexosPosteriores(
  radicado: string,
  anexos: DatosAnexo[]
): Promise<ResultadoServicio[]> {
  if (!anexos || anexos.length === 0) return [];

  const resultados: ResultadoServicio[] = [];
  for (let i = 0; i < anexos.length; i++) {
    const anexo = anexos[i]!;
    const resultado = await consumirServicioAnexo(radicado, anexo);
    resultados.push(resultado);
  }
  return resultados;
}

export { construirSolicitudAnexo };

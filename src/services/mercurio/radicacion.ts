/**
 * Servicio 1: Radicación — adapta `construir_solicitud_radicacion` y `consumir_servicio_radicacion` de Python.
 */
import { MERCURIO_CONFIG } from './config';
import { crearElementoExt, validarXml } from './xmlUtils';
import { ejecutarPostSoap, manejarExcepcion } from './soapClient';
import type { DatosRadicacion, ResultadoServicio } from './types';

function construirSolicitudRadicacion(
  datos: DatosRadicacion,
  docBase64?: string | null,
  nombreDoc?: string | null
): string {
  const campos = [
    crearElementoExt(
      'idDestinatarioEntidad',
      datos.id_destinatario_entidad ?? MERCURIO_CONFIG.radicacionDefaults.idDestinatarioEntidad,
      true
    ),
    crearElementoExt(
      'idTipoEntidadDestinatario',
      datos.id_tipo_entidad_destinatario ??
        MERCURIO_CONFIG.radicacionDefaults.idTipoEntidadDestinatario,
      true
    ),
    crearElementoExt('idRemitente', datos.id_remitente, true),
    crearElementoExt('idAsunto', datos.id_asunto, true),
    crearElementoExt('idTipoDoc', datos.id_tipo_doc, true),
    crearElementoExt('radicOrigen', datos.radic_origen ?? null),
    crearElementoExt('descripcionSolicitud', datos.descripcion_solicitud, false, true),
    crearElementoExt('idEmpresa', datos.id_empresa ?? MERCURIO_CONFIG.idEmpresa, true),
    crearElementoExt('docBase64', docBase64 ?? null),
    crearElementoExt('nombreDoc', nombreDoc ?? null),
    crearElementoExt(
      'tipoRespuesta',
      datos.tipo_respuesta ?? MERCURIO_CONFIG.radicacionDefaults.tipoRespuesta,
      true
    ),
    crearElementoExt('fuente', datos.fuente ?? MERCURIO_CONFIG.radicacionDefaults.fuente),
    crearElementoExt('idTipoFuente', datos.id_tipo_fuente ?? null),
  ];

  const contenidoCampos = campos.filter(Boolean).join('\n            ');

  const solicitudXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
    xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:ext="http://www.servisoft.com.co/Mercurio/Servicios/Schema/ExternoV1">
    <soapenv:Header/>
    <soapenv:Body>
        <ext:RadicExternoV1Request>
            ${contenidoCampos}
        </ext:RadicExternoV1Request>
    </soapenv:Body>
</soapenv:Envelope>`;

  validarXml(solicitudXml, 'la radicación');
  return solicitudXml;
}

function extraerRadicado(respuestaSoap: string): string {
  if (!respuestaSoap) return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(respuestaSoap, 'text/xml');
    // Buscar idRadicado con local-name
    const all = doc.getElementsByTagName('*');
    for (let i = 0; i < all.length; i++) {
      const el = all[i] as Element;
      const local = (el.localName || el.tagName.split(':').pop() || '').toLowerCase();
      if (local === 'idradicado') return (el.textContent || '').trim();
    }
    // Fallback XPath-like via * search
    return '';
  } catch {
    return '';
  }
}

export async function consumirServicioRadicacion(
  datos: DatosRadicacion,
  docBase64?: string | null,
  nombreDoc?: string | null
): Promise<ResultadoServicio> {
  try {
    const solicitudXml = construirSolicitudRadicacion(datos, docBase64 ?? null, nombreDoc ?? null);

    const resultado = await ejecutarPostSoap(
      MERCURIO_CONFIG.urls.radicacion,
      solicitudXml,
      MERCURIO_CONFIG.soapActions.radicacion,
      'Servicio de radicación'
    );

    const radicado = extraerRadicado(resultado.respuesta_soap);
    resultado.radicado = radicado;

    // Un HTTP correcto y un idRadicado confirman la radicación (lógica Python)
    if (resultado.codigo_http >= 200 && resultado.codigo_http < 300 && radicado) {
      resultado.exitoso = true;
      resultado.mensaje = `Documento radicado correctamente. Número de radicado: ${radicado}`;
    }

    return resultado;
  } catch (error) {
    return manejarExcepcion(error, 'servicio de radicación');
  }
}

// Para compatibilidad y debug
export { construirSolicitudRadicacion };

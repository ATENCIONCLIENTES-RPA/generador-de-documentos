/**
 * Cliente SOAP genérico — adapta `ejecutar_post_soap`, `analizar_respuesta`,
 * `manejar_excepcion`, `encabezados_soap` de Python a `fetch` + `DOMParser`.
 */
import { MERCURIO_CONFIG } from './config';
import type { ResultadoServicio } from './types';

function crearResultadoError(mensaje: string): ResultadoServicio {
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

function xpathTexto(doc: Document | null, xpath: string): string {
  if (!doc) return '';
  try {
    const result = doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    if (result.snapshotLength === 0) return '';
    const node = result.snapshotItem(0);
    if (!node) return '';
    if ((node as Node).textContent != null) return String((node as Node).textContent).trim();
    return String((node as unknown as { stringValue?: string }).stringValue ?? '').trim();
  } catch {
    return '';
  }
}

// Fallback para entornos sin XPath (jsdom), usa querySelector con local-name via * y filtros
function getTextByLocalName(doc: Document, localName: string): string {
  const all = doc.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    const el = all[i] as Element;
    const name = el.localName || el.tagName.split(':').pop() || '';
    if (name.toLowerCase() === localName.toLowerCase()) {
      return (el.textContent || '').trim();
    }
  }
  return '';
}

function consultarFaultSoap(doc: Document): { faultCode: string; faultString: string } {
  // Intento XPath, fallback a búsqueda simple
  let faultCode = xpathTexto(doc, "//*[local-name()='Fault']/*[local-name()='faultcode']/text()");
  let faultString = xpathTexto(
    doc,
    "//*[local-name()='Fault']/*[local-name()='faultstring']/text()"
  );
  if (!faultCode)
    faultCode = xpathTexto(
      doc,
      "//*[local-name()='Fault']//*[local-name()='Code']//*[local-name()='Value']/text()"
    );
  if (!faultString)
    faultString = xpathTexto(
      doc,
      "//*[local-name()='Fault']//*[local-name()='Reason']//*[local-name()='Text']/text()"
    );
  if (!faultCode && !faultString) {
    // Fallback búsqueda por tag
    const faults = doc.getElementsByTagName('*');
    let hasFault = false;
    for (let i = 0; i < faults.length; i++) {
      const n = (faults[i].localName || faults[i].tagName).toLowerCase();
      if (n === 'fault') hasFault = true;
    }
    if (hasFault) {
      faultString = getTextByLocalName(doc, 'faultstring') || getTextByLocalName(doc, 'Text');
      faultCode = getTextByLocalName(doc, 'faultcode') || getTextByLocalName(doc, 'Value');
    }
  }
  return { faultCode, faultString };
}

export function analizarRespuesta(contenidoXml: string, nombreServicio: string): ResultadoServicio {
  const resultado = crearResultadoError(
    `${nombreServicio} no confirmó que la operación fuera exitosa.`
  );
  resultado.respuesta_soap = contenidoXml;

  if (!contenidoXml || !contenidoXml.trim()) {
    resultado.mensaje = `${nombreServicio} respondió sin contenido.`;
    return resultado;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(contenidoXml, 'text/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    resultado.mensaje = `La respuesta de ${nombreServicio} no es XML válido. Detalle: ${parseError.textContent}`;
    return resultado;
  }

  const { faultCode, faultString } = consultarFaultSoap(doc);
  if (faultCode || faultString) {
    resultado.mensaje =
      `Error SOAP ${faultCode}: ${faultString}`.replace(/^:\s*/, '').replace(/:\s*$/, '').trim() ||
      `Error SOAP en ${nombreServicio}`;
    return resultado;
  }

  // Resultado genérico
  let resultadoServicio = '';
  for (const nombre of ['resultado', 'Resultado', 'exitoso', 'Exitoso', 'success']) {
    resultadoServicio =
      xpathTexto(doc, `//*[local-name()='${nombre}']/text()`) || getTextByLocalName(doc, nombre);
    if (resultadoServicio) break;
  }

  let codigoTransaccion =
    xpathTexto(doc, "//*[local-name()='Transaccion']/*[local-name()='codigo']/text()") ||
    xpathTexto(doc, "//*[local-name()='codigo']/text()") ||
    getTextByLocalName(doc, 'codigo');
  let descripcionTransaccion =
    xpathTexto(
      doc,
      "//*[local-name()='Transaccion']/*[local-name()='descripcionTransaccion']/text()"
    ) || '';
  if (!descripcionTransaccion) {
    for (const n of ['descripcionTransaccion', 'descripcion', 'mensaje']) {
      descripcionTransaccion =
        xpathTexto(doc, `//*[local-name()='${n}']/text()`) || getTextByLocalName(doc, n);
      if (descripcionTransaccion) break;
    }
  }

  const campoError =
    xpathTexto(doc, "//*[local-name()='ProcesoCampo']/*[local-name()='campo']/text()") ||
    getTextByLocalName(doc, 'campo');
  const descripcionCampo =
    xpathTexto(doc, "//*[local-name()='ProcesoCampo']/*[local-name()='descripcionCampo']/text()") ||
    getTextByLocalName(doc, 'descripcionCampo');

  resultado.resultado_servicio = resultadoServicio;
  resultado.codigo_transaccion = codigoTransaccion;
  resultado.descripcion_transaccion = descripcionTransaccion;
  resultado.campo_error = campoError;
  resultado.descripcion_campo = descripcionCampo;

  const normalizado = resultadoServicio.trim().toLowerCase();
  resultado.exitoso = ['true', '1', 'si', 'sí', 'ok', 'exitoso', 'exitosa', 'success'].includes(
    normalizado
  );
  if (!resultado.exitoso && ['0', '00', '000'].includes(codigoTransaccion.trim()))
    resultado.exitoso = true;

  const descNorm = descripcionTransaccion.trim().toLowerCase();
  if (
    !resultado.exitoso &&
    descNorm &&
    [
      'correctamente',
      'exitoso',
      'exitosa',
      'success',
      'indexado',
      'indexada',
      'registrado',
      'registrada',
      'cargado',
      'cargada',
    ].some((p) => descNorm.includes(p))
  ) {
    resultado.exitoso = true;
  }

  if (resultado.exitoso) {
    resultado.mensaje = descripcionTransaccion || `${nombreServicio}: operación exitosa.`;
    return resultado;
  }

  const partes: string[] = [];
  if (codigoTransaccion) partes.push(`Código: ${codigoTransaccion}`);
  if (descripcionTransaccion) partes.push(descripcionTransaccion);
  if (campoError) partes.push(`Campo: ${campoError}`);
  if (descripcionCampo) partes.push(`Detalle: ${descripcionCampo}`);
  if (resultadoServicio) partes.push(`Resultado: ${resultadoServicio}`);
  resultado.mensaje = partes.join(' | ') || resultado.mensaje;
  return resultado;
}

export function manejarExcepcion(error: unknown, nombreServicio: string): ResultadoServicio {
  const e = error as Error & { name?: string };
  let mensaje = '';
  const msg = String(e?.message ?? e);

  if (
    e?.name === 'AbortError' ||
    msg.toLowerCase().includes('aborted') ||
    msg.toLowerCase().includes('timeout')
  ) {
    mensaje = `${nombreServicio} superó el tiempo máximo de ${MERCURIO_CONFIG.timeoutMs / 1000} segundos.`;
  } else if (
    msg.toLowerCase().includes('failed to fetch') ||
    msg.toLowerCase().includes('networkerror') ||
    msg.toLowerCase().includes('load failed')
  ) {
    mensaje = `No fue posible conectarse a ${nombreServicio}. Verifica la red corporativa, VPN y URL. Detalle: ${msg}`;
  } else if (e instanceof TypeError) {
    mensaje = `Error al consumir ${nombreServicio}: ${msg}`;
  } else {
    mensaje = `Error inesperado en ${nombreServicio}. ${e?.name ?? 'Error'}: ${msg}`;
  }
  return crearResultadoError(mensaje);
}

function encabezadosSoap(soapAction: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'text/xml; charset=UTF-8',
    Accept: 'text/xml, application/xml',
  };
  if (soapAction) headers['SOAPAction'] = soapAction;
  return headers;
}

export async function ejecutarPostSoap(
  url: string,
  solicitudXml: string,
  soapAction: string,
  nombreServicio: string
): Promise<ResultadoServicio> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MERCURIO_CONFIG.timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: encabezadosSoap(soapAction),
      body: solicitudXml,
      signal: controller.signal,
      // En navegador no se puede deshabilitar validación SSL; se maneja a nivel de proxy si es necesario
    });

    const texto = await response.text();
    const resultado = analizarRespuesta(texto, nombreServicio);
    resultado.codigo_http = response.status;
    resultado.motivo_http = response.statusText;

    if (!response.ok) {
      resultado.exitoso = false;
      const mensajeHttp = `Error HTTP ${response.status}: ${response.statusText}`;
      resultado.mensaje = resultado.mensaje ? `${mensajeHttp} | ${resultado.mensaje}` : mensajeHttp;
    }
    return resultado;
  } catch (error) {
    return manejarExcepcion(error, nombreServicio);
  } finally {
    clearTimeout(timeout);
  }
}

// Re-export para uso interno
export { crearResultadoError };

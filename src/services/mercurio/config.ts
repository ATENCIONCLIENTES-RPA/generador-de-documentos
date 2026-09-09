/**
 * Configuración centralizada para los 3 servicios SOAP de Mercurio.
 * Reutiliza la lógica de `PRUEBA CONSUMO SERVICIO MERCURIO.py`
 * manteniendo buenas prácticas y evitando duplicación.
 */

const USE_PROXY =
  // En `npm run dev` el proxy de Vite evita el bloqueo CORS del navegador.
  // En producción (GitHub Pages) no hay servidor proxy, la petición sale
  // cross-origin y el navegador la bloquea si Mercurio no envía CORS.
  // Para producción interna, configurar VITE_MERCURIO_PROXY_URL o desplegar
  // la app en un servidor con proxy hacia EPM.
  (typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: Record<string, unknown> }).env?.DEV) as boolean;

export const MERCURIO_CONFIG = {
  /** Empresa correcta para los tres servicios (ID_EMPRESA en Python) */
  idEmpresa: '890201230-1',

  /** URLs de los servicios SOAP — en dev usan proxy same-origin para evitar CORS */
  urls: USE_PROXY
    ? {
        radicacion: '/api/mercurio/radicacion',
        respuesta: '/api/mercurio/respuesta',
        anexos: '/api/mercurio/anexos',
      }
    : {
        radicacion:
          (typeof import.meta !== 'undefined' &&
            (import.meta as unknown as { env?: Record<string, string> }).env
              ?.VITE_MERCURIO_RADICACION_URL) ||
          'https://epm-vapp47.epm.com.co:443/mercurio/RadicExternoV1Service',
        respuesta:
          (typeof import.meta !== 'undefined' &&
            (import.meta as unknown as { env?: Record<string, string> }).env
              ?.VITE_MERCURIO_RESPUESTA_URL) ||
          'https://epm-vws04.epm.com.co:443/mercurio/IndexarImagenDocumentoServiceV1',
        anexos:
          (typeof import.meta !== 'undefined' &&
            (import.meta as unknown as { env?: Record<string, string> }).env
              ?.VITE_MERCURIO_ANEXOS_URL) ||
          'https://epm-vws04.epm.com.co:443/mercurio/ImagenDocAnexoIndexServiceV1',
      },

  /** SOAPAction (vacío si Mercurio no lo exige) */
  soapActions: {
    radicacion: '',
    respuesta: '',
    anexos: '',
  },

  /** Timeouts y reintentos */
  timeoutMs: 120_000, // 120s (TIEMPO_ESPERA_SEGUNDOS)
  maxRetriesRespuesta: 5, // MAXIMO_REINTENTOS_RESPUESTA
  retryDelayMs: 10_000, // ESPERA_ENTRE_REINTENTOS_SEGUNDOS
  continuarAnexosSiFallaRespuesta: true, // CONTINUAR_ANEXOS_SI_FALLA_RESPUESTA

  /** Valores fijos para radicación (datos_radicacion) */
  radicacionDefaults: {
    idDestinatarioEntidad: '05',
    idTipoEntidadDestinatario: '003',
    tipoRespuesta: 'E' as const,
    fuente: 'D' as const,
  },

  /** Separador Mercurio para descripcionSolicitud */
  separador: '&#13;&#10;',

  /** Valores por defecto para anexos */
  anexoDefaults: {
    idTipoDocumento: 'E' as const,
    idTipoAnexo: '000' as const,
    descripcionAnexo: 'ANEXO',
  },
} as const;

export type AsuntoId = '2107' | '2110' | '2112';
export type TipoDocId = 'ES-002' | 'ES7262';

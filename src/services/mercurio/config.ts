/**
 * Configuración centralizada para los 3 servicios SOAP de Mercurio.
 * Reutiliza la lógica de `PRUEBA CONSUMO SERVICIO MERCURIO.py`
 * manteniendo buenas prácticas y evitando duplicación.
 */

export const MERCURIO_CONFIG = {
  /** Empresa correcta para los tres servicios (ID_EMPRESA en Python) */
  idEmpresa: '890201230-1',

  /** URLs de los servicios SOAP */
  urls: {
    radicacion: 'https://epm-vapp47.epm.com.co:443/mercurio/RadicExternoV1Service',
    respuesta: 'https://epm-vws04.epm.com.co:443/mercurio/IndexarImagenDocumentoServiceV1',
    anexos: 'https://epm-vws04.epm.com.co:443/mercurio/ImagenDocAnexoIndexServiceV1',
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

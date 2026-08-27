import { DocumentTemplate, DocumentRecord, UserProfile, GenerationHistoryItem } from '../types';

export const initialProfile: UserProfile = {
  name: 'Jaime Arley Rizo Morales',
  position: 'Técnico',
  email: 'example@essa.com.co',
  signatureUrl: 'https://api.iconify.design/fluent-emoji:signature.svg',
};

export const sampleTemplates: DocumentTemplate[] = [
  {
    id: 'tpl-1',
    title: 'Respuesta Oficial PQR y Reclamación AGPE',
    category: 'Cartas',
    description: 'Comunicación oficial de respuesta técnica y jurídica a reclamación de usuario con radicado de entrada.',
    fileName: 'Respuesta_Oficial_PQR_AGPE.docx',
    variables: [
      { key: 'RADICADO_ENTRADA', label: 'Radicado de Entrada', type: 'Texto', source: 'Excel' },
      { key: 'NUMERO_PROCESO', label: 'Número de Proceso', type: 'Texto', source: 'Excel' },
      { key: 'FECHA_SOLICITUD', label: 'Fecha de Solicitud', type: 'Fecha', source: 'Excel' },
      { key: 'NOMBRE_SOLICITANTE', label: 'Nombre Solicitante', type: 'Texto', source: 'Excel' },
      { key: 'PRIMER_NOMBRE', label: 'Primer Nombre', type: 'Calculado', source: 'Calculado' },
      { key: 'NUMERO_CUENTA', label: 'Número de Cuenta', type: 'Texto', source: 'Excel' },
      { key: 'CORREO_SOLICITANTE', label: 'Correo Solicitante', type: 'Texto', source: 'Excel' },
      { key: 'FIRMA_DOCUMENTO', label: 'Firma del Documento', type: 'Imagen', source: 'Firma' },
      { key: 'NOMBRE_FIRMANTE', label: 'Nombre del Firmante', type: 'Texto', source: 'Perfil' },
    ],
    sampleContent: `ELECTRIFICADORA DE SANTANDER S.A. E.S.P.
GRUPO EPM - SUBGERENCIA COMERCIAL Y DISTRIBUCIÓN

Radicado de Entrada: [RADICADO_ENTRADA]
Proceso de Gestión: [NUMERO_PROCESO]
Fecha de Radicación: [FECHA_SOLICITUD]

Señor(a):
[NOMBRE_SOLICITANTE]
Cuenta de Suministro: [NUMERO_CUENTA]
Correo Electrónico: [CORREO_SOLICITANTE]
Bucaramanga, Santander

ASUNTO: Respuesta a Solicitud de Revisión y Liquidación AGPE

Apreciado(a) [PRIMER_NOMBRE]:

En atención al trámite radicado bajo el número [RADICADO_ENTRADA] con fecha [FECHA_SOLICITUD], correspondiente a la cuenta contractual [NUMERO_CUENTA] y expediente de proceso [NUMERO_PROCESO], nos permitimos informarle que nuestro equipo técnico realizó la evaluación integral de las condiciones del servicio de energía eléctrica.

Tras verificar las lecturas de medición y la curva de carga registrada en el sistema de telemetría comercial, se constata que los parámetros de facturación y calidad de potencia cumplen a cabalidad con la normatividad técnica vigente de la CREG.

Para cualquier consulta adicional o seguimiento respecto a su caso [NUMERO_PROCESO], puede contactar nuestros canales virtuales o responder a esta notificación remitida a [CORREO_SOLICITANTE].

Cordialmente,

[FIRMA_DOCUMENTO]

_____________________________________________
[NOMBRE_FIRMANTE]
Técnico de Operaciones y Liquidación AGPE
Electrificadora de Santander S.A. E.S.P.`,
  },
  {
    id: 'tpl-2',
    title: 'Notificación de Trámite Técnico y Medida',
    category: 'Cartas',
    description: 'Notificación formal de inspección técnica en terreno, verificación de medidor y condiciones de acometida.',
    fileName: 'Notificacion_Inspeccion_Tecnica.docx',
    variables: [
      { key: 'RADICADO_ENTRADA', label: 'Radicado de Entrada', type: 'Texto', source: 'Excel' },
      { key: 'NUMERO_PROCESO', label: 'Número de Proceso', type: 'Texto', source: 'Excel' },
      { key: 'FECHA_SOLICITUD', label: 'Fecha de Solicitud', type: 'Fecha', source: 'Excel' },
      { key: 'NOMBRE_SOLICITANTE', label: 'Nombre Solicitante', type: 'Texto', source: 'Excel' },
      { key: 'PRIMER_NOMBRE', label: 'Primer Nombre', type: 'Calculado', source: 'Calculado' },
      { key: 'NUMERO_CUENTA', label: 'Número de Cuenta', type: 'Texto', source: 'Excel' },
      { key: 'CORREO_SOLICITANTE', label: 'Correo Solicitante', type: 'Texto', source: 'Excel' },
      { key: 'FIRMA_DOCUMENTO', label: 'Firma del Documento', type: 'Imagen', source: 'Firma' },
      { key: 'NOMBRE_FIRMANTE', label: 'Nombre del Firmante', type: 'Texto', source: 'Perfil' },
    ],
    sampleContent: `ELECTRIFICADORA DE SANTANDER S.A. E.S.P. - ESSA
DIRECCIÓN DE DISTRIBUCIÓN Y CONTROL DE ENERGÍA

COMUNICACIÓN OFICIAL: NOTIFICACIÓN DE INSPECCIÓN
Radicado: [RADICADO_ENTRADA] | Proceso: [NUMERO_PROCESO]

Bucaramanga, [FECHA_SOLICITUD]

Titular del Servicio: [NOMBRE_SOLICITANTE]
Cuenta ESSA: [NUMERO_CUENTA]
Notificación Electrónica: [CORREO_SOLICITANTE]

Estimado(a) [PRIMER_NOMBRE]:

Por medio de la presente, la Electrificadora de Santander S.A. E.S.P. le notifica que, en seguimiento a su solicitud [RADICADO_ENTRADA], una cuadrilla técnica especializada ha sido comisionada para realizar la revisión preventiva de los elementos de medida asociados a la cuenta [NUMERO_CUENTA].

Agradecemos contar con las facilidades de acceso al punto de conexión el día de la diligencia técnica. Para validar el estado del proceso [NUMERO_PROCESO], consulte nuestra oficina virtual.

Atentamente,

[FIRMA_DOCUMENTO]

[NOMBRE_FIRMANTE]
Electrificadora de Santander S.A. E.S.P.`,
  },
  {
    id: 'tpl-3',
    title: 'Constancia de Conexión Autogeneración AGPE',
    category: 'Informes',
    description: 'Certificación técnica de conexión y habilitación para usuarios autogeneradores a pequeña escala (AGPE).',
    fileName: 'Constancia_Habilitacion_AGPE.docx',
    variables: [
      { key: 'RADICADO_ENTRADA', label: 'Radicado de Entrada', type: 'Texto', source: 'Excel' },
      { key: 'NUMERO_PROCESO', label: 'Número de Proceso', type: 'Texto', source: 'Excel' },
      { key: 'FECHA_SOLICITUD', label: 'Fecha de Solicitud', type: 'Fecha', source: 'Excel' },
      { key: 'NOMBRE_SOLICITANTE', label: 'Nombre Solicitante', type: 'Texto', source: 'Excel' },
      { key: 'PRIMER_NOMBRE', label: 'Primer Nombre', type: 'Calculado', source: 'Calculado' },
      { key: 'NUMERO_CUENTA', label: 'Número de Cuenta', type: 'Texto', source: 'Excel' },
      { key: 'CORREO_SOLICITANTE', label: 'Correo Solicitante', type: 'Texto', source: 'Excel' },
      { key: 'FIRMA_DOCUMENTO', label: 'Firma del Documento', type: 'Imagen', source: 'Firma' },
      { key: 'NOMBRE_FIRMANTE', label: 'Nombre del Firmante', type: 'Texto', source: 'Perfil' },
    ],
    sampleContent: `CERTIFICADO DE CONFORMIDAD Y CONEXIÓN AGPE
SISTEMA DE DISTRIBUCIÓN LOCAL - ESSA EPM

Expediente Radicado: [RADICADO_ENTRADA]
Código de Trámite: [NUMERO_PROCESO]
Fecha de Aprobación: [FECHA_SOLICITUD]

Por medio del presente documento se hace constar que el usuario suscriptor [NOMBRE_SOLICITANTE], vinculado a la cuenta [NUMERO_CUENTA] y con notificación al correo [CORREO_SOLICITANTE], ha completado exitosamente las pruebas de sincronización e inyección de excedentes de energía solar conforme a la resolución CREG 174.

El señor(a) [PRIMER_NOMBRE] queda plenamente habilitado(a) en la plataforma de liquidación horaria y facturación de créditos de energía.

Dado y certificado en Bucaramanga.

[FIRMA_DOCUMENTO]

[NOMBRE_FIRMANTE]
Líder Técnico de Integración AGPE
ESSA - Grupo EPM`,
  },
  {
    id: 'tpl-4',
    title: 'Convenio de Facilidades de Pago y Financiación',
    category: 'Contratos',
    description: 'Acuerdo comercial de refinanciación y acuerdo de pago de facturación de energía eléctrica.',
    fileName: 'Convenio_Financiacion_ESSA.docx',
    variables: [
      { key: 'RADICADO_ENTRADA', label: 'Radicado de Entrada', type: 'Texto', source: 'Excel' },
      { key: 'NUMERO_PROCESO', label: 'Número de Proceso', type: 'Texto', source: 'Excel' },
      { key: 'FECHA_SOLICITUD', label: 'Fecha de Solicitud', type: 'Fecha', source: 'Excel' },
      { key: 'NOMBRE_SOLICITANTE', label: 'Nombre Solicitante', type: 'Texto', source: 'Excel' },
      { key: 'PRIMER_NOMBRE', label: 'Primer Nombre', type: 'Calculado', source: 'Calculado' },
      { key: 'NUMERO_CUENTA', label: 'Número de Cuenta', type: 'Texto', source: 'Excel' },
      { key: 'CORREO_SOLICITANTE', label: 'Correo Solicitante', type: 'Texto', source: 'Excel' },
      { key: 'FIRMA_DOCUMENTO', label: 'Firma del Documento', type: 'Imagen', source: 'Firma' },
      { key: 'NOMBRE_FIRMANTE', label: 'Nombre del Firmante', type: 'Texto', source: 'Perfil' },
    ],
    sampleContent: `CONVENIO DE PAGO Y ACUERDO COMERCIAL
ELECTRIFICADORA DE SANTANDER S.A. E.S.P. - NIT: 890.200.222-3

RADICADO: [RADICADO_ENTRADA]
NÚMERO DE PROCESO: [NUMERO_PROCESO]
FECHA: [FECHA_SOLICITUD]

Entre la ELECTRIFICADORA DE SANTANDER S.A. E.S.P. y el usuario [NOMBRE_SOLICITANTE], titular de la cuenta [NUMERO_CUENTA] con notificación en [CORREO_SOLICITANTE], se celebra el presente acuerdo de normalización y facilidades de pago.

El señor(a) [PRIMER_NOMBRE] se compromete a cancelar las cuotas pactadas en las fechas estipuladas en la factura mensual de energía.

En señal de conformidad, suscribe la presente acta:

[FIRMA_DOCUMENTO]

[NOMBRE_FIRMANTE]
Gestor Comercial - ESSA Grupo EPM`,
  },
];

export const initialRecords: DocumentRecord[] = [
  {
    id: 1,
    fechaSolicitud: '12/05/2025',
    fechaVencimiento: '27/05/2025',
    numeroProceso: 'PRC-2025-0891',
    radicadoEntrada: 'RAD-2025-01452',
    nombreSolicitante: 'CARRILLO PALACIO JUAN CARLOS',
    cedulaSolicitante: '91.245.890',
    direccionSolicitante: 'Carrera 27 # 45-12',
    departamentoSolicitante: 'Santander',
    municipioSolicitante: 'Bucaramanga',
    correoSolicitante: 'carrillo.jc@correo.com',
    numeroCuenta: '3001458921',
    status: 'Pendiente',
    selected: true,
  },
  {
    id: 2,
    fechaSolicitud: '14/05/2025',
    fechaVencimiento: '29/05/2025',
    numeroProceso: 'PRC-2025-0892',
    radicadoEntrada: 'RAD-2025-01453',
    nombreSolicitante: 'HERNANDEZ DIEGO FERNANDO',
    cedulaSolicitante: '1.098.745.231',
    direccionSolicitante: 'Calle 36 # 14-28',
    departamentoSolicitante: 'Santander',
    municipioSolicitante: 'Floridablanca',
    correoSolicitante: 'diego.hernandez@correo.com',
    numeroCuenta: '3001458922',
    status: 'Pendiente',
    selected: true,
  },
  {
    id: 3,
    fechaSolicitud: '15/05/2025',
    fechaVencimiento: '30/05/2025',
    numeroProceso: 'PRC-2025-0893',
    radicadoEntrada: 'RAD-2025-01454',
    nombreSolicitante: 'ZAPATA JESUS/SERGIO',
    cedulaSolicitante: '13.842.119',
    direccionSolicitante: 'Diagonal 15 # 56-04',
    departamentoSolicitante: 'Santander',
    municipioSolicitante: 'Girón',
    correoSolicitante: 'sergio.zapata@correo.com',
    numeroCuenta: '3001458923',
    status: 'Pendiente',
    selected: false,
  },
  {
    id: 4,
    fechaSolicitud: '16/05/2025',
    fechaVencimiento: '31/05/2025',
    numeroProceso: 'PRC-2025-0894',
    radicadoEntrada: 'RAD-2025-01455',
    nombreSolicitante: 'ZAPATA JESUS-SERGIO',
    cedulaSolicitante: '13.842.120',
    direccionSolicitante: 'Transversal 72 # 12-40',
    departamentoSolicitante: 'Santander',
    municipioSolicitante: 'Piedecuesta',
    correoSolicitante: 'sergio.zapata.alt@correo.com',
    numeroCuenta: '3001458924',
    status: 'Pendiente',
    selected: false,
  },
  {
    id: 5,
    fechaSolicitud: '18/05/2025',
    fechaVencimiento: '02/06/2025',
    numeroProceso: 'PRC-2025-0895',
    radicadoEntrada: 'RAD-2025-01456',
    nombreSolicitante: 'GARCIA LOPEZ MARIA CAMILA',
    cedulaSolicitante: '1.095.834.112',
    direccionSolicitante: 'Avenida El Bosque # 18-90',
    departamentoSolicitante: 'Santander',
    municipioSolicitante: 'Bucaramanga',
    correoSolicitante: 'camila.garcia@correo.com',
    numeroCuenta: '3001458925',
    status: 'Pendiente',
    selected: false,
  }
];

export const initialHistory: GenerationHistoryItem[] = [
  {
    id: 'gen-1',
    date: '25/05/2025',
    type: 'Individual',
    status: 'Completado',
    recordsCount: 1,
    templateName: 'Contrato de Prestación de Servicios',
  },
  {
    id: 'gen-2',
    date: '24/05/2025',
    type: 'Masivo',
    status: 'Completado',
    recordsCount: 12,
    templateName: 'Contrato de Prestación de Servicios',
  },
  {
    id: 'gen-3',
    date: '22/05/2025',
    type: 'Masivo',
    status: 'Completado',
    recordsCount: 8,
    templateName: 'Carta de Notificación',
  },
];

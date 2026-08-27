export type StepId = 
  | 'inicio' 
  | 'perfil' 
  | 'configuracion' 
  | 'plantillas' 
  | 'datos' 
  | 'generacion';

export interface UserProfile {
  name: string;
  position: string;
  email: string;
  signatureUrl: string;
  department?: string;
  phone?: string;
  location?: string;
}

export interface ResourceConfig {
  excelFileName: string;
  excelLoaded: boolean;
  templateFolderName: string;
  templatesLoaded: boolean;
}

export interface TemplateVariable {
  key: string;
  label: string;
  type: 'Texto' | 'Fecha' | 'Moneda' | 'Texto Largo' | 'Número' | 'Imagen' | 'Calculado';
  source?: 'Excel' | 'Perfil' | 'Calculado' | 'Firma';
}

export interface DocumentTemplate {
  id: string;
  title: string;
  category: 'Contratos' | 'Cartas' | 'Informes' | 'Facturas' | 'Formularios';
  description: string;
  fileName: string;
  variables: TemplateVariable[];
  sampleContent: string;
}

export interface DocumentRecord {
  id: number;
  status: 'Pendiente' | 'Validado' | 'Fusionado';
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
  numeroCuenta?: string;
  
  [key: string]: any;
}

export interface GenerationHistoryItem {
  id: string;
  date: string;
  type: 'Individual' | 'Masivo';
  status: 'Completado' | 'Procesando' | 'Fallido';
  recordsCount: number;
  templateName: string;
}

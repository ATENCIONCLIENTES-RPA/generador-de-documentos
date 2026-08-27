import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Folder, 
  FolderOpen,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Database,
  Layers,
  FileCheck
} from 'lucide-react';
import { EnergyIllustration } from '../components/EnergyIllustration';
import { ResourceConfig, StepId, DocumentRecord, DocumentTemplate } from '../types';
import * as XLSX from 'xlsx';
import { parseExcelFile } from '../utils/excelParser';

interface ConfigViewProps {
  config: ResourceConfig;
  onSaveConfig: (config: ResourceConfig) => void;
  onNavigate: (step: StepId) => void;
  onExcelDataLoaded: (records: DocumentRecord[]) => void;
  onTemplatesLoaded: (templates: DocumentTemplate[]) => void;
}

export const ConfigView: React.FC<ConfigViewProps> = ({
  config,
  onSaveConfig,
  onNavigate,
  onExcelDataLoaded,
  onTemplatesLoaded,
}) => {
  const [formData, setFormData] = useState<ResourceConfig>(config);
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadSubStatus, setUploadSubStatus] = useState('');
  const [uploadStage, setUploadStage] = useState<number>(1);
  const [loadedCount, setLoadedCount] = useState<number>(0);
  const [isSuccessCompleted, setIsSuccessCompleted] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [foundTemplateNames, setFoundTemplateNames] = useState<string[]>([]);

  const excelInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingExcel(true);
    setIsSuccessCompleted(false);
    setUploadProgress(10);
    setUploadStage(1);
    setUploadStatus('Iniciando carga del archivo...');
    setUploadSubStatus(`Preparando lectura de "${file.name}"`);
    setUploadError(null);

    const reader = new FileReader();

    reader.onload = (evt) => {
      setUploadProgress(30);
      setUploadStage(1);
      setUploadStatus('Leyendo archivo Excel...');
      setUploadSubStatus('Cargando contenido binario en memoria...');

      setTimeout(() => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          
          setUploadProgress(55);
          setUploadStage(2);
          setUploadStatus('Extrayendo hojas de cálculo...');
          setUploadSubStatus(`Analizando ${wb.SheetNames.length} hoja(s) disponibles...`);

          setTimeout(() => {
            try {
              const { records: parsedRecords, rawCount } = parseExcelFile(bstr as string);

              setUploadProgress(78);
              setUploadStage(3);
              setUploadStatus('Procesando y estructurando registros...');
              setUploadSubStatus(`Interpretando ${rawCount} filas reales del documento...`);

              setTimeout(() => {
                try {
                  const parsedCount = parsedRecords.length;
                  setLoadedCount(parsedCount);
                  onExcelDataLoaded(parsedRecords);

                  setUploadProgress(95);
                  setUploadStage(4);
                  setUploadStatus('Finalizando sincronización...');
                  setUploadSubStatus(`¡${parsedCount} registros del Excel listos para el Módulo 3: Datos del Documento!`);

                  setTimeout(() => {
                    setUploadProgress(100);
                    setIsSuccessCompleted(true);
                    setUploadStatus('¡Carga completada con éxito!');
                    setUploadSubStatus(`${parsedCount} registros importados fielmente desde su archivo.`);

                    setTimeout(() => {
                      setFormData((prev) => ({
                        ...prev,
                        excelFileName: file.name,
                        excelLoaded: true,
                      }));
                      setIsProcessingExcel(false);
                      setIsSuccessCompleted(false);
                    }, 1200);
                  }, 400);

                } catch (error) {
                  console.error('Error in struct phase:', error);
                  setUploadError('Ocurrió un error al procesar la estructura de los datos.');
                  setUploadStatus('Error al procesar archivo');
                  setTimeout(() => setIsProcessingExcel(false), 3500);
                }
              }, 250);
            } catch (error) {
              console.error('Error in extraction phase:', error);
              setUploadError('No se pudo extraer la información del archivo Excel.');
              setUploadStatus('Error de extracción');
              setTimeout(() => setIsProcessingExcel(false), 3500);
            }
          }, 250);
        } catch (error) {
          console.error('Error parsing excel binary:', error);
          setUploadError('El archivo seleccionado no es un formato de Excel válido.');
          setUploadStatus('Formato no válido');
          setTimeout(() => setIsProcessingExcel(false), 3500);
        }
      }, 300);
    };

    reader.onerror = () => {
      setUploadError('No se pudo leer el archivo seleccionado.');
      setUploadStatus('Error de lectura');
      setTimeout(() => setIsProcessingExcel(false), 3500);
    };

    reader.readAsBinaryString(file);
  };

  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let folderName = 'Plantillas';
    const templates: DocumentTemplate[] = [];
    const names: string[] = [];

    Array.from(files).forEach((f, index) => {
      const file = f as File & { webkitRelativePath: string };
      // Determine folder name from the first file's relative path
      if (index === 0 && file.webkitRelativePath) {
        const parts = file.webkitRelativePath.split('/');
        if (parts.length > 1) {
          folderName = parts[0];
        }
      }

      // Filter only files that look like templates (docx)
      if (file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) {
        names.push(file.name);
        
        // Mock a DocumentTemplate object
        templates.push({
          id: `tpl-${Date.now()}-${index}`,
          title: file.name.replace(/\.docx?$/i, ''),
          category: 'Cartas', // default category
          description: `Plantilla cargada desde carpeta ${folderName}`,
          fileName: file.name,
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
GESTIÓN DE DOCUMENTOS OFICIALES

Radicado: [RADICADO_ENTRADA] | Proceso: [NUMERO_PROCESO]
Fecha de Gestión: [FECHA_SOLICITUD]

Para: [NOMBRE_SOLICITANTE]
Cuenta Contractual: [NUMERO_CUENTA]
Correo Electrónico: [CORREO_SOLICITANTE]

Apreciado(a) [PRIMER_NOMBRE]:

Por medio de la presente comunicación oficial, ESSA - Electrificadora de Santander S.A. E.S.P. le notifica la gestión adelantada sobre su trámite identificado con radicado de entrada [RADICADO_ENTRADA].

Se ha verificado la información técnica y comercial para la cuenta de suministro [NUMERO_CUENTA] en el marco del proceso institucional [NUMERO_PROCESO].

Cualquier inquietud adicional será atendida oportunamente a través de nuestros canales oficiales o respondiendo a [CORREO_SOLICITANTE].

Atentamente,

[FIRMA_DOCUMENTO]

_____________________________________________
[NOMBRE_FIRMANTE]
Electrificadora de Santander S.A. E.S.P.`,
        });
      }
    });

    if (templates.length > 0) {
      setFoundTemplateNames(names);
      onTemplatesLoaded(templates);
      setFormData((prev) => ({
        ...prev,
        templateFolderName: folderName,
        templatesLoaded: true,
      }));
    } else {
      alert("No se encontraron archivos de plantilla (.doc, .docx) en la carpeta seleccionada.");
    }
  };

  const handleSaveAndContinue = () => {
    onSaveConfig(formData);
    onNavigate('datos');
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-300">
      {/* Header with Title and Energy Banner */}
      <div className="bg-transparent pt-1 pb-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#004b93] text-white flex items-center justify-center shadow-xs">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-extrabold text-[#002f6c] tracking-tight">
                  Módulo 2: Configuración de Recursos
                </h1>
                <p className="text-xs font-semibold text-slate-500">
                  Generación documental con Word
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 max-w-xl">
              Carga de recursos base y configuración de parámetros para la generación documental automatizada.
            </p>
          </div>

          <div className="lg:col-span-5 flex justify-end">
            <EnergyIllustration className="w-full max-w-[420px]" />
          </div>
        </div>
      </div>

      {/* 2-Column Configuration Grid (Excel & Selección de Carpetas de Destino) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Column 1: Carga de Archivo Excel */}
        <div className="bg-white rounded-2xl p-6 lg:p-7 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="pb-3 border-b-2 border-blue-600">
              <h3 className="text-base font-bold text-slate-800">
                1. Carga de Archivo Excel
              </h3>
            </div>

            {/* Drag & Drop Box */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  const dataTransfer = new DataTransfer();
                  dataTransfer.items.add(file);
                  if (excelInputRef.current) {
                    excelInputRef.current.files = dataTransfer.files;
                    const event = { target: excelInputRef.current } as unknown as React.ChangeEvent<HTMLInputElement>;
                    handleExcelUpload(event);
                  }
                }
              }}
              onClick={() => !isProcessingExcel && excelInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center space-y-3 min-h-[220px] ${
                isProcessingExcel
                  ? 'border-emerald-300 bg-emerald-50/50 cursor-default'
                  : uploadError
                  ? 'border-red-300 bg-red-50/50 hover:bg-red-50 hover:border-red-400 cursor-pointer'
                  : 'border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/30 cursor-pointer'
              }`}
            >
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleExcelUpload}
                className="hidden"
              />

              {isProcessingExcel ? (
                <div className="w-full max-w-sm py-2 px-2 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  {/* Dynamic Animated Emblem */}
                  <div className="relative flex items-center justify-center mx-auto">
                    {isSuccessCompleted ? (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-in zoom-in duration-300">
                        <CheckCircle2 className="w-9 h-9 animate-bounce" />
                      </div>
                    ) : (
                      <div className="relative">
                        {/* Outer pulsing ripple */}
                        <div className="absolute -inset-2 bg-emerald-400/20 rounded-3xl animate-ping opacity-75"></div>
                        {/* Rotating gradient ring */}
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-md relative z-10">
                          <span className="font-bold text-2xl tracking-tighter">X</span>
                          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                            <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stage Progress Pills */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {[
                      { num: 1, label: 'Lectura' },
                      { num: 2, label: 'Hojas' },
                      { num: 3, label: 'Datos' },
                      { num: 4, label: 'Listo' }
                    ].map((step) => {
                      const isPast = uploadStage > step.num || isSuccessCompleted;
                      const isCurrent = uploadStage === step.num && !isSuccessCompleted;
                      return (
                        <div 
                          key={step.num}
                          className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            isPast
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isCurrent
                              ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30 ring-2 ring-emerald-400/50 animate-pulse'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                        >
                          {isPast ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-700 shrink-0" />
                          ) : isCurrent ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin shrink-0" />
                          ) : null}
                          <span className="truncate">{step.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Status & SubStatus Messages */}
                  <div className="space-y-1 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-sm font-bold text-slate-800 tracking-tight">
                        {uploadStatus}
                      </p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {uploadProgress}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      {uploadSubStatus || 'Procesando el archivo en memoria...'}
                    </p>
                  </div>

                  {/* Modern Animated Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="w-full bg-slate-200/80 rounded-full h-3 p-0.5 overflow-hidden shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden shadow-sm"
                        style={{ width: `${uploadProgress}%` }}
                      >
                        {/* Shimmer light streak */}
                        <div className="absolute inset-0 bg-white/25 w-full animate-[pulse_1.5s_infinite]"></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-1">
                      <span>Iniciado</span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-500" />
                        {uploadProgress === 100 ? 'Procesamiento completo' : 'Procesando en tiempo real'}
                      </span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Reassurance Footer */}
                  <div className="pt-1">
                    <p className="text-[11px] text-slate-500 bg-emerald-50/60 border border-emerald-200/60 py-1.5 px-3 rounded-xl inline-block">
                      ⚡ El sistema está activo y analizando tus registros.
                    </p>
                  </div>
                </div>
              ) : uploadError ? (
                <div className="w-full max-w-sm space-y-3 py-2 animate-in fade-in zoom-in duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-sm">
                    <AlertCircle className="w-7 h-7" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-sm font-bold text-red-700">{uploadStatus}</p>
                    <p className="text-xs text-red-600 px-2 leading-relaxed">{uploadError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadError(null);
                      excelInputRef.current?.click();
                    }}
                    className="mt-2 px-4 py-2 bg-white border border-red-300 hover:bg-red-50 text-red-700 text-xs font-bold rounded-xl shadow-xs transition-colors"
                  >
                    Intentar de nuevo con otro archivo
                  </button>
                </div>
              ) : (
                <>
                  {/* Excel Logo Graphic */}
                  <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-2xl shadow-md relative group-hover:scale-105 transition-transform">
                    X
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-xs">
                      <Upload className="w-3.5 h-3.5 text-emerald-700" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-slate-600 px-4 leading-relaxed">
                      Arrastre y suelte su archivo Excel aquí, o haga clic para seleccionar.
                    </p>
                    <button
                      type="button"
                      className="mt-2 px-4 py-2 bg-[#004b93] hover:bg-[#003870] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors"
                    >
                      Seleccionar Archivo
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium">
                    Archivos compatibles: .xlsx, .xls, .csv
                  </span>
                </>
              )}
            </div>

            {/* Loaded Status Feedback */}
            {formData.excelLoaded && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="text-xs font-semibold text-emerald-900 truncate">
                    {formData.excelFileName}
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-200/80 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Cargado
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Selección de Carpeta de Plantillas */}
        <div className="bg-white rounded-2xl p-6 lg:p-7 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="pb-3 border-b-2 border-blue-600">
              <h3 className="text-base font-bold text-slate-800">
                2. Selección de Carpeta de Plantillas
              </h3>
            </div>

            {/* Folder Selection Box */}
            <div
              onClick={() => folderInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 min-h-[220px]"
            >
              <input
                ref={folderInputRef}
                type="file"
                // @ts-ignore - webkitdirectory is non-standard but supported by most modern browsers
                webkitdirectory="true"
                directory="true"
                multiple
                onChange={handleFolderUpload}
                className="hidden"
              />

              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-[#004b93] flex items-center justify-center shadow-md relative">
                <FolderOpen className="w-7 h-7" />
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-xs">
                  <Upload className="w-3.5 h-3.5 text-blue-700" />
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-600 px-4 leading-relaxed">
                  Haz clic para seleccionar la carpeta en tu equipo que contiene las plantillas a utilizar.
                </p>
                <button
                  type="button"
                  className="mt-2 px-4 py-2 bg-[#004b93] hover:bg-[#003870] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors"
                >
                  Seleccionar Carpeta
                </button>
              </div>

              <span className="text-[11px] text-slate-400 font-medium">
                Se detectarán automáticamente archivos .doc y .docx
              </span>
            </div>

            {/* Loaded Status Feedback */}
            {formData.templatesLoaded && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Folder className="w-4 h-4 text-blue-700 shrink-0" />
                    <span className="text-xs font-semibold text-blue-900 truncate">
                      {formData.templateFolderName}
                    </span>
                  </div>
                  <span className="text-[10px] bg-blue-200/80 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                    {foundTemplateNames.length} Plantillas
                  </span>
                </div>
                
                {foundTemplateNames.length > 0 && (
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg max-h-28 overflow-y-auto">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Plantillas detectadas:</p>
                    <ul className="space-y-1">
                      {foundTemplateNames.map((name, idx) => (
                        <li key={idx} className="text-xs text-slate-600 flex items-center gap-1.5">
                          <span className="w-1 h-1 bg-blue-400 rounded-full shrink-0"></span>
                          <span className="truncate">{name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => onNavigate('perfil')}
          className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-xl transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSaveAndContinue}
          className="flex items-center gap-2 px-8 py-2.5 bg-[#004b93] hover:bg-[#003870] text-white text-sm font-bold rounded-xl shadow-sm transition-all hover:scale-102"
        >
          Guardar y Continuar
        </button>
      </div>
    </div>
  );
};

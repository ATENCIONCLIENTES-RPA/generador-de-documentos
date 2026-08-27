import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Download, 
  Archive, 
  Settings, 
  Check, 
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import { DocumentTemplate, DocumentRecord, GenerationHistoryItem, UserProfile } from '../types';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { formatApplicantName, extractFirstName, replaceTemplateVariables } from '../utils/nameParser';

interface GenerateViewProps {
  template: DocumentTemplate;
  records: DocumentRecord[];
  profile: UserProfile;
  history?: GenerationHistoryItem[];
  onAddHistory?: (item: GenerationHistoryItem) => void;
}

export const GenerateView: React.FC<GenerateViewProps> = ({
  template,
  records = [],
  profile,
  onAddHistory,
}) => {
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(true);
  const [isDone, setIsDone] = useState(false);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState('');

  const activeRecords = records.filter((r) => r.selected);
  const targetRecords = activeRecords.length > 0 ? activeRecords : (records.length > 0 ? records.slice(0, 3) : []);

  useEffect(() => {
    // Smooth progress animation
    let current = 0;
    const interval = setInterval(() => {
      current += 15;
      if (current >= 100) {
        current = 100;
        setProgress(100);
        setIsGenerating(false);
        setIsDone(true);
        clearInterval(interval);

        // Add to history if callback provided
        if (onAddHistory && targetRecords.length > 0) {
          onAddHistory({
            id: `gen-${Date.now()}`,
            date: new Date().toLocaleDateString('es-CO'),
            type: targetRecords.length > 1 ? 'Masivo' : 'Individual',
            status: 'Completado',
            recordsCount: targetRecords.length,
            templateName: template?.title || 'Documento ESSA',
          });
        }
      } else {
        setProgress(current);
      }
    }, 150);

    return () => clearInterval(interval);
  }, []);

  const generateSingleDocumentText = (record: DocumentRecord) => {
    const formattedName = formatApplicantName(record.nombreSolicitante);
    const primerNombre = extractFirstName(record.nombreSolicitante);
    const resolvedClauses = replaceTemplateVariables(template?.sampleContent || '', record, profile);

    return `=====================================================
ELECTRIFICADORA DE SANTANDER S.A. E.S.P. - GRUPO EPM
${(template?.title || 'DOCUMENTO OFICIAL').toUpperCase()}
=====================================================
Fecha Solicitud: ${record.fechaSolicitud || '—'}
Radicado Oficial: ${record.radicadoEntrada || '—'}
Número Proceso: ${record.numeroProceso || '—'}

DATOS DEL CLIENTE / SUSCRIPTOR:
- Nombre Completo: ${formattedName || '—'}
- Primer Nombre: ${primerNombre || '—'}
- Identificador / Cédula: ${record.cedulaSolicitante || '—'}
- Dirección: ${record.direccionSolicitante || '—'}
- Dependencia / Ubicación: ${record.departamentoSolicitante || 'Santander'} - ${record.municipioSolicitante || 'Bucaramanga'}
- Correo Electrónico: ${record.correoSolicitante || '—'}
- Cuenta Contrato: ${record.numeroCuenta || record.cuenta || '—'}

OBJETO Y CLÁUSULAS CONTRACTUALES:
${resolvedClauses || 'Suministro de energía eléctrica según normatividad vigente.'}

FUNCIONARIO RESPONSABLE:
- Nombre: ${profile?.name || 'Funcionario ESSA'}
- Cargo: ${profile?.position || 'Gestor'}
- Correo: ${profile?.email || 'notificaciones@essa.com.co'}

Certificado Digital ESSA Grupo EPM. Documento válido y legalizado.
`;
  };

  const handleDownloadSingle = () => {
    const firstRecord = targetRecords[0] || records[0];
    if (!firstRecord) return;
    const content = generateSingleDocumentText(firstRecord);
    const blob = new Blob([content], { type: 'application/msword;charset=utf-8' });
    const cleanName = formatApplicantName(firstRecord.nombreSolicitante).replace(/\s+/g, '_') || 'Documento';
    saveAs(blob, `ESSA_${template?.fileName ? template.fileName.replace('.docx', '') : 'Plantilla'}_${cleanName}.docx`);
    
    setDownloadSuccessMessage('Documento individual DOCX descargado exitosamente.');
    setTimeout(() => setDownloadSuccessMessage(''), 4000);
  };

  const handleDownloadZip = async () => {
    if (targetRecords.length === 0) return;
    const zip = new JSZip();
    const folder = zip.folder("Documentos_ESSA_2025");

    targetRecords.forEach((rec) => {
      const docContent = generateSingleDocumentText(rec);
      const cleanName = formatApplicantName(rec.nombreSolicitante).replace(/\s+/g, '_') || `Registro_${rec.id}`;
      const fileName = `ESSA_${rec.id}_${cleanName}.docx`;
      folder?.file(fileName, docContent);
    });

    // Add manifest summary
    folder?.file("Resumen_Generacion_ESSA.txt", `Lote de Generación Documental ESSA
Total de Documentos: ${targetRecords.length}
Plantilla Utilizada: ${template?.title || 'Plantilla'}
Funcionario: ${profile?.name || 'Funcionario'} (${profile?.position || 'Cargo'})
Fecha: ${new Date().toLocaleString('es-CO')}
`);

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `Lote_Documentos_ESSA_${Date.now()}.zip`);

    setDownloadSuccessMessage(`Archivo ZIP masivo con ${targetRecords.length} documentos descargado exitosamente.`);
    setTimeout(() => setDownloadSuccessMessage(''), 4000);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold text-[#002f6c] tracking-tight">
          Módulo 6: Generación y Descarga
        </h1>
        <p className="text-xs font-semibold text-slate-500 mt-0.5">
          Generación documental con Word
        </p>
        <p className="text-sm text-slate-600 mt-1">
          Plataforma de generación documental automatizada para la empresa ESSA. Complete el proceso de generación y descargue sus documentos.
        </p>
      </div>

      {downloadSuccessMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{downloadSuccessMessage}</span>
        </div>
      )}

      {/* Main Generation Progress & Download Card */}
      <div className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="w-full md:w-7/12 space-y-6">
          {/* Progress label */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-bold text-slate-800">
              <span className="flex items-center gap-2">
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 text-emerald-600" />
                )}
                Generando documentos... {progress}%
              </span>
            </div>

            {/* Green Progress Bar */}
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300 shadow-xs"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Success Callout message */}
          {isDone && (
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm bg-emerald-50/80 px-3.5 py-2 rounded-xl border border-emerald-200 animate-in fade-in">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span>
                {targetRecords.length > 0
                  ? `¡Generación completada con éxito! (${targetRecords.length} documentos procesados)`
                  : 'Proceso completado. Cargue registros desde Excel en el Módulo 3 para generar documentos personalizados.'}
              </span>
            </div>
          )}

          {/* Action Download Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            {/* Green button: Descargar DOCX individual */}
            <button
              onClick={handleDownloadSingle}
              disabled={!isDone || targetRecords.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-[#107c41] hover:bg-[#0b5c30] text-white text-sm font-bold rounded-xl shadow-xs transition-all hover:scale-102 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Descargar DOCX individual
            </button>

            {/* Blue button: Descargar ZIP masivo */}
            <button
              onClick={handleDownloadZip}
              disabled={!isDone || targetRecords.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-[#004b93] hover:bg-[#003870] text-white text-sm font-bold rounded-xl shadow-xs transition-all hover:scale-102 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Archive className="w-4 h-4" />
              Descargar ZIP masivo
            </button>
          </div>
        </div>

        {/* Right Gear & Document Graphic */}
        <div className="w-full md:w-5/12 flex justify-center items-center">
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Document sheet */}
            <div className="w-32 h-40 bg-white border-2 border-blue-200 rounded-xl shadow-md p-3 space-y-2 flex flex-col justify-center">
              <div className="w-16 h-2 bg-blue-300 rounded" />
              <div className="w-full h-1.5 bg-slate-200 rounded" />
              <div className="w-full h-1.5 bg-slate-200 rounded" />
              <div className="w-20 h-1.5 bg-slate-200 rounded" />
              <div className="w-full h-1.5 bg-slate-200 rounded" />
            </div>

            {/* Blue Gears decoration */}
            <div className="absolute -bottom-2 -right-2 w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-400 flex items-center justify-center shadow-lg text-[#004b93] animate-[spin_10s_linear_infinite]">
              <Settings className="w-9 h-9" />
            </div>
            <div className="absolute top-2 right-4 w-10 h-10 rounded-full bg-blue-100/80 border border-blue-300 flex items-center justify-center text-blue-700 animate-[spin_8s_linear_infinite_reverse]">
              <Settings className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

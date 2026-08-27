import React, { useState } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  AlertCircle,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import { DocumentTemplate, DocumentRecord, UserProfile, StepId } from '../types';
import { EssaLogo } from '../components/EssaLogo';
import { formatApplicantName, extractFirstName, replaceTemplateVariables } from '../utils/nameParser';

interface PreviewViewProps {
  template: DocumentTemplate;
  selectedRecords: DocumentRecord[];
  profile: UserProfile;
  onNavigate: (step: StepId) => void;
}

export const PreviewView: React.FC<PreviewViewProps> = ({
  template,
  selectedRecords,
  profile,
  onNavigate,
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);

  const activeRecords = selectedRecords || [];
  const totalPages = Math.max(activeRecords.length, 1);
  const currentRecord = activeRecords[currentPage - 1] || activeRecords[0] || null;

  const formattedClientName = currentRecord ? formatApplicantName(currentRecord.nombreSolicitante) : '—';
  const clientPrimerNombre = currentRecord ? extractFirstName(currentRecord.nombreSolicitante) : '';
  const renderedContent = currentRecord && template ? replaceTemplateVariables(template.sampleContent, currentRecord, profile) : '';

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 15, 60));

  const handlePrevPage = () => {
    setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => (prev < totalPages ? prev + 1 : prev));
  };

  if (!currentRecord) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#002f6c] tracking-tight">
            Módulo 5: Vista Previa Real
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Previsualización de alta fidelidad del documento con datos fusionados.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 sm:p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-slate-800">
            No hay registros seleccionados para previsualizar
          </h2>
          <p className="text-sm text-slate-500 max-w-lg mt-2 mb-6">
            Para ver la vista previa del documento con los datos reales del cliente, por favor ingrese al <strong className="text-slate-700">Módulo 3: Datos del Documento</strong> y marque las casillas de verificación de los registros que desea procesar.
          </p>

          <button
            onClick={() => onNavigate('datos')}
            className="px-6 py-3 bg-[#004b93] hover:bg-[#003870] text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Ir a Seleccionar Registros en Módulo 3
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold text-[#002f6c] tracking-tight">
          Módulo 5: Vista Previa Real
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Previsualización de alta fidelidad del documento con datos fusionados.
        </p>
      </div>

      {/* 2 Columns: Controls (Left) & Document Canvas (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Controles de Visualización (3-4 cols) */}
        <div className="lg:col-span-3 space-y-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <h3 className="text-base font-bold text-slate-800 tracking-tight pb-3 border-b border-slate-100">
            Controles de Visualización
          </h3>

          {/* Zoom Buttons */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleZoomIn}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors shadow-2xs"
            >
              <ZoomIn className="w-4 h-4 text-blue-600" />
              + Zoom
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleZoomOut}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors shadow-2xs"
              >
                <ZoomOut className="w-4 h-4 text-blue-600" />
                - Zoom
              </button>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-2.5 rounded-xl border border-slate-200 shrink-0">
                {zoomLevel}%
              </span>
            </div>
          </div>

          {/* Página Controls */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-slate-700 block">
              Página
            </label>
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-1.5">
              <span className="text-xs font-bold text-slate-700 pl-3">
                {currentPage} de {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Big Action Button: Confirmar y Generar */}
          <div className="pt-4">
            <button
              type="button"
              onClick={() => onNavigate('generacion')}
              className="w-full py-3 bg-[#004b93] hover:bg-[#003870] text-white text-sm font-bold rounded-xl shadow-md transition-all hover:scale-102 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              Confirmar y Generar
            </button>
          </div>

          {/* Summary Info */}
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs space-y-1.5 text-slate-600">
            <div className="font-bold text-[#004b93]">Resumen de Fusión:</div>
            <div>• Plantilla: {template?.title || 'Plantilla ESSA'}</div>
            <div>• Cliente: {formattedClientName}</div>
            <div>• Primer Nombre: <span className="font-semibold text-purple-700">{clientPrimerNombre || '—'}</span></div>
            <div>• Radicado: {currentRecord.radicadoEntrada || '—'}</div>
            <div>• Funcionario: {profile?.name || '—'}</div>
          </div>
        </div>

        {/* Right Column: Vista Previa del Documento Canvas (9 cols) */}
        <div className="lg:col-span-9 bg-slate-100/80 rounded-2xl p-6 border border-slate-200 shadow-inner flex flex-col items-center justify-center min-h-[700px] overflow-hidden">
          <div className="w-full flex items-center justify-between mb-3 text-xs font-semibold text-slate-500 max-w-[800px]">
            <span>Vista Previa del Documento</span>
            <span>Documento generado con Microsoft Word Engine</span>
          </div>

          {/* Scalable Realistic Paper Document */}
          <div
            className="w-full max-w-[800px] bg-white rounded-sm shadow-2xl border border-slate-300/80 p-12 transition-transform duration-200 flex flex-col justify-between"
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center',
              minHeight: '880px',
            }}
          >
            {/* Document Letterhead */}
            <div className="space-y-6">
              <div className="flex items-start justify-between border-b-2 border-[#004b93] pb-4">
                <EssaLogo variant="document" />
                <div className="text-right text-[11px] text-slate-500 font-sans">
                  <p className="font-bold text-slate-800">ELECTRIFICADORA DE SANTANDER S.A. E.S.P.</p>
                  <p>NIT: 890.200.222-3</p>
                  <p className="text-[#004b93] font-semibold mt-1">Bucaramanga, {currentRecord.fechaSolicitud || '26/08/2026'}</p>
                </div>
              </div>

              {/* Title of Document */}
              <div className="text-center space-y-1 py-2">
                <h2 className="text-base font-extrabold text-slate-900 tracking-wide uppercase font-serif">
                  {template?.title || 'DOCUMENTO OFICIAL'}
                </h2>
                <p className="text-xs text-slate-500 font-sans">
                  Suministro y Prestación Oficial de Servicios Públicos Domiciliarios
                </p>
              </div>

              {/* Document Body */}
              <div className="text-xs text-slate-800 leading-relaxed space-y-4 font-serif text-justify">
                <p>
                  Entre los suscritos a saber, por una parte <strong>ELECTRIFICADORA DE SANTANDER S.A. E.S.P.</strong>, entidad legalmente constituida para la distribución y comercialización de energía en el departamento de Santander, en adelante denominada <strong>"LA EMPRESA"</strong>, representada en este acto por el funcionario <strong>{profile?.name}</strong>, en su calidad de <strong>{profile?.position}</strong>; y de otra parte el ciudadano(a) o persona jurídica identificada como:
                </p>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-sans space-y-1.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 block text-[10px]">SUSCRIPTOR TITULAR:</span>
                      <strong className="text-[#004b93] font-bold text-sm">{formattedClientName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">NÚMERO DE CUENTA / RADICADO:</span>
                      <strong className="text-slate-800">{currentRecord.radicadoEntrada || '—'}</strong>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                    <div>
                      <span className="text-slate-500 block text-[10px]">SECTOR / UBICACIÓN:</span>
                      <span className="text-slate-800">{currentRecord.departamentoSolicitante || 'Santander'} - {currentRecord.municipioSolicitante || 'Bucaramanga'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">DIRECCIÓN:</span>
                      <strong className="text-slate-800">{currentRecord.direccionSolicitante || '—'}</strong>
                    </div>
                  </div>
                </div>

                <p>
                  <strong>CLÁUSULA PRIMERA - OBJETO:</strong> LA EMPRESA se compromete a prestar el servicio público de energía eléctrica en las condiciones de calidad técnica y confiabilidad reglamentadas por la CREG y la Superintendencia de Servicios Públicos.
                </p>

                <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg whitespace-pre-line font-sans text-xs text-slate-700 leading-relaxed">
                  {renderedContent || template?.sampleContent || 'Conforme a los lineamientos y especificaciones técnicas normativas aplicables.'}
                </div>

                <p>
                  <strong>CLÁUSULA TERCERA - VIGENCIA Y REVISIÓN:</strong> El presente instrumento contractual surte efectos jurídicos a partir de la fecha de su formalización digital y se prorrogará automáticamente conforme a la normatividad vigente.
                </p>
              </div>
            </div>

            {/* Signature Block */}
            <div className="pt-8 mt-6 border-t border-slate-200 space-y-6">
              <div className="grid grid-cols-2 gap-8 items-end">
                {/* Company Representative Signature */}
                <div className="space-y-1">
                  <div className="h-16 flex items-center justify-start">
                    {profile?.signatureUrl ? (
                      <img
                        src={profile.signatureUrl}
                        alt="Firma Funcionario"
                        className="max-h-16 object-contain"
                      />
                    ) : (
                      <svg className="w-40 h-12 text-[#002f6c]" viewBox="0 0 160 50" fill="none">
                        <path
                          d="M 10 35 C 25 10, 40 45, 55 18 C 70 8, 80 40, 95 25 C 110 10, 125 45, 145 20"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <p className="font-bold text-xs text-slate-900 font-sans">{profile?.name}</p>
                    <p className="text-[10px] text-slate-500 font-sans">{profile?.position}</p>
                    <p className="text-[9px] text-[#004b93] font-sans">ESSA GRUPO EPM</p>
                  </div>
                </div>

                {/* Client Signature */}
                <div className="space-y-1 text-right">
                  <div className="h-16 flex items-center justify-end">
                    <span className="text-[11px] text-slate-400 italic">
                      [Firma Digital Aceptada por el Cliente]
                    </span>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <p className="font-bold text-xs text-slate-900 font-sans">{formattedClientName}</p>
                    <p className="text-[10px] text-slate-500 font-sans">Suscriptor / Titular</p>
                    <p className="text-[9px] text-slate-400 font-sans">C.C. {currentRecord.cedulaSolicitante || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Document Page Footer */}
              <div className="flex items-center justify-between text-[9px] text-slate-400 font-sans pt-4 border-t border-slate-100">
                <span>ESSA S.A. E.S.P. - Carrera 19 No. 24-56 Bucaramanga | Línea 018000 910 115</span>
                <span>Página {currentPage} de {totalPages}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

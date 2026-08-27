import React from 'react';
import { 
  FileText, 
  Timer, 
  ShieldCheck, 
  Wrench, 
  Cloud, 
  ArrowRight
} from 'lucide-react';
import { EnergyIllustration } from '../components/EnergyIllustration';
import { StepId, DocumentTemplate, DocumentRecord } from '../types';

interface HomeViewProps {
  onNavigate: (step: StepId) => void;
  selectedTemplate: DocumentTemplate | null;
  selectedRecord?: DocumentRecord;
  hasExcelLoaded: boolean;
  onLoadSampleData: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
}) => {

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Hero Header Section */}
      <div className="bg-transparent pt-3 pb-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Hero Left Content */}
          <div className="lg:col-span-6 space-y-3 pl-2">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              Generador de Plantillas
            </span>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-[#002f6c] tracking-tight">
              Generación documental con Word
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-xl">
              Crea documentos profesionales de manera rápida y sencilla a partir de plantillas personalizadas y datos estructurados.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => onNavigate('perfil')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#004b93] hover:bg-[#003870] text-white text-sm font-semibold rounded-xl shadow-sm transition-all hover:translate-x-0.5"
              >
                Comenzar Flujo
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Hero Right Banner Illustration */}
          <div className="lg:col-span-6 flex justify-end">
            <EnergyIllustration className="w-full max-w-[560px]" />
          </div>
        </div>
      </div>

      {/* Main Container Layout */}
      <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
        {/* Left Card: Bienvenido al Generador */}
        <div className="bg-white rounded-2xl p-6 lg:p-7 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="space-y-6">
            {/* Card Title */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#004b93] shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                  Bienvenido al Generador
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Sigue los pasos del flujo superior para generar tu documento.
                </p>
              </div>
            </div>

            {/* 4 Feature Columns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-center">
              {/* Feature 1 */}
              <div className="flex flex-col items-center space-y-2 p-2">
                <div className="w-11 h-11 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#004b93]">
                  <Timer className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">Rápido</h4>
                <p className="text-[11px] text-slate-500 leading-tight">
                  (Genera documentos en segundos)
                </p>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col items-center space-y-2 p-2">
                <div className="w-11 h-11 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#004b93]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">Seguro</h4>
                <p className="text-[11px] text-slate-500 leading-tight">
                  (Datos protegidos y confidenciales)
                </p>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col items-center space-y-2 p-2">
                <div className="w-11 h-11 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#004b93]">
                  <Wrench className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">Personalizado</h4>
                <p className="text-[11px] text-slate-500 leading-tight">
                  (Plantillas adaptadas a tus necesidades)
                </p>
              </div>

              {/* Feature 4 */}
              <div className="flex flex-col items-center space-y-2 p-2">
                <div className="w-11 h-11 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#004b93]">
                  <Cloud className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">En la nube</h4>
                <p className="text-[11px] text-slate-500 leading-tight">
                  (Accede desde cualquier lugar)
                </p>
              </div>
            </div>
          </div>

          {/* Info callout */}
          <div className="mt-8 p-4 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#004b93] text-white flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
              i
            </div>
            <div className="text-xs text-slate-700 space-y-1">
              <span className="font-bold text-[#004b93] block">¿Cómo funciona?</span>
              <p className="text-slate-600 leading-relaxed">
                Completa los pasos en el flujo superior de izquierda a derecha. Cada módulo te guiará en la configuración necesaria para generar tu documento de forma exitosa.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

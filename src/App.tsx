import React, { useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { StepperBar } from './components/StepperBar';
import { HomeView } from './views/HomeView';
import { ProfileView } from './views/ProfileView';
import { ConfigView } from './views/ConfigView';
import { TemplatesView } from './views/TemplatesView';
import { DataView } from './views/DataView';
import { PreviewView } from './views/PreviewView';
import { GenerateView } from './views/GenerateView';

import {
  StepId,
  UserProfile,
  ResourceConfig,
  DocumentTemplate,
  DocumentRecord,
  GenerationHistoryItem,
} from './types';
import {
  initialProfile,
  sampleTemplates,
  initialRecords,
  initialHistory,
} from './data/mockData';

export default function App() {
  const [currentStep, setCurrentStep] = useState<StepId>('inicio');
  const [generationSubView, setGenerationSubView] = useState<'preview' | 'download'>('preview');

  // Application Data States
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [config, setConfig] = useState<ResourceConfig>({
    excelFileName: '',
    excelLoaded: false,
    selectedPqrAgpeFolder: 'Plantillas_Reclamos_PQR_AGPE',
    folders: [
      'Plantillas_Reclamos_PQR_AGPE',
      'Documentos_2025',
      'Contratos_ESSA',
      'Reportes_Ventas'
    ],
  });

  const [templates, setTemplates] = useState<DocumentTemplate[]>(sampleTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(sampleTemplates[0] || null);
  const [records, setRecords] = useState<DocumentRecord[]>([]);
  const [history, setHistory] = useState<GenerationHistoryItem[]>(initialHistory);
  const [completedSteps, setCompletedSteps] = useState<StepId[]>(['inicio', 'perfil', 'configuracion', 'datos']);

  const excelCount = records.length;
  const markedCount = records.filter((r) => r.selected).length;

  const handleStepChange = (step: StepId) => {
    if (step === 'generacion' && !selectedTemplate) {
      alert("Por favor, seleccione una plantilla primero en el Módulo 4: Selección de Plantillas.");
      return;
    }
    setCurrentStep(step);
    if (!completedSteps.includes(step)) {
      setCompletedSteps((prev) => [...prev, step]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f4f9] text-[#1e293b] font-sans antialiased selection:bg-blue-200">
      {/* Top Header matching all screenshots */}
      <Header
        currentStep={currentStep}
        onSelectStep={handleStepChange}
        excelCount={excelCount}
        markedCount={markedCount}
        profile={profile}
        completedSteps={completedSteps}
      />

      {/* Connected Stepper Bar for screens 3, 4, 5, 6 */}
      {currentStep !== 'inicio' && (
        <StepperBar
          currentStep={currentStep}
          onSelectStep={handleStepChange}
        />
      )}

      {/* Main Container Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentStep === 'inicio' && (
          <HomeView
            onNavigate={handleStepChange}
            selectedTemplate={selectedTemplate}
            selectedRecord={records.find((r) => r.selected) || records[0]}
            hasExcelLoaded={config.excelLoaded}
            onLoadSampleData={() => {}}
          />
        )}

        {currentStep === 'perfil' && (
          <ProfileView
            profile={profile}
            onSaveProfile={(updated) => {
              setProfile(updated);
            }}
            onNavigate={handleStepChange}
          />
        )}

        {currentStep === 'configuracion' && (
          <ConfigView
            config={config}
            onSaveConfig={(updated) => {
              setConfig(updated);
            }}
            onNavigate={handleStepChange}
            onExcelDataLoaded={(newRecords) => {
              setRecords(newRecords);
            }}
            onTemplatesLoaded={(newTemplates) => {
              setTemplates(newTemplates);
              if (newTemplates.length > 0) {
                setSelectedTemplate(newTemplates[0]);
              }
            }}
          />
        )}

        {currentStep === 'datos' && (
          <DataView
            records={records}
            onUpdateRecords={(updated) => setRecords(updated)}
            onNavigate={(step) => {
              if (step === 'generacion') {
                setGenerationSubView('preview');
              }
              handleStepChange(step);
            }}
          />
        )}

        {currentStep === 'plantillas' && (
          <TemplatesView
            templates={templates}
            selectedTemplate={selectedTemplate}
            onSelectTemplate={(tpl) => setSelectedTemplate(tpl)}
            onNavigate={handleStepChange}
            profile={profile}
            records={records}
          />
        )}

        {currentStep === 'generacion' && (
          <div className="space-y-4">
            {/* Sub-view switcher between Módulo 5 (Vista Previa) and Módulo 6 (Descarga) */}
            <div className="flex items-center justify-between bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <span className="text-slate-400">Flujo Final:</span>
                <button
                  type="button"
                  onClick={() => setGenerationSubView('preview')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    generationSubView === 'preview'
                      ? 'bg-[#004b93] text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Módulo 5: Vista Previa Real
                </button>
                <button
                  type="button"
                  onClick={() => setGenerationSubView('download')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    generationSubView === 'download'
                      ? 'bg-[#004b93] text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Módulo 6: Generación y Descarga
                </button>
              </div>

              <div className="text-xs text-slate-500 font-medium hidden sm:block">
                Plantilla: <strong className="text-slate-800">{selectedTemplate?.title || 'Ninguna seleccionada'}</strong>
              </div>
            </div>

            {generationSubView === 'preview' ? (
              <PreviewView
                template={selectedTemplate!}
                selectedRecords={records.filter((r) => r.selected)}
                profile={profile}
                onNavigate={(step) => {
                  if (step === 'generacion') {
                    setGenerationSubView('download');
                  } else {
                    handleStepChange(step);
                  }
                }}
              />
            ) : (
              <GenerateView
                template={selectedTemplate!}
                records={records}
                profile={profile}
                history={history}
                onAddHistory={(newItem) => setHistory((prev) => [newItem, ...prev])}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer matching all screenshots */}
      <Footer />
    </div>
  );
}

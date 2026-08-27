// ============================================
// Main App - ESSA Generador Documental
// ============================================

const { useState } = React;

const App = () => {
  const [currentStep, setCurrentStep] = useState('inicio');
  const [generationSubView, setGenerationSubView] = useState('preview');
  const [profile, setProfile] = useState(initialProfile);
  const [config, setConfig] = useState({
    excelFileName: '',
    excelLoaded: false,
    templateFolderName: '',
    templatesLoaded: false,
    selectedPqrAgpeFolder: 'Plantillas_Reclamos_PQR_AGPE',
    folders: ['Plantillas_Reclamos_PQR_AGPE', 'Documentos_2025', 'Contratos_ESSA', 'Reportes_Ventas'],
  });
  const [templates, setTemplates] = useState(sampleTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState(sampleTemplates[0]?.id || null);
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || null;
  const [records, setRecords] = useState([]);
  const [history, setHistory] = useState(initialHistory);
  const [completedSteps, setCompletedSteps] = useState(['inicio', 'perfil', 'configuracion', 'datos']);

  const excelCount = records.length;
  const markedCount = records.filter((r) => r.selected).length;

  const navMap = {
    home: 'inicio',
    profile: 'perfil',
    config: 'configuracion',
    data: 'datos',
    templates: 'plantillas',
    preview: 'generacion',
    generate: 'generacion',
    inicio: 'inicio',
    perfil: 'perfil',
    configuracion: 'configuracion',
    datos: 'datos',
    plantillas: 'plantillas',
    generacion: 'generacion',
  };

  const handleStepChange = (step) => {
    const mapped = navMap[step] || step;
    if (mapped === 'generacion' && !selectedTemplateId) {
      alert("Por favor, seleccione una plantilla primero en el Módulo 4: Selección de Plantillas.");
      return;
    }
    setCurrentStep(mapped);
    if (!completedSteps.includes(mapped)) {
      setCompletedSteps((prev) => [...prev, mapped]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f0f4f9', color: '#1e293b', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <Header
        currentStep={currentStep}
        onSelectStep={handleStepChange}
        excelCount={excelCount}
        markedCount={markedCount}
        profile={profile}
        completedSteps={completedSteps}
      />

      {currentStep !== 'inicio' && (
        <StepperBar
          currentStep={currentStep}
          onSelectStep={handleStepChange}
        />
      )}

      <main className="flex-1" style={{ maxWidth: 1600, width: '100%', margin: '0 auto', padding: '1.5rem' }}>
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
            onSaveProfile={(updated) => setProfile(updated)}
            onNavigate={handleStepChange}
          />
        )}

        {currentStep === 'configuracion' && (
          <ConfigView
            config={config}
            onSaveConfig={(updated) => setConfig(updated)}
            onNavigate={handleStepChange}
            onExcelDataLoaded={(newRecords) => setRecords(newRecords)}
            onTemplatesLoaded={(newTemplates) => {
              setTemplates(newTemplates);
              if (newTemplates.length > 0) setSelectedTemplateId(newTemplates[0].id);
            }}
          />
        )}

        {currentStep === 'datos' && (
          <DataView
            records={records}
            onUpdateRecords={(updated) => setRecords(updated)}
            onNavigate={(step) => {
              if (step === 'generacion') setGenerationSubView('preview');
              handleStepChange(step);
            }}
          />
        )}

        {currentStep === 'plantillas' && (
          <TemplatesView
            templates={templates}
            selectedTemplate={selectedTemplate}
            onSelectTemplate={(tplId) => setSelectedTemplateId(tplId)}
            onNavigate={handleStepChange}
            profile={profile}
            records={records}
          />
        )}

        {currentStep === 'generacion' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between card" style={{ padding: '0.625rem 1.25rem' }}>
              <div className="flex items-center gap-2 text-xs font-bold" style={{ color: '#475569' }}>
                <span style={{ color: '#94a3b8' }}>Flujo Final:</span>
                <button
                  type="button"
                  onClick={() => setGenerationSubView('preview')}
                  className="px-3 py-1 rounded-lg"
                  style={{
                    backgroundColor: generationSubView === 'preview' ? '#004b93' : 'transparent',
                    color: generationSubView === 'preview' ? '#fff' : '#475569',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                  }}
                >
                  Módulo 5: Vista Previa Real
                </button>
                <button
                  type="button"
                  onClick={() => setGenerationSubView('download')}
                  className="px-3 py-1 rounded-lg"
                  style={{
                    backgroundColor: generationSubView === 'download' ? '#004b93' : 'transparent',
                    color: generationSubView === 'download' ? '#fff' : '#475569',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                  }}
                >
                  Módulo 6: Generación y Descarga
                </button>
              </div>
              <div className="text-xs font-medium hidden sm:block" style={{ color: '#64748b' }}>
                Plantilla: <strong style={{ color: '#1e293b' }}>{selectedTemplate?.title || 'Ninguna seleccionada'}</strong>
              </div>
            </div>

            {generationSubView === 'preview' ? (
              <PreviewView
                template={selectedTemplate}
                selectedRecords={records.filter((r) => r.selected)}
                profile={profile}
                onNavigate={(step) => {
                  if (step === 'generacion') setGenerationSubView('download');
                  else handleStepChange(step);
                }}
              />
            ) : (
              <GenerateView
                template={selectedTemplate}
                records={records}
                profile={profile}
                history={history}
                onAddHistory={(newItem) => setHistory((prev) => [newItem, ...prev])}
              />
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

// Mount the application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));

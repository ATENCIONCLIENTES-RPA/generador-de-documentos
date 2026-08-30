import AppHeader from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';
import PageContainer from '@/components/layout/PageContainer';
import StepperBar, { type StepDef } from '@/components/layout/StepperBar';
import { ToastProvider } from '@/components/ui/Toast';
import HomeView from '@/views/HomeView';
import ProfileView from '@/views/ProfileView';
import ConfigView from '@/views/ConfigView';
import DataView from '@/views/DataView';
import TemplatesView from '@/views/TemplatesView';
import GenerateView from '@/views/GenerateView';
import { useNavigationStore, type StepId } from '@/store/navigationStore';

const STEP_ORDER: StepId[] = [
  'inicio',
  'perfil',
  'configuracion',
  'datos',
  'plantillas',
  'generacion',
];

const STEP_LABELS: Record<StepId, string> = {
  inicio: 'Inicio',
  perfil: 'Perfil',
  configuracion: 'Configuración',
  datos: 'Datos',
  plantillas: 'Plantillas',
  generacion: 'Generar doc.',
};

const STEP_ICONS: Record<StepId, string> = {
  inicio:
    'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2',
  perfil: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  configuracion:
    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  datos:
    'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
  plantillas:
    'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  generacion:
    'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
};

function getStepperSteps(currentStep: StepId, completed: Set<StepId>): StepDef[] {
  return STEP_ORDER.map((key) => {
    const isCompleted = completed.has(key);
    const isActive = key === currentStep;
    let status: StepDef['status'] = 'pending';
    if (isActive) status = 'active';
    else if (isCompleted) status = 'completed';
    return { key, label: STEP_LABELS[key], status, icon: STEP_ICONS[key] };
  });
}

function ViewRouter({ currentStep }: { currentStep: StepId }): JSX.Element {
  switch (currentStep) {
    case 'inicio':
      return <HomeView />;
    case 'perfil':
      return <ProfileView />;
    case 'configuracion':
      return <ConfigView />;
    case 'datos':
      return <DataView />;
    case 'plantillas':
      return <TemplatesView />;
    case 'generacion':
      return <GenerateView />;
    default:
      return <HomeView />;
  }
}

export default function App(): JSX.Element {
  const currentStep = useNavigationStore((s) => s.currentStep);
  const completed = useNavigationStore((s) => s.completed);
  const goTo = useNavigationStore((s) => s.goTo);

  const stepperSteps = getStepperSteps(currentStep, completed);

  const handleStepperClick = (key: string) => {
    const step = key as StepId;
    if ((STEP_ORDER as string[]).includes(step)) {
      goTo(step);
    }
  };

  const showStepper = currentStep !== 'inicio';

  return (
    <ToastProvider>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-page)',
        }}
      >
        <AppHeader activeKey={currentStep} onNav={handleStepperClick} />

        <PageContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {showStepper && <StepperBar steps={stepperSteps} onStepClick={handleStepperClick} />}

            <main
              id="main-content"
              aria-label={`Vista ${STEP_LABELS[currentStep]}`}
              data-testid={`view-${currentStep}`}
              tabIndex={-1}
            >
              <ViewRouter currentStep={currentStep} />
            </main>
          </div>
        </PageContainer>

        <AppFooter />
      </div>
    </ToastProvider>
  );
}

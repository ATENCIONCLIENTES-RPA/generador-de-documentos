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
  generacion: 'Generación',
};

function getStepperSteps(currentStep: StepId, completed: Set<StepId>): StepDef[] {
  return STEP_ORDER.map((key) => {
    const isCompleted = completed.has(key);
    const isActive = key === currentStep;
    let status: StepDef['status'] = 'pending';
    if (isActive) status = 'active';
    else if (isCompleted) status = 'completed';
    return { key, label: STEP_LABELS[key], status };
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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

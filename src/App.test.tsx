import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '@/App';
import { useNavigationStore } from '@/store/navigationStore';
import { useProfileStore } from '@/store/profileStore';

function resetNav() {
  useNavigationStore.getState().reset();
}

describe('App routing currentStep → view render', () => {
  beforeEach(() => {
    resetNav();
    // clear profile persist not needed but reset
    useProfileStore.getState().clearProfile();
    localStorage.clear();
  });

  it('renderiza HomeView en inicio (hero + Comenzar Flujo)', () => {
    render(<App />);
    expect(screen.getByTestId('home-view')).toBeInTheDocument();
    expect(screen.getByTestId('home-title')).toHaveTextContent('Generación documental');
    expect(screen.getByTestId('home-cta')).toBeInTheDocument();
    expect(screen.getByText('GENERADOR DE PLANTILLAS')).toBeInTheDocument();
    expect(screen.getByTestId('energy-illustration')).toBeInTheDocument();
  });

  it('navega a perfil al hacer clic en Comenzar Flujo', async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('home-cta'));
    expect(await screen.findByTestId('profile-view')).toBeInTheDocument();
    expect(screen.getByTestId('view-perfil')).toBeInTheDocument();
  });

  it('AppHeader navigation funciona: click Perfil → goTo', async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('header-nav-perfil'));
    expect(await screen.findByTestId('profile-view')).toBeInTheDocument();
  });

  it('StepperBar refleja completed: tras completar perfil', async () => {
    render(<App />);
    // go to perfil
    fireEvent.click(screen.getByTestId('header-nav-perfil'));
    expect(await screen.findByTestId('profile-view')).toBeInTheDocument();
    // stepper should be visible outside inicio
    expect(screen.getByTestId('stepper-bar')).toBeInTheDocument();
    // perfil active
    expect(screen.getByTestId('stepper-step-perfil')).toHaveAttribute('data-status', 'active');
    // inicio pending initially (not completed yet)
    // fill form and save to complete perfil
    const nameInput = screen.getByTestId('profile-name') as HTMLInputElement;
    const emailInput = screen.getByTestId('profile-email') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Jaime Rizo' } });
    fireEvent.change(emailInput, { target: { value: 'jaime@essa.com.co' } });
    fireEvent.click(screen.getByTestId('profile-save'));
    // after save navigates to configuracion
    expect(await screen.findByTestId('config-view')).toBeInTheDocument();
    // now perfil should be completed in store
    expect(useNavigationStore.getState().completed.has('perfil')).toBe(true);
  });

  it('profile persist + signature pad modal abre', async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('header-nav-perfil'));
    expect(await screen.findByTestId('profile-view')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('profile-open-pad'));
    expect(await screen.findByTestId('signature-pad-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('signature-canvas')).toBeInTheDocument();
    // close via cancel
    fireEvent.click(screen.getByTestId('signature-cancel'));
    // overlay removed
    expect(screen.queryByTestId('signature-pad-overlay')).not.toBeInTheDocument();
  });

  it('Home 4 cards y Cómo funciona visibles', () => {
    render(<App />);
    expect(screen.getByTestId('home-features')).toBeInTheDocument();
    expect(screen.getByTestId('feature-card-rápido')).toBeInTheDocument();
    expect(screen.getByTestId('feature-card-seguro')).toBeInTheDocument();
    expect(screen.getByTestId('feature-card-personalizado')).toBeInTheDocument();
    expect(screen.getByTestId('feature-card-en la nube')).toBeInTheDocument();
    expect(screen.getByTestId('home-como-funciona')).toBeInTheDocument();
    expect(screen.getByTestId('home-como-funciona')).toHaveTextContent('1. Configura tu perfil');
    expect(screen.getByTestId('home-como-funciona')).toHaveTextContent('5. Previsualiza');
  });

  it('focus-visible y aria-labels en elementos interactivos', () => {
    render(<App />);
    const cta = screen.getByTestId('home-cta');
    expect(cta).toHaveAttribute('aria-label', 'Comenzar Flujo');
    expect(screen.getByTestId('header-nav-inicio')).toHaveAttribute('aria-label');
    expect(screen.getByTestId('header-nav-perfil')).toHaveAttribute('aria-label');
  });

  it('navega por todas las vistas via store goTo', async () => {
    render(<App />);
    const nav = useNavigationStore.getState();
    nav.goTo('datos');
    // DataView will render empty state if no records
    expect(await screen.findByTestId('data-view')).toBeInTheDocument();
    nav.goTo('plantillas');
    expect(await screen.findByTestId('templates-view')).toBeInTheDocument();
    nav.goTo('generacion');
    expect(await screen.findByTestId('generate-view')).toBeInTheDocument();
    nav.goTo('inicio');
    expect(await screen.findByTestId('home-view')).toBeInTheDocument();
  });

  it('StepperBar no visible en inicio, visible en otras vistas', async () => {
    render(<App />);
    expect(screen.queryByTestId('stepper-bar')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('header-nav-configuracion'));
    expect(await screen.findByTestId('stepper-bar')).toBeInTheDocument();
  });
});
